import { NextResponse } from 'next/server';

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

// ── Deterministic Mock Data (no Math.random) ─────────
const MULTI_CHAIN_DATA: MultiChainData = {
  supportedChains: [
    {
      id: 'base',
      name: 'Base',
      chainId: 8453,
      color: '#0052FF',
      icon: '🔵',
      status: 'active',
      blockHeight: 21456789,
      gasPrice: '0.02',
      avgBlockTime: '2s',
      contractsDeployed: 7,
      tvl: 1250000,
      lastSync: '2026-03-10T14:30:00Z',
    },
    {
      id: 'ethereum',
      name: 'Ethereum',
      chainId: 1,
      color: '#627EEA',
      icon: '💎',
      status: 'active',
      blockHeight: 19876543,
      gasPrice: '12.5',
      avgBlockTime: '12s',
      contractsDeployed: 3,
      tvl: 3500000,
      lastSync: '2026-03-10T14:30:00Z',
    },
    {
      id: 'arbitrum',
      name: 'Arbitrum',
      chainId: 42161,
      color: '#28A0F0',
      icon: '🔷',
      status: 'active',
      blockHeight: 156789012,
      gasPrice: '0.05',
      avgBlockTime: '0.25s',
      contractsDeployed: 5,
      tvl: 890000,
      lastSync: '2026-03-10T14:30:00Z',
    },
    {
      id: 'polygon',
      name: 'Polygon',
      chainId: 137,
      color: '#8247E5',
      icon: '🟣',
      status: 'pending',
      blockHeight: 56789012,
      gasPrice: '30',
      avgBlockTime: '2s',
      contractsDeployed: 0,
      tvl: 0,
      lastSync: '2026-03-10T12:00:00Z',
    },
    {
      id: 'optimism',
      name: 'Optimism',
      chainId: 10,
      color: '#FF0420',
      icon: '🔴',
      status: 'planned',
      blockHeight: 123456789,
      gasPrice: '0.03',
      avgBlockTime: '2s',
      contractsDeployed: 0,
      tvl: 0,
      lastSync: '2026-03-10T00:00:00Z',
    },
    {
      id: 'solana',
      name: 'Solana',
      chainId: 0,
      color: '#14F195',
      icon: '🟢',
      status: 'planned',
      blockHeight: 256789012,
      gasPrice: '0.00001',
      avgBlockTime: '0.4s',
      contractsDeployed: 0,
      tvl: 0,
      lastSync: '2026-03-10T00:00:00Z',
    },
  ],

  crossChainBridges: [
    {
      id: 'bridge-1',
      name: 'AFC Bridge',
      sourceChain: 'base',
      targetChain: 'ethereum',
      status: 'active',
      totalLocked: 2500000,
      totalMinted: 2480000,
      fee: '0.1%',
      avgTime: '12m',
      transactions24h: 156,
    },
    {
      id: 'bridge-2',
      name: 'L2 Relay',
      sourceChain: 'base',
      targetChain: 'arbitrum',
      status: 'active',
      totalLocked: 890000,
      totalMinted: 885000,
      fee: '0.05%',
      avgTime: '8m',
      transactions24h: 89,
    },
    {
      id: 'bridge-3',
      name: 'Polygon Portal',
      sourceChain: 'base',
      targetChain: 'polygon',
      status: 'pending',
      totalLocked: 0,
      totalMinted: 0,
      fee: '0.15%',
      avgTime: '15m',
      transactions24h: 0,
    },
  ],

  chainSwitchHistory: [
    {
      id: '1',
      fromChain: 'base',
      toChain: 'ethereum',
      action: 'Bridge AFC',
      amount: 5000,
      status: 'completed',
      txHash: '0xabc...1234',
      timestamp: '2026-03-10T14:30:00Z',
    },
    {
      id: '2',
      fromChain: 'ethereum',
      toChain: 'base',
      action: 'Bridge USDC',
      amount: 10000,
      status: 'completed',
      txHash: '0xdef...5678',
      timestamp: '2026-03-10T12:15:00Z',
    },
    {
      id: '3',
      fromChain: 'base',
      toChain: 'arbitrum',
      action: 'Bridge AFC',
      amount: 2000,
      status: 'pending',
      txHash: '0x123...9abc',
      timestamp: '2026-03-10T16:45:00Z',
    },
    {
      id: '4',
      fromChain: 'arbitrum',
      toChain: 'base',
      action: 'Withdraw',
      amount: 1500,
      status: 'failed',
      txHash: '0x456...def0',
      timestamp: '2026-03-09T09:20:00Z',
    },
    {
      id: '5',
      fromChain: 'base',
      toChain: 'ethereum',
      action: 'Bridge AFC',
      amount: 8000,
      status: 'completed',
      txHash: '0x789...abcd',
      timestamp: '2026-03-09T18:30:00Z',
    },
  ],

  stateSync: [
    {
      id: '1',
      type: 'Cognition Root',
      sourceChain: 'base',
      targetChain: 'ethereum',
      lastSync: '2026-03-10T14:30:00Z',
      status: 'synced',
      latency: '2.3s',
    },
    {
      id: '2',
      type: 'Resonance Score',
      sourceChain: 'base',
      targetChain: 'arbitrum',
      lastSync: '2026-03-10T14:28:00Z',
      status: 'synced',
      latency: '0.8s',
    },
    {
      id: '3',
      type: 'Delegation Weights',
      sourceChain: 'base',
      targetChain: 'polygon',
      lastSync: '2026-03-09T10:00:00Z',
      status: 'delayed',
      latency: '45.2s',
    },
    {
      id: '4',
      type: 'Revenue Split Config',
      sourceChain: 'base',
      targetChain: 'ethereum',
      lastSync: '2026-03-10T14:25:00Z',
      status: 'synced',
      latency: '1.5s',
    },
    {
      id: '5',
      type: 'Circuit State',
      sourceChain: 'base',
      targetChain: 'arbitrum',
      lastSync: '2026-03-10T14:30:00Z',
      status: 'synced',
      latency: '0.5s',
    },
  ],

  deploymentPipeline: [
    { stage: 'Contract Compilation', status: 'passed', detail: 'All 7 contracts compiled successfully' },
    { stage: 'Multi-chain Verification', status: 'passed', detail: 'Bytecode consistency verified across 3 chains' },
    { stage: 'Testnet Deployment', status: 'passed', detail: 'Deployed to Base Sepolia, Arbitrum Goerli' },
    { stage: 'State Migration', status: 'in_progress', detail: 'Migrating cognition roots to Arbitrum...' },
    { stage: 'Mainnet Deployment', status: 'pending', detail: 'Awaiting multi-sig confirmation (2/3)' },
  ],

  tvlHistory: [
    { date: '03-04', base: 800000, ethereum: 2500000, arbitrum: 500000 },
    { date: '03-05', base: 900000, ethereum: 2700000, arbitrum: 600000 },
    { date: '03-06', base: 1000000, ethereum: 2900000, arbitrum: 700000 },
    { date: '03-07', base: 1050000, ethereum: 3100000, arbitrum: 750000 },
    { date: '03-08', base: 1100000, ethereum: 3200000, arbitrum: 800000 },
    { date: '03-09', base: 1180000, ethereum: 3350000, arbitrum: 840000 },
    { date: '03-10', base: 1250000, ethereum: 3500000, arbitrum: 890000 },
  ],
};

export async function GET() {
  return NextResponse.json(MULTI_CHAIN_DATA);
}
