'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  Gauge,
  Server,
  Zap,
  TrendingDown,
  ArrowDown,
  ChevronRight,
  Database,
  HardDrive,
  Layers,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Package,
  Cloud,
  Shield,
  BarChart3,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { cn } from '@/lib/utils';
import { useI18n } from '@/hooks/use-i18n';
import { format, parseISO } from 'date-fns';

// ── Types ──────────────────────────────────────────────
interface PerformanceMetric {
  name: string;
  value: number;
  target: number;
  unit: string;
  status: 'good' | 'needs_improvement' | 'poor';
}

interface CacheStrategyEntry {
  id: string;
  name: string;
  ttl: number;
  ttlLabel: string;
  hitRate: number;
  swrInterval: number;
  swrLabel: string;
  type: 'ssr' | 'api' | 'static' | 'isr' | 'cdn';
}

interface CDNConfig {
  provider: string;
  edgeLocations: string;
  cacheHitRate: number;
  bandwidthSaved: string;
  ssl: string;
  http2: boolean;
  brotli: boolean;
}

interface LazyLoadingModule {
  id: string;
  name: string;
  chunkSize: number;
  loadTime: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  loaded: boolean;
}

interface BudgetItem {
  category: string;
  actual: number;
  budget: number;
  unit: string;
}

interface PerformanceBudget {
  items: BudgetItem[];
  firstPartyRequests: number;
  thirdPartyRequests: number;
  waterfallDepth: number;
}

interface SparklinePoint {
  day: string;
  value: number;
}

interface CacheTrendPoint {
  time: string;
  hitRate: number;
}

interface OptimizationRecommendation {
  id: string;
  title: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  estimatedSavings: string;
  description: string;
}

interface PerformanceAlert {
  id: string;
  title: string;
  severity: 'warning' | 'critical';
  description: string;
  timestamp: string;
}

interface PerformanceData {
  metrics: PerformanceMetric[];
  cacheStrategies: CacheStrategyEntry[];
  cdnConfig: CDNConfig;
  lazyModules: LazyLoadingModule[];
  budget: PerformanceBudget;
  performanceScore: number;
  jsBundleSize: number;
  jsBundleBudget: number;
  cssBundleSize: number;
  imageOptimizationRate: number;
  cacheHitRate: number;
  cdnBandwidthSaved: string;
  sparklines: Record<string, SparklinePoint[]>;
  cacheTrend: CacheTrendPoint[];
  recommendations: OptimizationRecommendation[];
  alerts: PerformanceAlert[];
}

// ── Mock Data (deterministic, no Math.random) ─────────
const MOCK_METRICS: PerformanceMetric[] = [
  { name: 'FCP', value: 1.2, target: 1.8, unit: 's', status: 'good' },
  { name: 'LCP', value: 2.1, target: 2.5, unit: 's', status: 'good' },
  { name: 'INP', value: 120, target: 200, unit: 'ms', status: 'good' },
  { name: 'CLS', value: 0.05, target: 0.1, unit: '', status: 'good' },
  { name: 'TTFB', value: 180, target: 200, unit: 'ms', status: 'good' },
];

const MOCK_CACHE_STRATEGIES: CacheStrategyEntry[] = [
  { id: 'cs_1', name: 'performance.ssrPageCache', ttl: 300, ttlLabel: '300s', hitRate: 87, swrInterval: 30, swrLabel: '30s', type: 'ssr' },
  { id: 'cs_2', name: 'performance.apiResponseCache', ttl: 60, ttlLabel: '60s', hitRate: 92, swrInterval: 10, swrLabel: '10s', type: 'api' },
  { id: 'cs_3', name: 'performance.staticAssetCache', ttl: 31536000, ttlLabel: 'performance.oneYear', hitRate: 99, swrInterval: 0, swrLabel: 'immutable', type: 'static' },
  { id: 'cs_4', name: 'performance.isrIncrementalCache', ttl: 600, ttlLabel: '600s', hitRate: 78, swrInterval: 60, swrLabel: '60s', type: 'isr' },
  { id: 'cs_5', name: 'performance.cdnEdgeCache', ttl: 1800, ttlLabel: '1800s', hitRate: 85, swrInterval: 0, swrLabel: 'purge', type: 'cdn' },
];

const MOCK_CDN_CONFIG: CDNConfig = {
  provider: 'Cloudflare',
  edgeLocations: '280+',
  cacheHitRate: 91.2,
  bandwidthSaved: '847GB',
  ssl: 'TLS 1.3',
  http2: true,
  brotli: true,
};

const MOCK_LAZY_MODULES: LazyLoadingModule[] = [
  { id: 'lm_1', name: 'cognitive-card', chunkSize: 12, loadTime: 45, priority: 'critical', loaded: true },
  { id: 'lm_2', name: 'split-dashboard', chunkSize: 18, loadTime: 62, priority: 'critical', loaded: true },
  { id: 'lm_3', name: 'resonance-wave', chunkSize: 24, loadTime: 85, priority: 'high', loaded: true },
  { id: 'lm_4', name: 'contract-simulation', chunkSize: 32, loadTime: 120, priority: 'medium', loaded: false },
  { id: 'lm_5', name: 'lp-liquidity', chunkSize: 28, loadTime: 95, priority: 'medium', loaded: false },
  { id: 'lm_6', name: 'security-audit', chunkSize: 22, loadTime: 78, priority: 'low', loaded: false },
  { id: 'lm_7', name: 'compliance-panel', chunkSize: 20, loadTime: 70, priority: 'low', loaded: false },
  { id: 'lm_8', name: 'avatar-marketplace', chunkSize: 15, loadTime: 55, priority: 'high', loaded: true },
];

const MOCK_BUDGET: PerformanceBudget = {
  items: [
    { category: 'JS', actual: 142, budget: 150, unit: 'KB' },
    { category: 'CSS', actual: 28, budget: 50, unit: 'KB' },
    { category: 'Images', actual: 89, budget: 200, unit: 'KB' },
    { category: 'Fonts', actual: 42, budget: 80, unit: 'KB' },
  ],
  firstPartyRequests: 12,
  thirdPartyRequests: 3,
  waterfallDepth: 4,
};

const MOCK_SPARKLINES: Record<string, SparklinePoint[]> = {
  FCP: [
    { day: 'Mon', value: 1.4 }, { day: 'Tue', value: 1.3 }, { day: 'Wed', value: 1.35 },
    { day: 'Thu', value: 1.25 }, { day: 'Fri', value: 1.2 }, { day: 'Sat', value: 1.18 }, { day: 'Sun', value: 1.2 },
  ],
  LCP: [
    { day: 'Mon', value: 2.5 }, { day: 'Tue', value: 2.4 }, { day: 'Wed', value: 2.3 },
    { day: 'Thu', value: 2.2 }, { day: 'Fri', value: 2.15 }, { day: 'Sat', value: 2.12 }, { day: 'Sun', value: 2.1 },
  ],
  INP: [
    { day: 'Mon', value: 150 }, { day: 'Tue', value: 145 }, { day: 'Wed', value: 140 },
    { day: 'Thu', value: 135 }, { day: 'Fri', value: 128 }, { day: 'Sat', value: 122 }, { day: 'Sun', value: 120 },
  ],
  CLS: [
    { day: 'Mon', value: 0.08 }, { day: 'Tue', value: 0.07 }, { day: 'Wed', value: 0.065 },
    { day: 'Thu', value: 0.06 }, { day: 'Fri', value: 0.055 }, { day: 'Sat', value: 0.052 }, { day: 'Sun', value: 0.05 },
  ],
  TTFB: [
    { day: 'Mon', value: 210 }, { day: 'Tue', value: 200 }, { day: 'Wed', value: 195 },
    { day: 'Thu', value: 190 }, { day: 'Fri', value: 185 }, { day: 'Sat', value: 182 }, { day: 'Sun', value: 180 },
  ],
};

const MOCK_CACHE_TREND: CacheTrendPoint[] = [
  { time: '00:00', hitRate: 88.2 }, { time: '02:00', hitRate: 89.5 }, { time: '04:00', hitRate: 90.1 },
  { time: '06:00', hitRate: 89.8 }, { time: '08:00', hitRate: 88.5 }, { time: '10:00', hitRate: 87.2 },
  { time: '12:00', hitRate: 86.5 }, { time: '14:00', hitRate: 87.8 }, { time: '16:00', hitRate: 89.2 },
  { time: '18:00', hitRate: 90.5 }, { time: '20:00', hitRate: 91.2 }, { time: '22:00', hitRate: 91.0 },
];

const MOCK_RECOMMENDATIONS: OptimizationRecommendation[] = [
  { id: 'rec_1', title: 'performance.rec1Title', priority: 'high', estimatedSavings: '12KB / 200ms', description: 'performance.rec1Desc' },
  { id: 'rec_2', title: 'performance.rec2Title', priority: 'medium', estimatedSavings: '25KB / img', description: 'performance.rec2Desc' },
  { id: 'rec_3', title: 'performance.rec3Title', priority: 'medium', estimatedSavings: '100ms TTFB', description: 'performance.rec3Desc' },
  { id: 'rec_4', title: 'performance.rec4Title', priority: 'low', estimatedSavings: '2 requests', description: 'performance.rec4Desc' },
  { id: 'rec_5', title: 'performance.rec5Title', priority: 'high', estimatedSavings: '15% cache hit rate', description: 'performance.rec5Desc' },
];

const MOCK_ALERTS: PerformanceAlert[] = [
  { id: 'alert_1', title: 'performance.alert1Title', severity: 'warning', description: 'performance.alert1Desc', timestamp: '2026-03-04T08:30:00Z' },
  { id: 'alert_2', title: 'performance.alert2Title', severity: 'warning', description: 'performance.alert2Desc', timestamp: '2026-03-04T06:15:00Z' },
];

const MOCK_DATA: PerformanceData = {
  metrics: MOCK_METRICS,
  cacheStrategies: MOCK_CACHE_STRATEGIES,
  cdnConfig: MOCK_CDN_CONFIG,
  lazyModules: MOCK_LAZY_MODULES,
  budget: MOCK_BUDGET,
  performanceScore: 94,
  jsBundleSize: 142,
  jsBundleBudget: 150,
  cssBundleSize: 28,
  imageOptimizationRate: 94,
  cacheHitRate: 91.2,
  cdnBandwidthSaved: '847GB',
  sparklines: MOCK_SPARKLINES,
  cacheTrend: MOCK_CACHE_TREND,
  recommendations: MOCK_RECOMMENDATIONS,
  alerts: MOCK_ALERTS,
};

// ── Tab Config ─────────────────────────────────────────
type TabId = 'vitals' | 'cache' | 'lazy' | 'budget';

interface TabConfig {
  id: TabId;
  label: string;
  icon: React.ElementType;
}

const TABS: TabConfig[] = [
  { id: 'vitals', label: 'Web Vitals', icon: Gauge },
  { id: 'cache', label: 'performance.cacheStrategy', icon: Database },
  { id: 'lazy', label: 'performance.lazyLoading', icon: Layers },
  { id: 'budget', label: 'performance.performanceBudget', icon: BarChart3 },
];

// ── Color Config ───────────────────────────────────────
const PRIORITY_CONFIG: Record<string, { color: string; bg: string; badge: string; text: string }> = {
  critical: { color: 'text-red-400', bg: 'bg-red-500/10', badge: 'bg-red-500/20 text-red-300 border-red-500/30', text: 'performance.priorityCritical' },
  high: { color: 'text-orange-400', bg: 'bg-orange-500/10', badge: 'bg-orange-500/20 text-orange-300 border-orange-500/30', text: 'performance.priorityHigh' },
  medium: { color: 'text-amber-400', bg: 'bg-amber-500/10', badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30', text: 'performance.priorityMedium' },
  low: { color: 'text-sky-400', bg: 'bg-sky-500/10', badge: 'bg-sky-500/20 text-sky-300 border-sky-500/30', text: 'performance.priorityLow' },
};

const CACHE_TYPE_ICON: Record<string, React.ElementType> = {
  ssr: Server,
  api: Zap,
  static: HardDrive,
  isr: RefreshCw,
  cdn: Cloud,
};

// ── Performance Score Ring Gauge ───────────────────────
function PerformanceScoreGauge({ score }: { score: number }) {
  const { t } = useI18n();
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const gap = circumference - progress;

  const strokeColor = score >= 90 ? '#34d399' : score >= 70 ? '#fbbf24' : '#f87171';
  const scoreColor = score >= 90 ? 'text-emerald-400' : score >= 70 ? 'text-amber-400' : 'text-red-400';
  const bgColor = score >= 90 ? 'from-emerald-500/20 to-emerald-500/5' : score >= 70 ? 'from-amber-500/20 to-amber-500/5' : 'from-red-500/20 to-red-500/5';

  return (
    <div className={cn('flex flex-col items-center gap-3 rounded-xl bg-gradient-to-br p-5', bgColor)}>
      <div className="relative flex items-center justify-center">
        <svg width="132" height="132" className="-rotate-90">
          <circle cx="66" cy="66" r={radius} fill="none" stroke="currentColor" strokeWidth="8" className="text-slate-700/50" />
          <motion.circle
            cx="66" cy="66" r={radius} fill="none" stroke={strokeColor} strokeWidth="8" strokeLinecap="round"
            strokeDasharray={circumference} initial={{ strokeDashoffset: circumference }} animate={{ strokeDashoffset: gap }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <motion.span className={cn('text-3xl font-bold tabular-nums', scoreColor)} initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.5 }}>
            {score}
          </motion.span>
          <span className="text-[10px] text-slate-400">/100</span>
        </div>
      </div>
      <div className="text-center">
        <p className={cn('text-sm font-semibold', scoreColor)}>
          {score >= 90 ? t('performance.scoreExcellent') : score >= 70 ? t('performance.scoreGood') : t('performance.scoreNeedsOptimization')}
        </p>
      </div>
    </div>
  );
}

// ── Radial Gauge for Individual Metrics ────────────────
function RadialGauge({ metric, sparkline }: { metric: PerformanceMetric; sparkline: SparklinePoint[] }) {
  const { t } = useI18n();
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const ratio = Math.min(metric.value / metric.target, 1.5);
  const progress = ratio * circumference;
  const gap = circumference - progress;

  // Color based on how close to target
  const isGood = metric.value <= metric.target * 0.8;
  const isAmber = metric.value > metric.target * 0.8 && metric.value <= metric.target;
  const isRed = metric.value > metric.target;

  const strokeColor = isRed ? '#f87171' : isAmber ? '#fbbf24' : '#34d399';
  const valueColor = isRed ? 'text-red-400' : isAmber ? 'text-amber-400' : 'text-emerald-400';

  // Format display value
  const displayValue = metric.unit === 's' ? `${metric.value}s` : metric.unit === 'ms' ? `${metric.value}ms` : `${metric.value}`;
  const displayTarget = metric.unit === 's' ? `<${metric.target}s` : metric.unit === 'ms' ? `<${metric.target}ms` : `<${metric.target}`;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
      className="rounded-xl border border-slate-700 bg-slate-800/60 p-3 flex flex-col items-center gap-2"
    >
      <div className="relative flex items-center justify-center">
        <svg width="84" height="84" className="-rotate-90">
          <circle cx="42" cy="42" r={radius} fill="none" stroke="currentColor" strokeWidth="5" className="text-slate-700/50" />
          <motion.circle
            cx="42" cy="42" r={radius} fill="none" stroke={strokeColor} strokeWidth="5" strokeLinecap="round"
            strokeDasharray={circumference} initial={{ strokeDashoffset: circumference }} animate={{ strokeDashoffset: gap }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className={cn('text-sm font-bold tabular-nums', valueColor)}>{displayValue}</span>
        </div>
      </div>
      <div className="text-center w-full">
        <p className="text-xs font-semibold text-slate-200">{metric.name}</p>
        <p className="text-[9px] text-slate-500">{t('performance.target')}: {displayTarget}</p>
      </div>
      {/* Sparkline */}
      <div className="w-full h-6">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={sparkline} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={`sparkGrad-${metric.name}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={strokeColor} stopOpacity={0.3} />
                <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="value" stroke={strokeColor} strokeWidth={1.5} fill={`url(#sparkGrad-${metric.name})`} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}

// ── Cache Strategy Card ────────────────────────────────
function CacheStrategyCard({ entry }: { entry: CacheStrategyEntry }) {
  const Icon = CACHE_TYPE_ICON[entry.type] || Server;
  const hitColor = entry.hitRate >= 90 ? 'text-emerald-400' : entry.hitRate >= 80 ? 'text-amber-400' : 'text-red-400';
  const barColor = entry.hitRate >= 90 ? '[&>div]:bg-emerald-500' : entry.hitRate >= 80 ? '[&>div]:bg-amber-500' : '[&>div]:bg-red-500';

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-3.5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-violet-500/15">
              <Icon className="size-3.5 text-violet-400" />
            </div>
            <span className="text-xs font-medium text-slate-200">{t(entry.name)}</span>
          </div>
          <Badge variant="outline" className={cn('text-[9px]', hitColor === 'text-emerald-400' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : hitColor === 'text-amber-400' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-red-500/20 text-red-300 border-red-500/30')}>
            {entry.hitRate}%
          </Badge>
        </div>
        <Progress value={entry.hitRate} className={cn('h-1.5 bg-slate-700', barColor)} />
        <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
          <span>TTL: {entry.ttlLabel}</span>
          <span>SWR: {entry.swrLabel}</span>
        </div>
      </div>
    </motion.div>
  );
}

// ── Lazy Module Row ────────────────────────────────────
function LazyModuleRow({ module: mod, onToggle }: { module: LazyLoadingModule; onToggle: (id: string) => void }) {
  const { t } = useI18n();
  const prioConf = PRIORITY_CONFIG[mod.priority];
  const maxChunkSize = 35; // for bar width

  return (
    <motion.div initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }}
      className={cn(
        'group flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-slate-700/30',
        mod.loaded ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-slate-700/50 bg-slate-800/40',
      )}
    >
      {/* Toggle */}
      <button onClick={() => onToggle(mod.id)} className="shrink-0 focus:outline-none" aria-label={`Toggle ${mod.name}`}>
        <div className={cn(
          'flex size-8 items-center justify-center rounded-lg transition-colors',
          mod.loaded ? 'bg-emerald-500/20' : 'bg-slate-700/50',
        )}>
          {mod.loaded ? <CheckCircle className="size-4 text-emerald-400" /> : <XCircle className="size-4 text-slate-500" />}
        </div>
      </button>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-slate-200 font-mono truncate">{mod.name}</span>
          <Badge variant="outline" className={cn('text-[9px] px-1.5 py-0', prioConf.badge)}>{t(`performance.priority${mod.priority.charAt(0).toUpperCase() + mod.priority.slice(1)}`)}</Badge>
        </div>
        <div className="mt-1.5 flex items-center gap-3">
          {/* Chunk size bar */}
          <div className="flex-1 max-w-[120px]">
            <div className="h-2 rounded-full bg-slate-700/50 overflow-hidden">
              <motion.div
                className={cn('h-full rounded-full', mod.loaded ? 'bg-emerald-500' : 'bg-violet-500')}
                initial={{ width: 0 }}
                animate={{ width: `${(mod.chunkSize / maxChunkSize) * 100}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            </div>
          </div>
          <span className="text-[10px] text-slate-400 tabular-nums">{mod.chunkSize}KB</span>
          <span className="text-[10px] text-slate-500 tabular-nums">{mod.loadTime}ms</span>
        </div>
      </div>

      {/* Status */}
      <Badge variant="outline" className={cn('shrink-0 text-[9px]', mod.loaded ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-slate-600/30 text-slate-400 border-slate-600/30')}>
        {mod.loaded ? t('performance.loaded') : t('performance.lazyLoad')}
      </Badge>
    </motion.div>
  );
}

// ── Budget Bar ─────────────────────────────────────────
function BudgetBar({ item }: { item: BudgetItem }) {
  const { t } = useI18n();
  const pct = (item.actual / item.budget) * 100;
  const isOver = item.actual > item.budget;
  const isAmber = pct >= 80 && !isOver;

  const barColor = isOver ? 'bg-red-500' : isAmber ? 'bg-amber-500' : 'bg-emerald-500';
  const textColor = isOver ? 'text-red-400' : isAmber ? 'text-amber-400' : 'text-emerald-400';

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-200">{item.category}</span>
        <span className={cn('text-xs tabular-nums font-medium', textColor)}>
          {item.actual}/{item.budget} {item.unit}
        </span>
      </div>
      <div className="h-2.5 rounded-full bg-slate-700/50 overflow-hidden">
        <motion.div
          className={cn('h-full rounded-full', barColor)}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(pct, 100)}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
      <div className="flex items-center justify-between text-[10px]">
        <span className={cn(textColor)}>{pct.toFixed(1)}% {t('performance.percentUsed')}</span>
        {isOver && <span className="text-red-400 font-medium">⚠ {t('performance.overBudget')}</span>}
        {isAmber && <span className="text-amber-400 font-medium">⚠ {t('performance.nearLimit')}</span>}
      </div>
    </motion.div>
  );
}

// ── Waterfall Depth Visualization ──────────────────────
function WaterfallDepthViz({ depth }: { depth: number }) {
  return (
    <div className="flex items-end gap-1 h-16">
      {Array.from({ length: depth }, (_, i) => (
        <motion.div
          key={i}
          className={cn('w-8 rounded-t', i === 0 ? 'bg-emerald-500/60' : i === depth - 1 ? 'bg-violet-500/60' : 'bg-slate-600/60')}
          initial={{ height: 0 }}
          animate={{ height: `${60 - i * 12}px` }}
          transition={{ duration: 0.4, delay: i * 0.1 }}
        />
      ))}
    </div>
  );
}

// ── Custom Tooltip for Cache Trend ─────────────────────
function CacheTrendTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  const { t } = useI18n();
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-xs shadow-xl">
      <p className="text-slate-300 font-medium">{label}</p>
      <p className="text-emerald-400 tabular-nums">{t('performance.hitRateLabel')}: {payload[0].value}%</p>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────
export default function PerformanceDashboard() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<TabId>('vitals');
  const [lazyModuleStates, setLazyModuleStates] = useState<Record<string, boolean>>(
    Object.fromEntries(MOCK_DATA.lazyModules.map((m) => [m.id, m.loaded])),
  );
  const [purgeToast, setPurgeToast] = useState(false);

  const data = MOCK_DATA;

  const handleToggleModule = (id: string) => {
    setLazyModuleStates((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handlePurgeCache = () => {
    setPurgeToast(true);
    setTimeout(() => setPurgeToast(false), 3000);
  };

  // Pie chart data for bundle composition
  const pieData = useMemo(() => [
    { name: 'performance.loadedModules', value: data.lazyModules.filter((m) => lazyModuleStates[m.id]).reduce((s, m) => s + m.chunkSize, 0), color: '#34d399' },
    { name: 'performance.lazyModules', value: data.lazyModules.filter((m) => !lazyModuleStates[m.id]).reduce((s, m) => s + m.chunkSize, 0), color: '#8b5cf6' },
  ], [data.lazyModules, lazyModuleStates]);

  const initialBundle = data.lazyModules.filter((m) => lazyModuleStates[m.id]).reduce((s, m) => s + m.chunkSize, 0);
  const totalBundle = data.lazyModules.reduce((s, m) => s + m.chunkSize, 0);

  // ── Tab Content Renderers ──────────────────────────
  const renderVitals = () => (
    <div className="space-y-5">
      {/* Score + Gauges Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <PerformanceScoreGauge score={data.performanceScore} />

        <div className="space-y-3">
          {/* JS Bundle Progress */}
          <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Package className="size-4 text-violet-400" />
                <span className="text-xs font-semibold text-slate-200">{t('performance.jsBundleSize')}</span>
              </div>
              <span className="text-xs text-slate-400 tabular-nums">
                {data.jsBundleSize}/{data.jsBundleBudget}KB
              </span>
            </div>
            <Progress value={(data.jsBundleSize / data.jsBundleBudget) * 100} className="h-2 bg-slate-700 [&>div]:bg-violet-500" />
            <p className="mt-1.5 text-[10px] text-amber-400">
              ⚠ {t('performance.usedNearBudget')} {(data.jsBundleSize / data.jsBundleBudget * 100).toFixed(1)}%
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-3 text-center">
              <p className="text-lg font-bold text-emerald-400 tabular-nums">{data.cacheHitRate}%</p>
              <p className="text-[9px] text-slate-500 mt-0.5">{t('performance.cacheHitRateLabel')}</p>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-3 text-center">
              <p className="text-lg font-bold text-violet-400">{data.cdnBandwidthSaved}</p>
              <p className="text-[9px] text-slate-500 mt-0.5">{t('performance.cdnSaved')}</p>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-3 text-center">
              <p className="text-lg font-bold text-emerald-400 tabular-nums">{data.imageOptimizationRate}%</p>
              <p className="text-[9px] text-slate-500 mt-0.5">{t('performance.imageOptimizationRate')}</p>
            </div>
          </div>

          {/* CSS Bundle */}
          <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] text-slate-400">CSS Bundle</span>
              <span className="text-[10px] text-emerald-400 tabular-nums">{data.cssBundleSize}KB</span>
            </div>
            <Progress value={(data.cssBundleSize / 50) * 100} className="h-1.5 bg-slate-700 [&>div]:bg-emerald-500" />
          </div>
        </div>
      </div>

      {/* Radial Gauges for each metric */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {data.metrics.map((metric) => (
          <RadialGauge key={metric.name} metric={metric} sparkline={data.sparklines[metric.name] || []} />
        ))}
      </div>

      {/* Sparkline summary */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingDown className="size-4 text-emerald-400" />
          <h4 className="text-xs font-semibold text-slate-200">{t('performance.perfTrend7d')}</h4>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          {data.metrics.map((metric) => {
            const sparkline = data.sparklines[metric.name] || [];
            const first = sparkline[0]?.value ?? 0;
            const last = sparkline[sparkline.length - 1]?.value ?? 0;
            const improved = last <= first;
            return (
              <div key={metric.name} className="text-center">
                <p className="text-[10px] text-slate-400 mb-1">{metric.name}</p>
                <p className={cn('text-xs font-medium tabular-nums', improved ? 'text-emerald-400' : 'text-red-400')}>
                  {improved ? '↓' : '↑'} {Math.abs(((last - first) / first) * 100).toFixed(1)}%
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderCache = () => (
    <div className="space-y-5">
      {/* Cache Strategy Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {data.cacheStrategies.map((entry) => (
          <CacheStrategyCard key={entry.id} entry={entry} />
        ))}
      </div>

      {/* Cache Hit Rate Trend */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="size-4 text-emerald-400" />
          <h4 className="text-xs font-semibold text-slate-200">{t('performance.cacheHitTrend24h')}</h4>
        </div>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.cacheTrend} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
              <defs>
                <linearGradient id="cacheTrendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34d399" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={{ stroke: '#334155' }} tickLine={false} />
              <YAxis domain={[80, 95]} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={{ stroke: '#334155' }} tickLine={false} tickFormatter={(v: number) => `${v}%`} />
              <Tooltip content={<CacheTrendTooltip />} />
              <Area type="monotone" dataKey="hitRate" stroke="#34d399" strokeWidth={2} fill="url(#cacheTrendGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* CDN Config + Efficiency Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* CDN Config */}
        <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Cloud className="size-4 text-violet-400" />
            <h4 className="text-xs font-semibold text-slate-200">{t('performance.cdnConfigTitle')}</h4>
          </div>
          <div className="space-y-2 text-[11px]">
            <div className="flex justify-between"><span className="text-slate-400">{t('performance.provider')}</span><span className="text-slate-200 font-medium">{data.cdnConfig.provider}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">{t('performance.edgeNodes')}</span><span className="text-slate-200 font-medium">{data.cdnConfig.edgeLocations}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">{t('performance.hitRateLabel')}</span><span className="text-emerald-400 font-medium">{data.cdnConfig.cacheHitRate}%</span></div>
            <div className="flex justify-between"><span className="text-slate-400">{t('performance.bandwidthSaved')}</span><span className="text-violet-400 font-medium">{data.cdnConfig.bandwidthSaved}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">SSL</span><span className="text-slate-200 font-medium">{data.cdnConfig.ssl}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">HTTP/2</span><span className="text-emerald-400 font-medium">{data.cdnConfig.http2 ? t('performance.enabledMark') : t('performance.notEnabledMark')}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Brotli</span><span className="text-emerald-400 font-medium">{data.cdnConfig.brotli ? t('performance.enabledMark') : t('performance.notEnabledMark')}</span></div>
          </div>
        </div>

        {/* Efficiency Summary */}
        <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="size-4 text-emerald-400" />
            <h4 className="text-xs font-semibold text-slate-200">{t('performance.cacheEfficiency')}</h4>
          </div>
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="text-slate-400">{t('performance.avgHitRate')}</span>
                <span className="text-emerald-400 font-medium tabular-nums">
                  {(data.cacheStrategies.reduce((s, c) => s + c.hitRate, 0) / data.cacheStrategies.length).toFixed(1)}%
                </span>
              </div>
              <Progress value={data.cacheStrategies.reduce((s, c) => s + c.hitRate, 0) / data.cacheStrategies.length} className="h-2 bg-slate-700 [&>div]:bg-emerald-500" />
            </div>
            <div>
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="text-slate-400">{t('performance.cdnEdgeHitRate')}</span>
                <span className="text-emerald-400 font-medium tabular-nums">{data.cdnConfig.cacheHitRate}%</span>
              </div>
              <Progress value={data.cdnConfig.cacheHitRate} className="h-2 bg-slate-700 [&>div]:bg-emerald-500" />
            </div>
            <div className="pt-2 border-t border-slate-700/50">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">{t('performance.totalCacheEntries')}</span>
                <span className="text-slate-200 font-medium">1,247</span>
              </div>
              <div className="flex items-center justify-between text-[11px] mt-1">
                <span className="text-slate-400">{t('performance.totalCacheSize')}</span>
                <span className="text-slate-200 font-medium">284MB</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Purge Cache Button */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline" size="sm"
          className="border-violet-500/30 bg-violet-500/10 text-violet-300 hover:bg-violet-500/20 hover:text-violet-200"
          onClick={handlePurgeCache}
        >
          <RefreshCw className="mr-1.5 size-3.5" />
          {t('performance.purgeCache')}
        </Button>
        <AnimatePresence>
          {purgeToast && (
            <motion.span initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
              className="text-xs text-emerald-400 flex items-center gap-1"
            >
              <CheckCircle className="size-3" /> {t('performance.cachePurged')}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </div>
  );

  const renderLazy = () => (
    <div className="space-y-5">
      {/* Bundle Composition Pie */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Layers className="size-4 text-violet-400" />
            <h4 className="text-xs font-semibold text-slate-200">{t('performance.bundleComposition')}</h4>
          </div>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" stroke="none">
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [`${value}KB`, '']}
                  contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '11px' }}
                  itemStyle={{ color: '#e2e8f0' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-4 text-[10px] mt-2">
            <div className="flex items-center gap-1.5"><div className="size-2.5 rounded-full bg-emerald-500" /><span className="text-slate-400">{t('performance.loaded')}</span></div>
            <div className="flex items-center gap-1.5"><div className="size-2.5 rounded-full bg-violet-500" /><span className="text-slate-400">{t('performance.lazyLoad')}</span></div>
          </div>
        </div>

        {/* Initial vs Total Bundle */}
        <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Package className="size-4 text-emerald-400" />
            <h4 className="text-xs font-semibold text-slate-200">{t('performance.bundleComparison')}</h4>
          </div>
          <div className="space-y-4 mt-2">
            <div>
              <div className="flex items-center justify-between text-[11px] mb-1.5">
                <span className="text-slate-400">{t('performance.initialLoad')}</span>
                <span className="text-emerald-400 font-medium tabular-nums">{initialBundle}KB</span>
              </div>
              <div className="h-4 rounded-full bg-slate-700/50 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-emerald-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${(initialBundle / totalBundle) * 100}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-[11px] mb-1.5">
                <span className="text-slate-400">{t('performance.fullLoad')}</span>
                <span className="text-violet-400 font-medium tabular-nums">{totalBundle}KB</span>
              </div>
              <div className="h-4 rounded-full bg-slate-700/50 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-violet-500"
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              </div>
            </div>
            <div className="pt-2 border-t border-slate-700/50 text-center">
              <p className="text-xs text-slate-300">
                {t('performance.lazySaved')} <span className="text-emerald-400 font-bold tabular-nums">{totalBundle - initialBundle}KB</span>
                <span className="text-slate-500 ml-1">({((1 - initialBundle / totalBundle) * 100).toFixed(0)}%)</span>
              </p>
            </div>
          </div>

          {/* Critical Path */}
          <div className="mt-4 pt-3 border-t border-slate-700/50">
            <h5 className="text-[10px] font-medium text-slate-400 mb-2">{t('performance.criticalLoadPath')}</h5>
            <div className="flex flex-wrap gap-1.5">
              {data.lazyModules.filter((m) => lazyModuleStates[m.id]).map((m) => (
                <Badge key={m.id} variant="outline" className="text-[9px] bg-emerald-500/10 text-emerald-300 border-emerald-500/20">
                  {m.name}
                </Badge>
              ))}
            </div>
            <h5 className="text-[10px] font-medium text-slate-400 mt-2 mb-2">{t('performance.lazyLoadPath')}</h5>
            <div className="flex flex-wrap gap-1.5">
              {data.lazyModules.filter((m) => !lazyModuleStates[m.id]).map((m) => (
                <Badge key={m.id} variant="outline" className="text-[9px] bg-violet-500/10 text-violet-300 border-violet-500/20">
                  {m.name}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Module List */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Layers className="size-4 text-violet-400" />
            <h4 className="text-xs font-semibold text-slate-200">{t('performance.moduleLoadStatus')}</h4>
          </div>
          <span className="text-[10px] text-slate-500">{t('performance.clickToToggle')}</span>
        </div>
        <div className="space-y-2">
          {data.lazyModules.map((mod) => (
            <LazyModuleRow key={mod.id} module={{ ...mod, loaded: lazyModuleStates[mod.id] }} onToggle={handleToggleModule} />
          ))}
        </div>
      </div>
    </div>
  );

  const renderBudget = () => (
    <div className="space-y-5">
      {/* Budget Bars */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="size-4 text-violet-400" />
          <h4 className="text-xs font-semibold text-slate-200">{t('performance.budgetVsActual')}</h4>
        </div>
        <div className="space-y-4">
          {data.budget.items.map((item) => (
            <BudgetBar key={item.category} item={item} />
          ))}
        </div>
      </div>

      {/* Request Breakdown + Waterfall */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Request Breakdown */}
        <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="size-4 text-emerald-400" />
            <h4 className="text-xs font-semibold text-slate-200">{t('performance.requestAnalysis')}</h4>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="size-3 rounded-full bg-emerald-500" />
                <span className="text-xs text-slate-300">{t('performance.firstPartyRequests')}</span>
              </div>
              <span className="text-sm font-bold text-emerald-400 tabular-nums">{data.budget.firstPartyRequests}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="size-3 rounded-full bg-violet-500" />
                <span className="text-xs text-slate-300">{t('performance.thirdPartyRequests')}</span>
              </div>
              <span className="text-sm font-bold text-violet-400 tabular-nums">{data.budget.thirdPartyRequests}</span>
            </div>
            <Separator className="bg-slate-700/50" />
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">{t('performance.totalRequests')}</span>
              <span className="text-sm font-bold text-slate-200 tabular-nums">{data.budget.firstPartyRequests + data.budget.thirdPartyRequests}</span>
            </div>
          </div>
        </div>

        {/* Waterfall Depth */}
        <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
          <div className="flex items-center gap-2 mb-3">
            <ArrowDown className="size-4 text-violet-400" />
            <h4 className="text-xs font-semibold text-slate-200">{t('performance.waterfallDepthTitle')}</h4>
          </div>
          <div className="flex items-end gap-4">
            <WaterfallDepthViz depth={data.budget.waterfallDepth} />
            <div className="space-y-1 text-[10px]">
              <div className="flex items-center gap-1.5">
                <div className="size-2 rounded-full bg-emerald-500/60" />
                <span className="text-slate-400">{t('performance.criticalPath')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="size-2 rounded-full bg-slate-600/60" />
                <span className="text-slate-400">{t('performance.subResources')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="size-2 rounded-full bg-violet-500/60" />
                <span className="text-slate-400">{t('performance.asyncLoad')}</span>
              </div>
              <p className="text-emerald-400 font-medium mt-2">{t('performance.depthLevel', { depth: data.budget.waterfallDepth })}</p>
              <p className="text-slate-500">{t('performance.targetDepth')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Optimization Recommendations */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="size-4 text-amber-400" />
          <h4 className="text-xs font-semibold text-slate-200">{t('performance.optimizationSuggestions')}</h4>
        </div>
        <div className="space-y-2">
          {data.recommendations.map((rec, i) => {
            const prioConf = PRIORITY_CONFIG[rec.priority];
            return (
              <motion.div
                key={rec.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, delay: i * 0.05 }}
                className="flex items-start gap-3 rounded-lg border border-slate-700/50 bg-slate-800/40 p-3"
              >
                <div className={cn('flex size-6 shrink-0 items-center justify-center rounded-md mt-0.5', prioConf.bg)}>
                  <Zap className={cn('size-3', prioConf.color)} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xs font-medium text-slate-200">{t(rec.title)}</p>
                    <Badge variant="outline" className={cn('text-[9px] px-1.5 py-0', prioConf.badge)}>{prioConf.text}</Badge>
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-emerald-500/10 text-emerald-300 border-emerald-500/20">
                      {t('performance.savings')} {rec.estimatedSavings}
                    </Badge>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400 leading-relaxed">{t(rec.description)}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Performance Alerts */}
      <div className="space-y-2">
        {data.alerts.map((alert) => (
          <motion.div key={alert.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <Alert className={cn(
              'border-amber-500/20 bg-amber-500/5',
              alert.severity === 'critical' && 'border-red-500/20 bg-red-500/5',
            )}>
              <AlertTriangle className={cn('size-4', alert.severity === 'critical' ? 'text-red-400' : 'text-amber-400')} />
              <AlertTitle className={cn('text-xs', alert.severity === 'critical' ? 'text-red-300' : 'text-amber-300')}>
                {t(alert.title)}
              </AlertTitle>
              <AlertDescription className={cn('text-[11px]', alert.severity === 'critical' ? 'text-red-300/70' : 'text-amber-300/70')}>
                {t(alert.description)}
                <span className="ml-2 text-slate-500">
                  <Clock className="inline size-2.5 mr-0.5" />
                  {format(parseISO(alert.timestamp), 'MMM d HH:mm')}
                </span>
              </AlertDescription>
            </Alert>
          </motion.div>
        ))}
      </div>
    </div>
  );

  // ── Tab content map ──
  const tabContent: Record<TabId, () => React.ReactNode> = {
    vitals: renderVitals,
    cache: renderCache,
    lazy: renderLazy,
    budget: renderBudget,
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
      <Card className="border-slate-700 bg-slate-800/80 backdrop-blur-sm overflow-hidden">
        {/* Top accent bar */}
        <div className="absolute inset-x-0 top-0 h-1 bg-emerald-500" />

        <CardHeader className="pb-0 pt-5">
          <CardTitle className="flex items-center gap-2 text-base text-slate-100">
            <Gauge className="size-5 text-emerald-400" />
            {t('performance.title')}
          </CardTitle>
        </CardHeader>

        <CardContent className="p-4 pt-3 space-y-4">
          {/* Tab navigation */}
          <div className="flex items-center gap-1 rounded-lg bg-slate-900/60 p-1">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all flex-1 justify-center',
                    isActive
                      ? 'bg-emerald-500/20 text-emerald-300 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50',
                  )}
                >
                  <TabIcon className="size-3.5" />
                  <span className="hidden sm:inline">{tab.id === 'vitals' ? tab.label : t(tab.label)}</span>
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
            >
              {tabContent[activeTab]()}
            </motion.div>
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Export Types & Mock Data for consolidation ─────────
export type {
  PerformanceMetric,
  CacheStrategyEntry,
  CDNConfig,
  LazyLoadingModule,
  BudgetItem,
  PerformanceBudget,
  SparklinePoint,
  CacheTrendPoint,
  OptimizationRecommendation,
  PerformanceAlert,
  PerformanceData,
};

export { MOCK_DATA };
