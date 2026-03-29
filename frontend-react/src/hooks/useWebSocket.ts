import { useEffect, useRef, useCallback } from 'react';
import type { WebSocketEvent } from '../types';

const WS_URL = import.meta.env.VITE_WS_URL || 'wss://aegis-cyber-infrastructure-defence-9.onrender.com/ws/telemetry';

interface UseWebSocketOptions {
  onLog?: (logId: number, responseTimeMs: number) => void;
  onSchemaChange?: (logId: number, version: number, activeColumn: string) => void;
  onStreamComplete?: () => void;
  onStatusChange?: (message: string, isWarning?: boolean) => void;
}

export function useWebSocket(options: UseWebSocketOptions) {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const reconnect = useCallback(() => {
    const socket = new WebSocket(WS_URL);

    socket.onopen = () => {
      optionsRef.current.onStatusChange?.(
        '> WebSocket connected. Live telemetry stream starting...'
      );
    };

    socket.onmessage = (event) => {
      let msg: WebSocketEvent;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }

      if (msg.event === 'log') {
        optionsRef.current.onLog?.(msg.log_id, msg.response_time_ms);
      } else if (msg.event === 'schema_change') {
        optionsRef.current.onSchemaChange?.(
          msg.log_id,
          msg.version,
          msg.active_column
        );
      } else if (msg.event === 'stream_complete') {
        optionsRef.current.onStreamComplete?.();
      }
    };

    socket.onerror = () => {
      optionsRef.current.onStatusChange?.(
        '> WebSocket error. Is the backend running?',
        true
      );
    };

    socket.onclose = () => {
      optionsRef.current.onStatusChange?.('> Connection closed.');
    };

    return socket;
  }, []);

  useEffect(() => {
    const socket = reconnect();
    return () => {
      socket.close();
    };
  }, [reconnect]);
}
