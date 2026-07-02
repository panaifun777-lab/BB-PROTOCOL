# Task 1-b-3: i18n Migration for engine-arch.tsx

## Summary
Replaced ALL hardcoded Chinese strings with `t()` calls in `src/components/dashboard/engine-arch.tsx`.

## Changes Made

### File: `src/components/dashboard/engine-arch.tsx`

1. **Added import**: `import { useI18n } from '@/hooks/use-i18n';`

2. **Added `const { t } = useI18n();`** to 4 components:
   - `CopyButton`
   - `ModuleCard`
   - `DataFlowDiagram`
   - `EngineArch`

3. **Replaced 35+ Chinese strings** with `t()` calls using existing `engine.*` i18n keys:
   - aria-label="复制" → aria-label={t('engine.copy')}
   - 延迟 → {t('engine.latency')}
   - 吞吐 → {t('engine.throughput')}
   - 内存 → {t('engine.memory')}
   - 测试: → {t('engine.testLabel')}
   - 通过 → {t('engine.passing')}
   - 函数列表 → {t('engine.functionList')}
   - 收起数学模型/查看数学模型 → t('engine.collapseMathModel')/t('engine.viewMathModel')
   - 数学模型 → {t('engine.mathModel')}
   - 符号/名称/值/描述 → t('engine.symbol/name/value/description')
   - 数据流拓扑 → {t('engine.dataFlowTopology')}
   - 加载 Rust 引擎架构数据... → {t('engine.loadingData')}
   - 模块/函数/测试/平均延迟 → t('engine.modules/functions/tests/avgLatency')
   - 该分类暂无模块 → {t('engine.noModulesInCategory')}
   - 总代码量/CPU 使用/内存占用/运行时间 → t('engine.totalLoc/cpuUsage/memoryUsageLabel/uptime')
   - 当前/总计/可用性 → t('engine.cpuCurrent/memoryTotal/availability')
   - 数据流详情 → {t('engine.dataFlowDetails')}
   - {count} 条 → t('engine.flowCount', { count })
   - 最快操作/最慢操作/平均 P99 → t('engine.fastestOp/slowestOp/avgP99')
   - 性能基准标题 → {t('engine.benchmarkTitle')}
   - 操作/单位 → t('engine.operation/unit')
   - IFD 权重函数 λ 向量 → {t('engine.ifdWeightVector')}
   - Σλ = X (权重归一化) → t('engine.weightNormalization', { sum })
   - AFC 代币经济 → {t('engine.afcTokenomics')}
   - 燃烧率/月燃烧量递增/回购率/金库回购比例/价值捕获率 → t('engine.burnRate/monthlyBurnIncrease/buybackRate/vaultBuybackRatio/valueCaptureRate')
   - Rust 引擎架构 → {t('engine.rustEngine')}
   - 引擎副标题 → {t('engine.engineSubtitle')}
   - Tab labels → t('engine.engineModules/dataFlow/performanceBenchmark/mathModels')

### No new i18n keys needed
All keys already existed in the `engine.*` section of all 8 language files.

## Verification
- `bun run lint` → zero errors
- No remaining Chinese characters in the file
- No layout, styling, or logic changes
