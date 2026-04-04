/**
 * AEGIS C2 Dashboard - Inline Styles Version (No Tailwind Required)
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import { NetworkGraph } from './NetworkGraph';
import { BeaconingScatter } from './BeaconingScatter-NoTailwind';
import { NodeInspector } from './NodeInspector-NoTailwind';
import { GlobalControls } from './GlobalControls-NoTailwind';
import { KillSwitchModal } from './KillSwitchModal-NoTailwind';
import { ThreatLegend } from './ThreatLegend-NoTailwind';
import { useThreatStore } from './useThreatStore';
import { generateMockData } from './mockDataGenerator';

const styles = {
  container: {
    height: '100vh',
    width: '100%',
    background: '#0a0e1a',
    color: 'white',
    overflow: 'hidden',
    position: 'relative' as const,
  },
  background: {
    position: 'absolute' as const,
    inset: 0,
    background: 'linear-gradient(to bottom right, #111827, #0a0e1a, #000000)',
  },
  content: {
    position: 'relative' as const,
    height: '100%',
    display: 'flex',
    flexDirection: 'column' as const,
    padding: '16px',
    gap: '16px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  logo: {
    width: '40px',
    height: '40px',
    borderRadius: '12px',
    background: 'linear-gradient(to bottom right, #06b6d4, #3b82f6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    background: 'linear-gradient(to right, #06b6d4, #3b82f6)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  subtitle: {
    color: '#6b7280',
    fontSize: '14px',
  },
  mainGrid: {
    flex: 1,
    display: 'grid',
    gridTemplateColumns: '3fr 2fr',
    gap: '16px',
    minHeight: 0,
  },
  graphContainer: {
    position: 'relative' as const,
    background: 'rgba(17, 24, 39, 0.3)',
    borderRadius: '16px',
    overflow: 'hidden',
    border: '1px solid rgba(55, 65, 81, 0.5)',
  },
  rightPanel: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
    minHeight: 0,
  },
  scatterContainer: {
    height: '45%',
    minHeight: 0,
  },
  inspectorContainer: {
    flex: 1,
    minHeight: 0,
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    color: '#4b5563',
    fontSize: '12px',
  },
};

export function C2Dashboard({ scale = 1.5 }: { scale?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  
  const { setNodes, setLinks, reset } = useThreatStore();

  // Responsive sizing
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({
          width: rect.width - 32,
          height: rect.height - 32,
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Generate initial data
  const generateData = useCallback(() => {
    reset();
    const data = generateMockData(scale);
    setNodes(data.nodes);
    setLinks(data.links);
    console.log(`[AEGIS] Generated ${data.nodes.length} nodes`);
  }, [scale, reset, setNodes, setLinks]);

  useEffect(() => {
    generateData();
  }, [generateData]);

  return (
    <div style={styles.container}>
      <div style={styles.background} />
      
      <div style={styles.content}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <div style={styles.logo}>🛡️</div>
            <div>
              <h1 style={styles.title}>AEGIS Active Attribution Engine</h1>
              <p style={styles.subtitle}>Real-time C2 Infrastructure Detection</p>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#6b7280', fontSize: '14px' }}>v2.0</span>
            <div style={{ 
              width: '8px', 
              height: '8px', 
              borderRadius: '50%', 
              background: '#10b981',
              animation: 'pulse 2s ease-in-out infinite',
            }} />
            <span style={{ color: '#10b981', fontSize: '14px' }}>Online</span>
          </div>
        </div>

        {/* Global Controls */}
        <GlobalControls onGenerateData={generateData} onClear={reset} />

        {/* Main Grid */}
        <div style={styles.mainGrid}>
          {/* Network Graph */}
          <div ref={containerRef} style={styles.graphContainer}>
            <NetworkGraph width={dimensions.width} height={dimensions.height} />
            <ThreatLegend />
          </div>

          {/* Right Panel */}
          <div style={styles.rightPanel}>
            <div style={styles.scatterContainer}>
              <BeaconingScatter />
            </div>
            <div style={styles.inspectorContainer}>
              <NodeInspector />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <span>© 2024 AEGIS Security • Enterprise Threat Intelligence</span>
          <span>WebGL Rendering • 60fps @ 10K+ nodes</span>
        </div>
      </div>

      <KillSwitchModal />
    </div>
  );
}
