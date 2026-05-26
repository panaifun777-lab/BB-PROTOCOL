'use client';

import { useState } from 'react';
import { useClientTime } from '@/hooks/use-client-time';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  CheckCircle2,
  AlertTriangle,
  Copy,
  ExternalLink,
  Lock,
  Users,
  GitBranch,
  Clock,
  Globe,
  Activity,
  FileCheck,
  Zap,
  ArrowRight,
  RefreshCw,
  Download,
  CheckCircle,
  XCircle,
  Timer,
  Layers,
  ChevronRight,
  Hash,
  Code2,
  Settings2,
  Fingerprint,
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

// ── Types ──────────────────────────────────────────────
type DeployStatus = 'live' | 'deploying' | 'paused' | 'verifying';
type ContractVerificationStatus = 'verified' | 'pending' | 'failed';
type SignerConfirmationStatus = 'confirmed' | 'pending';
type ConsistencyCheckStatus = 'match' | 'mismatch';
type PipelineStageStatus = 'passed' | 'in_progress' | 'pending' | 'failed';

interface DeploymentStatus {
  network: string;
  chainId: number;
  deployStatus: DeployStatus;
  deployVersion: string;
  lastDeployAt: string;
  nextScheduledDeploy: string | null;
  uptime: string;
  totalTransactions: number;
}

interface ContractDeployment {
  name: string;
  address: string;
  version: string;
  status: ContractVerificationStatus;
  deployTx: string;
  verifiedAt: string;
  bytecodeSize: string;
  optimizations: string;
}

interface MultiSigSigner {
  name: string;
  address: string;
  status: SignerConfirmationStatus;
}

interface PendingOperation {
  description: string;
  confirmations: string;
  threshold: number;
  confirmed: number;
}

interface MultiSigWallet {
  address: string;
  threshold: string;
  thresholdNum: number;
  totalSigners: number;
  signers: MultiSigSigner[];
  pendingOperations: PendingOperation[];
  timeLock: string;
}

interface StateCheck {
  name: string;
  status: ConsistencyCheckStatus;
  sepoliaValue: string;
  mainnetValue: string;
  note?: string;
}

interface StateConsistency {
  sepoliaBlockNumber: number;
  mainnetBlockNumber: number;
  consistencyCheck: 'passed' | 'failed';
  lastCheckAt: string;
  mismatches: number;
  checks: StateCheck[];
  autoCheckSchedule: string;
}

interface PipelineStage {
  name: string;
  status: PipelineStageStatus;
  detail?: string;
}

interface DeployPipeline {
  stages: PipelineStage[];
}

interface OperationHistoryEntry {
  description: string;
  status: 'completed';
  executedAt: string;
  txHash: string;
}

interface DeploymentData {
  deploymentStatus: DeploymentStatus;
  contracts: ContractDeployment[];
  multiSigWallet: MultiSigWallet;
  stateConsistency: StateConsistency;
  deployPipeline: DeployPipeline;
  operationHistory: OperationHistoryEntry[];
}

// ── Deterministic Mock Data (no Math.random) ─────────
const MOCK_DATA: DeploymentData = {
  deploymentStatus: {
    network: 'Base Mainnet',
    chainId: 8453,
    deployStatus: 'live',
    deployVersion: 'v2.1.0',
    lastDeployAt: '2026-03-01T08:00:00Z',
    nextScheduledDeploy: null,
    uptime: '99.97%',
    totalTransactions: 1284503,
  },

  contracts: [
    {
      name: 'AvatarCore',
      address: '0x7a3F8c91D2e4B5678aB3F1cD9e2A4b6C8E0f9B1e9B1',
      version: 'v2.1.0',
      status: 'verified',
      deployTx: '0xabc1230000000000000000000000000000000000000000000000000000000001',
      verifiedAt: '2026-03-01T08:15:00Z',
      bytecodeSize: '8.2KB',
      optimizations: 'optimizer_runs: 50000',
    },
    {
      name: 'DynamicSplitter',
      address: '0x4cE2a7F3b1D5c8E9A2B6d4F7e0C3a8D1b5E9f2A3a3D7',
      version: 'v2.1.0',
      status: 'verified',
      deployTx: '0xabc1230000000000000000000000000000000000000000000000000000000002',
      verifiedAt: '2026-03-01T08:18:00Z',
      bytecodeSize: '6.8KB',
      optimizations: 'optimizer_runs: 50000',
    },
    {
      name: 'CircuitGuard',
      address: '0x9bF1c4E8d2A7b5F3e1C6a9D4f8B2e5A7c3D6f1B0c4E8',
      version: 'v2.1.0',
      status: 'verified',
      deployTx: '0xabc1230000000000000000000000000000000000000000000000000000000003',
      verifiedAt: '2026-03-01T08:22:00Z',
      bytecodeSize: '5.4KB',
      optimizations: 'optimizer_runs: 50000',
    },
    {
      name: 'SkillVault',
      address: '0x2dA8f1B3e4C7a9D5b8F2c6E1d4A7b3F9e5C8d2A0f1B3',
      version: 'v2.0.0',
      status: 'verified',
      deployTx: '0xabc1230000000000000000000000000000000000000000000000000000000004',
      verifiedAt: '2026-02-15T10:00:00Z',
      bytecodeSize: '4.9KB',
      optimizations: 'optimizer_runs: 20000',
    },
    {
      name: 'IFDRouter',
      address: '0x8eC5d2A6b3F7e1C9a4D8f2B6e5A9c3D7f1B4a8E0d2A6',
      version: 'v2.0.0',
      status: 'verified',
      deployTx: '0xabc1230000000000000000000000000000000000000000000000000000000005',
      verifiedAt: '2026-02-15T10:05:00Z',
      bytecodeSize: '7.1KB',
      optimizations: 'optimizer_runs: 20000',
    },
    {
      name: 'TokenVault',
      address: '0x5fB9b7C4a2E8d1F6c3B9e5A7d4C8f2B6a1E3d5F9b7C4',
      version: 'v1.8.0',
      status: 'pending',
      deployTx: '0xabc1230000000000000000000000000000000000000000000000000000000006',
      verifiedAt: '',
      bytecodeSize: '6.3KB',
      optimizations: 'optimizer_runs: 20000',
    },
  ],

  multiSigWallet: {
    address: '0x1A2B3c4D5e6F7a8B9c0D1e2F3a4B5c6D7e8F9cD0',
    threshold: '3/5',
    thresholdNum: 3,
    totalSigners: 5,
    signers: [
      { name: '安全委员会', address: '0xAa1b2C3d4E5f6A7b8C9d0E1f2A3b4C5d6E7fcC2d', status: 'confirmed' },
      { name: '架构师', address: '0xBb2c3D4e5F6a7B8c9D0e1F2a3B4c5D6e7F8adD3e', status: 'confirmed' },
      { name: '运营方', address: '0xCc3d4E5f6A7b8C9d0E1f2A3b4C5d6E7f8A9beE4f', status: 'pending' },
      { name: '投资人代表', address: '0xDd4e5F6a7B8c9D0e1F2a3B4c5D6e7F8a9B0cfF5g', status: 'pending' },
      { name: '社区代表', address: '0xEe5f6A7b8C9d0E1f2A3b4C5d6E7f8A9b0C1dgG6h', status: 'confirmed' },
    ],
    pendingOperations: [
      { description: '升级 TokenVault 至 v2.1.0', confirmations: '2/3', threshold: 3, confirmed: 2 },
      { description: '调整 LP 手续费率 0.3% → 0.25%', confirmations: '1/3', threshold: 3, confirmed: 1 },
    ],
    timeLock: '72h 冷静期',
  },

  stateConsistency: {
    sepoliaBlockNumber: 8923456,
    mainnetBlockNumber: 28451023,
    consistencyCheck: 'passed',
    lastCheckAt: '2026-03-04T14:30:00Z',
    mismatches: 0,
    checks: [
      { name: 'AvatarCore state root', status: 'match', sepoliaValue: '0xabc...123', mainnetValue: '0xabc...123' },
      { name: 'DynamicSplitter config', status: 'match', sepoliaValue: '70/20/10', mainnetValue: '70/20/10' },
      { name: 'CircuitGuard thresholds', status: 'match', sepoliaValue: '70/50', mainnetValue: '70/50' },
      { name: 'TokenVault supply', status: 'mismatch', sepoliaValue: '1000000', mainnetValue: '998500', note: '主网已执行燃烧' },
    ],
    autoCheckSchedule: '每6小时',
  },

  deployPipeline: {
    stages: [
      { name: '编译检查', status: 'passed', detail: '0 errors, 0 warnings' },
      { name: '测试覆盖', status: 'passed', detail: '97.2%' },
      { name: '静态分析', status: 'passed', detail: '0 high/critical' },
      { name: '形式化验证', status: 'passed', detail: '4/4 invariants' },
      { name: '多签审批', status: 'in_progress', detail: '2/3' },
      { name: '主网部署', status: 'pending' },
    ],
  },

  operationHistory: [
    { description: '升级 CircuitGuard 至 v2.1.0', status: 'completed', executedAt: '2026-02-28T12:00:00Z', txHash: '0xop001...a1b2' },
    { description: '调整共振分阈值 60→70', status: 'completed', executedAt: '2026-02-20T09:30:00Z', txHash: '0xop002...c3d4' },
    { description: '新增 IFDRouter 委托路由', status: 'completed', executedAt: '2026-02-10T16:45:00Z', txHash: '0xop003...e5f6' },
  ],
};

// ── Tab Config ─────────────────────────────────────────
type TabId = 'overview' | 'verification' | 'multisig' | 'consistency';

interface TabConfig {
  id: TabId;
  label: string;
  icon: React.ElementType;
}

const TABS: TabConfig[] = [
  { id: 'overview', label: '部署总览', icon: Globe },
  { id: 'verification', label: '合约验证', icon: FileCheck },
  { id: 'multisig', label: '多签钱包', icon: Lock },
  { id: 'consistency', label: '状态一致性', icon: GitBranch },
];

// ── Status Configs ─────────────────────────────────────
const DEPLOY_STATUS_CONFIG: Record<DeployStatus, { label: string; color: string; badge: string }> = {
  live: { label: '运行中', color: 'text-emerald-400', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  deploying: { label: '部署中', color: 'text-violet-400', badge: 'bg-violet-500/20 text-violet-300 border-violet-500/30' },
  paused: { label: '已暂停', color: 'text-amber-400', badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  verifying: { label: '验证中', color: 'text-sky-400', badge: 'bg-sky-500/20 text-sky-300 border-sky-500/30' },
};

const CONTRACT_STATUS_CONFIG: Record<ContractVerificationStatus, { label: string; icon: React.ElementType; badge: string; dotColor: string }> = {
  verified: { label: '已验证', icon: CheckCircle2, badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', dotColor: 'bg-emerald-400' },
  pending: { label: '待验证', icon: AlertTriangle, badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30', dotColor: 'bg-amber-400' },
  failed: { label: '验证失败', icon: XCircle, badge: 'bg-red-500/20 text-red-300 border-red-500/30', dotColor: 'bg-red-400' },
};

const PIPELINE_STATUS_CONFIG: Record<PipelineStageStatus, { label: string; icon: React.ElementType; color: string; bg: string; badge: string }> = {
  passed: { label: '通过', icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/15', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  in_progress: { label: '进行中', icon: Timer, color: 'text-violet-400', bg: 'bg-violet-500/15', badge: 'bg-violet-500/20 text-violet-300 border-violet-500/30' },
  pending: { label: '待执行', icon: Clock, color: 'text-slate-400', bg: 'bg-slate-500/15', badge: 'bg-slate-500/20 text-slate-300 border-slate-500/30' },
  failed: { label: '失败', icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/15', badge: 'bg-red-500/20 text-red-300 border-red-500/30' },
};

// ── Helper: truncate address ───────────────────────────
function truncateAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// ── Helper: copy to clipboard ─────────────────────────
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
        <CheckCircle2 className="size-3 text-emerald-400" />
      ) : (
        <Copy className="size-3 text-slate-500" />
      )}
    </button>
  );
}

// ── Helper: format date ────────────────────────────────
function formatDate(timestamp: string): string {
  if (!timestamp) return '—';
  return format(parseISO(timestamp), 'yyyy/MM/dd HH:mm');
}

// ── Helper: relative time ──────────────────────────────
function getRelativeTime(timestamp: string, now?: Date | null): string {
  if (!timestamp) return '—';
  const currentDate = now ?? new Date('2026-03-04');
  const date = new Date(timestamp);
  const diffMs = currentDate.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return '刚刚';
  if (diffMin < 60) return `${diffMin}分钟前`;
  if (diffHr < 24) return `${diffHr}小时前`;
  if (diffDay < 30) return `${diffDay}天前`;
  return format(parseISO(timestamp), 'MMM d');
}

// ── Animated Counter ───────────────────────────────────
function AnimatedCounter({ value }: { value: number }) {
  const formatted = value.toLocaleString();
  return (
    <motion.span
      className="text-2xl font-bold text-slate-100 tabular-nums"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {formatted}
    </motion.span>
  );
}

// ── Tab 1: Overview ────────────────────────────────────
function OverviewTab({ data }: { data: DeploymentData }) {
  const now = useClientTime();
  const ds = data.deploymentStatus;
  const statusConfig = DEPLOY_STATUS_CONFIG[ds.deployStatus];

  return (
    <div className="space-y-5">
      {/* Network Status + Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Network Status Card */}
        <div className="rounded-xl border border-slate-700 bg-gradient-to-br from-slate-800/80 to-slate-900/60 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Globe className="size-5 text-violet-400" />
              <h4 className="text-sm font-semibold text-slate-200">网络状态</h4>
            </div>
            <Badge variant="outline" className={cn('text-[10px]', statusConfig.badge)}>
              <span className={cn('inline-block size-1.5 rounded-full mr-1.5 animate-pulse', statusConfig.dotColor || 'bg-emerald-400')} />
              {statusConfig.label}
            </Badge>
          </div>
          <div className="space-y-3">
            <div>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider">Network</span>
              <p className="text-lg font-semibold text-slate-100">{ds.network}</p>
            </div>
            <div className="flex items-center gap-4">
              <div>
                <span className="text-[10px] text-slate-500">Chain ID</span>
                <p className="text-sm font-mono text-slate-300">{ds.chainId}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-500">版本</span>
                <Badge variant="outline" className="bg-violet-500/15 text-violet-300 border-violet-500/30 text-[10px]">
                  {ds.deployVersion}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <Clock className="size-3" />
              <span suppressHydrationWarning>上次部署: {getRelativeTime(ds.lastDeployAt, now)}</span>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="space-y-3">
          {/* Uptime */}
          <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="size-4 text-emerald-400" />
                <span className="text-xs text-slate-400">运行时间</span>
              </div>
              <span className="text-2xl font-bold text-emerald-400 tabular-nums">{ds.uptime}</span>
            </div>
          </div>

          {/* Total Transactions */}
          <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="size-4 text-violet-400" />
                <span className="text-xs text-slate-400">总交易数</span>
              </div>
              <AnimatedCounter value={ds.totalTransactions} />
            </div>
          </div>

          {/* Deploy Pipeline Mini */}
          <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-3">
            <div className="flex items-center gap-2 mb-2">
              <Layers className="size-3.5 text-violet-400" />
              <span className="text-[10px] text-slate-400 font-medium">部署流水线</span>
            </div>
            <div className="flex items-center gap-1">
              {data.deployPipeline.stages.map((stage, idx) => {
                const config = PIPELINE_STATUS_CONFIG[stage.status];
                const StageIcon = config.icon;
                return (
                  <div key={stage.name} className="flex items-center gap-1">
                    <div className={cn('flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px]', config.bg)}>
                      <StageIcon className={cn('size-2.5', config.color)} />
                      <span className={config.color}>{stage.name}</span>
                    </div>
                    {idx < data.deployPipeline.stages.length - 1 && (
                      <ArrowRight className="size-2.5 text-slate-600 shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Contract Cards Grid */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Code2 className="size-4 text-violet-400" />
            <h4 className="text-xs font-semibold text-slate-200">已部署合约</h4>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500">
              {data.contracts.filter(c => c.status === 'verified').length}/{data.contracts.length} 已验证
            </span>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {data.contracts.map((contract, idx) => {
            const cStatus = CONTRACT_STATUS_CONFIG[contract.status];
            const CIcon = cStatus.icon;
            return (
              <motion.div
                key={contract.name}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1, duration: 0.3 }}
                className="rounded-lg border border-slate-700/50 bg-slate-900/40 p-3 hover:border-slate-600/50 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-200">{contract.name}</span>
                  <Badge variant="outline" className={cn('text-[9px] px-1.5 py-0', cStatus.badge)}>
                    <CIcon className="mr-0.5 size-2.5" />
                    {cStatus.label}
                  </Badge>
                </div>
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="font-mono text-[11px] text-slate-400 truncate">{truncateAddress(contract.address)}</span>
                  <CopyButton text={contract.address} />
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-500">
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-slate-700/30 text-slate-400 border-slate-600/30">
                    {contract.version}
                  </Badge>
                  <span>{contract.bytecodeSize}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-[11px] border-slate-600 text-slate-300 hover:text-violet-300 hover:border-violet-500/50 hover:bg-violet-500/10"
        >
          <RefreshCw className="mr-1.5 size-3" />
          重新验证全部
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-[11px] border-slate-600 text-slate-300 hover:text-emerald-300 hover:border-emerald-500/50 hover:bg-emerald-500/10"
        >
          <Download className="mr-1.5 size-3" />
          导出部署报告
        </Button>
      </div>
    </div>
  );
}

// ── Tab 2: Contract Verification ───────────────────────
function VerificationTab({ data }: { data: DeploymentData }) {
  const [verifying, setVerifying] = useState<string | null>(null);

  const handleVerify = (name: string) => {
    setVerifying(name);
    setTimeout(() => setVerifying(null), 2000);
  };

  // Deterministic source hashes (no Math.random)
  const SOURCE_HASHES: Record<string, string> = {
    AvatarCore: '0xkeccak256...a1b2c3',
    DynamicSplitter: '0xkeccak256...d4e5f6',
    CircuitGuard: '0xkeccak256...g7h8i9',
    SkillVault: '0xkeccak256...j0k1l2',
    IFDRouter: '0xkeccak256...m3n4o5',
    TokenVault: '0xkeccak256...p6q7r8',
  };

  const ONCHAIN_HASHES: Record<string, string> = {
    AvatarCore: '0xkeccak256...a1b2c3',
    DynamicSplitter: '0xkeccak256...d4e5f6',
    CircuitGuard: '0xkeccak256...g7h8i9',
    SkillVault: '0xkeccak256...j0k1l2',
    IFDRouter: '0xkeccak256...m3n4o5',
    TokenVault: '0xkeccak256...p6q7r8',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileCheck className="size-4 text-violet-400" />
          <h4 className="text-sm font-semibold text-slate-200">合约验证状态</h4>
        </div>
        <span className="text-[10px] text-slate-500">
          {data.contracts.filter(c => c.status === 'verified').length}/{data.contracts.length} 已验证
        </span>
      </div>

      {/* Contract List */}
      <div className="space-y-3">
        {data.contracts.map((contract, idx) => {
          const cStatus = CONTRACT_STATUS_CONFIG[contract.status];
          const CIcon = cStatus.icon;
          const isVerifying = verifying === contract.name;
          const hashMatch = SOURCE_HASHES[contract.name] === ONCHAIN_HASHES[contract.name];

          return (
            <motion.div
              key={contract.name}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1, duration: 0.3 }}
              className={cn(
                'rounded-xl border p-4',
                contract.status === 'verified' ? 'border-emerald-500/20 bg-emerald-500/5' :
                contract.status === 'pending' ? 'border-amber-500/20 bg-amber-500/5' :
                'border-red-500/20 bg-red-500/5',
              )}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className={cn('flex size-8 shrink-0 items-center justify-center rounded-lg', cStatus.badge.split(' ').find(c => c.startsWith('bg-'))?.replace('/20', '/15') || 'bg-slate-700/50')}>
                    <CIcon className={cn('size-4', cStatus.badge.split(' ').find(c => c.startsWith('text-')) || 'text-slate-400')} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h5 className="text-sm font-medium text-slate-200">{contract.name}</h5>
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-slate-700/30 text-slate-400 border-slate-600/30">
                        {contract.version}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="font-mono text-[11px] text-slate-400">{contract.address}</span>
                      <CopyButton text={contract.address} />
                    </div>
                  </div>
                </div>
                <Badge variant="outline" className={cn('text-[10px] shrink-0', cStatus.badge)}>
                  {cStatus.label}
                </Badge>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                <div>
                  <span className="text-[10px] text-slate-500 block">字节码大小</span>
                  <span className="text-[11px] text-slate-300 font-medium">{contract.bytecodeSize}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">优化配置</span>
                  <span className="text-[11px] text-slate-300 font-mono">{contract.optimizations}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">部署交易</span>
                  <div className="flex items-center gap-1">
                    <span className="font-mono text-[11px] text-slate-400 truncate">{truncateAddress(contract.deployTx)}</span>
                    <CopyButton text={contract.deployTx} />
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">验证时间</span>
                  <span className="text-[11px] text-slate-300">{contract.verifiedAt ? formatDate(contract.verifiedAt) : '—'}</span>
                </div>
              </div>

              {/* Bytecode comparison */}
              <div className="rounded-lg bg-slate-900/50 p-3 mb-3">
                <div className="flex items-center gap-2 mb-2">
                  <Fingerprint className="size-3 text-slate-500" />
                  <span className="text-[10px] text-slate-500 font-medium">字节码比对</span>
                  <Badge variant="outline" className={cn('text-[9px] px-1.5 py-0', hashMatch ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-red-500/20 text-red-300 border-red-500/30')}>
                    {hashMatch ? '一致' : '不一致'}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-3 text-[10px]">
                  <div>
                    <span className="text-slate-500 block mb-0.5">源码哈希</span>
                    <span className="font-mono text-slate-400">{SOURCE_HASHES[contract.name]}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-0.5">链上哈希</span>
                    <span className="font-mono text-slate-400">{ONCHAIN_HASHES[contract.name]}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    'h-7 text-[10px]',
                    contract.status === 'verified'
                      ? 'border-emerald-600/30 text-emerald-300 hover:bg-emerald-500/10'
                      : 'border-amber-600/30 text-amber-300 hover:bg-amber-500/10',
                  )}
                  onClick={() => handleVerify(contract.name)}
                  disabled={isVerifying}
                >
                  {isVerifying ? (
                    <>
                      <RefreshCw className="mr-1 size-3 animate-spin" />
                      验证中...
                    </>
                  ) : (
                    <>
                      <Shield className="mr-1 size-3" />
                      验证合约
                    </>
                  )}
                </Button>
                <a
                  href={`https://basescan.org/address/${contract.address}#code`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2 py-1 text-[10px] text-slate-400 hover:text-violet-300 transition-colors"
                >
                  <ExternalLink className="size-3" />
                  Basescan
                </a>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Verification Timeline */}
      <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
        <h5 className="text-xs font-medium text-slate-300 mb-3">验证时间线</h5>
        <div className="space-y-2">
          {data.contracts.filter(c => c.verifiedAt).sort((a, b) => new Date(b.verifiedAt).getTime() - new Date(a.verifiedAt).getTime()).map((contract) => (
            <div key={contract.name} className="flex items-center gap-3 text-[11px]">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="size-3 text-emerald-400" />
                <span className="text-slate-300 font-medium">{contract.name}</span>
              </div>
              <span className="text-slate-500">{contract.version}</span>
              <span className="ml-auto text-slate-500">{formatDate(contract.verifiedAt)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Tab 3: Multi-sig Wallet ────────────────────────────
function MultiSigTab({ data }: { data: DeploymentData }) {
  const wallet = data.multiSigWallet;
  const confirmedCount = wallet.signers.filter(s => s.status === 'confirmed').length;

  return (
    <div className="space-y-5">
      {/* Wallet Address + Threshold */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Lock className="size-4 text-violet-400" />
            <h4 className="text-xs font-semibold text-slate-200">多签钱包</h4>
          </div>
          <div className="flex items-center gap-1.5 mb-2">
            <span className="font-mono text-sm text-slate-200">{truncateAddress(wallet.address)}</span>
            <CopyButton text={wallet.address} />
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="bg-violet-500/15 text-violet-300 border-violet-500/30 text-[10px]">
              阈值: {wallet.threshold}
            </Badge>
            <Badge variant="outline" className="bg-amber-500/15 text-amber-300 border-amber-500/30 text-[10px]">
              <Timer className="mr-1 size-2.5" />
              {wallet.timeLock}
            </Badge>
          </div>
        </div>

        {/* Threshold Indicator */}
        <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="size-4 text-emerald-400" />
            <h4 className="text-xs font-semibold text-slate-200">确认进度</h4>
          </div>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-3xl font-bold text-slate-100 tabular-nums">{confirmedCount}</span>
            <span className="text-lg text-slate-500">/</span>
            <span className="text-3xl font-bold text-slate-400 tabular-nums">{wallet.totalSigners}</span>
            <span className="text-xs text-slate-500 ml-1">签名者已确认</span>
          </div>
          <div className="relative">
            <Progress
              value={(confirmedCount / wallet.totalSigners) * 100}
              className="h-2.5 bg-slate-700 [&>div]:bg-emerald-500"
            />
            {/* Threshold marker */}
            <div
              className="absolute top-0 h-2.5 w-0.5 bg-violet-400"
              style={{ left: `${(wallet.thresholdNum / wallet.totalSigners) * 100}%` }}
              title={`阈值: ${wallet.thresholdNum}`}
            />
          </div>
          <div className="flex items-center justify-between mt-1.5 text-[10px] text-slate-500">
            <span>0</span>
            <span className="text-violet-400">← 阈值 {wallet.thresholdNum}</span>
            <span>{wallet.totalSigners}</span>
          </div>
        </div>
      </div>

      {/* Signer List */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Users className="size-4 text-violet-400" />
          <h4 className="text-xs font-semibold text-slate-200">签名者列表</h4>
        </div>
        <div className="space-y-2">
          {wallet.signers.map((signer, idx) => (
            <motion.div
              key={signer.name}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1, duration: 0.25 }}
              className={cn(
                'flex items-center justify-between rounded-lg border p-3',
                signer.status === 'confirmed'
                  ? 'border-emerald-500/20 bg-emerald-500/5'
                  : 'border-amber-500/20 bg-amber-500/5',
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  'flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                  signer.status === 'confirmed'
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-amber-500/20 text-amber-300',
                )}>
                  {idx + 1}
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-200">{signer.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="font-mono text-[10px] text-slate-500">{truncateAddress(signer.address)}</span>
                    <CopyButton text={signer.address} />
                  </div>
                </div>
              </div>
              <Badge variant="outline" className={cn(
                'text-[10px]',
                signer.status === 'confirmed'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/30',
              )}>
                {signer.status === 'confirmed' ? (
                  <><CheckCircle2 className="mr-1 size-2.5" /> 已确认</>
                ) : (
                  <><Timer className="mr-1 size-2.5" /> 待确认</>
                )}
              </Badge>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Pending Operations */}
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="size-4 text-amber-400" />
          <h4 className="text-xs font-semibold text-slate-200">待处理操作</h4>
          <Badge variant="outline" className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[9px] ml-auto">
            {wallet.pendingOperations.length} 项
          </Badge>
        </div>
        <div className="space-y-3">
          {wallet.pendingOperations.map((op, idx) => (
            <motion.div
              key={op.description}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1, duration: 0.25 }}
              className="rounded-lg border border-slate-700 bg-slate-900/40 p-3"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="text-xs font-medium text-slate-200">{op.description}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-[10px] shrink-0 border-violet-600/30 text-violet-300 hover:bg-violet-500/10"
                >
                  确认
                </Button>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <Progress
                    value={(op.confirmed / op.threshold) * 100}
                    className="h-1.5 bg-slate-700 [&>div]:bg-violet-500"
                  />
                </div>
                <span className="text-[10px] text-slate-400 font-mono">{op.confirmations}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Operation History */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="size-4 text-slate-400" />
          <h4 className="text-xs font-semibold text-slate-200">操作历史</h4>
        </div>
        <div className="space-y-2">
          {data.operationHistory.map((op, idx) => (
            <motion.div
              key={op.txHash}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1, duration: 0.25 }}
              className="flex items-center justify-between rounded-lg p-2.5 hover:bg-slate-700/30 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <CheckCircle className="size-3.5 text-emerald-400 shrink-0" />
                <div>
                  <p className="text-[11px] text-slate-300">{op.description}</p>
                  <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500">
                    <span>{formatDate(op.executedAt)}</span>
                    <span className="font-mono">{op.txHash}</span>
                  </div>
                </div>
              </div>
              <Badge variant="outline" className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[9px] shrink-0">
                已完成
              </Badge>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Tab 4: State Consistency ───────────────────────────
function ConsistencyTab({ data }: { data: DeploymentData }) {
  const sc = data.stateConsistency;
  const [checking, setChecking] = useState(false);

  const handleCheck = () => {
    setChecking(true);
    setTimeout(() => setChecking(false), 2500);
  };

  const matchCount = sc.checks.filter(c => c.status === 'match').length;

  return (
    <div className="space-y-5">
      {/* Consistency Check Banner */}
      <Alert className={cn(
        'border-emerald-500/30',
        sc.consistencyCheck === 'passed' ? 'bg-emerald-500/5' : 'bg-red-500/5 border-red-500/30',
      )}>
        {sc.consistencyCheck === 'passed' ? (
          <CheckCircle2 className="size-4 text-emerald-400" />
        ) : (
          <AlertTriangle className="size-4 text-red-400" />
        )}
        <AlertTitle className={cn('text-xs', sc.consistencyCheck === 'passed' ? 'text-emerald-300' : 'text-red-300')}>
          一致性检查: {sc.consistencyCheck === 'passed' ? 'PASS' : 'FAIL'}
        </AlertTitle>
        <AlertDescription className={cn('text-[11px]', sc.consistencyCheck === 'passed' ? 'text-emerald-300/70' : 'text-red-300/70')}>
          {matchCount}/{sc.checks.length} 检查项匹配 · 不一致数: {sc.mismatches}
        </AlertDescription>
      </Alert>

      {/* Block Numbers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Hash className="size-3.5 text-amber-400" />
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">Sepolia 测试网</span>
          </div>
          <span className="text-xl font-bold text-slate-100 tabular-nums">{sc.sepoliaBlockNumber.toLocaleString()}</span>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Globe className="size-3.5 text-emerald-400" />
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">Base 主网</span>
          </div>
          <span className="text-xl font-bold text-slate-100 tabular-nums">{sc.mainnetBlockNumber.toLocaleString()}</span>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/60 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-700/50">
          <GitBranch className="size-4 text-violet-400" />
          <h4 className="text-xs font-semibold text-slate-200">状态对比</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-slate-700/50 text-slate-500">
                <th className="text-left px-4 py-2.5 font-medium">检查项</th>
                <th className="text-left px-4 py-2.5 font-medium">Sepolia</th>
                <th className="text-left px-4 py-2.5 font-medium">主网</th>
                <th className="text-center px-4 py-2.5 font-medium">状态</th>
              </tr>
            </thead>
            <tbody>
              {sc.checks.map((check, idx) => (
                <motion.tr
                  key={check.name}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1, duration: 0.25 }}
                  className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors"
                >
                  <td className="px-4 py-3 text-slate-300 font-medium">{check.name}</td>
                  <td className="px-4 py-3 text-slate-400 font-mono">{check.sepoliaValue}</td>
                  <td className="px-4 py-3 text-slate-400 font-mono">{check.mainnetValue}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant="outline" className={cn(
                      'text-[9px]',
                      check.status === 'match'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : 'bg-red-500/20 text-red-300 border-red-500/30',
                    )}>
                      {check.status === 'match' ? (
                        <><CheckCircle2 className="mr-0.5 size-2.5" /> 一致</>
                      ) : (
                        <><AlertTriangle className="mr-0.5 size-2.5" /> 不一致</>
                      )}
                    </Badge>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mismatch Details */}
      {sc.checks.some(c => c.status === 'mismatch') && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="size-4 text-amber-400" />
            <h4 className="text-xs font-semibold text-slate-200">不一致详情</h4>
          </div>
          {sc.checks.filter(c => c.status === 'mismatch').map((check) => (
            <div key={check.name} className="rounded-lg border border-slate-700 bg-slate-900/40 p-3 mb-2 last:mb-0">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-medium text-slate-200">{check.name}</span>
                <Badge variant="outline" className="bg-red-500/20 text-red-300 border-red-500/30 text-[9px]">
                  不一致
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 text-[11px]">
                <div>
                  <span className="text-slate-500 block">Sepolia:</span>
                  <span className="font-mono text-amber-300">{check.sepoliaValue}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">主网:</span>
                  <span className="font-mono text-amber-300">{check.mainnetValue}</span>
                </div>
              </div>
              {check.note && (
                <div className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-400">
                  <Settings2 className="size-3" />
                  <span>说明: {check.note}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Actions & Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Button
          variant="outline"
          className={cn(
            'h-9 text-[11px] border-violet-600/30 text-violet-300 hover:bg-violet-500/10 hover:border-violet-500/50',
            checking && 'opacity-70 cursor-not-allowed',
          )}
          onClick={handleCheck}
          disabled={checking}
        >
          {checking ? (
            <>
              <RefreshCw className="mr-1.5 size-3.5 animate-spin" />
              检查中...
            </>
          ) : (
            <>
              <GitBranch className="mr-1.5 size-3.5" />
              执行一致性检查
            </>
          )}
        </Button>

        <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-3 space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-500">上次检查</span>
            <span className="text-slate-300">{formatDate(sc.lastCheckAt)}</span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-500">自动检查</span>
            <Badge variant="outline" className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30 text-[9px]">
              {sc.autoCheckSchedule}
            </Badge>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-500">不一致数</span>
            <span className={cn('font-medium', sc.mismatches === 0 ? 'text-emerald-400' : 'text-amber-400')}>
              {sc.mismatches}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────
export default function DeploymentCenter() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const data = MOCK_DATA;

  const tabContent: Record<TabId, () => React.ReactNode> = {
    overview: () => <OverviewTab data={data} />,
    verification: () => <VerificationTab data={data} />,
    multisig: () => <MultiSigTab data={data} />,
    consistency: () => <ConsistencyTab data={data} />,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
    >
      <Card className="border-slate-700 bg-slate-800/80 backdrop-blur-sm overflow-hidden">
        {/* Top accent bar */}
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-violet-500 to-emerald-500" />

        <CardHeader className="pb-0 pt-5">
          <CardTitle className="flex items-center gap-2 text-base text-slate-100">
            <Shield className="size-5 text-violet-400" />
            链上部署中心
            <Badge variant="outline" className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30 text-[10px] ml-2">
              <span className="inline-block size-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
              LIVE
            </Badge>
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

// ── Export Types for consolidation ─────────
export type {
  DeploymentStatus,
  ContractDeployment,
  MultiSigSigner,
  PendingOperation,
  MultiSigWallet,
  StateCheck,
  StateConsistency,
  PipelineStage,
  DeployPipeline,
  OperationHistoryEntry,
  DeploymentData,
  DeployStatus,
  ContractVerificationStatus,
  SignerConfirmationStatus,
  ConsistencyCheckStatus,
  PipelineStageStatus,
};
