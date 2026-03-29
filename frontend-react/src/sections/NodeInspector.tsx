import { useState, useCallback } from 'react';
import { X } from 'lucide-react';
import { quarantineNode } from '../api/endpoints';
import { Badge } from '../components/ui/Badge';
import type { CityMapNode } from '../types';
import styles from './NodeInspector.module.css';

interface NodeInspectorProps {
  node: CityMapNode | null;
  open: boolean;
  onClose: () => void;
}

export function NodeInspector({ node, open, onClose }: NodeInspectorProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const handleQuarantine = useCallback(async () => {
    if (!node) return;
    setLoading(true);
    setError(false);
    try {
      await quarantineNode(node.node_id);
      node.is_quarantined = 1;
      node.status_color = 'QUARANTINED';
    } catch (e) {
      console.error('Quarantine failed', e);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [node]);

  if (!node) return null;

  const isQuarantined = node.is_quarantined === 1 || node.status_color === 'QUARANTINED';
  const isHealthy = node.status_color === 'GREEN';
  const isWarning = node.status_color === 'YELLOW';
  const isCritical = node.status_color === 'RED';

  const badgeVariant = isQuarantined
    ? 'quarantined'
    : isCritical
    ? 'critical'
    : isWarning
    ? 'warning'
    : 'healthy';

  const badgeLabel = isQuarantined
    ? 'QUARANTINED'
    : isCritical
    ? 'COMPROMISED'
    : isWarning
    ? 'UNSTABLE'
    : 'HEALTHY';

  const flags = [
    node.spoof_flag ? 'SPOOFING' : null,
    node.ddos_flag ? 'DDoS' : null,
    node.malware_flag ? 'MALWARE' : null,
  ]
    .filter(Boolean)
    .join(' • ');

  // Format the values precisely for the Vercel aesthetic
  return (
    <aside className={`${styles.panel} ${open ? styles.open : ''}`} aria-hidden={!open}>
      <div className={styles.header}>
        <span className={styles.headerTitle}>Network Integrity</span>
        <button onClick={onClose} className={styles.closeBtn} aria-label="Close panel">
          <X size={20} />
        </button>
      </div>

      <div className={styles.content}>
        <div className={styles.badgeWrapper}>
          <Badge variant={badgeVariant}>{badgeLabel}</Badge>
        </div>

        <div className={styles.detailGroup}>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Hardware Serial</span>
            <span className={styles.detailValue}>{node.node_serial}</span>
          </div>

          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Network ID</span>
            <span className={styles.detailValue}>N-{node.node_id}</span>
          </div>

          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Physical Location</span>
            <span className={styles.detailValue}>{node.location || 'Unknown Sector'}</span>
          </div>

          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>HTTP Status Code</span>
            <span
              className={`${styles.detailValue} ${
                isCritical ? styles.threatHigh : isWarning ? styles.threatWarn : ''
              }`}
            >
              {node.http_status}
            </span>
          </div>

          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Latency Average</span>
            <span className={styles.detailValue}>{node.response_time?.toFixed(1)} ms</span>
          </div>

          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Detected Threats</span>
            <span
              className={`${styles.detailValue} ${
                flags.length ? styles.threatHigh : styles.threatLow
              }`}
            >
              {flags || 'None'}
            </span>
          </div>
        </div>

        <div className={styles.quarantineAction}>
          <button
            className={`${styles.btn} ${isQuarantined ? styles.btnQuarantined : ''}`}
            onClick={handleQuarantine}
            disabled={loading || isQuarantined || isHealthy || isWarning}
          >
            {loading ? 'Executing ISOLATION...' : error ? 'ISOLATION FAILED' : isQuarantined ? 'NODE SECURED' : 'QUARANTINE ENDPOINT'}
          </button>
        </div>
      </div>
    </aside>
  );
}
