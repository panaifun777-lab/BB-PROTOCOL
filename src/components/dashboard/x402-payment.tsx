'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet,
  DollarSign,
  CheckCircle,
  Loader2,
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
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useI18n, type TranslateFn } from '@/hooks/use-i18n';

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

// ── Mock split percentages ─────────────────────────────
const SPLIT = { human: 70, avatar: 20, protocol: 10 };

// ── Generate mock tx hash ──────────────────────────────
function mockTxHash(): string {
  const hex = () =>
    Array.from({ length: 8 }, () =>
      Math.floor(Math.random() * 16).toString(16),
    ).join('');
  return `0x${hex()}${hex()}${hex()}${hex()}`;
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
  const [step, setStep] = useState<PaymentStep>('estimate');
  const [isProcessing, setIsProcessing] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [progressValue, setProgressValue] = useState(0);
  const [completedAt, setCompletedAt] = useState('');

  const gasFee = amount * 0.05; // 5% gas
  const totalAmount = amount + gasFee;
  const riskLevel = getRiskLevel(amount);
  const riskConfig = getRiskConfig(t)[riskLevel];

  // Human/avatar/protocol split amounts
  const humanAmount = totalAmount * (SPLIT.human / 100);
  const avatarAmount = totalAmount * (SPLIT.avatar / 100);
  const protocolAmount = totalAmount * (SPLIT.protocol / 100);

  // ── Handlers ─────────────────────────────────────────
  const handleConfirm = useCallback(() => {
    setStep('confirm');
    setIsProcessing(true);
    setProgressValue(0);

    // Simulate blockchain confirmation
    const progressInterval = setInterval(() => {
      setProgressValue((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + Math.random() * 20 + 5;
      });
    }, 400);

    setTimeout(() => {
      clearInterval(progressInterval);
      setProgressValue(100);
      setIsProcessing(false);
      setTxHash(mockTxHash());
      setCompletedAt(format(new Date(), 'yyyy-MM-dd HH:mm:ss'));
      setStep('complete');
    }, 2500);
  }, []);

  const handleClose = useCallback(() => {
    if (step === 'confirm' && isProcessing) return; // Block close during processing
    onClose();
  }, [step, isProcessing, onClose]);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          handleClose();
        } else {
          // Reset all state when reopening
          setStep('estimate');
          setIsProcessing(false);
          setTxHash('');
          setProgressValue(0);
          setCompletedAt('');
        }
      }}
    >
      <DialogContent className="border-slate-700 bg-slate-800 text-slate-100 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-100">
            <Wallet className="size-5 text-violet-400" />
            {t('payment.title')}
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            {t('payment.description')}
          </DialogDescription>
        </DialogHeader>

        {/* ── Step indicator ────────────────────────────── */}
        <div className="py-2">
          <StepIndicator step={step} t={t} />
        </div>

        <AnimatePresence mode="wait">
          {/* ── Step 1: Estimate ─────────────────────────── */}
          {step === 'estimate' && (
            <motion.div
              key="estimate"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              {/* Service & cost */}
              <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">{t('payment.service')}</span>
                  <span className="text-sm font-medium text-slate-200">
                    {service}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm text-slate-400">{t('payment.fee')}</span>
                  <span className="text-sm font-medium text-slate-200">
                    ${amount.toFixed(4)} USDC + ${gasFee.toFixed(4)} Gas
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-sm text-slate-400">{t('payment.total')}</span>
                  <span className="text-sm font-bold text-violet-400">
                    ${totalAmount.toFixed(4)} USDC
                  </span>
                </div>
              </div>

              {/* Risk badge */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">{t('payment.riskLevel')}</span>
                <Badge variant="outline" className={riskConfig.badgeClass}>
                  {riskConfig.label}
                </Badge>
              </div>

              {/* Split preview */}
              <div className="space-y-3">
                <p className="text-xs font-medium text-slate-400">{t('payment.revenueSplit')}</p>

                {/* Visual bar */}
                <div className="flex h-3 overflow-hidden rounded-full">
                  <div
                    className="bg-violet-500 transition-all"
                    style={{ width: `${SPLIT.human}%` }}
                  />
                  <div
                    className="bg-cyan-500 transition-all"
                    style={{ width: `${SPLIT.avatar}%` }}
                  />
                  <div
                    className="bg-emerald-500 transition-all"
                    style={{ width: `${SPLIT.protocol}%` }}
                  />
                </div>

                {/* Split details */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="size-2 rounded-full bg-violet-500" />
                      <span className="text-slate-300">{t('payment.yourWallet')}</span>
                    </div>
                    <span className="text-slate-200">
                      ${humanAmount.toFixed(4)} ({SPLIT.human}%)
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="size-2 rounded-full bg-cyan-500" />
                      <span className="text-slate-300">{t('payment.avatarVault')}</span>
                    </div>
                    <span className="text-slate-200">
                      ${avatarAmount.toFixed(4)} ({SPLIT.avatar}%)
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="size-2 rounded-full bg-emerald-500" />
                      <span className="text-slate-300">{t('payment.protocolLP')}</span>
                    </div>
                    <span className="text-slate-200">
                      ${protocolAmount.toFixed(4)} ({SPLIT.protocol}%)
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Step 2: Confirm ──────────────────────────── */}
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
                  animate={isProcessing ? { rotate: 360 } : {}}
                  transition={
                    isProcessing
                      ? { duration: 1, repeat: Infinity, ease: 'linear' }
                      : {}
                  }
                >
                  <Loader2
                    className={cn(
                      'size-10',
                      isProcessing ? 'text-violet-400' : 'text-slate-500',
                    )}
                  />
                </motion.div>
                <p className="text-sm text-slate-300">
                  {isProcessing ? t('payment.confirmingTransaction') : t('payment.transactionSubmitted')}
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

          {/* ── Step 3: Complete ─────────────────────────── */}
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
              </div>

              {/* Receipt */}
              <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-4">
                <p className="mb-3 text-xs font-medium text-slate-400">
                  {t('payment.transactionReceipt')}
                </p>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">{t('payment.service')}</span>
                    <span className="text-slate-200">{service}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">{t('payment.amount')}</span>
                    <span className="text-slate-200">
                      ${totalAmount.toFixed(4)} USDC
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">{t('payment.time')}</span>
                    <span className="text-slate-200" suppressHydrationWarning>
                      {completedAt || '---'}
                    </span>
                  </div>
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
                <p className="text-xs text-slate-400">{t('payment.actualSplit')}</p>
                <div className="flex h-2.5 overflow-hidden rounded-full">
                  <div
                    className="bg-violet-500"
                    style={{ width: `${SPLIT.human}%` }}
                  />
                  <div
                    className="bg-cyan-500"
                    style={{ width: `${SPLIT.avatar}%` }}
                  />
                  <div
                    className="bg-emerald-500"
                    style={{ width: `${SPLIT.protocol}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>{t('payment.walletShort')} ${humanAmount.toFixed(4)}</span>
                  <span>{t('payment.vaultShort')} ${avatarAmount.toFixed(4)}</span>
                  <span>{t('payment.lpShort')} ${protocolAmount.toFixed(4)}</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Footer buttons ────────────────────────────── */}
        <DialogFooter className="gap-2">
          {step === 'estimate' && (
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
                onClick={handleConfirm}
              >
                <DollarSign className="size-3.5" />
                {t('payment.confirmPay')}
              </Button>
            </>
          )}

          {step === 'confirm' && isProcessing && (
            <Button
              size="sm"
              variant="outline"
              className="border-slate-600 text-slate-500"
              disabled
            >
              <Loader2 className="size-3.5 animate-spin" />
              {t('payment.processing')}
            </Button>
          )}

          {step === 'complete' && (
            <Button
              size="sm"
              className="bg-emerald-600 text-white hover:bg-emerald-500"
              onClick={handleClose}
            >
              <CheckCircle className="size-3.5" />
              {t('payment.complete')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
