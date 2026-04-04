/**
 * AEGIS C2 Detection Dashboard - Main Entry
 */

export { C2Dashboard } from './C2Dashboard-NoTailwind';
export { NetworkGraph } from './NetworkGraph';
export { BeaconingScatter } from './BeaconingScatter-NoTailwind';
export { NodeInspector } from './NodeInspector-NoTailwind';
export { GlobalControls } from './GlobalControls-NoTailwind';
export { KillSwitchModal } from './KillSwitchModal-NoTailwind';
export { ThreatLegend } from './ThreatLegend-NoTailwind';
export type { ThreatNode, ThreatLink, TimingPoint } from './types';
export type { ThreatState } from './useThreatStore';
export { useThreatStore, useThreatStats, useSelectedNode } from './useThreatStore';
export { generateMockData, generateLargeDataset } from './mockDataGenerator';
