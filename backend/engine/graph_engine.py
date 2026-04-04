"""
AEGIS Active Attribution Engine - Graph Analytics Core

This module implements graph-based C2 infrastructure detection using NetworkX.
It models network traffic as a directed graph where:
- Nodes: Source IPs / Client identifiers
- Edges: API interactions (requests from source to endpoint)

Key Metrics for C2 Detection:

1. DEGREE CENTRALITY
   - Measures how many connections a node has
   - C2 SIGNATURE: Controllers have HIGH out-degree (many victims)
   - Victims have LOW out-degree but HIGH in-degree from controller
   
2. BETWEENNESS CENTRALITY
   - Measures how often a node lies on shortest paths between other nodes
   - C2 SIGNATURE: Relay nodes (proxies in C2 infrastructure) have HIGH betweenness
   - They bridge isolated victim clusters to the controller
   
3. COMMUNITY DETECTION (Louvain/Modularity)
   - Groups nodes into clusters based on connection density
   - C2 SIGNATURE: Botnet victims form tight communities
   - Controller nodes appear as bridges between communities

Why Graph Analysis Beats Row-Level Detection:
- Isolation Forest sees individual requests as independent
- Graph analysis sees COORDINATED behavior across multiple sources
- C2 infrastructure creates characteristic topologies that are invisible to flat analysis
"""

import networkx as nx
import numpy as np
from collections import defaultdict
from typing import Dict, List, Tuple, Optional, Any
from dataclasses import dataclass, field
import hashlib
import time
import logging

logger = logging.getLogger(__name__)


@dataclass
class NodeMetrics:
    """Container for graph-derived metrics per node."""
    node_id: str
    degree_centrality: float = 0.0
    in_degree: int = 0
    out_degree: int = 0
    betweenness: float = 0.0
    closeness: float = 0.0
    community_id: int = 0
    is_hub: bool = False
    is_bridge: bool = False
    anomaly_score: float = 0.0
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'node_id': self.node_id,
            'degree_centrality': round(self.degree_centrality, 4),
            'in_degree': self.in_degree,
            'out_degree': self.out_degree,
            'betweenness': round(self.betweenness, 4),
            'closeness': round(self.closeness, 4),
            'community_id': self.community_id,
            'is_hub': self.is_hub,
            'is_bridge': self.is_bridge,
            'anomaly_score': round(self.anomaly_score, 4)
        }


@dataclass
class GraphSnapshot:
    """Immutable snapshot of graph state for thread-safe access."""
    node_count: int
    edge_count: int
    communities: int
    hub_nodes: List[str]
    bridge_nodes: List[str]
    computed_at: float
    metrics: Dict[str, NodeMetrics] = field(default_factory=dict)


class GraphAnalyticsEngine:
    """
    Core graph analytics engine for C2 infrastructure detection.
    
    Architecture:
    - Maintains a directed graph of network interactions
    - Incrementally updates metrics as new telemetry arrives
    - Provides O(1) access to pre-computed node metrics
    
    Thread Safety:
    - Graph modifications are atomic
    - Snapshots provide immutable views for API responses
    """
    
    # Thresholds calibrated for C2 detection
    HUB_CENTRALITY_THRESHOLD = 0.15      # Top 15% centrality = potential controller
    BRIDGE_BETWEENNESS_THRESHOLD = 0.10  # Top 10% betweenness = potential relay
    COMMUNITY_SIZE_THRESHOLD = 3         # Min nodes to form a community
    
    def __init__(self):
        self.graph: nx.DiGraph = nx.DiGraph()
        self._metrics_cache: Dict[str, NodeMetrics] = {}
        self._community_map: Dict[str, int] = {}
        self._last_computation: float = 0
        self._computation_interval: float = 5.0  # Recompute every 5 seconds max
        
    def add_interaction(
        self, 
        source_ip: str, 
        target_endpoint: str, 
        timestamp: float,
        metadata: Optional[Dict[str, Any]] = None
    ) -> None:
        """
        Record a network interaction as a graph edge.
        
        In C2 modeling:
        - source_ip = the client making the request
        - target_endpoint = the API/resource being accessed
        - We create edges: source_ip → target_endpoint
        
        For IP-to-IP modeling (if available):
        - source_ip → destination_ip edges would be more accurate
        """
        # Add source node if new
        if source_ip not in self.graph:
            self.graph.add_node(
                source_ip, 
                node_type='client',
                first_seen=timestamp,
                request_count=0
            )
        
        # Add endpoint as node (enables endpoint-centric analysis)
        if target_endpoint not in self.graph:
            self.graph.add_node(
                target_endpoint,
                node_type='endpoint',
                first_seen=timestamp,
                hit_count=0
            )
        
        # Update node attributes
        self.graph.nodes[source_ip]['request_count'] = \
            self.graph.nodes[source_ip].get('request_count', 0) + 1
        self.graph.nodes[source_ip]['last_seen'] = timestamp
        
        self.graph.nodes[target_endpoint]['hit_count'] = \
            self.graph.nodes[target_endpoint].get('hit_count', 0) + 1
        
        # Add or update edge
        if self.graph.has_edge(source_ip, target_endpoint):
            self.graph[source_ip][target_endpoint]['weight'] += 1
            self.graph[source_ip][target_endpoint]['last_seen'] = timestamp
        else:
            self.graph.add_edge(
                source_ip, 
                target_endpoint,
                weight=1,
                first_seen=timestamp,
                last_seen=timestamp,
                **(metadata or {})
            )
    
    def add_ip_to_ip_interaction(
        self,
        source_ip: str,
        dest_ip: str,
        timestamp: float,
        metadata: Optional[Dict[str, Any]] = None
    ) -> None:
        """
        Record IP-to-IP communication (e.g., from netflow data).
        This is the OPTIMAL data source for C2 detection.
        """
        for ip in [source_ip, dest_ip]:
            if ip not in self.graph:
                self.graph.add_node(
                    ip,
                    node_type='host',
                    first_seen=timestamp,
                    connection_count=0
                )
        
        self.graph.nodes[source_ip]['connection_count'] = \
            self.graph.nodes[source_ip].get('connection_count', 0) + 1
        
        if self.graph.has_edge(source_ip, dest_ip):
            self.graph[source_ip][dest_ip]['weight'] += 1
        else:
            self.graph.add_edge(
                source_ip,
                dest_ip,
                weight=1,
                first_seen=timestamp,
                **(metadata or {})
            )
    
    def compute_metrics(self, force: bool = False) -> Dict[str, NodeMetrics]:
        """
        Compute all graph metrics for C2 detection.
        
        Optimization: Only recomputes if interval has passed or force=True.
        This prevents excessive computation on high-frequency updates.
        
        Returns dict of node_id -> NodeMetrics
        """
        now = time.time()
        if not force and (now - self._last_computation) < self._computation_interval:
            return self._metrics_cache
        
        if len(self.graph) == 0:
            return {}
        
        logger.info(f"Computing graph metrics for {len(self.graph)} nodes, {self.graph.number_of_edges()} edges")
        
        # 1. DEGREE CENTRALITY
        # Normalized to [0, 1] range
        degree_centrality = nx.degree_centrality(self.graph)
        in_degree = dict(self.graph.in_degree())
        out_degree = dict(self.graph.out_degree())
        
        # 2. BETWEENNESS CENTRALITY
        # Uses sampling for large graphs (O(V*E) is expensive)
        if len(self.graph) > 1000:
            # Sample k nodes for approximation
            betweenness = nx.betweenness_centrality(
                self.graph, 
                k=min(100, len(self.graph)),
                normalized=True
            )
        else:
            betweenness = nx.betweenness_centrality(self.graph, normalized=True)
        
        # 3. CLOSENESS CENTRALITY
        # Measures how close a node is to all other nodes
        try:
            closeness = nx.closeness_centrality(self.graph)
        except nx.NetworkXError:
            closeness = {n: 0.0 for n in self.graph.nodes()}
        
        # 4. COMMUNITY DETECTION
        # Use Louvain for large graphs, label propagation for smaller
        communities = self._detect_communities()
        
        # 5. COMPUTE ANOMALY SCORES
        # Identify hubs and bridges
        centrality_threshold = np.percentile(
            list(degree_centrality.values()), 
            100 - (self.HUB_CENTRALITY_THRESHOLD * 100)
        ) if degree_centrality else 0
        
        betweenness_threshold = np.percentile(
            list(betweenness.values()),
            100 - (self.BRIDGE_BETWEENNESS_THRESHOLD * 100)
        ) if betweenness else 0
        
        # Build metrics for each node
        metrics: Dict[str, NodeMetrics] = {}
        for node in self.graph.nodes():
            is_hub = degree_centrality.get(node, 0) >= centrality_threshold
            is_bridge = betweenness.get(node, 0) >= betweenness_threshold
            
            # Anomaly score: weighted combination
            # Hubs with high betweenness are HIGHLY suspicious (potential C2 controllers)
            anomaly = (
                0.4 * degree_centrality.get(node, 0) +
                0.4 * betweenness.get(node, 0) +
                0.2 * closeness.get(node, 0)
            )
            
            # Boost score if node is both hub AND bridge
            if is_hub and is_bridge:
                anomaly = min(1.0, anomaly * 1.5)
            
            metrics[node] = NodeMetrics(
                node_id=node,
                degree_centrality=degree_centrality.get(node, 0),
                in_degree=in_degree.get(node, 0),
                out_degree=out_degree.get(node, 0),
                betweenness=betweenness.get(node, 0),
                closeness=closeness.get(node, 0),
                community_id=communities.get(node, 0),
                is_hub=is_hub,
                is_bridge=is_bridge,
                anomaly_score=anomaly
            )
        
        self._metrics_cache = metrics
        self._community_map = communities
        self._last_computation = now
        
        logger.info(f"Graph metrics computed: {sum(1 for m in metrics.values() if m.is_hub)} hubs, "
                   f"{sum(1 for m in metrics.values() if m.is_bridge)} bridges")
        
        return metrics
    
    def _detect_communities(self) -> Dict[str, int]:
        """
        Detect communities using greedy modularity optimization.
        
        Why communities matter for C2:
        - Botnets form tight clusters (victims controlled by same C2)
        - Legitimate traffic is more dispersed
        - Small, isolated communities with single high-centrality node = C2 signature
        """
        if len(self.graph) < 2:
            return {n: 0 for n in self.graph.nodes()}
        
        # Convert to undirected for community detection
        undirected = self.graph.to_undirected()
        
        try:
            # Greedy modularity communities
            communities = nx.community.greedy_modularity_communities(undirected)
            
            community_map = {}
            for idx, community in enumerate(communities):
                for node in community:
                    community_map[node] = idx
            
            return community_map
            
        except Exception as e:
            logger.warning(f"Community detection failed: {e}")
            return {n: 0 for n in self.graph.nodes()}
    
    def get_suspicious_nodes(self, threshold: float = 0.5) -> List[NodeMetrics]:
        """
        Return nodes with anomaly score above threshold.
        
        This is the primary method for the threat API endpoint.
        Returns only suspicious nodes to minimize payload size.
        """
        metrics = self.compute_metrics()
        return [
            m for m in metrics.values() 
            if m.anomaly_score >= threshold
        ]
    
    def get_snapshot(self) -> GraphSnapshot:
        """
        Create an immutable snapshot of current graph state.
        Thread-safe for API responses.
        """
        metrics = self.compute_metrics()
        
        return GraphSnapshot(
            node_count=len(self.graph),
            edge_count=self.graph.number_of_edges(),
            communities=len(set(self._community_map.values())),
            hub_nodes=[n for n, m in metrics.items() if m.is_hub],
            bridge_nodes=[n for n, m in metrics.items() if m.is_bridge],
            computed_at=self._last_computation,
            metrics=metrics
        )
    
    def get_graph_for_visualization(
        self, 
        max_nodes: int = 500,
        min_score: float = 0.0
    ) -> Dict[str, Any]:
        """
        Export graph in format optimized for frontend visualization.
        
        Returns:
        {
            "nodes": [{"id": "...", "score": 0.85, "type": "client", ...}],
            "links": [{"source": "...", "target": "...", "weight": 5}]
        }
        
        Optimization:
        - Limits to max_nodes to prevent frontend overload
        - Filters by min_score to show only relevant nodes
        - Pre-computes layout hints for faster rendering
        """
        metrics = self.compute_metrics()
        
        # Filter and sort nodes by anomaly score
        filtered_nodes = [
            (node, m) for node, m in metrics.items()
            if m.anomaly_score >= min_score
        ]
        filtered_nodes.sort(key=lambda x: x[1].anomaly_score, reverse=True)
        filtered_nodes = filtered_nodes[:max_nodes]
        
        node_ids = {n[0] for n in filtered_nodes}
        
        nodes = []
        for node_id, m in filtered_nodes:
            node_data = self.graph.nodes.get(node_id, {})
            nodes.append({
                "id": node_id,
                "score": round(m.anomaly_score * 100, 1),  # Convert to 0-100
                "type": node_data.get('node_type', 'unknown'),
                "community": m.community_id,
                "isHub": m.is_hub,
                "isBridge": m.is_bridge,
                "connections": m.in_degree + m.out_degree
            })
        
        # Only include edges between filtered nodes
        links = []
        for u, v, data in self.graph.edges(data=True):
            if u in node_ids and v in node_ids:
                links.append({
                    "source": u,
                    "target": v,
                    "weight": data.get('weight', 1)
                })
        
        return {
            "nodes": nodes,
            "links": links,
            "metadata": {
                "totalNodes": len(self.graph),
                "totalEdges": self.graph.number_of_edges(),
                "filteredNodes": len(nodes),
                "filteredEdges": len(links),
                "computedAt": self._last_computation
            }
        }
    
    def detect_star_topology(self) -> List[Dict[str, Any]]:
        """
        Detect star topologies characteristic of C2 infrastructure.
        
        C2 Signature:
        - One central node (controller)
        - Many leaf nodes (victims)
        - Low connectivity between leaves
        
        Returns list of potential C2 controllers with their victim clusters.
        """
        results = []
        metrics = self.compute_metrics()
        
        for node, m in metrics.items():
            # High out-degree + low in-degree = potential controller
            if m.out_degree > 5 and m.in_degree < m.out_degree * 0.3:
                # Get neighbors (potential victims)
                neighbors = list(self.graph.successors(node))
                
                # Check if neighbors are poorly connected to each other
                neighbor_interconnect = 0
                for i, n1 in enumerate(neighbors):
                    for n2 in neighbors[i+1:]:
                        if self.graph.has_edge(n1, n2) or self.graph.has_edge(n2, n1):
                            neighbor_interconnect += 1
                
                max_interconnect = len(neighbors) * (len(neighbors) - 1) / 2
                interconnect_ratio = neighbor_interconnect / max_interconnect if max_interconnect > 0 else 0
                
                # Low interconnect = star topology
                if interconnect_ratio < 0.2:
                    results.append({
                        "controller": node,
                        "victim_count": len(neighbors),
                        "interconnect_ratio": round(interconnect_ratio, 3),
                        "confidence": round((1 - interconnect_ratio) * m.anomaly_score, 3)
                    })
        
        return sorted(results, key=lambda x: x['confidence'], reverse=True)


# Singleton instance for application-wide use
_graph_engine: Optional[GraphAnalyticsEngine] = None


def get_graph_engine() -> GraphAnalyticsEngine:
    """Get or create the singleton graph engine instance."""
    global _graph_engine
    if _graph_engine is None:
        _graph_engine = GraphAnalyticsEngine()
    return _graph_engine


def reset_graph_engine() -> None:
    """Reset the graph engine (for testing)."""
    global _graph_engine
    _graph_engine = None
