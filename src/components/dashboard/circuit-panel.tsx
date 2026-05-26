'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  ShieldAlert,
  ShieldOff,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import type { AvatarProfile, CircuitState } from '@/lib/types';
import { useI18n } from '@/hooks/use-i18n';

// ── Props ──────────────────────────────────────────────
interface CircuitPanelProps {
  avatar: AvatarProfile;
}

// ── Constants ──────────────────────────────────────────
const SOFT_THRESHOLD = 70;
const HARD_THRESHOLD = 50;
const RECOVERY_HOURS = 48;

const STATE_CONFIG: Record<
  CircuitState,
  {
    labelKey: string;
    emoji: string;
    borderClass: string;
    bgClass: string;
    badgeClass: string;
    icon: typeof ShieldCheck;
  }
> = {
  NORMAL: {
    labelKey: 'circuit.normalRun',
    emoji: '🟢',
    borderClass: 'border-l-4 border-l-emerald-500',
    bgClass: 'bg-emerald-500/5',
    badgeClass: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    icon: ShieldCheck,
  },
  SOFT_LIMIT: {
    labelKey: 'circuit.degradedRun',
    emoji: '🟡',
    borderClass: 'border-l-4 border-l-amber-500',
    bgClass: 'bg-amber-500/5',
    badgeClass: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    icon: ShieldAlert,
  },
  HARD_PAUSE: {
    labelKey: 'circuit.pausedState',
    emoji: '🔴',
    borderClass: 'border-l-4 border-l-red-500',
    bgClass: 'bg-red-500/5',
    badgeClass: 'bg-red-500/20 text-red-400 border-red-500/30',
    icon: ShieldOff,
  },
  RECOVERY: {
    labelKey: 'circuit.recoveringState',
    emoji: '🔄',
    borderClass: 'border-l-4 border-l-sky-500',
    bgClass: 'bg-sky-500/5',
    badgeClass: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
    icon: ShieldCheck,
  },
};

// ── Countdown Hook ─────────────────────────────────────
function useRecoveryCountdown(totalHours: number) {
  const [secondsLeft, setSecondsLeft] = useState(totalHours * 3600);
  const { t } = useI18n();

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [totalHours]);

  const hours = Math.floor(secondsLeft / 3600);
  const minutes = Math.floor((secondsLeft % 3600) / 60);
  return t('circuit.recoveryCountdown', { hours: String(hours), minutes: String(minutes).padStart(2, '0') });
}

// ── Component ──────────────────────────────────────────
export default function CircuitPanel({ avatar }: CircuitPanelProps) {
  const { t } = useI18n();
  const [state, setState] = useState<CircuitState>(avatar.circuitState);
  const [resonanceScore, setResonanceScore] = useState(avatar.resonanceScore);
  const [lastAction, setLastAction] = useState(t('circuit.defaultAction'));
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [showLog, setShowLog] = useState(false);

  const recoveryLabel = useRecoveryCountdown(RECOVERY_HOURS);

  const config = STATE_CONFIG[state];
  const StateIcon = config.icon;

  // ── Handlers ────────────────────────────────────────
  const handleManualPause = useCallback(() => {
    setState('SOFT_LIMIT');
    setResonanceScore(58);
    setLastAction(t('circuit.manualPauseDegraded'));
  }, [t]);

  const handleManualReview = useCallback(() => {
    setShowLog(true);
    setTimeout(() => setShowLog(false), 3000);
  }, []);

  const handleApproveAction = useCallback(() => {
    setPendingAction(null);
    setState('SOFT_LIMIT');
    setResonanceScore(58);
  }, []);

  const handleFreeze = useCallback(() => {
    setState('HARD_PAUSE');
    setResonanceScore(0);
  }, []);

  const handleRecover = useCallback(() => {
    setState('RECOVERY');
    setResonanceScore(HARD_THRESHOLD + 5);
    setTimeout(() => {
      setState('NORMAL');
      setResonanceScore(85);
    }, 2000);
  }, []);

  const handleAdjustParams = useCallback(() => {
    setState('NORMAL');
    setResonanceScore(85);
  }, []);

  // ── Resonance bar color ─────────────────────────────
  const resonanceColor =
    resonanceScore >= SOFT_THRESHOLD
      ? 'bg-emerald-500'
      : resonanceScore >= HARD_THRESHOLD
        ? 'bg-amber-500'
        : 'bg-red-500';

  // ── Animated log ────────────────────────────────────
  const mockLogs = [
    { time: '14:32:01', event: t('circuit.logResonanceUpdate', { from: '82', to: '58' }), level: 'warn' },
    { time: '14:30:45', event: t('circuit.logGenRequest'), level: 'info' },
    { time: '14:28:12', event: t('circuit.logContractBlocked'), level: 'error' },
    { time: '14:25:00', event: t('circuit.logHeartbeatNormal'), level: 'info' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card
        className={cn(
          'relative overflow-hidden border-slate-700 bg-slate-800/80 backdrop-blur-sm',
          config.borderClass,
          config.bgClass,
        )}
      >
        {/* Top color bar */}
        <div
          className={cn(
            'absolute inset-x-0 top-0 h-1',
            state === 'NORMAL' && 'bg-emerald-500',
            state === 'SOFT_LIMIT' && 'bg-amber-500',
            state === 'HARD_PAUSE' && 'bg-red-500',
            state === 'RECOVERY' && 'bg-sky-500',
          )}
        />

        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base text-slate-100">
            <StateIcon
              className={cn(
                'size-5',
                state === 'NORMAL' && 'text-emerald-400',
                state === 'SOFT_LIMIT' && 'text-amber-400',
                state === 'HARD_PAUSE' && 'text-red-400',
                state === 'RECOVERY' && 'text-sky-400',
              )}
            />
            {t('circuit.title')}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* ── State indicator ─────────────────────────── */}
          <AnimatePresence mode="wait">
            <motion.div
              key={state}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.25 }}
              className="space-y-3"
            >
              {/* Status row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-400">{t('circuit.cognitionState')}:</span>
                  <Badge
                    variant="outline"
                    className={cn('font-medium', config.badgeClass)}
                  >
                    {config.emoji} {t(config.labelKey)}
                  </Badge>
                </div>
              </div>

              {/* ── NORMAL state ────────────────────────── */}
              {state === 'NORMAL' && (
                <div className="space-y-3">
                  <div className="text-sm text-slate-300">
                    {t('circuit.lastAction')}:{' '}
                    <span className="text-slate-100">{lastAction}</span>
                  </div>

                  {/* Resonance bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>{t('circuit.resonanceScoreLabel')}</span>
                      <span>{resonanceScore}/100</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-700">
                      <motion.div
                        className={cn('h-full rounded-full', resonanceColor)}
                        initial={{ width: 0 }}
                        animate={{ width: `${resonanceScore}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>{t('circuit.hardThresholdLabel')} {HARD_THRESHOLD}</span>
                      <span>{t('circuit.softThresholdLabel')} {SOFT_THRESHOLD}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* ── SOFT_LIMIT state ────────────────────── */}
              {state === 'SOFT_LIMIT' && (
                <div className="space-y-3">
                  <Alert className="border-amber-500/30 bg-amber-500/5">
                    <AlertTriangle className="size-4 text-amber-400" />
                    <AlertTitle className="text-amber-400">
                      {t('circuit.degradedRunAlert')}
                    </AlertTitle>
                    <AlertDescription className="text-amber-300/80">
                      {t('circuit.resonanceScoreLabel')}{' '}
                      <span className="font-bold text-amber-200">
                        {resonanceScore}
                      </span>{' '}
                      ({t('circuit.belowThreshold', { threshold: String(SOFT_THRESHOLD) })})
                    </AlertDescription>
                  </Alert>

                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    <Clock className="size-4 text-amber-400" />
                    {t('circuit.autoRecover')}:{' '}
                    <span className="font-medium text-amber-300">
                      {recoveryLabel}
                    </span>
                  </div>

                  {/* Resonance bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>{t('circuit.resonanceScoreLabel')}</span>
                      <span>{resonanceScore}/100</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-700">
                      <motion.div
                        className="h-full rounded-full bg-amber-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${resonanceScore}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>{t('circuit.hardThresholdLabel')} {HARD_THRESHOLD}</span>
                      <span>{t('circuit.softThresholdLabel')} {SOFT_THRESHOLD}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* ── HARD_PAUSE state ────────────────────── */}
              {state === 'HARD_PAUSE' && (
                <div className="space-y-3">
                  <Alert
                    variant="destructive"
                    className="border-red-500/30 bg-red-500/5"
                  >
                    <ShieldOff className="size-4 text-red-400" />
                    <AlertTitle className="text-red-400">
                      {t('circuit.cognitionPaused')}
                    </AlertTitle>
                    <AlertDescription className="text-red-300/80">
                      {t('circuit.triggerCause')}{' '}
                      <span className="font-bold text-red-200">
                        {resonanceScore}
                      </span>{' '}
                      {t('circuit.lessThanHardThreshold', { threshold: String(HARD_THRESHOLD) })}
                    </AlertDescription>
                  </Alert>

                  {pendingAction && (
                    <div className="flex items-center gap-2 rounded-md border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm">
                      <AlertTriangle className="size-4 text-red-400" />
                      <span className="text-slate-300">{t('circuit.pendingAction')}:</span>
                      <span className="font-medium text-red-300">
                        {pendingAction}
                      </span>
                      <Badge
                        variant="destructive"
                        className="ml-auto text-[10px]"
                      >
                        {t('circuit.intercepted')}
                      </Badge>
                    </div>
                  )}

                  {/* Resonance bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>{t('circuit.resonanceScoreLabel')}</span>
                      <span>{resonanceScore}/100</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-700">
                      <motion.div
                        className="h-full rounded-full bg-red-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${resonanceScore}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>{t('circuit.hardThresholdLabel')} {HARD_THRESHOLD}</span>
                      <span>{t('circuit.softThresholdLabel')} {SOFT_THRESHOLD}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* ── RECOVERY state ──────────────────────── */}
              {state === 'RECOVERY' && (
                <div className="space-y-3">
                  <Alert className="border-sky-500/30 bg-sky-500/5">
                    <ShieldCheck className="size-4 text-sky-400" />
                    <AlertTitle className="text-sky-400">{t('circuit.recoveringState')}</AlertTitle>
                    <AlertDescription className="text-sky-300/80">
                      {t('circuit.resonanceRecovering')}
                    </AlertDescription>
                  </Alert>

                  <div className="h-2 overflow-hidden rounded-full bg-slate-700">
                    <motion.div
                      className="h-full rounded-full bg-sky-500"
                      animate={{ width: `${resonanceScore}%` }}
                      transition={{ duration: 2, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* ── Action buttons ──────────────────────────── */}
          <div className="flex flex-wrap gap-2 pt-1">
            {state === 'NORMAL' && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-slate-100"
                  onClick={handleManualReview}
                >
                  {t('circuit.viewLog')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-amber-600 text-amber-400 hover:bg-amber-500/10"
                  onClick={handleManualPause}
                >
                  {t('circuit.manualPause')}
                </Button>
              </>
            )}

            {state === 'SOFT_LIMIT' && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-amber-600 text-amber-400 hover:bg-amber-500/10"
                  onClick={handleManualReview}
                >
                  {t('circuit.manualReview')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-sky-600 text-sky-400 hover:bg-sky-500/10"
                  onClick={handleAdjustParams}
                >
                  {t('circuit.adjustParams')}
                </Button>
              </>
            )}

            {state === 'HARD_PAUSE' && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-emerald-600 text-emerald-400 hover:bg-emerald-500/10"
                  onClick={handleApproveAction}
                >
                  {t('circuit.approveAction')}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleFreeze}
                >
                  {t('circuit.freezePermanently')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-sky-600 text-sky-400 hover:bg-sky-500/10"
                  onClick={handleRecover}
                >
                  {t('circuit.resumeRun')}
                </Button>
              </>
            )}

            {state === 'RECOVERY' && (
              <Button
                variant="outline"
                size="sm"
                disabled
                className="border-slate-600 text-slate-400"
              >
                <motion.span
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  {t('circuit.recoveringDots')}
                </motion.span>
              </Button>
            )}
          </div>

          {/* ── Inline log (temporary) ──────────────────── */}
          <AnimatePresence>
            {showLog && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="rounded-md border border-slate-700 bg-slate-900/60 p-3">
                  <p className="mb-2 text-xs font-medium text-slate-400">
                    {t('circuit.operationLog')}
                  </p>
                  <div className="max-h-32 space-y-1 overflow-y-auto text-xs">
                    {mockLogs.map((log, i) => (
                      <div key={i} className="flex gap-2">
                        <span className="text-slate-500">{log.time}</span>
                        <span
                          className={cn(
                            log.level === 'error' && 'text-red-400',
                            log.level === 'warn' && 'text-amber-400',
                            log.level === 'info' && 'text-slate-300',
                          )}
                        >
                          {log.event}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Demo controls ───────────────────────────── */}
          <div className="border-t border-slate-700 pt-3">
            <p className="mb-2 text-[10px] text-slate-500">
              {t('circuit.demoSwitch')}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {(['NORMAL', 'SOFT_LIMIT', 'HARD_PAUSE'] as CircuitState[]).map(
                (s) => (
                  <Button
                    key={s}
                    variant="ghost"
                    size="sm"
                    className={cn(
                      'h-6 px-2 text-[10px]',
                      state === s
                        ? 'bg-slate-700 text-slate-200'
                        : 'text-slate-500 hover:text-slate-300',
                    )}
                    onClick={() => {
                      setState(s);
                      if (s === 'NORMAL') {
                        setResonanceScore(85);
                        setPendingAction(null);
                      } else if (s === 'SOFT_LIMIT') {
                        setResonanceScore(58);
                        setPendingAction(null);
                      } else {
                        setResonanceScore(42);
                        setPendingAction(t('circuit.signContractAction'));
                      }
                    }}
                  >
                    {STATE_CONFIG[s].emoji} {t(STATE_CONFIG[s].labelKey)}
                  </Button>
                ),
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
