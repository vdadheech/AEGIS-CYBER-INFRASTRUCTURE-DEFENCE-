"""
AEGIS Active Attribution Engine - Header Fingerprinting

This module detects non-browser clients through HTTP header analysis.

WHY HEADER ORDER MATTERS:
-------------------------
HTTP/1.1 does not specify header order, but implementations differ:

Browser headers (Chrome example):
    Host, Connection, sec-ch-ua, sec-ch-ua-mobile, User-Agent, Accept, ...
    
Python requests:
    User-Agent, Accept-Encoding, Accept, Connection, ...
    
Go net/http:
    Host, User-Agent, Accept-Encoding, ...
    
Each implementation has a FINGERPRINT based on:
1. Header presence/absence
2. Header ORDER (sequence)
3. Header values (especially User-Agent)

C2 malware often uses:
- Python (requests, urllib)
- Go (net/http)
- Custom HTTP stacks
- Modified curl

These leave detectable fingerprints even when User-Agent is spoofed.

DETECTION STRATEGY:
------------------
1. Hash the ORDERED sequence of header names
2. Compare against known browser fingerprints
3. Flag unknown or suspicious fingerprints
4. Cross-reference with User-Agent claims
"""

import hashlib
import re
from typing import Dict, List, Optional, Any, Set, Tuple
from dataclasses import dataclass, field
from collections import defaultdict
import logging
import time

logger = logging.getLogger(__name__)


# Known browser header orders (partial - enough for detection)
KNOWN_BROWSER_FINGERPRINTS = {
    # Chrome (typical)
    'chrome_standard': [
        'host', 'connection', 'sec-ch-ua', 'sec-ch-ua-mobile', 
        'sec-ch-ua-platform', 'upgrade-insecure-requests', 'user-agent',
        'accept', 'sec-fetch-site', 'sec-fetch-mode', 'sec-fetch-user',
        'sec-fetch-dest', 'accept-encoding', 'accept-language'
    ],
    # Firefox (typical)
    'firefox_standard': [
        'host', 'user-agent', 'accept', 'accept-language', 
        'accept-encoding', 'connection', 'upgrade-insecure-requests',
        'sec-fetch-dest', 'sec-fetch-mode', 'sec-fetch-site', 'sec-fetch-user'
    ],
    # Safari (typical)
    'safari_standard': [
        'host', 'connection', 'accept', 'user-agent', 
        'accept-language', 'accept-encoding'
    ],
}

# Known non-browser patterns (C2 suspects)
SUSPICIOUS_PATTERNS = {
    # Python requests library
    'python_requests': ['user-agent', 'accept-encoding', 'accept', 'connection'],
    # Python urllib
    'python_urllib': ['accept-encoding', 'host', 'user-agent', 'connection'],
    # Go net/http
    'go_nethttp': ['host', 'user-agent', 'accept-encoding'],
    # curl default
    'curl_default': ['host', 'user-agent', 'accept'],
    # wget
    'wget_default': ['user-agent', 'accept', 'host', 'connection'],
}

# User-Agent patterns for detection
UA_PATTERNS = {
    'chrome': re.compile(r'Chrome/[\d.]+.*Safari', re.I),
    'firefox': re.compile(r'Firefox/[\d.]+', re.I),
    'safari': re.compile(r'Safari/[\d.]+(?!.*Chrome)', re.I),
    'edge': re.compile(r'Edg/[\d.]+', re.I),
    'python_requests': re.compile(r'python-requests|python-urllib', re.I),
    'python_generic': re.compile(r'Python/[\d.]+', re.I),
    'go_http': re.compile(r'Go-http-client|Go/[\d.]+', re.I),
    'curl': re.compile(r'^curl/', re.I),
    'wget': re.compile(r'^Wget/', re.I),
    'bot_generic': re.compile(r'bot|crawler|spider|scraper', re.I),
}


@dataclass
class HeaderFingerprint:
    """Fingerprint derived from HTTP headers."""
    hash: str
    header_order: List[str]
    user_agent: str
    claimed_browser: Optional[str]
    detected_client: Optional[str]
    is_browser: bool
    is_suspicious: bool
    anomaly_reasons: List[str] = field(default_factory=list)
    confidence: float = 0.0
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'hash': self.hash,
            'header_order': self.header_order,
            'user_agent': self.user_agent,
            'claimed_browser': self.claimed_browser,
            'detected_client': self.detected_client,
            'is_browser': self.is_browser,
            'is_suspicious': self.is_suspicious,
            'anomaly_reasons': self.anomaly_reasons,
            'confidence': round(self.confidence, 3)
        }


@dataclass 
class NodeHeaderProfile:
    """Aggregated header profile for a node."""
    node_id: str
    fingerprints_seen: Dict[str, int] = field(default_factory=dict)
    user_agents_seen: Dict[str, int] = field(default_factory=dict)
    total_requests: int = 0
    suspicious_count: int = 0
    header_anomaly_score: float = 0.0
    primary_fingerprint: Optional[str] = None
    is_consistent: bool = True
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'node_id': self.node_id,
            'fingerprints_seen': self.fingerprints_seen,
            'user_agents_seen': self.user_agents_seen,
            'total_requests': self.total_requests,
            'suspicious_count': self.suspicious_count,
            'header_anomaly_score': round(self.header_anomaly_score, 3),
            'primary_fingerprint': self.primary_fingerprint,
            'is_consistent': self.is_consistent
        }


class HeaderFingerprintEngine:
    """
    Detects non-browser clients through HTTP header analysis.
    
    Key detection vectors:
    1. Header order doesn't match known browsers
    2. User-Agent claims browser but headers don't match
    3. Missing standard browser headers (sec-ch-*, sec-fetch-*)
    4. Matches known tool signatures (requests, curl, etc.)
    """
    
    def __init__(self):
        self._fingerprint_db: Dict[str, HeaderFingerprint] = {}
        self._node_profiles: Dict[str, NodeHeaderProfile] = {}
        self._browser_hashes = self._compute_browser_hashes()
        self._suspicious_hashes = self._compute_suspicious_hashes()
    
    def _compute_browser_hashes(self) -> Dict[str, str]:
        """Pre-compute hashes for known browser patterns."""
        hashes = {}
        for name, headers in KNOWN_BROWSER_FINGERPRINTS.items():
            h = self._hash_header_order(headers)
            hashes[h] = name
        return hashes
    
    def _compute_suspicious_hashes(self) -> Dict[str, str]:
        """Pre-compute hashes for known suspicious patterns."""
        hashes = {}
        for name, headers in SUSPICIOUS_PATTERNS.items():
            h = self._hash_header_order(headers)
            hashes[h] = name
        return hashes
    
    def _hash_header_order(self, headers: List[str]) -> str:
        """
        Create a hash from ordered header names.
        
        This is the CORE fingerprinting function.
        Order matters - ['a','b'] != ['b','a']
        """
        # Normalize: lowercase, strip whitespace
        normalized = [h.lower().strip() for h in headers]
        
        # Join with delimiter that won't appear in header names
        payload = '|'.join(normalized)
        
        # SHA256 for collision resistance
        return hashlib.sha256(payload.encode()).hexdigest()[:16]
    
    def _detect_ua_client(self, user_agent: str) -> Tuple[Optional[str], Optional[str]]:
        """
        Detect client type from User-Agent string.
        
        Returns: (claimed_browser, detected_client)
        - claimed_browser: What the UA claims to be (Chrome, Firefox, etc.)
        - detected_client: What we detect it actually is (may differ)
        """
        if not user_agent:
            return None, None
        
        claimed = None
        detected = None
        
        # Check for browser claims
        for browser in ['chrome', 'firefox', 'safari', 'edge']:
            if UA_PATTERNS[browser].search(user_agent):
                claimed = browser
                detected = browser
                break
        
        # Check for known tools (may override browser detection)
        for tool in ['python_requests', 'python_generic', 'go_http', 'curl', 'wget', 'bot_generic']:
            if UA_PATTERNS[tool].search(user_agent):
                detected = tool
                break
        
        return claimed, detected
    
    def analyze_request(
        self,
        node_id: str,
        headers: Dict[str, str],
        header_order: Optional[List[str]] = None
    ) -> HeaderFingerprint:
        """
        Analyze a single request's headers.
        
        Args:
            node_id: Source identifier (IP, session, etc.)
            headers: Dict of header name -> value
            header_order: Ordered list of header names (if available)
                         If not provided, uses dict key order (Python 3.7+)
        
        Returns: HeaderFingerprint with analysis results
        """
        # Get header order
        if header_order is None:
            header_order = list(headers.keys())
        
        # Normalize
        header_order_lower = [h.lower() for h in header_order]
        
        # Compute hash
        fp_hash = self._hash_header_order(header_order_lower)
        
        # Get User-Agent
        user_agent = headers.get('User-Agent', headers.get('user-agent', ''))
        
        # Detect client type
        claimed_browser, detected_client = self._detect_ua_client(user_agent)
        
        # Check against known patterns
        is_known_browser = fp_hash in self._browser_hashes
        is_known_suspicious = fp_hash in self._suspicious_hashes
        
        # Build anomaly reasons
        anomaly_reasons = []
        is_browser = False
        is_suspicious = False
        
        if is_known_browser:
            is_browser = True
        elif is_known_suspicious:
            is_suspicious = True
            anomaly_reasons.append(f"Matches {self._suspicious_hashes[fp_hash]} signature")
        else:
            # Unknown fingerprint - analyze further
            is_suspicious = self._analyze_unknown_fingerprint(
                header_order_lower, 
                user_agent,
                claimed_browser,
                detected_client,
                anomaly_reasons
            )
        
        # Check for UA spoofing
        if claimed_browser and detected_client and claimed_browser != detected_client:
            is_suspicious = True
            anomaly_reasons.append(f"UA claims {claimed_browser} but detected {detected_client}")
        
        # Check header order consistency with UA claim
        if claimed_browser and not is_known_browser:
            is_suspicious = True
            anomaly_reasons.append(f"Claims {claimed_browser} but header order doesn't match")
        
        # Calculate confidence
        confidence = self._calculate_confidence(
            is_known_browser, is_known_suspicious, 
            len(anomaly_reasons), len(header_order)
        )
        
        fingerprint = HeaderFingerprint(
            hash=fp_hash,
            header_order=header_order_lower,
            user_agent=user_agent,
            claimed_browser=claimed_browser,
            detected_client=detected_client or (self._browser_hashes.get(fp_hash) if is_known_browser else self._suspicious_hashes.get(fp_hash)),
            is_browser=is_browser,
            is_suspicious=is_suspicious,
            anomaly_reasons=anomaly_reasons,
            confidence=confidence
        )
        
        # Cache and update node profile
        self._fingerprint_db[fp_hash] = fingerprint
        self._update_node_profile(node_id, fingerprint)
        
        return fingerprint
    
    def _analyze_unknown_fingerprint(
        self,
        header_order: List[str],
        user_agent: str,
        claimed_browser: Optional[str],
        detected_client: Optional[str],
        anomaly_reasons: List[str]
    ) -> bool:
        """
        Analyze an unknown fingerprint for suspicious characteristics.
        """
        is_suspicious = False
        headers_set = set(header_order)
        
        # Modern browsers send sec-ch-* and sec-fetch-* headers
        modern_browser_headers = {'sec-ch-ua', 'sec-fetch-site', 'sec-fetch-mode'}
        has_modern_headers = bool(headers_set & modern_browser_headers)
        
        if claimed_browser in ['chrome', 'edge'] and not has_modern_headers:
            is_suspicious = True
            anomaly_reasons.append("Claims modern browser but missing sec-ch-*/sec-fetch-* headers")
        
        # Very short header list is suspicious
        if len(header_order) < 4:
            is_suspicious = True
            anomaly_reasons.append(f"Unusually few headers ({len(header_order)})")
        
        # Check if User-Agent is first header (common in tools, not browsers)
        if header_order and header_order[0] == 'user-agent':
            is_suspicious = True
            anomaly_reasons.append("User-Agent as first header (tool signature)")
        
        # No Accept-Language is suspicious for browsers
        if claimed_browser and 'accept-language' not in headers_set:
            is_suspicious = True
            anomaly_reasons.append("Missing Accept-Language header")
        
        return is_suspicious
    
    def _calculate_confidence(
        self,
        is_known_browser: bool,
        is_known_suspicious: bool,
        anomaly_count: int,
        header_count: int
    ) -> float:
        """Calculate detection confidence (0-1)."""
        if is_known_browser:
            return 0.95  # High confidence - known good
        
        if is_known_suspicious:
            return 0.90  # High confidence - known bad
        
        # Unknown - confidence based on analysis depth
        base_confidence = 0.5
        
        # More headers = more data = higher confidence
        header_bonus = min(0.3, header_count * 0.02)
        
        # More anomalies found = higher confidence in suspicion
        anomaly_bonus = min(0.2, anomaly_count * 0.05)
        
        return min(0.85, base_confidence + header_bonus + anomaly_bonus)
    
    def _update_node_profile(self, node_id: str, fingerprint: HeaderFingerprint) -> None:
        """Update aggregated profile for a node."""
        if node_id not in self._node_profiles:
            self._node_profiles[node_id] = NodeHeaderProfile(node_id=node_id)
        
        profile = self._node_profiles[node_id]
        profile.total_requests += 1
        
        # Track fingerprints
        profile.fingerprints_seen[fingerprint.hash] = \
            profile.fingerprints_seen.get(fingerprint.hash, 0) + 1
        
        # Track User-Agents
        if fingerprint.user_agent:
            profile.user_agents_seen[fingerprint.user_agent] = \
                profile.user_agents_seen.get(fingerprint.user_agent, 0) + 1
        
        # Track suspicious requests
        if fingerprint.is_suspicious:
            profile.suspicious_count += 1
        
        # Update primary fingerprint
        if profile.fingerprints_seen:
            profile.primary_fingerprint = max(
                profile.fingerprints_seen.keys(),
                key=lambda k: profile.fingerprints_seen[k]
            )
        
        # Check consistency
        profile.is_consistent = len(profile.fingerprints_seen) <= 2
        
        # Calculate anomaly score
        profile.header_anomaly_score = self._calculate_node_anomaly_score(profile)
    
    def _calculate_node_anomaly_score(self, profile: NodeHeaderProfile) -> float:
        """
        Calculate header-based anomaly score for a node.
        
        Factors:
        - Ratio of suspicious to total requests
        - Fingerprint consistency (bots are consistent, humans vary)
        - UA variation (bots typically don't change UA)
        """
        if profile.total_requests == 0:
            return 0.0
        
        # Suspicious request ratio
        suspicious_ratio = profile.suspicious_count / profile.total_requests
        
        # Perfect consistency is suspicious (bots don't vary)
        fp_count = len(profile.fingerprints_seen)
        if fp_count == 1 and profile.total_requests > 10:
            consistency_penalty = 0.2  # Single fingerprint over many requests
        else:
            consistency_penalty = 0.0
        
        # Single UA over many requests is suspicious
        ua_count = len(profile.user_agents_seen)
        if ua_count == 1 and profile.total_requests > 10:
            ua_penalty = 0.15
        else:
            ua_penalty = 0.0
        
        score = (
            0.6 * suspicious_ratio +
            0.2 * consistency_penalty +
            0.2 * ua_penalty
        )
        
        return min(1.0, score)
    
    def get_node_profile(self, node_id: str) -> Optional[NodeHeaderProfile]:
        """Get header profile for a specific node."""
        return self._node_profiles.get(node_id)
    
    def get_suspicious_nodes(self, threshold: float = 0.3) -> List[NodeHeaderProfile]:
        """Return all nodes with header anomaly score above threshold."""
        return [
            p for p in self._node_profiles.values()
            if p.header_anomaly_score >= threshold
        ]
    
    def get_fingerprint_stats(self) -> Dict[str, Any]:
        """Get aggregate statistics about observed fingerprints."""
        total_fingerprints = len(self._fingerprint_db)
        browser_count = sum(1 for fp in self._fingerprint_db.values() if fp.is_browser)
        suspicious_count = sum(1 for fp in self._fingerprint_db.values() if fp.is_suspicious)
        
        return {
            'total_fingerprints': total_fingerprints,
            'browser_fingerprints': browser_count,
            'suspicious_fingerprints': suspicious_count,
            'total_nodes': len(self._node_profiles),
            'suspicious_nodes': len(self.get_suspicious_nodes())
        }


# Singleton instance
_header_engine: Optional[HeaderFingerprintEngine] = None


def get_header_engine() -> HeaderFingerprintEngine:
    """Get or create the singleton header engine instance."""
    global _header_engine
    if _header_engine is None:
        _header_engine = HeaderFingerprintEngine()
    return _header_engine


def reset_header_engine() -> None:
    """Reset the header engine (for testing)."""
    global _header_engine
    _header_engine = None
