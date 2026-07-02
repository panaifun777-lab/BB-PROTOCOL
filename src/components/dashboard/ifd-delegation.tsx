'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  ArrowRightLeft,
  Check,
  X,
  Vote,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { Delegation } from '@/lib/types';
import { useI18n } from '@/hooks/use-i18n';

// ── Props ──────────────────────────────────────────────
interface IFDDelegationProps {
  delegations: Delegation[];
}

// ── Internal domain keys (not translated, used as identifiers) ──
type DomainKey = 'content' | 'negotiation' | 'data' | 'service';

const DOMAIN_KEYS: DomainKey[] = ['content', 'negotiation', 'data', 'service'];

// ── Domain icon color ──────────────────────────────────
const DOMAIN_COLORS: Record<DomainKey, string> = {
  content: 'text-violet-400',
  negotiation: 'text-amber-400',
  data: 'text-cyan-400',
  service: 'text-emerald-400',
};

const DOMAIN_BAR_COLORS: Record<DomainKey, string> = {
  content: 'bg-violet-500',
  negotiation: 'bg-amber-500',
  data: 'bg-cyan-500',
  service: 'bg-emerald-500',
};

// ── Full domain label key mapping ──────────────────────
const DOMAIN_LABEL_KEYS: Record<DomainKey, string> = {
  content: 'delegation.domainContent',
  negotiation: 'delegation.domainNegotiation',
  data: 'delegation.domainData',
  service: 'delegation.domainService',
};

const DOMAIN_SHORT_LABEL_KEYS: Record<DomainKey, string> = {
  content: 'delegation.domainContentShort',
  negotiation: 'delegation.domainNegotiationShort',
  data: 'delegation.domainDataShort',
  service: 'delegation.domainServiceShort',
};

// ── Available sub-avatars (domain keys, not display labels) ──
interface AvailableSub {
  id: string;
  nameKey: string;
  domain: DomainKey;
  cognitiveMatch: number;
}

const AVAILABLE_SUBS: AvailableSub[] = [
  { id: 'sub1', nameKey: 'delegation.subCopyName', domain: 'content', cognitiveMatch: 85 },
  { id: 'sub2', nameKey: 'delegation.subVideoName', domain: 'content', cognitiveMatch: 78 },
  { id: 'sub3', nameKey: 'delegation.subNegotiationName', domain: 'negotiation', cognitiveMatch: 82 },
  { id: 'sub4', nameKey: 'delegation.subDataName', domain: 'data', cognitiveMatch: 91 },
  { id: 'sub5', nameKey: 'delegation.subServiceName', domain: 'service', cognitiveMatch: 75 },
];

// ── Internal state for weight allocation ───────────────
interface WeightEntry {
  id: string;
  name: string;
  weight: number;
  isPrimary: boolean;
}

// ── Component ──────────────────────────────────────────
export default function IFDDelegation({ delegations }: IFDDelegationProps) {
  const { t } = useI18n();
  const [activeDomain, setActiveDomain] = useState<DomainKey>('content');

  // Selected sub-avatars per domain
  const [selected, setSelected] = useState<Record<DomainKey, string[]>>({
    content: ['sub1'],
    negotiation: [],
    data: [],
    service: [],
  });

  // Slider weights per domain (primary avatar weight)
  const [primaryWeights, setPrimaryWeights] = useState<Record<DomainKey, number>>({
    content: 60,
    negotiation: 100,
    data: 100,
    service: 100,
  });

  // Confirmation UI state
  const [confirmAction, setConfirmAction] = useState<'save' | 'revoke' | null>(null);
  const [confirmDomain, setConfirmDomain] = useState<DomainKey | null>(null);

  // ── Derived: weight entries for current domain ────────
  const weightEntries = useMemo<WeightEntry[]>(() => {
    const domainSelected = selected[activeDomain];
    const primaryWeight = primaryWeights[activeDomain];
    const primaryLabel = t('delegation.primaryAvatar', { name: t('delegation.primaryAvatarName') });

    if (domainSelected.length === 0) {
      return [{ id: 'primary', name: primaryLabel, weight: 100, isPrimary: true }];
    }

    const remaining = 100 - primaryWeight;
    const perSub = domainSelected.length > 0 ? Math.round(remaining / domainSelected.length) : 0;

    const entries: WeightEntry[] = [
      { id: 'primary', name: primaryLabel, weight: primaryWeight, isPrimary: true },
    ];

    domainSelected.forEach((subId) => {
      const sub = AVAILABLE_SUBS.find((a) => a.id === subId);
      if (sub) {
        entries.push({ id: sub.id, name: t(sub.nameKey), weight: perSub, isPrimary: false });
      }
    });

    // Fix rounding
    const total = entries.reduce((s, e) => s + e.weight, 0);
    if (total !== 100 && entries.length > 0) {
      entries[0].weight += 100 - total;
    }

    return entries;
  }, [activeDomain, selected, primaryWeights, t]);

  // ── Available subs for current domain ────────────────
  const domainSubs = useMemo(
    () => AVAILABLE_SUBS.filter((a) => a.domain === activeDomain),
    [activeDomain],
  );

  // ── Handlers ─────────────────────────────────────────
  const toggleSub = useCallback(
    (subId: string) => {
      setSelected((prev) => {
        const current = prev[activeDomain];
        const next = current.includes(subId)
          ? current.filter((id) => id !== subId)
          : [...current, subId];
        return { ...prev, [activeDomain]: next };
      });
    },
    [activeDomain],
  );

  const handleSliderChange = useCallback(
    (value: number[]) => {
      setPrimaryWeights((prev) => ({ ...prev, [activeDomain]: value[0] }));
    },
    [activeDomain],
  );

  const handleSave = useCallback(() => {
    setConfirmAction('save');
    setConfirmDomain(activeDomain);
  }, [activeDomain]);

  const handleRevoke = useCallback(() => {
    setConfirmAction('revoke');
    setConfirmDomain(activeDomain);
  }, [activeDomain]);

  const confirmSave = useCallback(() => {
    setConfirmAction(null);
    setConfirmDomain(null);
    // In production, this would call an API
  }, []);

  const confirmRevoke = useCallback(() => {
    setSelected((prev) => ({ ...prev, [activeDomain]: [] }));
    setPrimaryWeights((prev) => ({ ...prev, [activeDomain]: 100 }));
    setConfirmAction(null);
    setConfirmDomain(null);
  }, [activeDomain]);

  const cancelConfirm = useCallback(() => {
    setConfirmAction(null);
    setConfirmDomain(null);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
    >
      <Card className="border-slate-700 bg-slate-800/80 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base text-slate-100">
            <Vote className="size-5 text-violet-400" />
            {t('delegation.title')}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <Tabs
            value={activeDomain}
            onValueChange={(v) => setActiveDomain(v as DomainKey)}
          >
            {/* ── Domain tabs ──────────────────────────── */}
            <TabsList className="h-8 w-full bg-slate-900/60 p-0.5">
              {DOMAIN_KEYS.map((d) => (
                <TabsTrigger
                  key={d}
                  value={d}
                  className="h-7 flex-1 text-xs data-[state=active]:bg-slate-700 data-[state=active]:text-slate-100"
                >
                  <span className={cn('hidden sm:inline', DOMAIN_COLORS[d])}>
                    {t(DOMAIN_LABEL_KEYS[d])}
                  </span>
                  <span className="sm:hidden">
                    {t(DOMAIN_SHORT_LABEL_KEYS[d])}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>

            {/* ── Single content area driven by activeDomain ── */}
            {DOMAIN_KEYS.map((domain) => (
              <TabsContent key={domain} value={domain} className="mt-3 space-y-4">
                {/* ── Current weight distribution ──────────── */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-slate-400">
                    {t('delegation.currentWeight')}
                  </p>
                    <motion.div
                      key={activeDomain + JSON.stringify(weightEntries)}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="space-y-2"
                    >
                      {weightEntries.map((entry) => (
                        <div key={entry.id} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span
                              className={cn(
                                entry.isPrimary
                                  ? 'font-medium text-slate-200'
                                  : 'text-slate-300',
                              )}
                            >
                              {entry.isPrimary && (
                                <Users className="mr-1 inline size-3 text-slate-400" />
                              )}
                              {entry.name}
                            </span>
                            <span className="font-mono text-slate-400">
                              {entry.weight}%
                            </span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-slate-700">
                            <motion.div
                              className={cn(
                                'h-full rounded-full',
                                entry.isPrimary
                                  ? 'bg-slate-400'
                                  : DOMAIN_BAR_COLORS[domain],
                              )}
                              initial={{ width: 0 }}
                              animate={{ width: `${entry.weight}%` }}
                              transition={{ duration: 0.5, ease: 'easeOut' }}
                            />
                          </div>
                        </div>
                      ))}
                    </motion.div>
                </div>

                {/* ── Available sub-avatars ────────────────── */}
                {domainSubs.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-slate-400">
                      {t('delegation.availableDelegates')}
                    </p>
                    <div className="space-y-2">
                      {domainSubs.map((sub) => {
                        const isSelected = selected[domain].includes(sub.id);
                        return (
                          <motion.div
                            key={sub.id}
                            layout
                            className={cn(
                              'flex items-center gap-3 rounded-lg border px-3 py-2 transition-colors',
                              isSelected
                                ? 'border-violet-500/30 bg-violet-500/5'
                                : 'border-slate-700 bg-slate-900/40 hover:border-slate-600',
                            )}
                          >
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleSub(sub.id)}
                              className={cn(
                                isSelected && 'border-violet-500 data-[state=checked]:bg-violet-500',
                              )}
                            />
                            <span
                              className={cn(
                                'flex-1 text-sm',
                                isSelected ? 'text-slate-100' : 'text-slate-300',
                              )}
                            >
                              {t(sub.nameKey)}
                            </span>
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-[10px]',
                                sub.cognitiveMatch >= 80
                                  ? 'border-emerald-500/30 text-emerald-400'
                                  : 'border-amber-500/30 text-amber-400',
                              )}
                            >
                              {t('delegation.cognitiveMatch')}: {sub.cognitiveMatch}%
                            </Badge>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {domainSubs.length === 0 && (
                  <p className="py-4 text-center text-xs text-slate-500">
                    {t('delegation.noAvailableDelegates')}
                  </p>
                )}

                {/* ── Slider ─────────────────────────────── */}
                {selected[domain].length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">{t('delegation.primaryWeight')}</span>
                      <span className="font-mono text-slate-300">
                        {primaryWeights[domain]}%
                      </span>
                    </div>
                    <Slider
                      value={[primaryWeights[domain]]}
                      min={10}
                      max={90}
                      step={5}
                      onValueChange={(v) =>
                        setPrimaryWeights((prev) => ({
                          ...prev,
                          [domain]: v[0],
                        }))
                      }
                      className="py-2"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>10%</span>
                      <span>90%</span>
                    </div>
                  </div>
                )}

                {/* ── Action buttons ──────────────────────── */}
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-slate-100"
                    onClick={handleSave}
                  >
                    <Check className="size-3.5" />
                    {t('delegation.saveDelegation')}
                  </Button>
                  {selected[domain].length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-red-600/50 text-red-400 hover:bg-red-500/10"
                      onClick={handleRevoke}
                    >
                      <X className="size-3.5" />
                      {t('delegation.revokeDelegation')}
                    </Button>
                  )}
                </div>

                {/* ── Delegation history (from props) ─────── */}
                {delegations.filter((d) => d.domain === t(DOMAIN_LABEL_KEYS[domain]) && d.isActive)
                  .length > 0 && (
                  <div className="border-t border-slate-700 pt-3">
                    <p className="mb-2 text-xs font-medium text-slate-400">
                      {t('delegation.activeDelegations')}
                    </p>
                    {delegations
                      .filter((d) => d.domain === t(DOMAIN_LABEL_KEYS[domain]) && d.isActive)
                      .map((d) => (
                        <div
                          key={d.id}
                          className="flex items-center gap-2 text-xs text-slate-300"
                        >
                          <ArrowRightLeft className="size-3 text-slate-500" />
                          <span>{d.delegateName}</span>
                          <Badge
                            variant="secondary"
                            className="text-[10px] bg-slate-700 text-slate-300"
                          >
                            {d.weight}%
                          </Badge>
                        </div>
                      ))}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>

          {/* ── Confirmation dialog ────────────────────────── */}
            {confirmAction && confirmDomain && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg border border-slate-600 bg-slate-900 p-4"
              >
                <p className="mb-3 text-sm text-slate-200">
                  {confirmAction === 'save'
                    ? t('delegation.confirmSaveDomain', { domain: t(DOMAIN_LABEL_KEYS[confirmDomain]) })
                    : t('delegation.confirmRevokeDomain', { domain: t(DOMAIN_LABEL_KEYS[confirmDomain]) })}
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className={cn(
                      confirmAction === 'save'
                        ? 'border-emerald-600 text-emerald-400 hover:bg-emerald-500/10'
                        : 'border-red-600 text-red-400 hover:bg-red-500/10',
                    )}
                    onClick={
                      confirmAction === 'save' ? confirmSave : confirmRevoke
                    }
                  >
                    <Check className="size-3.5" />
                    {t('common.confirm')}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-slate-400 hover:text-slate-200"
                    onClick={cancelConfirm}
                  >
                    {t('common.cancel')}
                  </Button>
                </div>
              </motion.div>
            )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
