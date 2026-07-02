# Task 1-c-1: i18n Migration for web3-wallet.tsx

## Summary
Replaced ALL hardcoded Chinese strings with `t()` calls in `src/components/dashboard/web3-wallet.tsx`.

## Changes Made

### web3-wallet.tsx
- Added `import { useI18n } from '@/hooks/use-i18n'` and `import type { TranslateFn } from '@/hooks/use-i18n'`
- `CONTRACTS_LIST.desc` → `CONTRACTS_LIST.descKey` (i18n key reference, resolved at render with `t('web3.' + contractInfo.descKey)`)
- `getRelativeTime(iso)` → `getRelativeTime(iso, t: TranslateFn)` — all call sites updated
- Added `const { t } = useI18n()` to: CopyBtn, WalletTab, ContractsTab, TransactionsTab, GasTrackerTab, Web3Wallet
- 50+ Chinese strings replaced with `t()` calls using existing `web3.*` keys

### Locale files (8 files updated)
- Updated `web3.minutesAgo`, `web3.hoursAgo`, `web3.daysAgo` to include `{count}` parameter for proper interpolation
- All other keys already existed — no new keys needed

## Verification
- `bun run lint` → zero errors
- Zero remaining Chinese characters in web3-wallet.tsx
