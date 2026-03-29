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
