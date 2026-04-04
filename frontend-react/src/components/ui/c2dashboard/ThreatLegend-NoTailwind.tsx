/**
 * AEGIS Threat Legend - Inline Styles (No Tailwind)
 */

import { NODE_COLORS } from './types';

const styles = {
  container: {
    position: 'absolute' as const,
    top: '16px',
    right: '16px',
    background: 'rgba(17, 24, 39, 0.9)',
    backdropFilter: 'blur(8px)',
    borderRadius: '12px',
    padding: '16px',
    border: '1px solid rgba(55, 65, 81, 0.5)',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
  },
  title: {
    color: '#9ca3af',
    fontSize: '11px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    marginBottom: '12px',
    fontWeight: '500',
  },
  items: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  dot: (color: string) => ({
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    background: color,
  }),
  label: {
    color: '#d1d5db',
    fontSize: '14px',
    flex: 1,
  },
  threshold: {
    color: '#6b7280',
    fontSize: '12px',
  },
};

export function ThreatLegend() {
  const items = [
    { status: 'normal', label: 'Normal', color: NODE_COLORS.normal, threshold: '<30%' },
    { status: 'suspicious', label: 'Suspicious', color: NODE_COLORS.suspicious, threshold: '30-50%' },
    { status: 'elevated', label: 'Elevated', color: NODE_COLORS.elevated, threshold: '50-80%' },
    { status: 'critical', label: 'Critical', color: NODE_COLORS.critical, threshold: '80-90%' },
    { status: 'controller', label: 'Controller', color: NODE_COLORS.controller, threshold: '>90%' },
  ];

  return (
    <div style={styles.container}>
      <div style={styles.title}>Threat Level</div>
      <div style={styles.items}>
        {items.map(({ status, label, color, threshold }) => (
          <div key={status} style={styles.item}>
            <div style={styles.dot(color)} />
            <span style={styles.label}>{label}</span>
            <span style={styles.threshold}>{threshold}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
