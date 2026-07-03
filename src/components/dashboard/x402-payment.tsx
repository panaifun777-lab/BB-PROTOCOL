'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAccount, useSignMessage } from 'wagmi';
import {
  Wallet,
  DollarSign,
  CheckCircle,
  Loader2,
  CreditCard,
  Link2,
  Crown,
  AlertTriangle,
  RefreshCw,
  Shield,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useI18n, type TranslateFn } from '@/hooks/use-i18n';
import { useDynamicSplitter } from '@/hooks/use-web3';
import { useSplitSync } from '@/hooks/use-split-sync';
import { usePaymentRetry } from '@/hooks/use-payment-retry';
import { useConversionTracking } from '@/hooks/use-conversion-tracking';

// ── Props ──────────────────────────────────────────────
interface X402PaymentProps {
  isOpen: boolean;
  onClose: () => void;
  service: string;
  amount: number;
}

// ── Step enum ──────────────────────────────────────────
type PaymentStep = 'estimate' | 'confirm' | 'complete';

// ── Risk level ─────────────────────────────────────────
type RiskLevel = 'low' | 'medium' | 'high';

// ── Payment tab ────────────────────────────────────────
type PaymentTab = 'x402' | 'stripe' | 'subscription';

// ── Default split config (fallback when chain not connected) ──
const DEFAULT_SPLIT = { humanBps: 7000, avatarBps: 2000, protocolBps: 1000 };

// ── Subscription tiers ─────────────────────────────────
const SUBSCRIPTION_TIERS = [
  { key: 'starter', price: 9.99 },
  { key: 'pro', price: 29.99 },
  { key: 'enterprise', price: 99.99 },
] as const;

function getRiskLevel(amount: number): RiskLevel {
  if (amount <= 0.05) return 'low';
  if (amount <= 0.5) return 'medium';
  return 'high';
}

function getRiskConfig(t: TranslateFn): Record<RiskLevel, { label: string; badgeClass: string }> {
  return {
    low: {
      label: t('payment.riskLow'),
      badgeClass: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
    },
    medium: {
      label: t('payment.riskMedium'),
      badgeClass: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
    },
    high: {
      label: t('payment.riskHigh'),
      badgeClass: 'border-red-500/30 bg-red-500/10 text-red-400',
    },
  };
}

// ── Step indicator ─────────────────────────────────────
function StepIndicator({ step, t }: { step: PaymentStep; t: TranslateFn }) {
  const steps: { key: PaymentStep; label: string }[] = [
    { key: 'estimate', label: t('payment.stepPreview') },
    { key: 'confirm', label: t('payment.stepConfirm') },
    { key: 'complete', label: t('payment.stepComplete') },
  ];

  const currentIndex = steps.findIndex((s) => s.key === step);

  return (
    <div className="flex items-center gap-2">
      {steps.map((s, i) => {
        const isActive = s.key === step;
        const isCompleted = i < currentIndex;
        return (
          <div key={s.key} className="flex items-center gap-2">
            <div
              className={cn(
                'flex size-6 items-center justify-center rounded-full text-[10px] font-bold transition-colors',
                isCompleted && 'bg-emerald-500 text-white',
                isActive && 'bg-violet-500 text-white',
                !isActive && !isCompleted && 'bg-slate-700 text-slate-400',
              )}
            >
              {isCompleted ? (
                <CheckCircle className="size-3.5" />
              ) : (
                i + 1
              )}
            </div>
            <span
              className={cn(
                'text-[10px]',
                isActive ? 'text-slate-200' : 'text-slate-500',
              )}
            >
              {s.label}
            </span>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  'h-px w-4',
                  i < currentIndex ? 'bg-emerald-500' : 'bg-slate-700',
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Component ──────────────────────────────────────────
export default function X402Payment({
  isOpen,
  onClose,
  service,
  amount,
}: X402PaymentProps) {
  const { t } = useI18n();
  const { splitConfig } = useDynamicSplitter();
  const { toast } = useToast();
  const { isConnected } = useAccount();
  const { isSynced } = useSplitSync();
  const { retryPayment, isRetrying, retryCount, lastError: retryError, resetRetry } = usePaymentRetry(3, 1000);
  const { trackEvent } = useConversionTracking();

  // Wagmi signMessage hook
  const { signMessage, isPending: isSigning } = useSignMessage();

  const [activeTab, setActiveTab] = useState<PaymentTab>('x402');
  const [step, setStep] = useState<PaymentStep>('estimate');
  const [isProcessing, setIsProcessing] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [progressValue, setProgressValue] = useState(0);
  const [completedAt, setCompletedAt] = useState('');
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [failedPaymentId, setFailedPaymentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [selectedTier, setSelectedTier] = useState<string>('pro');
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [isWalletFlow, setIsWalletFlow] = useState(false);

  // Currency state
  const [currencies, setCurrencies] = useState<{ code: string; name: string; symbol: string; rate: number }[]>([]);
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  const [convertedAmount, setConvertedAmount] = useState<number | null>(null);

  // Use chain split config if available, otherwise default
  const split = splitConfig
    ? {
        human: splitConfig.humanBps / 100,
        avatar: splitConfig.avatarBps / 100,
        protocol: splitConfig.protocolBps / 100,
      }
    : { human: 70, avatar: 20, protocol: 10 };

  const gasFee = activeTab === 'x402' ? amount * 0.05 : 0;
  const totalAmount = amount + gasFee;
  const riskLevel = getRiskLevel(amount);
  const riskConfig = getRiskConfig(t)[riskLevel];

  // Human/avatar/protocol split amounts
  const humanAmount = totalAmount * (split.human / 100);
  const avatarAmount = totalAmount * (split.avatar / 100);
  const protocolAmount = totalAmount * (split.protocol / 100);

  // ── Track payment initiated when dialog opens ────────
  useEffect(() => {
    if (isOpen) {
      trackEvent('payment_initiated', { amount });
    }
  }, [isOpen, amount, trackEvent]);

  // ── Fetch currencies ─────────────────────────────────
  useEffect(() => {
    if (isOpen && (activeTab === 'stripe' || activeTab === 'subscription')) {
      fetch('/api/currency')
        .then((res) => res.ok ? res.json() : null)
        .then((data) => {
          if (Array.isArray(data)) {
            setCurrencies(data);
          }
        })
        .catch(() => {});
    }
  }, [isOpen, activeTab]);

  // ── Convert currency ─────────────────────────────────
  useEffect(() => {
    if (selectedCurrency !== 'USD' && (activeTab === 'stripe' || activeTab === 'subscription')) {
      const targetAmount = activeTab === 'subscription'
        ? SUBSCRIPTION_TIERS.find((tier) => tier.key === selectedTier)?.price ?? 29.99
        : totalAmount;
      fetch('/api/currency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: targetAmount, from: 'USD', to: selectedCurrency }),
      })
        .then((res) => res.ok ? res.json() : null)
        .then((data) => {
          if (data?.amount != null) {
            setConvertedAmount(data.amount);
          }
        })
        .catch(() => setConvertedAmount(null));
    } else {
      setConvertedAmount(null);
    }
  }, [selectedCurrency, activeTab, selectedTier, totalAmount]);

  // Get display amount
  const getDisplayAmount = (usdAmount: number) => {
    if (selectedCurrency === 'USD' || convertedAmount === null) {
      return `$${usdAmount.toFixed(2)} USD`;
    }
    const curr = currencies.find((c) => c.code === selectedCurrency);
    return `${curr?.symbol || ''}${convertedAmount.toFixed(2)} ${selectedCurrency}`;
  };

  // ── Confirm payment via wallet sign → verify API ──────
  const confirmViaWalletSignature = useCallback(async (createdPaymentId: string) => {
    const message = `BB Protocol Payment Authorization\n\nPayment ID: ${createdPaymentId}\nService: ${service}\nAmount: $${totalAmount.toFixed(4)} USDC\nTimestamp: ${new Date().toISOString()}`;

    return new Promise<{ signature: string; message: string }>((resolve, reject) => {
      signMessage(
        { message },
        {
          onSuccess: (signature) => {
            resolve({ signature, message });
          },
          onError: (err) => {
            reject(new Error(err.message || 'Wallet signature rejected'));
          },
        },
      );
    });
  }, [signMessage, service, totalAmount]);

  // ── Simulated confirmation (fallback when wallet not connected) ──
  const confirmViaSimulation = useCallback(async (createdPaymentId: string) => {
    // Simulate blockchain confirmation progress
    const progressInterval = setInterval(() => {
      setProgressValue((prev) => {
        if (prev >= 90) return prev + 1;
        return prev + Math.random() * 15 + 5;
      });
    }, 300);

    // Simulate tx hash generation
    const simulatedTxHash =
      '0x' +
      Array.from({ length: 64 }, () =>
        Math.floor(Math.random() * 16).toString(16),
      ).join('');

    // Wait for "confirmation"
    await new Promise((resolve) => setTimeout(resolve, 2000));
    clearInterval(progressInterval);
    setProgressValue(100);

    // Confirm payment via PATCH API (this also creates Revenue record)
    const confirmRes = await fetch(`/api/payment/${createdPaymentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'confirmed', txHash: simulatedTxHash }),
    });

    if (!confirmRes.ok) {
      const errData = await confirmRes.json().catch(() => ({}));
      throw new Error(errData.message || 'Failed to confirm payment');
    }

    return simulatedTxHash;
  }, []);

  // ── Handle x402 confirm ────────────────────────────────
  const handleX402Confirm = useCallback(async () => {
    setStep('confirm');
    setIsProcessing(true);
    setProgressValue(0);
    setError(null);
    setFailedPaymentId(null);
    resetRetry();
    trackEvent('payment_submitted', { method: 'x402', amount });

    let createdPaymentId: string = '';

    try {
      // 1. Create payment record via API
      const createRes = await fetch('/api/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          avatarId: 'default',
          serviceName: service,
          amount,
          currency: 'USDC',
          gasFee,
          riskLevel,
        }),
      });

      if (!createRes.ok) {
        const errData = await createRes.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to create payment');
      }
      const payment = await createRes.json();
      createdPaymentId = payment.id;
      setPaymentId(createdPaymentId);

      let finalTxHash: string;

      if (isConnected) {
        // 2a. Wallet connected flow: sign message as authorization proof
        setIsWalletFlow(true);
        setProgressValue(10);

        try {
          const { signature, message } = await confirmViaWalletSignature(createdPaymentId);
          setProgressValue(50);

          // 3. Submit signed message to verify endpoint
          const verifyRes = await fetch(`/api/payment/${createdPaymentId}/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ signature, message }),
          });

          if (!verifyRes.ok) {
            const errData = await verifyRes.json().catch(() => ({}));
            throw new Error(errData.message || 'Signature verification failed');
          }

          setProgressValue(100);
          finalTxHash = signature.slice(0, 66);
        } catch (signError) {
          // If signing fails or is rejected, fall back to simulation
          const errMsg = signError instanceof Error ? signError.message : 'Signature failed';
          toast({
            title: t('payment.signatureRejected') || 'Signature Rejected',
            description: t('payment.fallingBackToSimulation') || 'Falling back to simulated confirmation',
            variant: 'default',
          });
          setIsWalletFlow(false);
          finalTxHash = await confirmViaSimulation(createdPaymentId);
        }
      } else {
        // 2b. Wallet not connected: use simulation fallback
        setIsWalletFlow(false);
        finalTxHash = await confirmViaSimulation(createdPaymentId);
      }

      setTxHash(finalTxHash);
      setCompletedAt(format(new Date(), 'yyyy-MM-dd HH:mm:ss'));
      setStep('complete');
      trackEvent('payment_completed', { method: 'x402', paymentId: createdPaymentId ?? undefined, amount });

      // Show success toast
      toast({
        title: t('payment.paymentSuccess'),
        description: `${service} — $${totalAmount.toFixed(4)} USDC`,
      });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Payment failed';
      setError(errMsg);
      setFailedPaymentId(createdPaymentId);
      trackEvent('payment_failed', { method: 'x402', paymentId: createdPaymentId ?? undefined, amount });

      // Show error toast
      toast({
        title: t('payment.paymentFailed') || 'Payment Failed',
        description: errMsg,
        variant: 'destructive',
      });

      // Try to fail the payment in DB
      if (createdPaymentId) {
        await fetch(`/api/payment/${createdPaymentId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'failed' }),
        }).catch(() => {});
      }
      // Return to estimate step on error
      setStep('estimate');
    } finally {
      setIsProcessing(false);
    }
  }, [service, amount, gasFee, riskLevel, isConnected, confirmViaWalletSignature, confirmViaSimulation, toast, t, resetRetry, totalAmount, trackEvent]);

  // ── Handle retry ──────────────────────────────────────
  const handleRetry = useCallback(async () => {
    if (!failedPaymentId) return;

    trackEvent('payment_retried', { method: 'x402', paymentId: failedPaymentId });
    const newPaymentId = await retryPayment(failedPaymentId);
    if (newPaymentId) {
      setPaymentId(newPaymentId);
      setFailedPaymentId(null);
      setError(null);
      // Trigger new confirmation flow for the retried payment
      toast({
        title: t('payment.retryCreated') || 'Retry Payment Created',
        description: `New payment: ${newPaymentId.slice(0, 8)}...`,
      });
    }
  }, [failedPaymentId, retryPayment, toast, t, trackEvent]);

  // ── Handle Stripe payment ──────────────────────────────
  const handleStripePayment = useCallback(async () => {
    setStripeLoading(true);
    setError(null);
    trackEvent('payment_submitted', { method: 'stripe', amount: totalAmount });
    try {
      const res = await fetch('/api/stripe/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          avatarId: 'default',
          serviceName: service,
          amount: totalAmount,
          paymentType: 'one_time',
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to create Stripe session');
      }
      const data = await res.json();
      if (data.url) {
        // Show info toast before redirecting to Stripe
        toast({
          title: t('payment.redirecting') || 'Redirecting...',
          description: t('payment.redirectingToStripe') || 'You are being redirected to Stripe for payment.',
        });
        window.location.href = data.url;
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Stripe payment failed';
      setError(errMsg);

      // Show error toast
      toast({
        title: t('payment.paymentFailed') || 'Payment Failed',
        description: errMsg,
        variant: 'destructive',
      });
    } finally {
      setStripeLoading(false);
    }
  }, [service, totalAmount, toast, t, trackEvent]);

  // ── Get subscription tier price (MUST be before handleSubscribe) ────
  const selectedTierPrice = SUBSCRIPTION_TIERS.find((tier) => tier.key === selectedTier)?.price ?? 29.99;

  // ── Handle close (MUST be before handleSubscribe which calls it) ────
  const handleClose = useCallback(() => {
    if (step === 'confirm' && isProcessing) return; // Block close during processing
    // Reset all state
    setStep('estimate');
    setIsProcessing(false);
    setTxHash('');
    setProgressValue(0);
    setCompletedAt('');
    setPaymentId(null);
    setFailedPaymentId(null);
    setError(null);
    setIsWalletFlow(false);
    setActiveTab('x402');
    setStripeLoading(false);
    setSubscriptionLoading(false);
    setSelectedCurrency('USD');
    setConvertedAmount(null);
    resetRetry();
    onClose();
  }, [step, isProcessing, onClose, resetRetry]);

  // ── Handle Subscription ────────────────────────────────
  const handleSubscribe = useCallback(async () => {
    setSubscriptionLoading(true);
    setError(null);
    trackEvent('payment_submitted', { method: 'subscription', amount: selectedTierPrice });
    try {
      const res = await fetch('/api/stripe/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarId: 'default', tier: selectedTier }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to create subscription');
      }
      // Success - show toast and close dialog
      toast({
        title: t('payment.paymentSuccess'),
        description: `${t(`subscription.tier${selectedTier.charAt(0).toUpperCase() + selectedTier.slice(1)}`)} subscription activated`,
      });
      handleClose();
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Subscription failed';
      setError(errMsg);

      // Show error toast
      toast({
        title: t('payment.paymentFailed') || 'Subscription Failed',
        description: errMsg,
        variant: 'destructive',
      });
    } finally {
      setSubscriptionLoading(false);
    }
  }, [selectedTier, toast, t, trackEvent, selectedTierPrice, handleClose]);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          handleClose();
        }
      }}
    >
      <DialogContent className="border-slate-700 bg-slate-800 text-slate-100 sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-slate-100">
              <Wallet className="size-5 text-violet-400" />
              {t('payment.title')}
            </DialogTitle>
            {/* Currency selector - only when Stripe or Subscription tab is active */}
            {(activeTab === 'stripe' || activeTab === 'subscription') && currencies.length > 0 && (
              <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
                <SelectTrigger className="h-7 w-[90px] text-[10px] border-slate-600 bg-slate-900/60 text-slate-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-slate-700 bg-slate-800">
                  <SelectItem value="USD" className="text-xs text-slate-300">USD</SelectItem>
                  {currencies.filter((c) => c.code !== 'USD').map((c) => (
                    <SelectItem key={c.code} value={c.code} className="text-xs text-slate-300">
                      {c.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <DialogDescription className="text-slate-400">
            {t('payment.description')}
          </DialogDescription>
        </DialogHeader>

        {/* ── Split sync warning ─────────────────────────── */}
        {activeTab === 'x402' && !isSynced && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2"
          >
            <AlertTriangle className="size-3.5 shrink-0 text-amber-400" />
            <span className="text-[10px] text-amber-300">
              {t('payment.splitOutOfSync')}
            </span>
          </motion.div>
        )}

        {/* ── Tabs: x402 / Stripe / Subscription ────────── */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => {
            setActiveTab(v as PaymentTab);
            setError(null);
            trackEvent('payment_method_selected', { method: v as 'x402' | 'stripe' | 'subscription' });
          }}
        >
          <TabsList className="bg-slate-900/60 w-full">
            <TabsTrigger
              value="x402"
              className="flex-1 gap-1.5 data-[state=active]:bg-violet-600/20 data-[state=active]:text-violet-300"
            >
              <Wallet className="size-3.5" />
              {t('payment.tabX402')}
            </TabsTrigger>
            <TabsTrigger
              value="stripe"
              className="flex-1 gap-1.5 data-[state=active]:bg-cyan-600/20 data-[state=active]:text-cyan-300"
            >
              <CreditCard className="size-3.5" />
              {t('payment.tabStripe')}
            </TabsTrigger>
            <TabsTrigger
              value="subscription"
              className="flex-1 gap-1 data-[state=active]:bg-violet-600/20 data-[state=active]:text-violet-300"
            >
              <Crown className="size-3.5" />
              {t('payment.tabSubscription')}
            </TabsTrigger>
          </TabsList>

          {/* ── x402 Tab Content ────────────────────────── */}
          <TabsContent value="x402" className="mt-3">
            {/* ── Step indicator ────────────────────────── */}
            <div className="py-2">
              <StepIndicator step={step} t={t} />
            </div>

            {/* ── Error display ────────────────────────── */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-3 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400"
              >
                <div className="flex items-start justify-between gap-2">
                  <span>{error}</span>
                  {failedPaymentId && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 shrink-0 border-red-500/30 bg-red-500/10 text-[10px] text-red-300 hover:bg-red-500/20 hover:text-red-200"
                      onClick={handleRetry}
                      disabled={isRetrying}
                      aria-label={t('payment.retry') || 'Retry payment'}
                    >
                      {isRetrying ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        <RefreshCw className="size-3" />
                      )}
                      {isRetrying
                        ? `${t('payment.retrying') || 'Retrying'}... (${retryCount}/3)`
                        : t('payment.retry') || 'Retry'}
                    </Button>
                  )}
                </div>
                {retryError && (
                  <p className="mt-1 text-[10px] text-red-300/70">
                    {t('payment.retryError') || 'Retry error'}: {retryError}
                  </p>
                )}
              </motion.div>
            )}

            <AnimatePresence mode="wait">
              {/* ── Step 1: Estimate ─────────────────────── */}
              {step === 'estimate' && (
                <motion.div
                  key="estimate"
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-4"
                >
                  {/* Wallet connection status */}
                  {!isConnected && (
                    <div className="flex items-center gap-2 rounded-md border border-amber-500/20 bg-amber-500/5 px-3 py-2">
                      <AlertTriangle className="size-3.5 shrink-0 text-amber-400/70" />
                      <span className="text-[10px] text-amber-300/70">
                        {t('payment.walletNotConnected') || 'Wallet not connected — payment will be simulated'}
                      </span>
                    </div>
                  )}
                  {isConnected && (
                    <div className="flex items-center gap-2 rounded-md border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
                      <Shield className="size-3.5 shrink-0 text-emerald-400/70" />
                      <span className="text-[10px] text-emerald-300/70">
                        {t('payment.walletConnected') || 'Wallet connected — signature verification will be used'}
                      </span>
                    </div>
                  )}

                  {/* Service & cost */}
                  <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-400">
                        {t('payment.service')}
                      </span>
                      <span className="text-sm font-medium text-slate-200">
                        {service}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-sm text-slate-400">
                        {t('payment.fee')}
                      </span>
                      <span className="text-sm font-medium text-slate-200">
                        ${amount.toFixed(4)} USDC + ${gasFee.toFixed(4)} Gas
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-sm text-slate-400">
                        {t('payment.total')}
                      </span>
                      <span className="text-sm font-bold text-violet-400">
                        ${totalAmount.toFixed(4)} USDC
                      </span>
                    </div>
                  </div>

                  {/* Risk badge */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">
                      {t('payment.riskLevel')}
                    </span>
                    <Badge variant="outline" className={riskConfig.badgeClass}>
                      {riskConfig.label}
                    </Badge>
                  </div>

                  {/* Split preview */}
                  <div className="space-y-3">
                    <p className="text-xs font-medium text-slate-400">
                      {t('payment.revenueSplit')}
                    </p>

                    {/* Visual bar */}
                    <div className="flex h-3 overflow-hidden rounded-full">
                      <div
                        className="bg-violet-500 transition-all"
                        style={{ width: `${split.human}%` }}
                      />
                      <div
                        className="bg-cyan-500 transition-all"
                        style={{ width: `${split.avatar}%` }}
                      />
                      <div
                        className="bg-emerald-500 transition-all"
                        style={{ width: `${split.protocol}%` }}
                      />
                    </div>

                    {/* Split details */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="size-2 rounded-full bg-violet-500" />
                          <span className="text-slate-300">
                            {t('payment.yourWallet')}
                          </span>
                        </div>
                        <span className="text-slate-200">
                          ${humanAmount.toFixed(4)} ({split.human}%)
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="size-2 rounded-full bg-cyan-500" />
                          <span className="text-slate-300">
                            {t('payment.avatarVault')}
                          </span>
                        </div>
                        <span className="text-slate-200">
                          ${avatarAmount.toFixed(4)} ({split.avatar}%)
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="size-2 rounded-full bg-emerald-500" />
                          <span className="text-slate-300">
                            {t('payment.protocolLP')}
                          </span>
                        </div>
                        <span className="text-slate-200">
                          ${protocolAmount.toFixed(4)} ({split.protocol}%)
                        </span>
                      </div>
                    </div>

                    {/* Chain indicator */}
                    {splitConfig ? (
                      <p className="text-[10px] text-emerald-400">
                        {t('payment.chainSplitActive')}
                      </p>
                    ) : (
                      <p className="text-[10px] text-slate-500">
                        {t('payment.defaultSplitNote')}
                      </p>
                    )}
                  </div>
                </motion.div>
              )}

              {/* ── Step 2: Confirm ──────────────────────── */}
              {step === 'confirm' && (
                <motion.div
                  key="confirm"
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-4"
                >
                  <div className="flex flex-col items-center gap-3 py-4">
                    <motion.div
                      animate={
                        isProcessing ? { rotate: 360 } : {}
                      }
                      transition={
                        isProcessing
                          ? { duration: 1, repeat: Infinity, ease: 'linear' }
                          : {}
                      }
                    >
                      <Loader2
                        className={cn(
                          'size-10',
                          isProcessing
                            ? 'text-violet-400'
                            : 'text-slate-500',
                        )}
                      />
                    </motion.div>
                    <p className="text-sm text-slate-300">
                      {isProcessing
                        ? isSigning
                          ? (t('payment.signingMessage') || 'Waiting for wallet signature...')
                          : isWalletFlow
                            ? (t('payment.verifyingSignature') || 'Verifying wallet signature...')
                            : t('payment.confirmingTransaction')
                        : t('payment.transactionSubmitted')}
                    </p>

                    <div className="w-full">
                      <Progress
                        value={Math.min(progressValue, 100)}
                        className="h-2 bg-slate-700 [&>div]:bg-violet-500"
                      />
                      <p className="mt-1 text-right text-[10px] text-slate-500">
                        {Math.min(Math.round(progressValue), 100)}%
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ── Step 3: Complete ─────────────────────── */}
              {step === 'complete' && (
                <motion.div
                  key="complete"
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-4"
                >
                  <div className="flex flex-col items-center gap-3 py-2">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{
                        type: 'spring',
                        stiffness: 200,
                        damping: 15,
                      }}
                    >
                      <CheckCircle className="size-12 text-emerald-400" />
                    </motion.div>
                    <p className="text-base font-medium text-emerald-400">
                      {t('payment.paymentSuccess')}
                    </p>
                    {isWalletFlow && (
                      <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 gap-1">
                        <Shield className="size-3" />
                        {t('payment.verifiedByWallet') || 'Verified by wallet signature'}
                      </Badge>
                    )}
                  </div>

                  {/* Receipt */}
                  <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-4">
                    <p className="mb-3 text-xs font-medium text-slate-400">
                      {t('payment.transactionReceipt')}
                    </p>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400">
                          {t('payment.service')}
                        </span>
                        <span className="text-slate-200">{service}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">
                          {t('payment.amount')}
                        </span>
                        <span className="text-slate-200">
                          ${totalAmount.toFixed(4)} USDC
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">
                          {t('payment.time')}
                        </span>
                        <span
                          className="text-slate-200"
                          suppressHydrationWarning
                        >
                          {completedAt || '---'}
                        </span>
                      </div>
                      {paymentId && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">
                            {t('payment.paymentId')}
                          </span>
                          <span className="max-w-[180px] truncate font-mono text-cyan-400">
                            {paymentId}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-slate-400">Tx Hash</span>
                        <span className="max-w-[180px] truncate font-mono text-violet-400">
                          {txHash}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actual split */}
                  <div className="space-y-1">
                    <p className="text-xs text-slate-400">
                      {t('payment.actualSplit')}
                    </p>
                    <div className="flex h-2.5 overflow-hidden rounded-full">
                      <div
                        className="bg-violet-500"
                        style={{ width: `${split.human}%` }}
                      />
                      <div
                        className="bg-cyan-500"
                        style={{ width: `${split.avatar}%` }}
                      />
                      <div
                        className="bg-emerald-500"
                        style={{ width: `${split.protocol}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>
                        {t('payment.walletShort')} ${humanAmount.toFixed(4)}
                      </span>
                      <span>
                        {t('payment.vaultShort')} ${avatarAmount.toFixed(4)}
                      </span>
                      <span>
                        {t('payment.lpShort')} ${protocolAmount.toFixed(4)}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </TabsContent>

          {/* ── Stripe Tab Content ──────────────────────── */}
          <TabsContent value="stripe" className="mt-3">
            {/* ── Error display ────────────────────────── */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-3 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400"
              >
                {error}
              </motion.div>
            )}

            <div className="space-y-4">
              {/* Service & cost */}
              <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">
                    {t('payment.service')}
                  </span>
                  <span className="text-sm font-medium text-slate-200">
                    {service}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm text-slate-400">
                    {t('payment.total')}
                  </span>
                  <span className="text-sm font-bold text-cyan-400">
                    {getDisplayAmount(totalAmount)}
                  </span>
                </div>
              </div>

              {/* Stripe Link badge */}
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="border-cyan-500/30 bg-cyan-500/10 text-cyan-400 gap-1"
                >
                  <Link2 className="size-3" />
                  {t('payment.stripeLink')}
                </Badge>
              </div>

              {/* Stripe info */}
              <div className="rounded-lg border border-slate-700/50 bg-slate-900/40 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard className="size-4 text-cyan-400" />
                  <span className="text-xs font-medium text-slate-300">
                    {t('payment.creditCardInfo')}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500">
                  {t('payment.stripeSecureNote')}
                </p>
              </div>

              {/* Powered by Stripe */}
              <div className="flex items-center justify-center gap-1.5 py-1">
                <DollarSign className="size-3 text-slate-500" />
                <span className="text-[10px] text-slate-500">
                  {t('payment.poweredByStripe')}
                </span>
              </div>
            </div>
          </TabsContent>

          {/* ── Subscription Tab Content ─────────────────── */}
          <TabsContent value="subscription" className="mt-3">
            {/* ── Error display ────────────────────────── */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-3 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400"
              >
                {error}
              </motion.div>
            )}

            <div className="space-y-4">
              {/* Tier selection */}
              <div className="space-y-2">
                {SUBSCRIPTION_TIERS.map((tier) => (
                  <button
                    key={tier.key}
                    onClick={() => setSelectedTier(tier.key)}
                    className={cn(
                      'w-full flex items-center justify-between p-3 rounded-lg border transition-all',
                      selectedTier === tier.key
                        ? 'border-violet-500/50 bg-violet-500/10'
                        : 'border-slate-700/50 bg-slate-900/40 hover:bg-slate-900/60'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'w-4 h-4 rounded-full border-2 flex items-center justify-center',
                          selectedTier === tier.key
                            ? 'border-violet-400'
                            : 'border-slate-600'
                        )}
                      >
                        {selectedTier === tier.key && (
                          <div className="w-2 h-2 rounded-full bg-violet-400" />
                        )}
                      </div>
                      <div className="text-left">
                        <div className={cn(
                          'text-sm font-medium',
                          selectedTier === tier.key ? 'text-violet-300' : 'text-slate-300'
                        )}>
                          {t(`subscription.tier${tier.key.charAt(0).toUpperCase() + tier.key.slice(1)}`)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={cn(
                        'text-sm font-bold',
                        selectedTier === tier.key ? 'text-violet-400' : 'text-slate-300'
                      )}>
                        {getDisplayAmount(tier.price)}
                      </span>
                      <span className="text-[10px] text-slate-500">/{t('subscription.month')}</span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Cancel anytime text */}
              <p className="text-[10px] text-slate-500 text-center">
                {t('subscription.cancelAnytime')}
              </p>
            </div>
          </TabsContent>
        </Tabs>

        {/* ── Footer buttons ────────────────────────────── */}
        <DialogFooter className="gap-2">
          {/* x402 tab footer */}
          {activeTab === 'x402' && step === 'estimate' && (
            <>
              <DialogClose asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-slate-600 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
                  onClick={handleClose}
                >
                  {t('payment.cancel')}
                </Button>
              </DialogClose>
              <Button
                size="sm"
                className="bg-violet-600 text-white hover:bg-violet-500"
                onClick={handleX402Confirm}
                disabled={isRetrying}
              >
                <DollarSign className="size-3.5" />
                {t('payment.confirmPay')}
              </Button>
            </>
          )}

          {activeTab === 'x402' && step === 'confirm' && isProcessing && (
            <Button
              size="sm"
              variant="outline"
              className="border-slate-600 text-slate-500"
              disabled
            >
              <Loader2 className="size-3.5 animate-spin" />
              {isSigning
                ? (t('payment.signingMessage') || 'Signing...')
                : t('payment.processing')}
            </Button>
          )}

          {activeTab === 'x402' && step === 'complete' && (
            <Button
              size="sm"
              className="bg-emerald-600 text-white hover:bg-emerald-500"
              onClick={handleClose}
            >
              <CheckCircle className="size-3.5" />
              {t('payment.complete')}
            </Button>
          )}

          {/* Stripe tab footer */}
          {activeTab === 'stripe' && (
            <>
              <DialogClose asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-slate-600 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
                  onClick={handleClose}
                >
                  {t('payment.cancel')}
                </Button>
              </DialogClose>
              <Button
                size="sm"
                className="bg-cyan-600 text-white hover:bg-cyan-500"
                onClick={handleStripePayment}
                disabled={stripeLoading}
              >
                {stripeLoading ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <CreditCard className="size-3.5" />
                )}
                {stripeLoading
                  ? t('payment.redirecting')
                  : t('payment.payWithCard')}
              </Button>
            </>
          )}

          {/* Subscription tab footer */}
          {activeTab === 'subscription' && (
            <>
              <DialogClose asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-slate-600 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
                  onClick={handleClose}
                >
                  {t('payment.cancel')}
                </Button>
              </DialogClose>
              <Button
                size="sm"
                className="bg-violet-600 text-white hover:bg-violet-500"
                onClick={handleSubscribe}
                disabled={subscriptionLoading}
              >
                {subscriptionLoading ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Crown className="size-3.5" />
                )}
                {subscriptionLoading
                  ? t('payment.processing')
                  : t('payment.subscribe')}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
