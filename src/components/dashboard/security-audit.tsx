'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Bug,
  FileWarning,
  CheckCircle,
  AlertTriangle,
  Activity,
  Clock,
  ExternalLink,
  ChevronRight,
  Lock,
  Eye,
  ScrollText,
  Gauge,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { useClientTime } from '@/hooks/use-client-time';
import { useI18n } from '@/hooks/use-i18n';

// ── Types ──────────────────────────────────────────────
type InvariantStatus = 'pass' | 'fail';
type FindingSeverity = 'critical' | 'high' | 'medium' | 'low';
type FindingStatus = 'fixed' | 'pending' | 'accepted_risk';
type AuditLogType = 'vulnerability_detected' | 'invariant_violation' | 'circuit_trigger' | 'access_change';
type AuditLogSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info' | 'warn';

interface CertoraInvariant {
  id: string;
  name: string;
  formula: string;
  status: InvariantStatus;
  counterexamples?: number;
  proverRuns?: number;
  fuzzRuns?: number;
  branchCoverage?: number;
  proofMethod?: string;
  lastVerified: string;
}

interface SlitherFinding {
  id: string;
  severity: FindingSeverity;
  title: string;
  contract: string;
  function: string;
  description: string;
  status: FindingStatus;
}

interface AuditLogEntry {
  id: string;
  type: AuditLogType;
  severity: AuditLogSeverity;
  details: string;
  txHash: string;
  createdAt: string;
}

interface SecurityAuditData {
  invariants: CertoraInvariant[];
  findings: SlitherFinding[];
  auditLog: AuditLogEntry[];
  securityScore: number;
  slitherSummary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    total: number;
    fixed: number;
    pending: number;
    acceptedRisk: number;
  };
  lastFullAudit: string;
  nextScheduledAudit: string;
}

// ── Mock Data (deterministic, no Math.random) ─────────
const MOCK_INVARIANTS: CertoraInvariant[] = [
  {
    id: 'inv_1',
    name: 'security.invSplitConservation',
    formula: 'humanAmt + avatarAmt + protocolAmt == totalAmount',
    status: 'pass',
    counterexamples: 0,
    proverRuns: 10000,
    lastVerified: '2026-03-04T14:00:00Z',
  },
  {
    id: 'inv_2',
    name: 'security.invWeightNormalized',
    formula: 'Σ W_normalized == 10000 BPS',
    status: 'pass',
    counterexamples: 0,
    fuzzRuns: 10000,
    lastVerified: '2026-03-04T14:00:00Z',
  },
  {
    id: 'inv_3',
    name: 'security.invCircuitIntercept',
    formula: 'State == HARD_PAUSE ⇒ !allowHighRisk()',
    status: 'pass',
    branchCoverage: 100,
    lastVerified: '2026-03-04T12:00:00Z',
  },
  {
    id: 'inv_4',
    name: 'security.invSybilDecay',
    formula: 'dS/dt ≤ 0 (无新参与)',
    status: 'pass',
    proofMethod: 'security.lyapunovProof',
    lastVerified: '2026-03-04T10:00:00Z',
  },
];

const MOCK_FINDINGS: SlitherFinding[] = [
  {
    id: 'f1',
    severity: 'medium',
    title: 'security.findingUncheckedReturn',
    contract: 'DynamicSplitter.sol',
    function: 'executeSplit',
    description: 'security.findingUncheckedReturnDesc',
    status: 'fixed',
  },
  {
    id: 'f2',
    severity: 'low',
    title: 'security.findingGasOpt',
    contract: 'AvatarCore.sol',
    function: 'getAvatarProfile',
    description: 'security.findingGasOptDesc',
    status: 'accepted_risk',
  },
  {
    id: 'f3',
    severity: 'high',
    title: 'security.findingReentrancy',
    contract: 'TokenVault.sol',
    function: 'withdraw',
    description: 'security.findingReentrancyDesc',
    status: 'fixed',
  },
  {
    id: 'f4',
    severity: 'low',
    title: 'security.findingMissingEvent',
    contract: 'IFDRouter.sol',
    function: 'revokeDelegation',
    description: 'security.findingMissingEventDesc',
    status: 'pending',
  },
];

const MOCK_AUDIT_LOG: AuditLogEntry[] = [
  {
    id: 'al1',
    type: 'invariant_violation',
    severity: 'info',
    details: 'security.logCertoraComplete',
    txHash: '0xcert1...001',
    createdAt: '2026-03-04T14:00:00Z',
  },
  {
    id: 'al2',
    type: 'vulnerability_detected',
    severity: 'high',
    details: 'security.logSlitherReentrancy',
    txHash: '0xslit1...002',
    createdAt: '2026-03-04T10:30:00Z',
  },
  {
    id: 'al3',
    type: 'circuit_trigger',
    severity: 'warn',
    details: 'security.logCircuitTrigger',
    txHash: '0xcirc1...003',
    createdAt: '2026-03-03T22:10:00Z',
  },
  {
    id: 'al4',
    type: 'access_change',
    severity: 'info',
    details: 'security.logOracleRole',
    txHash: '0xacc1...004',
    createdAt: '2026-03-03T08:00:00Z',
  },
  {
    id: 'al5',
    type: 'vulnerability_detected',
    severity: 'medium',
    details: 'security.logErc20Unchecked',
    txHash: '0xslit2...005',
    createdAt: '2026-03-02T16:00:00Z',
  },
];

const MOCK_SECURITY_SCORE = 92;

const MOCK_DATA: SecurityAuditData = {
  invariants: MOCK_INVARIANTS,
  findings: MOCK_FINDINGS,
  auditLog: MOCK_AUDIT_LOG,
  securityScore: MOCK_SECURITY_SCORE,
  slitherSummary: {
    critical: MOCK_FINDINGS.filter((f) => f.severity === 'critical').length,
    high: MOCK_FINDINGS.filter((f) => f.severity === 'high').length,
    medium: MOCK_FINDINGS.filter((f) => f.severity === 'medium').length,
    low: MOCK_FINDINGS.filter((f) => f.severity === 'low').length,
    total: MOCK_FINDINGS.length,
    fixed: MOCK_FINDINGS.filter((f) => f.status === 'fixed').length,
    pending: MOCK_FINDINGS.filter((f) => f.status === 'pending').length,
    acceptedRisk: MOCK_FINDINGS.filter((f) => f.status === 'accepted_risk').length,
  },
  lastFullAudit: '2026-03-04T14:00:00Z',
  nextScheduledAudit: '2026-03-11T14:00:00Z',
};

// ── Tab Config ─────────────────────────────────────────
type TabId = 'overview' | 'invariants' | 'findings' | 'log';

interface TabConfig {
  id: TabId;
  labelKey: string;
  icon: React.ElementType;
}

const TABS: TabConfig[] = [
  { id: 'overview', labelKey: 'security.tabOverview', icon: Gauge },
  { id: 'invariants', labelKey: 'security.tabInvariants', icon: ShieldCheck },
  { id: 'findings', labelKey: 'security.tabFindings', icon: Bug },
  { id: 'log', labelKey: 'security.tabLog', icon: ScrollText },
];

// ── Severity Colors ────────────────────────────────────
const SEVERITY_CONFIG: Record<FindingSeverity | AuditLogSeverity, { color: string; bg: string; border: string; badge: string; text: string }> = {
  critical: {
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    badge: 'bg-red-500/20 text-red-300 border-red-500/30',
    text: 'text-red-300',
  },
  high: {
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    badge: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    text: 'text-orange-300',
  },
  medium: {
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    text: 'text-amber-300',
  },
  low: {
    color: 'text-sky-400',
    bg: 'bg-sky-500/10',
    border: 'border-sky-500/30',
    badge: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
    text: 'text-sky-300',
  },
  info: {
    color: 'text-slate-400',
    bg: 'bg-slate-500/10',
    border: 'border-slate-500/30',
    badge: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
    text: 'text-slate-300',
  },
  warn: {
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
    badge: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    text: 'text-yellow-300',
  },
};

// ── Helper: relative time ──────────────────────────────
function getRelativeTime(timestamp: string, now: Date | null, t: (key: string, params?: Record<string, string | number>) => string): string {
  if (!now) return '...';  // SSR placeholder to avoid hydration mismatch
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return t('security.justNow');
  if (diffMin < 60) return t('security.minutesAgo', { count: diffMin });
  if (diffHr < 24) return t('security.hoursAgo', { count: diffHr });
  if (diffDay < 30) return t('security.daysAgo', { count: diffDay });
  return format(parseISO(timestamp), 'MMM d');
}

// ── Security Score Gauge ───────────────────────────────
function SecurityScoreGauge({ score }: { score: number }) {
  const now = useClientTime();
  const { t } = useI18n();
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const gap = circumference - progress;

  const scoreColor =
    score >= 90
      ? 'text-emerald-400'
      : score >= 70
        ? 'text-amber-400'
        : 'text-red-400';

  const strokeColor =
    score >= 90
      ? '#34d399'
      : score >= 70
        ? '#fbbf24'
        : '#f87171';

  const bgColor =
    score >= 90
      ? 'from-emerald-500/20 to-emerald-500/5'
      : score >= 70
        ? 'from-amber-500/20 to-amber-500/5'
        : 'from-red-500/20 to-red-500/5';

  return (
    <div className={cn('flex flex-col items-center gap-3 rounded-xl bg-gradient-to-br p-6', bgColor)}>
      <div className="relative flex items-center justify-center">
        <svg width="128" height="128" className="-rotate-90">
          {/* Background circle */}
          <circle
            cx="64"
            cy="64"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-slate-700/50"
          />
          {/* Progress circle */}
          <motion.circle
            cx="64"
            cy="64"
            r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: gap }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <motion.span
            className={cn('text-3xl font-bold tabular-nums', scoreColor)}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            {score}
          </motion.span>
          <span className="text-[10px] text-slate-400">/100</span>
        </div>
      </div>
      <div className="text-center">
        <p className={cn('text-sm font-semibold', scoreColor)}>
          {score >= 90 ? t('security.scoreExcellent') : score >= 70 ? t('security.scoreGood') : t('security.scoreNeedsAttention')}
        </p>
        <p className="mt-0.5 text-[10px] text-slate-500" suppressHydrationWarning>
          {t('security.lastFullAudit')} {getRelativeTime(MOCK_DATA.lastFullAudit, now, t)}
        </p>
      </div>
    </div>
  );
}

// ── Invariant Card ─────────────────────────────────────
function InvariantCard({ invariant }: { invariant: CertoraInvariant }) {
  const now = useClientTime();
  const { t } = useI18n();
  const isPass = invariant.status === 'pass';
  const StatusIcon = isPass ? ShieldCheck : ShieldX;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card
        className={cn(
          'border-slate-700 bg-slate-800/60 backdrop-blur-sm overflow-hidden',
          isPass ? 'border-l-4 border-l-emerald-500' : 'border-l-4 border-l-red-500',
        )}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div
                className={cn(
                  'flex size-8 shrink-0 items-center justify-center rounded-lg',
                  isPass ? 'bg-emerald-500/15' : 'bg-red-500/15',
                )}
              >
                <StatusIcon
                  className={cn('size-4', isPass ? 'text-emerald-400' : 'text-red-400')}
                />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-medium text-slate-100">{t(invariant.name)}</h4>
                <p className="mt-1 font-mono text-[11px] text-slate-400 leading-relaxed break-all">
                  {invariant.formula}
                </p>
              </div>
            </div>

            <Badge
              variant="outline"
              className={cn(
                'shrink-0 text-[10px]',
                isPass
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  : 'bg-red-500/20 text-red-300 border-red-500/30',
              )}
            >
              {isPass ? t('security.invariantPass') : t('security.invariantFail')}
            </Badge>
          </div>

          {/* Detail metrics */}
          <div className="mt-3 flex flex-wrap gap-3 text-[10px]">
            {invariant.counterexamples !== undefined && (
              <div className="flex items-center gap-1">
                <span className="text-slate-500">{t('security.counterexamplesLabel')}</span>
                <span className={cn('font-medium', invariant.counterexamples === 0 ? 'text-emerald-400' : 'text-red-400')}>
                  {invariant.counterexamples}
                </span>
              </div>
            )}
            {invariant.proverRuns !== undefined && (
              <div className="flex items-center gap-1">
                <span className="text-slate-500">{t('security.proverRunsLabel')}</span>
                <span className="font-medium text-violet-400">
                  {invariant.proverRuns.toLocaleString()}
                </span>
              </div>
            )}
            {invariant.fuzzRuns !== undefined && (
              <div className="flex items-center gap-1">
                <span className="text-slate-500">{t('security.fuzzRunsLabel')}</span>
                <span className="font-medium text-violet-400">
                  {invariant.fuzzRuns.toLocaleString()}
                </span>
              </div>
            )}
            {invariant.branchCoverage !== undefined && (
              <div className="flex items-center gap-1">
                <span className="text-slate-500">{t('security.branchCoverageLabel')}</span>
                <span className={cn('font-medium', invariant.branchCoverage === 100 ? 'text-emerald-400' : 'text-amber-400')}>
                  {invariant.branchCoverage}%
                </span>
              </div>
            )}
            {invariant.proofMethod && (
              <div className="flex items-center gap-1">
                <span className="text-slate-500">{t('security.proofMethodShort')}</span>
                <span className="font-medium text-sky-400">{t(invariant.proofMethod)}</span>
              </div>
            )}
          </div>

          {/* Last verified */}
          <div className="mt-2 flex items-center gap-1 text-[10px] text-slate-500">
            <Clock className="size-3" />
            <span suppressHydrationWarning>{t('security.lastVerifiedLabel')} {getRelativeTime(invariant.lastVerified, now, t)}</span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Finding Row ────────────────────────────────────────
function FindingRow({ finding }: { finding: SlitherFinding }) {
  const { t } = useI18n();
  const sevConfig = SEVERITY_CONFIG[finding.severity];
  const StatusIcon = finding.status === 'fixed' ? CheckCircle : finding.status === 'pending' ? AlertTriangle : ShieldAlert;

  const severityLabelKey: Record<FindingSeverity, string> = {
    critical: 'security.sevCritical',
    high: 'security.sevHigh',
    medium: 'security.sevMedium',
    low: 'security.sevLow',
  };

  const statusLabelKey: Record<FindingStatus, string> = {
    fixed: 'security.statusFixed',
    pending: 'security.statusPending',
    accepted_risk: 'security.statusAcceptedRisk',
  };

  const statusBadgeClass: Record<FindingStatus, string> = {
    fixed: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    pending: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    accepted_risk: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25 }}
      className={cn(
        'group rounded-lg border p-3 transition-colors hover:bg-slate-700/30',
        sevConfig.border,
        sevConfig.bg.replace('/10', '/5'),
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className={cn('flex size-6 shrink-0 items-center justify-center rounded-md mt-0.5', sevConfig.bg)}>
            <Bug className={cn('size-3', sevConfig.color)} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xs font-medium text-slate-200 truncate">{t(finding.title)}</p>
              <Badge variant="outline" className={cn('text-[9px] px-1.5 py-0', sevConfig.badge)}>
                {t(severityLabelKey[finding.severity])}
              </Badge>
            </div>
            <p className="mt-1 text-[11px] text-slate-400 leading-relaxed">{t(finding.description)}</p>
            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-500">
              <span>{t('security.contractLabel')} <span className="text-slate-300 font-mono">{finding.contract}</span></span>
              <span>{t('security.functionLabel')} <span className="text-slate-300 font-mono">{finding.function}</span></span>
            </div>
          </div>
        </div>
        <Badge variant="outline" className={cn('shrink-0 text-[9px] px-1.5 py-0', statusBadgeClass[finding.status])}>
          <StatusIcon className="mr-0.5 size-2.5" />
          {t(statusLabelKey[finding.status])}
        </Badge>
      </div>
    </motion.div>
  );
}

// ── Audit Log Row ──────────────────────────────────────
function AuditLogRow({ entry }: { entry: AuditLogEntry }) {
  const now = useClientTime();
  const { t } = useI18n();

  const logTypeConfig: Record<AuditLogType, { labelKey: string; icon: React.ElementType; color: string }> = {
    vulnerability_detected: { labelKey: 'security.logTypeVulnerability', icon: Bug, color: 'text-orange-400' },
    invariant_violation: { labelKey: 'security.logTypeInvariant', icon: ShieldCheck, color: 'text-violet-400' },
    circuit_trigger: { labelKey: 'security.logTypeCircuit', icon: ShieldAlert, color: 'text-amber-400' },
    access_change: { labelKey: 'security.logTypeAccess', icon: Lock, color: 'text-sky-400' },
  };

  const typeConfig = logTypeConfig[entry.type];
  const sevConfig = SEVERITY_CONFIG[entry.severity];
  const TypeIcon = typeConfig.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25 }}
      className="group flex items-start gap-3 rounded-lg p-2.5 transition-colors hover:bg-slate-700/30"
    >
      <div className={cn('flex size-7 shrink-0 items-center justify-center rounded-lg mt-0.5', 'bg-slate-700/50')}>
        <TypeIcon className={cn('size-3.5', typeConfig.color)} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className={cn('text-[9px] px-1.5 py-0', sevConfig.badge)}>
            {t(typeConfig.labelKey)}
          </Badge>
          <span className="text-[10px] text-slate-500" suppressHydrationWarning>
            {getRelativeTime(entry.createdAt, now, t)}
          </span>
        </div>
        <p className="mt-1 text-[11px] text-slate-300 leading-relaxed">{t(entry.details)}</p>
        <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-500">
          <ExternalLink className="size-2.5" />
          <span className="font-mono">{entry.txHash}</span>
        </div>
      </div>
    </motion.div>
  );
}

// ── Main Component ─────────────────────────────────────
export default function SecurityAudit() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [expandedInvariant, setExpandedInvariant] = useState<string | null>(null);
  const now = useClientTime();
  const { t } = useI18n();

  const data = MOCK_DATA;
  const passedCount = data.invariants.filter((inv) => inv.status === 'pass').length;
  const allPassed = passedCount === data.invariants.length;

  // ── Tab Content Renderers ──────────────────────────
  const renderOverview = () => (
    <div className="space-y-5">
      {/* Security Score + Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SecurityScoreGauge score={data.securityScore} />

        <div className="space-y-3">
          {/* Certora Status */}
          <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="size-4 text-violet-400" />
              <h4 className="text-xs font-semibold text-slate-200">{t('security.certoraFormalVerification')}</h4>
            </div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl font-bold text-emerald-400">{passedCount}/{data.invariants.length}</span>
              <span className="text-xs text-slate-400">{t('security.invariantPassed')}</span>
            </div>
            <Progress
              value={(passedCount / data.invariants.length) * 100}
              className="h-1.5 bg-slate-700 [&>div]:bg-emerald-500"
            />
            <p className="mt-2 text-[10px] text-slate-500">
              {allPassed ? t('security.allInvariantPass') : t('security.someInvariantFail')}
            </p>
          </div>

          {/* Slither Summary */}
          <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Bug className="size-4 text-orange-400" />
              <h4 className="text-xs font-semibold text-slate-200">{t('security.slitherStaticAnalysis')}</h4>
            </div>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {(['critical', 'high', 'medium', 'low'] as FindingSeverity[]).map((sev) => {
                const count = data.slitherSummary[sev as keyof typeof data.slitherSummary] as number;
                const config = SEVERITY_CONFIG[sev];
                return (
                  <div key={sev} className={cn('rounded-lg p-2 text-center', config.bg)}>
                    <div className={cn('text-lg font-bold', config.color)}>{count}</div>
                    <div className="text-[9px] text-slate-400 uppercase">{sev}</div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-4 text-[10px]">
              <div className="flex items-center gap-1">
                <CheckCircle className="size-3 text-emerald-400" />
                <span className="text-slate-400">{t('security.fixedLabel')}: <span className="text-emerald-300 font-medium">{data.slitherSummary.fixed}</span></span>
              </div>
              <div className="flex items-center gap-1">
                <AlertTriangle className="size-3 text-amber-400" />
                <span className="text-slate-400">{t('security.pendingLabel')}: <span className="text-amber-300 font-medium">{data.slitherSummary.pending}</span></span>
              </div>
              <div className="flex items-center gap-1">
                <ShieldAlert className="size-3 text-slate-400" />
                <span className="text-slate-400">{t('security.acceptedRiskLabel')}: <span className="text-slate-300 font-medium">{data.slitherSummary.acceptedRisk}</span></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Invariant Quick List */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Shield className="size-4 text-violet-400" />
            <h4 className="text-xs font-semibold text-slate-200">{t('security.coreInvariantQuickView')}</h4>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-[10px] text-violet-400 hover:text-violet-300 hover:bg-violet-500/10"
            onClick={() => setActiveTab('invariants')}
          >
            {t('security.viewDetails')} <ChevronRight className="ml-0.5 size-3" />
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {data.invariants.map((inv) => {
            const isPass = inv.status === 'pass';
            return (
              <div
                key={inv.id}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-xs',
                  isPass ? 'bg-emerald-500/5 border border-emerald-500/20' : 'bg-red-500/5 border border-red-500/20',
                )}
              >
                {isPass ? (
                  <ShieldCheck className="size-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <ShieldX className="size-3.5 text-red-400 shrink-0" />
                )}
                <span className="text-slate-200 font-medium truncate">{t(inv.name)}</span>
                <span className="ml-auto text-[10px] text-slate-500 font-mono truncate hidden sm:inline">
                  {inv.formula.length > 30 ? inv.formula.slice(0, 30) + '...' : inv.formula}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Audit Events */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Activity className="size-4 text-violet-400" />
            <h4 className="text-xs font-semibold text-slate-200">{t('security.recentSecurityEvents')}</h4>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-[10px] text-violet-400 hover:text-violet-300 hover:bg-violet-500/10"
            onClick={() => setActiveTab('log')}
          >
            {t('security.fullLog')} <ChevronRight className="ml-0.5 size-3" />
          </Button>
        </div>
        <div className="space-y-1">
          {data.auditLog.slice(0, 3).map((entry) => (
            <AuditLogRow key={entry.id} entry={entry} />
          ))}
        </div>
      </div>

      {/* Next Audit Info */}
      <Alert className="border-violet-500/20 bg-violet-500/5">
        <Eye className="size-4 text-violet-400" />
        <AlertTitle className="text-violet-300 text-xs">{t('security.nextAudit')}</AlertTitle>
        <AlertDescription className="text-violet-300/70 text-[11px]" suppressHydrationWarning>
          {t('security.scheduledAuditMessage', { time: getRelativeTime(data.nextScheduledAudit, now, t) })}
        </AlertDescription>
      </Alert>
    </div>
  );

  const renderInvariants = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-violet-400" />
          <h4 className="text-sm font-semibold text-slate-200">{t('security.certoraFormalVerificationInvariant')}</h4>
        </div>
        <Badge
          variant="outline"
          className={cn(
            'text-[10px]',
            allPassed
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
              : 'bg-red-500/20 text-red-300 border-red-500/30',
          )}
        >
          {t('security.passedCount', { passed: passedCount, total: data.invariants.length })}
        </Badge>
      </div>

      <div className="space-y-3">
        {data.invariants.map((inv) => (
          <div key={inv.id}>
            <InvariantCard invariant={inv} />
          </div>
        ))}
      </div>

      {/* Verification Summary */}
      <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
        <h5 className="text-xs font-medium text-slate-300 mb-2">{t('security.verificationSummary')}</h5>
        <div className="grid grid-cols-2 gap-3 text-[11px]">
          <div>
            <span className="text-slate-500">{t('security.verificationEngine')}:</span>
            <span className="ml-1 text-slate-200">Certora Prover v2.4</span>
          </div>
          <div>
            <span className="text-slate-500">{t('security.proofMethodLabel')}:</span>
            <span className="ml-1 text-slate-200">CVL + Fuzz + Lyapunov</span>
          </div>
          <div>
            <span className="text-slate-500">{t('security.totalRuns')}:</span>
            <span className="ml-1 text-violet-300 font-medium">30,000+</span>
          </div>
          <div>
            <span className="text-slate-500">{t('security.totalCounterexamples')}:</span>
            <span className="ml-1 text-emerald-300 font-medium">0</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderFindings = () => {
    const severityLabelKey: Record<FindingSeverity, string> = { critical: 'security.sevCritical', high: 'security.sevHigh', medium: 'security.sevMedium', low: 'security.sevLow' };

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bug className="size-4 text-orange-400" />
            <h4 className="text-sm font-semibold text-slate-200">{t('security.slitherStaticFindings')}</h4>
          </div>
          <span className="text-[10px] text-slate-500">{t('security.findingCount', { count: data.findings.length })}</span>
        </div>

        {/* Severity Distribution */}
        <div className="grid grid-cols-4 gap-2">
          {(['critical', 'high', 'medium', 'low'] as FindingSeverity[]).map((sev) => {
            const count = data.slitherSummary[sev as keyof typeof data.slitherSummary] as number;
            const config = SEVERITY_CONFIG[sev];
            return (
              <motion.div
                key={sev}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn('rounded-lg border p-3 text-center', config.border, config.bg)}
              >
                <div className={cn('text-xl font-bold', config.color)}>{count}</div>
                <div className="text-[10px] text-slate-400">{t(severityLabelKey[sev])}</div>
              </motion.div>
            );
          })}
        </div>

        {/* Findings list */}
        <div className="space-y-2">
          {data.findings.map((finding) => (
            <FindingRow key={finding.id} finding={finding} />
          ))}
        </div>

        {/* Remediation Progress */}
        <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
          <h5 className="text-xs font-medium text-slate-300 mb-3">{t('security.remediationProgress')}</h5>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">{t('security.fixedLabel')}</span>
              <span className="text-emerald-300 font-medium">{data.slitherSummary.fixed}/{data.slitherSummary.total}</span>
            </div>
            <Progress
              value={(data.slitherSummary.fixed / data.slitherSummary.total) * 100}
              className="h-2 bg-slate-700 [&>div]:bg-emerald-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>{t('security.pendingLabel')}: {data.slitherSummary.pending}</span>
              <span>{t('security.acceptedRiskLabel')}: {data.slitherSummary.acceptedRisk}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderLog = () => {
    const logTypeConfig: Record<AuditLogType, { labelKey: string; icon: React.ElementType; color: string }> = {
      vulnerability_detected: { labelKey: 'security.logTypeVulnerability', icon: Bug, color: 'text-orange-400' },
      invariant_violation: { labelKey: 'security.logTypeInvariant', icon: ShieldCheck, color: 'text-violet-400' },
      circuit_trigger: { labelKey: 'security.logTypeCircuit', icon: ShieldAlert, color: 'text-amber-400' },
      access_change: { labelKey: 'security.logTypeAccess', icon: Lock, color: 'text-sky-400' },
    };

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ScrollText className="size-4 text-violet-400" />
            <h4 className="text-sm font-semibold text-slate-200">{t('security.securityAuditLog')}</h4>
          </div>
          <span className="text-[10px] text-slate-500">{t('security.recordCount', { count: data.auditLog.length })}</span>
        </div>

        {/* Log type filter legend */}
        <div className="flex flex-wrap gap-2">
          {(Object.entries(logTypeConfig) as [AuditLogType, typeof logTypeConfig[AuditLogType]][]).map(
            ([type, config]) => (
              <div key={type} className="flex items-center gap-1.5 text-[10px]">
                <config.icon className={cn('size-3', config.color)} />
                <span className="text-slate-400">{t(config.labelKey)}</span>
              </div>
            ),
          )}
        </div>

        <Separator className="bg-slate-700/50" />

        {/* Log entries */}
        <ScrollArea className="max-h-96">
          <div className="space-y-1">
            {data.auditLog.map((entry) => (
              <AuditLogRow key={entry.id} entry={entry} />
            ))}
          </div>
        </ScrollArea>
      </div>
    );
  };

  // ── Tab content map ──
  const tabContent: Record<TabId, () => React.ReactNode> = {
    overview: renderOverview,
    invariants: renderInvariants,
    findings: renderFindings,
    log: renderLog,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
    >
      <Card className="border-slate-700 bg-slate-800/80 backdrop-blur-sm overflow-hidden">
        {/* Top accent bar */}
        <div
          className={cn(
            'absolute inset-x-0 top-0 h-1',
            allPassed ? 'bg-emerald-500' : 'bg-red-500',
          )}
        />

        <CardHeader className="pb-0 pt-5">
          <CardTitle className="flex items-center gap-2 text-base text-slate-100">
            <Shield className="size-5 text-violet-400" />
            {t('security.title')}
          </CardTitle>
        </CardHeader>

        <CardContent className="p-4 pt-3 space-y-4">
          {/* Tab navigation */}
          <div className="flex items-center gap-1 rounded-lg bg-slate-900/60 p-1">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all flex-1 justify-center',
                    isActive
                      ? 'bg-violet-500/20 text-violet-300 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50',
                  )}
                >
                  <TabIcon className="size-3.5" />
                  <span className="hidden sm:inline">{t(tab.labelKey)}</span>
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
            >
              {tabContent[activeTab]()}
            </motion.div>
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Export Types & Mock Data for consolidation ─────────
export type {
  CertoraInvariant,
  SlitherFinding,
  AuditLogEntry,
  SecurityAuditData,
  InvariantStatus,
  FindingSeverity,
  FindingStatus,
  AuditLogType,
  AuditLogSeverity,
};

export {
  MOCK_INVARIANTS,
  MOCK_FINDINGS,
  MOCK_AUDIT_LOG,
  MOCK_SECURITY_SCORE,
};
