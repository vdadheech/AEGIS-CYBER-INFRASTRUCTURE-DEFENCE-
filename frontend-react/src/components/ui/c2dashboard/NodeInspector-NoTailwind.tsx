/**
 * AEGIS Node Inspector - Inline Styles (No Tailwind)
 */

import { Shield, AlertTriangle, Clock, Hash, Network, Zap } from 'lucide-react';
import { useThreatStore } from './useThreatStore';
import { NODE_COLORS } from './types';

const styles = {
  container: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column' as const,
    background: 'rgba(17, 24, 39, 0.3)',
    borderRadius: '16px',
    border: '1px solid rgba(55, 65, 81, 0.5)',
    overflow: 'hidden',
  },
  emptyState: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '32px',
  },
  emptyIcon: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    background: 'rgba(55, 65, 81, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '16px',
  },
  emptyTitle: {
    color: '#6b7280',
    fontSize: '18px',
    fontWeight: '500',
    marginBottom: '8px',
  },
  emptySubtitle: {
    color: '#4b5563',
    fontSize: '14px',
    textAlign: 'center' as const,
  },
  header: (isCritical: boolean, isHighThreat: boolean) => ({
    padding: '16px',
    borderBottom: `1px solid ${isCritical ? 'rgba(239, 68, 68, 0.3)' : isHighThreat ? 'rgba(249, 115, 22, 0.3)' : 'rgba(55, 65, 81, 0.3)'}`,
    background: isCritical ? 'rgba(239, 68, 68, 0.1)' : isHighThreat ? 'rgba(249, 115, 22, 0.1)' : 'rgba(55, 65, 81, 0.3)',
  }),
  headerTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '8px',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  statusDot: (color: string, pulse: boolean) => ({
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    background: color,
    animation: pulse ? 'pulse 2s ease-in-out infinite' : 'none',
  }),
  ipAddress: {
    color: 'white',
    fontFamily: 'monospace',
    fontWeight: '600',
    fontSize: '18px',
  },
  statusBadge: (isCritical: boolean, isHighThreat: boolean) => ({
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 'bold',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    background: isCritical ? 'rgba(239, 68, 68, 0.2)' : isHighThreat ? 'rgba(249, 115, 22, 0.2)' : 'rgba(59, 130, 246, 0.2)',
    color: isCritical ? '#f87171' : isHighThreat ? '#fb923c' : '#60a5fa',
  }),
  label: {
    color: '#9ca3af',
    fontSize: '14px',
  },
  content: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: '16px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
  },
  confidenceBox: {
    background: 'rgba(55, 65, 81, 0.5)',
    borderRadius: '12px',
    padding: '16px',
    border: '1px solid rgba(55, 65, 81, 0.5)',
  },
  confidenceHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '12px',
  },
  confidenceLabel: {
    color: '#9ca3af',
    fontSize: '12px',
    fontWeight: '500',
  },
  confidenceValue: (color: string) => ({
    fontSize: '28px',
    fontWeight: 'bold',
    color,
  }),
  progressBar: {
    height: '16px',
    background: '#1f2937',
    borderRadius: '9999px',
    overflow: 'hidden',
    position: 'relative' as const,
  },
  progressFill: (percentage: number, color: string) => ({
    height: '100%',
    width: `${percentage}%`,
    background: `linear-gradient(to right, ${color}, ${color}aa)`,
    borderRadius: '9999px',
    transition: 'width 0.8s ease-out',
  }),
  progressText: {
    position: 'absolute' as const,
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px',
  },
  metricCard: {
    background: 'rgba(55, 65, 81, 0.5)',
    borderRadius: '12px',
    padding: '12px',
    border: '1px solid rgba(55, 65, 81, 0.5)',
  },
  metricHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '4px',
  },
  metricLabel: {
    color: '#6b7280',
    fontSize: '11px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  metricValue: (color: string) => ({
    color,
    fontWeight: '600',
    fontSize: '18px',
  }),
  timingBox: {
    background: 'rgba(234, 179, 8, 0.1)',
    border: '1px solid rgba(234, 179, 8, 0.3)',
    borderRadius: '12px',
    padding: '16px',
  },
  timingHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
  },
  timingTitle: {
    color: '#fbbf24',
    fontWeight: '600',
  },
  timingValue: {
    color: 'white',
    fontFamily: 'monospace',
  },
  reasonsSection: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  reasonsHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  reasonsLabel: {
    color: '#9ca3af',
    fontSize: '12px',
    fontWeight: '500',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  reasonItem: (isWarning: boolean) => ({
    padding: '12px',
    borderRadius: '8px',
    border: `1px solid ${isWarning ? 'rgba(239, 68, 68, 0.3)' : 'rgba(55, 65, 81, 0.5)'}`,
    background: isWarning ? 'rgba(239, 68, 68, 0.1)' : 'rgba(55, 65, 81, 0.5)',
    color: isWarning ? '#f87171' : '#d1d5db',
    fontSize: '14px',
  }),
  actions: {
    padding: '16px',
    borderTop: '1px solid rgba(55, 65, 81, 0.5)',
    background: 'rgba(55, 65, 81, 0.3)',
    display: 'flex',
    gap: '12px',
  },
  actionButton: (variant: 'danger' | 'warning') => ({
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '12px 16px',
    background: variant === 'danger' ? '#dc2626' : '#ea580c',
    color: 'white',
    fontWeight: '600',
    borderRadius: '12px',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s',
  }),
};

function MetricCard({ icon: Icon, label, value, color = '#9ca3af' }: {
  icon: typeof Shield;
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div style={styles.metricCard}>
      <div style={styles.metricHeader}>
        <Icon style={{ width: '16px', height: '16px', color }} />
        <span style={styles.metricLabel}>{label}</span>
      </div>
      <div style={styles.metricValue(color)}>{value}</div>
    </div>
  );
}

export function NodeInspector() {
  const selectedNodeId = useThreatStore(state => state.selectedNodeId);
  const getSelectedNode = useThreatStore(state => state.getSelectedNode);
  const openKillSwitch = useThreatStore(state => state.openKillSwitch);
  const node = getSelectedNode();

  if (!selectedNodeId || !node) {
    return (
      <div style={styles.container}>
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>
            <Shield style={{ width: '40px', height: '40px', color: '#4b5563' }} />
          </div>
          <div style={styles.emptyTitle}>Node Inspector</div>
          <div style={styles.emptySubtitle}>
            Select a node from the graph to view<br />detailed threat attribution
          </div>
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
  
  const getConfidenceColor = () => {
    if (isCritical) return '#ef4444';
    if (isHighThreat) return '#f97316';
    return '#3b82f6';
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header(isCritical, isHighThreat)}>
        <div style={styles.headerTop}>
          <div style={styles.headerLeft}>
            <div style={styles.statusDot(NODE_COLORS[node.status], isCritical)} />
            <span style={styles.ipAddress}>{node.ip}</span>
          </div>
          <span style={styles.statusBadge(isCritical, isHighThreat)}>
            {statusLabels[node.status]}
          </span>
        </div>
        <div style={styles.label}>{node.label}</div>
      </div>

      {/* Content */}
      <div style={styles.content}>
        {/* C2 Confidence */}
        <div style={styles.confidenceBox}>
          <div style={styles.confidenceHeader}>
            <span style={styles.confidenceLabel}>C2 CONFIDENCE</span>
            <span style={styles.confidenceValue(getConfidenceColor())}>
              {node.confidence.toFixed(1)}%
            </span>
          </div>
          <div style={styles.progressBar}>
            <div style={styles.progressFill(node.confidence, getConfidenceColor())} />
            <div style={styles.progressText}>{node.confidence.toFixed(1)}%</div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div style={styles.metricsGrid}>
          <MetricCard icon={Network} label="Connections" value={node.connections} color="#22d3ee" />
          <MetricCard icon={Zap} label="Centrality" value={`${(node.centrality * 100).toFixed(0)}%`} color="#a855f7" />
          {node.beaconInterval && (
            <MetricCard icon={Clock} label="Beacon" value={`${node.beaconInterval}ms`} color="#fbbf24" />
          )}
          {node.headerHash && (
            <MetricCard icon={Hash} label="Header Hash" value={node.headerHash.slice(0, 10)} color="#9ca3af" />
          )}
        </div>

        {/* Timing Signature */}
        {node.beaconInterval && (
          <div style={styles.timingBox}>
            <div style={styles.timingHeader}>
              <Clock style={{ width: '20px', height: '20px', color: '#fbbf24' }} />
              <span style={styles.timingTitle}>Timing Signature</span>
            </div>
            <div style={styles.timingValue}>
              {node.beaconInterval}ms fixed interval ± {((node.jitter || 0) * 100).toFixed(0)}%
            </div>
          </div>
        )}

        {/* Reasons */}
        {node.reasons.length > 0 && (
          <div style={styles.reasonsSection}>
            <div style={styles.reasonsHeader}>
              <AlertTriangle style={{ width: '16px', height: '16px', color: '#fb923c' }} />
              <span style={styles.reasonsLabel}>Attribution Reasons</span>
            </div>
            {node.reasons.map((reason, i) => (
              <div 
                key={i} 
                style={styles.reasonItem(reason.includes('SHADOW') || reason.includes('⚠️'))}
              >
                {reason}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {isHighThreat && (
        <div style={styles.actions}>
          <button
            onClick={() => openKillSwitch(node)}
            style={styles.actionButton('danger')}
            onMouseEnter={(e) => e.currentTarget.style.background = '#b91c1c'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#dc2626'}
          >
            <Shield style={{ width: '20px', height: '20px' }} />
            Generate Block Rule
          </button>
          <button
            onClick={() => openKillSwitch(node)}
            style={styles.actionButton('warning')}
            onMouseEnter={(e) => e.currentTarget.style.background = '#c2410c'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#ea580c'}
          >
            <Zap style={{ width: '20px', height: '20px' }} />
            Isolate Node
          </button>
        </div>
      )}
    </div>
  );
}
