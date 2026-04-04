/**
 * AEGIS Kill Switch Modal
 * 
 * Generates actionable firewall rules for threat mitigation.
 * Makes the tool look real and operational.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, Shield, Terminal, AlertTriangle } from 'lucide-react';
import { useThreatStore } from './useThreatStore';

export function KillSwitchModal() {
  const { showKillSwitchModal, killSwitchTarget, closeKillSwitch } = useThreatStore();
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
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        onClick={closeKillSwitch}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="w-full max-w-2xl bg-gray-900 rounded-2xl border border-gray-700 shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-700 bg-gradient-to-r from-red-900/30 to-gray-900">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                <Shield className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Kill Switch</h2>
                <p className="text-gray-400 text-sm">Generate firewall rules for threat mitigation</p>
              </div>
            </div>
            <button
              onClick={closeKillSwitch}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Target Info */}
          <div className="p-6 bg-gray-800/50 border-b border-gray-700">
            <div className="flex items-center gap-4">
              <AlertTriangle className="w-6 h-6 text-red-400" />
              <div>
                <div className="text-white font-semibold">Target: {killSwitchTarget.ip}</div>
                <div className="text-gray-400 text-sm">
                  {killSwitchTarget.label} | C2 Confidence: {killSwitchTarget.confidence.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>

          {/* Platform Tabs */}
          <div className="flex border-b border-gray-700">
            {(['iptables', 'windows', 'pf'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? 'text-white bg-gray-800 border-b-2 border-cyan-500'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                }`}
              >
                {rules[tab].label}
              </button>
            ))}
          </div>

          {/* Commands */}
          <div className="p-6 space-y-4 max-h-96 overflow-y-auto">
            {/* Block Rule */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-red-400">
                  <Terminal className="w-4 h-4" />
                  <span className="text-sm font-medium">BLOCK RULE</span>
                </div>
                <button
                  onClick={() => copyToClipboard(rules[activeTab].block, 'block')}
                  className="flex items-center gap-1 px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
                >
                  {copied === 'block' ? (
                    <>
                      <Check className="w-3 h-3 text-green-400" />
                      <span className="text-green-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-4 bg-black/50 rounded-xl text-sm text-gray-300 font-mono overflow-x-auto border border-gray-700">
                {rules[activeTab].block}
              </pre>
            </div>

            {/* Isolate Rule */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-orange-400">
                  <Terminal className="w-4 h-4" />
                  <span className="text-sm font-medium">ISOLATE RULE</span>
                </div>
                <button
                  onClick={() => copyToClipboard(rules[activeTab].isolate, 'isolate')}
                  className="flex items-center gap-1 px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
                >
                  {copied === 'isolate' ? (
                    <>
                      <Check className="w-3 h-3 text-green-400" />
                      <span className="text-green-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-4 bg-black/50 rounded-xl text-sm text-gray-300 font-mono overflow-x-auto border border-gray-700">
                {rules[activeTab].isolate}
              </pre>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-700 bg-gray-800/30">
            <div className="flex items-center justify-between">
              <p className="text-gray-500 text-xs">
                ⚠️ Review rules carefully before applying in production
              </p>
              <button
                onClick={closeKillSwitch}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
