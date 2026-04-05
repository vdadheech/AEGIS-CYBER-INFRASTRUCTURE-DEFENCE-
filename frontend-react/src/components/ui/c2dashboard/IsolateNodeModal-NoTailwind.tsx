import { AlertTriangle, Lock, ShieldAlert, X } from 'lucide-react';
import { useThreatStore } from './useThreatStore';

const styles = {
  overlay: {
    position: 'fixed' as const,
    inset: 0,
    zIndex: 50,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
    background: 'rgba(0, 0, 0, 0.7)',
    backdropFilter: 'blur(4px)',
  },
  modal: {
    width: '100%',
    maxWidth: '640px',
    background: '#111827',
    borderRadius: '16px',
    border: '1px solid #374151',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '24px',
    borderBottom: '1px solid #374151',
    background: 'linear-gradient(to right, rgba(154, 52, 18, 0.3), #111827)',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  headerIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    background: 'rgba(249, 115, 22, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    color: '#9ca3af',
    fontSize: '14px',
  },
  closeButton: {
    padding: '8px',
    color: '#9ca3af',
    background: 'transparent',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  body: {
    padding: '24px',
    borderBottom: '1px solid #374151',
    background: 'rgba(55, 65, 81, 0.5)',
  },
  target: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    color: 'white',
    fontWeight: 600,
    marginBottom: '12px',
  },
  bodyText: {
    fontSize: '14px',
    color: '#d1d5db',
    lineHeight: 1.5,
  },
  meta: {
    marginTop: '8px',
    fontSize: '12px',
    color: '#9ca3af',
  },
  plan: {
    margin: '24px',
    padding: '16px',
    borderRadius: '12px',
    border: '1px solid #374151',
    background: 'rgba(0, 0, 0, 0.4)',
    color: '#d1d5db',
    fontSize: '14px',
  },
  planTitle: {
    color: '#fdba74',
    fontWeight: 600,
    marginBottom: '8px',
  },
  footer: {
    padding: '16px',
    borderTop: '1px solid #374151',
    background: 'rgba(55, 65, 81, 0.3)',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
  },
  secondaryBtn: {
    padding: '8px 16px',
    background: '#374151',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  primaryBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    background: '#ea580c',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
};

export function IsolateNodeModal() {
  const showIsolateModal = useThreatStore((state) => state.showIsolateModal);
  const isolateTarget = useThreatStore((state) => state.isolateTarget);
  const closeIsolate = useThreatStore((state) => state.closeIsolate);
  const isolateNode = useThreatStore((state) => state.isolateNode);

  if (!showIsolateModal || !isolateTarget) return null;

  return (
    <div style={styles.overlay} onClick={closeIsolate}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <div style={styles.headerIcon}>
              <ShieldAlert style={{ width: '24px', height: '24px', color: '#fb923c' }} />
            </div>
            <div>
              <h2 style={styles.headerTitle}>Isolate Node</h2>
              <p style={styles.headerSubtitle}>Contain this host from lateral movement</p>
            </div>
          </div>
          <button style={styles.closeButton} onClick={closeIsolate}>
            <X style={{ width: '20px', height: '20px' }} />
          </button>
        </div>

        <div style={styles.body}>
          <div style={styles.target}>
            <AlertTriangle style={{ width: '20px', height: '20px', color: '#fb923c' }} />
            <span>Target: {isolateTarget.ip}</span>
          </div>
          <div style={styles.bodyText}>
            This action isolates the selected node in the dashboard workflow so analysts can contain it quickly.
          </div>
          <div style={styles.meta}>
            Confidence: {isolateTarget.confidence.toFixed(1)}% • {isolateTarget.label}
          </div>
        </div>

        <div style={styles.plan}>
          <div style={styles.planTitle}>Isolation plan</div>
          <ul>
            <li>Block inbound and outbound traffic for this node.</li>
            <li>Allow controlled forensic access only.</li>
            <li>Mark node as isolated for operator visibility.</li>
          </ul>
        </div>

        <div style={styles.footer}>
          <button style={styles.secondaryBtn} onClick={closeIsolate}>
            Cancel
          </button>
          <button style={styles.primaryBtn} onClick={() => isolateNode(isolateTarget.id)}>
            <Lock style={{ width: '16px', height: '16px' }} />
            Isolate this node
          </button>
        </div>
      </div>
    </div>
  );
}
