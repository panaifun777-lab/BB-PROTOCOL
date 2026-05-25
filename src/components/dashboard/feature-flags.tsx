'use client';

import { useState } from 'react';
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
  { id: 'flags', label: '功能开关', icon: Flag },
  { id: 'ab', label: 'A/B 测试', icon: FlaskConical },
  { id: 'rollback', label: '回滚机制', icon: RotateCcw },
  { id: 'pipeline', label: '发布管道', icon: Rocket },
];

// ── Color Config ───────────────────────────────────────
const STATUS_CONFIG: Record<FlagStatus, { label: string; badge: string; dot: string }> = {
  active: {
    label: '活跃',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    dot: 'bg-emerald-400',
  },
  inactive: {
    label: '停用',
    badge: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
    dot: 'bg-slate-400',
  },
  scheduled: {
    label: '计划中',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    dot: 'bg-amber-400',
  },
};

const ENV_CONFIG: Record<Environment, { label: string; badge: string }> = {
  production: { label: '生产', badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  staging: { label: '预发布', badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  development: { label: '开发', badge: 'bg-sky-500/10 text-sky-400 border-sky-500/20' },
};

const TARGETING_LABELS: Record<TargetingRule, string> = {
  all: '所有用户',
  tier_pro: 'Pro及以上',
  opt_in: '自主开启',
  beta_testers: 'Beta用户',
  internal_only: '仅内部',
  enterprise_only: '仅企业',
  premium_users: '高级用户',
};

const ROLLBACK_ACTION_CONFIG: Record<RollbackAction, { label: string; icon: React.ElementType; badge: string; color: string }> = {
  deployed: {
    label: '部署',
    icon: Rocket,
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    color: 'text-emerald-400',
  },
  rolled_back: {
    label: '回滚',
    icon: RotateCcw,
    badge: 'bg-red-500/20 text-red-300 border-red-500/30',
    color: 'text-red-400',
  },
  paused: {
    label: '暂停',
    icon: Pause,
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    color: 'text-amber-400',
  },
  resumed: {
    label: '恢复',
    icon: Play,
    badge: 'bg-sky-500/20 text-sky-400 border-sky-500/20',
    color: 'text-sky-400',
  },
};

const AB_STATUS_CONFIG: Record<ABTestStatus, { label: string; badge: string; dot: string }> = {
  running: {
    label: '运行中',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    dot: 'bg-emerald-400',
  },
  completed: {
    label: '已完成',
    badge: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
    dot: 'bg-violet-400',
  },
  draft: {
    label: '草稿',
    badge: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
    dot: 'bg-slate-400',
  },
};

// ── Deterministic Mock Data (fallback) ─────────────────
const MOCK_FLAGS: FeatureFlag[] = [
  {
    id: 'ff_01', name: '分身市场', key: 'avatar-marketplace',
    description: '分身租赁市场，支持认知分身的共享与变现',
    status: 'active', rolloutPercentage: 100, targetingRules: 'all', environment: 'production',
    createdAt: '2025-12-01T08:00:00Z', updatedAt: '2026-02-28T10:00:00Z', enabledForUsers: 12847, totalUsers: 12847,
  },
  {
    id: 'ff_02', name: '合约模拟器', key: 'contract-simulation',
    description: '智能合约模拟执行与Gas估算工具',
    status: 'active', rolloutPercentage: 75, targetingRules: 'tier_pro', environment: 'production',
    createdAt: '2026-01-15T08:00:00Z', updatedAt: '2026-02-28T14:00:00Z', enabledForUsers: 6423, totalUsers: 8564,
  },
  {
    id: 'ff_03', name: 'LP流动性面板', key: 'lp-liquidity',
    description: '流动性提供者仪表盘，深度图与代币经济',
    status: 'active', rolloutPercentage: 50, targetingRules: 'opt_in', environment: 'production',
    createdAt: '2026-01-20T08:00:00Z', updatedAt: '2026-02-25T16:00:00Z', enabledForUsers: 3200, totalUsers: 6400,
  },
  {
    id: 'ff_04', name: 'IFD v2 委托', key: 'ifd-v2-delegation',
    description: '流体民主委托系统v2，支持多级委托与权重衰减',
    status: 'active', rolloutPercentage: 25, targetingRules: 'beta_testers', environment: 'production',
    createdAt: '2026-02-01T08:00:00Z', updatedAt: '2026-02-27T09:00:00Z', enabledForUsers: 856, totalUsers: 3424,
  },
  {
    id: 'ff_05', name: 'ZK实体验证', key: 'zk-identity',
    description: '零知识证明身份验证，隐私保护的身份认证',
    status: 'inactive', rolloutPercentage: 0, targetingRules: 'internal_only', environment: 'staging',
    createdAt: '2026-02-10T08:00:00Z', updatedAt: '2026-02-10T08:00:00Z', enabledForUsers: 0, totalUsers: 150,
  },
  {
    id: 'ff_06', name: '多链部署', key: 'multi-chain',
    description: '多链部署支持，跨链分身同步',
    status: 'inactive', rolloutPercentage: 0, targetingRules: 'internal_only', environment: 'development',
    createdAt: '2026-02-15T08:00:00Z', updatedAt: '2026-02-15T08:00:00Z', enabledForUsers: 0, totalUsers: 45,
  },
  {
    id: 'ff_07', name: 'DAO治理模块', key: 'dao-governance',
    description: '去中心化治理提案与投票系统',
    status: 'scheduled', rolloutPercentage: 0, targetingRules: 'all', environment: 'production',
    createdAt: '2026-02-20T08:00:00Z', updatedAt: '2026-02-20T08:00:00Z', enabledForUsers: 0, totalUsers: 12847,
    scheduledDate: '2026-04-01T00:00:00Z',
  },
  {
    id: 'ff_08', name: 'SDK/API平台', key: 'sdk-api',
    description: '开发者SDK与API管理平台',
    status: 'inactive', rolloutPercentage: 0, targetingRules: 'enterprise_only', environment: 'staging',
    createdAt: '2026-02-18T08:00:00Z', updatedAt: '2026-02-18T08:00:00Z', enabledForUsers: 0, totalUsers: 200,
  },
  {
    id: 'ff_09', name: '跨链桥集成', key: 'cross-chain-bridge',
    description: '跨链桥协议集成，支持资产跨链转移',
    status: 'inactive', rolloutPercentage: 0, targetingRules: 'internal_only', environment: 'development',
    createdAt: '2026-02-22T08:00:00Z', updatedAt: '2026-02-22T08:00:00Z', enabledForUsers: 0, totalUsers: 45,
  },
  {
    id: 'ff_10', name: '高级分析', key: 'advanced-analytics',
    description: '高级数据分析与BI可视化工具',
    status: 'active', rolloutPercentage: 10, targetingRules: 'premium_users', environment: 'production',
    createdAt: '2026-02-25T08:00:00Z', updatedAt: '2026-02-28T11:00:00Z', enabledForUsers: 128, totalUsers: 1280,
  },
];

const MOCK_AB_TESTS: ABTest[] = [
  {
    id: 'ab_01', name: '分账比例优化', description: '测试不同分账比例对收益和用户行为的影响', status: 'running',
    variants: [
      { name: 'Control', description: '70/20/10 分账比例', trafficPercent: 45, metricChange: 'baseline', metricValue: '100%' },
      { name: 'Variant A', description: '65/25/10 分账比例', trafficPercent: 45, metricChange: '+8.2%', metricValue: '108.2%' },
      { name: 'Variant B', description: '75/15/10 分账比例', trafficPercent: 10, metricChange: '-3.1%', metricValue: '96.9%' },
    ],
    startDate: '2026-02-15T00:00:00Z', confidence: 87,
    metrics: { primary: 'revenue', secondary: 'user_retention' },
  },
  {
    id: 'ab_02', name: '技能解锁门槛', description: '测试降低技能解锁门槛对解锁率和收入的影响', status: 'completed',
    variants: [
      { name: 'Control', description: '$500/$2000/$8000 门槛', trafficPercent: 50, metricChange: 'baseline', metricValue: '100%' },
      { name: 'Variant', description: '$300/$1500/$6000 门槛', trafficPercent: 50, metricChange: '+34%', metricValue: '134%' },
    ],
    startDate: '2026-01-15T00:00:00Z', endDate: '2026-02-28T00:00:00Z', winner: 'Variant', confidence: 95,
    metrics: { primary: 'unlock_rate', secondary: 'revenue' },
  },
  {
    id: 'ab_03', name: '共振分UI展示', description: '测试共振分不同展示方式的用户交互效果', status: 'draft',
    variants: [
      { name: 'Control', description: '数值显示', trafficPercent: 50 },
      { name: 'Variant', description: '波形+数值', trafficPercent: 50 },
    ],
    startDate: '2026-03-15T00:00:00Z',
    metrics: { primary: 'engagement', secondary: 'session_duration' },
  },
];

const MOCK_ROLLBACK_HISTORY: RollbackHistoryEntry[] = [
  { id: 'rb_01', flagName: 'contract-simulation', action: 'deployed', reason: '灰度放量第三阶段', timestamp: '2026-02-28T14:00:00Z', operator: 'devops_lead' },
  { id: 'rb_02', flagName: 'contract-simulation', action: 'paused', reason: '发现Gas估算偏差', timestamp: '2026-02-25T16:00:00Z', operator: 'devops_lead' },
  { id: 'rb_03', flagName: 'contract-simulation', action: 'resumed', reason: 'Gas估算修复完成', timestamp: '2026-02-20T10:00:00Z', operator: 'engineer_zhang' },
  { id: 'rb_04', flagName: 'contract-simulation', action: 'rolled_back', reason: '模拟结果不一致', timestamp: '2026-02-15T18:00:00Z', operator: 'engineer_li' },
  { id: 'rb_05', flagName: 'contract-simulation', action: 'deployed', reason: '开始灰度发布', timestamp: '2026-02-10T09:00:00Z', operator: 'devops_lead' },
];

const MOCK_RELEASE_PIPELINE: ReleasePipeline = {
  currentVersion: 'v2.1.0',
  nextVersion: 'v2.2.0',
  pipeline: [
    { name: '代码合并', status: 'completed', details: '12 commits' },
    { name: '自动化测试', status: 'completed', details: '97.2% pass' },
    { name: 'Canary部署(5%)', status: 'in_progress', details: '5% 流量' },
    { name: '灰度扩展(25%→50%→75%)', status: 'pending', details: '渐进放量' },
    { name: '全量发布(100%)', status: 'pending', details: '全量上线' },
  ],
  canaryMetrics: [
    { name: '错误率', value: '0.08%', threshold: '< 1%', passing: true },
    { name: 'P95延迟', value: '165ms', threshold: '< 500ms', passing: true },
    { name: '崩溃率', value: '0%', threshold: '< 0.1%', passing: true },
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
                  <h4 className="text-sm font-medium text-slate-100">{flag.name}</h4>
                  <code className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700/80 text-slate-300 font-mono">
                    {flag.key}
                  </code>
                </div>
                <p className="mt-1 text-[11px] text-slate-400 leading-relaxed">{flag.description}</p>

                {/* Badges row */}
                <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                  <Badge variant="outline" className={cn('text-[9px] px-1.5 py-0', statusConfig.badge)}>
                    <span className={cn('inline-block size-1.5 rounded-full mr-1', statusConfig.dot)} />
                    {statusConfig.label}
                  </Badge>
                  <Badge variant="outline" className={cn('text-[9px] px-1.5 py-0', envConfig.badge)}>
                    {envConfig.label}
                  </Badge>
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-violet-500/10 text-violet-300 border-violet-500/20">
                    {TARGETING_LABELS[flag.targetingRules]}
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
                    <span className="text-[10px] text-slate-500">灰度进度</span>
                    <button
                      onClick={() => setEditingRollout(!editingRollout)}
                      className="text-[10px] text-violet-400 hover:text-violet-300 transition-colors"
                    >
                      {editingRollout ? '完成' : '编辑'}
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
                          应用
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
                  <span>{flag.enabledForUsers.toLocaleString()} / {flag.totalUsers.toLocaleString()} 用户</span>
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
                  <h4 className="text-sm font-medium text-slate-100">{test.name}</h4>
                  <Badge variant="outline" className={cn('text-[9px] px-1.5 py-0', statusConfig.badge)}>
                    {isRunning && <span className={cn('inline-block size-1.5 rounded-full mr-1 animate-pulse', statusConfig.dot)} />}
                    {statusConfig.label}
                  </Badge>
                </div>
                <p className="mt-1 text-[11px] text-slate-400">{test.description}</p>
                <div className="mt-1 flex items-center gap-3 text-[10px] text-slate-500">
                  <span>开始: {formatDateShort(test.startDate)}</span>
                  {test.endDate && <span>结束: {formatDateShort(test.endDate)}</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Traffic Distribution Bar */}
          <div>
            <div className="text-[10px] text-slate-500 mb-1.5">流量分配</div>
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
                    {isWinner && <Badge className="text-[9px] px-1.5 py-0 bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20">胜出</Badge>}
                  </div>
                  <p className="text-[10px] text-slate-400 mb-2">{variant.description}</p>
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
                <span className="text-[10px] text-slate-500">统计显著性</span>
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
                <span className="text-slate-400">95% 阈值</span>
                <span>100%</span>
              </div>
            </div>
          )}

          {/* Completed result summary */}
          {isCompleted && test.winner && (
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="size-4 text-emerald-400" />
                <span className="text-xs font-semibold text-emerald-300">结果: {test.winner} 胜出</span>
              </div>
              <p className="text-[11px] text-slate-400">
                {test.name === '技能解锁门槛'
                  ? '解锁率提升34%，收入保持中性 — 推荐采用新门槛'
                  : '实验已达到统计显著性阈值'}
              </p>
            </div>
          )}

          {/* Draft hint */}
          {test.status === 'draft' && (
            <div className="rounded-lg border border-slate-600/30 bg-slate-700/20 p-3 flex items-center gap-2">
              <CircleDot className="size-3.5 text-slate-400" />
              <span className="text-[11px] text-slate-400">草稿状态 — 配置变体后可启动实验</span>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Timeline Entry ─────────────────────────────────────
function TimelineEntry({ entry, isLast }: { entry: RollbackHistoryEntry; isLast: boolean }) {
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
            {actionConfig.label}
          </Badge>
          <span className="text-xs font-medium text-slate-200">{entry.flagName}</span>
          <span className="text-[10px] text-slate-500">{formatDate(entry.timestamp)}</span>
        </div>
        <p className="mt-1 text-[11px] text-slate-400">{entry.reason}</p>
        <div className="mt-1 text-[10px] text-slate-500">
          操作人: <span className="text-slate-300 font-mono">{entry.operator}</span>
        </div>
      </div>
    </div>
  );
}

// ── Pipeline Stage ─────────────────────────────────────
function PipelineStageView({ stage, isLast }: { stage: PipelineStage; isLast: boolean }) {
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
          {stage.name}
        </p>
        <p className="text-[10px] text-slate-500 mt-0.5">{stage.details}</p>
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
        reason: `回滚 ${flag?.rolloutPercentage || 0}% → 0%`,
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
      if (idx === 2) return { ...stage, status: nextPct >= 25 ? 'completed' as const : 'in_progress' as const, details: `${nextPct}% 流量` };
      if (idx === 3) return { ...stage, status: nextPct >= 25 && nextPct < 100 ? 'in_progress' as const : (nextPct >= 100 ? 'completed' as const : 'pending' as const), details: nextPct >= 100 ? '已完成' : `${nextPct}% 放量` };
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
          <span className="text-xs text-slate-300"><span className="font-semibold text-emerald-400">{stats.active}</span> 活跃</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="size-2 rounded-full bg-slate-400" />
          <span className="text-xs text-slate-300"><span className="font-semibold text-slate-400">{stats.inactive}</span> 停用</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="size-2 rounded-full bg-amber-400" />
          <span className="text-xs text-slate-300"><span className="font-semibold text-amber-400">{stats.scheduled}</span> 计划中</span>
        </div>
        <Separator orientation="vertical" className="h-4 bg-slate-700" />
        <span className="text-[10px] text-slate-500">共 {stats.total} 个功能开关</span>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[130px] h-7 text-xs bg-slate-800/50 border-slate-700">
            <SelectValue placeholder="状态筛选" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="active">活跃</SelectItem>
            <SelectItem value="inactive">停用</SelectItem>
            <SelectItem value="scheduled">计划中</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterEnv} onValueChange={setFilterEnv}>
          <SelectTrigger className="w-[130px] h-7 text-xs bg-slate-800/50 border-slate-700">
            <SelectValue placeholder="环境筛选" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            <SelectItem value="all">全部环境</SelectItem>
            <SelectItem value="production">生产</SelectItem>
            <SelectItem value="staging">预发布</SelectItem>
            <SelectItem value="development">开发</SelectItem>
          </SelectContent>
        </Select>
        {(filterStatus !== 'all' || filterEnv !== 'all') && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-[10px] text-slate-400 hover:text-slate-200"
            onClick={() => { setFilterStatus('all'); setFilterEnv('all'); }}
          >
            重置筛选
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
              <p className="text-xs">没有匹配的功能开关</p>
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
            <span className="font-semibold text-violet-400">{data.abTests.filter((t) => t.status === 'running').length}</span> 运行中 ·{' '}
            <span className="font-semibold text-emerald-400">{data.abTests.filter((t) => t.status === 'completed').length}</span> 已完成 ·{' '}
            <span className="font-semibold text-slate-400">{data.abTests.filter((t) => t.status === 'draft').length}</span> 草稿
          </span>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-[10px] border-violet-500/30 text-violet-300 hover:bg-violet-500/10 hover:text-violet-200"
        >
          <FlaskConical className="size-3 mr-1" />
          创建新测试
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
          <h4 className="text-sm font-semibold text-slate-200">回滚历史</h4>
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
          <h4 className="text-sm font-semibold text-slate-200">快速回滚</h4>
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
                    <span className="text-xs text-slate-200 font-medium">{flag.name}</span>
                    <div className="text-[10px] text-slate-500">
                      当前: {flag.rolloutPercentage}% → 回滚至: 0%
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
                  回滚
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
          <h4 className="text-sm font-semibold text-slate-200">自动回滚触发条件</h4>
        </div>
        <div className="space-y-2">
          {[
            { condition: '错误率 > 1%', current: '0.08%', status: 'safe' as const },
            { condition: 'P95延迟 > 500ms', current: '165ms', status: 'safe' as const },
            { condition: '崩溃率 > 0.1%', current: '0%', status: 'safe' as const },
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
                <span className="text-[10px] text-slate-500">当前:</span>
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
            紧急全量回滚
          </Button>
        </DialogTrigger>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-red-400 flex items-center gap-2">
              <AlertOctagon className="size-5" />
              确认紧急全量回滚
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              此操作将回滚所有活跃功能开关至0%，确认执行？
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
              <p className="text-xs text-red-300 font-medium mb-2">将回滚以下功能开关:</p>
              <ul className="space-y-1">
                {data.featureFlags
                  .filter((f) => f.status === 'active' && f.rolloutPercentage > 0)
                  .map((f) => (
                    <li key={f.id} className="text-[11px] text-slate-300 flex items-center gap-2">
                      <ArrowRight className="size-3 text-red-400" />
                      {f.name} ({f.rolloutPercentage}% → 0%)
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
              取消
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
              确认回滚
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
            <span className="text-[10px] text-emerald-400">当前</span>
            <span className="text-xs font-semibold text-emerald-300 font-mono">{pipeline.currentVersion}</span>
          </div>
          <ArrowRight className="size-4 text-slate-600" />
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-500/10 border border-violet-500/20">
            <span className="text-[10px] text-violet-400">目标</span>
            <span className="text-xs font-semibold text-violet-300 font-mono">{pipeline.nextVersion}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-emerald-400">
          <Shield className="size-3" />
          <span>自动回滚: 已启用</span>
        </div>
      </div>

      {/* Pipeline Stages - Horizontal on desktop, vertical on mobile */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
        <div className="flex items-center gap-2 mb-4">
          <Rocket className="size-4 text-violet-400" />
          <h4 className="text-sm font-semibold text-slate-200">发布管道</h4>
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
                      {stage.name}
                    </p>
                    <p className="text-[9px] text-slate-600 mt-0.5 truncate">{stage.details}</p>
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
            <h4 className="text-sm font-semibold text-slate-200">Canary 部署</h4>
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
              推进灰度
            </Button>
          </div>
        </div>

        {/* Canary Metrics */}
        <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="size-4 text-violet-400" />
            <h4 className="text-sm font-semibold text-slate-200">Canary 指标</h4>
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
                  <span className="text-xs text-slate-300">{metric.name}</span>
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
                  <span className="text-[10px] text-slate-500">阈值: {metric.threshold}</span>
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
            功能开关与灰度发布
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
                  <span className="hidden sm:inline">{tab.label}</span>
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
