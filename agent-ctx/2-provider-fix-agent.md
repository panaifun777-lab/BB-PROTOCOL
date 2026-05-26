# Task 2: Fix Duplicate QueryClientProvider

## Agent: Provider Fix Agent

## Summary
Fixed the critical duplicate `QueryClientProvider` issue in the BB project. Two separate `QueryClient` instances were being created, causing stale data, cache misses, and inconsistent behavior between wagmi hooks and app queries.

## Root Cause
- `src/lib/query-provider.tsx` (used in `providers.tsx`): Creates `QueryClient` with staleTime: 30s, gcTime: 5m
- `src/lib/web3-provider.tsx`: Creates ANOTHER `QueryClient` with staleTime: 2m, gcTime: 10m and wraps WagmiProvider+ConnectKitProvider in its own `QueryClientProvider`

## Fix Applied
Removed the duplicate `QueryClientProvider` from `web3-provider.tsx`:
- Removed `QueryClient` and `QueryClientProvider` imports from `@tanstack/react-query`
- Removed the `queryClient` instance creation
- Removed the `<QueryClientProvider client={queryClient}>` wrapper from JSX
- Added explanatory comment about the single QueryClientProvider pattern

## Result
Provider nesting is now: `QueryProvider → Web3Provider → {children + Toaster}`
- Single `QueryClient` instance (staleTime: 30s, gcTime: 5m) shared by both wagmi and app queries
- Lint: zero errors
- Dev server: compiling normally, all routes 200 OK

## Files Modified
- `src/lib/web3-provider.tsx` — removed duplicate QueryClientProvider
