/* ═══════════════════════════════════════
   AEGIS — Shared TypeScript Interfaces
   ═══════════════════════════════════════ */

export interface Asset {
  node_id: number;
  hardware_serial: string;
  threat_score: number;
  status_color?: string;
  is_quarantined?: number;
}

export interface NodeData {
  node_id: number;
  node_serial: string;
  location: string;
  http_status: number;
  response_time: number;
  status_color: string;
  spoof_flag: number;
  ddos_flag: number;
  malware_flag: number;
  is_quarantined: number;
  hardware_serial?: string;
  threat_score?: number;
}

export interface SchemaLog {
  logs: string[];
}

export interface HeatmapPoint {
  log_id: number;
  response_time_ms: number;
}

export interface HeatmapResponse {
  heatmap: HeatmapPoint[];
}

export interface CityMapNode {
  node_serial: string;
  node_id: number;
  location: string;
  http_status: number;
  response_time: number;
  status_color: string;
  spoof_flag: number;
  ddos_flag: number;
  malware_flag: number;
  is_quarantined: number;
}

export interface CityMapResponse {
  nodes: CityMapNode[];
}

export interface AssetsResponse {
  assets: Asset[];
}

export interface GraphNode {
  id: string;
  original_data: CityMapNode;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
}

export type WebSocketEvent =
  | { event: 'log'; log_id: number; response_time_ms: number }
  | { event: 'schema_change'; log_id: number; version: number; active_column: string }
  | { event: 'stream_complete' };


/* ═══════════════════════════════════════
   ACTIVE ATTRIBUTION ENGINE TYPES
   ═══════════════════════════════════════ */

export type ThreatLevel = 'low' | 'elevated' | 'high' | 'critical';

export interface ThreatNode {
  id: string;
  score: number;
  level: ThreatLevel;
  type: 'client' | 'endpoint' | 'host' | 'unknown';
  community: number;
  isHub: boolean;
  isBridge: boolean;
  connections: number;
  primaryIndicator: string | null;
}

export interface ThreatLink {
  source: string;
  target: string;
  weight: number;
}

export interface ThreatGraphMetadata {
  totalNodes: number;
  totalEdges: number;
  filteredNodes: number;
  filteredEdges: number;
  minScoreFilter: number;
  computedAt: number;
  processingTimeMs: number;
}

export interface ThreatGraphResponse {
  nodes: ThreatNode[];
  links: ThreatLink[];
  metadata: ThreatGraphMetadata;
}

export interface SignalBreakdown {
  name: string;
  raw_score: number;
  weight: number;
  weighted_score: number;
  reason: string;
}

export interface AttributionResult {
  node_id: string;
  c2_confidence: number;
  threat_level: ThreatLevel;
  signals: SignalBreakdown[];
  primary_indicators: string[];
  recommended_actions: string[];
  data_quality: number;
}

export interface TimingPoint {
  x: number;  // timestamp
  y: number;  // delta_ms
  node: string;
  isBeacon: boolean;
}

export interface TimingProfile {
  node_id: string;
  request_count: number;
  mean_delta_ms: number;
  std_delta_ms: number;
  jitter: number;
  dominant_interval_ms: number;
  interval_consistency: number;
  beacon_score: number;
  is_beacon: boolean;
  pattern_type: 'human' | 'beacon' | 'jittered_beacon' | 'burst' | 'semi_automated';
}

export interface TimingDataResponse {
  points: TimingPoint[];
  profiles: TimingProfile[];
  summary: {
    totalPoints: number;
    totalProfiles: number;
    beaconNodes: number;
    avgDeltaMs: number;
  };
}

export interface HeaderProfile {
  node_id: string;
  fingerprints_seen: Record<string, number>;
  user_agents_seen: Record<string, number>;
  total_requests: number;
  suspicious_count: number;
  header_anomaly_score: number;
  primary_fingerprint: string | null;
  is_consistent: boolean;
}

export interface NodeDetailsResponse {
  nodeId: string;
  attribution: AttributionResult;
  timing: {
    points: TimingPoint[];
    profile: TimingProfile | null;
  };
  headers: HeaderProfile | null;
  graph: {
    node_id: string;
    degree_centrality: number;
    in_degree: number;
    out_degree: number;
    betweenness: number;
    closeness: number;
    community_id: number;
    is_hub: boolean;
    is_bridge: boolean;
    anomaly_score: number;
  } | null;
}

export interface ThreatSummary {
  total_nodes: number;
  critical_count: number;
  high_count: number;
  elevated_count: number;
  top_threats: AttributionResult[];
  computed_at: number;
  engines: {
    graph: { nodes: number; edges: number };
    temporal: { trackedNodes: number };
    headers: {
      total_fingerprints: number;
      browser_fingerprints: number;
      suspicious_fingerprints: number;
      total_nodes: number;
      suspicious_nodes: number;
    };
  };
}

export interface Community {
  id: number;
  nodes: string[];
  size: number;
  avgScore: number;
  hubCount: number;
}

export interface StarTopology {
  controller: string;
  victim_count: number;
  interconnect_ratio: number;
  confidence: number;
}
