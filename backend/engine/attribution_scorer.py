"""
AEGIS Active Attribution Engine - C2 Attribution Scorer

This module implements the core C2 confidence scoring algorithm that
combines multiple detection signals into a unified threat score.

SCORING ARCHITECTURE:
--------------------
The AttributionScorer aggregates four orthogonal detection vectors:

1. GRAPH ANOMALY (weight: 0.25)
   - High centrality in network topology
   - Bridge nodes between communities
   - Star topology detection (controller → victims)
   
2. TEMPORAL ANOMALY (weight: 0.35)
   - Beaconing behavior (fixed intervals)
   - Low jitter in request timing
   - Coordinated timing across nodes
   
3. HEADER ANOMALY (weight: 0.25)
   - Non-browser fingerprints
   - User-Agent spoofing
   - Tool signatures (requests, curl, etc.)
   
4. BEHAVIORAL ANOMALY (weight: 0.15)
   - Request volume patterns
   - Endpoint targeting patterns
   - Error rate anomalies

WHY THESE WEIGHTS?
-----------------
- Temporal (0.35): Strongest C2 indicator. Beaconing is definitive.
- Graph (0.25): Topology reveals infrastructure. Controllers create stars.
- Header (0.25): Fingerprinting catches malware using common libraries.
- Behavioral (0.15): Least specific. High false positive risk.

SCORING FORMULA:
---------------
C2_Score = Σ(weight_i × signal_i) × confidence_multiplier

Where:
- signal_i ∈ [0, 1] for each detection vector
- confidence_multiplier adjusts for data quality
- Final score ∈ [0, 100]

THREAT LEVELS:
-------------
- 0-25:   LOW       - Normal traffic, no indicators
- 26-50:  ELEVATED  - Some indicators, monitoring recommended
- 51-75:  HIGH      - Multiple strong indicators, investigation required
- 76-100: CRITICAL  - High-confidence C2 activity, immediate action needed
"""

from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
from enum import Enum
import logging
import time

from backend.engine.graph_engine import GraphAnalyticsEngine, NodeMetrics, get_graph_engine
from backend.engine.temporal_engine import TemporalFingerprintEngine, TimingProfile, get_temporal_engine
from backend.engine.header_fingerprint import HeaderFingerprintEngine, NodeHeaderProfile, get_header_engine

logger = logging.getLogger(__name__)


class ThreatLevel(Enum):
    LOW = "low"
    ELEVATED = "elevated"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class SignalBreakdown:
    """Individual signal contribution to the final score."""
    name: str
    raw_score: float
    weight: float
    weighted_score: float
    reason: str
    details: Dict[str, Any] = field(default_factory=dict)


@dataclass
class AttributionResult:
    """Complete C2 attribution result for a node."""
    node_id: str
    c2_confidence: float          # 0-100
    threat_level: ThreatLevel
    signals: List[SignalBreakdown]
    primary_indicators: List[str]
    recommended_actions: List[str]
    computed_at: float
    data_quality: float           # Confidence in the result
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'node_id': self.node_id,
            'c2_confidence': round(self.c2_confidence, 1),
            'threat_level': self.threat_level.value,
            'signals': [
                {
                    'name': s.name,
                    'raw_score': round(s.raw_score, 3),
                    'weight': s.weight,
                    'weighted_score': round(s.weighted_score, 3),
                    'reason': s.reason
                }
                for s in self.signals
            ],
            'primary_indicators': self.primary_indicators,
            'recommended_actions': self.recommended_actions,
            'data_quality': round(self.data_quality, 2)
        }


class AttributionScorer:
    """
    Enterprise-grade C2 attribution scoring engine.
    
    Combines multiple detection signals with calibrated weights
    to produce a confidence score for C2 activity.
    
    Usage:
        scorer = AttributionScorer()
        result = scorer.score_node("192.168.1.100")
        print(f"C2 Confidence: {result.c2_confidence}%")
    """
    
    # Signal weights (must sum to 1.0)
    WEIGHT_GRAPH = 0.25
    WEIGHT_TEMPORAL = 0.35
    WEIGHT_HEADER = 0.25
    WEIGHT_BEHAVIORAL = 0.15
    
    # Threat level thresholds
    THRESHOLD_ELEVATED = 25
    THRESHOLD_HIGH = 50
    THRESHOLD_CRITICAL = 75
    
    def __init__(
        self,
        graph_engine: Optional[GraphAnalyticsEngine] = None,
        temporal_engine: Optional[TemporalFingerprintEngine] = None,
        header_engine: Optional[HeaderFingerprintEngine] = None
    ):
        """
        Initialize with detection engines.
        Uses singletons if not provided.
        """
        self.graph_engine = graph_engine or get_graph_engine()
        self.temporal_engine = temporal_engine or get_temporal_engine()
        self.header_engine = header_engine or get_header_engine()
    
    def score_node(self, node_id: str) -> AttributionResult:
        """
        Compute C2 confidence score for a specific node.
        
        Aggregates all available signals and produces a weighted score.
        """
        signals = []
        indicators = []
        
        # 1. GRAPH SIGNAL
        graph_signal = self._compute_graph_signal(node_id)
        signals.append(graph_signal)
        if graph_signal.raw_score > 0.5:
            indicators.extend(self._graph_indicators(graph_signal))
        
        # 2. TEMPORAL SIGNAL  
        temporal_signal = self._compute_temporal_signal(node_id)
        signals.append(temporal_signal)
        if temporal_signal.raw_score > 0.5:
            indicators.extend(self._temporal_indicators(temporal_signal))
        
        # 3. HEADER SIGNAL
        header_signal = self._compute_header_signal(node_id)
        signals.append(header_signal)
        if header_signal.raw_score > 0.3:
            indicators.extend(self._header_indicators(header_signal))
        
        # 4. BEHAVIORAL SIGNAL
        behavioral_signal = self._compute_behavioral_signal(node_id)
        signals.append(behavioral_signal)
        if behavioral_signal.raw_score > 0.5:
            indicators.extend(self._behavioral_indicators(behavioral_signal))
        
        # Calculate final score
        raw_score = sum(s.weighted_score for s in signals)
        
        # Apply data quality multiplier
        data_quality = self._compute_data_quality(node_id, signals)
        
        # Scale to 0-100 with quality adjustment
        c2_confidence = min(100, raw_score * 100 * data_quality)
        
        # Determine threat level
        threat_level = self._determine_threat_level(c2_confidence)
        
        # Generate recommended actions
        actions = self._recommend_actions(threat_level, signals, indicators)
        
        return AttributionResult(
            node_id=node_id,
            c2_confidence=c2_confidence,
            threat_level=threat_level,
            signals=signals,
            primary_indicators=indicators[:5],  # Top 5 indicators
            recommended_actions=actions,
            computed_at=time.time(),
            data_quality=data_quality
        )
    
    def _compute_graph_signal(self, node_id: str) -> SignalBreakdown:
        """Extract C2 signal from graph topology."""
        metrics = self.graph_engine.compute_metrics()
        node_metrics = metrics.get(node_id)
        
        if not node_metrics:
            return SignalBreakdown(
                name="graph",
                raw_score=0.0,
                weight=self.WEIGHT_GRAPH,
                weighted_score=0.0,
                reason="No graph data available"
            )
        
        # Score components:
        # - High centrality = potential controller
        # - Bridge position = relay node
        # - Hub status = many connections
        
        score = node_metrics.anomaly_score
        
        reasons = []
        if node_metrics.is_hub:
            reasons.append("Hub node (high connectivity)")
        if node_metrics.is_bridge:
            reasons.append("Bridge node (community connector)")
        if node_metrics.degree_centrality > 0.3:
            reasons.append(f"High centrality ({node_metrics.degree_centrality:.2f})")
        
        reason = "; ".join(reasons) if reasons else "Normal graph position"
        
        return SignalBreakdown(
            name="graph",
            raw_score=score,
            weight=self.WEIGHT_GRAPH,
            weighted_score=score * self.WEIGHT_GRAPH,
            reason=reason,
            details={
                'centrality': node_metrics.degree_centrality,
                'betweenness': node_metrics.betweenness,
                'community_id': node_metrics.community_id,
                'is_hub': node_metrics.is_hub,
                'is_bridge': node_metrics.is_bridge
            }
        )
    
    def _compute_temporal_signal(self, node_id: str) -> SignalBreakdown:
        """Extract C2 signal from timing patterns."""
        profile = self.temporal_engine.analyze_node(node_id)
        
        if not profile:
            return SignalBreakdown(
                name="temporal",
                raw_score=0.0,
                weight=self.WEIGHT_TEMPORAL,
                weighted_score=0.0,
                reason="Insufficient timing data"
            )
        
        score = profile.beacon_score
        
        reasons = []
        if profile.is_beacon:
            reasons.append(f"Beacon pattern detected ({profile.pattern_type})")
        if profile.jitter < 0.15:
            reasons.append(f"Low timing jitter ({profile.jitter:.3f})")
        if profile.interval_consistency > 0.5:
            reasons.append(f"High interval consistency ({profile.interval_consistency:.1%})")
        
        reason = "; ".join(reasons) if reasons else "Normal timing variance"
        
        return SignalBreakdown(
            name="temporal",
            raw_score=score,
            weight=self.WEIGHT_TEMPORAL,
            weighted_score=score * self.WEIGHT_TEMPORAL,
            reason=reason,
            details={
                'mean_delta_ms': profile.mean_delta_ms,
                'jitter': profile.jitter,
                'dominant_interval_ms': profile.dominant_interval_ms,
                'consistency': profile.interval_consistency,
                'pattern_type': profile.pattern_type,
                'is_beacon': profile.is_beacon
            }
        )
    
    def _compute_header_signal(self, node_id: str) -> SignalBreakdown:
        """Extract C2 signal from header fingerprints."""
        profile = self.header_engine.get_node_profile(node_id)
        
        if not profile:
            return SignalBreakdown(
                name="header",
                raw_score=0.0,
                weight=self.WEIGHT_HEADER,
                weighted_score=0.0,
                reason="No header data available"
            )
        
        score = profile.header_anomaly_score
        
        reasons = []
        if profile.suspicious_count > 0:
            ratio = profile.suspicious_count / profile.total_requests
            reasons.append(f"Suspicious headers ({ratio:.1%} of requests)")
        if not profile.is_consistent:
            reasons.append("Inconsistent fingerprints")
        if len(profile.fingerprints_seen) == 1 and profile.total_requests > 10:
            reasons.append("Single fingerprint (bot-like consistency)")
        
        reason = "; ".join(reasons) if reasons else "Normal header patterns"
        
        return SignalBreakdown(
            name="header",
            raw_score=score,
            weight=self.WEIGHT_HEADER,
            weighted_score=score * self.WEIGHT_HEADER,
            reason=reason,
            details={
                'fingerprints_seen': len(profile.fingerprints_seen),
                'user_agents_seen': len(profile.user_agents_seen),
                'suspicious_count': profile.suspicious_count,
                'total_requests': profile.total_requests
            }
        )
    
    def _compute_behavioral_signal(self, node_id: str) -> SignalBreakdown:
        """
        Extract C2 signal from behavioral patterns.
        
        This is a secondary signal derived from the other engines.
        """
        # Combine signals for behavioral analysis
        graph_metrics = self.graph_engine.compute_metrics().get(node_id)
        timing_profile = self.temporal_engine.analyze_node(node_id)
        
        score = 0.0
        reasons = []
        
        # High request volume
        if graph_metrics:
            request_count = graph_metrics.out_degree
            if request_count > 100:
                score += 0.3
                reasons.append(f"High request volume ({request_count})")
        
        # Request timing patterns
        if timing_profile:
            if timing_profile.request_count > 50 and timing_profile.jitter < 0.2:
                score += 0.4
                reasons.append("Sustained automated activity")
        
        # Cap at 1.0
        score = min(1.0, score)
        
        reason = "; ".join(reasons) if reasons else "Normal behavior patterns"
        
        return SignalBreakdown(
            name="behavioral",
            raw_score=score,
            weight=self.WEIGHT_BEHAVIORAL,
            weighted_score=score * self.WEIGHT_BEHAVIORAL,
            reason=reason
        )
    
    def _compute_data_quality(
        self, 
        node_id: str, 
        signals: List[SignalBreakdown]
    ) -> float:
        """
        Compute confidence multiplier based on data availability.
        
        More data sources = higher confidence in the result.
        """
        available_signals = sum(1 for s in signals if s.raw_score > 0 or 'No' not in s.reason)
        total_signals = len(signals)
        
        # Base quality from signal availability
        base_quality = available_signals / total_signals
        
        # Bonus for high-confidence signals
        high_conf_bonus = sum(0.1 for s in signals if s.raw_score > 0.7)
        
        return min(1.0, base_quality + high_conf_bonus)
    
    def _determine_threat_level(self, score: float) -> ThreatLevel:
        """Map numeric score to threat level."""
        if score >= self.THRESHOLD_CRITICAL:
            return ThreatLevel.CRITICAL
        elif score >= self.THRESHOLD_HIGH:
            return ThreatLevel.HIGH
        elif score >= self.THRESHOLD_ELEVATED:
            return ThreatLevel.ELEVATED
        else:
            return ThreatLevel.LOW
    
    def _graph_indicators(self, signal: SignalBreakdown) -> List[str]:
        """Extract human-readable indicators from graph signal."""
        indicators = []
        details = signal.details
        
        if details.get('is_hub'):
            indicators.append("Network hub position")
        if details.get('is_bridge'):
            indicators.append("Community bridge position")
        if details.get('centrality', 0) > 0.5:
            indicators.append("Abnormally high network centrality")
        
        return indicators
    
    def _temporal_indicators(self, signal: SignalBreakdown) -> List[str]:
        """Extract human-readable indicators from temporal signal."""
        indicators = []
        details = signal.details
        
        if details.get('is_beacon'):
            pattern = details.get('pattern_type', 'beacon')
            interval = details.get('dominant_interval_ms', 0)
            indicators.append(f"Beacon pattern: {pattern} @ {interval:.0f}ms")
        
        jitter = details.get('jitter', 1.0)
        if jitter < 0.1:
            indicators.append("Rigid timing (automation signature)")
        elif jitter < 0.2:
            indicators.append("Low-jitter timing (possible automation)")
        
        return indicators
    
    def _header_indicators(self, signal: SignalBreakdown) -> List[str]:
        """Extract human-readable indicators from header signal."""
        indicators = []
        details = signal.details
        
        if details.get('suspicious_count', 0) > 0:
            indicators.append("Non-browser HTTP fingerprint")
        
        if details.get('fingerprints_seen', 0) == 1:
            indicators.append("Single consistent fingerprint (bot-like)")
        
        return indicators
    
    def _behavioral_indicators(self, signal: SignalBreakdown) -> List[str]:
        """Extract human-readable indicators from behavioral signal."""
        # Parse from reason string
        return [r.strip() for r in signal.reason.split(";") if r.strip() and "Normal" not in r]
    
    def _recommend_actions(
        self,
        threat_level: ThreatLevel,
        signals: List[SignalBreakdown],
        indicators: List[str]
    ) -> List[str]:
        """Generate recommended response actions."""
        actions = []
        
        if threat_level == ThreatLevel.CRITICAL:
            actions.append("IMMEDIATE: Isolate node from network")
            actions.append("Capture full packet traces")
            actions.append("Escalate to incident response team")
            actions.append("Check for lateral movement from this node")
        
        elif threat_level == ThreatLevel.HIGH:
            actions.append("Increase monitoring on this node")
            actions.append("Review all connections to/from node")
            actions.append("Verify legitimate business purpose")
            actions.append("Consider temporary quarantine")
        
        elif threat_level == ThreatLevel.ELEVATED:
            actions.append("Flag for analyst review")
            actions.append("Monitor for escalation")
            actions.append("Collect additional telemetry")
        
        else:
            actions.append("Continue standard monitoring")
        
        return actions
    
    def score_all_nodes(self, min_score: float = 0.0) -> List[AttributionResult]:
        """
        Score all known nodes.
        Returns nodes with score >= min_score.
        """
        # Get all known node IDs from all engines
        node_ids = set()
        
        for node_id in self.graph_engine.compute_metrics().keys():
            node_ids.add(node_id)
        
        for node_id in self.temporal_engine._timestamps.keys():
            node_ids.add(node_id)
        
        for node_id in self.header_engine._node_profiles.keys():
            node_ids.add(node_id)
        
        results = []
        for node_id in node_ids:
            result = self.score_node(node_id)
            if result.c2_confidence >= min_score:
                results.append(result)
        
        # Sort by confidence descending
        results.sort(key=lambda r: r.c2_confidence, reverse=True)
        return results
    
    def get_threat_summary(self) -> Dict[str, Any]:
        """Get summary of all threats across the network."""
        all_results = self.score_all_nodes(min_score=0)
        
        critical = [r for r in all_results if r.threat_level == ThreatLevel.CRITICAL]
        high = [r for r in all_results if r.threat_level == ThreatLevel.HIGH]
        elevated = [r for r in all_results if r.threat_level == ThreatLevel.ELEVATED]
        
        return {
            'total_nodes': len(all_results),
            'critical_count': len(critical),
            'high_count': len(high),
            'elevated_count': len(elevated),
            'top_threats': [r.to_dict() for r in all_results[:10]],
            'computed_at': time.time()
        }


# Singleton instance
_scorer: Optional[AttributionScorer] = None


def get_attribution_scorer() -> AttributionScorer:
    """Get or create the singleton scorer instance."""
    global _scorer
    if _scorer is None:
        _scorer = AttributionScorer()
    return _scorer


def reset_attribution_scorer() -> None:
    """Reset the scorer (for testing)."""
    global _scorer
    _scorer = None
