'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  Cpu,
  HardDrive,
  Network,
  Zap,
  AlertTriangle,
  Shield,
  Eye,
  TrendingUp,
  TrendingDown,
  Minus,
  Copy,
  ExternalLink,
  Plus,
  Bell,
  BellOff,
  Search,
  BarChart3,
  Radio,
  CheckCircle2,
  XCircle,
  Clock,
  Server,
  Globe,
  Link2,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useI18n } from '@/hooks/use-i18n';
import { format, parseISO } from 'date-fns';
import {
  useMonitoringStream,
  type SystemMetricsPayload,
  type ChainEventPayload,
  type AnomalyAlertPayload,
} from '@/hooks/use-monitoring-stream';

// ── Static Data (from API) ───────────────────────────────────

interface PrometheusMetric {
  name: string;
  value: number;
  unit: string;
  status: 'healthy' | 'warning' | 'critical';
  threshold: string;
  description: string;
}

interface AlertRule {
  id: string;
  name: string;
  condition: string;
  severity: 'critical' | 'warning' | 'info';
  status: 'active' | 'silenced' | 'disabled';
  triggerCount: number;
  lastTriggered: string;
}

interface Anomaly {
  description: string;
  detectionMethod: string;
  detectedAt: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'investigating' | 'resolved' | 'monitoring';
}

interface GrafanaDashboard {
  name: string;
  url: string;
  panels: number;
  lastUpdated: string;
}

interface MonitoringAPIData {
  prometheusMetrics: PrometheusMetric[];
  alertRules: AlertRule[];
  anomalyDetection: {
    status: string;
    anomalies: Anomaly[];
    baselineWindow: string;
    detectionMethod: string;
  };
  grafanaDashboards: GrafanaDashboard[];
}

// ── Deterministic anomaly trend (24 data points) ─────────────

function generateAnomalyTrend(): { hour: string; score: number }[] {
  const data: { hour: string; score: number }[] = [];
  for (let i = 0; i < 24; i++) {
    const hour = `${i.toString().padStart(2, '0')}:00`;
    // Deterministic sin-wave based score
    const baseScore = 2 + Math.sin(i * 0.5) * 1.5 + Math.sin(i * 0.3 + 1) * 0.8;
    data.push({ hour, score: Math.round(Math.max(0, baseScore) * 10) / 10 });
  }
  return data;
}

const ANOMALY_TREND = generateAnomalyTrend();

// ── Color Helpers ────────────────────────────────────────────

function getMetricStatusColor(value: number, warning: number, critical: number): string {
  if (value >= critical) return 'text-red-400';
  if (value >= warning) return 'text-amber-400';
  return 'text-emerald-400';
}

function getMetricBgColor(value: number, warning: number, critical: number): string {
  if (value >= critical) return 'bg-red-500/10 border-red-500/20';
  if (value >= warning) return 'bg-amber-500/10 border-amber-500/20';
  return 'bg-emerald-500/10 border-emerald-500/20';
}

function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'critical': return 'bg-red-500/15 text-red-400 border-red-500/30';
    case 'warning': return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    case 'info': return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
    default: return 'bg-slate-500/15 text-slate-400 border-slate-500/30';
  }
}

function getSeverityDot(severity: string): string {
  switch (severity) {
    case 'critical': return 'bg-red-400';
    case 'warning': return 'bg-amber-400';
    case 'info': return 'bg-blue-400';
    default: return 'bg-slate-400';
  }
}

function getEventTypeColor(eventName: string): string {
  if (eventName.includes('Avatar')) return 'bg-violet-500/15 text-violet-400 border-violet-500/30';
  if (eventName.includes('Skill')) return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
  if (eventName.includes('Revenue') || eventName.includes('Split')) return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
  if (eventName.includes('Circuit')) return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
  if (eventName.includes('Delegation')) return 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30';
  if (eventName.includes('Burn') || eventName.includes('Token')) return 'bg-red-500/15 text-red-400 border-red-500/30';
  if (eventName.includes('Liquidity')) return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
  return 'bg-slate-500/15 text-slate-400 border-slate-500/30';
}

function getEventCategory(eventName: string): string {
  if (eventName.includes('Avatar')) return 'Avatar';
  if (eventName.includes('Skill')) return 'Skill';
  if (eventName.includes('Revenue') || eventName.includes('Split')) return 'Revenue';
  if (eventName.includes('Circuit')) return 'Circuit';
  if (eventName.includes('Delegation')) return 'Delegation';
  return 'Other';
}

// ── Sparkline Component ──────────────────────────────────────

function MiniSparkline({ data, dataKey, color }: { data: Record<string, number>[]; dataKey: string; color: string }) {
  if (data.length < 2) return null;
  return (
    <ResponsiveContainer width="100%" height={32}>
      <LineChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
        <Line
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ── Trend Arrow ──────────────────────────────────────────────

function TrendArrow({ current, previous }: { current: number; previous: number }) {
  const diff = current - previous;
  if (diff > 1) return <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />;
  if (diff < -1) return <TrendingDown className="w-3.5 h-3.5 text-red-400" />;
  return <Minus className="w-3.5 h-3.5 text-slate-400" />;
}

// ── Relative Time ────────────────────────────────────────────

function relativeTime(dateStr: string, t: (key: string, params?: Record<string, string | number>) => string): string {
  if (dateStr === t('monitoring.neverTriggered')) return t('monitoring.neverTriggered');
  try {
    const date = new Date(dateStr);
    const now = new Date('2026-05-25T18:55:00Z');
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 60) return t('deployment.minutesAgo', { n: diffMin });
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return t('deployment.hoursAgo', { n: diffH });
    const diffD = Math.floor(diffH / 24);
    return t('deployment.daysAgo', { n: diffD });
  } catch {
    return dateStr;
  }
}

// ── Main Component ───────────────────────────────────────────

export default function MonitoringCenter() {
  const { t } = useI18n();
  const { isConnected, systemMetrics, metricsHistory, chainEvents, lastAnomaly, anomalyHistory } = useMonitoringStream();
  const [activeTab, setActiveTab] = useState('system');
  const [apiData, setApiData] = useState<MonitoringAPIData | null>(null);
  const [eventFilter, setEventFilter] = useState<string>('all');
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  // Fetch static API data
  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/monitoring');
        const data = await res.json();
        setApiData(data);
      } catch (err) {
        console.error('Failed to fetch monitoring data:', err);
      }
    }
    fetchData();
  }, []);

  // Copy tx hash
  const copyHash = useCallback((hash: string) => {
    navigator.clipboard.writeText(hash).catch(() => {});
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  }, []);

  // Default metrics for when socket hasn't connected yet
  const metrics = systemMetrics || {
    cpu: 34,
    memory: 62,
    diskUsage: 45,
    networkIn: 245,
    networkOut: 128,
    activeConnections: 1247,
    requestRate: 3420,
    errorRate: 0.12,
    p50Latency: 45,
    p95Latency: 180,
    p99Latency: 420,
    timestamp: Date.now(),
  };

  // Build sparkline data from history
  const cpuHistory = metricsHistory.map((m, i) => ({ i, value: m.cpu }));
  const memHistory = metricsHistory.map((m, i) => ({ i, value: m.memory }));
  const reqHistory = metricsHistory.map((m, i) => ({ i, value: m.requestRate }));
  const errHistory = metricsHistory.map((m, i) => ({ i, value: m.errorRate }));

  const prevMetrics = metricsHistory.length >= 2 ? metricsHistory[metricsHistory.length - 2] : metrics;

  // Filter chain events
  const allChainEvents = chainEvents.length > 0
    ? chainEvents
    : (apiData ? (apiData as unknown as Record<string, unknown>).chainEvents as ChainEventPayload[] : []);
  const filteredEvents = eventFilter === 'all'
    ? allChainEvents
    : allChainEvents.filter((e) => getEventCategory(e.eventName) === eventFilter);

  const alertRules = apiData?.alertRules || [];
  const prometheusMetrics = apiData?.prometheusMetrics || [];
  const anomalyDetection = apiData?.anomalyDetection;
  const grafanaDashboards = apiData?.grafanaDashboards || [];

  // Alert stats
  const activeCount = alertRules.filter((r) => r.status === 'active').length;
  const silencedCount = alertRules.filter((r) => r.status === 'silenced').length;
  const disabledCount = alertRules.filter((r) => r.status === 'disabled').length;

  // Latency chart data
  const latencyData = [
    { name: 'P50', value: metrics.p50Latency, fill: '#34d399' },
    { name: 'P95', value: metrics.p95Latency, fill: '#fbbf24' },
    { name: 'P99', value: metrics.p99Latency, fill: '#f87171' },
  ];

  return (
    <Card className="bg-slate-800/80 border-slate-700 overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
              <Activity className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <CardTitle className="text-base text-slate-100">{t('monitoring.title')}</CardTitle>
              <p className="text-xs text-slate-400 mt-0.5">{t('monitoring.title')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Real-time indicator */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <div className={cn(
                'w-1.5 h-1.5 rounded-full',
                isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
              )} />
              <span className="text-[10px] text-emerald-300 font-medium">
                {isConnected ? t('monitoring.realtimeMonitor') : t('monitoring.connecting')}
              </span>
            </div>
            {/* System health */}
            <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              {t('monitoring.healthy')}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-slate-900/60 border border-slate-700/50 w-full grid grid-cols-4 h-9">
            <TabsTrigger value="system" className="text-xs data-[state=active]:bg-slate-700 data-[state=active]:text-emerald-300">
              <Cpu className="w-3 h-3 mr-1" />
              {t('monitoring.systemMonitor')}
            </TabsTrigger>
            <TabsTrigger value="chain" className="text-xs data-[state=active]:bg-slate-700 data-[state=active]:text-emerald-300">
              <Link2 className="w-3 h-3 mr-1" />
              {t('monitoring.chainEventsTab')}
            </TabsTrigger>
            <TabsTrigger value="alerts" className="text-xs data-[state=active]:bg-slate-700 data-[state=active]:text-emerald-300">
              <Bell className="w-3 h-3 mr-1" />
              {t('monitoring.alertRulesTab')}
            </TabsTrigger>
            <TabsTrigger value="anomaly" className="text-xs data-[state=active]:bg-slate-700 data-[state=active]:text-emerald-300">
              <Search className="w-3 h-3 mr-1" />
              {t('monitoring.anomalyDetectionTab')}
            </TabsTrigger>
          </TabsList>
            {/* ═══════════ Tab 1: System Monitoring ═══════════ */}
            {activeTab === 'system' && (
              <motion.div
                key="system"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="mt-4 space-y-4"
              >
                {/* 4 Main Metric Cards 2x2 */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* CPU */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.05 }}
                    className={cn('rounded-xl border p-3', getMetricBgColor(metrics.cpu, 70, 90))}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <Cpu className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-[11px] text-slate-400">CPU</span>
                      </div>
                      <TrendArrow current={metrics.cpu} previous={prevMetrics.cpu} />
                    </div>
                    <div className="flex items-end justify-between">
                      <span className={cn('text-xl font-bold', getMetricStatusColor(metrics.cpu, 70, 90))}>
                        {metrics.cpu}%
                      </span>
                      <div className="w-16 h-8">
                        <MiniSparkline data={cpuHistory} dataKey="value" color={metrics.cpu > 70 ? '#fbbf24' : '#34d399'} />
                      </div>
                    </div>
                  </motion.div>

                  {/* Memory */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                    className={cn('rounded-xl border p-3', getMetricBgColor(metrics.memory, 75, 90))}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <HardDrive className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-[11px] text-slate-400">{t('monitoring.memory')}</span>
                      </div>
                      <TrendArrow current={metrics.memory} previous={prevMetrics.memory} />
                    </div>
                    <div className="flex items-end justify-between">
                      <span className={cn('text-xl font-bold', getMetricStatusColor(metrics.memory, 75, 90))}>
                        {metrics.memory}%
                      </span>
                      <div className="w-16 h-8">
                        <MiniSparkline data={memHistory} dataKey="value" color={metrics.memory > 75 ? '#fbbf24' : '#34d399'} />
                      </div>
                    </div>
                  </motion.div>

                  {/* Request Rate */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.15 }}
                    className="rounded-xl border p-3 bg-violet-500/10 border-violet-500/20"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-[11px] text-slate-400">{t('monitoring.requestRateLabel')}</span>
                      </div>
                      <TrendArrow current={metrics.requestRate} previous={prevMetrics.requestRate} />
                    </div>
                    <div className="flex items-end justify-between">
                      <span className="text-xl font-bold text-violet-400">
                        {metrics.requestRate.toLocaleString()}
                      </span>
                      <div className="w-16 h-8">
                        <MiniSparkline data={reqHistory} dataKey="value" color="#a78bfa" />
                      </div>
                    </div>
                    <span className="text-[9px] text-slate-500">req/s</span>
                  </motion.div>

                  {/* Error Rate */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className={cn('rounded-xl border p-3', getMetricBgColor(metrics.errorRate * 50, 75, 90))}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-[11px] text-slate-400">{t('monitoring.errorRateLabel')}</span>
                      </div>
                      <TrendArrow current={metrics.errorRate} previous={prevMetrics.errorRate} />
                    </div>
                    <div className="flex items-end justify-between">
                      <span className={cn('text-xl font-bold', metrics.errorRate > 1 ? 'text-red-400' : 'text-emerald-400')}>
                        {metrics.errorRate}%
                      </span>
                      <div className="w-16 h-8">
                        <MiniSparkline data={errHistory} dataKey="value" color={metrics.errorRate > 1 ? '#f87171' : '#34d399'} />
                      </div>
                    </div>
                  </motion.div>
                </div>

                {/* Latency + Network row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {/* Latency Distribution */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                    className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-4"
                  >
                    <h4 className="text-xs font-medium text-slate-300 mb-3 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {t('monitoring.latencyDistribution')}
                    </h4>
                    <ResponsiveContainer width="100%" height={80}>
                      <BarChart data={latencyData} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                        <Tooltip
                          contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 11 }}
                          formatter={(value: number) => [`${value}ms`, t('monitoring.latencyLabel')]}
                        />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                          {latencyData.map((entry, index) => (
                            <rect key={index} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="flex items-center justify-between mt-2 text-[10px] text-slate-500">
                      <span>P50: {metrics.p50Latency}ms</span>
                      <span>P95: {metrics.p95Latency}ms</span>
                      <span>P99: {metrics.p99Latency}ms</span>
                    </div>
                  </motion.div>

                  {/* Network I/O + Connections */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-4 space-y-3"
                  >
                    <h4 className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                      <Network className="w-3.5 h-3.5 text-slate-400" />
                      {t('monitoring.networkIO')}
                    </h4>
                    {/* Network In */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">{t('monitoring.inbound')}</span>
                        <span className="text-emerald-400 font-medium">{metrics.networkIn} Mbps</span>
                      </div>
                      <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, (metrics.networkIn / 500) * 100)}%` }}
                        />
                      </div>
                    </div>
                    {/* Network Out */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">{t('monitoring.outbound')}</span>
                        <span className="text-violet-400 font-medium">{metrics.networkOut} Mbps</span>
                      </div>
                      <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-violet-500 to-violet-400 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, (metrics.networkOut / 300) * 100)}%` }}
                        />
                      </div>
                    </div>
                    {/* Active Connections */}
                    <div className="pt-2 border-t border-slate-700/50 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Server className="w-3 h-3 text-slate-500" />
                        <span className="text-[11px] text-slate-400">{t('monitoring.activeConnectionsLabel')}</span>
                      </div>
                      <span className="text-sm font-bold text-slate-200">{metrics.activeConnections.toLocaleString()}</span>
                    </div>
                  </motion.div>
                </div>

                {/* Prometheus Metrics */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                  className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-4"
                >
                  <h4 className="text-xs font-medium text-slate-300 mb-3 flex items-center gap-1.5">
                    <BarChart3 className="w-3.5 h-3.5 text-slate-400" />
                    {t('monitoring.prometheusMetrics')}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {prometheusMetrics.map((m) => (
                      <div key={m.name} className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/50">
                        <div className={cn('w-2 h-2 rounded-full', m.status === 'healthy' ? 'bg-emerald-400' : m.status === 'warning' ? 'bg-amber-400' : 'bg-red-400')} />
                        <div className="flex-1 min-w-0">
                          <div className="text-[10px] font-mono text-slate-400 truncate">{m.name}</div>
                          <div className="text-xs font-semibold text-slate-200">
                            {typeof m.value === 'number' && m.value < 1 ? m.value.toFixed(3) : m.value.toLocaleString()}{' '}
                            <span className="text-[9px] text-slate-500">{m.unit}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </motion.div>
            )}

            {/* ═══════════ Tab 2: Chain Events ═══════════ */}
            {activeTab === 'chain' && (
              <motion.div
                key="chain"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="mt-4 space-y-4"
              >
                {/* Filter + Status */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {['all', 'Avatar', 'Skill', 'Revenue', 'Circuit', 'Delegation'].map((cat) => (
                      <Button
                        key={cat}
                        variant="ghost"
                        size="sm"
                        onClick={() => setEventFilter(cat)}
                        className={cn(
                          'h-7 text-[10px] px-2.5 rounded-full',
                          eventFilter === cat
                            ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/20'
                            : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'
                        )}
                      >
                        {cat === 'all' ? t('monitoring.allLabel') : t(`monitoring.category${cat}`)}
                      </Button>
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[10px] text-emerald-300 font-medium">{t('monitoring.listening')}</span>
                  </div>
                </div>

                {/* Event Stream */}
                <ScrollArea className="max-h-96">
                  <div className="space-y-2 pr-2">
                    {filteredEvents.map((event, idx) => (
                      <motion.div
                        key={`${event.txHash}-${idx}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="flex items-start gap-3 p-3 rounded-xl border border-slate-700/50 bg-slate-900/40 hover:bg-slate-900/60 transition-colors"
                      >
                        {/* Event type badge */}
                        <Badge className={cn('shrink-0 text-[10px] border', getEventTypeColor(event.eventName))}>
                          {event.eventName}
                        </Badge>

                        {/* Event details */}
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] text-slate-300 font-medium">{event.contract}</span>
                            <span className="text-[10px] text-slate-500">
                              Block #{event.blockNumber.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono text-slate-500">
                              {event.txHash}
                            </span>
                            <button
                              onClick={() => copyHash(event.txHash)}
                              className="p-0.5 rounded hover:bg-slate-700/50 transition-colors"
                              title={t('monitoring.copyTitle')}
                            >
                              <Copy className={cn('w-3 h-3', copiedHash === event.txHash ? 'text-emerald-400' : 'text-slate-500')} />
                            </button>
                          </div>
                          {/* Event data */}
                          {event.data && Object.keys(event.data).length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {Object.entries(event.data).map(([key, val]) => (
                                <span key={key} className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-400">
                                  {key}: {String(val)}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Timestamp */}
                        <span className="text-[10px] text-slate-500 shrink-0">
                          {event.timestamp ? format(parseISO(String(event.timestamp)), 'HH:mm:ss') : '--:--'}
                        </span>
                      </motion.div>
                    ))}

                    {filteredEvents.length === 0 && (
                      <div className="text-center py-8 text-slate-500 text-xs">
                        {t('monitoring.noChainEvents')}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </motion.div>
            )}

            {/* ═══════════ Tab 3: Alert Rules ═══════════ */}
            {activeTab === 'alerts' && (
              <motion.div
                key="alerts"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="mt-4 space-y-4"
              >
                {/* Summary + Add button */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-[11px]">
                    <span className="text-emerald-400 font-medium">{activeCount} {t('common.active')}</span>
                    <span className="text-amber-400">{silencedCount} {t('monitoring.silenced')}</span>
                    <span className="text-slate-500">{disabledCount} {t('monitoring.disabled')}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-[10px] border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    {t('monitoring.addRule')}
                  </Button>
                </div>

                {/* Severity Distribution Mini Chart */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-red-500/60" />
                    <span className="text-[10px] text-slate-400">{t('monitoring.critical')}: {alertRules.filter((r) => r.severity === 'critical').length}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-amber-500/60" />
                    <span className="text-[10px] text-slate-400">{t('monitoring.warning')}: {alertRules.filter((r) => r.severity === 'warning').length}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-blue-500/60" />
                    <span className="text-[10px] text-slate-400">{t('common.info')}: {alertRules.filter((r) => r.severity === 'info').length}</span>
                  </div>
                </div>

                {/* Alert Rule Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {alertRules.map((rule, idx) => (
                    <motion.div
                      key={rule.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.06 }}
                      className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-3 space-y-2"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <div className={cn('w-2 h-2 rounded-full', getSeverityDot(rule.severity))} />
                            <span className="text-xs font-medium text-slate-200 truncate">{rule.name}</span>
                          </div>
                          <div className="text-[10px] font-mono text-slate-500 mt-1 bg-slate-800/60 px-2 py-0.5 rounded">
                            {rule.condition}
                          </div>
                        </div>
                        <Badge className={cn('text-[9px] border shrink-0 ml-2', getSeverityColor(rule.severity))}>
                          {rule.severity}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-700/30">
                        <div className="flex items-center gap-2">
                          {/* Status indicator */}
                          {rule.status === 'active' && (
                            <div className="flex items-center gap-1 text-[10px] text-emerald-400">
                              <Bell className="w-3 h-3" />
                              {t('common.active')}
                            </div>
                          )}
                          {rule.status === 'silenced' && (
                            <div className="flex items-center gap-1 text-[10px] text-amber-400">
                              <BellOff className="w-3 h-3" />
                              {t('monitoring.silenced')}
                            </div>
                          )}
                          {rule.status === 'disabled' && (
                            <div className="flex items-center gap-1 text-[10px] text-slate-500">
                              <XCircle className="w-3 h-3" />
                              {t('monitoring.disabled')}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[9px] h-5 border-slate-600 text-slate-400">
                            {rule.triggerCount}{t('monitoring.timesPer7d')}
                          </Badge>
                          <span className="text-[9px] text-slate-500">
                            {relativeTime(rule.lastTriggered, t)}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ═══════════ Tab 4: Anomaly Detection ═══════════ */}
            {activeTab === 'anomaly' && (
              <motion.div
                key="anomaly"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="mt-4 space-y-4"
              >
                {/* Detection Status Banner */}
                <div className={cn(
                  'rounded-xl border p-3 flex items-center gap-3',
                  anomalyDetection?.status === 'monitoring'
                    ? 'bg-emerald-500/10 border-emerald-500/20'
                    : anomalyDetection?.status === 'anomaly_detected'
                      ? 'bg-red-500/10 border-red-500/20'
                      : 'bg-amber-500/10 border-amber-500/20'
                )}>
                  <div className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center',
                    anomalyDetection?.status === 'monitoring' ? 'bg-emerald-500/20' : 'bg-amber-500/20'
                  )}>
                    {anomalyDetection?.status === 'monitoring' ? (
                      <Eye className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-medium text-slate-200">
                      {anomalyDetection?.status === 'monitoring' ? t('monitoring.normalMonitoring') : t('monitoring.anomalyDetected')}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {t('monitoring.baselineLabel')}: {anomalyDetection?.baselineWindow || '--'} · {t('monitoring.methodLabel')}: {anomalyDetection?.detectionMethod || '--'}
                    </div>
                  </div>
                  <Badge className={cn(
                    'ml-auto text-[9px] border',
                    anomalyDetection?.status === 'monitoring'
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      : 'bg-red-500/15 text-red-400 border-red-500/30'
                  )}>
                    {anomalyDetection?.status !== 'anomaly_detected' ? t('monitoring.normalMonitoring') : t('monitoring.anomalyDetected')}
                  </Badge>
                </div>

                {/* Anomaly Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {anomalyDetection?.anomalies.map((anomaly, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.08 }}
                      className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-3 space-y-2"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-xs font-medium text-slate-200">{anomaly.description}</div>
                          <div className="text-[10px] font-mono text-slate-500 mt-1">{anomaly.detectionMethod}</div>
                        </div>
                        <Badge className={cn('text-[9px] border shrink-0', getSeverityColor(anomaly.severity))}>
                          {anomaly.severity}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-slate-700/30">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span className="text-[10px] text-slate-400">{anomaly.detectedAt}</span>
                        </div>
                        <Badge className={cn(
                          'text-[9px] border',
                          anomaly.status === 'investigating'
                            ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                            : anomaly.status === 'resolved'
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                              : 'bg-slate-500/15 text-slate-400 border-slate-500/30'
                        )}>
                          {anomaly.status}
                        </Badge>
                      </div>
                      {/* Action buttons */}
                      <div className="flex items-center gap-2 pt-1">
                        <Button variant="ghost" size="sm" className="h-6 text-[9px] px-2 text-slate-400 hover:text-slate-200">
                          <Eye className="w-3 h-3 mr-1" />
                          {t('monitoring.detailsBtn')}
                        </Button>
                        <Button variant="ghost" size="sm" className="h-6 text-[9px] px-2 text-slate-400 hover:text-slate-200">
                          <Shield className="w-3 h-3 mr-1" />
                          {t('monitoring.handleBtn')}
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Anomaly Score Trend */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-4"
                >
                  <h4 className="text-xs font-medium text-slate-300 mb-3 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-slate-400" />
                    {t('monitoring.anomalyScoreTrend')}
                  </h4>
                  <ResponsiveContainer width="100%" height={120}>
                    <LineChart data={ANOMALY_TREND} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
                      <XAxis
                        dataKey="hour"
                        tick={{ fontSize: 9, fill: '#64748b' }}
                        axisLine={false}
                        tickLine={false}
                        interval={3}
                      />
                      <YAxis
                        tick={{ fontSize: 9, fill: '#64748b' }}
                        axisLine={false}
                        tickLine={false}
                        width={30}
                      />
                      <Tooltip
                        contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 11 }}
                        formatter={(value: number) => [value.toFixed(1), t('monitoring.anomalyScore')]}
                      />
                      <Line
                        type="monotone"
                        dataKey="score"
                        stroke="#a78bfa"
                        strokeWidth={1.5}
                        dot={false}
                        activeDot={{ r: 3, fill: '#a78bfa' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </motion.div>

                {/* Grafana Dashboard Links */}
                <div>
                  <h4 className="text-xs font-medium text-slate-300 mb-3 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-slate-400" />
                    {t('monitoring.grafanaDashboards')}
                  </h4>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                    {grafanaDashboards.map((dash, idx) => (
                      <motion.div
                        key={dash.name}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.25 + idx * 0.05 }}
                        className="rounded-lg border border-slate-700/50 bg-slate-900/40 p-3 space-y-2"
                      >
                        <div className="text-[11px] font-medium text-slate-200">{dash.name}</div>
                        <div className="text-[9px] text-slate-500">{dash.panels} {t('monitoring.panels')}</div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full h-6 text-[9px] text-violet-400 hover:text-violet-300 hover:bg-violet-500/10"
                        >
                          <ExternalLink className="w-3 h-3 mr-1" />
                          {t('monitoring.openBtn')}
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
        </Tabs>
      </CardContent>
    </Card>
  );
}
