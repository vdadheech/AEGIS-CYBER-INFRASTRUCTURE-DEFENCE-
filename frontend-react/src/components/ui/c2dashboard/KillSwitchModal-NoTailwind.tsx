/**
 * AEGIS Kill Switch Modal - Inline Styles (No Tailwind)
 */

import { useState } from 'react';
import { X, Copy, Check, Shield, Terminal, AlertTriangle } from 'lucide-react';
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
    maxWidth: '672px',
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
    background: 'linear-gradient(to right, rgba(127, 29, 29, 0.3), #111827)',
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
    background: 'rgba(239, 68, 68, 0.2)',
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
    transition: 'all 0.2s',
  },
  targetInfo: {
    padding: '24px',
    background: 'rgba(55, 65, 81, 0.5)',
    borderBottom: '1px solid #374151',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  targetText: {
    color: 'white',
    fontWeight: '600',
  },
  targetSubtext: {
    color: '#9ca3af',
    fontSize: '14px',
  },
  tabs: {
    display: 'flex',
    borderBottom: '1px solid #374151',
  },
  tab: (isActive: boolean) => ({
    flex: 1,
    padding: '12px 16px',
    fontSize: '14px',
    fontWeight: '500',
    background: isActive ? '#1f2937' : 'transparent',
    color: isActive ? 'white' : '#9ca3af',
    border: 'none',
    borderBottom: isActive ? '2px solid #06b6d4' : '2px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.2s',
  }),
  commands: {
    padding: '24px',
    maxHeight: '384px',
    overflowY: 'auto' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
  },
  commandSection: {
    marginBottom: '16px',
  },
  commandHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '8px',
  },
  commandLabel: (color: string) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color,
    fontSize: '14px',
    fontWeight: '500',
  }),
  copyButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 12px',
    fontSize: '12px',
    background: '#374151',
    color: '#d1d5db',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  codeBlock: {
    padding: '16px',
    background: 'rgba(0, 0, 0, 0.5)',
    borderRadius: '12px',
    fontSize: '14px',
    color: '#d1d5db',
    fontFamily: 'monospace',
    overflowX: 'auto' as const,
    border: '1px solid #374151',
    whiteSpace: 'pre-wrap' as const,
  },
  footer: {
    padding: '16px',
    borderTop: '1px solid #374151',
    background: 'rgba(55, 65, 81, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerText: {
    color: '#6b7280',
    fontSize: '12px',
  },
  closeBtn: {
    padding: '8px 16px',
    background: '#374151',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
};

export function KillSwitchModal() {
  const showKillSwitchModal = useThreatStore(state => state.showKillSwitchModal);
  const killSwitchTarget = useThreatStore(state => state.killSwitchTarget);
  const closeKillSwitch = useThreatStore(state => state.closeKillSwitch);
  const [copied, setCopied] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'iptables' | 'windows' | 'pf'>('iptables');

  if (!showKillSwitchModal || !killSwitchTarget) return null;

  const ip = killSwitchTarget.ip;

  const rules = {
    iptables: {
      label: 'Linux (iptables)',
      block: `# Block all traffic from ${ip}\niptables -A INPUT -s ${ip} -j DROP\niptables -A OUTPUT -d ${ip} -j DROP\n\n# Log before dropping\niptables -A INPUT -s ${ip} -j LOG --log-prefix "AEGIS_BLOCK: "\niptables -A INPUT -s ${ip} -j DROP`,
      isolate: `# Isolate host - block all except management\niptables -A FORWARD -s ${ip} -j DROP\niptables -A FORWARD -d ${ip} -j DROP\n\n# Allow only SSH for investigation\niptables -A INPUT -s ${ip} -p tcp --dport 22 -j ACCEPT\niptables -A INPUT -s ${ip} -j DROP`,
    },
    windows: {
      label: 'Windows Firewall',
      block: `# Block inbound from ${ip}\nNew-NetFirewallRule -DisplayName "AEGIS_BLOCK_${ip}" -Direction Inbound -RemoteAddress ${ip} -Action Block\n\n# Block outbound to ${ip}\nNew-NetFirewallRule -DisplayName "AEGIS_BLOCK_OUT_${ip}" -Direction Outbound -RemoteAddress ${ip} -Action Block`,
      isolate: `# Isolate network segment\nnetsh advfirewall firewall add rule name="AEGIS_ISOLATE_${ip}" dir=in action=block remoteip=${ip}\nnetsh advfirewall firewall add rule name="AEGIS_ISOLATE_OUT_${ip}" dir=out action=block remoteip=${ip}`,
    },
    pf: {
      label: 'BSD/macOS (pf)',
      block: `# Add to /etc/pf.conf\nblock in quick from ${ip} to any\nblock out quick from any to ${ip}\n\n# Reload rules\npfctl -f /etc/pf.conf\npfctl -e`,
      isolate: `# Quarantine table\ntable <quarantine> persist { ${ip} }\nblock in quick from <quarantine>\nblock out quick to <quarantine>\n\n# Reload: pfctl -f /etc/pf.conf`,
    },
  };

  const copyToClipboard = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div style={styles.overlay} onClick={closeKillSwitch}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <div style={styles.headerIcon}>
              <Shield style={{ width: '24px', height: '24px', color: '#f87171' }} />
            </div>
            <div>
              <h2 style={styles.headerTitle}>Kill Switch</h2>
              <p style={styles.headerSubtitle}>Generate firewall rules for threat mitigation</p>
            </div>
          </div>
          <button
            onClick={closeKillSwitch}
            style={styles.closeButton}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#1f2937'; e.currentTarget.style.color = 'white'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#9ca3af'; }}
          >
            <X style={{ width: '20px', height: '20px' }} />
          </button>
        </div>

        {/* Target Info */}
        <div style={styles.targetInfo}>
          <AlertTriangle style={{ width: '24px', height: '24px', color: '#f87171' }} />
          <div>
            <div style={styles.targetText}>Target: {killSwitchTarget.ip}</div>
            <div style={styles.targetSubtext}>
              {killSwitchTarget.label} | C2 Confidence: {killSwitchTarget.confidence.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={styles.tabs}>
          {(['iptables', 'windows', 'pf'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={styles.tab(activeTab === tab)}
            >
              {rules[tab].label}
            </button>
          ))}
        </div>

        {/* Commands */}
        <div style={styles.commands}>
          {/* Block Rule */}
          <div>
            <div style={styles.commandHeader}>
              <div style={styles.commandLabel('#f87171')}>
                <Terminal style={{ width: '16px', height: '16px' }} />
                <span>BLOCK RULE</span>
              </div>
              <button
                onClick={() => copyToClipboard(rules[activeTab].block, 'block')}
                style={styles.copyButton}
              >
                {copied === 'block' ? (
                  <><Check style={{ width: '12px', height: '12px', color: '#4ade80' }} /><span style={{ color: '#4ade80' }}>Copied!</span></>
                ) : (
                  <><Copy style={{ width: '12px', height: '12px' }} /><span>Copy</span></>
                )}
              </button>
            </div>
            <pre style={styles.codeBlock}>{rules[activeTab].block}</pre>
          </div>

          {/* Isolate Rule */}
          <div>
            <div style={styles.commandHeader}>
              <div style={styles.commandLabel('#fb923c')}>
                <Terminal style={{ width: '16px', height: '16px' }} />
                <span>ISOLATE RULE</span>
              </div>
              <button
                onClick={() => copyToClipboard(rules[activeTab].isolate, 'isolate')}
                style={styles.copyButton}
              >
                {copied === 'isolate' ? (
                  <><Check style={{ width: '12px', height: '12px', color: '#4ade80' }} /><span style={{ color: '#4ade80' }}>Copied!</span></>
                ) : (
                  <><Copy style={{ width: '12px', height: '12px' }} /><span>Copy</span></>
                )}
              </button>
            </div>
            <pre style={styles.codeBlock}>{rules[activeTab].isolate}</pre>
          </div>
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <p style={styles.footerText}>⚠️ Review rules carefully before applying in production</p>
          <button
            onClick={closeKillSwitch}
            style={styles.closeBtn}
            onMouseEnter={(e) => e.currentTarget.style.background = '#4b5563'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#374151'}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
