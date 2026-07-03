'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useDashboardStore } from '@/stores/dashboard-store';

// ── Types ────────────────────────────────────────────────────

export interface ResonanceUpdate {
  soulId: string;
  score: number;
  timestamp: number;
  trend: 'up' | 'down' | 'stable';
}

export interface RevenueEvent {
  soulId: string;
  amount: number;
  source: string;
  split: { human: number; avatar: number; protocol: number };
  txHash: string;
}

export interface CircuitChange {
  soulId: string;
  oldState: string;
  newState: string;
  reason: string;
}

export interface SimState {
  soulId: string;
  score: number;
  circuitState: string;
  trend: 'up' | 'down' | 'stable';
  recentRevenueEvents: RevenueEvent[];
  timestamp: number;
}

export interface ResonanceStreamState {
  /** Whether the WebSocket is connected */
  isConnected: boolean;
  /** Latest resonance score */
  resonanceScore: number | null;
  /** Latest resonance trend */
  trend: 'up' | 'down' | 'stable';
  /** Current circuit state */
  circuitState: string | null;
  /** Recent resonance updates (last 60) */
  resonanceHistory: ResonanceUpdate[];
  /** Recent revenue events (last 20) */
  revenueEvents: RevenueEvent[];
  /** Latest circuit change */
  lastCircuitChange: CircuitChange | null;
  /** Total simulated revenue since connection */
  totalRevenue: number;
}

// ── Hook ─────────────────────────────────────────────────────

export function useResonanceStream() {
  const socketRef = useRef<Socket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 10;

  const setResonanceConnected = useDashboardStore((s) => s.setResonanceConnected);

  const [state, setState] = useState<ResonanceStreamState>({
    isConnected: false,
    resonanceScore: null,
    trend: 'stable',
    circuitState: null,
    resonanceHistory: [],
    revenueEvents: [],
    lastCircuitChange: null,
    totalRevenue: 0,
  });

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    // Clean up existing socket
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    const socket = io('/?XTransformPort=3003', {
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
      console.log('[ResonanceStream] Connected');
      reconnectAttemptsRef.current = 0;
      setState((prev) => ({ ...prev, isConnected: true }));
      setResonanceConnected(true);
    });

    socket.on('disconnect', (reason) => {
      console.log('[ResonanceStream] Disconnected:', reason);
      setState((prev) => ({ ...prev, isConnected: false }));
      setResonanceConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('[ResonanceStream] Connection error:', error.message);
      reconnectAttemptsRef.current += 1;
    });

    // ── Initial State ──────────────────────────────────
    socket.on('sim_state', (data: SimState) => {
      console.log('[ResonanceStream] Received initial state:', data);
      setState((prev) => ({
        ...prev,
        resonanceScore: data.score,
        trend: data.trend,
        circuitState: data.circuitState,
        revenueEvents: data.recentRevenueEvents || [],
        resonanceHistory: data.score
          ? [
              {
                soulId: data.soulId,
                score: data.score,
                timestamp: data.timestamp,
                trend: data.trend,
              },
            ]
          : prev.resonanceHistory,
      }));
    });

    // ── Resonance Updates ──────────────────────────────
    socket.on('resonance_update', (data: ResonanceUpdate) => {
      setState((prev) => {
        const newHistory = [...prev.resonanceHistory, data].slice(-60);
        return {
          ...prev,
          resonanceScore: data.score,
          trend: data.trend,
          resonanceHistory: newHistory,
        };
      });
    });

    // ── Revenue Events ─────────────────────────────────
    socket.on('revenue_event', (data: RevenueEvent) => {
      setState((prev) => {
        const newEvents = [data, ...prev.revenueEvents].slice(0, 20);
        return {
          ...prev,
          revenueEvents: newEvents,
          totalRevenue: prev.totalRevenue + data.amount,
        };
      });
    });

    // ── Circuit State Changes ──────────────────────────
    socket.on('circuit_change', (data: CircuitChange) => {
      console.log('[ResonanceStream] Circuit change:', data.oldState, '→', data.newState);
      setState((prev) => ({
        ...prev,
        circuitState: data.newState,
        lastCircuitChange: data,
      }));
    });
  }, [setResonanceConnected]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setState((prev) => ({ ...prev, isConnected: false }));
    setResonanceConnected(false);
  }, [setResonanceConnected]);

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
