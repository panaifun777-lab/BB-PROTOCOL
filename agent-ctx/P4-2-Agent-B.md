# Task P4-2 — Agent B: On-Chain x402 Payment Enhancement

## Summary
Implemented Phase 4 advanced features for the BB Protocol payment system: real wallet integration for x402 payments, split config auto-sync, and payment retry logic.

## Files Created
1. `src/app/api/payment/[id]/verify/route.ts` — POST endpoint for wallet signature verification
2. `src/hooks/use-split-sync.ts` — Watches on-chain split config vs fiat config, shows toast on mismatch
3. `src/hooks/use-payment-retry.ts` — Payment retry with exponential backoff (1s, 2s, 4s)

## Files Modified
1. `src/components/dashboard/x402-payment.tsx` — Major refactor:
   - Added `useAccount`, `useSignMessage` from wagmi for wallet integration
   - Added `useSplitSync` for split config sync indicator
   - Added `usePaymentRetry` for retry functionality
   - New wallet-connected flow: sign message → verify API → confirm
   - Graceful fallback to simulation when wallet not connected
   - Wallet connection status indicators (green/amber)
   - Split sync warning banner
   - Retry button on payment failure
   - Contextual status messages during payment flow

2. `src/lib/messages/zh.json, en.json, ja.json, ko.json, es.json, fr.json, de.json, ar.json` — Added 13 new i18n keys each:
   - payment.splitOutOfSync, walletNotConnected, walletConnected
   - payment.signatureRejected, fallingBackToSimulation
   - payment.signingMessage, verifyingSignature, verifiedByWallet
   - payment.retry, retrying, retryError, retryCreated

3. `src/lib/messages/zh.json` — Fixed trailing comma bug in analytics.count

## Key Decisions
- Used `useSignMessage` from wagmi as authorization proof instead of actual on-chain transactions (hybrid facilitator approach)
- Signature rejection falls back gracefully to simulation (no blocking)
- When wallet disconnected, considered "synced" since there's no chain data to compare
- AbortController in retry hook for proper cleanup

## Verification
- `bun run lint` → zero errors, zero warnings
- Dev server: GET / 200 OK
- All 8 JSON language files validated with Python json module
