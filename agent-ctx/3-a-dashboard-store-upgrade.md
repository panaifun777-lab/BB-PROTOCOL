# Task 3-a: Dashboard Store Upgrade

## Task
Upgrade the dashboard Zustand store to hold dashboard data and connect to API

## Work Completed

### 1. Upgraded `src/stores/dashboard-store.ts`
- **Before**: Only UI state (activeSection, sidebarCollapsed, theme, locale, unreadCount, resonanceConnected, monitoringConnected)
- **After**: Full data + UI store with:
  - 7 dashboard data fields: avatar, skills, revenueSummary, recentRevenues, delegations, timeline, resonanceHistory
  - Loading state: isLoading, error, dataLoaded
  - `fetchDashboardData()` async action that:
    - Fetches `/api/engine-status?XTransformPort=3004` for real-time status
    - Fetches `/api/dashboard` for core dashboard data
    - Falls back to mock data if API fails
    - Sets isLoading/error properly
  - 7 individual setters for granular updates
  - All existing UI fields preserved unchanged
- **Architecture**: Separated into DashboardDataState + DashboardUIState → DashboardStore

### 2. Created `src/hooks/use-dashboard-data.ts`
- `'use client'` hook using useDashboardStore
- Auto-fetches on mount if data hasn't been loaded yet (dataLoaded === false)
- Uses hasFetched ref to prevent double-fetch in React strict mode
- Provides `refresh()` function for manual re-fetch
- Returns: `{ avatar, skills, revenueSummary, recentRevenues, delegations, timeline, resonanceHistory, isLoading, error, refresh }`
- Uses individual selectors for optimal re-render performance

### Lint Status
- Zero errors on new/modified files
- Pre-existing errors in use-engine-status.ts and use-resonance-stream.ts are unrelated

## Files Modified/Created
- `src/stores/dashboard-store.ts` — upgraded
- `src/hooks/use-dashboard-data.ts` — new
