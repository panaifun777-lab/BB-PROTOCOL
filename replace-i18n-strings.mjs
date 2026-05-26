#!/usr/bin/env node
// Script to replace hardcoded Chinese strings with t() calls in 3 dashboard components
import { readFileSync, writeFileSync } from 'fs';

const BASE = 'src/components/dashboard';

// ============================================================
// 1. performance-dashboard.tsx
// ============================================================
let perf = readFileSync(`${BASE}/performance-dashboard.tsx`, 'utf8');

// Add useI18n import
perf = perf.replace(
  "import { cn } from '@/lib/utils';",
  "import { cn } from '@/lib/utils';\nimport { useI18n } from '@/hooks/use-i18n';"
);

// Add useI18n to PerformanceScoreGauge
perf = perf.replace(
  'function PerformanceScoreGauge({ score }: { score: number }) {',
  'function PerformanceScoreGauge({ score }: { score: number }) {\n  const { t } = useI18n();'
);
// Replace score labels in PerformanceScoreGauge
perf = perf.replace(
  "{score >= 90 ? '性能等级: 优秀' : score >= 70 ? '性能等级: 良好' : '性能等级: 需优化'}",
  "{score >= 90 ? t('performance.scoreExcellent') : score >= 70 ? t('performance.scoreGood') : t('performance.scoreNeedsOptimization')}"
);

// Add useI18n to RadialGauge
perf = perf.replace(
  'function RadialGauge({ metric, sparkline }: { metric: PerformanceMetric; sparkline: SparklinePoint[] }) {',
  'function RadialGauge({ metric, sparkline }: { metric: PerformanceMetric; sparkline: SparklinePoint[] }) {\n  const { t } = useI18n();'
);
// Replace target label in RadialGauge
perf = perf.replace(
  '<p className="text-[9px] text-slate-500">目标: {displayTarget}</p>',
  "<p className=\"text-[9px] text-slate-500\">{t('performance.target')}: {displayTarget}</p>"
);

// Add useI18n to LazyModuleRow
perf = perf.replace(
  'function LazyModuleRow({ module: mod, onToggle }: { module: LazyLoadingModule; onToggle: (id: string) => void }) {',
  'function LazyModuleRow({ module: mod, onToggle }: { module: LazyLoadingModule; onToggle: (id: string) => void }) {\n  const { t } = useI18n();'
);
// Replace priority text usage - change PRIORITY_CONFIG text references
perf = perf.replace(
  '{prioConf.text}',
  "{t(`performance.priority${mod.priority.charAt(0).toUpperCase() + mod.priority.slice(1)}`)}"
);
// Replace loaded/lazy badge
perf = perf.replace(
  "{mod.loaded ? '已加载' : '懒加载'}",
  "{mod.loaded ? t('performance.loaded') : t('performance.lazyLoad')}"
);

// Add useI18n to BudgetBar
perf = perf.replace(
  'function BudgetBar({ item }: { item: BudgetItem }) {',
  'function BudgetBar({ item }: { item: BudgetItem }) {\n  const { t } = useI18n();'
);
// Replace percentUsed
perf = perf.replace(
  '{pct.toFixed(1)}% 已用',
  "{pct.toFixed(1)}% {t('performance.percentUsed')}"
);
// Replace overBudget
perf = perf.replace(
  "⚠ 超出预算",
  "⚠ {t('performance.overBudget')}"
);
// Replace nearLimit
perf = perf.replace(
  "⚠ 接近上限",
  "⚠ {t('performance.nearLimit')}"
);

// Add useI18n to CacheTrendTooltip
perf = perf.replace(
  'function CacheTrendTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {',
  'function CacheTrendTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {\n  const { t } = useI18n();'
);
// Replace hitRate label in tooltip
perf = perf.replace(
  '命中率: {payload[0].value}%',
  "{t('performance.hitRateLabel')}: {payload[0].value}%"
);

// Add useI18n to main PerformanceDashboard component
perf = perf.replace(
  'export default function PerformanceDashboard() {',
  'export default function PerformanceDashboard() {\n  const { t } = useI18n();'
);

// Replace TABS labels - use t() at render time
perf = perf.replace(
  "const TABS: TabConfig[] = [\n  { id: 'vitals', label: 'Web Vitals', icon: Gauge },\n  { id: 'cache', label: '缓存策略', icon: Database },\n  { id: 'lazy', label: '懒加载', icon: Layers },\n  { id: 'budget', label: '性能预算', icon: BarChart3 },\n];",
  `const TABS: TabConfig[] = [
  { id: 'vitals', label: 'Web Vitals', icon: Gauge },
  { id: 'cache', label: 'performance.cacheStrategy', icon: Database },
  { id: 'lazy', label: 'performance.lazyLoading', icon: Layers },
  { id: 'budget', label: 'performance.performanceBudget', icon: BarChart3 },
];`
);
// Now update tab rendering to use t() for non-WebVitals tabs
perf = perf.replace(
  '{TABS.map((tab) => (',
  '{TABS.map((tab) => ('
);

// Replace PRIORITY_CONFIG text values with keys
perf = perf.replace(
  "critical: { color: 'text-red-400', bg: 'bg-red-500/10', badge: 'bg-red-500/20 text-red-300 border-red-500/30', text: '关键' },",
  "critical: { color: 'text-red-400', bg: 'bg-red-500/10', badge: 'bg-red-500/20 text-red-300 border-red-500/30', text: 'performance.priorityCritical' },"
);
perf = perf.replace(
  "high: { color: 'text-orange-400', bg: 'bg-orange-500/10', badge: 'bg-orange-500/20 text-orange-300 border-orange-500/30', text: '高' },",
  "high: { color: 'text-orange-400', bg: 'bg-orange-500/10', badge: 'bg-orange-500/20 text-orange-300 border-orange-500/30', text: 'performance.priorityHigh' },"
);
perf = perf.replace(
  "medium: { color: 'text-amber-400', bg: 'bg-amber-500/10', badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30', text: '中' },",
  "medium: { color: 'text-amber-400', bg: 'bg-amber-500/10', badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30', text: 'performance.priorityMedium' },"
);
perf = perf.replace(
  "low: { color: 'text-sky-400', bg: 'bg-sky-500/10', badge: 'bg-sky-500/20 text-sky-300 border-sky-500/30', text: '低' },",
  "low: { color: 'text-sky-400', bg: 'bg-sky-500/10', badge: 'bg-sky-500/20 text-sky-300 border-sky-500/30', text: 'performance.priorityLow' },"
);

// Replace mock data cache strategy names with i18n keys
perf = perf.replace(
  "{ id: 'cs_1', name: 'SSR 页面缓存',",
  "{ id: 'cs_1', name: 'performance.ssrPageCache',"
);
perf = perf.replace(
  "{ id: 'cs_2', name: 'API 响应缓存',",
  "{ id: 'cs_2', name: 'performance.apiResponseCache',"
);
perf = perf.replace(
  "{ id: 'cs_3', name: '静态资源缓存',",
  "{ id: 'cs_3', name: 'performance.staticAssetCache',"
);
perf = perf.replace(
  "{ id: 'cs_4', name: 'ISR 增量缓存',",
  "{ id: 'cs_4', name: 'performance.isrIncrementalCache',"
);
perf = perf.replace(
  "{ id: 'cs_5', name: 'CDN 边缘缓存',",
  "{ id: 'cs_5', name: 'performance.cdnEdgeCache',"
);
// Replace ttlLabel '1年'
perf = perf.replace(
  "ttlLabel: '1年'",
  "ttlLabel: 'performance.oneYear'"
);
// Replace bandwidthSaved mock data
perf = perf.replace(
  "bandwidthSaved: '847GB/月'",
  "bandwidthSaved: '847GB'"
);
// Replace cdnBandwidthSaved in MOCK_DATA
perf = perf.replace(
  "cdnBandwidthSaved: '847GB/月',",
  "cdnBandwidthSaved: '847GB',"
);

// Replace recommendation mock data titles and descriptions
perf = perf.replace(
  "{ id: 'rec_1', title: '延迟加载非关键字体',",
  "{ id: 'rec_1', title: 'performance.rec1Title',"
);
perf = perf.replace(
  "description: '将非首屏字体改为font-display:swap，减少初始阻塞资源' },",
  "description: 'performance.rec1Desc' },"
);
perf = perf.replace(
  "{ id: 'rec_2', title: '启用图片AVIF格式',",
  "{ id: 'rec_2', title: 'performance.rec2Title',"
);
perf = perf.replace(
  "description: '将WebP图片升级为AVIF格式，可进一步减少30%体积' },",
  "description: 'performance.rec2Desc' },"
);
perf = perf.replace(
  "{ id: 'rec_3', title: '预连接第三方域名',",
  "{ id: 'rec_3', title: 'performance.rec3Title',"
);
perf = perf.replace(
  "description: '添加dns-prefetch和preconnect提示，加速第三方资源加载' },",
  "description: 'performance.rec3Desc' },"
);
perf = perf.replace(
  "{ id: 'rec_4', title: '合并小请求为HTTP/2多路复用',",
  "{ id: 'rec_4', title: 'performance.rec4Title',"
);
perf = perf.replace(
  "description: '将3个第三方请求合并为1个，减少连接开销' },",
  "description: 'performance.rec4Desc' },"
);
perf = perf.replace(
  "{ id: 'rec_5', title: 'ISR缓存TTL优化',",
  "{ id: 'rec_5', title: 'performance.rec5Title',"
);
perf = perf.replace(
  "description: '将ISR revalidate从60s调整为120s，提高缓存效率' },",
  "description: 'performance.rec5Desc' },"
);
// estimated savings
perf = perf.replace(
  "estimatedSavings: '25KB / 图片'",
  "estimatedSavings: '25KB / img'"
);

// Replace alert mock data
perf = perf.replace(
  "{ id: 'alert_1', title: 'JS Bundle 接近预算上限',",
  "{ id: 'alert_1', title: 'performance.alert1Title',"
);
perf = perf.replace(
  "description: 'JS Bundle已达142KB/150KB (94.7%)，建议关注新增依赖体积',",
  "description: 'performance.alert1Desc',"
);
perf = perf.replace(
  "{ id: 'alert_2', title: 'ISR缓存命中率下降',",
  "{ id: 'alert_2', title: 'performance.alert2Title',"
);
perf = perf.replace(
  "description: 'ISR缓存命中率从82%降至78%，可能需要调整revalidate间隔',",
  "description: 'performance.alert2Desc',"
);

// Replace pie chart data names  
perf = perf.replace(
  "{ name: '已加载模块', value:",
  "{ name: 'performance.loadedModules', value:"
);
perf = perf.replace(
  "{ name: '懒加载模块', value:",
  "{ name: 'performance.lazyModules', value:"
);

// Replace inline JSX strings in renderVitals
perf = perf.replace(
  '<span className="text-xs font-semibold text-slate-200">JS Bundle 大小</span>',
  "<span className=\"text-xs font-semibold text-slate-200\">{t('performance.jsBundleSize')}</span>"
);
perf = perf.replace(
  '⚠ 已使用 {(data.jsBundleSize / data.jsBundleBudget * 100).toFixed(1)}%，接近预算上限',
  "⚠ {t('performance.usedNearBudget')} {(data.jsBundleSize / data.jsBundleBudget * 100).toFixed(1)}%"
);
perf = perf.replace(
  '<p className="text-[9px] text-slate-500 mt-0.5">缓存命中率</p>',
  "<p className=\"text-[9px] text-slate-500 mt-0.5\">{t('performance.cacheHitRateLabel')}</p>"
);
perf = perf.replace(
  '<p className="text-[9px] text-slate-500 mt-0.5">CDN节省</p>',
  "<p className=\"text-[9px] text-slate-500 mt-0.5\">{t('performance.cdnSaved')}</p>"
);
perf = perf.replace(
  '<p className="text-[9px] text-slate-500 mt-0.5">图片优化率</p>',
  "<p className=\"text-[9px] text-slate-500 mt-0.5\">{t('performance.imageOptimizationRate')}</p>"
);
perf = perf.replace(
  '<h4 className="text-xs font-semibold text-slate-200">性能趋势 (最近7天)</h4>',
  "<h4 className=\"text-xs font-semibold text-slate-200\">{t('performance.perfTrend7d')}</h4>"
);

// Replace inline strings in renderCache
perf = perf.replace(
  '<h4 className="text-xs font-semibold text-slate-200">缓存命中率趋势 (24h)</h4>',
  "<h4 className=\"text-xs font-semibold text-slate-200\">{t('performance.cacheHitTrend24h')}</h4>"
);
perf = perf.replace(
  '<h4 className="text-xs font-semibold text-slate-200">CDN 配置</h4>',
  "<h4 className=\"text-xs font-semibold text-slate-200\">{t('performance.cdnConfigTitle')}</h4>"
);
perf = perf.replace(
  '<span className="text-slate-400">提供商</span>',
  "<span className=\"text-slate-400\">{t('performance.provider')}</span>"
);
perf = perf.replace(
  '<span className="text-slate-400">边缘节点</span>',
  "<span className=\"text-slate-400\">{t('performance.edgeNodes')}</span>"
);
perf = perf.replace(
  '<span className="text-slate-400">缓存命中率</span><span className="text-emerald-400 font-medium">{data.cdnConfig.cacheHitRate}%</span>',
  "<span className=\"text-slate-400\">{t('performance.hitRateLabel')}</span><span className=\"text-emerald-400 font-medium\">{data.cdnConfig.cacheHitRate}%</span>"
);
perf = perf.replace(
  '<span className="text-slate-400">带宽节省</span>',
  "<span className=\"text-slate-400\">{t('performance.bandwidthSaved')}</span>"
);
perf = perf.replace(
  "{data.cdnConfig.http2 ? '✓ 已启用' : '✗ 未启用'}",
  "{data.cdnConfig.http2 ? t('performance.enabledMark') : t('performance.notEnabledMark')}"
);
perf = perf.replace(
  "{data.cdnConfig.brotli ? '✓ 已启用' : '✗ 未启用'}",
  "{data.cdnConfig.brotli ? t('performance.enabledMark') : t('performance.notEnabledMark')}"
);
perf = perf.replace(
  '<h4 className="text-xs font-semibold text-slate-200">缓存效率总结</h4>',
  "<h4 className=\"text-xs font-semibold text-slate-200\">{t('performance.cacheEfficiency')}</h4>"
);
perf = perf.replace(
  '<span className="text-slate-400">平均命中率</span>',
  "<span className=\"text-slate-400\">{t('performance.avgHitRate')}</span>"
);
perf = perf.replace(
  '<span className="text-slate-400">CDN边缘命中率</span>',
  "<span className=\"text-slate-400\">{t('performance.cdnEdgeHitRate')}</span>"
);
perf = perf.replace(
  '<span className="text-slate-400">总缓存条目</span>',
  "<span className=\"text-slate-400\">{t('performance.totalCacheEntries')}</span>"
);
perf = perf.replace(
  '<span className="text-slate-400">缓存总大小</span>',
  "<span className=\"text-slate-400\">{t('performance.totalCacheSize')}</span>"
);
// Purge cache button
perf = perf.replace(
  '清除缓存\n        </Button>',
  "{t('performance.purgeCache')}\n        </Button>"
);
perf = perf.replace(
  '<CheckCircle className="size-3" /> 缓存已清除 (模拟)',
  "<CheckCircle className=\"size-3\" /> {t('performance.cachePurged')}"
);

// Replace inline strings in renderLazy
perf = perf.replace(
  '<h4 className="text-xs font-semibold text-slate-200">Bundle 组成</h4>',
  "<h4 className=\"text-xs font-semibold text-slate-200\">{t('performance.bundleComposition')}</h4>"
);
perf = perf.replace(
  '<span className="text-slate-400">已加载</span>',
  "<span className=\"text-slate-400\">{t('performance.loaded')}</span>"
);
perf = perf.replace(
  '<span className="text-slate-400">懒加载</span>',
  "<span className=\"text-slate-400\">{t('performance.lazyLoad')}</span>"
);
perf = perf.replace(
  '<h4 className="text-xs font-semibold text-slate-200">Bundle 对比</h4>',
  "<h4 className=\"text-xs font-semibold text-slate-200\">{t('performance.bundleComparison')}</h4>"
);
perf = perf.replace(
  '<span className="text-slate-400">初始加载</span>',
  "<span className=\"text-slate-400\">{t('performance.initialLoad')}</span>"
);
perf = perf.replace(
  '<span className="text-slate-400">全量加载</span>',
  "<span className=\"text-slate-400\">{t('performance.fullLoad')}</span>"
);
perf = perf.replace(
  '懒加载节省 <span',
  "{t('performance.lazySaved')} <span"
);
perf = perf.replace(
  '<h5 className="text-[10px] font-medium text-slate-400 mb-2">关键加载路径</h5>',
  "<h5 className=\"text-[10px] font-medium text-slate-400 mb-2\">{t('performance.criticalLoadPath')}</h5>"
);
perf = perf.replace(
  '<h5 className="text-[10px] font-medium text-slate-400 mt-2 mb-2">懒加载路径</h5>',
  "<h5 className=\"text-[10px] font-medium text-slate-400 mt-2 mb-2\">{t('performance.lazyLoadPath')}</h5>"
);
perf = perf.replace(
  '<h4 className="text-xs font-semibold text-slate-200">模块加载状态</h4>',
  "<h4 className=\"text-xs font-semibold text-slate-200\">{t('performance.moduleLoadStatus')}</h4>"
);
perf = perf.replace(
  '<span className="text-[10px] text-slate-500">点击切换加载状态</span>',
  "<span className=\"text-[10px] text-slate-500\">{t('performance.clickToToggle')}</span>"
);

// Replace inline strings in renderBudget
perf = perf.replace(
  '<h4 className="text-xs font-semibold text-slate-200">预算 vs 实际</h4>',
  "<h4 className=\"text-xs font-semibold text-slate-200\">{t('performance.budgetVsActual')}</h4>"
);
perf = perf.replace(
  '<h4 className="text-xs font-semibold text-slate-200">请求分析</h4>',
  "<h4 className=\"text-xs font-semibold text-slate-200\">{t('performance.requestAnalysis')}</h4>"
);
perf = perf.replace(
  '<span className="text-xs text-slate-300">首方请求</span>',
  "<span className=\"text-xs text-slate-300\">{t('performance.firstPartyRequests')}</span>"
);
perf = perf.replace(
  '<span className="text-xs text-slate-300">第三方请求</span>',
  "<span className=\"text-xs text-slate-300\">{t('performance.thirdPartyRequests')}</span>"
);
perf = perf.replace(
  '<span className="text-xs text-slate-400">总请求数</span>',
  "<span className=\"text-xs text-slate-400\">{t('performance.totalRequests')}</span>"
);
perf = perf.replace(
  '<h4 className="text-xs font-semibold text-slate-200">瀑布深度</h4>',
  "<h4 className=\"text-xs font-semibold text-slate-200\">{t('performance.waterfallDepthTitle')}</h4>"
);
perf = perf.replace(
  '<span className="text-slate-400">关键路径</span>',
  "<span className=\"text-slate-400\">{t('performance.criticalPath')}</span>"
);
perf = perf.replace(
  '<span className="text-slate-400">子资源</span>',
  "<span className=\"text-slate-400\">{t('performance.subResources')}</span>"
);
perf = perf.replace(
  '<span className="text-slate-400">异步加载</span>',
  "<span className=\"text-slate-400\">{t('performance.asyncLoad')}</span>"
);
perf = perf.replace(
  '深度: {data.budget.waterfallDepth} 级',
  "{t('performance.depthLevel', { depth: data.budget.waterfallDepth })}"
);
perf = perf.replace(
  '目标: ≤ 4 级 ✓',
  "{t('performance.targetDepth')}"
);
perf = perf.replace(
  '<h4 className="text-xs font-semibold text-slate-200">优化建议</h4>',
  "<h4 className=\"text-xs font-semibold text-slate-200\">{t('performance.optimizationSuggestions')}</h4>"
);
perf = perf.replace(
  '节省 {rec.estimatedSavings}',
  "{t('performance.savings')} {rec.estimatedSavings}"
);
// Replace title at bottom
perf = perf.replace(
  '性能优化面板',
  "{t('performance.title')}"
);

// Now update tab rendering - where tab.label is used, wrap with t()
// The tabs use tab.label directly. For 'Web Vitals' it's already English.
// For others, they're now i18n keys. We need to render them with t().
// Find where tab.label is rendered and wrap with t()
perf = perf.replace(
  '{tab.label}',
  "{tab.id === 'vitals' ? tab.label : t(tab.label)}"
);

// Also update the entry.name rendering in CacheStrategyCard to use t()
perf = perf.replace(
  '<span className="text-xs font-medium text-slate-200">{entry.name}</span>',
  "<span className=\"text-xs font-medium text-slate-200\">{t(entry.name)}</span>"
);

// Update recommendation title and description rendering
perf = perf.replace(
  '{rec.title}',
  "{t(rec.title)}"
);
perf = perf.replace(
  '{rec.description}',
  "{t(rec.description)}"
);

// Update alert title and description rendering
perf = perf.replace(
  '{alert.title}',
  "{t(alert.title)}"
);
perf = perf.replace(
  '{alert.description}',
  "{t(alert.description)}"
);

// Update pie chart legend labels - the name field is now a key
perf = perf.replace(
  '{mod.loaded ? \'已加载\' : \'懒加载\'}',
  "{mod.loaded ? t('performance.loaded') : t('performance.lazyLoad')}"
);

// Update pie chart data - name field needs t() at render
// The pieData names are now keys, so the pie chart legend needs t()
// Find where the pie legend uses the name
perf = perf.replace(
  '<span className="text-slate-400">已加载</span>',
  "<span className=\"text-slate-400\">{t('performance.loaded')}</span>"
);
perf = perf.replace(
  '<span className="text-slate-400">懒加载</span>',
  "<span className=\"text-slate-400\">{t('performance.lazyLoad')}</span>"
);

writeFileSync(`${BASE}/performance-dashboard.tsx`, perf);
console.log('✓ performance-dashboard.tsx updated');

// ============================================================
// 2. deployment-center.tsx
// ============================================================
let dep = readFileSync(`${BASE}/deployment-center.tsx`, 'utf8');

// Add useI18n import (keep useClientTime)
dep = dep.replace(
  "import { useClientTime } from '@/hooks/use-client-time';",
  "import { useClientTime } from '@/hooks/use-client-time';\nimport { useI18n } from '@/hooks/use-i18n';"
);

// Replace TABS labels with i18n keys
dep = dep.replace(
  "{ id: 'overview', label: '部署总览', icon: Globe },",
  "{ id: 'overview', label: 'deployment.overview', icon: Globe },"
);
dep = dep.replace(
  "{ id: 'verification', label: '合约验证', icon: FileCheck },",
  "{ id: 'verification', label: 'deployment.verificationTab', icon: FileCheck },"
);
dep = dep.replace(
  "{ id: 'multisig', label: '多签钱包', icon: Lock },",
  "{ id: 'multisig', label: 'deployment.multisigTab', icon: Lock },"
);
dep = dep.replace(
  "{ id: 'consistency', label: '状态一致性', icon: GitBranch },",
  "{ id: 'consistency', label: 'deployment.consistencyTab', icon: GitBranch },"
);

// Replace DEPLOY_STATUS_CONFIG labels with keys
dep = dep.replace(
  "live: { label: '运行中',",
  "live: { label: 'deployment.deployLive',"
);
dep = dep.replace(
  "deploying: { label: '部署中',",
  "deploying: { label: 'deployment.deployDeploying',"
);
dep = dep.replace(
  "paused: { label: '已暂停',",
  "paused: { label: 'deployment.deployPaused',"
);
dep = dep.replace(
  "verifying: { label: '验证中',",
  "verifying: { label: 'deployment.deployVerifying',"
);

// Replace CONTRACT_STATUS_CONFIG labels
dep = dep.replace(
  "verified: { label: '已验证',",
  "verified: { label: 'deployment.contractVerifiedLabel',"
);
dep = dep.replace(
  "pending: { label: '待验证',",
  "pending: { label: 'deployment.contractPendingLabel',"
);
dep = dep.replace(
  "failed: { label: '验证失败',",
  "failed: { label: 'deployment.contractFailedLabel',"
);

// Replace PIPELINE_STATUS_CONFIG labels
dep = dep.replace(
  "passed: { label: '通过',",
  "passed: { label: 'deployment.pipelinePassed',"
);
dep = dep.replace(
  "in_progress: { label: '进行中',",
  "in_progress: { label: 'deployment.pipelineInProgress',"
);
dep = dep.replace(
  "pending: { label: '待执行',",
  "pending: { label: 'deployment.pipelinePendingLabel',"
);
dep = dep.replace(
  "failed: { label: '失败',",
  "failed: { label: 'deployment.pipelineFailed',"
);

// Replace CopyButton title
dep = dep.replace(
  'title="复制"',
  "title={t('deployment.copyBtn')}"
);

// Replace getRelativeTime Chinese strings with t() calls
dep = dep.replace(
  "if (diffMin < 1) return '刚刚';",
  "if (diffMin < 1) return t('deployment.justNow');"
);
dep = dep.replace(
  "if (diffMin < 60) return `${diffMin}分钟前`;",
  "if (diffMin < 60) return t('deployment.minutesAgo', { n: diffMin });"
);
dep = dep.replace(
  "if (diffHr < 24) return `${diffHr}小时前`;",
  "if (diffHr < 24) return t('deployment.hoursAgo', { n: diffHr });"
);
dep = dep.replace(
  "if (diffDay < 30) return `${diffDay}天前`;",
  "if (diffDay < 30) return t('deployment.daysAgo', { n: diffDay });"
);

// The getRelativeTime function needs access to t(). We need to pass it as a parameter.
// Let's refactor: change getRelativeTime to accept t as second param
dep = dep.replace(
  "function getRelativeTime(timestamp: string, now?: Date | null): string {",
  "function getRelativeTime(timestamp: string, now?: Date | null, translate?: (key: string, params?: Record<string, string | number>) => string): string {"
);
dep = dep.replace(
  "if (diffMin < 1) return t('deployment.justNow');",
  "if (diffMin < 1) return translate ? translate('deployment.justNow') : '刚刚';"
);
dep = dep.replace(
  "if (diffMin < 60) return t('deployment.minutesAgo', { n: diffMin });",
  "if (diffMin < 60) return translate ? translate('deployment.minutesAgo', { n: diffMin }) : `${diffMin}分钟前`;"
);
dep = dep.replace(
  "if (diffHr < 24) return t('deployment.hoursAgo', { n: diffHr });",
  "if (diffHr < 24) return translate ? translate('deployment.hoursAgo', { n: diffHr }) : `${diffHr}小时前`;"
);
dep = dep.replace(
  "if (diffDay < 30) return t('deployment.daysAgo', { n: diffDay });",
  "if (diffDay < 30) return translate ? translate('deployment.daysAgo', { n: diffDay }) : `${diffDay}天前`;"
);

// Add useI18n to OverviewTab
dep = dep.replace(
  'function OverviewTab({ data }: { data: DeploymentData }) {\n  const now = useClientTime();',
  'function OverviewTab({ data }: { data: DeploymentData }) {\n  const now = useClientTime();\n  const { t } = useI18n();'
);
// Update getRelativeTime call in OverviewTab
dep = dep.replace(
  'getRelativeTime(ds.lastDeployAt, now)',
  'getRelativeTime(ds.lastDeployAt, now, t)'
);

// Replace OverviewTab Chinese strings
dep = dep.replace(
  '<h4 className="text-sm font-semibold text-slate-200">网络状态</h4>',
  "<h4 className=\"text-sm font-semibold text-slate-200\">{t('deployment.networkStatus')}</h4>"
);
dep = dep.replace(
  '<span className="text-[10px] text-slate-500">版本</span>',
  "<span className=\"text-[10px] text-slate-500\">{t('deployment.version')}</span>"
);
dep = dep.replace(
  '上次部署: {getRelativeTime(ds.lastDeployAt, now, t)}',
  "{t('deployment.lastDeploy')}: {getRelativeTime(ds.lastDeployAt, now, t)}"
);
dep = dep.replace(
  '<span className="text-xs text-slate-400">运行时间</span>',
  "<span className=\"text-xs text-slate-400\">{t('deployment.uptime')}</span>"
);
dep = dep.replace(
  '<span className="text-xs text-slate-400">总交易数</span>',
  "<span className=\"text-xs text-slate-400\">{t('deployment.totalTransactions')}</span>"
);
dep = dep.replace(
  '<span className="text-[10px] text-slate-400 font-medium">部署流水线</span>',
  "<span className=\"text-[10px] text-slate-400 font-medium\">{t('deployment.deployPipelineLabel')}</span>"
);
dep = dep.replace(
  '<h4 className="text-xs font-semibold text-slate-200">已部署合约</h4>',
  "<h4 className=\"text-xs font-semibold text-slate-200\">{t('deployment.deployedContracts')}</h4>"
);
dep = dep.replace(
  '{data.contracts.filter(c => c.status === \'verified\').length}/{data.contracts.length} 已验证',
  "{data.contracts.filter(c => c.status === 'verified').length}/{data.contracts.length} {t('deployment.verified')}"
);
dep = dep.replace(
  '重新验证全部',
  "{t('deployment.reverifyAll')}"
);
dep = dep.replace(
  '导出部署报告',
  "{t('deployment.exportDeployReport')}"
);

// Add useI18n to VerificationTab
dep = dep.replace(
  'function VerificationTab({ data }: { data: DeploymentData }) {\n  const [verifying,',
  'function VerificationTab({ data }: { data: DeploymentData }) {\n  const { t } = useI18n();\n  const [verifying,'
);
dep = dep.replace(
  '<h4 className="text-sm font-semibold text-slate-200">合约验证状态</h4>',
  "<h4 className=\"text-sm font-semibold text-slate-200\">{t('deployment.verificationStatus')}</h4>"
);
// second occurrence of verified count
dep = dep.replace(
  '{data.contracts.filter(c => c.status === \'verified\').length}/{data.contracts.length} 已验证',
  "{data.contracts.filter(c => c.status === 'verified').length}/{data.contracts.length} {t('deployment.verified')}"
);
dep = dep.replace(
  '<span className="text-[10px] text-slate-500 block">字节码大小</span>',
  "<span className=\"text-[10px] text-slate-500 block\">{t('deployment.bytecodeSize')}</span>"
);
dep = dep.replace(
  '<span className="text-[10px] text-slate-500 block">优化配置</span>',
  "<span className=\"text-[10px] text-slate-500 block\">{t('deployment.optimizationConfig')}</span>"
);
dep = dep.replace(
  '<span className="text-[10px] text-slate-500 block">部署交易</span>',
  "<span className=\"text-[10px] text-slate-500 block\">{t('deployment.deployTransaction')}</span>"
);
dep = dep.replace(
  '<span className="text-[10px] text-slate-500 block">验证时间</span>',
  "<span className=\"text-[10px] text-slate-500 block\">{t('deployment.verificationTime')}</span>"
);
dep = dep.replace(
  '<span className="text-[10px] text-slate-500 font-medium">字节码比对</span>',
  "<span className=\"text-[10px] text-slate-500 font-medium\">{t('deployment.bytecodeComparison')}</span>"
);
dep = dep.replace(
  "{hashMatch ? '一致' : '不一致'}",
  "{hashMatch ? t('deployment.match') : t('deployment.mismatch')}"
);
dep = dep.replace(
  '<span className="text-slate-500 block mb-0.5">源码哈希</span>',
  "<span className=\"text-slate-500 block mb-0.5\">{t('deployment.sourceHash')}</span>"
);
dep = dep.replace(
  '<span className="text-slate-500 block mb-0.5">链上哈希</span>',
  "<span className=\"text-slate-500 block mb-0.5\">{t('deployment.onchainHash')}</span>"
);
dep = dep.replace(
  '验证中...\n                    </>',
  "{t('deployment.verifyingEllipsis')}\n                    </>"
);
dep = dep.replace(
  '验证合约\n                    </>',
  "{t('deployment.verifyContract')}\n                    </>"
);
dep = dep.replace(
  '<h5 className="text-xs font-medium text-slate-300 mb-3">验证时间线</h5>',
  "<h5 className=\"text-xs font-medium text-slate-300 mb-3\">{t('deployment.verificationTimeline')}</h5>"
);

// Add useI18n to MultiSigTab
dep = dep.replace(
  'function MultiSigTab({ data }: { data: DeploymentData }) {',
  'function MultiSigTab({ data }: { data: DeploymentData }) {\n  const { t } = useI18n();'
);
dep = dep.replace(
  '<h4 className="text-xs font-semibold text-slate-200">多签钱包</h4>',
  "<h4 className=\"text-xs font-semibold text-slate-200\">{t('deployment.multiSigWalletTitle')}</h4>"
);
dep = dep.replace(
  '阈值: {wallet.threshold}',
  "{t('deployment.threshold')}: {wallet.threshold}"
);
dep = dep.replace(
  '<h4 className="text-xs font-semibold text-slate-200">确认进度</h4>',
  "<h4 className=\"text-xs font-semibold text-slate-200\">{t('deployment.confirmationProgress')}</h4>"
);
dep = dep.replace(
  '<span className="text-xs text-slate-500 ml-1">签名者已确认</span>',
  "<span className=\"text-xs text-slate-500 ml-1\">{t('deployment.signersConfirmed')}</span>"
);
dep = dep.replace(
  'title={`阈值: ${wallet.thresholdNum}`}',
  "title={`${t('deployment.threshold')}: ${wallet.thresholdNum}`}"
);
dep = dep.replace(
  '<span className="text-violet-400">← 阈值 {wallet.thresholdNum}</span>',
  "<span className=\"text-violet-400\">← {t('deployment.threshold')} {wallet.thresholdNum}</span>"
);
dep = dep.replace(
  '<h4 className="text-xs font-semibold text-slate-200">签名者列表</h4>',
  "<h4 className=\"text-xs font-semibold text-slate-200\">{t('deployment.signerList')}</h4>"
);
dep = dep.replace(
  '<><CheckCircle2 className="mr-1 size-2.5" /> 已确认</>',
  "<><CheckCircle2 className=\"mr-1 size-2.5\" /> {t('deployment.confirmedLabel')}</>"
);
dep = dep.replace(
  '<><Timer className="mr-1 size-2.5" /> 待确认</>',
  "<><Timer className=\"mr-1 size-2.5\" /> {t('deployment.pendingConfirmLabel')}</>"
);
dep = dep.replace(
  '<h4 className="text-xs font-semibold text-slate-200">待处理操作</h4>',
  "<h4 className=\"text-xs font-semibold text-slate-200\">{t('deployment.pendingOperations')}</h4>"
);
dep = dep.replace(
  '{wallet.pendingOperations.length} 项',
  "{wallet.pendingOperations.length} {t('deployment.items')}"
);
dep = dep.replace(
  '确认\n                </Button>',
  "{t('deployment.confirmBtn')}\n                </Button>"
);
dep = dep.replace(
  '<h4 className="text-xs font-semibold text-slate-200">操作历史</h4>',
  "<h4 className=\"text-xs font-semibold text-slate-200\">{t('deployment.operationHistory')}</h4>"
);
dep = dep.replace(
  '已完成\n              </Badge>',
  "{t('deployment.completedLabel')}\n              </Badge>"
);

// Add useI18n to ConsistencyTab
dep = dep.replace(
  'function ConsistencyTab({ data }: { data: DeploymentData }) {',
  'function ConsistencyTab({ data }: { data: DeploymentData }) {\n  const { t } = useI18n();'
);
dep = dep.replace(
  '一致性检查: {sc.consistencyCheck === \'passed\' ? \'PASS\' : \'FAIL\'}',
  "{t('deployment.consistencyCheck')}: {sc.consistencyCheck === 'passed' ? 'PASS' : 'FAIL'}"
);
dep = dep.replace(
  '{matchCount}/{sc.checks.length} 检查项匹配 · 不一致数: {sc.mismatches}',
  "{matchCount}/{sc.checks.length} {t('deployment.checksMatch')} · {t('deployment.mismatchCount')}: {sc.mismatches}"
);
dep = dep.replace(
  'Sepolia 测试网',
  "{t('deployment.sepoliaTestnet')}"
);
dep = dep.replace(
  'Base 主网',
  "{t('deployment.baseMainnet')}"
);
dep = dep.replace(
  '<h4 className="text-xs font-semibold text-slate-200">状态对比</h4>',
  "<h4 className=\"text-xs font-semibold text-slate-200\">{t('deployment.stateComparison')}</h4>"
);
dep = dep.replace(
  '<th className="text-left px-4 py-2.5 font-medium">检查项</th>',
  "<th className=\"text-left px-4 py-2.5 font-medium\">{t('deployment.checkItem')}</th>"
);
dep = dep.replace(
  '<th className="text-left px-4 py-2.5 font-medium">主网</th>',
  "<th className=\"text-left px-4 py-2.5 font-medium\">{t('deployment.mainnet')}</th>"
);
dep = dep.replace(
  '<th className="text-center px-4 py-2.5 font-medium">状态</th>',
  "<th className=\"text-center px-4 py-2.5 font-medium\">{t('deployment.statusLabel')}</th>"
);
dep = dep.replace(
  '<><CheckCircle2 className="mr-0.5 size-2.5" /> 一致</>',
  "<><CheckCircle2 className=\"mr-0.5 size-2.5\" /> {t('deployment.matchLabel')}</>"
);
dep = dep.replace(
  '<><AlertTriangle className="mr-0.5 size-2.5" /> 不一致</>',
  "<><AlertTriangle className=\"mr-0.5 size-2.5\" /> {t('deployment.mismatchLabel')}</>"
);
dep = dep.replace(
  '<h4 className="text-xs font-semibold text-slate-200">不一致详情</h4>',
  "<h4 className=\"text-xs font-semibold text-slate-200\">{t('deployment.mismatchDetails')}</h4>"
);
dep = dep.replace(
  '不一致',
  "{t('deployment.mismatchLabel')}"
);
dep = dep.replace(
  '<span className="text-slate-500 block">主网:</span>',
  "<span className=\"text-slate-500 block\">{t('deployment.mainnetLabel')}</span>"
);
dep = dep.replace(
  '<span>说明: {check.note}</span>',
  "<span>{t('deployment.noteLabel')}: {check.note}</span>"
);
dep = dep.replace(
  '检查中...',
  "{t('deployment.checkingEllipsis')}"
);
dep = dep.replace(
  '执行一致性检查',
  "{t('deployment.runConsistencyCheck')}"
);
dep = dep.replace(
  '<span className="text-slate-500">上次检查</span>',
  "<span className=\"text-slate-500\">{t('deployment.lastCheck')}</span>"
);
dep = dep.replace(
  '<span className="text-slate-500">自动检查</span>',
  "<span className=\"text-slate-500\">{t('deployment.autoCheck')}</span>"
);
dep = dep.replace(
  '<span className="text-slate-500">不一致数</span>',
  "<span className=\"text-slate-500\">{t('deployment.mismatchCount')}</span>"
);

// Replace tab label rendering to use t()
dep = dep.replace(
  '{tab.label}',
  "{t(tab.label)}"
);

// Replace status config label rendering to use t()
dep = dep.replace(
  '{statusConfig.label}',
  "{t(statusConfig.label)}"
);
dep = dep.replace(
  '{cStatus.label}',
  "{t(cStatus.label)}"
);
dep = dep.replace(
  '{config.label}',  // pipeline stage labels
  "{t(config.label)}"
);

// Replace mock data signer names with i18n keys
dep = dep.replace(
  "{ name: '安全委员会',",
  "{ name: 'deployment.securityCommittee',"
);
dep = dep.replace(
  "{ name: '架构师',",
  "{ name: 'deployment.architect',"
);
dep = dep.replace(
  "{ name: '运营方',",
  "{ name: 'deployment.operator',"
);
dep = dep.replace(
  "{ name: '投资人代表',",
  "{ name: 'deployment.investorRep',"
);
dep = dep.replace(
  "{ name: '社区代表',",
  "{ name: 'deployment.communityRep',"
);

// Replace signer name rendering with t()
dep = dep.replace(
  '<p className="text-xs font-medium text-slate-200">{signer.name}</p>',
  "<p className=\"text-xs font-medium text-slate-200\">{t(signer.name)}</p>"
);

// Replace pipeline stage names with i18n keys
dep = dep.replace(
  "{ name: '编译检查',",
  "{ name: 'deployment.compileCheck',"
);
dep = dep.replace(
  "{ name: '测试覆盖',",
  "{ name: 'deployment.testCoverage',"
);
dep = dep.replace(
  "{ name: '静态分析',",
  "{ name: 'deployment.staticAnalysis',"
);
dep = dep.replace(
  "{ name: '形式化验证',",
  "{ name: 'deployment.formalVerification',"
);
dep = dep.replace(
  "{ name: '多签审批',",
  "{ name: 'deployment.multiSigApproval',"
);
dep = dep.replace(
  "{ name: '主网部署',",
  "{ name: 'deployment.mainnetDeploy',"
);

// Replace pipeline stage name rendering - already rendered via stage.name
// Need to wrap with t() where stage.name appears in JSX
dep = dep.replace(
  '<span className={config.color}>{stage.name}</span>',
  "<span className={config.color}>{t(stage.name)}</span>"
);

// Replace mock data timeLock
dep = dep.replace(
  "timeLock: '72h 冷静期',",
  "timeLock: 'deployment.cooldownPeriod72h',"
);
// And where it's rendered
dep = dep.replace(
  '{wallet.timeLock}',
  "{t(wallet.timeLock)}"
);

// Replace autoCheckSchedule
dep = dep.replace(
  "autoCheckSchedule: '每6小时',",
  "autoCheckSchedule: 'deployment.every6Hours',"
);
// And where it's rendered - this is in ConsistencyTab
dep = dep.replace(
  '{sc.autoCheckSchedule}',
  "{t(sc.autoCheckSchedule)}"
);

// Replace check note  
dep = dep.replace(
  "note: '主网已执行燃烧'",
  "note: 'deployment.mainnetBurnExecuted'"
);
// Where note is rendered - already handled above with t('deployment.noteLabel'): {check.note}

// Replace pending operation descriptions with keys
dep = dep.replace(
  "{ description: '升级 TokenVault 至 v2.1.0',",
  "{ description: 'deployment.upgradeTokenVault',"
);
dep = dep.replace(
  "{ description: '调整 LP 手续费率 0.3% → 0.25%',",
  "{ description: 'deployment.adjustLpFee',"
);
// Where op.description is rendered
dep = dep.replace(
  '<p className="text-xs font-medium text-slate-200">{op.description}</p>',
  "<p className=\"text-xs font-medium text-slate-200\">{t(op.description)}</p>"
);

// Replace operation history descriptions
dep = dep.replace(
  "{ description: '升级 CircuitGuard 至 v2.1.0',",
  "{ description: 'deployment.upgradeCircuitGuard',"
);
dep = dep.replace(
  "{ description: '调整共振分阈值 60→70',",
  "{ description: 'deployment.adjustResonanceThreshold',"
);
dep = dep.replace(
  "{ description: '新增 IFDRouter 委托路由',",
  "{ description: 'deployment.addIfdRouter',"
);
// Where history op description is rendered
dep = dep.replace(
  '<p className="text-[11px] text-slate-300">{op.description}</p>',
  "<p className=\"text-[11px] text-slate-300\">{t(op.description)}</p>"
);

// Replace main title at bottom
dep = dep.replace(
  '链上部署中心',
  "{t('deployment.title')}"
);

writeFileSync(`${BASE}/deployment-center.tsx`, dep);
console.log('✓ deployment-center.tsx updated');

// ============================================================
// 3. monitoring-center.tsx
// ============================================================
let mon = readFileSync(`${BASE}/monitoring-center.tsx`, 'utf8');

// Add useI18n import
mon = mon.replace(
  "import { cn } from '@/lib/utils';",
  "import { cn } from '@/lib/utils';\nimport { useI18n } from '@/hooks/use-i18n';"
);

// Replace relativeTime function to use t()
mon = mon.replace(
  "function relativeTime(dateStr: string): string {\n  if (dateStr === '从未触发') return dateStr;",
  "function relativeTime(dateStr: string, t?: (key: string, params?: Record<string, string | number>) => string): string {\n  if (dateStr === (t ? t('monitoring.neverTriggered') : '从未触发')) return t ? t('monitoring.neverTriggered') : dateStr;"
);
mon = mon.replace(
  "if (diffMin < 60) return `${diffMin}分钟前`;",
  "if (diffMin < 60) return t ? t('deployment.minutesAgo', { n: diffMin }) : `${diffMin}分钟前`;"
);
mon = mon.replace(
  "if (diffH < 24) return `${diffH}小时前`;",
  "if (diffH < 24) return t ? t('deployment.hoursAgo', { n: diffH }) : `${diffH}小时前`;"
);
mon = mon.replace(
  "return `${diffD}天前`;",
  "return t ? t('deployment.daysAgo', { n: diffD }) : `${diffD}天前`;"
);

// Add useI18n to main component
mon = mon.replace(
  'export default function MonitoringCenter() {\n  const { isConnected, systemMetrics, metricsHistory, chainEvents, lastAnomaly, anomalyHistory } = useMonitoringStream();',
  'export default function MonitoringCenter() {\n  const { t } = useI18n();\n  const { isConnected, systemMetrics, metricsHistory, chainEvents, lastAnomaly, anomalyHistory } = useMonitoringStream();'
);

// Replace title
mon = mon.replace(
  '<CardTitle className="text-base text-slate-100">监控与告警中心</CardTitle>',
  "<CardTitle className=\"text-base text-slate-100\">{t('monitoring.title')}</CardTitle>"
);
mon = mon.replace(
  '<p className="text-xs text-slate-400 mt-0.5">Monitoring & Alerting Center</p>',
  "<p className=\"text-xs text-slate-400 mt-0.5\">{t('monitoring.title')}</p>"
);

// Replace realtime indicator
mon = mon.replace(
  "{isConnected ? '实时监控中' : '连接中...'}",
  "{isConnected ? t('monitoring.realtimeMonitor') : t('monitoring.connecting')}"
);

// Replace healthy badge
mon = mon.replace(
  '健康',
  "{t('monitoring.healthy')}"
);

// Replace tab labels
mon = mon.replace(
  '系统监控',
  "{t('monitoring.systemMonitor')}"
);
mon = mon.replace(
  '链上事件',
  "{t('monitoring.chainEventsTab')}"
);
mon = mon.replace(
  '告警规则',
  "{t('monitoring.alertRulesTab')}"
);
mon = mon.replace(
  '异常检测',
  "{t('monitoring.anomalyDetectionTab')}"
);

// Replace system metrics labels
mon = mon.replace(
  '<span className="text-[11px] text-slate-400">内存</span>',
  "<span className=\"text-[11px] text-slate-400\">{t('monitoring.memory')}</span>"
);
mon = mon.replace(
  '<span className="text-[11px] text-slate-400">请求率</span>',
  "<span className=\"text-[11px] text-slate-400\">{t('monitoring.requestRateLabel')}</span>"
);
mon = mon.replace(
  '<span className="text-[11px] text-slate-400">错误率</span>',
  "<span className=\"text-[11px] text-slate-400\">{t('monitoring.errorRateLabel')}</span>"
);

// Replace latency distribution
mon = mon.replace(
  '延迟分布',
  "{t('monitoring.latencyDistribution')}"
);
// Latency tooltip
mon = mon.replace(
  "formatter={(value: number) => [`${value}ms`, '延迟']}",
  "formatter={(value: number) => [`${value}ms`, t('monitoring.latencyLabel')]}"
);

// Network I/O
mon = mon.replace(
  '网络 I/O',
  "{t('monitoring.networkIO')}"
);
mon = mon.replace(
  '<span className="text-slate-400">入站</span>',
  "<span className=\"text-slate-400\">{t('monitoring.inbound')}</span>"
);
mon = mon.replace(
  '<span className="text-slate-400">出站</span>',
  "<span className=\"text-slate-400\">{t('monitoring.outbound')}</span>"
);
mon = mon.replace(
  '<span className="text-[11px] text-slate-400">活跃连接</span>',
  "<span className=\"text-[11px] text-slate-400\">{t('monitoring.activeConnectionsLabel')}</span>"
);

// Prometheus metrics
mon = mon.replace(
  'Prometheus 指标',
  "{t('monitoring.prometheusMetrics')}"
);

// Chain events tab
mon = mon.replace(
  "{cat === 'all' ? '全部' : cat}",
  "{cat === 'all' ? t('monitoring.allLabel') : cat}"
);
mon = mon.replace(
  '<span className="text-[10px] text-emerald-300 font-medium">监听中</span>',
  "<span className=\"text-[10px] text-emerald-300 font-medium\">{t('monitoring.listening')}</span>"
);
mon = mon.replace(
  'title="复制"',
  "title={t('monitoring.copyTitle')}"
);
mon = mon.replace(
  '暂无链上事件',
  "{t('monitoring.noChainEvents')}"
);

// Alerts tab
mon = mon.replace(
  '添加规则',
  "{t('monitoring.addRule')}"
);
mon = mon.replace(
  '次/7d',
  "{t('monitoring.timesPer7d')}"
);

// Anomaly detection
mon = mon.replace(
  "{anomalyDetection?.status === 'monitoring' ? '正常监控中' : '检测到异常'}",
  "{anomalyDetection?.status === 'monitoring' ? t('monitoring.normalMonitoring') : t('monitoring.anomalyDetected')}"
);
mon = mon.replace(
  '基线: {anomalyDetection?.baselineWindow || \'--\'} · 方法: {anomalyDetection?.detectionMethod || \'--\'}',
  "{t('monitoring.baselineLabel')}: {anomalyDetection?.baselineWindow || '--'} · {t('monitoring.methodLabel')}: {anomalyDetection?.detectionMethod || '--'}"
);

// Details and Handle buttons
mon = mon.replace(
  '详情\n                        </Button>',
  "{t('monitoring.detailsBtn')}\n                        </Button>"
);
mon = mon.replace(
  '处理\n                        </Button>',
  "{t('monitoring.handleBtn')}\n                        </Button>"
);

// Anomaly score trend
mon = mon.replace(
  '异常分数趋势 (24h)',
  "{t('monitoring.anomalyScoreTrend')}"
);
mon = mon.replace(
  "formatter={(value: number) => [value.toFixed(1), '异常分数']}",
  "formatter={(value: number) => [value.toFixed(1), t('monitoring.anomalyScore')]}"
);

// Grafana dashboards
mon = mon.replace(
  'Grafana 仪表盘',
  "{t('monitoring.grafanaDashboards')}"
);
mon = mon.replace(
  '{dash.panels} 面板',
  "{dash.panels} {t('monitoring.panels')}"
);
mon = mon.replace(
  '打开',
  "{t('monitoring.openBtn')}"
);

// Update relativeTime calls to pass t
mon = mon.replace(
  '{relativeTime(rule.lastTriggered)}',
  '{relativeTime(rule.lastTriggered, t)}'
);

writeFileSync(`${BASE}/monitoring-center.tsx`, mon);
console.log('✓ monitoring-center.tsx updated');

console.log('\nAll 3 components updated!');
