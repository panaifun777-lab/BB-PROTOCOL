# AI分身系统 — 项目工作日志 (Phase 5+)

---
Task ID: 3+4
Agent: Full-Stack Developer (Critical/High Bug Fixes)
Task: Fix Web3Store dead code (S-1 CRITICAL) + Add error boundary (E-1 HIGH)

Work Log:

### Issue 1: Web3Store Dead Code (S-1 CRITICAL)
- Problem: `useWeb3Store` setters (`setAddress`, `setChainId`, `setConnected`, `setBalance`, `reset`) were NEVER called. The wagmi/ConnectKit wallet connection works independently, but the Zustand store never got updated. `Web3ConnectButton` in page.tsx reads from this dead store, showing "Connect" even when a wallet is connected.
- Fix: Created `src/hooks/use-web3-sync.ts`:
  - Uses wagmi's `useAccount` (address, isConnected, chainId) and `useBalance` (formatted balance)
  - Syncs all values to `useWeb3Store` via an `useEffect` hook
  - When connected: sets address, chainId, connected flag, and balance
  - When disconnected: calls `reset()` to clear all state back to defaults
- Updated `src/lib/web3-provider.tsx`:
  - Added `Web3SyncWrapper` inner component that calls `useWeb3Sync()` and renders children
  - Placed inside the `ConnectKitProvider` tree so wagmi hooks are available
  - Imported `useWeb3Sync` from `@/hooks/use-web3-sync`

### Issue 2: No Error Boundary (E-1 HIGH)
- Problem: No `error.tsx` file existed, so any runtime error crashed the entire app with no recovery UI.
- Fix: Created `src/app/error.tsx`:
  - Next.js error boundary component with `error` and `reset` props
  - Logs error to console via `useEffect`
  - Displays error message in a Card with AlertTriangle icon
  - Provides "重试" (Retry) button that calls `reset()`
  - Styled with dark theme matching the app (bg-[#0F172A], slate-800 card)
- Created `src/app/loading.tsx`:
  - Shows a pulsing violet-blue gradient logo with "加载中..." text
  - Matches the app's dark theme design language

Verification:
- `bun run lint` → zero errors
- Dev server compiling normally, GET / 200 OK
- Files created/modified:
  - src/hooks/use-web3-sync.ts (new - wagmi→Zustand sync hook)
  - src/lib/web3-provider.tsx (modified - added Web3SyncWrapper)
  - src/app/error.tsx (new - error boundary with retry)
  - src/app/loading.tsx (new - loading state UI)

Stage Summary:
- Web3Store is no longer dead code: wallet state syncs automatically from wagmi to Zustand
- App now has proper error recovery UI and loading states
- 2 critical/high issues resolved

---
Task ID: 2
Agent: Provider Fix Agent
Task: Fix duplicate QueryClientProvider causing stale data, cache misses, and inconsistent behavior

Work Log:
- Read src/app/providers.tsx, src/lib/web3-provider.tsx, src/lib/query-provider.tsx to diagnose the issue
- Root cause: Two separate QueryClientProvider instances in the provider chain:
  1. QueryProvider (in providers.tsx) → QueryClientProvider with staleTime: 30s
  2. Web3Provider (in web3-provider.tsx) → another QueryClientProvider with staleTime: 2m wrapping WagmiProvider+ConnectKitProvider
- This creates two separate QueryClient instances: wagmi hooks use the inner one (2m stale), while app queries use the outer one (30s stale), causing stale data and cache misses
- Fix applied to src/lib/web3-provider.tsx:
  - Removed `import { QueryClient, QueryClientProvider } from '@tanstack/react-query'`
  - Removed `queryClient` instance creation (was: staleTime: 2m, gcTime: 10m)
  - Removed `<QueryClientProvider client={queryClient}>` wrapper from JSX
  - Now renders: WagmiProvider → ConnectKitProvider → children (no duplicate QueryClientProvider)
  - Added comment explaining that QueryClientProvider is provided by QueryProvider in providers.tsx
- Provider nesting is now correct: QueryProvider → Web3Provider → {children + Toaster}
  - Only ONE QueryClient instance (staleTime: 30s, gcTime: 5m) shared by both wagmi and app queries
- Ran `bun run lint` → zero errors
- Dev server compiling normally, all routes returning 200 OK

Stage Summary:
- Duplicate QueryClientProvider removed from web3-provider.tsx
- Single QueryClient (from QueryProvider) now shared across entire app including wagmi
- Files modified:
  - src/lib/web3-provider.tsx (removed QueryClient, QueryClientProvider import/usage/wrapper)

---
Task ID: 3-B (Engine Status Hooks)
Agent: Full-Stack Developer
Task: Create real-time engine status polling hooks connecting to microservices via Socket.IO

Work Log:
- Created src/hooks/use-engine-status.ts — unified hook connecting to all 6 microservices:
  - resonance-sim:3003 (dashboardKey: resonanceConnected)
  - monitoring-sim:3004 (dashboardKey: monitoringConnected)
  - ifd-calculator:3005 (engineKey: ifdCalculator)
  - ece-oracle:3006 (engineKey: eceOracle)
  - poue-prover:3007 (engineKey: poueProver)
  - mcp-router:3008 (engineKey: mcpRouter)
  - All connections use gateway pattern: `io('/?XTransformPort={port}')`
  - Updates useEngineStore with ModuleStatus (online/port/lastUpdate/metrics) for 4 engine modules
  - Updates useDashboardStore with resonanceConnected/monitoringConnected for 2 service modules
  - Listens to initial state events + broadcast events to keep lastUpdate timestamps fresh
  - Per-service metrics extraction (e.g., totalWeight/nodes/cycles for IFD, assetsTracked for ECE)
  - Auto-reconnect with max 10 attempts, proper cleanup on unmount
  - Returns { connected, allConnected, connectedCount, totalServices, reconnect, services }
- Updated src/hooks/use-resonance-stream.ts:
  - Added import of useDashboardStore
  - On connect: calls setResonanceConnected(true)
  - On disconnect: calls setResonanceConnected(false)
  - On manual disconnect: calls setResonanceConnected(false)
  - Updated useCallback dependency arrays
- Updated src/hooks/use-monitoring-stream.ts:
  - Added import of useDashboardStore
  - On connect: calls setMonitoringConnected(true)
  - On disconnect: calls setMonitoringConnected(false)
  - On manual disconnect: calls setMonitoringConnected(false)
  - Updated useCallback dependency arrays
- Fixed lint error: moved disconnectAll declaration before reconnect to resolve "accessed before declared" error
- Lint零错误, Dev Server编译正常

Stage Summary:
- Engine status polling hooks完成, 统一6个微服务的Socket.IO连接管理
- 文件清单:
  - src/hooks/use-engine-status.ts (新建 - 6服务统一状态轮询Hook)
  - src/hooks/use-resonance-stream.ts (更新 - 集成dashboardStore)
  - src/hooks/use-monitoring-stream.ts (更新 - 集成dashboardStore)

---
Task ID: 3-a
Agent: Full-Stack Developer (Dashboard Store Upgrade)
Task: Upgrade Dashboard Zustand Store to hold dashboard data and connect to API + create useDashboardData hook

Work Log:
- Read src/lib/types.ts to understand DashboardState type (avatar, skills, revenueSummary, recentRevenues, delegations, timeline, resonanceHistory)
- Read src/lib/mock-data.ts to understand available mock data exports
- Read src/app/api/engine-status/route.ts and src/app/api/dashboard/route.ts to understand API structure
- Upgraded src/stores/dashboard-store.ts:
  - Imported all DashboardState types from @/lib/types (AvatarProfile, AvatarSkill, RevenueSummary, RevenueSplit, Delegation, TimelineEvent, ResonanceDataPoint)
  - Imported all mock data from @/lib/mock-data (MOCK_AVATAR, MOCK_AVATAR_SKILLS, MOCK_REVENUE_SUMMARY, MOCK_REVENUES, MOCK_DELEGATIONS, MOCK_TIMELINE, MOCK_RESONANCE_HISTORY)
  - Added DashboardDataState interface with 7 data fields + isLoading + error + dataLoaded + fetchDashboardData action + 7 individual setters
  - Separated concerns: DashboardDataState (data slice) + DashboardUIState (UI slice) → DashboardStore (combined)
  - fetchDashboardData async action:
    - Prevents duplicate fetches (checks isLoading)
    - Sets isLoading: true at start
    - Fetches from /api/engine-status?XTransformPort=3004 for real-time status
    - Fetches from /api/dashboard for core dashboard data
    - Uses nullish coalescing (??) to fall back to mock data if API fields missing
    - On API failure: falls back entirely to mock data, sets error message, marks dataLoaded: true
    - Sets isLoading: false in both success and error paths
  - Added dataLoaded flag to track whether initial fetch has occurred
  - Added 7 individual setter actions (setAvatar, setSkills, etc.) for granular updates
  - Kept all existing UI fields intact (activeSection, sidebarCollapsed, theme, locale, unreadCount, resonanceConnected, monitoringConnected)
- Created src/hooks/use-dashboard-data.ts:
  - 'use client' directive for client-side usage
  - Uses useDashboardStore with individual selectors for optimal re-render performance
  - Auto-fetches on mount if dataLoaded is false (using useEffect + hasFetched ref)
  - hasFetched ref prevents double-fetch in React strict mode
  - Provides refresh() function that calls fetchDashboardData
  - Returns typed { avatar, skills, revenueSummary, recentRevenues, delegations, timeline, resonanceHistory, isLoading, error, refresh }
- Lint: zero errors on new/modified files (pre-existing errors in use-engine-status.ts and use-resonance-stream.ts are unrelated)

Stage Summary:
- Dashboard Zustand store upgraded from UI-only to full data+UI store
- useDashboardData hook provides convenient auto-fetching access to dashboard state
- Files modified/created:
  - src/stores/dashboard-store.ts (upgraded: added data fields + fetchDashboardData + setters)
  - src/hooks/use-dashboard-data.ts (new: auto-fetching hook with refresh)

---
Task ID: 3
Agent: Main Orchestrator
Task: Full integration of Zustand stores + i18n + Web3Store into page.tsx + restart microservices

Work Log:
- Diagnosed: 3/6 microservices were down (3005, 3006, 3007)
- Diagnosed: page.tsx had Zustand+LanguageSwitcher imports but wasn't using t() for nav labels
- Diagnosed: Web3ConnectButton used hardcoded mock address instead of useWeb3Store
- Diagnosed: dashboard-store.ts lacked data fields (only UI state)
- Parallel Agent 1: Integrated useI18n + t() for all NAV_ITEMS and UI labels in page.tsx
  - 23 nav items converted from `label` to `navKey` with t() resolution
  - Web3ConnectButton now reads from useWeb3Store (address, isConnected)
  - All hardcoded Chinese text replaced with t() calls
- Parallel Agent 2: Upgraded dashboard-store.ts with data fields + fetchDashboardData async action
  - Created use-dashboard-data.ts hook with auto-fetch and refresh
- Parallel Agent 3: Created use-engine-status.ts hook with Socket.IO gateway pattern
  - Created use-resonance-stream.ts and use-monitoring-stream.ts hooks
- Connected page.tsx to useDashboardData() hook replacing useState<DashboardState>
- Connected page.tsx to useEngineStatus() hook for real-time microservice status
- All 8 i18n message files have complete keys (verified)
- Lint: zero errors
- Frontend: accessible (200 OK on port 3000)
- Microservices: Sandbox memory constraint (8G) prevents all 6 running simultaneously
  - App has proper fallback to mock data when services unavailable

Stage Summary:
- Zustand: 3 stores (dashboard with data+UI, web3, engine) fully connected to page.tsx
- i18n: useI18n + t() used for all 23 nav items + all UI labels across 8 languages
- Web3: useWeb3Store connected to Web3ConnectButton with real address display
- 9 custom hooks created (use-i18n, use-dashboard-data, use-engine-status, use-resonance-stream, use-monitoring-stream, + 4 others)
- 130 TS/TSX files, 28 API routes, 79 components, 3 Zustand stores, 8 i18n languages

---
Task ID: 1
Agent: Hydration Fix Agent
Task: Fix React hydration mismatch error in security-audit.tsx caused by getRelativeTime() using new Date() (different server vs client timezones)

Work Log:
- Read src/components/dashboard/security-audit.tsx and src/hooks/use-client-time.ts to understand the issue
- Root cause: `getRelativeTime()` at line 320 used `const now = new Date()` which returns different values on server vs client (different timezones), causing hydration mismatch (e.g., "Mar 3" on server vs "Mar 4" on client)
- Rewrote src/hooks/use-client-time.ts to use `useSyncExternalStore` instead of `useState` + `useEffect`:
  - Previous implementation used `useState<Date | null>(null)` with `useEffect(() => setNow(new Date()), [])` which triggered `react-hooks/set-state-in-effect` lint rule
  - New implementation uses module-level shared time store with `useSyncExternalStore`
  - `getServerSnapshot()` returns `null` (SSR placeholder)
  - `getSnapshot()` returns `null` initially, then a `Date` object after subscribe is called
  - Single timer (60s interval) shared across all consumers via refCount pattern
  - Proper cleanup: timer stopped and `currentTime` reset to `null` when last subscriber unsubscribes
  - `useIsClient()` reimplemented as `useClientTime() !== null`
- Modified src/components/dashboard/security-audit.tsx:
  1. Added import: `import { useClientTime } from '@/hooks/use-client-time'`
  2. Changed `getRelativeTime(timestamp: string)` → `getRelativeTime(timestamp: string, now: Date | null)` with early return `'...'` when `now` is null (SSR placeholder)
  3. Added `const now = useClientTime()` to 4 components:
     - `SecurityScoreGauge` (line ~338)
     - `InvariantCard` (line ~420)
     - `AuditLogRow` (line ~577)
     - Main `SecurityAudit` component (line ~615)
  4. Updated all 4 `getRelativeTime()` call sites to pass `now` as second parameter
  5. Added `suppressHydrationWarning` on 4 elements displaying relative time:
     - `<p>` in SecurityScoreGauge (last audit time)
     - `<span>` in InvariantCard (last verified time)
     - `<span>` in AuditLogRow (created at time)
     - `<AlertDescription>` in SecurityAudit (next scheduled audit)
- Ran `bun run lint` → zero errors
- Dev server compiling normally

Stage Summary:
- Hydration mismatch error fixed by replacing direct `new Date()` calls with `useClientTime()` hook
- Hook rewritten with `useSyncExternalStore` for proper React 18+ concurrent mode support and lint compliance
- SSR returns `'...'` placeholder, client renders actual relative time after mount
- Files modified:
  - src/hooks/use-client-time.ts (rewritten: useState+useEffect → useSyncExternalStore)
  - src/components/dashboard/security-audit.tsx (modified: getRelativeTime + 4 components)

---
Task ID: 2
Agent: Hydration Fix Agent
Task: Fix React hydration mismatch errors in 6 dashboard components using new Date() in render path

Work Log:
- Read src/hooks/use-client-time.ts — already provides `useClientTime()` (returns null during SSR, Date on client) and `useIsClient()` hooks
- Analyzed all 6 target files for `new Date()` usage in render vs event handlers

### 1. notification-center.tsx
- `getRelativeTime()` at line 80 used `const now = new Date()` — called during render from NotificationItem
- Fix: Modified `getRelativeTime` to accept optional `now?: Date | null` parameter with `new Date('2026-03-04')` fallback
- Added `useClientTime()` hook in `NotificationItem` component
- Passed `now` to `getRelativeTime(notification.timestamp, now)`
- Added `suppressHydrationWarning` on the span displaying relative time

### 2. multichain-deploy.tsx
- `getRelativeTime()` at line 223 used `const now = new Date()` — called from 3 sub-components during render
- Fix: Modified `getRelativeTime` to accept optional `now?: Date | null` parameter with `new Date('2026-03-04')` fallback
- Added `useClientTime()` hook in 3 sub-components: `ChainManagementTab`, `StateSyncTab`, `ChainSwitchTab`
- Updated all 3 call sites to pass `now`
- Added `suppressHydrationWarning` on all 3 spans displaying relative time

### 3. deployment-center.tsx
- `getRelativeTime()` at line 342 used `const now = new Date()` — called from OverviewTab
- Fix: Modified `getRelativeTime` to accept optional `now?: Date | null` parameter with `new Date('2026-03-04')` fallback
- Added `useClientTime()` hook in `OverviewTab` component
- Updated call site to pass `now`
- Added `suppressHydrationWarning` on the span displaying relative time

### 4. feature-flags.tsx
- `new Date().toISOString()` at lines 915, 944, 970, 977 — all in event handlers (handleToggle, handleRolloutChange, handleRollback) — SAFE, client-only
- No `new Date()` in render path
- Added `suppressHydrationWarning` on the rollback history date span as safety net (timestamp could come from client-created entries)

### 5. x402-payment.tsx
- `setCompletedAt(format(new Date(), ...))` at line 172 — in a setState callback within handleConfirm — SAFE, client-only
- `completedAt` is displayed in render: `{completedAt || '---'}`
- Added `suppressHydrationWarning` on the span displaying completedAt

### 6. contract-simulation.tsx
- `timestamp: new Date().toISOString()` at line 631 — in handleSimulate callback — SAFE, client-only
- No `new Date()` in render path
- Added `suppressHydrationWarning` on the history timestamp display as safety net

- Ran `bun run lint` → zero errors

Stage Summary:
- Hydration mismatch errors fixed across 6 dashboard components
- Core fix pattern: `new Date()` in render → `useClientTime()` hook with `now` parameter + `suppressHydrationWarning`
- Event handler `new Date()` calls left unchanged (safe, client-only execution)
- Files modified:
  - src/components/dashboard/notification-center.tsx (useClientTime + suppressHydrationWarning)
  - src/components/dashboard/multichain-deploy.tsx (useClientTime in 3 tabs + suppressHydrationWarning)
  - src/components/dashboard/deployment-center.tsx (useClientTime + suppressHydrationWarning)
  - src/components/dashboard/feature-flags.tsx (suppressHydrationWarning on date display)
  - src/components/dashboard/x402-payment.tsx (suppressHydrationWarning on completedAt)
  - src/components/dashboard/contract-simulation.tsx (suppressHydrationWarning on timestamp)

---
Task ID: 6+8
Agent: Fix Agent
Task: Fix useEngineStatus() voided result (F-1 HIGH) + Missing aria-labels on key buttons (A11y-1 HIGH)

Work Log:

### Issue 1: useEngineStatus() result is voided (F-1 HIGH)
- Root cause: `const engineStatus = useEngineStatus()` followed by `void engineStatus;` — the entire Socket.IO connection data was explicitly discarded
- Fix applied to src/app/page.tsx:
  1. Removed `void engineStatus;` and the preceding comment about suppressing unused variable warnings
  2. Added Service Health Indicator in the header area (next to the resonance indicator):
     - Green dot + `{connectedCount}/{totalServices}` when allConnected is true
     - Amber dot + `{connectedCount}/{totalServices}` when not all connected
     - Uses `cn()` for conditional class merging
  3. Passed `engineStatus` prop to `<EngineStatusDashboard engineStatus={engineStatus} />`
- Fix applied to src/components/dashboard/engine-status.tsx:
  1. Added `EngineStatusDashboardProps` interface with optional `engineStatus` prop
  2. Component now accepts `{ engineStatus }` destructured prop
  3. Shows live connection count in the subtitle: "Real-time monitoring of 4 engine microservices · 3/6 live"
  4. Live count text color: emerald when allConnected, amber otherwise

### Issue 2: Missing aria-labels on key buttons (A11y-1 HIGH)
- Added `aria-label` attributes to all icon-only/interactive buttons in page.tsx:
  - Web3ConnectButton: `aria-label="Connect wallet"`
  - x402 Quick Pay button: `aria-label="Quick payment"`
  - Mobile menu toggle: `aria-label="Toggle menu"`
  - Desktop sidebar nav items (23 buttons): `aria-label={t(item.navKey)}`
  - Mobile slide-out nav items (23 buttons): `aria-label={t(item.navKey)}`
  - Mobile bottom nav items (4 buttons): `aria-label={t(item.navKey)}`
- Added `focus-visible` ring styles to all interactive buttons:
  - `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900`
  - Applied to: Web3ConnectButton, x402 Quick Pay, Mobile Menu Toggle, Desktop sidebar nav, Mobile slide-out nav, Mobile bottom nav

- Ran `bun run lint` → zero errors

Stage Summary:
- useEngineStatus() result no longer voided; connection data now powers the header Service Health Indicator and the EngineStatusDashboard live count
- All icon-only buttons now have descriptive aria-labels for screen reader accessibility
- All interactive buttons now have visible focus-visible ring styles for keyboard navigation
- Files modified:
  - src/app/page.tsx (removed void, added health indicator, added aria-labels + focus-visible styles, passed engineStatus prop)
  - src/components/dashboard/engine-status.tsx (added EngineStatusDashboardProps, accepts engineStatus prop, shows live count)

---
Task ID: 7
Agent: i18n Fix Agent
Task: Add missing i18n keys for 3 hardcoded Chinese strings in page.tsx

Work Log:

### Problem
page.tsx had 3 hardcoded Chinese strings that were not internationalized:
1. `'GPT-4o 文本生成'` — used in x402 Quick Pay button onClick
2. `'Pro'` — displayed in the sidebar Tier Badge
3. `` `租用 ${avatar.name}` `` — used in AvatarMarketplace onRent callback

### Fix Applied

#### 1. Added 3 keys to ALL 8 language files' "dashboard" section:
- `defaultService`: Service name for default GPT-4o text generation
- `proTier`: Pro tier label
- `rentAvatar`: Rent action label

| Language | defaultService | proTier | rentAvatar |
|----------|---------------|---------|------------|
| zh | GPT-4o 文本生成 | 专业版 | 租用 |
| en | GPT-4o Text Generation | Pro | Rent |
| ja | GPT-4o テキスト生成 | プロ | レンタル |
| ko | GPT-4o 텍스트 생성 | 프로 | 대여 |
| es | Generación de texto GPT-4o | Pro | Alquilar |
| fr | Génération de texte GPT-4o | Pro | Louer |
| de | GPT-4o Textgenerierung | Pro | Mieten |
| ar | توليد نص GPT-4o | احترافي | استئجار |

#### 2. Updated src/app/page.tsx:
- `setPaymentService('GPT-4o 文本生成')` → `setPaymentService(t('dashboard.defaultService'))`
- `<div ...>Pro</div>` → `<div ...>{t('dashboard.proTier')}</div>`
- `` setPaymentService(`租用 ${avatar.name}`) `` → `` setPaymentService(`${t('dashboard.rentAvatar')} ${avatar.name}`) ``

- Lint: zero errors
- Dev server compiling normally

Stage Summary:
- 3 hardcoded Chinese strings replaced with i18n t() calls
- All 8 language files now have complete dashboard.defaultService, dashboard.proTier, dashboard.rentAvatar keys
- Files modified:
  - src/lib/messages/zh.json (added 3 keys)
  - src/lib/messages/en.json (added 3 keys)
  - src/lib/messages/ja.json (added 3 keys)
  - src/lib/messages/ko.json (added 3 keys)
  - src/lib/messages/es.json (added 3 keys)
  - src/lib/messages/fr.json (added 3 keys)
  - src/lib/messages/de.json (added 3 keys)
  - src/lib/messages/ar.json (added 3 keys)
  - src/app/page.tsx (replaced 3 hardcoded strings with t() calls)

---
Task ID: Technical Debt Sprint
Agent: Main Orchestrator + 6 Parallel Sub-agents
Task: Fix Hydration mismatch + Full tech debt audit + Fix all Critical/High issues

Work Log:
- Diagnosed Hydration mismatch root cause: `new Date()` in getRelativeTime() functions across 7 components
- Created `useClientTime` hook using useSyncExternalStore for SSR-safe time
- Fixed Hydration in: security-audit, notification-center, multichain-deploy, deployment-center, feature-flags, x402-payment, contract-simulation
- Full tech debt audit identified: 2 Critical + 4 High + 7 Medium + 6 Low issues
- Fixed P-1 CRITICAL: Duplicate QueryClientProvider → removed from Web3Provider
- Fixed S-1 CRITICAL: Created useWeb3Sync hook connecting wagmi → useWeb3Store
- Fixed E-1 HIGH: Created error.tsx error boundary
- Fixed E-2 MEDIUM: Created loading.tsx skeleton
- Fixed F-1 HIGH: Wired useEngineStatus to header indicator + EngineStatusDashboard
- Fixed I-2 MEDIUM: Added 3 i18n keys (defaultService, proTier, rentAvatar) to all 8 languages
- Fixed A11y-1 HIGH: Added aria-labels to all icon-only buttons + focus-visible rings
- Lint: zero errors, Frontend: 200 OK

Stage Summary:
- All Critical + High issues resolved
- Hydration mismatch completely eliminated across all 7 components
- Web3 wallet now properly synced to Zustand store
- Error recovery UI in place (error.tsx + loading.tsx)
- 134 TS/TSX files, 11 hooks, 79 components, 28 API routes
- Remaining tech debt: i18n of 27 dashboard components (1642+ hardcoded Chinese chars), unused store fields

---
Task ID: 1-a
Agent: i18n Migration Agent
Task: Replace hardcoded Chinese strings with t() calls in 3 dashboard components

Work Log:

### Components Migrated:

#### 1. cognitive-card.tsx (认知身份卡片)
- Added `import { useI18n } from '@/hooks/use-i18n'`
- Added `const { t } = useI18n()` to `CognitiveCard` and `RevenueSplitBar` components
- Modified `getTierLabel(tier, t)` to accept `t` parameter
- Replaced 20 hardcoded Chinese strings:
  - `'入门'/'专业'/'企业'` → `t('avatar.tierStarter/tierPro/tierEnterprise')`
  - `人类/金库/LP` → `t('avatar.human/vault/lp')`
  - `认知根:` → `{t('avatar.cognitionRoot')}:`
  - `共振分` → `{t('avatar.resonanceScore')}`
  - `情绪共振强度评分` → `t('avatar.resonanceDescription')`
  - `正常运作区间/接近软限制阈值/已触发硬暂停` → `t('avatar.normalZone/softLimitZone/hardPauseZone')`
  - `技能包` → `t('avatar.skillPack')`
  - `使用 X 次 · 满意度 Y%` → `t('avatar.skillUsageSatisfaction', { count, satisfaction })`
  - `收益阈值: $X 解锁` → `t('avatar.skillUnlockThreshold', { threshold })`
  - `平均成本` → `t('skills.avgCost')` (reused existing key)
  - `年度收益` → `t('avatar.annualRevenue')`
  - `熔断状态:` → `{t('avatar.circuitState')}:` (reused existing key)
  - `查看时间线/调整委托/熔断设置` → `t('avatar.viewTimeline/adjustDelegation/circuitSettings')`

#### 2. split-dashboard.tsx (动态分账仪表盘)
- Added `import { useI18n } from '@/hooks/use-i18n'`
- Added `const { t, locale } = useI18n()` to `SplitDashboard`
- Modified `getSourceLabel(source, t)` to accept `t` parameter
- Added `locale` to `splitBars` useMemo dependency for correct re-render on locale change
- Replaced 15 hardcoded Chinese strings:
  - `动态分账仪表盘` → `t('revenue.title')` (reused existing key)
  - `本月收益及分账详情` → `t('revenue.subtitle')`
  - `人类份额/分身金库/协议LP` → `t('revenue.humanShareLabel/avatarVaultLabel/protocolLPLabel')`
  - `vs上月` → `t('revenue.vsLastMonth')`
  - `动态调整` → `t('revenue.dynamicAdjustment')` (reused existing key)
  - `共振分越高 → ...` → `t('revenue.resonanceRule')`
  - `月度收益趋势` → `t('revenue.monthlyTrend')`
  - `'月'` (chart tickFormatter suffix) → `t('revenue.monthSuffix')`
  - `最近分账` → `t('revenue.recentSplits')` (reused existing key)
  - `技能调用` → `t('revenue.skillCall')` (reused existing key)
  - `分身租赁/跨分身协作` → `t('revenue.sourceRental/sourceCollaboration')`
  - `查看详细分账日志` → `t('revenue.viewDetailedLog')`

#### 3. resonance-wave.tsx (共振波形)
- Added `import { useI18n } from '@/hooks/use-i18n'`
- Added `const { t } = useI18n()` to `ResonanceWave`
- Modified `getCircuitBadge(state, t)` to accept `t` parameter
- Replaced 14 hardcoded Chinese strings:
  - `情绪共振波形` → `t('resonance.title')`
  - `24小时共振强度监测` → `t('resonance.subtitle')`
  - `正常运行/软限制/硬暂停/恢复中` → `t('resonance.normalOperation/softLimit/hardPause/recovery')`
  - `软限制/硬暂停` (chart threshold labels) → `t('resonance.softLimit/hardPause')`
  - `危险区/警告区/安全区` → `t('resonance.dangerZone/warningZone/safeZone')`
  - `软限制生效/硬暂停触发` → `t('resonance.softLimitActive/hardPauseTriggered')`

### New i18n Keys Added (38 keys × 8 languages = 304 entries):

#### avatar section (17 new keys):
- tierStarter, tierPro, tierEnterprise, human, vault, lp
- resonanceDescription, normalZone, softLimitZone, hardPauseZone
- skillPack, skillUsageSatisfaction, skillUnlockThreshold
- annualRevenue, viewTimeline, adjustDelegation, circuitSettings

#### revenue section (11 new keys):
- subtitle, humanShareLabel, avatarVaultLabel, protocolLPLabel
- vsLastMonth, resonanceRule, monthlyTrend
- sourceRental, sourceCollaboration, viewDetailedLog, monthSuffix

#### resonance section (11 new keys - entirely new section):
- title, subtitle, normalOperation, softLimit, hardPause, recovery
- dangerZone, warningZone, safeZone, softLimitActive, hardPauseTriggered

### Reused Existing Keys:
- `avatar.cognitionRoot`, `avatar.resonanceScore`, `avatar.circuitState`
- `revenue.title`, `revenue.dynamicAdjustment`, `revenue.recentSplits`, `revenue.skillCall`
- `skills.avgCost`

### Verification:
- `npx eslint` on all 3 modified components → zero errors
- Dev server compiling normally

Stage Summary:
- 3 dashboard components fully i18n-migrated: cognitive-card, split-dashboard, resonance-wave
- 49 hardcoded Chinese strings replaced with t() calls
- 38 new i18n keys added to all 8 language files (zh, en, ja, ko, es, fr, de, ar)
- New `resonance` section added to all message files
- Helper functions (getTierLabel, getSourceLabel, getCircuitBadge) modified to accept `t` parameter
- Files modified:
  - src/components/dashboard/cognitive-card.tsx (20 strings → t() calls)
  - src/components/dashboard/split-dashboard.tsx (15 strings → t() calls)
  - src/components/dashboard/resonance-wave.tsx (14 strings → t() calls)
  - src/lib/messages/zh.json, en.json, ja.json, ko.json, es.json, fr.json, de.json, ar.json (38 new keys each)

---
Task ID: 2+3
Agent: Fix Agent
Task: Add try/catch error handling to API routes (A-1, A-2, A-3) + Clean up DashboardStore unused fields (S-2)

Work Log:

### Task A: Add try/catch error handling to all API routes

Audited all 28 API route files. Found 20 GET handlers and 2 POST handlers lacking proper error handling.

**GET handlers wrapped with try/catch (20 routes):**
- `/api/compliance/route.ts` — GET handler wrapped
- `/api/contracts-arch/route.ts` — GET handler wrapped
- `/api/contracts/simulate/route.ts` — GET handler wrapped
- `/api/dashboard/route.ts` — GET handler wrapped
- `/api/dao-governance/route.ts` — GET handler wrapped
- `/api/data-infra/route.ts` — GET handler wrapped
- `/api/deployment/route.ts` — GET handler wrapped
- `/api/ecosystem/route.ts` — GET handler wrapped
- `/api/engine-arch/route.ts` — GET handler wrapped
- `/api/engine-status/route.ts` — GET handler wrapped
- `/api/feature-flags/route.ts` — GET handler wrapped
- `/api/health/route.ts` — GET handler wrapped
- `/api/liquidity/route.ts` — GET handler wrapped
- `/api/monitoring/route.ts` — GET handler wrapped
- `/api/multichain/route.ts` — GET handler wrapped
- `/api/performance/route.ts` — GET handler wrapped
- `/api/route.ts` — GET handler wrapped
- `/api/sdk-platform/route.ts` — GET handler wrapped
- `/api/security/route.ts` — GET handler wrapped
- `/api/web3-integration/route.ts` — GET handler wrapped

**Empty catch blocks fixed (2 routes):**
- `/api/compliance/route.ts` POST — `catch {}` → `catch (error) { console.error('[API] Error in POST /api/compliance:', error); ... }`
- `/api/feature-flags/route.ts` POST — `catch {}` → `catch (error) { console.error('[API] Error in POST /api/feature-flags:', error); ... }`

**All error responses follow the standard pattern:**
```ts
catch (error) {
  console.error('[API] Error in GET /api/{route}:', error);
  return NextResponse.json(
    { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
    { status: 500 }
  );
}
```

**Routes already having proper try/catch (no changes needed):**
- `/api/avatars/[id]/route.ts` — GET and PATCH both had try/catch
- `/api/avatars/[id]/unlock-skill/route.ts` — POST had try/catch
- `/api/avatars/route.ts` — GET and POST both had try/catch
- `/api/delegations/route.ts` — GET, POST, PATCH all had try/catch
- `/api/resonance/route.ts` — GET and POST both had try/catch
- `/api/revenues/route.ts` — GET and POST both had try/catch
- `/api/skills/route.ts` — GET and POST both had try/catch
- `/api/seed/route.ts` — POST had try/catch
- `/api/contracts/simulate/route.ts` — POST had try/catch (GET was added)

### Task B: Clean up DashboardStore unused fields (S-2)

**1. sidebarCollapsed/toggleSidebar — Added collapse button to sidebar:**
- Modified `src/app/page.tsx`:
  - Added `ChevronsLeft` and `ChevronsRight` icon imports
  - Destructured `sidebarCollapsed` and `toggleSidebar` from `useDashboardStore`
  - Sidebar width changes dynamically: `w-[220px]` when expanded, `w-[60px]` when collapsed
  - Added `transition-all duration-300` for smooth width animation
  - Nav items: when collapsed, show icon-only mode with `justify-center` and `title` tooltip
  - Added collapse toggle button (ChevronsLeft/ChevronsRight) between nav and tier badge
  - Tier badge hidden when collapsed (`{!sidebarCollapsed && ...}`)

**2. theme/setTheme — Already handled by next-themes:**
- No action needed (dark mode default already works via next-themes)

**3. unreadCount/incrementUnread/resetUnread — Wired up NotificationCenter:**
- Modified `src/components/dashboard/notification-center.tsx`:
  - Added `useEffect` import
  - Added `useDashboardStore` import
  - Destructured `unreadCount`, `resetUnread`, `setUnreadCount` from store
  - Renamed local `unreadCount` → `localUnreadCount` (from `useMemo`)
  - Added `useEffect` to sync `localUnreadCount` → store via `setUnreadCount`
  - Badge on bell now reads from store's `unreadCount` (kept existing display logic)
  - "Mark all read" button now calls `resetUnread()` in addition to local state update
  - `incrementUnread` available in store for future WebSocket notification arrivals

Verification:
- `npx eslint src/app/api/ src/app/page.tsx src/components/dashboard/notification-center.tsx` → zero errors
- Dev server compiling normally, all routes returning 200 OK
- Pre-existing lint errors only in `add-i18n-keys.js` (unrelated utility script)

Stage Summary:
- All 28 API routes now have proper try/catch error handling on all HTTP method handlers
- 2 empty catch blocks fixed with `console.error` + error message
- Sidebar collapse/expand feature implemented using `sidebarCollapsed`/`toggleSidebar` from store
- NotificationCenter wired to DashboardStore: `unreadCount` displayed as badge, `resetUnread()` called on mark-all-read
- Files modified:
  - 20 API route files (added try/catch to GET handlers)
  - 2 API route files (fixed empty catch blocks: compliance, feature-flags)
  - src/app/page.tsx (sidebar collapse UI)
  - src/components/dashboard/notification-center.tsx (unreadCount wiring)

---
Task ID: 1-c
Agent: i18n Migration Agent
Task: Replace hardcoded Chinese strings with t() calls in 3 dashboard components

Work Log:

### 1. avatar-marketplace.tsx (分身市场)
- Added `import { useI18n } from '@/hooks/use-i18n'` and `const { t } = useI18n()` in AvatarMarketplace component
- Created translation key mapping objects at module level for domain/skill/name display (DOMAIN_LABEL_KEYS, SKILL_LABEL_KEYS, AVATAR_NAME_KEYS)
- Built `domainLabelMap`, `skillLabelMap`, `nameLabelMap` inside component using `useMemo` + `t()` for efficient translated lookups
- Changed DOMAIN_OPTIONS and SORT_OPTIONS from hardcoded Chinese labels to `labelKey` fields referencing i18n keys
- Updated AvatarCard to receive `domainLabel`, `nameLabel`, `skillLabelMap`, and `t` as props for translated display
- Replaced all UI strings with t() calls:
  - `'分身市场'` → `t('marketplace.title')`
  - `'搜索技能/领域/价格...'` → `t('marketplace.searchPlaceholder')`
  - `'领域'` → `t('marketplace.domainPlaceholder')`
  - `'排序'` → `t('marketplace.sortPlaceholder')`
  - `'{n} 个分身'` → `t('marketplace.avatarCount', { count })`
  - `'/小时'` → `t('marketplace.perHour')`
  - `'租用'` → `t('marketplace.rent')`
  - `'未找到匹配的分身'` → `t('marketplace.emptyTitle')`
  - `'尝试调整搜索条件或筛选器'` → `t('marketplace.emptyHint')`
- Search now also matches against translated labels (both Chinese data values and translated display text)
- Filter logic preserved: domain values (Chinese strings) still used as matching keys

### 2. cognitive-timeline.tsx (认知时间线)
- Added `import { useI18n } from '@/hooks/use-i18n'` and `const { t } = useI18n()` in CognitiveTimeline component
- Changed EVENT_TYPE_CONFIG `label` field to `labelKey` (i18n key): `'收益'` → `'timeline.labelRevenue'`, etc.
- Changed FILTER_LABELS to FILTER_LABEL_KEYS: `{ all: '全部', ... }` → `{ all: 'common.all', revenue: 'timeline.labelRevenue', ... }`
- Updated TimelineEventCard to accept `t` as prop
- Replaced all UI strings with t() calls:
  - `'认知时间线'` → `t('timeline.title')`
  - `'{n} 条记录'` → `t('timeline.recordCount', { count })`
  - Event type labels: `config.label` → `t(config.labelKey)`
  - Filter tab labels: `FILTER_LABELS[key]` → `t(FILTER_LABEL_KEYS[key])`
  - `'金额:'` → `t('timeline.amountLabel')`
  - `'该筛选条件下暂无事件记录'` → `t('timeline.emptyFilter')`
  - `'导出全部记录'` → `t('timeline.exportAll')`
  - `'订阅更新'` → `t('timeline.subscribeUpdates')`

### 3. notification-center.tsx (通知中心)
- Added `import { useI18n } from '@/hooks/use-i18n'` and `import type { TranslateFn } from '@/hooks/use-i18n'`
- Added `const { t } = useI18n()` in NotificationCenter component
- Changed Notification interface: `title`/`message` → `titleKey`/`messageKey` (i18n keys)
- Updated MOCK_NOTIFICATIONS to use i18n keys: `title: '收到新收益'` → `titleKey: 'notifications.titleRevenue'`, etc.
- Modified `getRelativeTime()` to accept `t: TranslateFn` parameter for translated relative time strings
- Updated NotificationItem to accept `t: TranslateFn` prop
- Replaced all UI strings with t() calls:
  - `'通知'` → `t('notifications.title')`
  - `'{n} 未读'` → `t('notifications.unreadCount', { count })`
  - `'全部标为已读'` → `t('notifications.markAllRead')`
  - `'标为已读'` → `t('notifications.markAsRead')` (button title)
  - `'暂无通知'` → `t('notifications.empty')`
  - `'查看全部通知'` → `t('notifications.viewAll')`
  - Relative time: `'刚刚'` → `t('notifications.justNow')`, `'分钟前'` → `t('notifications.minutesAgo', { count })`, etc.
  - Notification titles/messages: `notification.title` → `t(notification.titleKey)`, `notification.message` → `t(notification.messageKey)`

### New i18n keys added to ALL 8 language files:

**marketplace.* (44 keys):**
- title, searchPlaceholder, domainPlaceholder, sortPlaceholder, avatarCount, perHour, rent, emptyTitle, emptyHint
- allDomains, domainContent, domainData, domainBusiness, domainCustomer, domainTech
- sortDefault, sortResonance, sortPriceLow, sortPriceHigh
- nameCopywriting, nameDataHunter, nameNegotiator, nameVisualArtisan, nameServiceElf, nameFullStack
- skillCopyGen, skillSeo, skillContentPlan, skillDataAnalysis, skillBiReport, skillPredictModel, skillBizNegotiate, skillContractReview, skillRiskAssess, skillImageGen, skillVideoEdit, skillUiDesign, skillCustomerService, skillFaqGen, skillTicketProcess, skillCodeGen, skillArchDesign, skillCodeReview

**notifications.* (16 keys):**
- title, justNow, minutesAgo, hoursAgo, daysAgo, markAsRead, unreadCount, markAllRead, empty, viewAll
- titleRevenue, msgRevenue, titleResonance, msgResonance, titleSkill, msgSkill, titleCircuit, msgCircuit, titleSystem, msgSystem

**timeline.* (10 additional keys):**
- recordCount, labelRevenue, labelSkill, labelResonance, labelDelegation, labelCircuit, amountLabel, emptyFilter, exportAll, subscribeUpdates

Verification:
- `bun run lint` → zero errors (only pre-existing errors in unrelated add-i18n-keys.js)
- Dev server compiling normally

Stage Summary:
- 3 dashboard components fully migrated from hardcoded Chinese to i18n t() calls
- 70 new i18n keys added across marketplace.*, notifications.*, and timeline.* sections
- All 8 language files (zh, en, ja, ko, es, fr, de, ar) updated with complete translations
- No layout, styling, or logic changes — only string literal replacements
- Files modified:
  - src/components/dashboard/avatar-marketplace.tsx (i18n migration)
  - src/components/dashboard/cognitive-timeline.tsx (i18n migration)
  - src/components/dashboard/notification-center.tsx (i18n migration)
  - src/lib/messages/zh.json (added marketplace + notifications + timeline keys)
  - src/lib/messages/en.json (added marketplace + notifications + timeline keys)
  - src/lib/messages/ja.json (added marketplace + notifications + timeline keys)
  - src/lib/messages/ko.json (added marketplace + notifications + timeline keys)
  - src/lib/messages/es.json (added marketplace + notifications + timeline keys)
  - src/lib/messages/fr.json (added marketplace + notifications + timeline keys)
  - src/lib/messages/de.json (added marketplace + notifications + timeline keys)
  - src/lib/messages/ar.json (added marketplace + notifications + timeline keys)

---
Task ID: 4
Agent: sync-i18n-keys
Task: Sync i18n keys across 8 language files — make all files have identical key sets

Work Log:

### Problem
8 i18n language files had UNEVEN key counts:
- zh/en: ~1234 keys (master)
- ja/ko: 1358 keys (82 missing from zh + 206 extra not in zh)
- es/fr: 1152 keys (82 missing from zh, no extras)
- de/ar: 1083 keys (151 missing from zh, no extras)

Root cause: Different agents added keys to different subsets of language files over time. ja/ko had extra keys in compliance (61), liquidity (79), and security (66) sections that didn't exist in zh. Several sections (circuit, delegation, skills, avatar, payment, resonance, revenue) were incomplete in some languages.

### Approach
1. Used zh.json as the master reference (project is originally Chinese)
2. Wrote a Node.js comparison script to flatten all keys and identify:
   - Missing keys (in zh but not in target language)
   - Extra keys (in target language but not in zh)
3. Created a sync script with translation maps for all missing keys across 6 languages
4. For each language file: kept existing translated values for matching keys, added translated values for missing keys, removed extra keys not in zh

### Changes Per Language

| Language | Keys Before | Keys After | Added | Removed | Sections Affected |
|----------|------------|------------|-------|---------|-------------------|
| en | 1234 | 1267 | 0 | 0 | Already in sync |
| ja | 1358 | 1267 | 82 | 206 | circuit, delegation, skills + removed liquidity, extra compliance/security |
| ko | 1358 | 1267 | 82 | 206 | circuit, delegation, skills + removed liquidity, extra compliance/security |
| es | 1152 | 1267 | 82 | 0 | circuit, delegation, skills |
| fr | 1152 | 1267 | 82 | 0 | circuit, delegation, skills |
| de | 1083 | 1267 | 151 | 0 | circuit, delegation, skills, avatar, payment, resonance, revenue |
| ar | 1083 | 1267 | 151 | 0 | circuit, delegation, skills, avatar, payment, resonance, revenue |

### Missing Keys Added (with machine translations)
- **circuit section** (36 keys): adjustParams, approveAction, autoRecover, belowThreshold, cognitionPaused, cognitionState, defaultAction, degradedRun, degradedRunAlert, demoSwitch, freezePermanently, hardThresholdLabel, intercepted, lastAction, lessThanHardThreshold, logContractBlocked, logGenRequest, logHeartbeatNormal, logResonanceUpdate, manualPause, manualPauseDegraded, manualReview, normalRun, operationLog, pausedState, pendingAction, recoveringDots, recoveringState, recoveryCountdown, resonanceRecovering, resonanceScoreLabel, resumeRun, signContractAction, softThresholdLabel, triggerCause, viewLog
- **delegation section** (19 keys): activeDelegations, availableDelegates, cognitiveMatch, confirmRevokeDomain, confirmSaveDomain, currentWeight, domainContent/Short, domainData/Short, domainNegotiation/Short, domainService/Short, noAvailableDelegates, primaryAvatar, primaryWeight, saveDelegation, subCopyName/subDataName/subNegotiationName/subServiceName/subVideoName
- **skills section** (22 keys): allRevenueUnlocked, avgCostLabel, currentAmount, instantUnlock, lockedBadge, needProSubscription, needRevenue, nextStage, noSkillsInCategory, tabAll/tabGeneral/tabRag/tabMultimodal/tabCollaboration, tierBasic/tierAdvancedRag/tierMultimodal/tierCollaboration, unlockable, unlockedCountLabel, upgradePlan, usageCountLabel, viewUnlockProgress
- **Additional for de/ar only** (69 keys): avatar.adjustDelegation/annualRevenue/circuitSettings/hardPauseZone/human/lp/normalZone/resonanceDescription/skillPack/skillUnlockThreshold/skillUsageSatisfaction/softLimitZone/tierEnterprise/tierPro/tierStarter/vault/viewTimeline, payment.* (30 keys), resonance.* (11 keys), revenue.avatarVaultLabel/humanShareLabel/monthSuffix/monthlyTrend/protocolLPLabel/resonanceRule/sourceCollaboration/sourceRental/subtitle/viewDetailedLog/vsLastMonth

### Extra Keys Removed from ja/ko (206 keys)
- compliance: 61 extra keys (a11yColorContrast, a11yKeyboardNav, a11yScreenReader, activated, kycFieldPreview, pluginArbDesc, etc.)
- liquidity: 79 extra keys (entire section removed: active, addLiquidity, afcBuyback, title, subtitle, etc.)
- security: 66 extra keys (acceptedRiskLabel, allInvariantPass, certoraFormalVerification, invCircuitIntercept, etc.)

### Verification
- All 8 files: 1267 keys each, 30 sections each, identical key sets
- Spot-checked translations: ja/ko/es/fr/de/ar all have proper native translations (not copied Chinese)
- Removed sections verified: ja no longer has liquidity section, compliance/security reduced to match zh
- `bun run lint` → zero errors
- Temp sync script cleaned up

Stage Summary:
- All 8 i18n language files now have IDENTICAL key sets (1267 keys, 30 sections)
- 550+ missing key translations added across 6 languages
- 206 extra keys removed from ja and ko (compliance, liquidity, security)
- zh.json remains the single source of truth for key structure
- Files modified:
  - src/lib/messages/en.json (key reordering only)
  - src/lib/messages/ja.json (+82 keys, -206 keys)
  - src/lib/messages/ko.json (+82 keys, -206 keys)
  - src/lib/messages/es.json (+82 keys)
  - src/lib/messages/fr.json (+82 keys)
  - src/lib/messages/de.json (+151 keys)
  - src/lib/messages/ar.json (+151 keys)

---
Task ID: 1-b-3
Agent: i18n Migration Agent
Task: Replace ALL hardcoded Chinese strings with t() calls in src/components/dashboard/engine-arch.tsx

Work Log:

### engine-arch.tsx (Rust 引擎架构)

- Added `import { useI18n } from '@/hooks/use-i18n'`
- Added `const { t } = useI18n()` to 4 components: `CopyButton`, `ModuleCard`, `DataFlowDiagram`, `EngineArch`
- Replaced ALL 35+ hardcoded Chinese strings with t() calls using existing `engine.*` i18n keys

**Strings replaced:**
- `aria-label="复制"` → `aria-label={t('engine.copy')}`
- `延迟` → `{t('engine.latency')}`
- `吞吐` → `{t('engine.throughput')}`
- `内存` → `{t('engine.memory')}`
- `测试:` → `{t('engine.testLabel')}`
- `通过` → `{t('engine.passing')}`
- `函数列表` → `{t('engine.functionList')}`
- `'收起数学模型' : '查看数学模型'` → `t('engine.collapseMathModel') : t('engine.viewMathModel')`
- `数学模型` → `{t('engine.mathModel')}`
- `符号/名称/值/描述` (×2 tables) → `{t('engine.symbol/name/value/description')}`
- `数据流拓扑` → `{t('engine.dataFlowTopology')}`
- `加载 Rust 引擎架构数据...` → `{t('engine.loadingData')}`
- `模块/函数/测试/平均延迟` (overview stats) → `t('engine.modules/functions/tests/avgLatency')`
- `该分类暂无模块` → `{t('engine.noModulesInCategory')}`
- `总代码量/CPU 使用/内存占用/运行时间` → `t('engine.totalLoc/cpuUsage/memoryUsageLabel/uptime')`
- `当前/总计/可用性` (sub labels) → `t('engine.cpuCurrent/memoryTotal/availability')`
- `数据流详情` → `{t('engine.dataFlowDetails')}`
- `{count} 条` → `t('engine.flowCount', { count })`
- `最快操作/最慢操作/平均 P99` → `t('engine.fastestOp/slowestOp/avgP99')`
- `性能基准 — P50 / P95 / P99 延迟分布` → `{t('engine.benchmarkTitle')}`
- `操作/单位` (table headers) → `t('engine.operation/unit')`
- `IFD 权重函数 λ 向量` → `{t('engine.ifdWeightVector')}`
- `Σλ = X (权重归一化)` → `t('engine.weightNormalization', { sum })`
- `AFC 代币经济 — 通缩模型` → `{t('engine.afcTokenomics')}`
- `燃烧率` (×3) → `{t('engine.burnRate')}`
- `月燃烧量递增 ×3.6x` → `{t('engine.monthlyBurnIncrease')}`
- `回购率` (×3) → `{t('engine.buybackRate')}`
- `金库回购比例 ×2.0x` → `{t('engine.vaultBuybackRatio')}`
- `价值捕获率` → `{t('engine.valueCaptureRate')}`
- `Rust 引擎架构` → `{t('engine.rustEngine')}`
- `6 核心模块 · 28 函数 · 165 测试` → `{t('engine.engineSubtitle')}`
- Tab labels: `引擎模块/数据流/性能基准/数学模型` → `t('engine.engineModules/dataFlow/performanceBenchmark/mathModels')`

### No new i18n keys needed
All keys already existed in the `engine.*` section of all 8 language files (zh, en, ja, ko, es, fr, de, ar).

Verification:
- `bun run lint` → zero errors
- No remaining Chinese characters in the file (verified with ripgrep)
- No layout, styling, or logic changes — only string literal replacements

Stage Summary:
- 1 dashboard component fully migrated from hardcoded Chinese to i18n t() calls
- 35+ hardcoded Chinese strings replaced across 4 sub-components
- All existing engine.* i18n keys reused (no new keys needed)
- Files modified:
  - src/components/dashboard/engine-arch.tsx (i18n migration)

---
Task ID: 1-a-3
Agent: i18n Migration Agent
Task: Replace ALL hardcoded Chinese strings with t() calls in src/components/dashboard/dao-governance.tsx

Work Log:

### dao-governance.tsx (DAO 治理仪表盘)
- Added `import { useI18n } from '@/hooks/use-i18n'` and `import type { TranslateFn } from '@/hooks/use-i18n'`
- Added `const { t } = useI18n()` in `DAOGovernance` main component
- Modified helper functions to accept `t: TranslateFn` parameter:
  - `getTimeRemaining(t, endTime)` — translated '已结束', '{days}天 {hours}小时', '{hours}小时'
  - `getTimeAgo(t, iso)` — translated '刚刚', '{hours}小时前', '{days}天前', '{months}月前'
  - `getCategoryLabel(t, cat)` — translated '经济', '技术', '安全', '合规', '社区'
  - `getStatusLabel(t, status)` — translated '投票中', '已通过', '已否决', '排队中'
  - `getRiskLabel(t, risk)` — translated '低风险', '中风险', '高风险'
- Updated ProposalCard sub-component to accept `t: TranslateFn` as prop
- Updated VotingChartTooltip sub-component to accept `t: TranslateFn` as prop
- Passed `t` from main component to all sub-components and helper functions
- Added `t` to `treasuryPieData` useMemo dependency for correct re-render on locale change

### Replaced 89 hardcoded Chinese strings with t() calls:

**Header area:**
- 'DAO 治理仪表盘' → `t('dao.dashboard')`
- '去中心化治理 · 流体民主委托 · 社区金库' → `t('dao.subtitle')`
- '治理活跃' → `t('dao.governanceActive')`

**Tab labels:**
- '治理提案' → `t('dao.governanceProposals')`
- '投票统计' → `t('dao.votingStatistics')`
- '委托网络' → `t('dao.delegationNetwork')`
- '社区金库' → `t('dao.communityTreasury')`

**Tab 1 — Proposals:**
- '总提案' → `t('dao.totalProposals')`
- '投票中' (active count) → `t('dao.statusVoting')`
- '已通过' → `t('dao.passed')`
- '已否决' → `t('dao.defeated')`
- '全部' → `t('common.all')`
- '收起'/'展开' → `t('dao.collapse')`/`t('dao.expand')`
- '赞成'/'反对'/'弃权' → `t('dao.forLabel')`/`t('dao.againstLabel')`/`t('dao.abstainLabel')`
- '✓ 达标'/'未达标' → `t('dao.quorumReached')`/`t('dao.quorumNotReached')`
- '剩余' → `t('dao.timeRemaining')`
- '执行于' → `t('dao.executedAt')`
- '结束于' → `t('dao.endedAt')`
- '查看详情' → `t('dao.viewDetails')`
- '投票' → `t('dao.vote')`

**Tab 2 — Stats:**
- '总投票者' → `t('dao.totalVoters')`
- '参与率' → `t('dao.participationRate')`
- '平均 Quorum' → `t('dao.avgQuorum')`
- '通过率' → `t('dao.passRate')`
- '投票参与趋势' → `t('dao.votingTrend')`
- '参与率 (%)' → `t('dao.participationPct')`
- '提案数' → `t('dao.proposalCount')`
- '日期' → `t('dao.dateLabel')`
- '治理参数' → `t('dao.governanceParams')`
- '修改参数' → `t('dao.modifyParams')`
- '投票周期'/'提案门槛'/'执行延迟'/'时间锁' → `t('dao.votingPeriod')`/`t('dao.proposalThreshold')`/`t('dao.executionDelay')`/`t('dao.timeLock')`
- '* 修改治理参数需要发起提案并通过投票' → `t('dao.paramNote')`

**Tab 3 — Delegation:**
- '活跃委托' → `t('dao.activeDelegation')`
- '共 {n} 条' → `t('dao.totalCount', { count })`
- '委托权重' → `t('dao.delegationWeight')`
- '仅活跃委托' → `t('dao.activeOnly')`
- '顶级委托代表' → `t('dao.topDelegates')`
- '委托' → `t('dao.delegate')`
- '投票权' → `t('dao.votingPower')`
- '提案' → `t('dao.proposalsLabel')`
- '一致率' → `t('dao.agreementRate')`
- '委托者' → `t('dao.delegatorsLabel')`
- '委托关系树' → `t('dao.delegationTree')`
- '修改委托' → `t('dao.modifyDelegation')`
- '活跃'/'暂停' → `t('common.active')`/`t('dao.paused')`

**Tab 4 — Treasury:**
- '金库总览' → `t('dao.treasuryOverview')`
- '已分配 vs 可用' → `t('dao.allocatedVsAvailable')`
- '已分配'/'可用'/'预留' → `t('dao.allocated')`/`t('dao.available')`/`t('dao.reserved')`
- '月收入'/'月支出' → `t('dao.monthlyIncome')`/`t('dao.monthlyExpense')`
- '金库分配' → `t('dao.treasuryAllocation')`
- '最近交易' → `t('dao.recentTransactions')`
- '{n} 笔' → `t('dao.transactionCount', { count })`
- '收入'/'支出' → `t('dao.income')`/`t('dao.expense')`
- '提交资助提案' → `t('dao.submitGrantProposal')`

### New i18n key added to ALL 8 language files:
- `dao.statusVoting`: zh="投票中", en="Voting", ja="投票中", ko="투표 중", es="Votando", fr="Vote en cours", de="Abstimmung", ar="التصويت"

### Reused existing keys:
- All other keys already existed in the `dao.*` section across all 8 language files
- `common.all` and `common.active` reused from the common section

### Verification:
- `bun run lint` → zero errors
- `grep` for Chinese characters in the file → zero matches (no remaining hardcoded Chinese)
- Dev server compiling normally

Stage Summary:
- dao-governance.tsx fully i18n-migrated: 89 hardcoded Chinese strings replaced with t() calls
- 1 new i18n key (dao.statusVoting) added to all 8 language files
- Helper functions refactored to accept `t: TranslateFn` parameter
- Sub-components (ProposalCard, VotingChartTooltip) receive `t` as prop
- No layout, styling, or logic changes — only string literal replacements
- Files modified:
  - src/components/dashboard/dao-governance.tsx (89 strings → t() calls)
  - src/lib/messages/zh.json (added dao.statusVoting)
  - src/lib/messages/en.json (added dao.statusVoting)
  - src/lib/messages/ja.json (added dao.statusVoting)
  - src/lib/messages/ko.json (added dao.statusVoting)
  - src/lib/messages/es.json (added dao.statusVoting)
  - src/lib/messages/fr.json (added dao.statusVoting)
  - src/lib/messages/de.json (added dao.statusVoting)
  - src/lib/messages/ar.json (added dao.statusVoting)

---
Task ID: 1-c-1
Agent: i18n Migration Agent
Task: Replace ALL hardcoded Chinese strings with t() calls in src/components/dashboard/web3-wallet.tsx

Work Log:

### Changes to web3-wallet.tsx:

1. **Added i18n imports:**
   - `import { useI18n } from '@/hooks/use-i18n'`
   - `import type { TranslateFn } from '@/hooks/use-i18n'`

2. **CONTRACTS_LIST — Changed `desc` field to `descKey` (i18n key reference):**
   - `desc: '分身NFT核心合约'` → `descKey: 'descAvatarCore'`
   - `desc: '动态分账合约'` → `descKey: 'descDynamicSplitter'`
   - `desc: '认知熔断合约'` → `descKey: 'descCircuitGuard'`
   - `desc: '代币金库合约'` → `descKey: 'descTokenVault'`
   - `desc: '技能库合约'` → `descKey: 'descSkillVault'`
   - `desc: '流体民主路由'` → `descKey: 'descIfdRouter'`
   - `desc: '治理合约'` → `descKey: 'descGovernance'`
   - `desc: 'AFC代币合约'` → `descKey: 'descAfcToken'`
   - Render: `{contractInfo.desc}` → `{t(\`web3.\${contractInfo.descKey}\`)}`

3. **getRelativeTime — Accepts `t: TranslateFn` parameter:**
   - `${diffMin}分钟前` → `t('web3.minutesAgo', { count: diffMin })`
   - `${diffHr}小时前` → `t('web3.hoursAgo', { count: diffHr })`
   - `${diffDay}天前` → `t('web3.daysAgo', { count: diffDay })`
   - All call sites updated to pass `t` as second argument

4. **CopyBtn — Added `useI18n()` and replaced aria-label:**
   - `aria-label="复制"` → `aria-label={t('web3.copy')}`

5. **WalletTab — Added `useI18n()`, replaced 20 Chinese strings:**
   - `连接状态` → `t('web3.connectionStatus')`
   - `已连接/未连接` → `t('web3.connected')`/`t('web3.notConnected')`
   - `网络` → `t('web3.network')`
   - `余额` → `t('web3.balance')` (2 occurrences)
   - `区块高度` → `t('web3.blockHeight')`
   - `链` → `t('web3.chain')`
   - `最后连接` → `t('web3.lastConnected')`
   - `状态` → `t('web3.status')`
   - `在线` → `t('web3.online')`
   - `可用钱包` → `t('web3.availableWallets')`
   - `可用` → `t('web3.available')`
   - `连接` → `t('web3.connect')`
   - `断开` → `t('web3.disconnectBtn')`
   - `Wagmi 配置` → `t('web3.wagmiConfig')`
   - `支持链` → `t('web3.supportedChains')`
   - `连接器` → `t('web3.connectors')`
   - `自动连接` → `t('web3.autoConnect')`
   - `已启用/未启用` → `t('web3.enabled')`/`t('web3.notEnabled')`
   - `轮询间隔` → `t('web3.pollingInterval')`

6. **ContractsTab — Added `useI18n()`, replaced 15 Chinese strings:**
   - `在浏览器中查看` (aria-label) → `t('web3.viewInExplorer')`
   - `读取函数 (View)` → `t('web3.readFunctions')`
   - `写入函数 (Write)` → `t('web3.writeFunctions')`
   - `模拟中.../执行模拟读取` → `t('web3.simulating')`/`t('web3.executeSimRead')`
   - `模拟结果` → `t('web3.simResult')`
   - `Gas 估算` → `t('web3.gasEstimateLabel')`
   - `Gas 单位` → `t('web3.gasUnits')`
   - `ETH 成本` → `t('web3.ethCost')`
   - `USD 成本` → `t('web3.usdCost')`
   - `总函数` → `t('web3.totalFunctions')`
   - `可用` → `t('web3.available')`
   - `受限` → `t('web3.restricted')`

7. **TransactionsTab — Added `useI18n()`, replaced 12 Chinese strings:**
   - `总交易` → `t('web3.totalTx')`
   - `已确认` → `t('web3.confirmed')` (2 occurrences)
   - `待确认` → `t('web3.pending')` (2 occurrences)
   - `总Gas` → `t('web3.totalGas')`
   - `合约调用/代币转账` → `t('web3.contractCall')`/`t('web3.tokenTransfer')`
   - `失败` → `t('web3.failed')`
   - `费用:` → `t('web3.cost')`
   - `区块:` → `t('web3.block')`
   - `事件订阅` → `t('web3.eventSubscription')`
   - `活跃订阅` → `t('web3.activeSubs')`
   - `24h 事件数` → `t('web3.events24h')`

8. **GasTrackerTab — Added `useI18n()`, replaced 12 Chinese strings:**
   - `慢/标准/快/极速` → `t('web3.gasSlow/gasStandard/gasFast/gasInstant')` (dynamic key resolution)
   - `7天 Gas 趋势` → `t('web3.gas7dTrend')`
   - `Gas 估算工具` → `t('web3.gasEstTool')`
   - `选择函数` → `t('web3.selectFunction')`
   - `金额 (AFC)` → `t('web3.amountAfc')`
   - `预估Gas` → `t('web3.estimatedGas')`
   - `ETH成本` → `t('web3.ethCostShort')`
   - `USD成本` → `t('web3.usdCostShort')`
   - `当前Gas:` → `t('web3.currentGas')`
   - `区块:` → `t('web3.blockLabel')`

9. **Web3Wallet (main component) — Added `useI18n()`, replaced 5 Chinese strings:**
   - `加载 Web3 钱包数据...` → `t('web3.walletLoading')`
   - `Web3 钱包` → `t('web3.walletTitle')`
   - `钱包 · 合约 · 交易 · Gas` → `t('web3.walletSubtitle')`
   - `钱包/合约/交易/Gas` (tab labels) → `t('web3.walletTab/contractsTab/txTab/gasTab')`

### Changes to locale files (8 files):

Updated `web3.minutesAgo`, `web3.hoursAgo`, `web3.daysAgo` to include `{count}` parameter:

| Language | minutesAgo | hoursAgo | daysAgo |
|----------|-----------|---------|---------|
| zh | {count}分钟前 | {count}小时前 | {count}天前 |
| en | {count} min ago | {count} hr ago | {count} d ago |
| ja | {count}分前 | {count}時間前 | {count}日前 |
| ko | {count}분 전 | {count}시간 전 | {count}일 전 |
| es | Hace {count}m | Hace {count}h | Hace {count}d |
| fr | Il y a {count}m | Il y a {count}h | Il y a {count}j |
| de | Vor {count} Min. | Vor {count} Std. | Vor {count} Tagen |
| ar | منذ {count} د | منذ {count} س | منذ {count} ي |

All i18n keys used already existed in the `web3` section — no new keys needed.

Verification:
- `bun run lint` → zero errors
- Zero remaining Chinese characters in web3-wallet.tsx (verified via grep)
- Dev server compiling normally

Stage Summary:
- 50+ hardcoded Chinese strings replaced with t() calls in web3-wallet.tsx
- All existing `web3.*` i18n keys reused — no new keys added
- 3 locale keys updated with `{count}` parameter for proper interpolation (8 files × 3 keys = 24 updates)
- CONTRACTS_LIST.desc → CONTRACTS_LIST.descKey for i18n key resolution
- getRelativeTime() signature updated to accept TranslateFn parameter
- CopyBtn, WalletTab, ContractsTab, TransactionsTab, GasTrackerTab, Web3Wallet all use useI18n()
- Files modified:
  - src/components/dashboard/web3-wallet.tsx (full i18n migration)
  - src/lib/messages/zh.json (updated minutesAgo/hoursAgo/daysAgo with {count})
  - src/lib/messages/en.json (updated minutesAgo/hoursAgo/daysAgo with {count})
  - src/lib/messages/ja.json (updated minutesAgo/hoursAgo/daysAgo with {count})
  - src/lib/messages/ko.json (updated minutesAgo/hoursAgo/daysAgo with {count})
  - src/lib/messages/es.json (updated minutesAgo/hoursAgo/daysAgo with {count})
  - src/lib/messages/fr.json (updated minutesAgo/hoursAgo/daysAgo with {count})
  - src/lib/messages/de.json (updated minutesAgo/hoursAgo/daysAgo with {count})
  - src/lib/messages/ar.json (updated minutesAgo/hoursAgo/daysAgo with {count})

---
Task ID: 1-b-2
Agent: i18n Migration Agent
Task: Replace ALL hardcoded Chinese strings with t() calls in src/components/dashboard/ecosystem-hub.tsx

Work Log:

### Changes Made to ecosystem-hub.tsx:

1. Added imports:
   - `import { useI18n } from "@/hooks/use-i18n";`
   - `import type { TranslateFn } from "@/hooks/use-i18n";`

2. Added `const { t } = useI18n()` to all 5 component functions:
   - ProtocolIntegrationTab
   - WalletEcosystemTab
   - DataAggregationTab
   - NotificationCenterTab
   - EcosystemHub (main component)

3. Config Maps - Changed label values from Chinese strings to i18n keys:
   - STATUS_CONFIG: `label: "已集成"` → `label: "ecosystem.integrated"` (resolved via `t(statusConfig.label)`)
   - SUPPORT_CONFIG: `label: "完整支持"` → `label: "ecosystem.fullSupport"` etc.
   - PRIORITY_CONFIG: `label: "紧急"` → `label: "ecosystem.criticalLabel"` etc.
   - NOTIFICATION_TYPE_LABEL → renamed to NOTIFICATION_TYPE_LABEL_KEY, values now i18n keys
   - ACTIVITY_TYPE_CONFIG: label values changed to i18n keys
   - FEATURE_LABELS → renamed to FEATURE_LABEL_KEYS, values now i18n keys

4. Helper function - getRelativeTime():
   - Added `t: TranslateFn` parameter
   - `"刚刚"` → `t("ecosystem.justNow")`
   - `"X分钟前"` → `t("ecosystem.minutesAgo", { count: diffMins })`
   - `"X小时前"` → `t("ecosystem.hoursAgo", { count: diffHours })`
   - `"X天前"` → `t("ecosystem.daysAgo", { count: diffDays })`

5. FALLBACK_DATA - All Chinese content strings replaced with i18n keys:
   - Protocol descriptions (8): `"AFC/USDC流动性池托管，自动做市策略"` → `"ecosystem.descUniswap"` etc.
   - Notification titles (8): `"新提案: 调整分账比例"` → `"ecosystem.notifTitleGovernance"` etc.
   - Notification messages (8): `"提案 #1 已进入投票期，请参与治理"` → `"ecosystem.notifMsgGovernance"` etc.
   - Partner tier requirements (3): `"集成1个API端点"` → `"ecosystem.tierExplorerReq"` etc.
   - Partner tier benefits (3): `"基础技术支持, 社区徽章"` → `"ecosystem.tierExplorerBenefits"` etc.
   - Activity feed events (5): `"AFC/USDC池流动性增加 $50K"` → `"ecosystem.eventLiquidity"` etc.

6. JSX - All hardcoded Chinese replaced with t() calls:
   - `"总集成数"` → `t("ecosystem.totalIntegrations")`
   - `"活跃集成"` → `t("ecosystem.activeIntegrations")`
   - `"协议状态:"` → `t("ecosystem.protocolStatus")`
   - `"{n} 已集成"` → `t("ecosystem.integratedCount", { count: integrated })`
   - `"24h量"` → `t("ecosystem.volume24h")`
   - `"钱包支持:"` → `t("ecosystem.walletSupportLabel")`
   - `"{n} 完整"` → `t("ecosystem.fullCount", { count: fullCount })`
   - `"钱包已连接"` / `"连接钱包"` → `t("ecosystem.walletConnected")` / `t("ecosystem.connectWalletLabel")`
   - `"连接中..."` → `t("ecosystem.connectingLabel")`
   - `"断开"` → `t("ecosystem.disconnect")`
   - `"模拟连接"` → `t("ecosystem.simulateConnect")`
   - `"数据源"` → `t("ecosystem.dataSourceTitle")`
   - Table headers: `"提供商"`, `"记录数"`, `"新鲜度"`, `"状态"` → t() calls
   - `"活跃"` / `"延迟"` → `t("ecosystem.activeLabel")` / `t("ecosystem.delayedLabel")`
   - `"数据管道"` → `t("ecosystem.dataPipelineTitle")`
   - `"协议活动"` → `t("ecosystem.protocolActivity")`
   - `"通知偏好"` → `t("ecosystem.notificationPrefs")`
   - `"全部标为已读"` → `t("ecosystem.markAllRead")`
   - `"标记已读"` → `t("ecosystem.markRead")`
   - `"忽略"` → `t("ecosystem.ignore")`
   - `"合作伙伴计划"` → `t("ecosystem.partnerProgram")`
   - `"{n} 合作方"` → `t("ecosystem.partnerCount", { count })`
   - `"要求"` / `"权益"` → `t("ecosystem.requirements")` / `t("ecosystem.benefits")`
   - `"申请加入"` → `t("ecosystem.applyJoin")`
   - `"生态集成中心"` → `t("ecosystem.title")`
   - `"{n} 活跃"` → `t("ecosystem.activeCount", { count })`
   - Tab labels: `"协议集成"`, `"钱包生态"`, `"数据聚合"`, `"通知中心"` → t() calls

### New i18n keys added to ALL 8 language files:

**ecosystem.* (35 new keys):**
- activeCount, justNow, minutesAgo, hoursAgo, daysAgo
- descUniswap, descAave, descChainlink, descTheGraph, descLido, descCompound, desc1inch, descEns
- notifTitleGovernance, notifMsgGovernance, notifTitleRevenue, notifMsgRevenue, notifTitleSecurity, notifMsgSecurity
- notifTitleBridge, notifMsgBridge, notifTitleSkill, notifMsgSkill, notifTitleSystem, notifMsgSystem
- notifTitleDelegation, notifMsgDelegation, notifTitleCompliance, notifMsgCompliance
- tierExplorerReq, tierExplorerBenefits, tierBuilderReq, tierBuilderBenefits, tierStrategicReq, tierStrategicBenefits
- eventLiquidity, eventRate, eventPrice, eventSync, eventAlert

### Reused Existing Keys:
- ecosystem.integrated, ecosystem.pending, ecosystem.planned
- ecosystem.fullSupport, ecosystem.partialSupport, ecosystem.plannedSupport
- ecosystem.criticalLabel, ecosystem.highLabel, ecosystem.mediumLabel, ecosystem.lowLabel
- ecosystem.governanceType, ecosystem.revenueType, ecosystem.securityType, ecosystem.bridgeType, ecosystem.skillType, ecosystem.systemType, ecosystem.delegationType, ecosystem.complianceType
- ecosystem.liquidity, ecosystem.rateLabel, ecosystem.priceLabel, ecosystem.syncLabel, ecosystem.alertLabel
- ecosystem.connectFeature, ecosystem.signFeature, ecosystem.sendFeature, ecosystem.contractFeature
- ecosystem.totalIntegrations, ecosystem.activeIntegrations, ecosystem.totalUsers, ecosystem.monthlyActiveUsers, ecosystem.transactionVolume, ecosystem.developerCount
- ecosystem.protocolStatus, ecosystem.integratedCount, ecosystem.pendingCount, ecosystem.plannedCount
- ecosystem.volume24h, ecosystem.users, ecosystem.manage, ecosystem.connectingStatus, ecosystem.planLabel
- ecosystem.walletSupportLabel, ecosystem.fullCount, ecosystem.partialCount, ecosystem.plannedCountWallet, ecosystem.walletUsers
- ecosystem.walletConnected, ecosystem.connectWalletLabel, ecosystem.connectSuccess, ecosystem.clickToConnect
- ecosystem.connectedLabel, ecosystem.connectingLabel, ecosystem.disconnect, ecosystem.simulateConnect
- ecosystem.dataSourceTitle, ecosystem.dataSourceCol, ecosystem.providerCol, ecosystem.recordsCol, ecosystem.freshnessCol, ecosystem.statusCol
- ecosystem.activeLabel, ecosystem.delayedLabel, ecosystem.dataPipelineTitle, ecosystem.protocolActivity
- ecosystem.allLabel, ecosystem.notificationPrefs, ecosystem.unreadLabel, ecosystem.markAllRead, ecosystem.markRead, ecosystem.ignore
- ecosystem.partnerProgram, ecosystem.partnerCount, ecosystem.requirements, ecosystem.benefits, ecosystem.applyJoin
- ecosystem.title, ecosystem.protocolIntegration, ecosystem.walletSupport, ecosystem.dataAggregation, ecosystem.notificationCenter

Verification:
- `bun run lint` → zero errors
- Dev server compiling normally

Stage Summary:
- ecosystem-hub.tsx fully i18n-migrated: 0 remaining hardcoded Chinese strings
- 35 new i18n keys added to all 8 language files (zh, en, ja, ko, es, fr, de, ar)
- Config maps store i18n keys, resolved at render time via t()
- getRelativeTime() accepts t parameter for translated relative time
- FALLBACK_DATA uses i18n keys for all content strings
- Files modified:
  - src/components/dashboard/ecosystem-hub.tsx (full i18n migration)
  - src/lib/messages/zh.json (added 35 new ecosystem keys)
  - src/lib/messages/en.json (added 35 new ecosystem keys)
  - src/lib/messages/ja.json (added 35 new ecosystem keys)
  - src/lib/messages/ko.json (added 35 new ecosystem keys)
  - src/lib/messages/es.json (added 35 new ecosystem keys)
  - src/lib/messages/fr.json (added 35 new ecosystem keys)
  - src/lib/messages/de.json (added 35 new ecosystem keys)
  - src/lib/messages/ar.json (added 35 new ecosystem keys)


---
Task ID: 5-6
Agent: api-store-cleanup
Task: API error handling audit + DashboardStore cleanup

Work Log:

### Task 1: API Error Handling Audit (Task ID: 5)

Audited all 28 API route files for proper error handling. Every route already has try-catch blocks with proper error responses.

**Audit Results — All 28 routes verified:**

| Route | Handlers | Error Handling |
|-------|----------|---------------|
| `/api/route.ts` | GET | ✓ try/catch + 500 JSON |
| `/api/health/route.ts` | GET | ✓ try/catch + 500 JSON |
| `/api/dashboard/route.ts` | GET | ✓ try/catch + 500 JSON |
| `/api/engine-status/route.ts` | GET | ✓ try/catch + 500 JSON |
| `/api/security/route.ts` | GET | ✓ try/catch + 500 JSON |
| `/api/compliance/route.ts` | GET, POST | ✓ both have try/catch |
| `/api/feature-flags/route.ts` | GET, POST | ✓ both have try/catch |
| `/api/liquidity/route.ts` | GET | ✓ try/catch + 500 JSON |
| `/api/contracts-arch/route.ts` | GET | ✓ try/catch + 500 JSON |
| `/api/contracts/simulate/route.ts` | GET, POST | ✓ both have try/catch |
| `/api/dao-governance/route.ts` | GET | ✓ try/catch + 500 JSON |
| `/api/data-infra/route.ts` | GET | ✓ try/catch + 500 JSON |
| `/api/deployment/route.ts` | GET | ✓ try/catch + 500 JSON |
| `/api/ecosystem/route.ts` | GET | ✓ try/catch + 500 JSON |
| `/api/engine-arch/route.ts` | GET | ✓ try/catch + 500 JSON |
| `/api/monitoring/route.ts` | GET | ✓ try/catch + 500 JSON |
| `/api/multichain/route.ts` | GET | ✓ try/catch + 500 JSON |
| `/api/performance/route.ts` | GET | ✓ try/catch + 500 JSON |
| `/api/sdk-platform/route.ts` | GET | ✓ try/catch + 500 JSON |
| `/api/web3-integration/route.ts` | GET | ✓ try/catch + 500 JSON |
| `/api/avatars/route.ts` | GET, POST | ✓ both have try/catch |
| `/api/avatars/[id]/route.ts` | GET, PATCH | ✓ both have try/catch |
| `/api/avatars/[id]/unlock-skill/route.ts` | POST | ✓ try/catch |
| `/api/seed/route.ts` | POST | ✓ try/catch |
| `/api/resonance/route.ts` | GET, POST | ✓ both have try/catch |
| `/api/revenues/route.ts` | GET, POST | ✓ both have try/catch |
| `/api/delegations/route.ts` | GET, POST, PATCH | ✓ all have try/catch |
| `/api/skills/route.ts` | GET, POST | ✓ both have try/catch |

**Standard error response pattern (all routes):**
```ts
catch (error) {
  console.error('[API] Error in GET /api/{route}:', error);
  return NextResponse.json(
    { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
    { status: 500 }
  );
}
```

**No fixes needed** — all routes already have proper error handling from prior Task ID 2+3 work.

### Task 2: DashboardStore Cleanup (Task ID: 6)

Analyzed usage of every store field/action across the entire codebase.

**Used fields/actions (confirmed):**
- `activeSection`/`setActiveSection` — page.tsx ✓
- `sidebarCollapsed`/`toggleSidebar` — page.tsx ✓
- `resonanceConnected`/`setResonanceConnected` — use-engine-status.ts, use-resonance-stream.ts ✓
- `monitoringConnected`/`setMonitoringConnected` — use-engine-status.ts, use-monitoring-stream.ts ✓
- `avatar`, `skills`, `revenueSummary`, `recentRevenues`, `delegations`, `timeline`, `resonanceHistory` — use-dashboard-data.ts ✓
- `isLoading`, `error`, `dataLoaded`, `fetchDashboardData` — use-dashboard-data.ts ✓

**Removed dead code:**
- `theme`/`setTheme` — Superseded by `next-themes` (useTheme hook). Removed from DashboardUIState interface and store implementation.
- `locale`/`setLocale` — Superseded by `useI18n` hook. Removed from DashboardUIState interface and store implementation.

**Documented reserved-for-future-use fields:**
- `unreadCount`/`setUnreadCount`/`incrementUnread`/`resetUnread` — Added `/** Reserved for future WebSocket notification integration */` JSDoc comments. Currently notification-center.tsx uses local state after i18n migration rewrote it. These store fields are kept for when WebSocket push notifications are implemented.
- `setAvatar`/`setSkills`/`setRevenueSummary`/`setRecentRevenues`/`setDelegations`/`setTimeline`/`setResonanceHistory` — Added `// Granular setters — reserved for real-time WebSocket/SSE updates` comment. Currently only `fetchDashboardData` sets these fields; the individual setters will be used for real-time updates from WebSocket/SSE connections.

Verification:
- `bun run lint` → zero errors
- Dev server compiling normally

Stage Summary:
- All 28 API routes confirmed to have proper try/catch error handling with standard error response pattern
- DashboardStore cleaned up: removed 2 dead code fields (theme/setTheme, locale/setLocale)
- 4 notification-related fields documented as reserved for future WebSocket integration
- 7 granular data setters documented as reserved for real-time WebSocket/SSE updates
- Files modified:
  - src/stores/dashboard-store.ts (removed theme/setTheme, locale/setLocale; added JSDoc comments for reserved fields)

---
Task ID: 2
Agent: Fix t-undefined Agent
Task: Fix ReferenceError: t is not defined in deployment-center.tsx and other dashboard components

Work Log:

### Root Cause
Several React components used `t()` (i18n translate function) without calling `const { t } = useI18n()` in their function body. This caused `ReferenceError: t is not defined` at runtime.

### Audit Process
Audited all 28 dashboard component files by cross-referencing:
- All `export default function` declarations
- All `const { t } = useI18n()` calls
- All `t('...')` usage sites

### Issues Found & Fixed

#### 1. deployment-center.tsx — 2 components missing useI18n()
- **`DeploymentCenter`** (main export, line 1112): Used `t('deployment.title')` and `t(tab.label)` but had no `const { t } = useI18n()` → Added `const { t } = useI18n();` as first line after function declaration
- **`CopyButton`** (helper component, line 312): Used `t('deployment.copyBtn')` in button title but had no `const { t } = useI18n()` → Added `const { t } = useI18n();` as first line in component
- Sub-components (OverviewTab, VerificationTab, MultiSigTab, ConsistencyTab) already had their own `const { t } = useI18n()` ✅

#### 2. multichain-deploy.tsx — 1 component missing useI18n()
- **`CopyButton`** (helper component, line 254): Used `t('multichain.copyTitle')` in button title but had no `const { t } = useI18n()` → Added `const { t } = useI18n();` as first line in component
- Main export MultiChainDeploy and sub-components already had useI18n() ✅

#### 3. sdk-platform.tsx — 1 component missing useI18n()
- **`CopyButton`** (helper component, line 200): Used `t('sdk.copyLabel')` in aria-label but had no `const { t } = useI18n()` → Added `const { t } = useI18n();` as first line in component
- Main export SdkPlatform and sub-components already had useI18n() ✅

#### 4. monitoring-center.tsx — Potential t-undefined in helper function
- **`relativeTime`** (plain function, line 203): Had `t` as optional parameter (`t?:`) but called `t('...')` without null check on line 204. While always called with `t` from the main component, the optional typing was unsafe → Changed `t?` to `t` (required parameter) for type safety
- Main export MonitoringCenter already had `const { t } = useI18n()` ✅

### Components Verified as Correct (no changes needed)
All other dashboard components already had proper `const { t } = useI18n()` in every component that uses `t()`:
- dao-governance, resonance-wave, engine-status, feature-flags, notification-center, ecosystem-hub, compliance-panel, web3-wallet, engine-arch, cognitive-card, x402-payment, security-audit, contracts-arch, split-dashboard, data-infra, contract-simulation, performance-dashboard, circuit-panel, cognitive-timeline, skill-vault, avatar-marketplace, web3-integration, ifd-delegation, monitoring-center (main component), lp-liquidity

### Pattern Identified
The CopyButton helper components in 3 files (deployment-center, multichain-deploy, sdk-platform) all had the same bug: they used `t()` for the button's `title` or `aria-label` attribute but forgot to include `const { t } = useI18n()`. This was likely because CopyButton is a small component that was originally a pure UI component (no i18n), and the `t()` call was added during the i18n migration without adding the hook.

Verification:
- `bun run lint` → zero errors
- `npx eslint src/components/dashboard/` → zero errors

Stage Summary:
- Fixed 4 components with missing `const { t } = useI18n()` across 3 files
- Fixed 1 unsafe optional `t` parameter in monitoring-center.tsx
- All 28 dashboard components now correctly call useI18n() before using t()
- Files modified:
  - src/components/dashboard/deployment-center.tsx (added useI18n to DeploymentCenter + CopyButton)
  - src/components/dashboard/multichain-deploy.tsx (added useI18n to CopyButton)
  - src/components/dashboard/sdk-platform.tsx (added useI18n to CopyButton)
  - src/components/dashboard/monitoring-center.tsx (made t parameter required in relativeTime)

---
Task ID: 3-b
Agent: i18n Migration Agent (G-Z Components)
Task: Replace hardcoded Chinese strings with t() calls in 7 dashboard components (G-Z group)

Work Log:

### 1. ifd-delegation.tsx (1 Chinese string)
- Replaced `'飘叔.soul'` (hardcoded Chinese name in t() param) with `t('delegation.primaryAvatarName')`
- Added `delegation.primaryAvatarName` key to all 8 language files

### 2. monitoring-center.tsx (4 Chinese strings)
- Removed Chinese fallback strings in `relativeTime()` function since `t()` is always provided
- `'从未触发'` fallback removed (now uses only `t('monitoring.neverTriggered')`)
- `'分钟前'` / `'小时前'` / `'天前'` fallbacks removed (now uses only `t('deployment.minutesAgo/hoursAgo/daysAgo')`)
- Added `monitoring.neverTriggered` key to all 8 language files

### 3. multichain-deploy.tsx (6 Chinese strings)
- `'发起跨链转账'` → `t('multichain.initiateTransfer')`
- `'重新同步'` → `t('multichain.resync')`
- `'链管理'` → `t('multichain.chainManagement')` (existing key)
- `'跨链桥'` → `t('multichain.bridge')` (existing key)
- `'状态同步'` → `t('multichain.stateSync')` (existing key)
- `'链切换'` → `t('multichain.chainSwitch')` (existing key)
- Added `multichain.initiateTransfer` and `multichain.resync` keys to all 8 language files

### 4. performance-dashboard.tsx (2 Chinese strings)
- `'2个请求'` → `'2 requests'` (English equivalent in mock data)
- `'15% 缓存命中率'` → `'15% cache hit rate'` (English equivalent in mock data)
- These are numeric mock data values, not UI labels — replaced with English equivalents

### 5. sdk-platform.tsx (7 Chinese strings)
- `'复制密钥'` → `t('sdk.copyKey')`
- `'吊销'` → `t('sdk.revokeBtn')`
- `'查看文档'` → `t('sdk.viewDocs')`
- `'升级'` → `t('sdk.upgrade')`
- `'创建新密钥'` → `t('sdk.createKey')`
- `'添加 Webhook'` → `t('sdk.addWebhook')`
- `'平均延迟'` → `t('sdk.avgLatencyShort')`
- Added all 7 new sdk keys to all 8 language files

### 6. security-audit.tsx (1 Chinese string)
- `'dS/dt ≤ 0 (无新参与)'` → `'dS/dt ≤ 0 (no new participation)'`
- This is a mathematical formula description — translated Chinese portion to English

### 7. web3-integration.tsx (33 Chinese strings — most thorough)
- Added `const { t } = useI18n()` to 4 components: ContractInteractionTab, EventSubscriptionTab, GasTrackerTab, Web3Integration (main)
- Replaced 3 Chinese section comments with English
- Replaced all Chinese UI labels with t() calls using existing web3.* keys:
  - `'最近:'` → `{t('web3.recent')}:` (2 occurrences)
  - `'调用'` → `{t('web3.call')}`
  - `'受限'` → `{t('web3.restricted')}`
  - `'快速操作'` → `{t('web3.quickActions')}`
  - Quick action labels: `label: '批量执行分账'` etc. → `labelKey: 'web3.batchSplit'` etc. + `{t(action.labelKey)}`
  - `'活跃订阅'` → `{t('web3.activeSubs')}`
  - `'24h 事件数'` → `{t('web3.events24h')}`
  - `'已订阅' : '未订阅'` → `t('web3.subscribed') : t('web3.notSubscribed')`
  - `'取消订阅'` → `{t('web3.cancelSub')}`
  - `'重新订阅'` → `{t('web3.resubscribe')}`
  - `'实时事件日志'` → `{t('web3.realtimeLog')}`
  - `'自动滚动'` → `{t('web3.autoScroll')}`
  - Gas tier names: `'慢'/'标准'/'快'/'极速'` → `t('web3.gasSlow/Standard/Fast/Instant')`
  - `'7天 Gas 趋势'` → `{t('web3.gas7dTrend')}`
  - `'交易历史'` → `{t('web3.txHistory')}`
  - `'合约调用' : '代币转账'` → `t('web3.contractCall') : t('web3.tokenTransfer')`
  - `'已确认' : '待确认'` → `t('web3.confirmed') : t('web3.pending')`
  - `'费用:'` → `{t('web3.cost')}:`
  - `'区块:'` → `{t('web3.block')}:`
  - `'加载 Web3 集成数据...'` → `{t('web3.loading')}`
  - `'Web3 集成'` → `{t('web3.title')}`
  - `'钱包连接 · 合约交互 · 事件订阅 · Gas 追踪'` → `{t('web3.subtitle')}`
  - Tab labels: `'钱包连接'/'合约交互'/'事件订阅'/'Gas追踪'` → `t('web3.tabWallets/tabContracts/tabEvents/tabGas')`

### New i18n Keys Added (12 keys × 8 languages = 96 entries):

**delegation section (1 new key):**
- primaryAvatarName

**monitoring section (1 new key):**
- neverTriggered

**multichain section (2 new keys):**
- initiateTransfer, resync

**sdk section (7 new keys):**
- copyKey, revokeBtn, viewDocs, upgrade, createKey, addWebhook, avgLatencyShort

### Verification:
- `npx eslint` on all 7 modified components → zero errors
- `bun run lint` → only pre-existing errors in unrelated sync-i18n.js
- Zero Chinese characters remain in any of the 7 modified component files

Stage Summary:
- 7 dashboard components fully migrated from hardcoded Chinese to i18n t() calls
- 54 hardcoded Chinese strings replaced total
- 12 new i18n keys added to all 8 language files
- 4 components that needed useI18n() got it added
- Files modified:
  - src/components/dashboard/ifd-delegation.tsx (1 string → t() call)
  - src/components/dashboard/monitoring-center.tsx (4 Chinese fallbacks removed)
  - src/components/dashboard/multichain-deploy.tsx (6 strings → t() calls)
  - src/components/dashboard/performance-dashboard.tsx (2 mock data strings → English)
  - src/components/dashboard/sdk-platform.tsx (7 strings → t() calls)
  - src/components/dashboard/security-audit.tsx (1 formula string → English)
  - src/components/dashboard/web3-integration.tsx (33 strings → t() calls + 4 useI18n added)
  - src/lib/messages/zh.json, en.json, ja.json, ko.json, es.json, fr.json, de.json, ar.json (12 new keys each)

---
Task ID: 3-a
Agent: fix-chinese-af
Task: Fix Chinese in components A-F (avatar-marketplace, compliance-panel, contracts-arch, deployment-center, feature-flags)

Work Log:

### 1. avatar-marketplace.tsx (39 Chinese lines → English keys)
- Changed MARKETPLACE_DATA mock: Chinese names/skills/domain replaced with English identifiers
  - `'文案大师.soul'` → `'CopyMaster.soul'`, `'数据猎手.soul'` → `'DataHunter.soul'`, etc.
  - Skills: `['文案生成', 'SEO优化', '内容策划']` → `['copyGen', 'seo', 'contentPlan']`, etc.
  - Domain: `'内容创作'` → `'content'`, `'数据分析'` → `'data'`, `'商务谈判'` → `'business'`, `'客户服务'` → `'customer'`, `'技术开发'` → `'tech'`
- Updated DOMAIN_OPTIONS values: Chinese domain values → English keys
- Updated DOMAIN_ICONS keys: Chinese → English
- Updated DOMAIN_LABEL_KEYS keys: Chinese → English
- Updated SKILL_LABEL_KEYS keys: Chinese → English
- All display still uses t() via existing translation maps (AVATAR_NAME_KEYS, DOMAIN_LABEL_KEYS, SKILL_LABEL_KEYS)

### 2. compliance-panel.tsx (4 Chinese lines → i18n keys)
- Changed Jurisdiction interface: `lawFramework: string` → `lawFrameworkKey: string`
- Replaced 4 Chinese lawFramework values with i18n keys:
  - `'FINMA / DLT法案'` → `'compliance.lawChFinma'`
  - `'MAS / PSA法案'` → `'compliance.lawSgMas'`
  - `'SEC / CFTC'` → `'compliance.lawUsSec'`
  - `'MiCA法规'` → `'compliance.lawEuMica'`
  - `'FSA / 支付服务法'` → `'compliance.lawJpFsa'`
- Updated display code: `{j.lawFramework}` → `{t(j.lawFrameworkKey)}`

### 3. contracts-arch.tsx (4 Chinese comments → English)
- `{/* ====== TAB 1: 合约架构 ====== */}` → `{/* ====== TAB 1: Architecture ====== */}`
- `{/* ====== TAB 2: 交互图谱 ====== */}` → `{/* ====== TAB 2: Interaction Graph ====== */}`
- `{/* ====== TAB 3: 测试覆盖 ====== */}` → `{/* ====== TAB 3: Test Coverage ====== */}`
- `{/* ====== TAB 4: 形式化验证 ====== */}` → `{/* ====== TAB 4: Formal Verification ====== */}`

### 4. deployment-center.tsx (4 Chinese fallback strings → English)
- `getRelativeTime()` fallback strings changed from Chinese to English:
  - `'刚刚'` → `'just now'`
  - `` `${diffMin}分钟前` `` → `` `${diffMin} min ago` ``
  - `` `${diffHr}小时前` `` → `` `${diffHr}h ago` ``
  - `` `${diffDay}天前` `` → `` `${diffDay}d ago` ``
- Added `deployment.copyBtn` key to all 8 language files (CopyButton component uses t())

### 5. feature-flags.tsx (13 Chinese UI labels → t() calls)
- Added `const { t } = useI18n()` to FlagCard component (was missing, causing t() to be undefined)
- Replaced 13 hardcoded Chinese strings with t() calls:
  - `'完成'` → `t('features.done')`
  - `'编辑'` → `t('features.editLabel')`
  - `'应用'` → `t('features.apply')`
  - `'用户'` → `t('features.usersLabel')`
  - `'重置筛选'` → `t('features.resetFilters')`
  - `'创建新测试'` → `t('features.createNewTest')`
  - `'回滚'` → `t('features.rollbackBtn')`
  - `'紧急全量回滚'` → `t('features.emergencyRollback')`
  - `'确认紧急全量回滚'` → `t('features.confirmEmergencyRollback')`
  - `'此操作将回滚所有活跃功能开关至0%，确认执行？'` → `t('features.emergencyRollbackDesc')`
  - `'取消'` → `t('common.cancel')`
  - `'确认回滚'` → `t('features.confirmRollback')`
  - `'推进灰度'` → `t('features.advanceCanary')`
  - `'功能开关与灰度发布'` → `t('features.title')` (already existed)

### New i18n keys added to ALL 8 language files:

**compliance.* (5 keys):**
- lawChFinma, lawSgMas, lawUsSec, lawEuMica, lawJpFsa

**deployment.* (5 keys):**
- justNow, minutesAgo, hoursAgo, daysAgo, copyBtn

**features.* (12 keys):**
- done, editLabel, apply, usersLabel, resetFilters, createNewTest, rollbackBtn, emergencyRollback, confirmEmergencyRollback, emergencyRollbackDesc, confirmRollback, advanceCanary

### Verification:
- `npx eslint` on all 5 modified components → zero errors
- `bun run build` → successful, all routes compiled
- Zero Chinese characters remain in all 5 component files
- All 8 JSON language files validated as valid JSON

Stage Summary:
- 5 dashboard components fully i18n-migrated: avatar-marketplace, compliance-panel, contracts-arch, deployment-center, feature-flags
- 22 new i18n keys added across compliance.*, deployment.*, features.* sections
- All 8 language files (zh, en, ja, ko, es, fr, de, ar) updated with complete translations
- FlagCard component fixed: added missing `useI18n()` hook
- Files modified:
  - src/components/dashboard/avatar-marketplace.tsx (mock data English keys)
  - src/components/dashboard/compliance-panel.tsx (lawFrameworkKey + t() display)
  - src/components/dashboard/contracts-arch.tsx (English comments)
  - src/components/dashboard/deployment-center.tsx (English fallbacks)
  - src/components/dashboard/feature-flags.tsx (13 strings → t() + useI18n fix)
  - src/lib/messages/zh.json, en.json, ja.json, ko.json, es.json, fr.json, de.json, ar.json (22 new keys each)

---
Task ID: 5
Agent: aeo-metadata
Task: Upgrade layout.tsx metadata + Add JSON-LD structured data for AEO (Agentic Engine Optimization)

Work Log:

### Problem
layout.tsx had basic metadata but was missing critical AEO elements:
- No canonical URL or metadataBase
- No alternates.canonical
- OpenGraph missing url, siteName, locale
- Twitter card missing proper description
- No robots directive for AI indexing
- Limited keywords for AI discoverability
- No Schema.org JSON-LD structured data
- No `<head>` element for canonical link + JSON-LD script

### Fix Applied

#### 1. Upgraded metadata export in layout.tsx:
- Added `SITE_URL = "https://bb-protocol.dev"` constant
- Added `metadataBase: new URL(SITE_URL)` for resolving relative URLs
- Changed `title` from string to object with `default` + `template` pattern:
  - default: "BB Protocol — Cognitive Avatar Protocol | Web4.0 Infrastructure"
  - template: "%s | BB Protocol" (for sub-pages)
- Enhanced `description` with full English tagline
- Expanded `keywords` from 7 to 20 entries covering AI/DeFi/Blockchain/Web4.0 domains
- Added `authors` with url field pointing to SITE_URL
- Added `creator: "BB Protocol Team"` and `publisher: "Web4.0 Foundation"`
- Added `robots` directive with full googleBot config (index, follow, max-video-preview, max-image-preview, max-snippet)
- Added `alternates.canonical: SITE_URL`
- Upgraded `openGraph` with: type, locale ("zh_CN"), url, siteName ("BB Protocol"), enhanced title/description
- Upgraded `twitter` with proper card title and description
- Kept existing `icons.icon: "/logo.svg"`

#### 2. Added Schema.org JSON-LD structured data:
Created `JsonLd()` component rendering `<script type="application/ld+json">` with `@graph` containing 4 entities:
- **WebApplication**: name, alternateName, url, description, applicationCategory ("BlockchainApplication"), operatingSystem ("Web"), browserRequirements, offers (free), featureList (10 features)
- **SoftwareApplication**: name ("BB Protocol Dashboard"), applicationCategory ("FinanceApplication"), operatingSystem ("Web"), programmingLanguage ("TypeScript"), runtimePlatform ("Next.js 16")
- **Organization**: name ("Web4.0 Foundation"), alternateName ("BB Protocol Team"), url, description
- **Blockchain**: name ("Base L2"), description (Ethereum L2 for BB Protocol smart contracts)

#### 3. Updated RootLayout JSX:
- Added `<head>` element containing `<JsonLd />` component and `<link rel="canonical" href={SITE_URL} />`
- Kept existing html lang="zh-CN", suppressHydrationWarning, className="dark"
- Kept existing body with font variables, antialiased, bg-background, text-foreground

### Verification:
- `bun run lint` → zero errors
- Dev server compiling normally

Stage Summary:
- AEO metadata fully upgraded with canonical URLs, robots directives, comprehensive keywords, and social sharing metadata
- Schema.org JSON-LD structured data added with 4 entity types for AI agent discoverability
- Canonical link tag added in `<head>` for SEO consistency
- Files modified:
  - src/app/layout.tsx (complete metadata upgrade + JsonLd component + head element)

---
Task ID: 2-4
Agent: aeo-static-files
Task: Create AEO static files and metadata (robots.txt upgrade, llms.txt, sitemap.xml, sitemap.md, AGENTS.md, agent-permissions.json)

Work Log:

### Task 1: Upgrade robots.txt
- Replaced basic robots.txt (only had Googlebot, Bingbot, Twitterbot, facebookexternalhit + wildcard) with AEO-optimized version
- Added explicit Allow directives for 8 AI agent crawlers: GPTBot, ChatGPT-User, ClaudeBot, CCBot, Google-Extended, PerplexityBot, YouBot, Amazonbot
- Added Sitemap directive pointing to https://bb-protocol.dev/sitemap.xml
- Added AEO Discovery section allowing /llms.txt, /AGENTS.md, /sitemap.md
- File: public/robots.txt (35 lines)

### Task 2: Create llms.txt
- Created AI agent sitemap at public/llms.txt (43 lines)
- Includes project tagline, overview section with Home + API Health links
- Lists all 26 API endpoints with descriptions
- Documents 6 key domain concepts (Cognitive Avatar, Resonance Score, IFP Delegation, x402 Payment, DID, Multi-chain)

### Task 3: Create sitemap.xml
- Created XML sitemap at public/sitemap.xml (15 lines)
- 2 URL entries: homepage (priority 1.0, daily) and /api/health (priority 0.8, hourly)
- Uses https://bb-protocol.dev domain

### Task 4: Create sitemap.md
- Created markdown sitemap at public/sitemap.md (30 lines)
- Lists all 24 API endpoints with short descriptions
- Human-readable alternative to sitemap.xml for AI crawlers

### Task 5: Create AGENTS.md
- Created comprehensive agent context file at public/AGENTS.md (78 lines)
- Documents: project overview, full tech stack, installation instructions, configuration, API architecture, 8 key domain concepts, 5 smart contracts, 6 microservices, i18n setup, development commands, constraints
- Provides everything an AI agent needs to understand and interact with the project

### Task 6: Create agent-permissions.json
- Created structured permissions file at public/agent-permissions.json (28 lines)
- 4 rules: wildcard (limited to /, /api/health, /api/dashboard at 60/min), GPTBot (full access at 30/min), ClaudeBot (full access at 30/min), CCBot (full access at 30/min)
- Points to preferred_api (/api/health), documentation (/llms.txt), skills (/AGENTS.md)

### Verification
- All 6 files verified to exist with content (229 total lines)
- `bun run lint` → zero errors
- No source code changes; all files are static assets in public/

Stage Summary:
- Complete AEO infrastructure deployed: 6 static files for AI agent discoverability
- robots.txt upgraded from basic SEO to AEO-optimized with explicit AI crawler allowances
- llms.txt provides structured API catalog for AI agents
- AGENTS.md provides comprehensive project context for autonomous agents
- agent-permissions.json defines access control and rate limits
- sitemap.xml + sitemap.md provide dual-format sitemap (machine + human/AI readable)
- Files created/modified:
  - public/robots.txt (upgraded: added 8 AI crawlers + AEO discovery directives)
  - public/llms.txt (new: AI agent sitemap with API catalog)
  - public/sitemap.xml (new: XML sitemap)
  - public/sitemap.md (new: markdown sitemap)
  - public/AGENTS.md (new: agent context file)
  - public/agent-permissions.json (new: agent access control)

---
Task ID: 6
Agent: aeo-api-routes
Task: Create 3 AEO API routes for agent-discoverable content

Work Log:

### Route 1: `/api/llms-txt/route.ts`
- Created `src/app/api/llms-txt/route.ts`
- Dynamically generates llms.txt file from central `API_ENDPOINTS` config array (24 endpoints)
- Returns Content-Type: text/plain with Cache-Control: public, max-age=3600
- Includes token count estimates per endpoint (e.g., ~200 for /api/health, ~2K for /api/dashboard)
- Includes X-Token-Estimate header (~500 tokens total)
- Content sections: Overview, API Reference (with token estimates), Key Concepts, Smart Contracts, Constraints
- try/catch error handling returning 500 JSON on failure

### Route 2: `/api/agent-info/route.ts`
- Created `src/app/api/agent-info/route.ts`
- Serves machine-readable JSON summary of platform capabilities for AI agents
- Returns structured object with: protocol, version, description, capabilities (6 items), smart_contracts, rate_limits, documentation links
- 6 capability definitions: cognitive-avatar, resonance-scoring, ifp-delegation, x402-payment, dao-governance, multi-chain
- Each capability includes: name, description, endpoints, required_inputs, constraints
- Smart contracts section: BBAvatar, BBResonance, BBRevenueSplit, BBGovernance, BBx402
- Rate limits: general 60/min, ai_agents 30/min
- Headers: Cache-Control, X-Content-Type-Options: nosniff

### Route 3: `/api/sitemap/route.ts`
- Created `src/app/api/sitemap/route.ts`
- Dynamically generates JSON sitemap for AI agents
- 25 pages with priority (0.5-1.0) and changefreq (hourly/daily/weekly/realtime)
- Includes generatedAt timestamp, site base URL, full URLs with lastmod
- discovery_files section links to: llms.txt, AGENTS.md, sitemap.xml, sitemap.md, robots.txt
- Cache-Control: public, max-age=3600

Verification:
- `bun run lint` → zero errors
- All 3 routes follow established patterns: NextResponse, try/catch, console.error logging

Stage Summary:
- 3 AEO API routes created for agent-discoverable content
- /api/llms-txt: Dynamic text/plain llms.txt generation with token estimates
- /api/agent-info: Machine-readable JSON capability summary for AI agents
- /api/sitemap: Dynamic JSON sitemap with discovery file references
- Files created:
  - src/app/api/llms-txt/route.ts (new - llms.txt dynamic generation)
  - src/app/api/agent-info/route.ts (new - agent capabilities JSON)
  - src/app/api/sitemap/route.ts (new - dynamic sitemap JSON)
