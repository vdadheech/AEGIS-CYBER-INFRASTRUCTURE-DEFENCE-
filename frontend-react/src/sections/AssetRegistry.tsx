import { useState, useEffect, useCallback } from 'react';
import { Panel } from '../components/ui/Panel';
import { Badge } from '../components/ui/Badge';
import { fetchAssets } from '../api/endpoints';
import { useInterval } from '../hooks/useInterval';
import type { Asset } from '../types';
import styles from './AssetRegistry.module.css';

interface AssetRegistryProps {
  onThreatCountChange: (count: number) => void;
  selectedNodeId: number | null;
  className?: string;
}

export function AssetRegistry({
  onThreatCountChange,
  selectedNodeId,
  className = '',
}: AssetRegistryProps) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadAssets = useCallback(async () => {
    try {
      const data = await fetchAssets();
      setAssets(data.assets);
      setError(false);

      const threats = data.assets.filter((a) => a.threat_score >= 2).length;
      onThreatCountChange(threats);
    } catch (e) {
      console.error('Asset fetch failed', e);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [onThreatCountChange]);

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  useInterval(loadAssets, 5000);

  const getThreatClass = (score: number) => {
    if (score >= 2) return styles.threatHigh;
    if (score === 1) return styles.threatWarn;
    return styles.threatLow;
  };

  const getStatusLabel = (score: number) => {
    if (score >= 2) return 'COMPROMISED';
    if (score === 1) return 'UNSTABLE';
    return 'HEALTHY';
  };

  return (
    <Panel
      title="ASSET REGISTRY"
      headerRight={<Badge variant="live">LIVE</Badge>}
      className={`${styles.wrapper} ${className}`}
      ariaLabel="Asset Registry — Live network node status"
    >
      <div className={styles.tableContainer}>
        {error ? (
          <div className={styles.errorState} role="alert">
            ⚠ CONNECTION ERROR
            <br />
            Unable to fetch asset data
          </div>
        ) : loading ? (
          <div className={styles.emptyState}>Loading assets...</div>
        ) : assets.length === 0 ? (
          <div className={styles.emptyState}>No assets registered</div>
        ) : (
          <table className={styles.table} role="grid" aria-label="Network assets">
            <thead>
              <tr>
                <th scope="col">NODE</th>
                <th scope="col">SERIAL</th>
                <th scope="col">SCORE</th>
                <th scope="col">STATUS</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((asset) => (
                <tr
                  key={asset.node_id}
                  className={selectedNodeId === asset.node_id ? styles.selected : ''}
                  id={`row-${asset.node_id}`}
                >
                  <td>N-{asset.node_id}</td>
                  <td title={asset.hardware_serial}>
                    {asset.hardware_serial?.slice(0, 10)}…
                  </td>
                  <td className={getThreatClass(asset.threat_score)}>
                    {asset.threat_score}
                  </td>
                  <td className={getThreatClass(asset.threat_score)}>
                    {getStatusLabel(asset.threat_score)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Panel>
  );
}
