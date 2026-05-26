'use client';

import { useState } from 'react';
import { useClientTime } from '@/hooks/use-client-time';
import { useI18n } from '@/hooks/use-i18n';
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
      { name: 'deployment.securityCommittee', address: '0xAa1b2C3d4E5f6A7b8C9d0E1f2A3b4C5d6E7fcC2d', status: 'confirmed' },
      { name: 'deployment.architect', address: '0xBb2c3D4e5F6a7B8c9D0e1F2a3B4c5D6e7F8adD3e', status: 'confirmed' },
      { name: 'deployment.operator', address: '0xCc3d4E5f6A7b8C9d0E1f2A3b4C5d6E7f8A9beE4f', status: 'pending' },
      { name: 'deployment.investorRep', address: '0xDd4e5F6a7B8c9D0e1F2a3B4c5D6e7F8a9B0cfF5g', status: 'pending' },
      { name: 'deployment.communityRep', address: '0xEe5f6A7b8C9d0E1f2A3b4C5d6E7f8A9b0C1dgG6h', status: 'confirmed' },
    ],
    pendingOperations: [
      { description: 'deployment.upgradeTokenVault', confirmations: '2/3', threshold: 3, confirmed: 2 },
      { description: 'deployment.adjustLpFee', confirmations: '1/3', threshold: 3, confirmed: 1 },
    ],
    timeLock: 'deployment.cooldownPeriod72h',
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
      { name: 'TokenVault supply', status: 'mismatch', sepoliaValue: '1000000', mainnetValue: '998500', note: 'deployment.mainnetBurnExecuted' },
    ],
    autoCheckSchedule: 'deployment.every6Hours',
  },

  deployPipeline: {
    stages: [
      { name: 'deployment.compileCheck', status: 'passed', detail: '0 errors, 0 warnings' },
      { name: 'deployment.testCoverage', status: 'passed', detail: '97.2%' },
      { name: 'deployment.staticAnalysis', status: 'passed', detail: '0 high/critical' },
      { name: 'deployment.formalVerification', status: 'passed', detail: '4/4 invariants' },
      { name: 'deployment.multiSigApproval', status: 'in_progress', detail: '2/3' },
      { name: 'deployment.mainnetDeploy', status: 'pending' },
    ],
  },

  operationHistory: [
    { description: 'deployment.upgradeCircuitGuard', status: 'completed', executedAt: '2026-02-28T12:00:00Z', txHash: '0xop001...a1b2' },
    { description: 'deployment.adjustResonanceThreshold', status: 'completed', executedAt: '2026-02-20T09:30:00Z', txHash: '0xop002...c3d4' },
    { description: 'deployment.addIfdRouter', status: 'completed', executedAt: '2026-02-10T16:45:00Z', txHash: '0xop003...e5f6' },
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
  { id: 'overview', label: 'deployment.overview', icon: Globe },
  { id: 'verification', label: 'deployment.verificationTab', icon: FileCheck },
  { id: 'multisig', label: 'deployment.multisigTab', icon: Lock },
  { id: 'consistency', label: 'deployment.consistencyTab', icon: GitBranch },
];

// ── Status Configs ─────────────────────────────────────
const DEPLOY_STATUS_CONFIG: Record<DeployStatus, { label: string; color: string; badge: string }> = {
  live: { label: 'deployment.deployLive', color: 'text-emerald-400', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  deploying: { label: 'deployment.deployDeploying', color: 'text-violet-400', badge: 'bg-violet-500/20 text-violet-300 border-violet-500/30' },
  paused: { label: 'deployment.deployPaused', color: 'text-amber-400', badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  verifying: { label: 'deployment.deployVerifying', color: 'text-sky-400', badge: 'bg-sky-500/20 text-sky-300 border-sky-500/30' },
};

const CONTRACT_STATUS_CONFIG: Record<ContractVerificationStatus, { label: string; icon: React.ElementType; badge: string; dotColor: string }> = {
  verified: { label: 'deployment.contractVerifiedLabel', icon: CheckCircle2, badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', dotColor: 'bg-emerald-400' },
  pending: { label: 'deployment.contractPendingLabel', icon: AlertTriangle, badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30', dotColor: 'bg-amber-400' },
  failed: { label: 'deployment.contractFailedLabel', icon: XCircle, badge: 'bg-red-500/20 text-red-300 border-red-500/30', dotColor: 'bg-red-400' },
};

const PIPELINE_STATUS_CONFIG: Record<PipelineStageStatus, { label: string; icon: React.ElementType; color: string; bg: string; badge: string }> = {
  passed: { label: 'deployment.pipelinePassed', icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/15', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  in_progress: { label: 'deployment.pipelineInProgress', icon: Timer, color: 'text-violet-400', bg: 'bg-violet-500/15', badge: 'bg-violet-500/20 text-violet-300 border-violet-500/30' },
  pending: { label: 'deployment.pipelinePendingLabel', icon: Clock, color: 'text-slate-400', bg: 'bg-slate-500/15', badge: 'bg-slate-500/20 text-slate-300 border-slate-500/30' },
  failed: { label: 'deployment.pipelineFailed', icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/15', badge: 'bg-red-500/20 text-red-300 border-red-500/30' },
};

// ── Helper: truncate address ───────────────────────────
function truncateAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// ── Helper: copy to clipboard ─────────────────────────
function CopyButton({ text }: { text: string }) {
  const { t } = useI18n();
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
      title={t('deployment.copyBtn')}
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
function getRelativeTime(timestamp: string, now?: Date | null, translate?: (key: string, params?: Record<string, string | number>) => string): string {
  if (!timestamp) return '—';
  const currentDate = now ?? new Date('2026-03-04');
  const date = new Date(timestamp);
  const diffMs = currentDate.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return translate ? translate('deployment.justNow') : 'just now';
  if (diffMin < 60) return translate ? translate('deployment.minutesAgo', { n: diffMin }) : `${diffMin} min ago`;
  if (diffHr < 24) return translate ? translate('deployment.hoursAgo', { n: diffHr }) : `${diffHr}h ago`;
  if (diffDay < 30) return translate ? translate('deployment.daysAgo', { n: diffDay }) : `${diffDay}d ago`;
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
  const { t } = useI18n();
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
              <h4 className="text-sm font-semibold text-slate-200">{t('deployment.networkStatus')}</h4>
            </div>
            <Badge variant="outline" className={cn('text-[10px]', statusConfig.badge)}>
              <span className={cn('inline-block size-1.5 rounded-full mr-1.5 animate-pulse', statusConfig.dotColor || 'bg-emerald-400')} />
              {t(statusConfig.label)}
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
                <span className="text-[10px] text-slate-500">{t('deployment.version')}</span>
                <Badge variant="outline" className="bg-violet-500/15 text-violet-300 border-violet-500/30 text-[10px]">
                  {ds.deployVersion}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <Clock className="size-3" />
              <span suppressHydrationWarning>{t('deployment.lastDeploy')}: {getRelativeTime(ds.lastDeployAt, now, t)}</span>
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
                <span className="text-xs text-slate-400">{t('deployment.uptime')}</span>
              </div>
              <span className="text-2xl font-bold text-emerald-400 tabular-nums">{ds.uptime}</span>
            </div>
          </div>

          {/* Total Transactions */}
          <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="size-4 text-violet-400" />
                <span className="text-xs text-slate-400">{t('deployment.totalTransactions')}</span>
              </div>
              <AnimatedCounter value={ds.totalTransactions} />
            </div>
          </div>

          {/* Deploy Pipeline Mini */}
          <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-3">
            <div className="flex items-center gap-2 mb-2">
              <Layers className="size-3.5 text-violet-400" />
              <span className="text-[10px] text-slate-400 font-medium">{t('deployment.deployPipelineLabel')}</span>
            </div>
            <div className="flex items-center gap-1">
              {data.deployPipeline.stages.map((stage, idx) => {
                const config = PIPELINE_STATUS_CONFIG[stage.status];
                const StageIcon = config.icon;
                return (
                  <div key={stage.name} className="flex items-center gap-1">
                    <div className={cn('flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px]', config.bg)}>
                      <StageIcon className={cn('size-2.5', config.color)} />
                      <span className={config.color}>{t(stage.name)}</span>
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
            <h4 className="text-xs font-semibold text-slate-200">{t('deployment.deployedContracts')}</h4>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500">
              {data.contracts.filter(c => c.status === 'verified').length}/{data.contracts.length} {t('deployment.verified')}
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
                    {t(cStatus.label)}
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
          {t('deployment.reverifyAll')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-[11px] border-slate-600 text-slate-300 hover:text-emerald-300 hover:border-emerald-500/50 hover:bg-emerald-500/10"
        >
          <Download className="mr-1.5 size-3" />
          {t('deployment.exportDeployReport')}
        </Button>
      </div>
    </div>
  );
}

// ── Tab 2: Contract Verification ───────────────────────
function VerificationTab({ data }: { data: DeploymentData }) {
  const { t } = useI18n();
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
          <h4 className="text-sm font-semibold text-slate-200">{t('deployment.verificationStatus')}</h4>
        </div>
        <span className="text-[10px] text-slate-500">
          {data.contracts.filter(c => c.status === 'verified').length}/{data.contracts.length} {t('deployment.verified')}
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
                  <span className="text-[10px] text-slate-500 block">{t('deployment.bytecodeSize')}</span>
                  <span className="text-[11px] text-slate-300 font-medium">{contract.bytecodeSize}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">{t('deployment.optimizationConfig')}</span>
                  <span className="text-[11px] text-slate-300 font-mono">{contract.optimizations}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">{t('deployment.deployTransaction')}</span>
                  <div className="flex items-center gap-1">
                    <span className="font-mono text-[11px] text-slate-400 truncate">{truncateAddress(contract.deployTx)}</span>
                    <CopyButton text={contract.deployTx} />
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">{t('deployment.verificationTime')}</span>
                  <span className="text-[11px] text-slate-300">{contract.verifiedAt ? formatDate(contract.verifiedAt) : '—'}</span>
                </div>
              </div>

              {/* Bytecode comparison */}
              <div className="rounded-lg bg-slate-900/50 p-3 mb-3">
                <div className="flex items-center gap-2 mb-2">
                  <Fingerprint className="size-3 text-slate-500" />
                  <span className="text-[10px] text-slate-500 font-medium">{t('deployment.bytecodeComparison')}</span>
                  <Badge variant="outline" className={cn('text-[9px] px-1.5 py-0', hashMatch ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-red-500/20 text-red-300 border-red-500/30')}>
                    {hashMatch ? t('deployment.match') : t('deployment.mismatch')}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-3 text-[10px]">
                  <div>
                    <span className="text-slate-500 block mb-0.5">{t('deployment.sourceHash')}</span>
                    <span className="font-mono text-slate-400">{SOURCE_HASHES[contract.name]}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-0.5">{t('deployment.onchainHash')}</span>
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
                      {t('deployment.verifyingEllipsis')}
                    </>
                  ) : (
                    <>
                      <Shield className="mr-1 size-3" />
                      {t('deployment.verifyContract')}
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
        <h5 className="text-xs font-medium text-slate-300 mb-3">{t('deployment.verificationTimeline')}</h5>
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
  const { t } = useI18n();
  const wallet = data.multiSigWallet;
  const confirmedCount = wallet.signers.filter(s => s.status === 'confirmed').length;

  return (
    <div className="space-y-5">
      {/* Wallet Address + Threshold */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Lock className="size-4 text-violet-400" />
            <h4 className="text-xs font-semibold text-slate-200">{t('deployment.multiSigWalletTitle')}</h4>
          </div>
          <div className="flex items-center gap-1.5 mb-2">
            <span className="font-mono text-sm text-slate-200">{truncateAddress(wallet.address)}</span>
            <CopyButton text={wallet.address} />
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="bg-violet-500/15 text-violet-300 border-violet-500/30 text-[10px]">
              {t('deployment.threshold')}: {wallet.threshold}
            </Badge>
            <Badge variant="outline" className="bg-amber-500/15 text-amber-300 border-amber-500/30 text-[10px]">
              <Timer className="mr-1 size-2.5" />
              {t(wallet.timeLock)}
            </Badge>
          </div>
        </div>

        {/* Threshold Indicator */}
        <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="size-4 text-emerald-400" />
            <h4 className="text-xs font-semibold text-slate-200">{t('deployment.confirmationProgress')}</h4>
          </div>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-3xl font-bold text-slate-100 tabular-nums">{confirmedCount}</span>
            <span className="text-lg text-slate-500">/</span>
            <span className="text-3xl font-bold text-slate-400 tabular-nums">{wallet.totalSigners}</span>
            <span className="text-xs text-slate-500 ml-1">{t('deployment.signersConfirmed')}</span>
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
              title={`${t('deployment.threshold')}: ${wallet.thresholdNum}`}
            />
          </div>
          <div className="flex items-center justify-between mt-1.5 text-[10px] text-slate-500">
            <span>0</span>
            <span className="text-violet-400">← {t('deployment.threshold')} {wallet.thresholdNum}</span>
            <span>{wallet.totalSigners}</span>
          </div>
        </div>
      </div>

      {/* Signer List */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Users className="size-4 text-violet-400" />
          <h4 className="text-xs font-semibold text-slate-200">{t('deployment.signerList')}</h4>
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
                  <p className="text-xs font-medium text-slate-200">{t(signer.name)}</p>
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
                  <><CheckCircle2 className="mr-1 size-2.5" /> {t('deployment.confirmedLabel')}</>
                ) : (
                  <><Timer className="mr-1 size-2.5" /> {t('deployment.pendingConfirmLabel')}</>
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
          <h4 className="text-xs font-semibold text-slate-200">{t('deployment.pendingOperations')}</h4>
          <Badge variant="outline" className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[9px] ml-auto">
            {wallet.pendingOperations.length} {t('deployment.items')}
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
                <p className="text-xs font-medium text-slate-200">{t(op.description)}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-[10px] shrink-0 border-violet-600/30 text-violet-300 hover:bg-violet-500/10"
                >
                  {t('deployment.confirmBtn')}
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
          <h4 className="text-xs font-semibold text-slate-200">{t('deployment.operationHistory')}</h4>
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
                  <p className="text-[11px] text-slate-300">{t(op.description)}</p>
                  <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500">
                    <span>{formatDate(op.executedAt)}</span>
                    <span className="font-mono">{op.txHash}</span>
                  </div>
                </div>
              </div>
              <Badge variant="outline" className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[9px] shrink-0">
                {t('deployment.completedLabel')}
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
  const { t } = useI18n();
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
          {t('deployment.consistencyCheck')}: {sc.consistencyCheck === 'passed' ? 'PASS' : 'FAIL'}
        </AlertTitle>
        <AlertDescription className={cn('text-[11px]', sc.consistencyCheck === 'passed' ? 'text-emerald-300/70' : 'text-red-300/70')}>
          {matchCount}/{sc.checks.length} {t('deployment.checksMatch')} · {t('deployment.mismatchCount')}: {sc.mismatches}
        </AlertDescription>
      </Alert>

      {/* Block Numbers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Hash className="size-3.5 text-amber-400" />
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">{t('deployment.sepoliaTestnet')}</span>
          </div>
          <span className="text-xl font-bold text-slate-100 tabular-nums">{sc.sepoliaBlockNumber.toLocaleString()}</span>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Globe className="size-3.5 text-emerald-400" />
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">{t('deployment.baseMainnet')}</span>
          </div>
          <span className="text-xl font-bold text-slate-100 tabular-nums">{sc.mainnetBlockNumber.toLocaleString()}</span>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/60 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-700/50">
          <GitBranch className="size-4 text-violet-400" />
          <h4 className="text-xs font-semibold text-slate-200">{t('deployment.stateComparison')}</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-slate-700/50 text-slate-500">
                <th className="text-left px-4 py-2.5 font-medium">{t('deployment.checkItem')}</th>
                <th className="text-left px-4 py-2.5 font-medium">Sepolia</th>
                <th className="text-left px-4 py-2.5 font-medium">{t('deployment.mainnet')}</th>
                <th className="text-center px-4 py-2.5 font-medium">{t('deployment.statusLabel')}</th>
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
                        <><CheckCircle2 className="mr-0.5 size-2.5" /> {t('deployment.matchLabel')}</>
                      ) : (
                        <><AlertTriangle className="mr-0.5 size-2.5" /> {t('deployment.mismatchLabel')}</>
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
            <h4 className="text-xs font-semibold text-slate-200">{t('deployment.mismatchDetails')}</h4>
          </div>
          {sc.checks.filter(c => c.status === 'mismatch').map((check) => (
            <div key={check.name} className="rounded-lg border border-slate-700 bg-slate-900/40 p-3 mb-2 last:mb-0">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-medium text-slate-200">{check.name}</span>
                <Badge variant="outline" className="bg-red-500/20 text-red-300 border-red-500/30 text-[9px]">
                  {t('deployment.mismatchLabel')}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 text-[11px]">
                <div>
                  <span className="text-slate-500 block">Sepolia:</span>
                  <span className="font-mono text-amber-300">{check.sepoliaValue}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">{t('deployment.mainnetLabel')}</span>
                  <span className="font-mono text-amber-300">{check.mainnetValue}</span>
                </div>
              </div>
              {check.note && (
                <div className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-400">
                  <Settings2 className="size-3" />
                  <span>{t('deployment.noteLabel')}: {check.note}</span>
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
              {t('deployment.checkingEllipsis')}
            </>
          ) : (
            <>
              <GitBranch className="mr-1.5 size-3.5" />
              {t('deployment.runConsistencyCheck')}
            </>
          )}
        </Button>

        <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-3 space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-500">{t('deployment.lastCheck')}</span>
            <span className="text-slate-300">{formatDate(sc.lastCheckAt)}</span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-500">{t('deployment.autoCheck')}</span>
            <Badge variant="outline" className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30 text-[9px]">
              {t(sc.autoCheckSchedule)}
            </Badge>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-500">{t('deployment.mismatchCount')}</span>
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
  const { t } = useI18n();
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
            {t('deployment.title')}
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
