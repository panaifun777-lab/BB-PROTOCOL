import { NextResponse } from 'next/server';

// ── Types ──────────────────────────────────────────────
type ProtocolStatus = 'integrated' | 'pending' | 'planned';
type WalletSupport = 'full' | 'partial' | 'planned';
type NotificationType = 'governance' | 'revenue' | 'security' | 'bridge' | 'skill' | 'system' | 'delegation' | 'compliance';
type NotificationPriority = 'critical' | 'high' | 'medium' | 'low';
type ActivityType = 'liquidity' | 'rate' | 'price' | 'sync' | 'alert';

interface Protocol {
  id: string;
  name: string;
  category: string;
  icon: string;
  status: ProtocolStatus;
  description: string;
  integrationDate: string;
  tvl: number;
  volume24h: number;
  users: number;
}

interface Wallet {
  name: string;
  icon: string;
  support: WalletSupport;
  users: number;
  features: string[];
}

interface DataSource {
  name: string;
  provider: string;
  records: number;
  freshness: string;
  status: 'active' | 'delayed';
}

interface PipelineStage {
  stage: string;
  status: string;
  throughput: string;
  latency: string;
}

interface DataAggregation {
  sources: DataSource[];
  pipeline: PipelineStage[];
}

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  read: boolean;
  createdAt: string;
}

interface EcosystemMetrics {
  totalIntegrations: number;
  activeIntegrations: number;
  totalUsers: number;
  monthlyActiveUsers: number;
  transactionVolume: number;
  developerCount: number;
}

interface PartnerTier {
  name: string;
  requirements: string;
  benefits: string;
  partners: number;
}

interface PartnerProgram {
  tiers: PartnerTier[];
}

interface ActivityFeedItem {
  protocol: string;
  event: string;
  timestamp: string;
  type: ActivityType;
}

// ── Deterministic Mock Data ────────────────────────────
const protocols: Protocol[] = [
  {
    id: 'uniswap', name: 'Uniswap V4', category: 'DEX', icon: '🦄', status: 'integrated',
    description: 'AFC/USDC流动性池托管，自动做市策略',
    integrationDate: '2026-02-20', tvl: 890000, volume24h: 45000, users: 1250,
  },
  {
    id: 'aave', name: 'Aave V3', category: 'Lending', icon: '👻', status: 'integrated',
    description: '分身金库AFC质押借贷，自动利率优化',
    integrationDate: '2026-02-25', tvl: 520000, volume24h: 18000, users: 890,
  },
  {
    id: 'chainlink', name: 'Chainlink', category: 'Oracle', icon: '🔗', status: 'integrated',
    description: 'AFC价格预言机，共振分外部数据源',
    integrationDate: '2026-01-15', tvl: 0, volume24h: 0, users: 0,
  },
  {
    id: 'the-graph', name: 'The Graph', category: 'Indexing', icon: '📊', status: 'integrated',
    description: '链上事件索引，分身活动Subgraph',
    integrationDate: '2026-01-10', tvl: 0, volume24h: 0, users: 0,
  },
  {
    id: 'lido', name: 'Lido', category: 'Staking', icon: '🏔️', status: 'pending',
    description: 'ETH质押收益接入分身金库',
    integrationDate: '', tvl: 0, volume24h: 0, users: 0,
  },
  {
    id: 'compound', name: 'Compound V3', category: 'Lending', icon: '🏦', status: 'pending',
    description: '备用借贷协议，利率比较策略',
    integrationDate: '', tvl: 0, volume24h: 0, users: 0,
  },
  {
    id: '1inch', name: '1inch', category: 'DEX Aggregator', icon: '🟣', status: 'planned',
    description: '最优路径兑换，Gas节省优化',
    integrationDate: '', tvl: 0, volume24h: 0, users: 0,
  },
  {
    id: 'ens', name: 'ENS', category: 'Identity', icon: '📛', status: 'planned',
    description: '分身.soul域名映射至ENS',
    integrationDate: '', tvl: 0, volume24h: 0, users: 0,
  },
];

const wallets: Wallet[] = [
  { name: 'MetaMask', icon: '🦊', support: 'full', users: 8500, features: ['connect', 'sign', 'send', 'contract'] },
  { name: 'WalletConnect', icon: '📡', support: 'full', users: 6200, features: ['connect', 'sign', 'send'] },
  { name: 'Coinbase Wallet', icon: '🔵', support: 'full', users: 4100, features: ['connect', 'sign', 'send', 'contract'] },
  { name: 'Rainbow', icon: '🌈', support: 'partial', users: 2800, features: ['connect', 'sign'] },
  { name: 'Phantom', icon: '👻', support: 'planned', users: 0, features: [] },
  { name: 'Ledger', icon: '🔐', support: 'partial', users: 1500, features: ['connect', 'sign'] },
];

const dataAggregation: DataAggregation = {
  sources: [
    { name: 'On-chain Events', provider: 'The Graph', records: 2500000, freshness: '2s', status: 'active' },
    { name: 'Price Feeds', provider: 'Chainlink', records: 864000, freshness: '1s', status: 'active' },
    { name: 'Social Signals', provider: 'Custom Crawler', records: 450000, freshness: '5m', status: 'active' },
    { name: 'Market Data', provider: 'CoinGecko', records: 180000, freshness: '30s', status: 'active' },
    { name: 'IPFS Content', provider: 'Pinata', records: 95000, freshness: '10s', status: 'active' },
    { name: 'Cross-chain State', provider: 'AFC Bridge', records: 120000, freshness: '15s', status: 'delayed' },
  ],
  pipeline: [
    { stage: 'Data Ingestion', status: 'running', throughput: '2.5K req/s', latency: '45ms' },
    { stage: 'ETL Processing', status: 'running', throughput: '1.8K records/s', latency: '120ms' },
    { stage: 'Vector Embedding', status: 'running', throughput: '500 docs/s', latency: '250ms' },
    { stage: 'Cache Layer', status: 'running', throughput: '15K reads/s', latency: '2ms' },
    { stage: 'API Gateway', status: 'running', throughput: '3K req/s', latency: '35ms' },
  ],
};

const notifications: Notification[] = [
  { id: 'n1', type: 'governance', title: '新提案: 调整分账比例', message: '提案 #1 已进入投票期，请参与治理', priority: 'high', read: false, createdAt: '2026-03-10T14:30:00Z' },
  { id: 'n2', type: 'revenue', title: '收益到账', message: '您收到 $12.50 技能调用收益', priority: 'medium', read: false, createdAt: '2026-03-10T13:20:00Z' },
  { id: 'n3', type: 'security', title: '共振分预警', message: '分身 Alpha-7 共振分降至 55，已触发 SOFT_LIMIT', priority: 'critical', read: false, createdAt: '2026-03-10T12:15:00Z' },
  { id: 'n4', type: 'bridge', title: '跨链转账完成', message: 'Base → Ethereum: 5000 AFC 桥接成功', priority: 'low', read: true, createdAt: '2026-03-10T10:45:00Z' },
  { id: 'n5', type: 'skill', title: '技能解锁', message: 'RAG高级检索已解锁，累计收益达到阈值', priority: 'medium', read: true, createdAt: '2026-03-10T09:30:00Z' },
  { id: 'n6', type: 'system', title: '系统升级', message: 'V2.2.0 已部署至Canary环境，灰度5%', priority: 'low', read: true, createdAt: '2026-03-09T18:00:00Z' },
  { id: 'n7', type: 'delegation', title: '委托权重变更', message: '用户0x5b2a...已委托您3000 BPS技术领域权重', priority: 'medium', read: false, createdAt: '2026-03-10T11:00:00Z' },
  { id: 'n8', type: 'compliance', title: 'KYC模块已激活', message: '提案 #2 已执行，KYC合规模块现可启用', priority: 'low', read: true, createdAt: '2026-03-07T12:30:00Z' },
];

const ecosystemMetrics: EcosystemMetrics = {
  totalIntegrations: 8,
  activeIntegrations: 4,
  totalUsers: 23100,
  monthlyActiveUsers: 8400,
  transactionVolume: 12500000,
  developerCount: 156,
};

const partnerProgram: PartnerProgram = {
  tiers: [
    { name: 'Explorer', requirements: '集成1个API端点', benefits: '基础技术支持, 社区徽章', partners: 45 },
    { name: 'Builder', requirements: '集成3+端点, 100+用户', benefits: '优先技术支持, 联合营销, API额度提升', partners: 12 },
    { name: 'Strategic', requirements: '深度定制集成, 1000+用户', benefits: '专属客户经理, 共同路线图, 优惠费率', partners: 3 },
  ],
};

const activityFeed: ActivityFeedItem[] = [
  { protocol: 'Uniswap V4', event: 'AFC/USDC池流动性增加 $50K', timestamp: '2026-03-10T14:00:00Z', type: 'liquidity' },
  { protocol: 'Aave V3', event: 'AFC质押利率更新至 4.2% APY', timestamp: '2026-03-10T12:30:00Z', type: 'rate' },
  { protocol: 'Chainlink', event: 'AFC/USD价格更新 $2.45', timestamp: '2026-03-10T12:00:00Z', type: 'price' },
  { protocol: 'The Graph', event: 'Subgraph同步至区块 #21456789', timestamp: '2026-03-10T11:45:00Z', type: 'sync' },
  { protocol: 'AFC Bridge', event: '跨链状态同步延迟: Polygon', timestamp: '2026-03-10T10:15:00Z', type: 'alert' },
];

// ── GET Handler ────────────────────────────────────────
export async function GET() {
  try {
    return NextResponse.json({
      protocols,
      wallets,
      dataAggregation,
      notifications,
      ecosystemMetrics,
      partnerProgram,
      activityFeed,
    });
  } catch (error) {
    console.error('[API] Error in GET /api/ecosystem:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
