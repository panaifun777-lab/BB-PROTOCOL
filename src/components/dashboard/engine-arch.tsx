'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Cog,
  ArrowRight,
  Zap,
  BarChart3,
  FunctionSquare,
  ChevronDown,
  ChevronRight,
  Copy,
  CheckCircle,
  Cpu,
  HardDrive,
  Activity,
  Clock,
  Sigma,
  Flame,
  TrendingDown,
  ArrowUpRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { cn } from '@/lib/utils';
import { useI18n } from '@/hooks/use-i18n';

// ── Types ──────────────────────────────────────────────
interface FunctionDef {
  name: string;
  signature: string;
  description: string;
  complexity: string;
}

interface MathParam {
  symbol: string;
  name: string;
  value: number;
  description: string;
}

interface MathModel {
  formula: string;
  parameters: MathParam[];
}

interface TestInfo {
  unit: number;
  property: number;
  benchmark: number;
  passing: number;
}

interface Module {
  id: string;
  name: string;
  category: string;
  description: string;
  version: string;
  linesOfCode: number;
  status: string;
  performanceMs: number;
  throughput: string;
  memoryUsage: string;
  functions: FunctionDef[];
  mathModel: MathModel;
  tests: TestInfo;
}

interface SystemMetrics {
  totalLoc: number;
  totalFunctions: number;
  totalTests: number;
  passingTests: number;
  avgLatencyMs: number;
  memoryTotal: string;
  cpuUsage: string;
  uptime: string;
}

interface Benchmark {
  operation: string;
  p50: number;
  p95: number;
  p99: number;
  unit: string;
}

interface DataFlow {
  source: string;
  target: string;
  dataType: string;
  frequency: string;
  latency: string;
}

interface EngineArchData {
  modules: Module[];
  systemMetrics: SystemMetrics;
  performanceBenchmarks: Benchmark[];
  dataFlow: DataFlow[];
}

// ── Color Config ───────────────────────────────────────
const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string; label: string }> = {
  core: { bg: 'bg-emerald-500/15', text: 'text-emerald-300', border: 'border-emerald-500/30', label: 'Core' },
  oracle: { bg: 'bg-violet-500/15', text: 'text-violet-300', border: 'border-violet-500/30', label: 'Oracle' },
  zkp: { bg: 'bg-amber-500/15', text: 'text-amber-300', border: 'border-amber-500/30', label: 'ZKP' },
  discovery: { bg: 'bg-sky-500/15', text: 'text-sky-300', border: 'border-sky-500/30', label: 'Discovery' },
  economics: { bg: 'bg-rose-500/15', text: 'text-rose-300', border: 'border-rose-500/30', label: 'Economics' },
  monitoring: { bg: 'bg-orange-500/15', text: 'text-orange-300', border: 'border-orange-500/30', label: 'Monitoring' },
};

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  production: { bg: 'bg-emerald-500/15', text: 'text-emerald-300', border: 'border-emerald-500/30' },
  beta: { bg: 'bg-amber-500/15', text: 'text-amber-300', border: 'border-amber-500/30' },
};

const CATEGORIES = ['All', 'Core', 'Oracle', 'ZKP', 'Discovery', 'Economics', 'Monitoring'] as const;

// ── Helpers ────────────────────────────────────────────
function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

function getLatencyColor(ms: number): string {
  if (ms < 1) return 'text-emerald-400';
  if (ms < 10) return 'text-sky-400';
  if (ms < 100) return 'text-amber-400';
  return 'text-red-400';
}

function getLatencyBg(ms: number): string {
  if (ms < 1) return 'bg-emerald-500/10';
  if (ms < 10) return 'bg-sky-500/10';
  if (ms < 100) return 'bg-amber-500/10';
  return 'bg-red-500/10';
}

// ── Custom Tooltip for Benchmark Chart ─────────────────
function BenchmarkTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string; color: string }>; label?: string }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-xs shadow-xl">
      <p className="text-slate-200 font-medium mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="tabular-nums" style={{ color: entry.color }}>
          {entry.dataKey === 'p50' ? 'P50' : entry.dataKey === 'p95' ? 'P95' : 'P99'}: {entry.value}{payload[0] && 'ms'}
        </p>
      ))}
    </div>
  );
}

// ── Copy Button ────────────────────────────────────────
function CopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const { t } = useI18n();

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className={cn(
        'shrink-0 flex items-center justify-center rounded-md p-1 transition-colors',
        copied ? 'bg-emerald-500/20' : 'bg-slate-700/50 hover:bg-slate-600/50',
        className,
      )}
      aria-label={t('engine.copy')}
    >
      {copied ? (
        <CheckCircle className="size-3.5 text-emerald-400" />
      ) : (
        <Copy className="size-3.5 text-slate-400" />
      )}
    </button>
  );
}

// ── Module Card ────────────────────────────────────────
function ModuleCard({ mod }: { mod: Module }) {
  const [functionsExpanded, setFunctionsExpanded] = useState(false);
  const [mathExpanded, setMathExpanded] = useState(false);
  const { t } = useI18n();
  const catConf = CATEGORY_COLORS[mod.category] || CATEGORY_COLORS.core;
  const statusConf = STATUS_COLORS[mod.status] || STATUS_COLORS.production;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-xl border border-slate-700 bg-slate-800/60 p-4"
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="flex size-9 items-center justify-center rounded-lg bg-orange-500/15 shrink-0">
          <Cog className="size-4.5 text-orange-400" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-mono font-semibold text-slate-200">{mod.name}</span>
            <Badge variant="outline" className="text-[9px] bg-slate-600/20 text-slate-300 border-slate-600/30">v{mod.version}</Badge>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">{mod.description}</p>
        </div>
      </div>

      {/* Category + Status Badges */}
      <div className="flex items-center gap-2 mb-3">
        <Badge variant="outline" className={cn('text-[9px]', catConf.bg, catConf.text, catConf.border)}>
          {catConf.label}
        </Badge>
        <Badge variant="outline" className={cn('text-[9px]', statusConf.bg, statusConf.text, statusConf.border)}>
          {mod.status === 'production' ? 'Production' : 'Beta'}
        </Badge>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className={cn('rounded-lg p-2 text-center border border-slate-700/50', getLatencyBg(mod.performanceMs))}>
          <p className={cn('text-sm font-bold tabular-nums', getLatencyColor(mod.performanceMs))}>
            {mod.performanceMs < 1 ? mod.performanceMs.toFixed(1) : mod.performanceMs}{mod.performanceMs >= 1 ? 'ms' : 'ms'}
          </p>
          <p className="text-[9px] text-slate-500">{t('engine.latency')}</p>
        </div>
        <div className="rounded-lg p-2 text-center border border-slate-700/50 bg-emerald-500/5">
          <p className="text-sm font-bold tabular-nums text-emerald-400">{mod.throughput}</p>
          <p className="text-[9px] text-slate-500">{t('engine.throughput')}</p>
        </div>
        <div className="rounded-lg p-2 text-center border border-slate-700/50 bg-violet-500/5">
          <p className="text-sm font-bold tabular-nums text-violet-400">{mod.memoryUsage}</p>
          <p className="text-[9px] text-slate-500">{t('engine.memory')}</p>
        </div>
      </div>

      {/* Tests Summary */}
      <div className="flex items-center gap-3 mb-3 text-[10px]">
        <span className="text-slate-500">{t('engine.testLabel')}</span>
        <span className="text-emerald-400 font-medium tabular-nums">{mod.tests.passing}/{mod.tests.unit + mod.tests.property + mod.tests.benchmark} {t('engine.passing')}</span>
        <span className="text-slate-600">|</span>
        <span className="text-slate-400">Unit {mod.tests.unit}</span>
        <span className="text-slate-400">Prop {mod.tests.property}</span>
        <span className="text-slate-400">Bench {mod.tests.benchmark}</span>
      </div>

      {/* Functions List (Collapsible) */}
      <div className="mb-3">
        <button
          onClick={() => setFunctionsExpanded(!functionsExpanded)}
          className="w-full flex items-center gap-2 text-[11px] text-slate-400 hover:text-slate-300 transition-colors"
        >
          {functionsExpanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
          <FunctionSquare className="size-3" />
          <span className="font-medium">{t('engine.functionList')}</span>
          <span className="text-slate-600">({mod.functions.length})</span>
        </button>
        <AnimatePresence>
          {functionsExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-2 space-y-1.5 pl-5">
                {mod.functions.map((fn) => (
                  <div key={fn.name} className="rounded-md bg-slate-900/60 p-2 border border-slate-700/30">
                    <div className="flex items-start justify-between gap-2">
                      <code className="text-[10px] font-mono text-emerald-300/80 break-all">{fn.signature}</code>
                      <Badge variant="outline" className="shrink-0 text-[8px] bg-slate-700/30 text-slate-400 border-slate-600/30">{fn.complexity}</Badge>
                    </div>
                    <p className="text-[9px] text-slate-500 mt-1">{fn.description}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Math Model Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setMathExpanded(!mathExpanded)}
        className={cn(
          'w-full h-7 text-[10px] transition-all',
          mathExpanded
            ? 'border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
            : 'border-slate-600 bg-slate-700/30 text-slate-300 hover:bg-slate-600/30',
        )}
      >
        <Sigma className="mr-1.5 size-3" />
        {mathExpanded ? t('engine.collapseMathModel') : t('engine.viewMathModel')}
      </Button>

      {/* Math Model (Expandable) */}
      <AnimatePresence>
        {mathExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
              <div className="flex items-center gap-2 mb-2">
                <Sigma className="size-3.5 text-amber-400" />
                <span className="text-[11px] font-semibold text-amber-300">{t('engine.mathModel')}</span>
              </div>
              <div className="relative rounded-md bg-slate-900/80 p-3 mb-3">
                <pre className="text-sm font-mono text-amber-200/90 whitespace-pre-wrap break-all">{mod.mathModel.formula}</pre>
                <CopyButton text={mod.mathModel.formula} className="absolute top-2 right-2" />
              </div>
              <div className="space-y-1.5">
                <div className="grid grid-cols-[auto_1fr_auto_auto] gap-x-3 gap-y-1 text-[10px]">
                  <span className="text-slate-500 font-medium">{t('engine.symbol')}</span>
                  <span className="text-slate-500 font-medium">{t('engine.name')}</span>
                  <span className="text-slate-500 font-medium">{t('engine.value')}</span>
                  <span className="text-slate-500 font-medium">{t('engine.description')}</span>
                </div>
                {mod.mathModel.parameters.map((param) => (
                  <div key={param.symbol} className="grid grid-cols-[auto_1fr_auto_auto] gap-x-3 gap-y-1 text-[10px] py-1 border-t border-slate-700/30">
                    <code className="font-mono text-amber-300 font-bold">{param.symbol}</code>
                    <span className="text-slate-300">{param.name}</span>
                    <span className="text-emerald-400 tabular-nums font-medium">
                      {param.value === 0 ? '—' : param.value >= 100 ? param.value.toLocaleString() : param.value}
                    </span>
                    <span className="text-slate-500">{param.description}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Data Flow Arrow ────────────────────────────────────
function FlowArrow({ flow, index }: { flow: DataFlow; index: number }) {
  const latencyMs = parseFloat(flow.latency);
  const latencyColor = latencyMs < 1 ? 'emerald' : latencyMs < 10 ? 'sky' : latencyMs < 100 ? 'amber' : 'red';
  const latencyTextClass = `text-${latencyColor}-400`;
  const latencyBgClass = `bg-${latencyColor}-500/10`;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.06 }}
      className="rounded-lg border border-slate-700/50 bg-slate-800/40 p-3"
    >
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="outline" className="text-[9px] bg-violet-500/15 text-violet-300 border-violet-500/30 font-mono">
          {flow.source}
        </Badge>
        <motion.div
          animate={{ x: [0, 4, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut', delay: index * 0.2 }}
        >
          <ArrowRight className="size-3.5 text-slate-500" />
        </motion.div>
        <Badge variant="outline" className="text-[9px] bg-emerald-500/15 text-emerald-300 border-emerald-500/30 font-mono">
          {flow.target}
        </Badge>
      </div>
      <div className="flex items-center gap-3 mt-2 text-[10px]">
        <Badge variant="outline" className="text-[8px] bg-slate-600/20 text-slate-300 border-slate-600/30">
          {flow.dataType}
        </Badge>
        <span className="text-slate-500">
          <Clock className="inline size-2.5 mr-0.5" />
          {flow.frequency}
        </span>
        <span className={cn('font-medium tabular-nums', latencyTextClass)}>
          {flow.latency}
        </span>
      </div>
    </motion.div>
  );
}

// ── Data Flow Visual Diagram ───────────────────────────
function DataFlowDiagram({ flows }: { flows: DataFlow[] }) {
  const { t } = useI18n();
  // Group flows by source
  const sources = useMemo(() => {
    const map = new Map<string, DataFlow[]>();
    flows.forEach((f) => {
      const list = map.get(f.source) || [];
      list.push(f);
      map.set(f.source, list);
    });
    return map;
  }, [flows]);

  const sourceColors: Record<string, string> = {
    ECEOracle: '#8b5cf6',
    WeightCalculator: '#34d399',
    MCPRouter: '#38bdf8',
    SplitCalculator: '#fb7185',
    PoUEProver: '#fbbf24',
    CircuitMonitor: '#fb923c',
  };

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-4">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="size-4 text-emerald-400" />
        <h4 className="text-xs font-semibold text-slate-200">{t('engine.dataFlowTopology')}</h4>
      </div>
      <div className="space-y-4">
        {Array.from(sources.entries()).map(([source, targets], si) => (
          <div key={source}>
            <div className="flex items-center gap-2 mb-2">
              <div
                className="flex size-7 items-center justify-center rounded-lg text-[9px] font-bold shrink-0"
                style={{ backgroundColor: `${sourceColors[source] || '#94a3b8'}20`, color: sourceColors[source] || '#94a3b8' }}
              >
                {source.substring(0, 3).toUpperCase()}
              </div>
              <span className="text-xs font-mono font-medium text-slate-200">{source}</span>
              <div className="flex-1 h-px bg-slate-700/50" />
            </div>
            <div className="pl-9 space-y-1.5">
              {targets.map((t, ti) => (
                <motion.div
                  key={`${t.target}-${t.dataType}`}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: si * 0.1 + ti * 0.05 }}
                  className="flex items-center gap-2"
                >
                  <motion.div
                    animate={{ x: [0, 3, 0] }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut', delay: si * 0.3 + ti * 0.15 }}
                  >
                    <ArrowRight className="size-3 text-slate-600" />
                  </motion.div>
                  <div className="flex items-center gap-2 flex-1 rounded-md bg-slate-900/40 px-2.5 py-1.5 border border-slate-700/30">
                    <span className="text-[10px] font-mono text-slate-300">{t.target}</span>
                    <Badge variant="outline" className="text-[8px] bg-slate-700/30 text-slate-400 border-slate-600/30">
                      {t.dataType}
                    </Badge>
                    <span className="ml-auto text-[9px] text-slate-500 tabular-nums">{t.latency}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────
export default function EngineArch() {
  const [data, setData] = useState<EngineArchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const { t } = useI18n();

  useEffect(() => {
    fetch('/api/engine-arch')
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // ── Filtered modules ─────────────────────────────
  const filteredModules = useMemo(() => {
    if (!data) return [];
    if (categoryFilter === 'All') return data.modules;
    return data.modules.filter((m) => m.category === categoryFilter.toLowerCase());
  }, [data, categoryFilter]);

  // ── Benchmark summary ────────────────────────────
  const benchmarkSummary = useMemo(() => {
    if (!data) return { fastest: '', slowest: '', avgP99: 0 };
    const sorted = [...data.performanceBenchmarks].sort((a, b) => a.p99 - b.p99);
    return {
      fastest: sorted[0]?.operation || '',
      slowest: sorted[sorted.length - 1]?.operation || '',
      avgP99: data.performanceBenchmarks.reduce((s, b) => s + b.p99, 0) / data.performanceBenchmarks.length,
    };
  }, [data]);

  // ── Benchmark chart data (use log scale for visual clarity) ──
  const benchmarkChartData = useMemo(() => {
    if (!data) return [];
    return data.performanceBenchmarks.map((b) => ({
      name: b.operation.length > 20 ? b.operation.substring(0, 18) + '…' : b.operation,
      fullName: b.operation,
      p50: b.p50,
      p95: b.p95,
      p99: b.p99,
      unit: b.unit,
    }));
  }, [data]);

  // ── Loading State ──────────────────────────────────
  if (loading || !data) {
    return (
      <Card className="border-slate-700 bg-slate-800/80">
        <CardContent className="p-6 flex items-center justify-center min-h-[300px]">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-3"
          >
            <Cog className="size-8 text-orange-400 animate-spin" />
            <p className="text-slate-400 text-sm">{t('engine.loadingData')}</p>
          </motion.div>
        </CardContent>
      </Card>
    );
  }

  // ── Tab 1: Engine Modules ─────────────────────────
  const renderModules = () => (
    <div className="space-y-5">
      {/* Overview Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: t('engine.modules'), value: data.modules.length, color: 'text-slate-200', bg: 'bg-slate-800/60', icon: Cog },
          { label: 'LoC', value: formatNumber(data.systemMetrics.totalLoc), color: 'text-emerald-400', bg: 'bg-emerald-500/5', icon: HardDrive },
          { label: t('engine.functions'), value: data.systemMetrics.totalFunctions, color: 'text-violet-400', bg: 'bg-violet-500/5', icon: FunctionSquare },
          { label: t('engine.tests'), value: data.systemMetrics.passingTests, color: 'text-sky-400', bg: 'bg-sky-500/5', icon: CheckCircle },
          { label: t('engine.avgLatency'), value: `${data.systemMetrics.avgLatencyMs}ms`, color: 'text-amber-400', bg: 'bg-amber-500/5', icon: Zap },
        ].map((stat) => (
          <div key={stat.label} className={cn('rounded-lg border border-slate-700 p-3 text-center', stat.bg)}>
            <stat.icon className={cn('size-3.5 mx-auto mb-1', stat.color)} />
            <p className={cn('text-lg font-bold tabular-nums', stat.color)}>{stat.value}</p>
            <p className="text-[9px] text-slate-500">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-1.5">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={cn(
              'px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors',
              categoryFilter === cat
                ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                : 'bg-slate-800/40 text-slate-400 border border-slate-700/50 hover:bg-slate-700/30 hover:text-slate-300',
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Module Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <AnimatePresence mode="popLayout">
          {filteredModules.map((mod) => (
            <ModuleCard key={mod.id} mod={mod} />
          ))}
        </AnimatePresence>
      </div>

      {filteredModules.length === 0 && (
        <div className="text-center py-8">
          <Cog className="size-6 text-slate-600 mx-auto mb-2" />
          <p className="text-xs text-slate-500">{t('engine.noModulesInCategory')}</p>
        </div>
      )}
    </div>
  );

  // ── Tab 2: Data Flow ──────────────────────────────
  const renderDataFlow = () => (
    <div className="space-y-5">
      {/* System Metrics Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: t('engine.totalLoc'), value: formatNumber(data.systemMetrics.totalLoc), sub: 'LoC', icon: HardDrive, color: 'text-emerald-400' },
          { label: t('engine.cpuUsage'), value: data.systemMetrics.cpuUsage, sub: t('engine.cpuCurrent'), icon: Cpu, color: 'text-amber-400' },
          { label: t('engine.memoryUsageLabel'), value: data.systemMetrics.memoryTotal, sub: t('engine.memoryTotal'), icon: Activity, color: 'text-violet-400' },
          { label: t('engine.uptime'), value: data.systemMetrics.uptime, sub: t('engine.availability'), icon: Clock, color: 'text-sky-400' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border border-slate-700 bg-slate-800/60 p-3">
            <div className="flex items-center gap-2 mb-1">
              <stat.icon className={cn('size-3.5', stat.color)} />
              <span className="text-[10px] text-slate-500">{stat.label}</span>
            </div>
            <p className={cn('text-lg font-bold tabular-nums', stat.color)}>{stat.value}</p>
            <p className="text-[9px] text-slate-600">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Data Flow Diagram */}
      <DataFlowDiagram flows={data.dataFlow} />

      {/* Flow List */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <ArrowRight className="size-4 text-violet-400" />
          <h4 className="text-xs font-semibold text-slate-200">{t('engine.dataFlowDetails')}</h4>
          <Badge variant="outline" className="text-[9px] bg-slate-600/20 text-slate-300 border-slate-600/30">
            {t('engine.flowCount', { count: data.dataFlow.length })}
          </Badge>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {data.dataFlow.map((flow, i) => (
            <FlowArrow key={`${flow.source}-${flow.target}-${flow.dataType}`} flow={flow} index={i} />
          ))}
        </div>
      </div>
    </div>
  );

  // ── Tab 3: Performance Benchmarks ──────────────────
  const renderBenchmarks = () => (
    <div className="space-y-5">
      {/* Performance Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="size-3.5 text-emerald-400" />
            <span className="text-[10px] text-slate-500">{t('engine.fastestOp')}</span>
          </div>
          <p className="text-xs font-medium text-emerald-300">{benchmarkSummary.fastest}</p>
        </div>
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="size-3.5 text-red-400" />
            <span className="text-[10px] text-slate-500">{t('engine.slowestOp')}</span>
          </div>
          <p className="text-xs font-medium text-red-300">{benchmarkSummary.slowest}</p>
        </div>
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="size-3.5 text-amber-400" />
            <span className="text-[10px] text-slate-500">{t('engine.avgP99')}</span>
          </div>
          <p className="text-lg font-bold tabular-nums text-amber-400">{benchmarkSummary.avgP99.toFixed(1)}ms</p>
        </div>
      </div>

      {/* Benchmark Chart */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="size-4 text-emerald-400" />
          <h4 className="text-xs font-semibold text-slate-200">{t('engine.benchmarkTitle')}</h4>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={benchmarkChartData}
              layout="vertical"
              margin={{ top: 5, right: 30, bottom: 5, left: 10 }}
            >
              <XAxis
                type="number"
                tick={{ fontSize: 9, fill: '#94a3b8' }}
                axisLine={{ stroke: '#334155' }}
                tickLine={false}
                tickFormatter={(v: number) => `${v}ms`}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 9, fill: '#94a3b8' }}
                axisLine={{ stroke: '#334155' }}
                tickLine={false}
                width={120}
              />
              <Tooltip content={<BenchmarkTooltip />} />
              <Bar dataKey="p50" radius={[0, 2, 2, 0]} barSize={6}>
                {benchmarkChartData.map((_entry, index) => (
                  <Cell key={`p50-${index}`} fill="#34d399" />
                ))}
              </Bar>
              <Bar dataKey="p95" radius={[0, 2, 2, 0]} barSize={6}>
                {benchmarkChartData.map((_entry, index) => (
                  <Cell key={`p95-${index}`} fill="#fbbf24" />
                ))}
              </Bar>
              <Bar dataKey="p99" radius={[0, 2, 2, 0]} barSize={6}>
                {benchmarkChartData.map((_entry, index) => (
                  <Cell key={`p99-${index}`} fill="#f87171" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center gap-6 mt-2 text-[10px]">
          <div className="flex items-center gap-1.5">
            <div className="size-2.5 rounded-sm bg-emerald-400" />
            <span className="text-slate-400">P50</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="size-2.5 rounded-sm bg-amber-400" />
            <span className="text-slate-400">P95</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="size-2.5 rounded-sm bg-red-400" />
            <span className="text-slate-400">P99</span>
          </div>
        </div>
      </div>

      {/* Benchmark Table */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/60 overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-4 p-3 border-b border-slate-700/50 text-[10px] font-semibold text-slate-500">
          <span>{t('engine.operation')}</span>
          <span className="w-16 text-right">P50</span>
          <span className="w-16 text-right">P95</span>
          <span className="w-16 text-right">P99</span>
          <span className="w-10 text-right">{t('engine.unit')}</span>
        </div>
        <ScrollArea className="max-h-72">
          {data.performanceBenchmarks.map((b, i) => (
            <motion.div
              key={b.operation}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.15, delay: i * 0.03 }}
              className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-4 p-2.5 px-3 border-b border-slate-700/20 text-[10px] hover:bg-slate-700/10 transition-colors"
            >
              <span className="text-slate-300 truncate">{b.operation}</span>
              <span className="w-16 text-right tabular-nums text-emerald-400">{b.p50}</span>
              <span className="w-16 text-right tabular-nums text-amber-400">{b.p95}</span>
              <span className="w-16 text-right tabular-nums text-red-400">{b.p99}</span>
              <span className="w-10 text-right text-slate-500">{b.unit}</span>
            </motion.div>
          ))}
        </ScrollArea>
      </div>
    </div>
  );

  // ── Tab 4: Math Models ─────────────────────────────
  const renderMathModels = () => (
    <div className="space-y-5">
      {/* All Formulas */}
      {data.modules.map((mod, mi) => {
        const catConf = CATEGORY_COLORS[mod.category] || CATEGORY_COLORS.core;
        return (
          <motion.div
            key={mod.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: mi * 0.08 }}
            className="rounded-xl border border-slate-700 bg-slate-800/60 p-4"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={cn('flex size-8 items-center justify-center rounded-lg', catConf.bg)}>
                <Sigma className={cn('size-4', catConf.text)} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono font-semibold text-slate-200">{mod.name}</span>
                  <Badge variant="outline" className={cn('text-[9px]', catConf.bg, catConf.text, catConf.border)}>
                    {catConf.label}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Formula Display */}
            <div className="relative rounded-lg bg-slate-900/80 p-4 mb-3 border border-slate-700/50">
              <pre className="text-base font-mono text-amber-200/90 whitespace-pre-wrap break-all leading-relaxed">{mod.mathModel.formula}</pre>
              <CopyButton text={mod.mathModel.formula} className="absolute top-2 right-2" />
            </div>

            {/* Parameter Table */}
            <div className="rounded-lg border border-slate-700/50 overflow-hidden">
              <div className="grid grid-cols-[auto_1fr_auto_1fr] gap-x-3 p-2.5 bg-slate-900/40 text-[9px] font-semibold text-slate-500 border-b border-slate-700/30">
                <span>{t('engine.symbol')}</span>
                <span>{t('engine.name')}</span>
                <span>{t('engine.value')}</span>
                <span>{t('engine.description')}</span>
              </div>
              {mod.mathModel.parameters.map((param, pi) => (
                <div
                  key={param.symbol}
                  className={cn(
                    'grid grid-cols-[auto_1fr_auto_1fr] gap-x-3 p-2.5 text-[10px]',
                    pi % 2 === 0 ? 'bg-slate-800/30' : 'bg-slate-800/60',
                  )}
                >
                  <code className="font-mono text-amber-300 font-bold">{param.symbol}</code>
                  <span className="text-slate-300">{param.name}</span>
                  <span className="text-emerald-400 tabular-nums font-medium">
                    {param.value === 0 ? '—' : param.value >= 100 ? param.value.toLocaleString() : param.value}
                  </span>
                  <span className="text-slate-500">{param.description}</span>
                </div>
              ))}
            </div>

            {/* Lambda Diagram for IFD Weight Function */}
            {mod.id === 'weight-calculator' && (
              <div className="mt-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingDown className="size-3.5 text-emerald-400" />
                  <span className="text-[11px] font-semibold text-emerald-300">{t('engine.ifdWeightVector')}</span>
                </div>
                <div className="flex items-end gap-1 h-24">
                  {mod.mathModel.parameters.map((param) => {
                    const maxVal = 0.30;
                    const heightPct = (param.value / maxVal) * 100;
                    const barColors: Record<string, string> = {
                      'λ₁': 'bg-emerald-500',
                      'λ₂': 'bg-sky-500',
                      'λ₃': 'bg-violet-500',
                      'λ₄': 'bg-amber-500',
                      'λ₅': 'bg-red-500',
                    };
                    return (
                      <div key={param.symbol} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-[9px] text-emerald-400 tabular-nums font-medium">{param.value}</span>
                        <motion.div
                          className={cn('w-full rounded-t-sm', barColors[param.symbol] || 'bg-slate-500')}
                          initial={{ height: 0 }}
                          animate={{ height: `${heightPct}%` }}
                          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
                        />
                        <span className="text-[8px] text-slate-400 font-mono">{param.symbol}</span>
                      </div>
                    );
                  })}
                </div>
                <p className="text-[9px] text-slate-500 mt-2 text-center">{t('engine.weightNormalization', { sum: mod.mathModel.parameters.reduce((s, p) => s + p.value, 0).toFixed(2) })}</p>
              </div>
            )}
          </motion.div>
        );
      })}

      {/* AFC Tokenomics Section */}
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Flame className="size-4 text-amber-400" />
          <span className="text-xs font-semibold text-amber-300">{t('engine.afcTokenomics')}</span>
        </div>

        {/* Deflation Formula */}
        <div className="relative rounded-lg bg-slate-900/80 p-4 mb-3 border border-slate-700/50">
          <pre className="text-sm font-mono text-amber-200/90 whitespace-pre-wrap break-all">
            {'Supply(t) = Supply₀ × (1 - burnRate)^t\nBurnRate = (vaultBuyback + protocolFee) / circulatingSupply\nVaultBuyback = avatarBps × revenue'}
          </pre>
          <CopyButton text="Supply(t) = Supply₀ × (1 - burnRate)^t" className="absolute top-2 right-2" />
        </div>

        {/* Burn & Buyback Visualization */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-3">
            <div className="flex items-center gap-2 mb-2">
              <Flame className="size-3.5 text-red-400" />
              <span className="text-[10px] font-medium text-slate-300">{t('engine.burnRate')}</span>
            </div>
            <div className="flex items-end gap-1 h-16">
              {[12, 18.5, 24, 31, 38, 45, 52].map((val, i) => (
                <div key={i} className="flex-1 flex flex-col items-center">
                  <motion.div
                    className="w-full rounded-t-sm bg-red-500"
                    initial={{ height: 0 }}
                    animate={{ height: `${(val / 55) * 100}%` }}
                    transition={{ duration: 0.4, ease: 'easeOut', delay: i * 0.05 }}
                  />
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between mt-2 text-[8px] text-slate-500">
              <span>Oct</span>
              <span>→</span>
              <span>Mar</span>
            </div>
            <p className="text-[9px] text-red-400 mt-1">{t('engine.monthlyBurnIncrease')}</p>
          </div>

          <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-3">
            <div className="flex items-center gap-2 mb-2">
              <ArrowUpRight className="size-3.5 text-emerald-400" />
              <span className="text-[10px] font-medium text-slate-300">{t('engine.buybackRate')}</span>
            </div>
            <div className="flex items-end gap-1 h-16">
              {[20, 22, 25, 28, 32, 36, 40].map((val, i) => (
                <div key={i} className="flex-1 flex flex-col items-center">
                  <motion.div
                    className="w-full rounded-t-sm bg-emerald-500"
                    initial={{ height: 0 }}
                    animate={{ height: `${(val / 45) * 100}%` }}
                    transition={{ duration: 0.4, ease: 'easeOut', delay: i * 0.05 }}
                  />
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between mt-2 text-[8px] text-slate-500">
              <span>Oct</span>
              <span>→</span>
              <span>Mar</span>
            </div>
            <p className="text-[9px] text-emerald-400 mt-1">{t('engine.vaultBuybackRatio')}</p>
          </div>
        </div>

        {/* Token Economics Key Metrics */}
        <div className="grid grid-cols-3 gap-2 mt-3">
          <div className="rounded-lg border border-slate-700/50 bg-slate-800/40 p-2 text-center">
            <p className="text-sm font-bold text-red-400 tabular-nums">5%</p>
            <p className="text-[8px] text-slate-500">{t('engine.burnRate')}</p>
          </div>
          <div className="rounded-lg border border-slate-700/50 bg-slate-800/40 p-2 text-center">
            <p className="text-sm font-bold text-emerald-400 tabular-nums">20%</p>
            <p className="text-[8px] text-slate-500">{t('engine.buybackRate')}</p>
          </div>
          <div className="rounded-lg border border-slate-700/50 bg-slate-800/40 p-2 text-center">
            <p className="text-sm font-bold text-amber-400 tabular-nums">15.7%</p>
            <p className="text-[8px] text-slate-500">{t('engine.valueCaptureRate')}</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <Card className="border-slate-700 bg-slate-800/80">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-orange-500/15">
            <Cog className="size-5 text-orange-400" />
          </div>
          <div>
            <CardTitle className="text-lg text-slate-100">{t('engine.rustEngine')}</CardTitle>
            <p className="text-[11px] text-slate-500 mt-0.5">{t('engine.engineSubtitle')}</p>
          </div>
          <Badge className="ml-auto bg-orange-500/15 text-orange-300 border-orange-500/30 text-[10px]">
            <Cog className="mr-1 size-3" />
            Engine Core
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="modules" className="w-full">
          <TabsList className="bg-slate-900/50 border border-slate-700/50 h-9 p-0.5">
            <TabsTrigger
              value="modules"
              className="data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-300 text-[10px] h-8 px-3"
            >
              <Cog className="mr-1.5 size-3" />
              {t('engine.engineModules')}
            </TabsTrigger>
            <TabsTrigger
              value="dataflow"
              className="data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-300 text-[10px] h-8 px-3"
            >
              <ArrowRight className="mr-1.5 size-3" />
              {t('engine.dataFlow')}
            </TabsTrigger>
            <TabsTrigger
              value="benchmarks"
              className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-300 text-[10px] h-8 px-3"
            >
              <BarChart3 className="mr-1.5 size-3" />
              {t('engine.performanceBenchmark')}
            </TabsTrigger>
            <TabsTrigger
              value="mathmodels"
              className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-300 text-[10px] h-8 px-3"
            >
              <Sigma className="mr-1.5 size-3" />
              {t('engine.mathModels')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="modules" className="mt-4">
            <AnimatePresence mode="wait">
              <motion.div
                key="modules"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
              >
                {renderModules()}
              </motion.div>
            </AnimatePresence>
          </TabsContent>

          <TabsContent value="dataflow" className="mt-4">
            <AnimatePresence mode="wait">
              <motion.div
                key="dataflow"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
              >
                {renderDataFlow()}
              </motion.div>
            </AnimatePresence>
          </TabsContent>

          <TabsContent value="benchmarks" className="mt-4">
            <AnimatePresence mode="wait">
              <motion.div
                key="benchmarks"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
              >
                {renderBenchmarks()}
              </motion.div>
            </AnimatePresence>
          </TabsContent>

          <TabsContent value="mathmodels" className="mt-4">
            <AnimatePresence mode="wait">
              <motion.div
                key="mathmodels"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
              >
                {renderMathModels()}
              </motion.div>
            </AnimatePresence>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
