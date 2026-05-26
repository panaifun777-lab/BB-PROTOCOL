'use client';

import { useState } from 'react';
import { useI18n } from '@/hooks/use-i18n';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Flag,
  FlaskConical,
  RotateCcw,
  Rocket,
  Shield,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  AlertTriangle,
  Clock,
  ChevronRight,
  Zap,
  Users,
  ToggleLeft,
  ToggleRight,
  CircleDot,
  ArrowRight,
  AlertOctagon,
  Activity,
  Play,
  Pause,
  FastForward,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

// ── Types ──────────────────────────────────────────────
type FlagStatus = 'active' | 'inactive' | 'scheduled';
type Environment = 'production' | 'staging' | 'development';
type TargetingRule = 'all' | 'tier_pro' | 'opt_in' | 'beta_testers' | 'internal_only' | 'enterprise_only' | 'premium_users';

interface FeatureFlag {
  id: string;
  name: string;
  key: string;
  description: string;
  status: FlagStatus;
  rolloutPercentage: number;
  targetingRules: TargetingRule;
  environment: Environment;
  createdAt: string;
  updatedAt: string;
  enabledForUsers: number;
  totalUsers: number;
  scheduledDate?: string;
}

type ABTestStatus = 'running' | 'completed' | 'draft';

interface ABTestVariant {
  name: string;
  description: string;
  trafficPercent: number;
  metricChange?: string;
  metricValue?: string;
}

interface ABTest {
  id: string;
  name: string;
  description: string;
  status: ABTestStatus;
  variants: ABTestVariant[];
  startDate: string;
  endDate?: string;
  winner?: string;
  confidence?: number;
  metrics: Record<string, string>;
}

type RollbackAction = 'deployed' | 'rolled_back' | 'paused' | 'resumed';

interface RollbackHistoryEntry {
  id: string;
  flagName: string;
  action: RollbackAction;
  reason: string;
  timestamp: string;
  operator: string;
}

interface PipelineStage {
  name: string;
  status: 'completed' | 'in_progress' | 'pending';
  details: string;
}

interface CanaryMetric {
  name: string;
  value: string;
  threshold: string;
  passing: boolean;
}

interface ReleasePipeline {
  currentVersion: string;
  nextVersion: string;
  pipeline: PipelineStage[];
  canaryMetrics: CanaryMetric[];
  canaryPercentage: number;
}

interface FeatureFlagsData {
  featureFlags: FeatureFlag[];
  abTests: ABTest[];
  rollbackHistory: RollbackHistoryEntry[];
  releasePipeline: ReleasePipeline;
  stats: {
    active: number;
    inactive: number;
    scheduled: number;
    total: number;
  };
}

// ── Tab Config ─────────────────────────────────────────
type TabId = 'flags' | 'ab' | 'rollback' | 'pipeline';

interface TabConfig {
  id: TabId;
  label: string;
  icon: React.ElementType;
}

const TABS: TabConfig[] = [
  { id: 'flags', label: 'features.tabFlags', icon: Flag },
  { id: 'ab', label: 'features.tabAbTest', icon: FlaskConical },
  { id: 'rollback', label: 'features.tabRollback', icon: RotateCcw },
  { id: 'pipeline', label: 'features.tabPipeline', icon: Rocket },
];

// ── Color Config ───────────────────────────────────────
const STATUS_CONFIG: Record<FlagStatus, { label: string; badge: string; dot: string }> = {
  active: {
    label: 'features.statusActive',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    dot: 'bg-emerald-400',
  },
  inactive: {
    label: 'features.statusInactive',
    badge: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
    dot: 'bg-slate-400',
  },
  scheduled: {
    label: 'features.statusScheduled',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    dot: 'bg-amber-400',
  },
};

const ENV_CONFIG: Record<Environment, { label: string; badge: string }> = {
  production: { label: 'features.envProduction', badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  staging: { label: 'features.envStaging', badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  development: { label: 'features.envDevelopment', badge: 'bg-sky-500/10 text-sky-400 border-sky-500/20' },
};

const TARGETING_LABELS: Record<TargetingRule, string> = {
  all: 'features.targetingAll',
  tier_pro: 'features.targetingTierPro',
  opt_in: 'features.targetingOptIn',
  beta_testers: 'features.targetingBetaTesters',
  internal_only: 'features.targetingInternalOnly',
  enterprise_only: 'features.targetingEnterpriseOnly',
  premium_users: 'features.targetingPremiumUsers',
};

const ROLLBACK_ACTION_CONFIG: Record<RollbackAction, { label: string; icon: React.ElementType; badge: string; color: string }> = {
  deployed: {
    label: 'features.actionDeployed',
    icon: Rocket,
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    color: 'text-emerald-400',
  },
  rolled_back: {
    label: 'features.actionRolledBack',
    icon: RotateCcw,
    badge: 'bg-red-500/20 text-red-300 border-red-500/30',
    color: 'text-red-400',
  },
  paused: {
    label: 'features.actionPaused',
    icon: Pause,
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    color: 'text-amber-400',
  },
  resumed: {
    label: 'features.actionResumed',
    icon: Play,
    badge: 'bg-sky-500/20 text-sky-400 border-sky-500/20',
    color: 'text-sky-400',
  },
};

const AB_STATUS_CONFIG: Record<ABTestStatus, { label: string; badge: string; dot: string }> = {
  running: {
    label: 'features.abRunning',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    dot: 'bg-emerald-400',
  },
  completed: {
    label: 'features.abCompleted',
    badge: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
    dot: 'bg-violet-400',
  },
  draft: {
    label: 'features.abDraft',
    badge: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
    dot: 'bg-slate-400',
  },
};

// ── Deterministic Mock Data (fallback) ─────────────────
const MOCK_FLAGS: FeatureFlag[] = [
  {
    id: 'ff_01', name: 'features.flagAvatarMarketplace', key: 'avatar-marketplace',
    description: 'features.flagAvatarMarketplaceDesc',
    status: 'active', rolloutPercentage: 100, targetingRules: 'all', environment: 'production',
    createdAt: '2025-12-01T08:00:00Z', updatedAt: '2026-02-28T10:00:00Z', enabledForUsers: 12847, totalUsers: 12847,
  },
  {
    id: 'ff_02', name: 'features.flagContractSimulation', key: 'contract-simulation',
    description: 'features.flagContractSimulationDesc',
    status: 'active', rolloutPercentage: 75, targetingRules: 'tier_pro', environment: 'production',
    createdAt: '2026-01-15T08:00:00Z', updatedAt: '2026-02-28T14:00:00Z', enabledForUsers: 6423, totalUsers: 8564,
  },
  {
    id: 'ff_03', name: 'features.flagLpLiquidity', key: 'lp-liquidity',
    description: 'features.flagLpLiquidityDesc',
    status: 'active', rolloutPercentage: 50, targetingRules: 'opt_in', environment: 'production',
    createdAt: '2026-01-20T08:00:00Z', updatedAt: '2026-02-25T16:00:00Z', enabledForUsers: 3200, totalUsers: 6400,
  },
  {
    id: 'ff_04', name: 'features.flagIfdV2Delegation', key: 'ifd-v2-delegation',
    description: 'features.flagIfdV2DelegationDesc',
    status: 'active', rolloutPercentage: 25, targetingRules: 'beta_testers', environment: 'production',
    createdAt: '2026-02-01T08:00:00Z', updatedAt: '2026-02-27T09:00:00Z', enabledForUsers: 856, totalUsers: 3424,
  },
  {
    id: 'ff_05', name: 'features.flagZkIdentity', key: 'zk-identity',
    description: 'features.flagZkIdentityDesc',
    status: 'inactive', rolloutPercentage: 0, targetingRules: 'internal_only', environment: 'staging',
    createdAt: '2026-02-10T08:00:00Z', updatedAt: '2026-02-10T08:00:00Z', enabledForUsers: 0, totalUsers: 150,
  },
  {
    id: 'ff_06', name: 'features.flagMultiChain', key: 'multi-chain',
    description: 'features.flagMultiChainDesc',
    status: 'inactive', rolloutPercentage: 0, targetingRules: 'internal_only', environment: 'development',
    createdAt: '2026-02-15T08:00:00Z', updatedAt: '2026-02-15T08:00:00Z', enabledForUsers: 0, totalUsers: 45,
  },
  {
    id: 'ff_07', name: 'features.flagDaoGovernance', key: 'dao-governance',
    description: 'features.flagDaoGovernanceDesc',
    status: 'scheduled', rolloutPercentage: 0, targetingRules: 'all', environment: 'production',
    createdAt: '2026-02-20T08:00:00Z', updatedAt: '2026-02-20T08:00:00Z', enabledForUsers: 0, totalUsers: 12847,
    scheduledDate: '2026-04-01T00:00:00Z',
  },
  {
    id: 'ff_08', name: 'features.flagSdkApi', key: 'sdk-api',
    description: 'features.flagSdkApiDesc',
    status: 'inactive', rolloutPercentage: 0, targetingRules: 'enterprise_only', environment: 'staging',
    createdAt: '2026-02-18T08:00:00Z', updatedAt: '2026-02-18T08:00:00Z', enabledForUsers: 0, totalUsers: 200,
  },
  {
    id: 'ff_09', name: 'features.flagCrossChainBridge', key: 'cross-chain-bridge',
    description: 'features.flagCrossChainBridgeDesc',
    status: 'inactive', rolloutPercentage: 0, targetingRules: 'internal_only', environment: 'development',
    createdAt: '2026-02-22T08:00:00Z', updatedAt: '2026-02-22T08:00:00Z', enabledForUsers: 0, totalUsers: 45,
  },
  {
    id: 'ff_10', name: 'features.flagAdvancedAnalytics', key: 'advanced-analytics',
    description: 'features.flagAdvancedAnalyticsDesc',
    status: 'active', rolloutPercentage: 10, targetingRules: 'premium_users', environment: 'production',
    createdAt: '2026-02-25T08:00:00Z', updatedAt: '2026-02-28T11:00:00Z', enabledForUsers: 128, totalUsers: 1280,
  },
];

const MOCK_AB_TESTS: ABTest[] = [
  {
    id: 'ab_01', name: 'features.abRevenueOpt', description: 'features.abRevenueOptDesc', status: 'running',
    variants: [
      { name: 'Control', description: 'features.variant70Split', trafficPercent: 45, metricChange: 'baseline', metricValue: '100%' },
      { name: 'Variant A', description: 'features.variant65Split', trafficPercent: 45, metricChange: '+8.2%', metricValue: '108.2%' },
      { name: 'Variant B', description: 'features.variant75Split', trafficPercent: 10, metricChange: '-3.1%', metricValue: '96.9%' },
    ],
    startDate: '2026-02-15T00:00:00Z', confidence: 87,
    metrics: { primary: 'revenue', secondary: 'user_retention' },
  },
  {
    id: 'ab_02', name: 'features.abSkillThreshold', description: 'features.abSkillThresholdDesc', status: 'completed',
    variants: [
      { name: 'Control', description: 'features.variant500Threshold', trafficPercent: 50, metricChange: 'baseline', metricValue: '100%' },
      { name: 'Variant', description: 'features.variant300Threshold', trafficPercent: 50, metricChange: '+34%', metricValue: '134%' },
    ],
    startDate: '2026-01-15T00:00:00Z', endDate: '2026-02-28T00:00:00Z', winner: 'Variant', confidence: 95,
    metrics: { primary: 'unlock_rate', secondary: 'revenue' },
  },
  {
    id: 'ab_03', name: 'features.abResonanceUI', description: 'features.abResonanceUIDesc', status: 'draft',
    variants: [
      { name: 'Control', description: 'features.numericDisplay', trafficPercent: 50 },
      { name: 'Variant', description: 'features.waveNumeric', trafficPercent: 50 },
    ],
    startDate: '2026-03-15T00:00:00Z',
    metrics: { primary: 'engagement', secondary: 'session_duration' },
  },
];

const MOCK_ROLLBACK_HISTORY: RollbackHistoryEntry[] = [
  { id: 'rb_01', flagName: 'contract-simulation', action: 'deployed', reason: 'features.rbPhase3', timestamp: '2026-02-28T14:00:00Z', operator: 'devops_lead' },
  { id: 'rb_02', flagName: 'contract-simulation', action: 'paused', reason: 'features.rbGasDeviation', timestamp: '2026-02-25T16:00:00Z', operator: 'devops_lead' },
  { id: 'rb_03', flagName: 'contract-simulation', action: 'resumed', reason: 'features.rbGasFixed', timestamp: '2026-02-20T10:00:00Z', operator: 'engineer_zhang' },
  { id: 'rb_04', flagName: 'contract-simulation', action: 'rolled_back', reason: 'features.rbResultMismatch', timestamp: '2026-02-15T18:00:00Z', operator: 'engineer_li' },
  { id: 'rb_05', flagName: 'contract-simulation', action: 'deployed', reason: 'features.rbStartCanary', timestamp: '2026-02-10T09:00:00Z', operator: 'devops_lead' },
];

// Pipeline data uses i18n keys as name/detail values — resolved via t() at render time
const MOCK_RELEASE_PIPELINE: ReleasePipeline = {
  currentVersion: 'v2.1.0',
  nextVersion: 'v2.2.0',
  pipeline: [
    { name: 'features.codeMerge', status: 'completed', details: '12 commits' },
    { name: 'features.autoTest', status: 'completed', details: '97.2% pass' },
    { name: 'features.canaryDeploy5', status: 'in_progress', details: 'features.pipelineTraffic5' },
    { name: 'features.gradualExpand', status: 'pending', details: 'features.gradualRollout' },
    { name: 'features.fullRelease100', status: 'pending', details: 'features.fullRelease' },
  ],
  canaryMetrics: [
    { name: 'features.errorRate', value: '0.08%', threshold: '< 1%', passing: true },
    { name: 'features.p95Latency', value: '165ms', threshold: '< 500ms', passing: true },
    { name: 'features.crashRate', value: '0%', threshold: '< 0.1%', passing: true },
  ],
  canaryPercentage: 5,
};

const INITIAL_DATA: FeatureFlagsData = {
  featureFlags: MOCK_FLAGS,
  abTests: MOCK_AB_TESTS,
  rollbackHistory: MOCK_ROLLBACK_HISTORY,
  releasePipeline: MOCK_RELEASE_PIPELINE,
  stats: { active: 5, inactive: 4, scheduled: 1, total: 10 },
};

// ── Helpers ────────────────────────────────────────────
function formatDate(ts: string): string {
  return format(parseISO(ts), 'MM/dd HH:mm');
}

function formatDateShort(ts: string): string {
  return format(parseISO(ts), 'MMM d');
}

function getRolloutColor(pct: number): string {
  if (pct >= 75) return 'from-emerald-500 to-emerald-400';
  if (pct >= 50) return 'from-emerald-500 to-amber-400';
  if (pct >= 25) return 'from-amber-500 to-amber-400';
  if (pct > 0) return 'from-amber-500 to-red-400';
  return 'from-slate-600 to-slate-500';
}

function getRolloutBgColor(pct: number): string {
  if (pct >= 75) return 'bg-emerald-500';
  if (pct >= 50) return 'bg-emerald-500';
  if (pct >= 25) return 'bg-amber-500';
  if (pct > 0) return 'bg-amber-500';
  return 'bg-slate-600';
}

// ── Rollout Bar ────────────────────────────────────────
function RolloutBar({ percentage }: { percentage: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full bg-slate-700/50 overflow-hidden">
        <motion.div
          className={cn('h-full rounded-full bg-gradient-to-r', getRolloutColor(percentage))}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
      <span className={cn(
        'text-xs font-mono font-medium w-10 text-right',
        percentage >= 75 ? 'text-emerald-400' :
        percentage >= 50 ? 'text-emerald-300' :
        percentage >= 25 ? 'text-amber-400' :
        percentage > 0 ? 'text-amber-300' : 'text-slate-500'
      )}>
        {percentage}%
      </span>
    </div>
  );
}

// ── Flag Card ──────────────────────────────────────────
function FlagCard({
  flag,
  onToggle,
  onRolloutChange,
}: {
  flag: FeatureFlag;
  onToggle: (id: string) => void;
  onRolloutChange: (id: string, pct: number) => void;
}) {
  const { t } = useI18n();
  const statusConfig = STATUS_CONFIG[flag.status];
  const envConfig = ENV_CONFIG[flag.environment];
  const [editingRollout, setEditingRollout] = useState(false);
  const [localPct, setLocalPct] = useState(flag.rolloutPercentage);

  const handleRolloutCommit = () => {
    onRolloutChange(flag.id, localPct);
    setEditingRollout(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={cn(
        'border-slate-700 bg-slate-800/60 backdrop-blur-sm overflow-hidden transition-colors',
        flag.status === 'active' ? 'border-l-4 border-l-emerald-500' :
        flag.status === 'scheduled' ? 'border-l-4 border-l-amber-500' :
        'border-l-4 border-l-slate-600'
      )}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className={cn(
                'flex size-8 shrink-0 items-center justify-center rounded-lg',
                flag.status === 'active' ? 'bg-emerald-500/15' :
                flag.status === 'scheduled' ? 'bg-amber-500/15' :
                'bg-slate-700/50'
              )}>
                <Flag className={cn(
                  'size-4',
                  flag.status === 'active' ? 'text-emerald-400' :
                  flag.status === 'scheduled' ? 'text-amber-400' :
                  'text-slate-500'
                )} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-medium text-slate-100">{t(flag.name)}</h4>
                  <code className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700/80 text-slate-300 font-mono">
                    {flag.key}
                  </code>
                </div>
                <p className="mt-1 text-[11px] text-slate-400 leading-relaxed">{t(flag.description)}</p>

                {/* Badges row */}
                <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                  <Badge variant="outline" className={cn('text-[9px] px-1.5 py-0', statusConfig.badge)}>
                    <span className={cn('inline-block size-1.5 rounded-full mr-1', statusConfig.dot)} />
                    {t(statusConfig.label)}
                  </Badge>
                  <Badge variant="outline" className={cn('text-[9px] px-1.5 py-0', envConfig.badge)}>
                    {t(envConfig.label)}
                  </Badge>
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-violet-500/10 text-violet-300 border-violet-500/20">
                    {t(TARGETING_LABELS[flag.targetingRules])}
                  </Badge>
                  {flag.scheduledDate && (
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-amber-500/10 text-amber-300 border-amber-500/20">
                      <Clock className="size-2.5 mr-0.5" />
                      {formatDateShort(flag.scheduledDate)}
                    </Badge>
                  )}
                </div>

                {/* Rollout */}
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-slate-500">{t('features.rolloutProgress')}</span>
                    <button
                      onClick={() => setEditingRollout(!editingRollout)}
                      className="text-[10px] text-violet-400 hover:text-violet-300 transition-colors"
                    >
                      {editingRollout ? t('features.done') : t('features.editLabel')}
                    </button>
                  </div>
                  {editingRollout ? (
                    <div className="space-y-2">
                      <Slider
                        value={[localPct]}
                        onValueChange={(v) => setLocalPct(v[0])}
                        max={100}
                        step={5}
                        className="py-1 [&_[role=slider]]:h-3 [&_[role=slider]]:w-3 [&_[role=slider]]:bg-violet-400 [&_[role=slider]]:border-0"
                      />
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-500">{localPct}%</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-5 text-[10px] text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 px-2"
                          onClick={handleRolloutCommit}
                        >
                          {t('features.apply')}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <RolloutBar percentage={flag.rolloutPercentage} />
                  )}
                </div>

                {/* Users */}
                <div className="mt-2 flex items-center gap-1 text-[10px] text-slate-500">
                  <Users className="size-3" />
                  <span>{flag.enabledForUsers.toLocaleString()} / {flag.totalUsers.toLocaleString()} {t('features.usersLabel')}</span>
                </div>
              </div>
            </div>

            {/* Toggle Switch */}
            <div className="shrink-0 pt-1">
              <Switch
                checked={flag.status === 'active'}
                onCheckedChange={() => onToggle(flag.id)}
                disabled={flag.status === 'scheduled'}
                className={cn(
                  flag.status === 'active' ? 'data-[state=checked]:bg-emerald-500' : '',
                )}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── A/B Test Card ──────────────────────────────────────
function ABTestCard({ test }: { test: ABTest }) {
  const { t } = useI18n();
  const statusConfig = AB_STATUS_CONFIG[test.status];
  const isRunning = test.status === 'running';
  const isCompleted = test.status === 'completed';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={cn(
        'border-slate-700 bg-slate-800/60 backdrop-blur-sm overflow-hidden',
        isRunning ? 'border-l-4 border-l-emerald-500' :
        isCompleted ? 'border-l-4 border-l-violet-500' :
        'border-l-4 border-l-slate-600'
      )}>
        <CardContent className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className={cn(
                'flex size-8 shrink-0 items-center justify-center rounded-lg',
                isRunning ? 'bg-emerald-500/15' :
                isCompleted ? 'bg-violet-500/15' :
                'bg-slate-700/50'
              )}>
                <FlaskConical className={cn(
                  'size-4',
                  isRunning ? 'text-emerald-400' :
                  isCompleted ? 'text-violet-400' :
                  'text-slate-500'
                )} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-medium text-slate-100">{t(test.name)}</h4>
                  <Badge variant="outline" className={cn('text-[9px] px-1.5 py-0', statusConfig.badge)}>
                    {isRunning && <span className={cn('inline-block size-1.5 rounded-full mr-1 animate-pulse', statusConfig.dot)} />}
                    {t(statusConfig.label)}
                  </Badge>
                </div>
                <p className="mt-1 text-[11px] text-slate-400">{t(test.description)}</p>
                <div className="mt-1 flex items-center gap-3 text-[10px] text-slate-500">
                  <span> {t('features.startLabel')}: {formatDateShort(test.startDate)}</span>
                  {test.endDate && <span> {t('features.endLabel')}: {formatDateShort(test.endDate)}</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Traffic Distribution Bar */}
          <div>
            <div className="text-[10px] text-slate-500 mb-1.5">{t('features.trafficAllocation')}</div>
            <div className="flex h-3 rounded-full overflow-hidden bg-slate-700/50">
              {test.variants.map((variant, idx) => {
                const colors = ['bg-violet-500', 'bg-emerald-500', 'bg-amber-500'];
                return (
                  <motion.div
                    key={variant.name}
                    className={cn(colors[idx % colors.length])}
                    initial={{ width: 0 }}
                    animate={{ width: `${variant.trafficPercent}%` }}
                    transition={{ duration: 0.6, delay: idx * 0.1 }}
                  />
                );
              })}
            </div>
            <div className="mt-1.5 flex flex-wrap gap-3">
              {test.variants.map((variant, idx) => {
                const dotColors = ['bg-violet-400', 'bg-emerald-400', 'bg-amber-400'];
                const isWinner = isCompleted && test.winner === variant.name;
                return (
                  <div key={variant.name} className="flex items-center gap-1.5 text-[10px]">
                    <span className={cn('inline-block size-2 rounded-full', dotColors[idx % dotColors.length])} />
                    <span className="text-slate-300">{variant.name}</span>
                    <span className="text-slate-500">({variant.trafficPercent}%)</span>
                    {isWinner && <CheckCircle className="size-3 text-emerald-400" />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Variant Comparison */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {test.variants.map((variant, idx) => {
              const borderColors = ['border-violet-500/30', 'border-emerald-500/30', 'border-amber-500/30'];
              const bgColors = ['bg-violet-500/5', 'bg-emerald-500/5', 'bg-amber-500/5'];
              const isWinner = isCompleted && test.winner === variant.name;
              const isPositive = variant.metricChange && variant.metricChange.startsWith('+');
              const isNegative = variant.metricChange && variant.metricChange.startsWith('-');

              return (
                <div
                  key={variant.name}
                  className={cn(
                    'rounded-lg border p-3',
                    borderColors[idx % borderColors.length],
                    bgColors[idx % bgColors.length],
                    isWinner && 'ring-1 ring-emerald-500/50'
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-slate-200">{variant.name}</span>
                    {isWinner && <Badge className="text-[9px] px-1.5 py-0 bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20">{t('features.winner')}</Badge>}
                  </div>
                  <p className="text-[10px] text-slate-400 mb-2">{t(variant.description)}</p>
                  {variant.metricChange && (
                    <div className="flex items-center gap-1">
                      {isPositive && <TrendingUp className="size-3 text-emerald-400" />}
                      {isNegative && <TrendingDown className="size-3 text-red-400" />}
                      {!isPositive && !isNegative && <Activity className="size-3 text-slate-400" />}
                      <span className={cn(
                        'text-xs font-semibold',
                        isPositive ? 'text-emerald-400' :
                        isNegative ? 'text-red-400' : 'text-slate-400'
                      )}>
                        {variant.metricChange}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Confidence Meter (running tests) */}
          {isRunning && test.confidence !== undefined && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] text-slate-500">{t('features.statisticalSignificance')}</span>
                <span className={cn(
                  'text-xs font-semibold',
                  test.confidence >= 95 ? 'text-emerald-400' :
                  test.confidence >= 80 ? 'text-amber-400' : 'text-red-400'
                )}>
                  {test.confidence}%
                </span>
              </div>
              <div className="relative h-2 rounded-full bg-slate-700/50 overflow-hidden">
                <motion.div
                  className={cn(
                    'h-full rounded-full',
                    test.confidence >= 95 ? 'bg-emerald-500' :
                    test.confidence >= 80 ? 'bg-amber-500' : 'bg-red-500'
                  )}
                  initial={{ width: 0 }}
                  animate={{ width: `${test.confidence}%` }}
                  transition={{ duration: 0.8 }}
                />
                {/* 95% threshold line */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-white/50"
                  style={{ left: '95%' }}
                />
              </div>
              <div className="mt-1 flex items-center justify-between text-[9px] text-slate-600">
                <span>0%</span>
                <span className="text-slate-400">{t('features.threshold95')}</span>
                <span>100%</span>
              </div>
            </div>
          )}

          {/* Completed result summary */}
          {isCompleted && test.winner && (
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="size-4 text-emerald-400" />
                <span className="text-xs font-semibold text-emerald-300">{t('features.resultWinner', { winner: test.winner })}</span>
              </div>
              <p className="text-[11px] text-slate-400">
                {t('features.skillUnlockSummary')}
              </p>
            </div>
          )}

          {/* Draft hint */}
          {test.status === 'draft' && (
            <div className="rounded-lg border border-slate-600/30 bg-slate-700/20 p-3 flex items-center gap-2">
              <CircleDot className="size-3.5 text-slate-400" />
              <span className="text-[11px] text-slate-400">{t('features.draftHint')}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Timeline Entry ─────────────────────────────────────
function TimelineEntry({ entry, isLast }: { entry: RollbackHistoryEntry; isLast: boolean }) {
  const { t } = useI18n();
  const actionConfig = ROLLBACK_ACTION_CONFIG[entry.action];
  const ActionIcon = actionConfig.icon;

  return (
    <div className="flex gap-3">
      {/* Timeline line + dot */}
      <div className="flex flex-col items-center">
        <div className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-full border-2',
          entry.action === 'deployed' ? 'border-emerald-500/50 bg-emerald-500/10' :
          entry.action === 'rolled_back' ? 'border-red-500/50 bg-red-500/10' :
          entry.action === 'paused' ? 'border-amber-500/50 bg-amber-500/10' :
          'border-sky-500/50 bg-sky-500/10'
        )}>
          <ActionIcon className={cn('size-3.5', actionConfig.color)} />
        </div>
        {!isLast && (
          <div className="w-0.5 flex-1 bg-slate-700/50 my-1" />
        )}
      </div>

      {/* Content */}
      <div className={cn('pb-4 min-w-0 flex-1', isLast && 'pb-0')}>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className={cn('text-[9px] px-1.5 py-0', actionConfig.badge)}>
            {t(actionConfig.label)}
          </Badge>
          <span className="text-xs font-medium text-slate-200">{entry.flagName}</span>
          <span className="text-[10px] text-slate-500" suppressHydrationWarning>{formatDate(entry.timestamp)}</span>
        </div>
        <p className="mt-1 text-[11px] text-slate-400">{t(entry.reason)}</p>
        <div className="mt-1 text-[10px] text-slate-500">
          {t('features.operator')}: <span className="text-slate-300 font-mono">{entry.operator}</span>
        </div>
      </div>
    </div>
  );
}

// ── Pipeline Stage ─────────────────────────────────────
function PipelineStageView({ stage, isLast }: { stage: PipelineStage; isLast: boolean }) {
  const { t } = useI18n();
  const isCompleted = stage.status === 'completed';
  const isInProgress = stage.status === 'in_progress';

  return (
    <div className="flex items-start gap-2 flex-1 min-w-0">
      <div className="flex flex-col items-center">
        <motion.div
          className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-full border-2',
            isCompleted ? 'border-emerald-500/50 bg-emerald-500/10' :
            isInProgress ? 'border-violet-500/50 bg-violet-500/10' :
            'border-slate-600/50 bg-slate-700/30'
          )}
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          {isCompleted && <CheckCircle className="size-4 text-emerald-400" />}
          {isInProgress && (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            >
              <FastForward className="size-4 text-violet-400" />
            </motion.div>
          )}
          {!isCompleted && !isInProgress && <CircleDot className="size-4 text-slate-500" />}
        </motion.div>
        {!isLast && (
          <div className={cn(
            'w-0.5 flex-1 my-1 min-h-[24px]',
            isCompleted ? 'bg-emerald-500/30' :
            isInProgress ? 'bg-violet-500/30' : 'bg-slate-700/50'
          )} />
        )}
      </div>

      <div className={cn('pb-3 min-w-0', isLast && 'pb-0')}>
        <p className={cn(
          'text-xs font-medium',
          isCompleted ? 'text-emerald-300' :
          isInProgress ? 'text-violet-300' : 'text-slate-500'
        )}>
          {t(stage.name)}
        </p>
        <p className="text-[10px] text-slate-500 mt-0.5">{stage.details.startsWith('features.') ? t(stage.details) : stage.details}</p>
      </div>
    </div>
  );
}

// ── Canary Gauge ───────────────────────────────────────
function CanaryGauge({ percentage }: { percentage: number }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const progress = (percentage / 100) * circumference;
  const gap = circumference - progress;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative flex items-center justify-center">
        <svg width="100" height="100" className="-rotate-90">
          <circle cx="50" cy="50" r={radius} fill="none" stroke="currentColor" strokeWidth="6" className="text-slate-700/50" />
          <motion.circle
            cx="50" cy="50" r={radius}
            fill="none" stroke="#8b5cf6" strokeWidth="6" strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: gap }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="text-lg font-bold text-violet-300 tabular-nums">{percentage}%</span>
          <span className="text-[9px] text-slate-500">Canary</span>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────
export default function FeatureFlags() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<TabId>('flags');
  const [data, setData] = useState<FeatureFlagsData>(INITIAL_DATA);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterEnv, setFilterEnv] = useState<string>('all');
  const [rollbackDialogOpen, setRollbackDialogOpen] = useState(false);
  const [pipeline, setPipeline] = useState<ReleasePipeline>(INITIAL_DATA.releasePipeline);
  const [loading, setLoading] = useState(false);

  // Local state mutations (optimistic updates)
  const refreshFromAPI = async () => {
    try {
      const res = await fetch('/api/feature-flags');
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setPipeline(json.releasePipeline);
      }
    } catch {
      // Keep current state on failure
    }
  };

  const handleToggle = async (flagId: string) => {
    // Optimistic update
    setData((prev) => ({
      ...prev,
      featureFlags: prev.featureFlags.map((f) => {
        if (f.id !== flagId) return f;
        const newStatus: FlagStatus = f.status === 'active' ? 'inactive' : 'active';
        return {
          ...f,
          status: newStatus,
          rolloutPercentage: newStatus === 'inactive' ? 0 : f.rolloutPercentage,
          enabledForUsers: newStatus === 'inactive' ? 0 : f.enabledForUsers,
          updatedAt: new Date().toISOString(),
        };
      }),
    }));
    setLoading(true);
    try {
      await fetch('/api/feature-flags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle', flagId }),
      });
    } catch {
      // Revert on failure
      refreshFromAPI();
    }
    setLoading(false);
  };

  const handleRolloutChange = async (flagId: string, rolloutPercentage: number) => {
    // Optimistic update
    setData((prev) => ({
      ...prev,
      featureFlags: prev.featureFlags.map((f) => {
        if (f.id !== flagId) return f;
        return {
          ...f,
          rolloutPercentage,
          enabledForUsers: Math.round((rolloutPercentage / 100) * f.totalUsers),
          status: rolloutPercentage > 0 && f.status === 'inactive' ? 'active' as const : f.status,
          updatedAt: new Date().toISOString(),
        };
      }),
    }));
    setLoading(true);
    try {
      await fetch('/api/feature-flags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_rollout', flagId, data: { rolloutPercentage } }),
      });
    } catch {
      refreshFromAPI();
    }
    setLoading(false);
  };

  const handleRollback = async (flagId: string) => {
    // Optimistic update
    setData((prev) => {
      const flag = prev.featureFlags.find((f) => f.id === flagId);
      const newEntry: RollbackHistoryEntry = {
        id: `rb_${String(prev.rollbackHistory.length + 1).padStart(2, '0')}`,
        flagName: flag?.key || '',
        action: 'rolled_back',
        reason: t('features.rollbackReason', { pct: String(flag?.rolloutPercentage || 0) }),
        timestamp: new Date().toISOString(),
        operator: 'admin',
      };
      return {
        ...prev,
        featureFlags: prev.featureFlags.map((f) => {
          if (f.id !== flagId) return f;
          return { ...f, rolloutPercentage: 0, enabledForUsers: 0, status: 'inactive' as const, updatedAt: new Date().toISOString() };
        }),
        rollbackHistory: [newEntry, ...prev.rollbackHistory],
      };
    });
    setRollbackDialogOpen(false);
    setLoading(true);
    try {
      await fetch('/api/feature-flags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'rollback', flagId, data: { rolloutPercentage: 0 } }),
      });
    } catch {
      refreshFromAPI();
    }
    setLoading(false);
  };

  const handleAdvanceCanary = () => {
    const stages = [5, 25, 50, 75, 100];
    const currentIdx = stages.indexOf(pipeline.canaryPercentage);
    const nextPct = currentIdx < stages.length - 1 ? stages[currentIdx + 1] : 100;

    const newPipeline = { ...pipeline, canaryPercentage: nextPct };
    const newPipelineStages = newPipeline.pipeline.map((stage, idx) => {
      if (idx < 2) return { ...stage, status: 'completed' as const };
      if (idx === 2) return { ...stage, status: nextPct >= 25 ? 'completed' as const : 'in_progress' as const, details: t('features.pipelineTraffic', { pct: String(nextPct) }) };
      if (idx === 3) return { ...stage, status: nextPct >= 25 && nextPct < 100 ? 'in_progress' as const : (nextPct >= 100 ? 'completed' as const : 'pending' as const), details: nextPct >= 100 ? t('features.completedLabel') : t('features.pipelineRollout', { pct: String(nextPct) }) };
      if (idx === 4) return { ...stage, status: nextPct >= 100 ? 'completed' as const : 'pending' as const };
      return stage;
    });

    setPipeline({ ...newPipeline, pipeline: newPipelineStages });
  };

  // Filtered flags
  const filteredFlags = data.featureFlags.filter((flag) => {
    if (filterStatus !== 'all' && flag.status !== filterStatus) return false;
    if (filterEnv !== 'all' && flag.environment !== filterEnv) return false;
    return true;
  });

  // Recalculate stats from current data
  const stats = {
    active: data.featureFlags.filter((f) => f.status === 'active').length,
    inactive: data.featureFlags.filter((f) => f.status === 'inactive').length,
    scheduled: data.featureFlags.filter((f) => f.status === 'scheduled').length,
    total: data.featureFlags.length,
  };

  // ── Tab Content Renderers ──────────────────────────

  const renderFlags = () => (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="size-2 rounded-full bg-emerald-400" />
          <span className="text-xs text-slate-300"><span className="font-semibold text-emerald-400">{stats.active}</span> {t('features.activeCount')}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="size-2 rounded-full bg-slate-400" />
          <span className="text-xs text-slate-300"><span className="font-semibold text-slate-400">{stats.inactive}</span> {t('features.inactiveCount')}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="size-2 rounded-full bg-amber-400" />
          <span className="text-xs text-slate-300"><span className="font-semibold text-amber-400">{stats.scheduled}</span> {t('features.scheduledCount')}</span>
        </div>
        <Separator orientation="vertical" className="h-4 bg-slate-700" />
        <span className="text-[10px] text-slate-500"> {t('features.totalFlags', { count: stats.total })}</span>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[130px] h-7 text-xs bg-slate-800/50 border-slate-700">
            <SelectValue placeholder={t('features.statusFilter')} />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            <SelectItem value="all">{t('features.allStatus')}</SelectItem>
            <SelectItem value="active">{t('features.statusActive')}</SelectItem>
            <SelectItem value="inactive">{t('features.statusInactive')}</SelectItem>
            <SelectItem value="scheduled">{t('features.statusScheduled')}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterEnv} onValueChange={setFilterEnv}>
          <SelectTrigger className="w-[130px] h-7 text-xs bg-slate-800/50 border-slate-700">
            <SelectValue placeholder={t('features.envFilter')} />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            <SelectItem value="all">{t('features.allEnv')}</SelectItem>
            <SelectItem value="production">{t('features.envProduction')}</SelectItem>
            <SelectItem value="staging">{t('features.envStaging')}</SelectItem>
            <SelectItem value="development">{t('features.envDevelopment')}</SelectItem>
          </SelectContent>
        </Select>
        {(filterStatus !== 'all' || filterEnv !== 'all') && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-[10px] text-slate-400 hover:text-slate-200"
            onClick={() => { setFilterStatus('all'); setFilterEnv('all'); }}
          >
            {t('features.resetFilters')}
          </Button>
        )}
      </div>

      {/* Flag Cards */}
      <ScrollArea className="max-h-[600px]">
        <div className="space-y-3 pr-1">
          {filteredFlags.map((flag) => (
            <FlagCard
              key={flag.id}
              flag={flag}
              onToggle={handleToggle}
              onRolloutChange={handleRolloutChange}
            />
          ))}
          {filteredFlags.length === 0 && (
            <div className="flex flex-col items-center py-8 text-slate-500">
              <Flag className="size-8 mb-2 opacity-50" />
              <p className="text-xs">{t('features.noMatchingFlags')}</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );

  const renderABTests = () => (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FlaskConical className="size-4 text-violet-400" />
          <span className="text-xs text-slate-300">
            <span className="font-semibold text-violet-400">{data.abTests.filter((t) => t.status === 'running').length}</span> {t('features.runningCount')} ·{' '}
            <span className="font-semibold text-emerald-400">{data.abTests.filter((t) => t.status === 'completed').length}</span> {t('features.completedCount')} ·{' '}
            <span className="font-semibold text-slate-400">{data.abTests.filter((t) => t.status === 'draft').length}</span> {t('features.draftCount')}
          </span>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-[10px] border-violet-500/30 text-violet-300 hover:bg-violet-500/10 hover:text-violet-200"
        >
          <FlaskConical className="size-3 mr-1" />
          {t('features.createNewTest')}
        </Button>
      </div>

      {/* A/B Test Cards */}
      <div className="space-y-4">
        {data.abTests.map((test) => (
          <ABTestCard key={test.id} test={test} />
        ))}
      </div>
    </div>
  );

  const renderRollback = () => (
    <div className="space-y-5">
      {/* Timeline */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Clock className="size-4 text-violet-400" />
          <h4 className="text-sm font-semibold text-slate-200">{t('features.rollbackHistory')}</h4>
        </div>
        <div className="space-y-0">
          {data.rollbackHistory.map((entry, idx) => (
            <TimelineEntry
              key={entry.id}
              entry={entry}
              isLast={idx === data.rollbackHistory.length - 1}
            />
          ))}
        </div>
      </div>

      <Separator className="bg-slate-700/50" />

      {/* Rollback Capability */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <RotateCcw className="size-4 text-red-400" />
          <h4 className="text-sm font-semibold text-slate-200">{t('features.quickRollback')}</h4>
        </div>
        <div className="space-y-2">
          {data.featureFlags
            .filter((f) => f.status === 'active' && f.rolloutPercentage > 0)
            .map((flag) => (
              <div
                key={flag.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-slate-700 bg-slate-800/60 p-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-2 rounded-full bg-emerald-400 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-xs text-slate-200 font-medium">{t(flag.name)}</span>
                    <div className="text-[10px] text-slate-500">
                      {t('features.currentRollout')}: {flag.rolloutPercentage}% → {t('features.rollbackTo')}: 0%
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 text-[10px] shrink-0 border-red-500/30 text-red-300 hover:bg-red-500/10 hover:text-red-200"
                  onClick={() => handleRollback(flag.id)}
                  disabled={loading}
                >
                  <RotateCcw className="size-3 mr-1" />
                  {t('features.rollbackBtn')}
                </Button>
              </div>
            ))}
        </div>
      </div>

      <Separator className="bg-slate-700/50" />

      {/* Safety Checks */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Shield className="size-4 text-amber-400" />
          <h4 className="text-sm font-semibold text-slate-200">{t('features.autoRollbackConditions')}</h4>
        </div>
        <div className="space-y-2">
          {[
            { condition: t('features.errorRateCondition'), current: '0.08%', status: 'safe' as const },
            { condition: t('features.p95Condition'), current: '165ms', status: 'safe' as const },
            { condition: t('features.crashCondition'), current: '0%', status: 'safe' as const },
          ].map((check) => (
            <div
              key={check.condition}
              className={cn(
                'flex items-center justify-between rounded-lg border p-3',
                check.status === 'safe'
                  ? 'border-emerald-500/20 bg-emerald-500/5'
                  : 'border-red-500/20 bg-red-500/5'
              )}
            >
              <div className="flex items-center gap-2">
                {check.status === 'safe' ? (
                  <CheckCircle className="size-3.5 text-emerald-400" />
                ) : (
                  <AlertTriangle className="size-3.5 text-red-400" />
                )}
                <span className="text-xs text-slate-300">{check.condition}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-500">{t('features.current')}:</span>
                <span className={cn(
                  'text-xs font-semibold',
                  check.status === 'safe' ? 'text-emerald-400' : 'text-red-400'
                )}>
                  {check.current}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Separator className="bg-slate-700/50" />

      {/* Emergency Rollback */}
      <Dialog open={rollbackDialogOpen} onOpenChange={setRollbackDialogOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className="w-full h-10 border-red-500/50 text-red-400 hover:bg-red-500/10 hover:text-red-300 hover:border-red-500/70"
          >
            <AlertOctagon className="size-4 mr-2" />
            {t('features.emergencyRollback')}
          </Button>
        </DialogTrigger>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-red-400 flex items-center gap-2">
              <AlertOctagon className="size-5" />
              {t('features.confirmEmergencyRollback')}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {t('features.emergencyRollbackDesc')}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
              <p className="text-xs text-red-300 font-medium mb-2">{t('features.willRollbackFollowing')}</p>
              <ul className="space-y-1">
                {data.featureFlags
                  .filter((f) => f.status === 'active' && f.rolloutPercentage > 0)
                  .map((f) => (
                    <li key={f.id} className="text-[11px] text-slate-300 flex items-center gap-2">
                      <ArrowRight className="size-3 text-red-400" />
                      {t(f.name)} ({f.rolloutPercentage}% → 0%)
                    </li>
                  ))}
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              className="text-slate-400 hover:text-slate-200"
              onClick={() => setRollbackDialogOpen(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="outline"
              className="border-red-500/50 text-red-400 hover:bg-red-500/10 hover:text-red-300"
              onClick={async () => {
                const activeFlags = data.featureFlags.filter((f) => f.status === 'active' && f.rolloutPercentage > 0);
                for (const f of activeFlags) {
                  await handleRollback(f.id);
                }
                setRollbackDialogOpen(false);
              }}
              disabled={loading}
            >
              <AlertOctagon className="size-3.5 mr-1" />
              {t('features.confirmRollback')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  const renderPipeline = () => (
    <div className="space-y-5">
      {/* Version Info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <span className="text-[10px] text-emerald-400">{t('features.currentVersion')}</span>
            <span className="text-xs font-semibold text-emerald-300 font-mono">{pipeline.currentVersion}</span>
          </div>
          <ArrowRight className="size-4 text-slate-600" />
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-500/10 border border-violet-500/20">
            <span className="text-[10px] text-violet-400">{t('features.targetVersion')}</span>
            <span className="text-xs font-semibold text-violet-300 font-mono">{pipeline.nextVersion}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-emerald-400">
          <Shield className="size-3" />
          <span>{t('features.autoRollbackEnabled')}</span>
        </div>
      </div>

      {/* Pipeline Stages - Horizontal on desktop, vertical on mobile */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
        <div className="flex items-center gap-2 mb-4">
          <Rocket className="size-4 text-violet-400" />
          <h4 className="text-sm font-semibold text-slate-200">{t('features.releasePipelineTitle')}</h4>
        </div>

        {/* Desktop: horizontal stepper */}
        <div className="hidden md:flex items-start gap-0">
          {pipeline.pipeline.map((stage, idx) => {
            const isCompleted = stage.status === 'completed';
            const isInProgress = stage.status === 'in_progress';
            const isLast = idx === pipeline.pipeline.length - 1;

            return (
              <div key={stage.name} className="flex items-start flex-1 min-w-0">
                <div className="flex flex-col items-center flex-1">
                  <motion.div
                    className={cn(
                      'flex size-8 shrink-0 items-center justify-center rounded-full border-2',
                      isCompleted ? 'border-emerald-500/50 bg-emerald-500/10' :
                      isInProgress ? 'border-violet-500/50 bg-violet-500/10' :
                      'border-slate-600/50 bg-slate-700/30'
                    )}
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                  >
                    {isCompleted && <CheckCircle className="size-4 text-emerald-400" />}
                    {isInProgress && (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                      >
                        <FastForward className="size-4 text-violet-400" />
                      </motion.div>
                    )}
                    {!isCompleted && !isInProgress && <CircleDot className="size-4 text-slate-500" />}
                  </motion.div>
                  {!isLast && (
                    <div className={cn(
                      'flex-1 h-0.5 w-full mt-4',
                      isCompleted ? 'bg-emerald-500/30' :
                      isInProgress ? 'bg-violet-500/20' : 'bg-slate-700/50'
                    )} />
                  )}
                  <div className="mt-2 text-center min-w-0 px-1">
                    <p className={cn(
                      'text-[10px] font-medium truncate',
                      isCompleted ? 'text-emerald-300' :
                      isInProgress ? 'text-violet-300' : 'text-slate-500'
                    )}>
                      {t(stage.name)}
                    </p>
                    <p className="text-[9px] text-slate-600 mt-0.5 truncate">{stage.details.startsWith('features.') ? t(stage.details) : stage.details}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Mobile: vertical stepper */}
        <div className="md:hidden space-y-0">
          {pipeline.pipeline.map((stage, idx) => (
            <PipelineStageView key={stage.name} stage={stage} isLast={idx === pipeline.pipeline.length - 1} />
          ))}
        </div>
      </div>

      {/* Canary Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Canary Gauge */}
        <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4 flex flex-col items-center justify-center">
          <div className="flex items-center gap-2 mb-3 self-start">
            <Zap className="size-4 text-violet-400" />
            <h4 className="text-sm font-semibold text-slate-200">{t('features.canaryDeploy')}</h4>
          </div>
          <CanaryGauge percentage={pipeline.canaryPercentage} />
          <div className="mt-3 w-full">
            <Button
              size="sm"
              variant="outline"
              className="w-full h-8 text-xs border-violet-500/30 text-violet-300 hover:bg-violet-500/10 hover:text-violet-200"
              onClick={handleAdvanceCanary}
              disabled={pipeline.canaryPercentage >= 100}
            >
              <FastForward className="size-3.5 mr-1" />
              {t('features.advanceCanary')}
            </Button>
          </div>
        </div>

        {/* Canary Metrics */}
        <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="size-4 text-violet-400" />
            <h4 className="text-sm font-semibold text-slate-200">{t('features.canaryMetrics')}</h4>
          </div>
          <div className="space-y-3">
            {pipeline.canaryMetrics.map((metric) => (
              <div
                key={metric.name}
                className={cn(
                  'rounded-lg border p-3',
                  metric.passing ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-red-500/20 bg-red-500/5'
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-300">{t(metric.name)}</span>
                  {metric.passing ? (
                    <CheckCircle className="size-3.5 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="size-3.5 text-red-400" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className={cn(
                    'text-sm font-semibold',
                    metric.passing ? 'text-emerald-400' : 'text-red-400'
                  )}>
                    {metric.value}
                  </span>
                  <span className="text-[10px] text-slate-500">{t('features.threshold')}: {metric.threshold}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // ── Tab content map ──
  const tabContent: Record<TabId, () => React.ReactNode> = {
    flags: renderFlags,
    ab: renderABTests,
    rollback: renderRollback,
    pipeline: renderPipeline,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
    >
      <Card className="border-slate-700 bg-slate-800/80 backdrop-blur-sm overflow-hidden">
        {/* Top accent bar */}
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-violet-500 via-emerald-500 to-violet-500" />

        <CardHeader className="pb-0 pt-5">
          <CardTitle className="flex items-center gap-2 text-base text-slate-100">
            <Flag className="size-5 text-violet-400" />
            {t('features.title')}
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
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  )}
                >
                  <TabIcon className="size-3.5" />
                  <span className="hidden sm:inline">{t(tab.label)}</span>
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
