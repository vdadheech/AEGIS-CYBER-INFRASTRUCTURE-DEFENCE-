/**
 * AEGIS Global Controls - Inline Styles (No Tailwind)
 */

import { useState } from 'react';
import { Clock, Filter, Activity, AlertTriangle, Shield, Zap } from 'lucide-react';
import { useThreatStore, useThreatStats } from './useThreatStore';

interface GlobalControlsProps {
  onGenerateData?: () => void;
  onClear?: () => void;
  isStreaming?: boolean;
}

const styles = {
  container: {
    background: 'rgba(17, 24, 39, 0.5)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(55, 65, 81, 0.5)',
    borderRadius: '16px',
    padding: '16px',
  },
  flexWrap: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
  },
  statsContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
  },
  statItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  iconBox: (color: string) => ({
    width: '40px',
    height: '40px',
    borderRadius: '12px',
    background: color,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }),
  statLabel: {
    color: '#6b7280',
    fontSize: '11px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  statValue: (color: string) => ({
    color,
    fontWeight: 'bold',
    fontSize: '20px',
  }),
  controlsContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  timeButton: (isActive: boolean) => ({
    padding: '6px 12px',
    fontSize: '14px',
    fontWeight: '500',
    borderRadius: '8px',
    background: isActive ? '#06b6d4' : 'transparent',
    color: isActive ? 'white' : '#9ca3af',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s',
  }),
  slider: {
    width: '128px',
    height: '8px',
    background: '#374151',
    borderRadius: '4px',
    appearance: 'none' as const,
    cursor: 'pointer',
  },
  button: (variant: 'primary' | 'secondary') => ({
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    background: variant === 'primary' ? '#0891b2' : '#374151',
    color: 'white',
    borderRadius: '8px',
    fontWeight: '500',
    fontSize: '14px',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s',
  }),
};

export function GlobalControls({ onGenerateData, onClear, isStreaming }: GlobalControlsProps) {
  const { confidenceThreshold, setConfidenceThreshold, setTimeRange } = useThreatStore();
  const stats = useThreatStats();
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>('1h');

  const timeRanges = [
    { label: '15m', value: 15 * 60 * 1000 },
    { label: '30m', value: 30 * 60 * 1000 },
    { label: '1h', value: 60 * 60 * 1000 },
    { label: '6h', value: 6 * 60 * 60 * 1000 },
    { label: '24h', value: 24 * 60 * 60 * 1000 },
  ];

  const handleTimeRangeChange = (label: string, value: number) => {
    setSelectedTimeRange(label);
    const now = Date.now();
    setTimeRange({ start: now - value, end: now });
  };

  const getConfidenceColor = () => {
    if (confidenceThreshold >= 80) return '#ef4444';
    if (confidenceThreshold >= 50) return '#f97316';
    return '#06b6d4';
  };

  return (
    <div style={styles.container}>
      <div style={styles.flexWrap}>
        {/* Left: Stats */}
        <div style={styles.statsContainer}>
          {/* Total Nodes */}
          <div style={styles.statItem}>
            <div style={styles.iconBox('rgba(6, 182, 212, 0.2)')}>
              <Activity style={{ width: '20px', height: '20px', color: '#06b6d4' }} />
            </div>
            <div>
              <div style={styles.statLabel}>Total Nodes</div>
              <div style={styles.statValue('#ffffff')}>{stats.total.toLocaleString()}</div>
            </div>
          </div>

          {/* Critical */}
          <div style={styles.statItem}>
            <div style={styles.iconBox('rgba(239, 68, 68, 0.2)')}>
              <AlertTriangle style={{ width: '20px', height: '20px', color: '#ef4444' }} />
            </div>
            <div>
              <div style={styles.statLabel}>Critical</div>
              <div style={styles.statValue('#ef4444')}>{stats.critical}</div>
            </div>
          </div>

          {/* Elevated */}
          <div style={styles.statItem}>
            <div style={styles.iconBox('rgba(249, 115, 22, 0.2)')}>
              <Shield style={{ width: '20px', height: '20px', color: '#f97316' }} />
            </div>
            <div>
              <div style={styles.statLabel}>Elevated</div>
              <div style={styles.statValue('#f97316')}>{stats.elevated}</div>
            </div>
          </div>

          {/* Streaming indicator */}
          {isStreaming && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              background: 'rgba(16, 185, 129, 0.2)',
              borderRadius: '8px',
              border: '1px solid rgba(16, 185, 129, 0.3)',
            }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#10b981',
                animation: 'pulse 1.5s ease-in-out infinite',
              }} />
              <span style={{ color: '#10b981', fontSize: '14px', fontWeight: '500' }}>Live Streaming</span>
            </div>
          )}
        </div>

        {/* Right: Controls */}
        <div style={styles.controlsContainer}>
          {/* Time Range */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock style={{ width: '16px', height: '16px', color: '#6b7280' }} />
            <div style={{ display: 'flex', background: 'rgba(55, 65, 81, 0.5)', borderRadius: '8px', padding: '4px' }}>
              {timeRanges.map(({ label, value }) => (
                <button
                  key={label}
                  onClick={() => handleTimeRangeChange(label, value)}
                  style={styles.timeButton(selectedTimeRange === label)}
                  onMouseEnter={(e) => {
                    if (selectedTimeRange !== label) {
                      e.currentTarget.style.background = 'rgba(55, 65, 81, 0.5)';
                      e.currentTarget.style.color = '#ffffff';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedTimeRange !== label) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = '#9ca3af';
                    }
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Confidence Threshold Slider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Filter style={{ width: '16px', height: '16px', color: '#6b7280' }} />
            <span style={{ color: '#9ca3af', fontSize: '14px' }}>Min Confidence:</span>
            <input
              type="range"
              min={0}
              max={100}
              value={confidenceThreshold}
              onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
              style={styles.slider}
            />
            <span style={{ 
              fontSize: '14px', 
              fontWeight: 'bold', 
              width: '48px', 
              color: getConfidenceColor(),
            }}>
              {confidenceThreshold}%
            </span>
          </div>

          {/* Action Buttons */}
          {onGenerateData && (
            <button
              onClick={onGenerateData}
              style={styles.button('primary')}
              onMouseEnter={(e) => e.currentTarget.style.background = '#0e7490'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#0891b2'}
            >
              <Zap style={{ width: '16px', height: '16px' }} />
              Generate Data
            </button>
          )}
          {onClear && (
            <button
              onClick={onClear}
              style={styles.button('secondary')}
              onMouseEnter={(e) => e.currentTarget.style.background = '#4b5563'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#374151'}
            >
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
