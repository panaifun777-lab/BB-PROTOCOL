# Task 1-a-3: i18n Migration for dao-governance.tsx

## Summary
Replaced ALL 89 hardcoded Chinese strings in `src/components/dashboard/dao-governance.tsx` with `t()` i18n calls.

## Changes Made

### Component File
- **src/components/dashboard/dao-governance.tsx**
  - Added `import { useI18n } from '@/hooks/use-i18n'` and `import type { TranslateFn } from '@/hooks/use-i18n'`
  - Added `const { t } = useI18n()` in DAOGovernance component
  - Refactored 5 helper functions to accept `t: TranslateFn` as first param: `getTimeRemaining`, `getTimeAgo`, `getCategoryLabel`, `getStatusLabel`, `getRiskLabel`
  - Updated ProposalCard and VotingChartTooltip to accept `t` as prop
  - Replaced 89 Chinese strings with t() calls using existing `dao.*` and `common.*` keys
  - Added `t` to treasuryPieData useMemo dependency

### Language Files
- All 8 files updated with new key `dao.statusVoting`
  - zh: "投票中", en: "Voting", ja: "投票中", ko: "투표 중"
  - es: "Votando", fr: "Vote en cours", de: "Abstimmung", ar: "التصويت"

## Verification
- `bun run lint` → zero errors
- No Chinese characters remaining in the file
- Dev server compiling normally
