# Task 3: Zustand + i18n + Web3Store Integration

## Agent: Full-Stack Developer

## Task Summary
Fully integrate Zustand stores + i18n + Web3Store into page.tsx

## Work Completed

### 1. Added Imports
- `import { useI18n } from '@/hooks/use-i18n';`
- `import { useWeb3Store } from '@/stores/web3-store';`

### 2. Converted NAV_ITEMS (23 items) from `label` to `navKey`
All navigation items now use i18n keys instead of hardcoded Chinese text:
- overview → nav.overview, revenue → nav.split, resonance → nav.resonance, etc.
- Render: `{t(item.navKey)}` instead of `{item.label}`

### 3. Converted MOBILE_NAV (4 items) similarly

### 4. Connected useWeb3Store to Web3ConnectButton
- Replaced mock `0x7a3f...e9b2` with real store data
- Shows truncated address when connected, "Connect" when disconnected
- Removed unused `useState` for `showConnect`

### 5. Replaced ALL hardcoded Chinese text with t() calls
- "认知分身协议" → `t('dashboard.title')`
- "Phase 6" → `t('dashboard.phase') + ' 6'`
- "x402 支付" → `t('nav.payment')`
- "当前方案" → `t('dashboard.currentPlan')`
- "3 个分身 · 优先算力" → `t('dashboard.avatarsCount', { count: 3 })`
- "正在加载认知分身系统..." → `t('dashboard.loadingSystem')`
- Footer → `t('dashboard.footer')` and `t('dashboard.migration')`

### 6. Added `const { t } = useI18n();` inside Home component

## Verification
- ESLint on page.tsx: zero errors
- Dev Server compilation: successful, no errors
- All existing functionality preserved (layout, animations, components, mock data)
