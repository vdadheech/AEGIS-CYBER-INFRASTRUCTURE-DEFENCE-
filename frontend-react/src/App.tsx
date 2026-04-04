import { useState, useCallback, useRef } from 'react';
import { Header } from './components/layout/Header';
import { SchemaConsole } from './sections/SchemaConsole';
import { AssetRegistry } from './sections/AssetRegistry';
import { ForensicCityMap } from './sections/ForensicCityMap';
import { NodeInspector } from './sections/NodeInspector';
import { HeatmapPanel, type HeatmapPanelRef } from './sections/HeatmapPanel';
import { Tooltip, useTooltip } from './sections/Tooltip';
import { C2Dashboard } from './components/ui/c2dashboard/C2Dashboard-NoTailwind';
import { useWebSocket } from './hooks/useWebSocket';
import type { CityMapNode } from './types';
import styles from './App.module.css';

export default function App() {
  const [activeTab, setActiveTab] = useState('Overview');
  const [threatCount, setThreatCount] = useState(-1);
  const [selectedNode, setSelectedNode] = useState<CityMapNode | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const heatmapRef = useRef<HeatmapPanelRef>(null);
  const tooltip = useTooltip();

  // WebSocket integration
  useWebSocket({
    onLog: useCallback((logId: number, responseTimeMs: number) => {
      // Push to heatmap chart
      heatmapRef.current?.addLivePoint(logId, responseTimeMs);
    }, []),
    onSchemaChange: useCallback((logId: number, version: number, activeColumn: string) => {
      (SchemaConsole as any).__appendLog?.(
        `> ⚠ SCHEMA ROTATION AT LOG ${logId}: V${version} ACTIVE → KEY '${activeColumn}'`,
        true
      );
    }, []),
    onStreamComplete: useCallback(() => {
      (SchemaConsole as any).__appendLog?.(
        '> Stream replay complete. All 10,000 packets processed.',
        false
      );
    }, []),
    onStatusChange: useCallback((message: string, isWarning?: boolean) => {
      (SchemaConsole as any).__appendLog?.(message, !!isWarning);
    }, []),
  });

  const handleNodeClick = useCallback((data: CityMapNode) => {
    setSelectedNode(data);
    setInspectorOpen(true);
  }, []);

  const handleCloseInspector = useCallback(() => {
    setInspectorOpen(false);
  }, []);

  const handleThreatCountChange = useCallback((count: number) => {
    setThreatCount(count);
  }, []);

  const isOverview = activeTab === 'Overview';
  const isAttribution = activeTab === 'Attribution';
  const showMap = isOverview || activeTab === 'Defense Map';
  const showEndpoints = isOverview || activeTab === 'Endpoints';
  const showForensics = isOverview || activeTab === 'Forensics';

  // Show Attribution Dashboard (full screen)
  if (isAttribution) {
    return (
      <div className={styles.app}>
        <Header 
          threatCount={threatCount} 
          activeTab={activeTab} 
          onTabChange={setActiveTab} 
        />
        <C2Dashboard scale={1.5} />
      </div>
    );
  }

  return (
    <div className={styles.app}>
      <Header 
        threatCount={threatCount} 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
      />

      <main className={`${styles.grid} ${!isOverview ? styles.focused : ''}`} role="main">
        {/* Left column */}
        <div className={`${styles.colLeft} ${!showEndpoints && !showForensics ? styles.hidden : ''}`}>
          {showForensics && <SchemaConsole />}
          {showEndpoints && (
            <AssetRegistry
              onThreatCountChange={handleThreatCountChange}
              selectedNodeId={selectedNode?.node_id ?? null}
            />
          )}
        </div>

        {/* Right column — Map + Inspector */}
        <div className={`${styles.colRight} ${!showMap ? styles.hidden : ''}`}>
          <ForensicCityMap
            onNodeHover={tooltip.show}
            onNodeHoverOut={tooltip.hide}
            onNodeClick={handleNodeClick}
          />
          <NodeInspector
            node={selectedNode}
            open={inspectorOpen}
            onClose={handleCloseInspector}
          />
        </div>

        {/* Heatmap row */}
        {showForensics && (
          <HeatmapPanel ref={heatmapRef} className={styles.heatmapRow} />
        )}
      </main>

      <Tooltip
        visible={tooltip.visible}
        position={tooltip.position}
        nodeData={tooltip.nodeData}
      />
    </div>
  );
}
