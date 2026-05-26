# Task 1-a-2-retry: Replace hardcoded Chinese strings with t() calls in contracts-arch.tsx

## Summary
Successfully replaced ALL hardcoded Chinese strings in `src/components/dashboard/contracts-arch.tsx` with `t()` i18n calls.

## Changes Made

### 1. Added i18n import and hook
- Added `import { useI18n } from '@/hooks/use-i18n';` (line 37)
- Added `const { t } = useI18n();` inside the `ContractsArch` component (line 207)

### 2. Module-level constant: CATEGORY_LABELS → CATEGORY_LABEL_KEYS
- Renamed `CATEGORY_LABELS` to `CATEGORY_LABEL_KEYS` (line 145)
- Changed values from Chinese strings to i18n key strings:
  - `core: '核心'` → `core: 'contracts.coreContracts'`
  - `economics: '经济'` → `economics: 'contracts.economicsContracts'`
  - `security: '安全'` → `security: 'contracts.securityContracts'`
  - `governance: '治理'` → `governance: 'contracts.governanceContracts'`
- At render time, resolved with `t(CATEGORY_LABEL_KEYS[cat])` and `t(CATEGORY_LABEL_KEYS[contract.category])`

### 3. All hardcoded Chinese strings replaced with t() calls
Over 60 Chinese strings replaced, including:
- **Loading state**: `加载合约架构数据...` → `t('contracts.loadingData')`
- **Title/subtitle**: `Solidity 合约架构` → `t('contracts.solidityContracts')`, `7个核心合约...` → `t('contracts.subtitle')`
- **Tab labels**: `合约架构` → `t('contracts.architectureTab')`, `交互图谱` → `t('contracts.interactionsTab')`, `测试覆盖` → `t('contracts.coverageTab')`, `形式化验证` → `t('contracts.verificationTab')`
- **Overview stats**: `总合约`, `已部署`, `代码行数`, `平均覆盖` → `t('contracts.totalContracts')`, `t('contracts.deployed')`, `t('contracts.linesOfCode')`, `t('contracts.avgCoverage')`
- **Category filter**: `分类:` → `t('contracts.category')`, `全部` → `t('common.all')`
- **Deployed status**: `已部署`/`未部署` → `t('contracts.deployed')`/`t('contracts.notDeployed')`
- **Labels**: `继承:`, `安全模式:`, `事件:`, `状态变量:` → t() calls
- **Expand/collapse**: `收起函数`, `查看函数` → t() calls
- **Table headers**: `函数`, `可见性`, `类型`, `合约`, `工具`, `状态`, `不变量`, `反例`, `发现`, `高危`, `成本`, `优化`, `最后运行` → t() calls
- **Interaction section**: `合约交互图`, `交互列表`, `调用`, `数据源`, `依赖矩阵`, `有依赖`, `自身`, `无依赖` → t() calls
- **Coverage section**: All gauge labels, test summary labels → t() calls
- **Fuzz test section**: `Fuzz 测试`, `运行次数`, `最大CPU时间`, `已验证不变量` → t() calls
- **Invariant tests**: `不变量测试`, `通过`/`失败`, `反例:` → t() calls
- **Gas report**: `Gas 报告`, column headers → t() calls
- **Verification section**: `Certora验证`, `Slither通过`, `验证工具`, `不变量总数`, `验证结果`, `已验证`/`已通过`/`未通过`, `Slither 静态分析`, `无发现`, `综合安全评分`, `高危发现`, `不变量通过`, `低危发现` → t() calls
- **Parameterized strings**: Used `t('key', { count: value })` pattern for strings with dynamic values
- **Chart tooltip**: `覆盖率` → `t('contracts.coverageRate')`

### 4. No new i18n keys needed
All required keys already existed in the `contracts` section across all 8 language files (zh, en, ja, ko, es, fr, de, ar).

### 5. Remaining Chinese text
Only code comments remain in Chinese (lines 339, 633, 821, 1050), which is acceptable as comments are not user-facing.

## Verification
- `bun run lint` passed with no errors
- No dev server errors related to contracts-arch.tsx
- All i18n keys verified to exist in all 8 language files
