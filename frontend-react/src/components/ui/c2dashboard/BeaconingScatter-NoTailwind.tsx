/**
 * AEGIS Beaconing Scatter Plot - Inline Styles (No Tailwind)
 */

import { useMemo } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { useThreatStore } from './useThreatStore';
import type { TimingPoint } from './types';

const styles = {
  container: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column' as const,
    background: 'rgba(17, 24, 39, 0.3)',
    borderRadius: '16px',
    border: '1px solid rgba(55, 65, 81, 0.5)',
    padding: '16px',
  },
  emptyState: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(17, 24, 39, 0.3)',
    borderRadius: '16px',
    border: '1px solid rgba(55, 65, 81, 0.5)',
  },
  emptyTitle: {
    color: '#6b7280',
    fontSize: '18px',
    marginBottom: '8px',
  },
  emptySubtitle: {
    color: '#4b5563',
    fontSize: '14px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
  },
  title: {
    color: 'white',
    fontWeight: '600',
    fontSize: '16px',
  },
  subtitle: {
    color: '#9ca3af',
    fontSize: '14px',
  },
  badge: (isBeacon: boolean) => ({
    padding: '6px 12px',
    borderRadius: '9999px',
    fontSize: '12px',
    fontWeight: '500',
    background: isBeacon ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.2)',
    color: isBeacon ? '#f87171' : '#60a5fa',
    border: `1px solid ${isBeacon ? 'rgba(239, 68, 68, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`,
  }),
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '12px',
    marginBottom: '16px',
  },
  statBox: {
    background: 'rgba(55, 65, 81, 0.5)',
    borderRadius: '8px',
    padding: '8px',
    textAlign: 'center' as const,
  },
  statLabel: {
    color: '#6b7280',
    fontSize: '11px',
    marginBottom: '2px',
  },
  statValue: (color?: string) => ({
    color: color || 'white',
    fontWeight: '600',
    fontSize: '14px',
  }),
  chartContainer: {
    flex: 1,
    minHeight: 0,
  },
  warningBox: {
    marginTop: '12px',
    padding: '12px',
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '8px',
  },
  warningText: {
    color: '#f87171',
    fontSize: '14px',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
};

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: TimingPoint }> }) {
  if (!active || !payload?.length) return null;
  
  const point = payload[0].payload;
  return (
    <div style={{
      background: 'rgba(17, 24, 39, 0.95)',
      backdropFilter: 'blur(8px)',
      border: '1px solid rgba(55, 65, 81, 0.5)',
      borderRadius: '8px',
      padding: '12px 16px',
      boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
    }}>
      <div style={{ color: '#9ca3af', fontSize: '12px', marginBottom: '4px' }}>
        {new Date(point.timestamp).toLocaleTimeString()}
      </div>
      <div style={{ color: 'white', fontWeight: '600' }}>
        Delta: <span style={{ color: '#22d3ee' }}>{point.delta.toFixed(0)}ms</span>
      </div>
    </div>
  );
}

export function BeaconingScatter() {
  const selectedNodeId = useThreatStore(state => state.selectedNodeId);
  const getSelectedNode = useThreatStore(state => state.getSelectedNode);
  const selectedNode = getSelectedNode();

  const scatterData = useMemo(() => {
    if (!selectedNode) return [];
    return selectedNode.timingData.map(point => ({
      ...point,
      x: point.timestamp,
      y: point.delta,
    }));
  }, [selectedNode]);

  const stats = useMemo(() => {
    if (!scatterData.length) return null;
    
    const deltas = scatterData.map(p => p.delta);
    const mean = deltas.reduce((a, b) => a + b, 0) / deltas.length;
    const variance = deltas.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) / deltas.length;
    const stdDev = Math.sqrt(variance);
    const jitter = stdDev / mean;
    
    return { mean, stdDev, jitter, min: Math.min(...deltas), max: Math.max(...deltas) };
  }, [scatterData]);

  const isBeacon = stats && stats.jitter < 0.3;
  const dotColor = isBeacon ? '#EF4444' : '#3B82F6';

  if (!selectedNodeId) {
    return (
      <div style={styles.emptyState}>
        <div style={styles.emptyTitle}>📊 Timing Analysis</div>
        <div style={styles.emptySubtitle}>Click a node to view timing pattern</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h3 style={styles.title}>Timing Pattern</h3>
          <div style={styles.subtitle}>{selectedNode?.ip || 'Unknown'}</div>
        </div>
        
        {stats && (
          <div style={styles.badge(!!isBeacon)}>
            {isBeacon ? '🎯 BEACON DETECTED' : '👤 Human Pattern'}
          </div>
        )}
      </div>

      {/* Stats bar */}
      {stats && (
        <div style={styles.statsGrid}>
          <div style={styles.statBox}>
            <div style={styles.statLabel}>Mean</div>
            <div style={styles.statValue()}>{stats.mean.toFixed(0)}ms</div>
          </div>
          <div style={styles.statBox}>
            <div style={styles.statLabel}>Std Dev</div>
            <div style={styles.statValue()}>{stats.stdDev.toFixed(0)}ms</div>
          </div>
          <div style={styles.statBox}>
            <div style={styles.statLabel}>Jitter</div>
            <div style={styles.statValue(
              stats.jitter < 0.15 ? '#f87171' : stats.jitter < 0.3 ? '#fb923c' : '#4ade80'
            )}>
              {(stats.jitter * 100).toFixed(1)}%
            </div>
          </div>
          <div style={styles.statBox}>
            <div style={styles.statLabel}>Samples</div>
            <div style={styles.statValue()}>{scatterData.length}</div>
          </div>
        </div>
      )}

      {/* Chart */}
      <div style={styles.chartContainer}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 10, bottom: 30, left: 50 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.5} />
            
            <XAxis
              dataKey="x"
              type="number"
              domain={['dataMin', 'dataMax']}
              tickFormatter={formatTime}
              stroke="#6B7280"
              tick={{ fill: '#9CA3AF', fontSize: 11 }}
              label={{ value: 'Time', position: 'bottom', fill: '#6B7280', fontSize: 12 }}
            />
            
            <YAxis
              dataKey="y"
              type="number"
              domain={[0, 'auto']}
              stroke="#6B7280"
              tick={{ fill: '#9CA3AF', fontSize: 11 }}
              label={{ value: 'Delta (ms)', angle: -90, position: 'insideLeft', fill: '#6B7280', fontSize: 12 }}
            />
            
            {stats && isBeacon && (
              <ReferenceLine
                y={stats.mean}
                stroke="#EF4444"
                strokeDasharray="5 5"
                strokeWidth={2}
              />
            )}
            
            <Tooltip content={<CustomTooltip />} />
            
            <Scatter
              name="Timing"
              data={scatterData}
              fill={dotColor}
              fillOpacity={0.7}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Warning */}
      {isBeacon && (
        <div style={styles.warningBox}>
          <div style={styles.warningText}>
            <span>⚠️</span>
            <span>Rigid timing indicates automated C2 communication</span>
          </div>
        </div>
      )}
    </div>
  );
}
