import { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { CityMapNode } from '../types';
import styles from './Tooltip.module.css';

export function useTooltip() {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [nodeData, setNodeData] = useState<CityMapNode | null>(null);

  const show = useCallback((event: MouseEvent, data: CityMapNode) => {
    setNodeData(data);
    setPosition({ x: event.pageX + 15, y: event.pageY + 15 });
    setVisible(true);
  }, []);

  const hide = useCallback(() => {
    setVisible(false);
  }, []);

  return { visible, position, nodeData, show, hide };
}

interface TooltipProps {
  visible: boolean;
  position: { x: number; y: number };
  nodeData: CityMapNode | null;
}

export function Tooltip({ visible, position, nodeData }: TooltipProps) {
  if (!nodeData) return null;

  let statusClass = styles.healthy;
  if (nodeData.http_status >= 500) statusClass = styles.compromised;
  else if (nodeData.http_status >= 400) statusClass = styles.unstable;

  return createPortal(
    <div
      className={`${styles.tooltip} ${visible ? styles.visible : ''}`}
      style={{ left: position.x, top: position.y }}
      role="tooltip"
      aria-hidden={!visible}
    >
      <div className={`${styles.header} ${statusClass}`}>
        NODE-{nodeData.node_serial}
      </div>
      <div className={styles.body}>
        <div>
          HTTP Status: <span>{nodeData.http_status}</span>
        </div>
        <div>
          Compromised:{' '}
          <span>{nodeData.status_color === 'RED' ? 'YES' : 'NO'}</span>
        </div>
      </div>
    </div>,
    document.body
  );
}
