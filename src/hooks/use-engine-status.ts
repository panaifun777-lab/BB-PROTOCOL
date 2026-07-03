'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useEngineStore, type ModuleStatus } from '@/stores/engine-store';
import { useDashboardStore } from '@/stores/dashboard-store';

// ── Service Configuration ─────────────────────────────────────

interface ServiceConfig {
  name: string;
  port: number;
  /** Key in useEngineStore (null for services tracked in dashboard store) */
  engineKey: keyof Pick<
    { ifdCalculator: unknown; eceOracle: unknown; poueProver: unknown; mcpRouter: unknown },
    'ifdCalculator' | 'eceOracle' | 'poueProver' | 'mcpRouter'
  > | null;
  /** Key in useDashboardStore (null for services tracked in engine store) */
  dashboardKey: 'resonanceConnected' | 'monitoringConnected' | null;
  /** Events to listen for (for metrics extraction) */
  statusEvent: string;
  /** Function to extract metrics from event payload */
  metricsExtractor: (data: Record<string, unknown>) => Record<string, number>;
}

const SERVICE_CONFIGS: ServiceConfig[] = [
  {
    name: 'resonance-sim',
    port: 3003,
    engineKey: null,
    dashboardKey: 'resonanceConnected',
    statusEvent: 'sim_state',
    metricsExtractor: (data) => {
      const score = typeof data.score === 'number' ? data.score : 0;
      return { resonanceScore: score };
    },
  },
  {
    name: 'monitoring-sim',
    port: 3004,
    engineKey: null,
    dashboardKey: 'monitoringConnected',
    statusEvent: 'monitoring_state',
    metricsExtractor: (data) => {
      const metrics = data.systemMetrics as Record<string, number> | undefined;
      return {
        cpu: metrics?.cpu ?? 0,
        memory: metrics?.memory ?? 0,
      };
    },
  },
  {
    name: 'ifd-calculator',
    port: 3005,
    engineKey: 'ifdCalculator',
    dashboardKey: null,
    statusEvent: 'ifd_state',
    metricsExtractor: (data) => {
      const totalWeight = typeof data.totalWeight === 'number' ? data.totalWeight : 0;
      const nodes = Array.isArray(data.nodes) ? data.nodes.length : 0;
      const cycles = Array.isArray(data.cycles) ? data.cycles.length : 0;
      return { totalWeight, nodes, cycles };
    },
  },
  {
    name: 'ece-oracle',
    port: 3006,
    engineKey: 'eceOracle',
    dashboardKey: null,
    statusEvent: 'oracle_state',
    metricsExtractor: (data) => {
      const prices = Array.isArray(data.prices) ? data.prices.length : 0;
      return { assetsTracked: prices };
    },
  },
  {
    name: 'poue-prover',
    port: 3007,
    engineKey: 'poueProver',
    dashboardKey: null,
    statusEvent: 'poue_state',
    metricsExtractor: (data) => {
      const metrics = data.metrics as Record<string, number> | undefined;
      return {
        totalProofs: metrics?.totalProofs ?? 0,
        verified: metrics?.verified ?? 0,
        totalRewards: metrics?.totalRewards ?? 0,
      };
    },
  },
  {
    name: 'mcp-router',
    port: 3008,
    engineKey: 'mcpRouter',
    dashboardKey: null,
    statusEvent: 'mcp_state',
    metricsExtractor: (data) => {
      const providers = Array.isArray(data.providers) ? data.providers.length : 0;
      const recentRequests = Array.isArray(data.recentRequests) ? data.recentRequests.length : 0;
      return { providers, recentRequests };
    },
  },
];

// ── Connection State ──────────────────────────────────────────

interface ConnectionStatus {
  [serviceName: string]: boolean;
}

// ── Hook ──────────────────────────────────────────────────────

export function useEngineStatus() {
  const socketsRef = useRef<Map<string, Socket>>(new Map());
  const reconnectAttemptsRef = useRef<Map<string, number>>(new Map());
  const maxReconnectAttempts = 10;

  const updateModule = useEngineStore((s) => s.updateModule);
  const setResonanceConnected = useDashboardStore((s) => s.setResonanceConnected);
  const setMonitoringConnected = useDashboardStore((s) => s.setMonitoringConnected);

  const [connected, setConnected] = useState<ConnectionStatus>({});

  /** Connect to a single service */
  const connectService = useCallback(
    (config: ServiceConfig) => {
      // Skip if already connected
      const existing = socketsRef.current.get(config.name);
      if (existing?.connected) return;

      // Clean up existing socket
      if (existing) {
        existing.disconnect();
        socketsRef.current.delete(config.name);
      }

      const socket = io(`/?XTransformPort=${config.port}`, {
        transports: ['polling'],
        forceNew: true,
        reconnection: true,
        reconnectionAttempts: maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 10000,
      });

      socketsRef.current.set(config.name, socket);

      // ── Connection Events ────────────────────────────
      socket.on('connect', () => {
        console.log(`[EngineStatus] ${config.name} connected (port ${config.port})`);
        reconnectAttemptsRef.current.set(config.name, 0);

        setConnected((prev) => ({ ...prev, [config.name]: true }));

        // Update dashboard store
        if (config.dashboardKey === 'resonanceConnected') {
          setResonanceConnected(true);
        } else if (config.dashboardKey === 'monitoringConnected') {
          setMonitoringConnected(true);
        }
      });

      socket.on('disconnect', (reason) => {
        console.log(`[EngineStatus] ${config.name} disconnected:`, reason);
        setConnected((prev) => ({ ...prev, [config.name]: false }));

        // Update dashboard store
        if (config.dashboardKey === 'resonanceConnected') {
          setResonanceConnected(false);
        } else if (config.dashboardKey === 'monitoringConnected') {
          setMonitoringConnected(false);
        }
      });

      socket.on('connect_error', () => {
        // Silently handle connection errors — microservices may not be running
        // in sandbox/offline environments. We still track attempts for internal logic.
        const attempts = (reconnectAttemptsRef.current.get(config.name) ?? 0) + 1;
        reconnectAttemptsRef.current.set(config.name, attempts);

        // After max attempts, stop reconnecting and mark as disconnected
        if (attempts >= maxReconnectAttempts) {
          socket.disconnect();
          socketsRef.current.delete(config.name);
          setConnected((prev) => ({ ...prev, [config.name]: false }));
        }
      });

      // ── Status Event ─────────────────────────────────
      socket.on(config.statusEvent, (data: Record<string, unknown>) => {
        // Update engine store for engine-tracked services
        if (config.engineKey) {
          const metrics = config.metricsExtractor(data);
          const moduleStatus: ModuleStatus = {
            online: true,
            port: config.port,
            lastUpdate: Date.now(),
            metrics,
          };
          updateModule(config.engineKey, moduleStatus);
        }
      });

      // ── Service-specific periodic events ──────────────
      // Also listen to broadcast events to keep lastUpdate fresh
      const broadcastEvents = getBroadcastEvents(config.name);
      for (const eventName of broadcastEvents) {
        socket.on(eventName, () => {
          if (config.engineKey) {
            // Refresh lastUpdate timestamp on any broadcast event
            const currentState = useEngineStore.getState()[config.engineKey] as ModuleStatus;
            if (currentState.online) {
              updateModule(config.engineKey, {
                ...currentState,
                lastUpdate: Date.now(),
              });
            }
          }
        });
      }
    },
    [updateModule, setResonanceConnected, setMonitoringConnected],
  );

  /** Connect to all services */
  const connectAll = useCallback(() => {
    for (const config of SERVICE_CONFIGS) {
      connectService(config);
    }
  }, [connectService]);

  /** Disconnect all services */
  const disconnectAll = useCallback(() => {
    for (const [name, socket] of socketsRef.current) {
      socket.disconnect();
      console.log(`[EngineStatus] ${name} disconnected`);
    }
    socketsRef.current.clear();

    // Reset all connected states
    setConnected({});

    // Reset dashboard store
    setResonanceConnected(false);
    setMonitoringConnected(false);
  }, [setResonanceConnected, setMonitoringConnected]);

  /** Reconnect a specific service or all services */
  const reconnect = useCallback(
    (serviceName?: string) => {
      if (serviceName) {
        const config = SERVICE_CONFIGS.find((c) => c.name === serviceName);
        if (config) {
          // Disconnect existing
          const existing = socketsRef.current.get(config.name);
          if (existing) {
            existing.disconnect();
            socketsRef.current.delete(config.name);
          }
          reconnectAttemptsRef.current.set(config.name, 0);
          connectService(config);
        }
      } else {
        // Reconnect all
        disconnectAll();
        reconnectAttemptsRef.current.clear();
        connectAll();
      }
    },
    [connectService, connectAll, disconnectAll],
  );

  // Auto-connect on mount, disconnect on unmount
  useEffect(() => {
    connectAll();

    return () => {
      disconnectAll();
    };
  }, [connectAll, disconnectAll]);

  // Compute overall connection status
  const allConnected = SERVICE_CONFIGS.every((c) => connected[c.name] === true);
  const connectedCount = SERVICE_CONFIGS.filter((c) => connected[c.name] === true).length;

  return {
    /** Per-service connection status */
    connected,
    /** Whether all 6 services are connected */
    allConnected,
    /** Number of connected services */
    connectedCount,
    /** Total number of services */
    totalServices: SERVICE_CONFIGS.length,
    /** Reconnect a specific service or all services */
    reconnect,
    /** Service configurations for external use */
    services: SERVICE_CONFIGS,
  };
}

// ── Helpers ───────────────────────────────────────────────────

/** Get broadcast event names for a service to keep lastUpdate fresh */
function getBroadcastEvents(serviceName: string): string[] {
  switch (serviceName) {
    case 'ifd-calculator':
      return ['weight_update', 'graph_change', 'cycle_detected'];
    case 'ece-oracle':
      return ['price_update', 'deviation_alert', 'source_health'];
    case 'poue-prover':
      return [
        'proof_submitted',
        'proof_verified',
        'proof_rejected',
        'reward_distributed',
        'batch_verification',
        'verification_metrics',
      ];
    case 'mcp-router':
      return [
        'request_routed',
        'response_received',
        'provider_registered',
        'provider_slashed',
        'leaderboard_update',
      ];
    default:
      return [];
  }
}

// ── Exported Types ────────────────────────────────────────────

export type { ServiceConfig, ConnectionStatus };
