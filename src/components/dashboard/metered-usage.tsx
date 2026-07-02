'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Zap,
  Database,
  Eye,
  Users,
  Loader2,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useI18n } from '@/hooks/use-i18n';
import { format } from 'date-fns';

// ── Safe date formatting helper ────────────────────────
// Handles undefined/null periodStart/periodEnd from the API,
// generating reasonable defaults from the billingPeriod string.
function formatSafeDate(
  dateStr: string | undefined | null,
  fmt: string,
  billingPeriod?: string,
): string {
  try {
    if (dateStr) {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        return format(d, fmt);
      }
    }
    // Fallback: derive from billingPeriod (e.g. "2026-05")
    if (billingPeriod && billingPeriod !== 'all') {
      const [yearStr, monthStr] = billingPeriod.split('-');
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);
      if (!isNaN(year) && !isNaN(month)) {
        // For start date, use 1st of the month; for end date, use last day
        const isEndFormat = fmt.includes('yyyy');
        const d = isEndFormat
          ? new Date(year, month, 0) // last day of month
          : new Date(year, month - 1, 1); // first day of month
        if (!isNaN(d.getTime())) {
          return format(d, fmt);
        }
      }
    }
    return '—';
  } catch {
    return '—';
  }
}

// ── Types ──────────────────────────────────────────────
interface UsageRecord {
  serviceType: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface UsageSummary {
  avatarId: string;
  billingPeriod: string;
  periodStart: string;
  periodEnd: string;
  usage: UsageRecord[];
  totalUnbilled: number;
  projectedMonthly: number;
  tierLimits: Record<string, number>;
}

// ── Service type config ────────────────────────────────
const SERVICE_CONFIG: Record<string, { icon: typeof Zap; color: string; labelKey: string }> = {
  skill_call: {
    icon: Zap,
    color: 'text-violet-400',
    labelKey: 'usage.serviceSkillCall',
  },
  rag_query: {
    icon: Database,
    color: 'text-cyan-400',
    labelKey: 'usage.serviceRagQuery',
  },
  multimodal: {
    icon: Eye,
    color: 'text-amber-400',
    labelKey: 'usage.serviceMultimodal',
  },
  collaboration: {
    icon: Users,
    color: 'text-emerald-400',
    labelKey: 'usage.serviceCollaboration',
  },
};

// ── Animated counter ───────────────────────────────────
function AnimatedNumber({ value, prefix = '', suffix = '', decimals = 0 }: {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const duration = 800;
    const start = display;
    const end = value;
    const startTime = performance.now();
    let raf: number;
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(start + (end - start) * eased);
      if (progress < 1) {
        raf = requestAnimationFrame(animate);
      }
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return (
    <span>
      {prefix}{display.toFixed(decimals)}{suffix}
    </span>
  );
}

// ── Component ──────────────────────────────────────────
export default function MeteredUsage() {
  const { t } = useI18n();
  const [usageSummary, setUsageSummary] = useState<UsageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedService, setExpandedService] = useState<string | null>(null);

  // ── Fetch usage ──────────────────────────────────────
  const fetchUsage = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/stripe/usage?avatarId=default');
      if (res.ok) {
        const data = await res.json();
        setUsageSummary(data);
      }
    } catch {
      setError(t('usage.fetchError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  // ── Report usage (demo) ──────────────────────────────
  const handleReportUsage = useCallback(async (serviceType: string, quantity: number) => {
    try {
      await fetch('/api/stripe/usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarId: 'default', serviceType, quantity }),
      });
      await fetchUsage();
    } catch {
      // Silently fail
    }
  }, [fetchUsage]);

  const usage = usageSummary?.usage || [];
  const tierLimits = usageSummary?.tierLimits || {};

  return (
    <Card className="border-slate-700/50 bg-slate-800/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-slate-100">
            <BarChart3 className="w-5 h-5 text-cyan-400" />
            {t('usage.title')}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchUsage}
            className="text-slate-400 hover:text-slate-200"
            aria-label={t('common.refresh')}
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </Button>
        </div>

        {/* Billing period */}
        {usageSummary && (
          <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
            <span>{t('usage.billingPeriod')}:</span>
            <span>
              {formatSafeDate(usageSummary.periodStart, 'MMM d')} – {formatSafeDate(usageSummary.periodEnd, 'MMM d, yyyy', usageSummary.billingPeriod)}
            </span>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-5">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400"
          >
            {error}
          </motion.div>
        )}

        {/* Stats cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-lg border border-slate-700/50 bg-slate-900/60 p-3 text-center"
          >
            <div className="text-lg font-bold text-cyan-400">
              <AnimatedNumber value={usageSummary?.totalUnbilled ?? 0} prefix="$" decimals={2} />
            </div>
            <div className="text-[10px] text-slate-500">{t('usage.unbilled')}</div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-lg border border-slate-700/50 bg-slate-900/60 p-3 text-center"
          >
            <div className="text-lg font-bold text-violet-400">
              <AnimatedNumber value={usageSummary?.projectedMonthly ?? 0} prefix="$" decimals={2} />
            </div>
            <div className="text-[10px] text-slate-500">{t('usage.projected')}</div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-lg border border-slate-700/50 bg-slate-900/60 p-3 text-center col-span-2 sm:col-span-1"
          >
            <div className="text-lg font-bold text-emerald-400">
              {usage.reduce((sum, u) => sum + u.quantity, 0).toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-500">{t('usage.totalCalls')}</div>
          </motion.div>
        </div>

        {/* Usage bars by service type */}
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 text-slate-500 animate-spin" />
          </div>
        ) : usage.length === 0 ? (
          <div className="text-center py-6 text-slate-500 text-sm">
            {t('usage.noData')}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs font-medium text-slate-400">{t('usage.byService')}</p>
            {usage.map((record, idx) => {
              const cfg = SERVICE_CONFIG[record.serviceType] || SERVICE_CONFIG.skill_call;
              const Icon = cfg.icon;
              const limit = tierLimits[record.serviceType] || 0;
              const pct = limit > 0 ? Math.min(100, (record.quantity / limit) * 100) : 0;
              const isExpanded = expandedService === record.serviceType;

              return (
                <motion.div
                  key={record.serviceType}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="rounded-lg border border-slate-700/30 bg-slate-900/40 overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedService(isExpanded ? null : record.serviceType)}
                    className="w-full p-3 hover:bg-slate-900/60 transition-colors text-left"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Icon className={cn('w-4 h-4', cfg.color)} />
                        <span className="text-sm text-slate-200">{t(cfg.labelKey)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-200">
                          {record.quantity.toLocaleString()}
                        </span>
                        {limit > 0 && (
                          <span className="text-[10px] text-slate-500">
                            / {limit.toLocaleString()}
                          </span>
                        )}
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                        )}
                      </div>
                    </div>
                    <Progress
                      value={pct}
                      className={cn(
                        'h-1.5 bg-slate-700',
                        record.serviceType === 'skill_call' ? '[&>div]:bg-violet-500' :
                        record.serviceType === 'rag_query' ? '[&>div]:bg-cyan-500' :
                        record.serviceType === 'multimodal' ? '[&>div]:bg-amber-500' :
                        '[&>div]:bg-emerald-500'
                      )}
                    />
                    {pct > 80 && (
                      <Badge variant="outline" className="mt-1 text-[9px] px-1 py-0 border-amber-500/30 bg-amber-500/10 text-amber-400">
                        {t('usage.nearingLimit')}
                      </Badge>
                    )}
                  </button>

                  {/* Expanded details */}
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      transition={{ duration: 0.15 }}
                      className="border-t border-slate-700/30 p-3"
                    >
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-slate-500">
                            <th className="text-left font-normal">{t('usage.description')}</th>
                            <th className="text-right font-normal w-14">{t('invoice.qty')}</th>
                            <th className="text-right font-normal w-20">{t('usage.unitPrice')}</th>
                            <th className="text-right font-normal w-16">{t('invoice.total')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="text-slate-300">
                            <td className="py-0.5">{t(cfg.labelKey)}</td>
                            <td className="text-right py-0.5">{record.quantity}</td>
                            <td className="text-right py-0.5">${record.unitPrice.toFixed(4)}</td>
                            <td className="text-right py-0.5">${record.total.toFixed(2)}</td>
                          </tr>
                        </tbody>
                      </table>
                      <div className="mt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 text-[10px] border-slate-600 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReportUsage(record.serviceType, 1);
                          }}
                        >
                          <Zap className="w-3 h-3 mr-1" />
                          {t('usage.simulateCall')}
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Cost breakdown table */}
        {usage.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-400">{t('usage.costBreakdown')}</p>
            <div className="rounded-lg border border-slate-700/30 bg-slate-900/40 overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-700/30 text-slate-500">
                    <th className="text-left font-normal p-2">{t('usage.serviceType')}</th>
                    <th className="text-right font-normal p-2">{t('invoice.qty')}</th>
                    <th className="text-right font-normal p-2">{t('usage.unitPrice')}</th>
                    <th className="text-right font-normal p-2">{t('invoice.total')}</th>
                  </tr>
                </thead>
                <tbody>
                  {usage.map((record) => {
                    const cfg = SERVICE_CONFIG[record.serviceType] || SERVICE_CONFIG.skill_call;
                    return (
                      <tr key={record.serviceType} className="border-b border-slate-700/10 text-slate-300">
                        <td className="p-2 flex items-center gap-1.5">
                          <cfg.icon className={cn('w-3 h-3', cfg.color)} />
                          {t(cfg.labelKey)}
                        </td>
                        <td className="text-right p-2">{record.quantity.toLocaleString()}</td>
                        <td className="text-right p-2">${record.unitPrice.toFixed(4)}</td>
                        <td className="text-right p-2">${record.total.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                  <tr className="text-slate-200 font-medium">
                    <td colSpan={3} className="text-right p-2">{t('usage.totalUnbilled')}</td>
                    <td className="text-right p-2">
                      <span className="text-cyan-400">
                        ${usageSummary?.totalUnbilled.toFixed(2) ?? '0.00'}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
