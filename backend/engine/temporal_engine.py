"""
AEGIS Active Attribution Engine - Temporal Fingerprinting

This module detects C2 beaconing behavior through timing analysis.

C2 BEACONING EXPLAINED:
-----------------------
Malware needs to "phone home" to its controller for:
- Receiving commands
- Exfiltrating data
- Heartbeat/keepalive

This creates PERIODIC traffic patterns with characteristics:
1. Fixed intervals (e.g., every 300ms, 1s, 5min)
2. Low variance (automated = consistent timing)
3. Optional jitter (smart malware adds randomness to evade detection)

DETECTION STRATEGY:
------------------
1. Compute inter-arrival times (delta between consecutive requests)
2. Calculate variance and coefficient of variation (CV)
3. Low CV = automated traffic (humans are chaotic)
4. Detect periodic clusters using FFT or histogram analysis

JITTER FORMULA:
--------------
Jitter = std_dev(inter_arrival_times) / mean(inter_arrival_times)

Typical values:
- Human traffic: Jitter > 0.5 (high variance)
- C2 with jitter: Jitter 0.1-0.3 (small random variance around fixed interval)
- Pure C2 beacon: Jitter < 0.1 (nearly perfect timing)
"""

import numpy as np
from collections import defaultdict
from typing import Dict, List, Tuple, Optional, Any
from dataclasses import dataclass
import logging
import time

logger = logging.getLogger(__name__)


@dataclass
class TimingProfile:
    """Timing characteristics for a single node/IP."""
    node_id: str
    request_count: int
    mean_delta_ms: float
    std_delta_ms: float
    min_delta_ms: float
    max_delta_ms: float
    jitter: float                    # CV = std/mean
    dominant_interval_ms: float      # Most common interval (histogram peak)
    interval_consistency: float      # % of requests at dominant interval
    beacon_score: float              # 0-1, higher = more likely automated
    is_beacon: bool
    pattern_type: str                # 'human', 'beacon', 'jittered_beacon', 'burst'
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'node_id': self.node_id,
            'request_count': self.request_count,
            'mean_delta_ms': round(self.mean_delta_ms, 2),
            'std_delta_ms': round(self.std_delta_ms, 2),
            'jitter': round(self.jitter, 4),
            'dominant_interval_ms': round(self.dominant_interval_ms, 2),
            'interval_consistency': round(self.interval_consistency, 4),
            'beacon_score': round(self.beacon_score, 4),
            'is_beacon': self.is_beacon,
            'pattern_type': self.pattern_type
        }


class TemporalFingerprintEngine:
    """
    Detects C2 beaconing through temporal pattern analysis.
    
    Key insight: Automated systems have RIGID timing.
    Even with jitter, the underlying periodicity is detectable.
    
    Detection Methods:
    1. Inter-arrival time variance analysis
    2. Histogram binning for interval detection
    3. Coefficient of Variation (CV) thresholding
    """
    
    # Thresholds tuned for C2 detection
    BEACON_JITTER_THRESHOLD = 0.15       # CV < 0.15 = likely automated
    JITTERED_BEACON_THRESHOLD = 0.30     # CV 0.15-0.30 = automated with jitter
    MIN_REQUESTS_FOR_ANALYSIS = 5        # Need enough samples
    HISTOGRAM_BINS = 50                  # Resolution for interval detection
    INTERVAL_CONSISTENCY_THRESHOLD = 0.4 # 40%+ at same interval = beacon
    
    def __init__(self):
        # Storage: node_id -> list of timestamps (ms)
        self._timestamps: Dict[str, List[float]] = defaultdict(list)
        self._profiles_cache: Dict[str, TimingProfile] = {}
        self._last_computation: float = 0
        
    def record_request(self, node_id: str, timestamp_ms: float) -> Optional[float]:
        """
        Record a request timestamp for a node.
        Returns the delta from previous request (if any).
        """
        timestamps = self._timestamps[node_id]
        
        delta = None
        if timestamps:
            delta = timestamp_ms - timestamps[-1]
        
        timestamps.append(timestamp_ms)
        
        # Keep only last 1000 timestamps per node (memory bound)
        if len(timestamps) > 1000:
            self._timestamps[node_id] = timestamps[-1000:]
        
        return delta
    
    def compute_deltas(self, node_id: str) -> np.ndarray:
        """Compute inter-arrival times for a node."""
        timestamps = self._timestamps.get(node_id, [])
        if len(timestamps) < 2:
            return np.array([])
        
        return np.diff(np.array(timestamps))
    
    def analyze_node(self, node_id: str) -> Optional[TimingProfile]:
        """
        Perform full timing analysis on a single node.
        
        Returns TimingProfile with beacon detection results.
        """
        deltas = self.compute_deltas(node_id)
        
        if len(deltas) < self.MIN_REQUESTS_FOR_ANALYSIS:
            return None
        
        # Basic statistics
        mean_delta = float(np.mean(deltas))
        std_delta = float(np.std(deltas))
        min_delta = float(np.min(deltas))
        max_delta = float(np.max(deltas))
        
        # Jitter = Coefficient of Variation
        jitter = std_delta / mean_delta if mean_delta > 0 else float('inf')
        
        # Histogram analysis for dominant interval
        dominant_interval, consistency = self._find_dominant_interval(deltas)
        
        # Beacon scoring formula
        beacon_score = self._compute_beacon_score(
            jitter=jitter,
            consistency=consistency,
            request_count=len(deltas) + 1
        )
        
        # Pattern classification
        pattern_type, is_beacon = self._classify_pattern(
            jitter=jitter,
            consistency=consistency,
            beacon_score=beacon_score
        )
        
        profile = TimingProfile(
            node_id=node_id,
            request_count=len(deltas) + 1,
            mean_delta_ms=mean_delta,
            std_delta_ms=std_delta,
            min_delta_ms=min_delta,
            max_delta_ms=max_delta,
            jitter=jitter,
            dominant_interval_ms=dominant_interval,
            interval_consistency=consistency,
            beacon_score=beacon_score,
            is_beacon=is_beacon,
            pattern_type=pattern_type
        )
        
        self._profiles_cache[node_id] = profile
        return profile
    
    def _find_dominant_interval(self, deltas: np.ndarray) -> Tuple[float, float]:
        """
        Find the most common request interval using histogram analysis.
        
        Returns:
        - dominant_interval: The most frequent delta (ms)
        - consistency: Fraction of requests at this interval (±10%)
        """
        if len(deltas) == 0:
            return 0.0, 0.0
        
        # Create histogram
        # Use percentile-based range to handle outliers
        p5, p95 = np.percentile(deltas, [5, 95])
        
        # Filter to reasonable range
        filtered = deltas[(deltas >= p5) & (deltas <= p95)]
        if len(filtered) < 3:
            filtered = deltas
        
        hist, bin_edges = np.histogram(filtered, bins=self.HISTOGRAM_BINS)
        
        # Find peak bin
        peak_idx = np.argmax(hist)
        peak_count = hist[peak_idx]
        
        # Dominant interval = center of peak bin
        dominant_interval = (bin_edges[peak_idx] + bin_edges[peak_idx + 1]) / 2
        
        # Consistency = fraction of deltas within ±10% of dominant
        tolerance = dominant_interval * 0.1
        consistent_count = np.sum(
            np.abs(deltas - dominant_interval) <= tolerance
        )
        consistency = consistent_count / len(deltas)
        
        return float(dominant_interval), float(consistency)
    
    def _compute_beacon_score(
        self, 
        jitter: float, 
        consistency: float,
        request_count: int
    ) -> float:
        """
        Compute beacon likelihood score (0-1).
        
        Formula:
        beacon_score = w1 * (1 - normalized_jitter) + 
                       w2 * consistency +
                       w3 * confidence_bonus
        
        Weights:
        - Jitter (0.5): Most important - low jitter = automated
        - Consistency (0.35): High consistency = fixed interval
        - Confidence (0.15): More samples = more confidence
        """
        # Normalize jitter to [0, 1] where 0 = high jitter, 1 = no jitter
        # Clamp jitter to reasonable range
        normalized_jitter = min(jitter, 1.0)
        jitter_score = 1.0 - normalized_jitter
        
        # Consistency score (already 0-1)
        consistency_score = consistency
        
        # Confidence bonus based on sample size
        # More requests = more reliable analysis
        confidence = min(1.0, request_count / 50)  # Max confidence at 50 requests
        
        # Weighted combination
        score = (
            0.50 * jitter_score +
            0.35 * consistency_score +
            0.15 * confidence
        )
        
        return min(1.0, max(0.0, score))
    
    def _classify_pattern(
        self,
        jitter: float,
        consistency: float,
        beacon_score: float
    ) -> Tuple[str, bool]:
        """
        Classify traffic pattern type.
        
        Returns: (pattern_type, is_beacon)
        """
        if jitter < self.BEACON_JITTER_THRESHOLD:
            # Very low jitter = pure beacon
            return 'beacon', True
        
        elif jitter < self.JITTERED_BEACON_THRESHOLD:
            # Moderate jitter but high consistency = jittered beacon
            if consistency > self.INTERVAL_CONSISTENCY_THRESHOLD:
                return 'jittered_beacon', True
            else:
                return 'semi_automated', False
        
        elif consistency > 0.6:
            # High consistency despite jitter = burst pattern
            return 'burst', False
        
        else:
            # High jitter, low consistency = human
            return 'human', False
    
    def analyze_all_nodes(self) -> Dict[str, TimingProfile]:
        """
        Analyze all recorded nodes.
        Returns dict of node_id -> TimingProfile
        """
        results = {}
        for node_id in self._timestamps.keys():
            profile = self.analyze_node(node_id)
            if profile:
                results[node_id] = profile
        
        self._last_computation = time.time()
        return results
    
    def get_beacons(self, threshold: float = 0.5) -> List[TimingProfile]:
        """
        Return all nodes identified as potential beacons.
        """
        profiles = self.analyze_all_nodes()
        return [
            p for p in profiles.values()
            if p.beacon_score >= threshold
        ]
    
    def get_timing_data_for_visualization(
        self,
        node_id: Optional[str] = None,
        max_points: int = 500
    ) -> Dict[str, Any]:
        """
        Export timing data for scatter plot visualization.
        
        Returns:
        {
            "points": [
                {"x": timestamp, "y": delta_ms, "node": "...", "isBeacon": true}
            ],
            "profiles": [
                {node_id, beacon_score, pattern_type, ...}
            ]
        }
        """
        points = []
        profiles = []
        
        nodes_to_analyze = [node_id] if node_id else list(self._timestamps.keys())
        
        for nid in nodes_to_analyze:
            timestamps = self._timestamps.get(nid, [])
            if len(timestamps) < 2:
                continue
            
            profile = self.analyze_node(nid)
            if profile:
                profiles.append(profile.to_dict())
            
            # Generate points for this node
            for i in range(1, len(timestamps)):
                if len(points) >= max_points:
                    break
                points.append({
                    'x': timestamps[i],
                    'y': timestamps[i] - timestamps[i-1],
                    'node': nid,
                    'isBeacon': profile.is_beacon if profile else False
                })
        
        # Sort by timestamp
        points.sort(key=lambda p: p['x'])
        
        return {
            'points': points[:max_points],
            'profiles': profiles
        }
    
    def detect_coordinated_beaconing(
        self,
        time_window_ms: float = 1000
    ) -> List[Dict[str, Any]]:
        """
        Detect multiple nodes beaconing at the same time.
        
        C2 Signature: Multiple infected hosts calling home simultaneously
        (synchronized by C2 controller).
        
        Returns clusters of synchronized beacons.
        """
        all_timestamps = []
        
        for node_id, timestamps in self._timestamps.items():
            for ts in timestamps:
                all_timestamps.append((ts, node_id))
        
        if len(all_timestamps) < 2:
            return []
        
        # Sort by timestamp
        all_timestamps.sort(key=lambda x: x[0])
        
        # Find clusters of requests within time_window
        clusters = []
        current_cluster = [all_timestamps[0]]
        
        for i in range(1, len(all_timestamps)):
            ts, node = all_timestamps[i]
            prev_ts, _ = all_timestamps[i-1]
            
            if ts - prev_ts <= time_window_ms:
                current_cluster.append((ts, node))
            else:
                if len(current_cluster) >= 3:
                    # Cluster with 3+ requests from different nodes
                    unique_nodes = set(n for _, n in current_cluster)
                    if len(unique_nodes) >= 2:
                        clusters.append({
                            'timestamp': current_cluster[0][0],
                            'node_count': len(unique_nodes),
                            'request_count': len(current_cluster),
                            'nodes': list(unique_nodes)
                        })
                current_cluster = [(ts, node)]
        
        return clusters
    
    def clear_node(self, node_id: str) -> None:
        """Remove all timing data for a node."""
        if node_id in self._timestamps:
            del self._timestamps[node_id]
        if node_id in self._profiles_cache:
            del self._profiles_cache[node_id]


# Singleton instance
_temporal_engine: Optional[TemporalFingerprintEngine] = None


def get_temporal_engine() -> TemporalFingerprintEngine:
    """Get or create the singleton temporal engine instance."""
    global _temporal_engine
    if _temporal_engine is None:
        _temporal_engine = TemporalFingerprintEngine()
    return _temporal_engine


def reset_temporal_engine() -> None:
    """Reset the temporal engine (for testing)."""
    global _temporal_engine
    _temporal_engine = None
