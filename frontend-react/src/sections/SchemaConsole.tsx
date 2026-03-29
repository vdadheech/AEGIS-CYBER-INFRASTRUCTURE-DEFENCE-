import { useState, useRef, useEffect, useCallback } from 'react';
import { fetchSchemaLogs } from '../api/endpoints';
import { useInterval } from '../hooks/useInterval';
import styles from './SchemaConsole.module.css';

interface SchemaLogMessage {
  text: string;
  isAlert: boolean;
  id: string;
}

export function SchemaConsole({ className = '' }: { className?: string }) {
  const [logs, setLogs] = useState<SchemaLogMessage[]>([]);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom behavior
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const appendLog = useCallback((msg: string, isAlert = false) => {
    setLogs((prev) => {
      const newLogs = [...prev, { text: msg, isAlert, id: Math.random().toString(36).substring(7) }];
      if (newLogs.length > 100) newLogs.shift();
      return newLogs;
    });
  }, []);

  // Expose appendLog to the parent App via a static/hacky bridge for WebSocket injection
  (SchemaConsole as any).__appendLog = appendLog;

  const loadLogs = useCallback(async () => {
    try {
      const data = await fetchSchemaLogs();
      const parsed = data.logs.map((msg) => ({
        text: typeof msg === 'string' ? msg : JSON.stringify(msg),
        isAlert: msg.includes('THREAT') || msg.includes('SPOOFED'),
        id: Math.random().toString(36).substring(7),
      }));
      setLogs(parsed);
    } catch (e) {
      console.error('Schema logs fetch failed', e);
      appendLog('⚠ ERROR: Disconnected from Schema API', true);
    }
  }, [appendLog]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  useInterval(loadLogs, 30000);

  return (
    <section className={`${styles.wrapper} ${className}`} aria-label="Terminal Logs">
      <div className={styles.macHeader}>
        <div className={`${styles.macDot} ${styles.macRed}`} />
        <div className={`${styles.macDot} ${styles.macYellow}`} />
        <div className={`${styles.macDot} ${styles.macGreen}`} />
      </div>
      <div className={styles.logContainer} ref={logContainerRef} role="log">
        {logs.map((log) => (
          <span
            key={log.id}
            className={`${styles.logLine} ${log.isAlert ? styles.alert : log.text.includes('SCHEMA V2') ? styles.warn : ''}`}
          >
            {log.text}
          </span>
        ))}
      </div>
    </section>
  );
}
