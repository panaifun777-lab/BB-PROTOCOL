'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Crown,
  Check,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Zap,
  Shield,
  Globe,
  X,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useI18n } from '@/hooks/use-i18n';
import { format } from 'date-fns';

// ── Types ──────────────────────────────────────────────
interface SubscriptionData {
  id: string;
  avatarId: string;
  tier: 'starter' | 'pro' | 'enterprise';
  status: 'active' | 'past_due' | 'canceled' | 'trialing';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  apiCallsUsed: number;
  apiCallsLimit: number;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
}

// ── Tier config ────────────────────────────────────────
const TIERS = [
  {
    key: 'starter' as const,
    price: 9.99,
    features: [
      '5,000 API calls/mo',
      'Basic skill access',
      'Email support',
      '1 avatar slot',
      'Standard analytics',
    ],
    iconKeys: ['api', 'skill', 'email', 'avatar', 'analytics'],
  },
  {
    key: 'pro' as const,
    price: 29.99,
    features: [
      '50,000 API calls/mo',
      'All skill access',
      'Priority support',
      '5 avatar slots',
      'Advanced analytics',
      'Custom delegations',
      'Revenue split config',
    ],
    iconKeys: ['api', 'skill', 'priority', 'avatar', 'analytics', 'delegation', 'split'],
    popular: true,
  },
  {
    key: 'enterprise' as const,
    price: 99.99,
    features: [
      'Unlimited API calls',
      'All skill access + custom',
      'Dedicated support',
      'Unlimited avatars',
      'Full analytics + export',
      'Custom delegations',
      'Revenue split config',
      'SLA guarantee',
      'On-premise option',
    ],
    iconKeys: ['api', 'skill', 'priority', 'avatar', 'analytics', 'delegation', 'split', 'sla', 'onprem'],
  },
];

// ── Status badge config ────────────────────────────────
function getStatusBadge(status: string, t: (key: string) => string) {
  const config: Record<string, { label: string; className: string }> = {
    active: {
      label: t('subscription.statusActive'),
      className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
    },
    past_due: {
      label: t('subscription.statusPastDue'),
      className: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
    },
    canceled: {
      label: t('subscription.statusCanceled'),
      className: 'border-red-500/30 bg-red-500/10 text-red-400',
    },
    trialing: {
      label: t('subscription.statusTrialing'),
      className: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400',
    },
  };
  return config[status] || config.active;
}

// ── Component ──────────────────────────────────────────
export default function SubscriptionPanel() {
  const { t } = useI18n();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch subscription ────────────────────────────────
  const fetchSubscription = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/stripe/subscription?avatarId=default');
      if (res.ok) {
        const data = await res.json();
        // API may return array or single object
        const sub = Array.isArray(data) ? data[0] : data;
        if (sub) {
          setSubscription(sub);
        }
      }
    } catch {
      setError(t('subscription.fetchError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  // ── Create/upgrade subscription ───────────────────────
  const handleSubscribe = useCallback(async (tier: string) => {
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/stripe/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarId: 'default', tier }),
      });
      if (!res.ok) throw new Error('Failed to create subscription');
      const data = await res.json();
      setSubscription(data);
    } catch {
      setError(t('subscription.subscribeError'));
    } finally {
      setActionLoading(false);
    }
  }, [t]);

  // ── Cancel subscription ───────────────────────────────
  const handleCancel = useCallback(async () => {
    if (!subscription) return;
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/stripe/subscription', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionId: subscription.id, action: 'cancel' }),
      });
      if (!res.ok) throw new Error('Failed to cancel');
      const data = await res.json();
      setSubscription(data);
    } catch {
      setError(t('subscription.cancelError'));
    } finally {
      setActionLoading(false);
      setCancelDialogOpen(false);
    }
  }, [subscription, t]);

  // ── Reactivate subscription ──────────────────────────
  const handleReactivate = useCallback(async () => {
    if (!subscription) return;
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/stripe/subscription', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionId: subscription.id, action: 'reactivate' }),
      });
      if (!res.ok) throw new Error('Failed to reactivate');
      const data = await res.json();
      setSubscription(data);
    } catch {
      setError(t('subscription.reactivateError'));
    } finally {
      setActionLoading(false);
    }
  }, [subscription, t]);

  const usagePercent = subscription
    ? Math.min(100, (subscription.apiCallsUsed / Math.max(1, subscription.apiCallsLimit)) * 100)
    : 0;

  const tierLabel = (tier: string) => {
    const map: Record<string, string> = {
      starter: t('subscription.tierStarter'),
      pro: t('subscription.tierPro'),
      enterprise: t('subscription.tierEnterprise'),
    };
    return map[tier] || tier;
  };

  return (
    <Card className="border-slate-700/50 bg-slate-800/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-slate-100">
            <Crown className="w-5 h-5 text-violet-400" />
            {t('subscription.title')}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchSubscription}
            className="text-slate-400 hover:text-slate-200"
            aria-label={t('common.refresh')}
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Error display */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400"
          >
            {error}
          </motion.div>
        )}

        {/* Current subscription status */}
        {subscription && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-slate-700/50 bg-slate-900/60 p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Crown className={cn(
                  'w-4 h-4',
                  subscription.tier === 'enterprise' ? 'text-amber-400' :
                  subscription.tier === 'pro' ? 'text-violet-400' : 'text-slate-400'
                )} />
                <span className="text-sm font-medium text-slate-200">
                  {t('subscription.currentPlan')}:
                </span>
                <span className="text-sm font-bold text-violet-400">
                  {tierLabel(subscription.tier)}
                </span>
              </div>
              <Badge variant="outline" className={getStatusBadge(subscription.status, t).className}>
                {getStatusBadge(subscription.status, t).label}
              </Badge>
            </div>

            {/* Billing period */}
            <div className="flex items-center gap-4 text-xs text-slate-400 mb-3">
              <span>
                {t('subscription.billingPeriod')}:
                {' ' + format(new Date(subscription.currentPeriodStart), 'MMM d')} – {format(new Date(subscription.currentPeriodEnd), 'MMM d, yyyy')}
              </span>
            </div>

            {/* Usage meter */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">{t('subscription.apiUsage')}</span>
                <span className="text-slate-300">
                  {subscription.apiCallsUsed.toLocaleString()} / {subscription.apiCallsLimit === -1 ? '∞' : subscription.apiCallsLimit.toLocaleString()}
                </span>
              </div>
              <Progress
                value={subscription.apiCallsLimit === -1 ? 0 : usagePercent}
                className="h-2 bg-slate-700 [&>div]:bg-violet-500"
              />
              {subscription.apiCallsLimit !== -1 && usagePercent > 80 && (
                <p className="text-[10px] text-amber-400">
                  <AlertTriangle className="w-3 h-3 inline mr-1" />
                  {t('subscription.usageWarning')}
                </p>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 mt-4">
              {subscription.status === 'canceled' ? (
                <Button
                  size="sm"
                  className="bg-violet-600 text-white hover:bg-violet-500"
                  onClick={handleReactivate}
                  disabled={actionLoading}
                >
                  {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <RefreshCw className="w-3.5 h-3.5 mr-1" />}
                  {t('subscription.reactivate')}
                </Button>
              ) : subscription.status === 'active' || subscription.status === 'trialing' ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                  onClick={() => setCancelDialogOpen(true)}
                  disabled={actionLoading}
                >
                  {t('subscription.cancel')}
                </Button>
              ) : null}
            </div>
          </motion.div>
        )}

        {/* Pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {TIERS.map((tier) => {
            const isCurrent = subscription?.tier === tier.key;
            return (
              <motion.div
                key={tier.key}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={cn(
                  'relative rounded-xl border p-4 transition-all',
                  tier.popular
                    ? 'border-violet-500/50 bg-violet-500/5'
                    : 'border-slate-700/50 bg-slate-900/40',
                  isCurrent && 'ring-2 ring-violet-500/30'
                )}
              >
                {tier.popular && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                    <Badge className="bg-violet-500 text-white text-[10px] px-2">
                      {t('subscription.popular')}
                    </Badge>
                  </div>
                )}

                <div className="text-center mb-3">
                  <h3 className="text-sm font-semibold text-slate-200">
                    {tierLabel(tier.key)}
                  </h3>
                  <div className="flex items-baseline justify-center gap-1 mt-1">
                    <span className="text-2xl font-bold text-slate-100">${tier.price}</span>
                    <span className="text-xs text-slate-500">/{t('subscription.month')}</span>
                  </div>
                </div>

                <ul className="space-y-2 mb-4">
                  {tier.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                      <Check className="w-3.5 h-3.5 text-violet-400 shrink-0 mt-0.5" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Button
                  size="sm"
                  className={cn(
                    'w-full',
                    isCurrent
                      ? 'bg-slate-700 text-slate-400 cursor-default'
                      : tier.popular
                        ? 'bg-violet-600 text-white hover:bg-violet-500'
                        : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                  )}
                  disabled={isCurrent || actionLoading}
                  onClick={() => handleSubscribe(tier.key)}
                >
                  {actionLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                  ) : isCurrent ? (
                    t('subscription.current')
                  ) : (
                    t('subscription.upgrade')
                  )}
                </Button>
              </motion.div>
            );
          })}
        </div>

        {/* Cancel Confirmation Dialog */}
        <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
          <DialogContent className="border-slate-700 bg-slate-800 text-slate-100 sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-slate-100">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                {t('subscription.cancelTitle')}
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                {t('subscription.cancelDescription')}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <DialogClose asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-slate-600 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
                >
                  {t('common.cancel')}
                </Button>
              </DialogClose>
              <Button
                size="sm"
                className="bg-red-600 text-white hover:bg-red-500"
                onClick={handleCancel}
                disabled={actionLoading}
              >
                {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />}
                {t('subscription.confirmCancel')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
