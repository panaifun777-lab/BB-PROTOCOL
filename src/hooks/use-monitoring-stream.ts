'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useDashboardStore } from '@/stores/dashboard-store';

// ── Types ────────────────────────────────────────────────────

export interface SystemMetricsPayload {
  cpu: number;
  memory: number;
  diskUsage: number;
  networkIn: number;
  networkOut: number;
  activeConnections: number;
  requestRate: number;
  errorRate: number;
  p50Latency: number;
  p95Latency: number;
  p99Latency: number;
  timestamp: number;
}

export interface ChainEventPayload {
  eventName: string;
  contract: string;
  blockNumber: number;
  txHash: string;
  timestamp: number;
  data: Record<string, string | number>;
}

export interface AnomalyAlertPayload {
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  detectedAt: number;
  metric: string;
  value: number;
  baseline: number;
}

export interface MonitoringStatePayload {
  systemMetrics: SystemMetricsPayload;
  recentChainEvents: ChainEventPayload[];
  tickCount: number;
  timestamp: number;
}

export interface MonitoringStreamState {
  /** Whether the WebSocket is connected */
  isConnected: boolean;
  /** Latest system metrics */
  systemMetrics: SystemMetricsPayload | null;
  /** Metrics history (last 20 points for sparklines) */
  metricsHistory: SystemMetricsPayload[];
  /** Recent chain events (last 8) */
  chainEvents: ChainEventPayload[];
  /** Latest anomaly alert */
  lastAnomaly: AnomalyAlertPayload | null;
  /** Anomaly history (last 20) */
  anomalyHistory: AnomalyAlertPayload[];
}

// ── Hook ─────────────────────────────────────────────────────

export function useMonitoringStream() {
  const socketRef = useRef<Socket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 10;

  const setMonitoringConnected = useDashboardStore((s) => s.setMonitoringConnected);

  const [state, setState] = useState<MonitoringStreamState>({
    isConnected: false,
    systemMetrics: null,
    metricsHistory: [],
    chainEvents: [],
    lastAnomaly: null,
    anomalyHistory: [],
  });

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    // Clean up existing socket
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    const socket = io('/?XTransformPort=3004', {
      transports: ['polling'],
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });

    socketRef.current = socket;

    // ── Connection Events ──────────────────────────────
    socket.on('connect', () => {
      console.log('[MonitoringStream] Connected');
      reconnectAttemptsRef.current = 0;
      setState((prev) => ({ ...prev, isConnected: true }));
      setMonitoringConnected(true);
    });

    socket.on('disconnect', (reason) => {
      console.log('[MonitoringStream] Disconnected:', reason);
      setState((prev) => ({ ...prev, isConnected: false }));
      setMonitoringConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('[MonitoringStream] Connection error:', error.message);
      reconnectAttemptsRef.current += 1;
    });

    // ── Initial State ──────────────────────────────────
    socket.on('monitoring_state', (data: MonitoringStatePayload) => {
      console.log('[MonitoringStream] Received initial state');
      setState((prev) => ({
        ...prev,
        systemMetrics: data.systemMetrics,
        chainEvents: data.recentChainEvents || [],
        metricsHistory: data.systemMetrics
          ? [data.systemMetrics]
          : prev.metricsHistory,
      }));
    });

    // ── Metrics Updates (every 3s) ─────────────────────
    socket.on('metrics_update', (data: SystemMetricsPayload) => {
      setState((prev) => {
        const newHistory = [...prev.metricsHistory, data].slice(-20);
        return {
          ...prev,
          systemMetrics: data,
          metricsHistory: newHistory,
        };
      });
    });

    // ── Chain Events (every 10s) ───────────────────────
    socket.on('chain_event', (data: ChainEventPayload) => {
      setState((prev) => {
        const newEvents = [data, ...prev.chainEvents].slice(0, 8);
        return {
          ...prev,
          chainEvents: newEvents,
        };
      });
    });

    // ── Anomaly Alerts ─────────────────────────────────
    socket.on('anomaly_alert', (data: AnomalyAlertPayload) => {
      console.log('[MonitoringStream] Anomaly alert:', data.description);
      setState((prev) => {
        const newHistory = [...prev.anomalyHistory, data].slice(-20);
        return {
          ...prev,
          lastAnomaly: data,
          anomalyHistory: newHistory,
        };
      });
    });
  }, [setMonitoringConnected]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setState((prev) => ({ ...prev, isConnected: false }));
    setMonitoringConnected(false);
  }, [setMonitoringConnected]);

  // Auto-connect on mount, disconnect on unmount
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    ...state,
    connect,
    disconnect,
  };
}
