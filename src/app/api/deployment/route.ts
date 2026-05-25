import { NextResponse } from 'next/server';

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

interface DeploymentData {
  deploymentStatus: DeploymentStatus;
  contracts: ContractDeployment[];
  multiSigWallet: MultiSigWallet;
  stateConsistency: StateConsistency;
  deployPipeline: DeployPipeline;
  operationHistory: {
    description: string;
    status: 'completed';
    executedAt: string;
    txHash: string;
  }[];
}

// ── Deterministic Mock Data (no Math.random) ─────────
const DEPLOYMENT_DATA: DeploymentData = {
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
      {
        name: 'AvatarCore state root',
        status: 'match',
        sepoliaValue: '0xabc...123',
        mainnetValue: '0xabc...123',
      },
      {
        name: 'DynamicSplitter config',
        status: 'match',
        sepoliaValue: '70/20/10',
        mainnetValue: '70/20/10',
      },
      {
        name: 'CircuitGuard thresholds',
        status: 'match',
        sepoliaValue: '70/50',
        mainnetValue: '70/50',
      },
      {
        name: 'TokenVault supply',
        status: 'mismatch',
        sepoliaValue: '1000000',
        mainnetValue: '998500',
        note: '主网已执行燃烧',
      },
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
    {
      description: '升级 CircuitGuard 至 v2.1.0',
      status: 'completed',
      executedAt: '2026-02-28T12:00:00Z',
      txHash: '0xop001...a1b2',
    },
    {
      description: '调整共振分阈值 60→70',
      status: 'completed',
      executedAt: '2026-02-20T09:30:00Z',
      txHash: '0xop002...c3d4',
    },
    {
      description: '新增 IFDRouter 委托路由',
      status: 'completed',
      executedAt: '2026-02-10T16:45:00Z',
      txHash: '0xop003...e5f6',
    },
  ],
};

export async function GET() {
  return NextResponse.json(DEPLOYMENT_DATA);
}
