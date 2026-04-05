/**
 * AEGIS Node Inspector Panel
 * 
 * The most judge-facing component. Shows detailed attribution
 * with explainability and actionable controls.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { Shield, AlertTriangle, Clock, Hash, Network, Zap } from 'lucide-react';
import { useThreatStore } from './useThreatStore';
import { NODE_COLORS } from './types';

// Progress bar component
function ConfidenceBar({ value, max = 100 }: { value: number; max?: number }) {
  const percentage = (value / max) * 100;
  
  // Color gradient based on confidence
  const getColor = () => {
    if (value >= 80) return 'from-red-600 to-red-400';
    if (value >= 50) return 'from-orange-600 to-orange-400';
    if (value >= 30) return 'from-yellow-600 to-yellow-400';
    return 'from-blue-600 to-blue-400';
  };
  
  return (
    <div className="relative">
      <div className="h-4 bg-gray-800 rounded-full overflow-hidden">
        <motion.div
          className={`h-full bg-gradient-to-r ${getColor()} rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-white text-xs font-bold drop-shadow-lg">
          {value.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}

// Metric card
function MetricCard({ icon: Icon, label, value, color = 'text-gray-400' }: {
  icon: typeof Shield;
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div className="bg-gray-800/50 rounded-xl p-3 border border-gray-700/50">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-gray-500 text-xs uppercase tracking-wider">{label}</span>
      </div>
      <div className={`font-semibold text-lg ${color}`}>{value}</div>
    </div>
  );
}

export function NodeInspector() {
  const { getSelectedNode, selectedNodeId, openKillSwitch, openIsolate, isNodeIsolated } = useThreatStore();
  const node = getSelectedNode();

  if (!selectedNodeId || !node) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-gray-900/30 rounded-2xl border border-gray-800/50 p-8">
        <div className="w-20 h-20 rounded-full bg-gray-800/50 flex items-center justify-center mb-4">
          <Shield className="w-10 h-10 text-gray-600" />
        </div>
        <div className="text-gray-500 text-lg font-medium mb-2">Node Inspector</div>
        <div className="text-gray-600 text-sm text-center">
          Select a node from the graph to view<br />detailed threat attribution
        </div>
      </div>
    );
  }

  const statusLabels: Record<string, string> = {
    normal: 'NORMAL',
    suspicious: 'SUSPICIOUS',
    elevated: 'ELEVATED RISK',
    critical: 'CRITICAL THREAT',
    controller: '🔴 SHADOW CONTROLLER',
  };

  const isHighThreat = node.confidence >= 50;
  const isCritical = node.confidence >= 80;
  const isolated = isNodeIsolated(node.id);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={node.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="h-full flex flex-col bg-gray-900/30 rounded-2xl border border-gray-800/50 overflow-hidden"
      >
        {/* Header */}
        <div className={`p-4 border-b ${
          isCritical 
            ? 'bg-red-500/10 border-red-500/30' 
            : isHighThreat 
              ? 'bg-orange-500/10 border-orange-500/30' 
              : 'bg-gray-800/30 border-gray-700/30'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div 
                className={`w-4 h-4 rounded-full ${
                  isCritical ? 'animate-pulse' : ''
                }`}
                style={{ backgroundColor: NODE_COLORS[node.status] }}
              />
              <span className="text-white font-mono font-semibold text-lg">{node.ip}</span>
            </div>
            <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${
              isCritical 
                ? 'bg-red-500/20 text-red-400' 
                : isHighThreat 
                  ? 'bg-orange-500/20 text-orange-400' 
                  : 'bg-blue-500/20 text-blue-400'
            }`}>
              {statusLabels[node.status]}
            </span>
          </div>
          <div className="text-gray-400 text-sm">{node.label}</div>
        </div>

        {/* Main Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* C2 Confidence - PROMINENT */}
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-400 text-sm font-medium">C2 CONFIDENCE</span>
              <span className={`text-3xl font-bold ${
                isCritical ? 'text-red-400' : isHighThreat ? 'text-orange-400' : 'text-blue-400'
              }`}>
                {node.confidence.toFixed(1)}%
              </span>
            </div>
            <ConfidenceBar value={node.confidence} />
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 gap-3">
            <MetricCard 
              icon={Network} 
              label="Connections" 
              value={node.connections} 
              color="text-cyan-400"
            />
            <MetricCard 
              icon={Zap} 
              label="Centrality" 
              value={`${(node.centrality * 100).toFixed(0)}%`} 
              color="text-purple-400"
            />
            {node.beaconInterval && (
              <MetricCard 
                icon={Clock} 
                label="Beacon" 
                value={`${node.beaconInterval}ms`} 
                color="text-yellow-400"
              />
            )}
            {node.headerHash && (
              <MetricCard 
                icon={Hash} 
                label="Header Hash" 
                value={node.headerHash.slice(0, 10)} 
                color="text-gray-400"
              />
            )}
          </div>

          {/* Timing Signature */}
          {node.beaconInterval && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-yellow-400" />
                <span className="text-yellow-400 font-semibold">Timing Signature</span>
              </div>
              <div className="text-white font-mono">
                {node.beaconInterval}ms fixed interval ± {((node.jitter || 0) * 100).toFixed(0)}%
              </div>
            </div>
          )}

          {/* Reasons - Explainability */}
          {node.reasons.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-400" />
                <span className="text-gray-400 text-sm font-medium uppercase tracking-wider">
                  Attribution Reasons
                </span>
              </div>
              <div className="space-y-2">
                {node.reasons.map((reason, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className={`p-3 rounded-lg border ${
                      reason.includes('SHADOW') || reason.includes('⚠️')
                        ? 'bg-red-500/10 border-red-500/30 text-red-400'
                        : 'bg-gray-800/50 border-gray-700/50 text-gray-300'
                    }`}
                  >
                    <span className="text-sm">{reason}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons - Kill Switch */}
        {isHighThreat && (
          <div className="p-4 border-t border-gray-700/50 bg-gray-800/30">
            <div className="flex gap-3">
              <button
                onClick={() => openKillSwitch(node)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-colors"
              >
                <Shield className="w-5 h-5" />
                Generate Block Rule
              </button>
              <button
                onClick={() => openIsolate(node)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-white font-semibold rounded-xl transition-colors ${
                  isolated
                    ? 'bg-gray-600 cursor-not-allowed'
                    : 'bg-orange-600 hover:bg-orange-700'
                }`}
                disabled={isolated}
              >
                <Zap className="w-5 h-5" />
                {isolated ? 'Node Isolated' : 'Isolate Node'}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
