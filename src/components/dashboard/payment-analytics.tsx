'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  TrendingUp,
  Wallet,
  CreditCard,
  Crown,
  CheckCircle,
  XCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Loader2,
  DollarSign,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useI18n } from '@/hooks/use-i18n';

// ── Types ─────────────────────────────────────────────────────
interface MonthlyRevenue {
  month: string;
  amount: number;
}

interface MethodBreakdown {
  x402: number;
  stripe: number;
  subscription: number;
}

interface ConversionFunnel {
  initiated: number;
  completed: number;
  failed: number;
  rates: {
    conversionRate: number;
    failureRate: number;
    pendingRate: number;
  };
}

interface TopService {
  serviceName: string;
  count: number;
  totalAmount: number;
}

interface RecentPayment {
  id: string;
  avatarId: string;
  serviceName: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
}

interface AnalyticsData {
  totalRevenue: number;
  monthlyRevenue: MonthlyRevenue[];
  avgTransactionSize: number;
  methodBreakdown: MethodBreakdown;
  conversionFunnel: ConversionFunnel;
  topServices: TopService[];
  recentPayments: RecentPayment[];
}

// ── Component ─────────────────────────────────────────────────
export default function PaymentAnalytics() {
  const { t } = useI18n();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/payment/analytics');
      if (!res.ok) throw new Error('Failed to fetch analytics');
      const analyticsData: AnalyticsData = await res.json();
      setData(analyticsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // ── Loading state ─────────────────────────────────────────
  if (isLoading && !data) {
    return (
      <Card className="border-slate-700/50 bg-slate-800/50 backdrop-blur-sm">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-violet-400" />
          <span className="ml-2 text-sm text-slate-400">{t('common.loading')}</span>
        </CardContent>
      </Card>
    );
  }

  // ── Error state ───────────────────────────────────────────
  if (error && !data) {
    return (
      <Card className="border-slate-700/50 bg-slate-800/50 backdrop-blur-sm">
        <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
          <span className="text-sm text-red-400">{error}</span>
          <Button size="sm" variant="outline" onClick={fetchAnalytics} className="border-slate-600 text-slate-300">
            {t('common.refresh')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  // ── Computed values ───────────────────────────────────────
  const totalPayments = data.methodBreakdown.x402 + data.methodBreakdown.stripe + data.methodBreakdown.subscription;
  const x402Pct = totalPayments > 0 ? Math.round((data.methodBreakdown.x402 / totalPayments) * 100) : 0;
  const stripePct = totalPayments > 0 ? Math.round((data.methodBreakdown.stripe / totalPayments) * 100) : 0;
  const subscriptionPct = totalPayments > 0 ? 100 - x402Pct - stripePct : 0;

  const maxMonthlyAmount = Math.max(...data.monthlyRevenue.map((m) => m.amount), 1);
  const maxServiceAmount = Math.max(...data.topServices.map((s) => s.totalAmount), 1);

  const prevMonthRevenue = data.monthlyRevenue.length >= 2
    ? data.monthlyRevenue[data.monthlyRevenue.length - 2]?.amount ?? 0
    : 0;
  const currentMonthRevenue = data.monthlyRevenue[data.monthlyRevenue.length - 1]?.amount ?? 0;
  const revenueChange = prevMonthRevenue > 0
    ? Math.round(((currentMonthRevenue - prevMonthRevenue) / prevMonthRevenue) * 10000) / 100
    : 0;

  // ── Status badge helper ───────────────────────────────────
  function getStatusBadge(status: string) {
    switch (status) {
      case 'confirmed':
        return (
          <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-[9px]">
            <CheckCircle className="size-2.5 mr-0.5" />
            {t('payment.confirmed')}
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="outline" className="border-red-500/30 bg-red-500/10 text-red-400 text-[9px]">
            <XCircle className="size-2.5 mr-0.5" />
            {t('payment.failed')}
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-400 text-[9px]">
            <Clock className="size-2.5 mr-0.5" />
            {t('payment.pending')}
          </Badge>
        );
    }
  }

  return (
    <Card className="border-slate-700/50 bg-slate-800/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-slate-100">
            <BarChart3 className="size-5 text-violet-400" />
            {t('analytics.title')}
          </CardTitle>
          <Button
            size="sm"
            variant="ghost"
            onClick={fetchAnalytics}
            disabled={isLoading}
            className="h-7 w-7 p-0 text-slate-400 hover:text-slate-200"
          >
            <RefreshCw className={cn('size-3.5', isLoading && 'animate-spin')} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* ── Section 1: Revenue Overview ──────────────────────── */}
        <div className="space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {t('analytics.revenueOverview')}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Total Revenue */}
            <div className="rounded-lg border border-slate-700/50 bg-slate-900/60 p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">{t('analytics.totalRevenue')}</span>
                <div className={cn(
                  'flex items-center gap-0.5 text-[10px]',
                  revenueChange >= 0 ? 'text-emerald-400' : 'text-red-400',
                )}>
                  {revenueChange >= 0 ? (
                    <ArrowUpRight className="size-3" />
                  ) : (
                    <ArrowDownRight className="size-3" />
                  )}
                  {Math.abs(revenueChange)}%
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <DollarSign className="size-4 text-violet-400" />
                <span className="text-lg font-bold text-slate-100">{data.totalRevenue.toFixed(2)}</span>
              </div>
            </div>

            {/* Avg Transaction Size */}
            <div className="rounded-lg border border-slate-700/50 bg-slate-900/60 p-3">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider">{t('analytics.avgTransactionSize')}</span>
              <div className="flex items-center gap-1.5 mt-1">
                <TrendingUp className="size-4 text-cyan-400" />
                <span className="text-lg font-bold text-slate-100">${data.avgTransactionSize.toFixed(2)}</span>
              </div>
            </div>

            {/* Monthly Trend */}
            <div className="rounded-lg border border-slate-700/50 bg-slate-900/60 p-3">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider">{t('analytics.monthlyTrend')}</span>
              <div className="mt-2">
                {/* CSS Bar Chart for monthly revenue */}
                <div className="flex items-end gap-1 h-10">
                  {data.monthlyRevenue.map((m) => (
                    <div key={m.month} className="flex-1 flex flex-col items-center gap-0.5">
                      <div
                        className="w-full rounded-t bg-gradient-to-t from-violet-600 to-violet-400 transition-all duration-500"
                        style={{ height: `${Math.max((m.amount / maxMonthlyAmount) * 100, 4)}%` }}
                        title={`${m.month}: $${m.amount.toFixed(2)}`}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex gap-1 mt-0.5">
                  {data.monthlyRevenue.map((m) => (
                    <div key={m.month} className="flex-1 text-center text-[7px] text-slate-600 truncate">
                      {m.month.slice(5)}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Section 2: Payment Method Breakdown ──────────────── */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {t('analytics.methodBreakdown')}
          </h3>

          <div className="rounded-lg border border-slate-700/50 bg-slate-900/60 p-4">
            {/* Visual pie/bar representation */}
            <div className="flex h-4 overflow-hidden rounded-full mb-3">
              <div
                className="bg-violet-500 transition-all duration-500"
                style={{ width: `${x402Pct}%` }}
              />
              <div
                className="bg-cyan-500 transition-all duration-500"
                style={{ width: `${stripePct}%` }}
              />
              <div
                className="bg-emerald-500 transition-all duration-500"
                style={{ width: `${subscriptionPct}%` }}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              {/* x402 */}
              <div className="flex items-center gap-2">
                <div className="size-2 rounded-full bg-violet-500" />
                <Wallet className="size-3.5 text-violet-400" />
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-slate-500">x402</div>
                  <div className="text-xs font-medium text-slate-200">{x402Pct}%</div>
                  <div className="text-[9px] text-slate-600">{data.methodBreakdown.x402} {t('analytics.count')}</div>
                </div>
              </div>

              {/* Stripe */}
              <div className="flex items-center gap-2">
                <div className="size-2 rounded-full bg-cyan-500" />
                <CreditCard className="size-3.5 text-cyan-400" />
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-slate-500">Stripe</div>
                  <div className="text-xs font-medium text-slate-200">{stripePct}%</div>
                  <div className="text-[9px] text-slate-600">{data.methodBreakdown.stripe} {t('analytics.count')}</div>
                </div>
              </div>

              {/* Subscription */}
              <div className="flex items-center gap-2">
                <div className="size-2 rounded-full bg-emerald-500" />
                <Crown className="size-3.5 text-emerald-400" />
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-slate-500">{t('payment.tabSubscription')}</div>
                  <div className="text-xs font-medium text-slate-200">{subscriptionPct}%</div>
                  <div className="text-[9px] text-slate-600">{data.methodBreakdown.subscription} {t('analytics.count')}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Section 3: Conversion Funnel ─────────────────────── */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {t('analytics.conversionFunnel')}
          </h3>

          <div className="rounded-lg border border-slate-700/50 bg-slate-900/60 p-4 space-y-3">
            {/* Funnel steps */}
            <div className="space-y-2">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300">{t('analytics.initiated')}</span>
                  <span className="text-slate-200 font-medium">{data.conversionFunnel.initiated}</span>
                </div>
                <Progress value={100} className="h-2 bg-slate-700 [&>div]:bg-slate-400" />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-emerald-300">{t('analytics.completed')}</span>
                  <span className="text-emerald-200 font-medium">{data.conversionFunnel.completed} ({data.conversionFunnel.rates.conversionRate}%)</span>
                </div>
                <Progress
                  value={data.conversionFunnel.rates.conversionRate}
                  className="h-2 bg-slate-700 [&>div]:bg-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-red-300">{t('analytics.failed')}</span>
                  <span className="text-red-200 font-medium">{data.conversionFunnel.failed} ({data.conversionFunnel.rates.failureRate}%)</span>
                </div>
                <Progress
                  value={data.conversionFunnel.rates.failureRate}
                  className="h-2 bg-slate-700 [&>div]:bg-red-500"
                />
              </div>
            </div>

            {/* Conversion rate highlight */}
            <div className="flex items-center justify-center gap-2 py-1">
              <span className="text-[10px] text-slate-500">{t('analytics.conversionRate')}:</span>
              <Badge
                variant="outline"
                className={cn(
                  'text-xs font-bold',
                  data.conversionFunnel.rates.conversionRate >= 80
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                    : data.conversionFunnel.rates.conversionRate >= 50
                      ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                      : 'border-red-500/30 bg-red-500/10 text-red-400',
                )}
              >
                {data.conversionFunnel.rates.conversionRate}%
              </Badge>
            </div>
          </div>
        </div>

        {/* ── Section 4: Top Services ──────────────────────────── */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {t('analytics.topServices')}
          </h3>

          <div className="rounded-lg border border-slate-700/50 bg-slate-900/60 p-4 space-y-2">
            {data.topServices.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">{t('analytics.noData')}</p>
            ) : (
              data.topServices.map((service, i) => (
                <div key={service.serviceName} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={cn(
                        'flex size-5 items-center justify-center rounded text-[9px] font-bold shrink-0',
                        i === 0 ? 'bg-violet-500/20 text-violet-400' :
                        i === 1 ? 'bg-cyan-500/20 text-cyan-400' :
                        i === 2 ? 'bg-emerald-500/20 text-emerald-400' :
                        'bg-slate-700/50 text-slate-500',
                      )}>
                        {i + 1}
                      </span>
                      <span className="text-slate-300 truncate">{service.serviceName}</span>
                    </div>
                    <span className="text-slate-200 font-medium shrink-0 ml-2">${service.totalAmount.toFixed(2)}</span>
                  </div>
                  {/* CSS Bar Chart */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-slate-700/50 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(service.totalAmount / maxServiceAmount) * 100}%` }}
                        transition={{ duration: 0.6, delay: i * 0.1 }}
                        className={cn(
                          'h-full rounded-full',
                          i === 0 ? 'bg-violet-500' :
                          i === 1 ? 'bg-cyan-500' :
                          i === 2 ? 'bg-emerald-500' :
                          'bg-slate-500',
                        )}
                      />
                    </div>
                    <span className="text-[9px] text-slate-500 shrink-0">{service.count}x</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Section 5: Recent Activity ───────────────────────── */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {t('analytics.recentActivity')}
          </h3>

          <div className="rounded-lg border border-slate-700/50 bg-slate-900/60 p-3 max-h-64 overflow-y-auto">
            {data.recentPayments.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">{t('analytics.noData')}</p>
            ) : (
              <div className="space-y-2">
                {data.recentPayments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between p-2 rounded-md hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <DollarSign className="size-3.5 text-slate-500 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs text-slate-300 truncate">{payment.serviceName}</div>
                        <div className="text-[9px] text-slate-600 font-mono">
                          {new Date(payment.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-medium text-slate-200">
                        ${payment.amount.toFixed(2)} {payment.currency}
                      </span>
                      {getStatusBadge(payment.status)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
