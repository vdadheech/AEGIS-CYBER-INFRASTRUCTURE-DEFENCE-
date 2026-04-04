/**
 * AEGIS Threat Intelligence Types
 */

export interface ThreatNode {
  id: string;
  ip: string;
  label: string;
  confidence: number;
  centrality: number;
  connections: number;
  status: 'normal' | 'suspicious' | 'elevated' | 'critical' | 'controller';
  beaconInterval?: number;
  jitter?: number;
  headerHash?: string;
  lastSeen: number;
  timingData: TimingPoint[];
  reasons: string[];
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

export interface ThreatLink {
  source: string | ThreatNode;
  target: string | ThreatNode;
  value: number;
  type: 'normal' | 'c2' | 'lateral';
}

export interface TimingPoint {
  timestamp: number;
  delta: number;
}

export interface TimeRange {
  start: number;
  end: number;
}

export interface GraphData {
  nodes: ThreatNode[];
  links: ThreatLink[];
}

export const NODE_COLORS = {
  normal: '#3B82F6',
  suspicious: '#F59E0B',
  elevated: '#F97316',
  critical: '#EF4444',
  controller: '#DC2626',
} as const;

export const THRESHOLDS = {
  suspicious: 30,
  elevated: 50,
  critical: 80,
  controller: 90,
} as const;

export function getNodeStatus(confidence: number): ThreatNode['status'] {
  if (confidence >= THRESHOLDS.controller) return 'controller';
  if (confidence >= THRESHOLDS.critical) return 'critical';
  if (confidence >= THRESHOLDS.elevated) return 'elevated';
  if (confidence >= THRESHOLDS.suspicious) return 'suspicious';
  return 'normal';
}

export function getNodeColor(confidence: number): string {
  const status = getNodeStatus(confidence);
  return NODE_COLORS[status];
}
