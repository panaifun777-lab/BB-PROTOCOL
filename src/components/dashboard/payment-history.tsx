'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Clock,
  CheckCircle,
  XCircle,
  DollarSign,
  CreditCard,
  Wallet,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useI18n } from '@/hooks/use-i18n';
import { format } from 'date-fns';

// ── Types ──────────────────────────────────────────────
interface PaymentRecord {
  id: string;
  avatarId: string;
  serviceName: string;
  amount: number;
  currency: string;
  gasFee: number;
  riskLevel: string;
  status: string;
  txHash: string | null;
  createdAt: string;
}

interface PaymentStats {
  totalAmount: number;
  confirmed: number;
  pending: number;
  failed: number;
}

// ── Component ──────────────────────────────────────────
export default function PaymentHistory() {
  const { t } = useI18n();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [stats, setStats] = useState<PaymentStats>({
    totalAmount: 0,
    confirmed: 0,
    pending: 0,
    failed: 0,
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  // ── Fetch history ────────────────────────────────────
  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        avatarId: 'default',
        page: String(page),
        limit: '10',
      });
      if (filter !== 'all') params.set('status', filter);
      const res = await fetch(`/api/payment/history?${params}`);
      if (res.ok) {
        const data = await res.json();
        setPayments(data.payments || []);
        setStats(
          data.stats || { totalAmount: 0, confirmed: 0, pending: 0, failed: 0 },
        );
        setTotalPages(data.totalPages || 1);
      }
    } catch {
      // Silently handle error
    } finally {
      setLoading(false);
    }
  }, [page, filter]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // ── Status config ────────────────────────────────────
  const statusConfig: Record<
    string,
    {
      icon: typeof CheckCircle;
      color: string;
      badge: string;
      label: string;
    }
  > = {
    confirmed: {
      icon: CheckCircle,
      color: 'text-emerald-400',
      badge: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
      label: t('payment.confirmed') || 'Confirmed',
    },
    pending: {
      icon: Clock,
      color: 'text-amber-400',
      badge: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
      label: t('payment.pending') || 'Pending',
    },
    failed: {
      icon: XCircle,
      color: 'text-red-400',
      badge: 'border-red-500/30 bg-red-500/10 text-red-400',
      label: t('payment.failed') || 'Failed',
    },
  };

  return (
    <Card className="border-slate-700/50 bg-slate-800/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-slate-100">
            <DollarSign className="w-5 h-5 text-violet-400" />
            {t('payment.historyTitle') || 'Payment History'}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchHistory}
            className="text-slate-400 hover:text-slate-200"
            aria-label={t('payment.refresh') || 'Refresh'}
          >
            <RefreshCw
              className={cn('w-4 h-4', loading && 'animate-spin')}
            />
          </Button>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-4 gap-2 mt-3">
          <div className="text-center p-2 rounded-lg bg-slate-900/60">
            <div className="text-lg font-bold text-violet-400">
              ${stats.totalAmount.toFixed(2)}
            </div>
            <div className="text-[10px] text-slate-500">
              {t('payment.totalPaid') || 'Total'}
            </div>
          </div>
          <div className="text-center p-2 rounded-lg bg-slate-900/60">
            <div className="text-lg font-bold text-emerald-400">
              {stats.confirmed}
            </div>
            <div className="text-[10px] text-slate-500">
              {t('payment.confirmed') || 'Confirmed'}
            </div>
          </div>
          <div className="text-center p-2 rounded-lg bg-slate-900/60">
            <div className="text-lg font-bold text-amber-400">
              {stats.pending}
            </div>
            <div className="text-[10px] text-slate-500">
              {t('payment.pending') || 'Pending'}
            </div>
          </div>
          <div className="text-center p-2 rounded-lg bg-slate-900/60">
            <div className="text-lg font-bold text-red-400">
              {stats.failed}
            </div>
            <div className="text-[10px] text-slate-500">
              {t('payment.failed') || 'Failed'}
            </div>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 mt-2">
          {['all', 'confirmed', 'pending', 'failed'].map((f) => (
            <button
              key={f}
              onClick={() => {
                setFilter(f);
                setPage(1);
              }}
              className={cn(
                'px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors',
                filter === f
                  ? 'bg-violet-500/20 text-violet-300'
                  : 'text-slate-500 hover:text-slate-300',
              )}
            >
              {f === 'all'
                ? t('payment.all') || 'All'
                : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-5 h-5 text-slate-500 animate-spin" />
          </div>
        ) : payments.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm">
            {t('payment.noPayments') || 'No payments yet'}
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
            {payments.map((payment, idx) => {
              const sc =
                statusConfig[payment.status as keyof typeof statusConfig] ||
                statusConfig.pending;
              const Icon = sc.icon;
              return (
                <motion.div
                  key={payment.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-900/40 hover:bg-slate-900/60 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Icon className={cn('w-4 h-4', sc.color)} />
                    <div>
                      <div className="text-sm text-slate-200">
                        {payment.serviceName}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {payment.currency === 'USD' ? (
                          <CreditCard className="w-3 h-3 inline" />
                        ) : (
                          <Wallet className="w-3 h-3 inline" />
                        )}{' '}
                        {format(new Date(payment.createdAt), 'MM/dd HH:mm')}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-slate-200">
                      ${payment.amount.toFixed(4)} {payment.currency}
                    </div>
                    <Badge
                      variant="outline"
                      className={cn('text-[10px] px-1.5 py-0', sc.badge)}
                    >
                      {sc.label}
                    </Badge>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              aria-label={t('payment.prevPage') || 'Previous page'}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-xs text-slate-400">
              {page}/{totalPages}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              aria-label={t('payment.nextPage') || 'Next page'}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
