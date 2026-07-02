# Task 3+4 — Web3Store Dead Code Fix + Error Boundary

## Agent: Full-Stack Developer (Critical/High Bug Fixes)

## Summary
Fixed 2 issues: S-1 CRITICAL (Web3Store dead code) and E-1 HIGH (no error boundary).

## Issue 1: Web3Store Dead Code (S-1 CRITICAL)
- **Root cause**: `useWeb3Store` setters were never called. wagmi manages wallet state independently, but the Zustand store was never synced, so `Web3ConnectButton` always showed "Connect".
- **Fix**: Created `src/hooks/use-web3-sync.ts` that syncs wagmi `useAccount` + `useBalance` → Zustand store.
- **Integration**: Added `Web3SyncWrapper` inner component in `src/lib/web3-provider.tsx` that calls `useWeb3Sync()` inside the wagmi provider tree.

## Issue 2: No Error Boundary (E-1 HIGH)
- **Root cause**: No `error.tsx` existed, so runtime errors crashed the app with no recovery.
- **Fix**: Created `src/app/error.tsx` with error display + retry button, and `src/app/loading.tsx` with branded loading state.

## Files Created
- `src/hooks/use-web3-sync.ts` — wagmi→Zustand sync hook
- `src/app/error.tsx` — Next.js error boundary
- `src/app/loading.tsx` — Next.js loading state

## Files Modified
- `src/lib/web3-provider.tsx` — added Web3SyncWrapper + import
- `/home/z/my-project/worklog.md` — appended work log

## Verification
- `bun run lint` → zero errors
- Dev server compiling normally, GET / 200 OK
