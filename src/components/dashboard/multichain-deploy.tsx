'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeftRight,
  Globe,
  RefreshCw,
  Link2,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Loader2,
  Radio,
  ArrowRight,
  Layers,
  Zap,
  Activity,
  Copy,
  CheckCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { cn } from '@/lib/utils';

// ── Types ──────────────────────────────────────────────
type ChainStatus = 'active' | 'pending' | 'planned';
type BridgeStatus = 'active' | 'pending';
type SwitchStatus = 'completed' | 'pending' | 'failed';
type SyncStatus = 'synced' | 'delayed' | 'error';
type PipelineStatus = 'passed' | 'in_progress' | 'pending';

interface SupportedChain {
  id: string;
  name: string;
  chainId: number;
  color: string;
  icon: string;
  status: ChainStatus;
  blockHeight: number;
  gasPrice: string;
  avgBlockTime: string;
  contractsDeployed: number;
  tvl: number;
  lastSync: string;
}

interface CrossChainBridge {
  id: string;
  name: string;
  sourceChain: string;
  targetChain: string;
  status: BridgeStatus;
  totalLocked: number;
  totalMinted: number;
  fee: string;
  avgTime: string;
  transactions24h: number;
}

interface ChainSwitchHistory {
  id: string;
  fromChain: string;
  toChain: string;
  action: string;
  amount: number;
  status: SwitchStatus;
  txHash: string;
  timestamp: string;
}

interface StateSyncEntry {
  id: string;
  type: string;
  sourceChain: string;
  targetChain: string;
  lastSync: string;
  status: SyncStatus;
  latency: string;
}

interface DeploymentPipelineStage {
  stage: string;
  status: PipelineStatus;
  detail: string;
}

interface TvlHistoryPoint {
  date: string;
  base: number;
  ethereum: number;
  arbitrum: number;
}

interface MultiChainData {
  supportedChains: SupportedChain[];
  crossChainBridges: CrossChainBridge[];
  chainSwitchHistory: ChainSwitchHistory[];
  stateSync: StateSyncEntry[];
  deploymentPipeline: DeploymentPipelineStage[];
  tvlHistory: TvlHistoryPoint[];
}

// ── Status Configs ─────────────────────────────────────
const CHAIN_STATUS_CONFIG: Record<ChainStatus, { label: string; badge: string; actionLabel: string }> = {
  active: {
    label: '活跃',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    actionLabel: '切换',
  },
  pending: {
    label: '准备中',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    actionLabel: '准备中',
  },
  planned: {
    label: '规划中',
    badge: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    actionLabel: '规划中',
  },
};

const BRIDGE_STATUS_CONFIG: Record<BridgeStatus, { label: string; badge: string }> = {
  active: {
    label: '活跃',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  },
  pending: {
    label: '待激活',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  },
};

const SWITCH_STATUS_CONFIG: Record<SwitchStatus, { label: string; badge: string; icon: React.ElementType }> = {
  completed: {
    label: '已完成',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    icon: CheckCircle2,
  },
  pending: {
    label: '进行中',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    icon: Clock,
  },
  failed: {
    label: '失败',
    badge: 'bg-red-500/20 text-red-300 border-red-500/30',
    icon: AlertTriangle,
  },
};

const SYNC_STATUS_CONFIG: Record<SyncStatus, { label: string; badge: string; icon: React.ElementType }> = {
  synced: {
    label: '已同步',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    icon: CheckCircle2,
  },
  delayed: {
    label: '延迟',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    icon: AlertTriangle,
  },
  error: {
    label: '错误',
    badge: 'bg-red-500/20 text-red-300 border-red-500/30',
    icon: AlertTriangle,
  },
};

const PIPELINE_STATUS_CONFIG: Record<PipelineStatus, { label: string; icon: React.ElementType; color: string; bg: string; badge: string }> = {
  passed: {
    label: '通过',
    icon: CheckCircle2,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/15',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  },
  in_progress: {
    label: '进行中',
    icon: Loader2,
    color: 'text-violet-400',
    bg: 'bg-violet-500/15',
    badge: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
  },
  pending: {
    label: '待执行',
    icon: Clock,
    color: 'text-slate-400',
    bg: 'bg-slate-500/15',
    badge: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  },
};

// ── Helpers ─────────────────────────────────────────────
function formatUsd(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value}`;
}

function formatNumber(value: number): string {
  return value.toLocaleString();
}

function getRelativeTime(timestamp: string): string {
  if (!timestamp) return '—';
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return '刚刚';
  if (diffMin < 60) return `${diffMin}分钟前`;
  if (diffHr < 24) return `${diffHr}小时前`;
  if (diffDay < 30) return `${diffDay}天前`;
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

function getChainName(chains: SupportedChain[], id: string): string {
  return chains.find(c => c.id === id)?.name ?? id;
}

function getChainColor(chains: SupportedChain[], id: string): string {
  return chains.find(c => c.id === id)?.color ?? '#94a3b8';
}

function getChainIcon(chains: SupportedChain[], id: string): string {
  return chains.find(c => c.id === id)?.icon ?? '⛓️';
}

// ── Copy Button ────────────────────────────────────────
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center justify-center size-5 rounded hover:bg-slate-700/50 transition-colors"
      title="复制"
    >
      {copied ? (
        <CheckCircle className="size-3 text-emerald-400" />
      ) : (
        <Copy className="size-3 text-slate-500" />
      )}
    </button>
  );
}

// ── Tab 1: Chain Management ────────────────────────────
function ChainManagementTab({ chains }: { chains: SupportedChain[] }) {
  const activeCount = chains.filter(c => c.status === 'active').length;
  const pendingCount = chains.filter(c => c.status === 'pending').length;
  const plannedCount = chains.filter(c => c.status === 'planned').length;

  return (
    <div className="space-y-5">
      {/* Status Summary Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <span className="size-2 rounded-full bg-emerald-400" />
          <span className="text-xs text-emerald-300 font-medium">{activeCount} 活跃</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <span className="size-2 rounded-full bg-amber-400" />
          <span className="text-xs text-amber-300 font-medium">{pendingCount} 准备中</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-500/10 border border-slate-500/20">
          <span className="size-2 rounded-full bg-slate-400" />
          <span className="text-xs text-slate-400 font-medium">{plannedCount} 规划中</span>
        </div>
      </div>

      {/* Chain Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {chains.map((chain, idx) => {
          const config = CHAIN_STATUS_CONFIG[chain.status];
          const isActive = chain.status === 'active';

          return (
            <motion.div
              key={chain.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08, duration: 0.3 }}
              className={cn(
                'rounded-xl border bg-slate-800/60 p-4 transition-colors hover:border-slate-600/50',
                isActive ? 'border-l-2' : 'border-slate-700',
              )}
              style={isActive ? { borderLeftColor: chain.color } : undefined}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">{chain.icon}</span>
                  <div>
                    <h5 className="text-sm font-semibold text-slate-100">{chain.name}</h5>
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 mt-0.5 bg-slate-700/30 text-slate-400 border-slate-600/30 font-mono">
                      Chain {chain.chainId}
                    </Badge>
                  </div>
                </div>
                <Badge variant="outline" className={cn('text-[10px]', config.badge)}>
                  {config.label}
                </Badge>
              </div>

              {/* Stats Row */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div>
                  <span className="text-[10px] text-slate-500 block">区块高度</span>
                  <span className="text-[11px] text-slate-300 font-mono tabular-nums">{formatNumber(chain.blockHeight)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Gas价格</span>
                  <span className="text-[11px] text-slate-300 font-mono">{chain.gasPrice} Gwei</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">出块时间</span>
                  <span className="text-[11px] text-slate-300">{chain.avgBlockTime}</span>
                </div>
              </div>

              {/* Contracts + TVL */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <Layers className="size-3 text-violet-400" />
                  <span className="text-[11px] text-slate-400">{chain.contractsDeployed} 合约</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Zap className="size-3 text-emerald-400" />
                  <span className="text-[11px] text-slate-300 font-medium">{formatUsd(chain.tvl)}</span>
                  <span className="text-[10px] text-slate-500">TVL</span>
                </div>
              </div>

              {/* Last Sync */}
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mb-3">
                <Clock className="size-3" />
                <span>最近同步: {getRelativeTime(chain.lastSync)}</span>
              </div>

              {/* Action Button */}
              <Button
                variant="outline"
                size="sm"
                disabled={chain.status !== 'active'}
                className={cn(
                  'w-full h-7 text-[10px]',
                  chain.status === 'active'
                    ? 'border-violet-600/30 text-violet-300 hover:bg-violet-500/10 hover:border-violet-500/50'
                    : 'border-slate-700 text-slate-500 cursor-not-allowed',
                )}
              >
                {chain.status === 'active' && <Radio className="mr-1.5 size-3" />}
                {config.actionLabel}
              </Button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ── Tab 2: Cross-chain Bridge ──────────────────────────
function CrossChainBridgeTab({ bridges, chains }: { bridges: CrossChainBridge[]; chains: SupportedChain[] }) {
  const activeBridges = bridges.filter(b => b.status === 'active').length;
  const pendingBridges = bridges.filter(b => b.status === 'pending').length;

  return (
    <div className="space-y-5">
      {/* Bridge Overview */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700">
          <Link2 className="size-3.5 text-violet-400" />
          <span className="text-xs text-slate-300 font-medium">{bridges.length} 桥接</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <span className="size-2 rounded-full bg-emerald-400" />
          <span className="text-xs text-emerald-300 font-medium">{activeBridges} 活跃</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <span className="size-2 rounded-full bg-amber-400" />
          <span className="text-xs text-amber-300 font-medium">{pendingBridges} 待激活</span>
        </div>
      </div>

      {/* Bridge Cards */}
      <div className="space-y-4">
        {bridges.map((bridge, idx) => {
          const bConfig = BRIDGE_STATUS_CONFIG[bridge.status];
          const sourceName = getChainName(chains, bridge.sourceChain);
          const targetName = getChainName(chains, bridge.targetChain);
          const sourceIcon = getChainIcon(chains, bridge.sourceChain);
          const targetIcon = getChainIcon(chains, bridge.targetChain);
          const sourceColor = getChainColor(chains, bridge.sourceChain);
          const targetColor = getChainColor(chains, bridge.targetChain);
          const mintRatio = bridge.totalLocked > 0 ? (bridge.totalMinted / bridge.totalLocked) * 100 : 0;

          return (
            <motion.div
              key={bridge.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1, duration: 0.3 }}
              className="rounded-xl border border-slate-700 bg-slate-800/60 p-5"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{sourceIcon}</span>
                  <div className="flex flex-col items-center">
                    <ArrowLeftRight className="size-4 text-slate-500" />
                  </div>
                  <span className="text-lg">{targetIcon}</span>
                  <div className="ml-2">
                    <h5 className="text-sm font-semibold text-slate-200">{bridge.name}</h5>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <span style={{ color: sourceColor }}>{sourceName}</span>
                      <ChevronRight className="size-3" />
                      <span style={{ color: targetColor }}>{targetName}</span>
                    </div>
                  </div>
                </div>
                <Badge variant="outline" className={cn('text-[10px]', bConfig.badge)}>
                  {bConfig.label}
                </Badge>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
                <div className="rounded-lg bg-slate-900/50 p-2.5">
                  <span className="text-[10px] text-slate-500 block">锁定总额</span>
                  <span className="text-xs text-slate-200 font-medium tabular-nums">{formatUsd(bridge.totalLocked)}</span>
                </div>
                <div className="rounded-lg bg-slate-900/50 p-2.5">
                  <span className="text-[10px] text-slate-500 block">铸造总额</span>
                  <span className="text-xs text-slate-200 font-medium tabular-nums">{formatUsd(bridge.totalMinted)}</span>
                </div>
                <div className="rounded-lg bg-slate-900/50 p-2.5">
                  <span className="text-[10px] text-slate-500 block">手续费</span>
                  <span className="text-xs text-slate-200 font-medium">{bridge.fee}</span>
                </div>
                <div className="rounded-lg bg-slate-900/50 p-2.5">
                  <span className="text-[10px] text-slate-500 block">平均时间</span>
                  <span className="text-xs text-slate-200 font-medium">{bridge.avgTime}</span>
                </div>
                <div className="rounded-lg bg-slate-900/50 p-2.5">
                  <span className="text-[10px] text-slate-500 block">24h交易</span>
                  <span className="text-xs text-slate-200 font-medium tabular-nums">{bridge.transactions24h}</span>
                </div>
              </div>

              {/* Lock vs Mint Progress */}
              {bridge.totalLocked > 0 && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] text-slate-500">锁定 vs 铸造比例</span>
                    <span className="text-[10px] text-slate-400 tabular-nums">{mintRatio.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-700 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-violet-500 to-emerald-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${mintRatio}%` }}
                      transition={{ delay: idx * 0.1 + 0.3, duration: 0.6 }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[9px] text-violet-400">锁定 {formatUsd(bridge.totalLocked)}</span>
                    <span className="text-[9px] text-emerald-400">铸造 {formatUsd(bridge.totalMinted)}</span>
                  </div>
                </div>
              )}

              {/* Action */}
              <Button
                variant="outline"
                size="sm"
                className="w-full h-8 text-[11px] border-violet-600/30 text-violet-300 hover:bg-violet-500/10 hover:border-violet-500/50"
                disabled={bridge.status !== 'active'}
              >
                <ArrowLeftRight className="mr-1.5 size-3" />
                发起跨链转账
              </Button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ── Tab 3: State Synchronization ───────────────────────
function StateSyncTab({
  stateSync,
  deploymentPipeline,
  tvlHistory,
  chains,
}: {
  stateSync: StateSyncEntry[];
  deploymentPipeline: DeploymentPipelineStage[];
  tvlHistory: TvlHistoryPoint[];
  chains: SupportedChain[];
}) {
  const allSynced = stateSync.every(s => s.status === 'synced');
  const hasDelayed = stateSync.some(s => s.status === 'delayed');

  return (
    <div className="space-y-5">
      {/* Sync Status Banner */}
      <Alert className={cn(
        allSynced ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-amber-500/30 bg-amber-500/5',
      )}>
        {allSynced ? (
          <CheckCircle2 className="size-4 text-emerald-400" />
        ) : (
          <AlertTriangle className="size-4 text-amber-400" />
        )}
        <AlertTitle className={cn('text-xs', allSynced ? 'text-emerald-300' : 'text-amber-300')}>
          状态同步: {allSynced ? '全部已同步' : '存在延迟项'}
        </AlertTitle>
        <AlertDescription className={cn('text-[11px]', allSynced ? 'text-emerald-300/70' : 'text-amber-300/70')}>
          {stateSync.filter(s => s.status === 'synced').length}/{stateSync.length} 项已同步
          {hasDelayed && ` · ${stateSync.filter(s => s.status === 'delayed').length} 项延迟`}
        </AlertDescription>
      </Alert>

      {/* State Sync Table */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/60 overflow-hidden">
        <div className="p-4 border-b border-slate-700/50">
          <div className="flex items-center gap-2">
            <Activity className="size-4 text-violet-400" />
            <h4 className="text-xs font-semibold text-slate-200">状态同步监控</h4>
          </div>
        </div>
        <div className="divide-y divide-slate-700/50">
          {stateSync.map((entry, idx) => {
            const sConfig = SYNC_STATUS_CONFIG[entry.status];
            const SIcon = sConfig.icon;
            const latencyVal = parseFloat(entry.latency);
            const latencyColor = latencyVal < 5 ? 'text-emerald-400' : latencyVal < 30 ? 'text-amber-400' : 'text-red-400';

            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.08, duration: 0.25 }}
                className={cn(
                  'flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 hover:bg-slate-700/20 transition-colors',
                  entry.status === 'delayed' && 'bg-amber-500/5',
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'flex size-7 shrink-0 items-center justify-center rounded-lg',
                    entry.status === 'synced' ? 'bg-emerald-500/15' : 'bg-amber-500/15',
                  )}>
                    <SIcon className={cn('size-3.5', entry.status === 'synced' ? 'text-emerald-400' : 'text-amber-400')} />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-200">{entry.type}</p>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                      <span>{getChainName(chains, entry.sourceChain)}</span>
                      <ArrowRight className="size-2.5" />
                      <span>{getChainName(chains, entry.targetChain)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 sm:gap-6">
                  <div className="text-center">
                    <span className="text-[9px] text-slate-500 block">最近同步</span>
                    <span className="text-[10px] text-slate-400">{getRelativeTime(entry.lastSync)}</span>
                  </div>
                  <div className="text-center">
                    <span className="text-[9px] text-slate-500 block">延迟</span>
                    <span className={cn('text-[11px] font-mono font-medium', latencyColor)}>{entry.latency}</span>
                  </div>
                  <Badge variant="outline" className={cn('text-[10px] shrink-0', sConfig.badge)}>
                    {sConfig.label}
                  </Badge>
                  {entry.status === 'delayed' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 text-[9px] shrink-0 border-amber-600/30 text-amber-300 hover:bg-amber-500/10"
                    >
                      <RefreshCw className="mr-1 size-2.5" />
                      重新同步
                    </Button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Deployment Pipeline Stepper */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
        <div className="flex items-center gap-2 mb-4">
          <Layers className="size-4 text-violet-400" />
          <h4 className="text-xs font-semibold text-slate-200">部署流水线</h4>
        </div>
        <div className="space-y-0">
          {deploymentPipeline.map((stage, idx) => {
            const pConfig = PIPELINE_STATUS_CONFIG[stage.status];
            const PIcon = pConfig.icon;
            const isLast = idx === deploymentPipeline.length - 1;

            return (
              <div key={stage.stage} className="flex gap-3">
                {/* Stepper */}
                <div className="flex flex-col items-center">
                  <div className={cn(
                    'flex size-7 shrink-0 items-center justify-center rounded-full border-2',
                    stage.status === 'passed' ? 'border-emerald-500/50 bg-emerald-500/15' :
                    stage.status === 'in_progress' ? 'border-violet-500/50 bg-violet-500/15' :
                    'border-slate-600 bg-slate-700/50',
                  )}>
                    <PIcon className={cn(
                      'size-3.5',
                      stage.status === 'in_progress' && 'animate-spin',
                      pConfig.color,
                    )} />
                  </div>
                  {!isLast && (
                    <div className={cn(
                      'w-0.5 h-8',
                      stage.status === 'passed' ? 'bg-emerald-500/30' : 'bg-slate-700',
                    )} />
                  )}
                </div>

                {/* Content */}
                <div className={cn('pb-4', isLast && 'pb-0')}>
                  <p className={cn('text-xs font-medium', pConfig.color)}>
                    {stage.stage}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{stage.detail}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* TVL History Chart */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="size-4 text-emerald-400" />
          <h4 className="text-xs font-semibold text-slate-200">TVL 历史趋势</h4>
          <div className="ml-auto flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full" style={{ backgroundColor: '#0052FF' }} />
              <span className="text-[10px] text-slate-400">Base</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full" style={{ backgroundColor: '#627EEA' }} />
              <span className="text-[10px] text-slate-400">Ethereum</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full" style={{ backgroundColor: '#28A0F0' }} />
              <span className="text-[10px] text-slate-400">Arbitrum</span>
            </div>
          </div>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={tvlHistory} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
              <defs>
                <linearGradient id="tvlBase" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0052FF" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#0052FF" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="tvlEth" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#627EEA" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#627EEA" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="tvlArb" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#28A0F0" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#28A0F0" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                axisLine={{ stroke: '#334155' }}
                tickLine={{ stroke: '#334155' }}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                axisLine={{ stroke: '#334155' }}
                tickLine={{ stroke: '#334155' }}
                tickFormatter={(v: number) => `$${(v / 1000000).toFixed(1)}M`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #475569',
                  borderRadius: '8px',
                  fontSize: '11px',
                  color: '#e2e8f0',
                }}
                formatter={(value: number, name: string) => {
                  const nameMap: Record<string, string> = { base: 'Base', ethereum: 'Ethereum', arbitrum: 'Arbitrum' };
                  return [formatUsd(value), nameMap[name] ?? name];
                }}
              />
              <Area
                type="monotone"
                dataKey="ethereum"
                stroke="#627EEA"
                strokeWidth={2}
                fill="url(#tvlEth)"
              />
              <Area
                type="monotone"
                dataKey="base"
                stroke="#0052FF"
                strokeWidth={2}
                fill="url(#tvlBase)"
              />
              <Area
                type="monotone"
                dataKey="arbitrum"
                stroke="#28A0F0"
                strokeWidth={2}
                fill="url(#tvlArb)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ── Tab 4: Chain Switch ────────────────────────────────
function ChainSwitchTab({
  chains,
  switchHistory,
}: {
  chains: SupportedChain[];
  switchHistory: ChainSwitchHistory[];
}) {
  const activeChains = chains.filter(c => c.status === 'active');
  const [selectedChain, setSelectedChain] = useState('base');
  const currentChain = chains.find(c => c.id === selectedChain);

  return (
    <div className="space-y-5">
      {/* Current Chain Indicator */}
      <div className="rounded-xl border border-slate-700 bg-gradient-to-br from-slate-800/80 to-slate-900/60 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{currentChain?.icon ?? '⛓️'}</span>
            <div>
              <span className="text-[10px] text-slate-500 block">当前链</span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-slate-100">{currentChain?.name ?? 'Unknown'}</span>
                <Badge
                  variant="outline"
                  className="text-[10px] font-mono"
                  style={{
                    backgroundColor: `${currentChain?.color}20`,
                    color: currentChain?.color,
                    borderColor: `${currentChain?.color}50`,
                  }}
                >
                  {currentChain?.chainId}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] text-emerald-400">已连接</span>
          </div>
        </div>
      </div>

      {/* Chain Switcher */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
        <div className="flex items-center gap-2 mb-4">
          <Globe className="size-4 text-violet-400" />
          <h4 className="text-xs font-semibold text-slate-200">切换链</h4>
        </div>
        <RadioGroup
          value={selectedChain}
          onValueChange={setSelectedChain}
          className="grid gap-2"
        >
          {activeChains.map((chain) => (
            <div key={chain.id}>
              <RadioGroupItem value={chain.id} id={`chain-${chain.id}`} className="peer sr-only" />
              <Label
                htmlFor={`chain-${chain.id}`}
                className={cn(
                  'flex items-center justify-between rounded-lg border p-3 cursor-pointer transition-all',
                  selectedChain === chain.id
                    ? 'border-violet-500/50 bg-violet-500/10'
                    : 'border-slate-700 bg-slate-900/40 hover:bg-slate-700/30',
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{chain.icon}</span>
                  <div>
                    <p className="text-xs font-medium text-slate-200">{chain.name}</p>
                    <p className="text-[10px] text-slate-500 font-mono">Chain {chain.chainId}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400">{formatUsd(chain.tvl)} TVL</span>
                  <div className={cn(
                    'flex size-5 items-center justify-center rounded-full border-2',
                    selectedChain === chain.id
                      ? 'border-violet-400 bg-violet-400'
                      : 'border-slate-600',
                  )}>
                    {selectedChain === chain.id && (
                      <div className="size-2 rounded-full bg-white" />
                    )}
                  </div>
                </div>
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* Recent Switch History */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="size-4 text-slate-400" />
          <h4 className="text-xs font-semibold text-slate-200">最近链切换记录</h4>
        </div>
        <ScrollArea className="max-h-96">
          <div className="space-y-3">
            {switchHistory.map((entry, idx) => {
              const sConfig = SWITCH_STATUS_CONFIG[entry.status];
              const SIcon = sConfig.icon;
              const fromName = getChainName(chains, entry.fromChain);
              const toName = getChainName(chains, entry.toChain);
              const fromIcon = getChainIcon(chains, entry.fromChain);
              const toIcon = getChainIcon(chains, entry.toChain);

              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.08, duration: 0.25 }}
                  className={cn(
                    'rounded-lg border p-3 transition-colors',
                    entry.status === 'completed' ? 'border-slate-700/50 bg-slate-900/40' :
                    entry.status === 'pending' ? 'border-amber-500/20 bg-amber-500/5' :
                    'border-red-500/20 bg-red-500/5',
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{fromIcon}</span>
                      <ArrowRight className="size-3 text-slate-500" />
                      <span className="text-sm">{toIcon}</span>
                      <span className="text-[11px] text-slate-300 ml-1">
                        {fromName} → {toName}
                      </span>
                    </div>
                    <Badge variant="outline" className={cn('text-[9px]', sConfig.badge)}>
                      <SIcon className="mr-1 size-2.5" />
                      {sConfig.label}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-[9px] bg-violet-500/10 text-violet-300 border-violet-500/30">
                        {entry.action}
                      </Badge>
                      <span className="text-xs text-slate-300 font-medium tabular-nums">
                        {entry.amount.toLocaleString()} AFC
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-slate-500">{entry.txHash}</span>
                      <CopyButton text={entry.txHash} />
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 mt-2 text-[10px] text-slate-500">
                    <Clock className="size-2.5" />
                    <span>{getRelativeTime(entry.timestamp)}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────
export default function MultiChainDeploy() {
  const [data, setData] = useState<MultiChainData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/multichain')
      .then(res => res.json())
      .then((json: MultiChainData) => {
        setData(json);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return (
      <Card className="border-slate-700 bg-slate-800/80">
        <CardContent className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="size-6 text-violet-400 animate-spin" />
            <span className="text-sm text-slate-400">加载多链数据...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="border-slate-700 bg-slate-800/80">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-lg bg-violet-500/15">
                <Globe className="size-4 text-violet-400" />
              </div>
              <div>
                <CardTitle className="text-base text-slate-100">多链部署中心</CardTitle>
                <p className="text-[11px] text-slate-500 mt-0.5">Multi-chain Deployment & Cross-chain Bridge</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30 text-[10px]">
                <span className="inline-block size-1.5 rounded-full mr-1.5 bg-emerald-400 animate-pulse" />
                {data.supportedChains.filter(c => c.status === 'active').length} 链在线
              </Badge>
            </div>
          </div>
        </CardHeader>

        <Separator className="bg-slate-700/50" />

        <CardContent className="pt-4">
          <Tabs defaultValue="chains" className="w-full">
            <TabsList className="bg-slate-900/60 border border-slate-700 h-auto p-1">
              <TabsTrigger
                value="chains"
                className="text-[11px] data-[state=active]:bg-violet-500/15 data-[state=active]:text-violet-300 px-3 py-1.5"
              >
                <Globe className="size-3 mr-1.5" />
                链管理
              </TabsTrigger>
              <TabsTrigger
                value="bridges"
                className="text-[11px] data-[state=active]:bg-violet-500/15 data-[state=active]:text-violet-300 px-3 py-1.5"
              >
                <Link2 className="size-3 mr-1.5" />
                跨链桥
              </TabsTrigger>
              <TabsTrigger
                value="sync"
                className="text-[11px] data-[state=active]:bg-violet-500/15 data-[state=active]:text-violet-300 px-3 py-1.5"
              >
                <Activity className="size-3 mr-1.5" />
                状态同步
              </TabsTrigger>
              <TabsTrigger
                value="switch"
                className="text-[11px] data-[state=active]:bg-violet-500/15 data-[state=active]:text-violet-300 px-3 py-1.5"
              >
                <ArrowLeftRight className="size-3 mr-1.5" />
                链切换
              </TabsTrigger>
            </TabsList>

            <AnimatePresence mode="wait">
              <TabsContent value="chains" className="mt-4">
                <motion.div
                  key="chains"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChainManagementTab chains={data.supportedChains} />
                </motion.div>
              </TabsContent>

              <TabsContent value="bridges" className="mt-4">
                <motion.div
                  key="bridges"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  <CrossChainBridgeTab bridges={data.crossChainBridges} chains={data.supportedChains} />
                </motion.div>
              </TabsContent>

              <TabsContent value="sync" className="mt-4">
                <motion.div
                  key="sync"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  <StateSyncTab
                    stateSync={data.stateSync}
                    deploymentPipeline={data.deploymentPipeline}
                    tvlHistory={data.tvlHistory}
                    chains={data.supportedChains}
                  />
                </motion.div>
              </TabsContent>

              <TabsContent value="switch" className="mt-4">
                <motion.div
                  key="switch"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChainSwitchTab
                    chains={data.supportedChains}
                    switchHistory={data.chainSwitchHistory}
                  />
                </motion.div>
              </TabsContent>
            </AnimatePresence>
          </Tabs>
        </CardContent>
      </Card>
    </motion.div>
  );
}
