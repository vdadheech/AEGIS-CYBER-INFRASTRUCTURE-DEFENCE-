import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, ShieldAlert, Lock } from 'lucide-react';
import { useThreatStore } from './useThreatStore';

export function IsolateNodeModal() {
  const { showIsolateModal, isolateTarget, closeIsolate, isolateNode } = useThreatStore();

  if (!showIsolateModal || !isolateTarget) return null;

  const isCritical = isolateTarget.confidence >= 80;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        onClick={closeIsolate}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="w-full max-w-xl bg-gray-900 rounded-2xl border border-gray-700 shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-6 border-b border-gray-700 bg-gradient-to-r from-orange-900/30 to-gray-900">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
                <ShieldAlert className="w-6 h-6 text-orange-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Isolate Node</h2>
                <p className="text-gray-400 text-sm">Contain this host from lateral movement</p>
              </div>
            </div>
            <button
              onClick={closeIsolate}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 border-b border-gray-700 bg-gray-800/50">
            <div className="flex items-center gap-3 mb-3">
              <AlertTriangle className={`w-5 h-5 ${isCritical ? 'text-red-400' : 'text-orange-400'}`} />
              <div className="text-white font-semibold">Target: {isolateTarget.ip}</div>
            </div>
            <p className="text-sm text-gray-300">
              This will mark the selected node as isolated and exclude it from normal communication flows in the dashboard context.
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Confidence: {isolateTarget.confidence.toFixed(1)}% • {isolateTarget.label}
            </p>
          </div>

          <div className="p-6">
            <div className="bg-black/40 border border-gray-700 rounded-xl p-4 text-sm text-gray-300">
              <div className="font-semibold text-orange-300 mb-2">Isolation plan</div>
              <ul className="list-disc pl-5 space-y-1">
                <li>Block inbound and outbound traffic for this node.</li>
                <li>Allow only controlled forensic access.</li>
                <li>Tag node as isolated for SOC audit trail.</li>
              </ul>
            </div>
          </div>

          <div className="p-4 border-t border-gray-700 bg-gray-800/30 flex justify-end gap-3">
            <button
              onClick={closeIsolate}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => isolateNode(isolateTarget.id)}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <Lock className="w-4 h-4" />
              Isolate this node
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
