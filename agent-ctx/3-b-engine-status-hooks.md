# Task 3-B: Engine Status Polling Hooks

## Summary
Created real-time engine status polling hooks that connect to all 6 microservices via Socket.IO using the gateway pattern.

## Files Created/Modified

### New Files
- `src/hooks/use-engine-status.ts` — Unified hook connecting to all 6 microservices:
  - resonance-sim:3003 → `resonanceConnected` in dashboard store
  - monitoring-sim:3004 → `monitoringConnected` in dashboard store
  - ifd-calculator:3005 → `ifdCalculator` in engine store
  - ece-oracle:3006 → `eceOracle` in engine store
  - poue-prover:3007 → `poueProver` in engine store
  - mcp-router:3008 → `mcpRouter` in engine store

### Modified Files
- `src/hooks/use-resonance-stream.ts` — Added `useDashboardStore.setResonanceConnected` integration
- `src/hooks/use-monitoring-stream.ts` — Added `useDashboardStore.setMonitoringConnected` integration

## Key Design Decisions
- All Socket.IO connections use `io('/?XTransformPort={port}')` gateway pattern (never direct localhost URLs)
- Engine store modules get `ModuleStatus` with online/port/lastUpdate/metrics
- Dashboard store gets boolean connection status for resonance/monitoring
- Broadcast events (not just initial state events) are listened to for keeping `lastUpdate` fresh
- Per-service metrics extractors map service-specific payloads to `Record<string, number>`
- Auto-reconnect with max 10 attempts, exponential backoff (1s-5s)
- Proper cleanup of all sockets on unmount

## Lint Status
- Zero errors after fixes (moved `disconnectAll` before `reconnect` to resolve variable hoisting issue)
