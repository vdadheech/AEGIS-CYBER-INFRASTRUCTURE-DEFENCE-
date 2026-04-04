/**
 * AEGIS Threat Store (Zustand)
 */

import { create } from 'zustand';
import type { ThreatNode, ThreatLink, TimeRange } from './types';

export interface ThreatState {
  nodes: Map<string, ThreatNode>;
  links: ThreatLink[];
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  confidenceThreshold: number;
  timeRange: TimeRange;
  isLoading: boolean;
  isStreaming: boolean;
  showKillSwitchModal: boolean;
  killSwitchTarget: ThreatNode | null;
  totalNodes: number;
  criticalCount: number;
  elevatedCount: number;
  setNodes: (nodes: ThreatNode[]) => void;
  addNode: (node: ThreatNode) => void;
  updateNode: (id: string, updates: Partial<ThreatNode>) => void;
  setLinks: (links: ThreatLink[]) => void;
  selectNode: (id: string | null) => void;
  hoverNode: (id: string | null) => void;
  setConfidenceThreshold: (threshold: number) => void;
  setTimeRange: (range: TimeRange) => void;
  openKillSwitch: (node: ThreatNode) => void;
  closeKillSwitch: () => void;
  setStreaming: (streaming: boolean) => void;
  reset: () => void;
  getFilteredNodes: () => ThreatNode[];
  getFilteredLinks: () => ThreatLink[];
  getSelectedNode: () => ThreatNode | null;
  getGraphData: () => { nodes: ThreatNode[]; links: ThreatLink[] };
}

export const useThreatStore = create<ThreatState>()((set, get) => ({
  nodes: new Map(),
  links: [],
  selectedNodeId: null,
  hoveredNodeId: null,
  confidenceThreshold: 0,
  timeRange: { start: Date.now() - 3600000, end: Date.now() },
  isLoading: false,
  isStreaming: false,
  showKillSwitchModal: false,
  killSwitchTarget: null,
  totalNodes: 0,
  criticalCount: 0,
  elevatedCount: 0,

  setNodes: (nodes) => {
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    set({
      nodes: nodeMap,
      totalNodes: nodes.length,
      criticalCount: nodes.filter(n => n.confidence >= 80).length,
      elevatedCount: nodes.filter(n => n.confidence >= 50 && n.confidence < 80).length,
    });
  },

  addNode: (node) => set((state) => {
    const newNodes = new Map(state.nodes);
    newNodes.set(node.id, node);
    return {
      nodes: newNodes,
      totalNodes: newNodes.size,
      criticalCount: node.confidence >= 80 ? state.criticalCount + 1 : state.criticalCount,
      elevatedCount: node.confidence >= 50 && node.confidence < 80 ? state.elevatedCount + 1 : state.elevatedCount,
    };
  }),

  updateNode: (id, updates) => set((state) => {
    const node = state.nodes.get(id);
    if (!node) return state;
    const newNodes = new Map(state.nodes);
    newNodes.set(id, { ...node, ...updates });
    return { nodes: newNodes };
  }),

  setLinks: (links) => set({ links }),
  selectNode: (id) => set({ selectedNodeId: id }),
  hoverNode: (id) => set({ hoveredNodeId: id }),
  setConfidenceThreshold: (threshold) => set({ confidenceThreshold: threshold }),
  setTimeRange: (range) => set({ timeRange: range }),
  openKillSwitch: (node) => set({ showKillSwitchModal: true, killSwitchTarget: node }),
  closeKillSwitch: () => set({ showKillSwitchModal: false, killSwitchTarget: null }),
  setStreaming: (streaming) => set({ isStreaming: streaming }),
  reset: () => set({
    nodes: new Map(), links: [], selectedNodeId: null, hoveredNodeId: null,
    totalNodes: 0, criticalCount: 0, elevatedCount: 0,
  }),

  getFilteredNodes: () => {
    const { nodes, confidenceThreshold } = get();
    // Only filter by confidence, ignore time range for now
    return Array.from(nodes.values()).filter(node =>
      node.confidence >= confidenceThreshold
    );
  },

  getFilteredLinks: () => {
    const { links } = get();
    const nodeIds = new Set(get().getFilteredNodes().map(n => n.id));
    return links.filter(link => {
      const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
      const targetId = typeof link.target === 'string' ? link.target : link.target.id;
      return nodeIds.has(sourceId) && nodeIds.has(targetId);
    });
  },

  getSelectedNode: () => {
    const { nodes, selectedNodeId } = get();
    return selectedNodeId ? nodes.get(selectedNodeId) || null : null;
  },

  getGraphData: () => ({
    nodes: get().getFilteredNodes(),
    links: get().getFilteredLinks(),
  }),
}));

export const useSelectedNode = () => useThreatStore(state => state.getSelectedNode());
export const useConfidenceThreshold = () => useThreatStore(state => state.confidenceThreshold);
export const useThreatStats = () => useThreatStore(state => ({
  total: state.totalNodes,
  critical: state.criticalCount,
  elevated: state.elevatedCount,
}));
