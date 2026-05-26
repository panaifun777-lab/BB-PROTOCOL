# Task 1-a-1-v2: i18n migration for contract-simulation.tsx

## Summary
Migrated all Chinese text in `src/components/dashboard/contract-simulation.tsx` to i18n key strings with `useI18n` hook, and added `simulation.*` keys to all 8 language files.

## Changes Made

### Component File (`src/components/dashboard/contract-simulation.tsx`)
1. **Added import**: `import { useI18n } from '@/hooks/use-i18n';`
2. **Added hook call**: `const { t } = useI18n();` at the top of `ContractSimulation` component
3. **CONTRACTS array descriptions** (module-level): Changed from Chinese strings to i18n key strings:
   - `'认知身份核心合约'` → `'simulation.descAvatarCore'`
   - `'动态分账合约'` → `'simulation.descDynamicSplitter'`
   - `'认知熔断合约'` → `'simulation.descCircuitGuard'`
   - `'技能库合约'` → `'simulation.descSkillVault'`
   - `'流体民主路由合约'` → `'simulation.descIfdRouter'`
   - `'代币金库合约'` → `'simulation.descTokenVault'`
4. **Contract description rendering**: Changed `{contract.description}` → `{t(contract.description)}`
5. **Tips array**: Changed 5 Chinese tip strings to i18n key strings (`simulation.tipHighGas`, etc.)
6. **Tips rendering**: Changed `{tip}` → `{t(tip)}`
7. **All inline Chinese in JSX**: Replaced with `t()` calls (54 total keys)
8. **Preserved `suppressHydrationWarning`** where present

### Language Files (8 files)
Added `"simulation"` section with all 54 keys to:
- `src/lib/messages/zh.json`
- `src/lib/messages/en.json`
- `src/lib/messages/ja.json`
- `src/lib/messages/ko.json`
- `src/lib/messages/es.json`
- `src/lib/messages/fr.json`
- `src/lib/messages/de.json`
- `src/lib/messages/ar.json`

### Key Design Decisions
- Module-level CONTRACTS array stores i18n **key strings** (not `t()` calls) to avoid calling hooks at module level
- `t(contract.description)` pattern resolves the key at render time inside the component
- Same pattern for tips: keys stored in array, `t(tip)` called at render time
- `paramCount` uses `{count}` interpolation: `t('simulation.paramCount', { count: selectedFunction.inputs.length })`
- `simHistory` uses `{count}` interpolation: `t('simulation.simHistory', { count: history.length })`

### Lint Status
- `bun run lint` passes with exit code 0
- No errors related to this migration
