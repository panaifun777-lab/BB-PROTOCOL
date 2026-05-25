'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Puzzle,
  Wallet,
  Database,
  Bell,
  ArrowRight,
  Check,
  X,
  ExternalLink,
  Shield,
  Vote,
  DollarSign,
  ArrowLeftRight,
  Sparkles,
  Settings,
  Users,
  Scale,
  Activity,
  ChevronRight,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Radio,
  Wifi,
  WifiOff,
  CircleDot,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

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

interface WalletItem {
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

interface NotificationItem {
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

interface EcosystemData {
  protocols: Protocol[];
  wallets: WalletItem[];
  dataAggregation: DataAggregation;
  notifications: NotificationItem[];
  ecosystemMetrics: EcosystemMetrics;
  partnerProgram: PartnerProgram;
  activityFeed: ActivityFeedItem[];
}

// ── Config Maps ────────────────────────────────────────
const STATUS_CONFIG: Record<ProtocolStatus, { label: string; badge: string; dot: string }> = {
  integrated: {
    label: '已集成',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    dot: 'bg-emerald-400',
  },
  pending: {
    label: '接入中',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    dot: 'bg-amber-400',
  },
  planned: {
    label: '规划',
    badge: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
    dot: 'bg-slate-400',
  },
};

const SUPPORT_CONFIG: Record<WalletSupport, { label: string; badge: string; dot: string }> = {
  full: {
    label: '完整支持',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    dot: 'bg-emerald-400',
  },
  partial: {
    label: '部分支持',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    dot: 'bg-amber-400',
  },
  planned: {
    label: '计划中',
    badge: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
    dot: 'bg-slate-400',
  },
};

const PRIORITY_CONFIG: Record<NotificationPriority, { label: string; border: string; badge: string; icon: string }> = {
  critical: {
    label: '紧急',
    border: 'border-l-red-500',
    badge: 'bg-red-500/20 text-red-300 border-red-500/30',
    icon: 'text-red-400',
  },
  high: {
    label: '高',
    border: 'border-l-amber-500',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    icon: 'text-amber-400',
  },
  medium: {
    label: '中',
    border: 'border-l-sky-500',
    badge: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
    icon: 'text-sky-400',
  },
  low: {
    label: '低',
    border: 'border-l-slate-500',
    badge: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
    icon: 'text-slate-400',
  },
};

const NOTIFICATION_TYPE_ICON: Record<NotificationType, React.ElementType> = {
  governance: Vote,
  revenue: DollarSign,
  security: Shield,
  bridge: ArrowLeftRight,
  skill: Sparkles,
  system: Settings,
  delegation: Users,
  compliance: Scale,
};

const NOTIFICATION_TYPE_LABEL: Record<NotificationType, string> = {
  governance: '治理',
  revenue: '收益',
  security: '安全',
  bridge: '桥接',
  skill: '技能',
  system: '系统',
  delegation: '委托',
  compliance: '合规',
};

const ACTIVITY_TYPE_CONFIG: Record<ActivityType, { label: string; badge: string }> = {
  liquidity: { label: '流动性', badge: 'bg-sky-500/20 text-sky-300 border-sky-500/30' },
  rate: { label: '利率', badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  price: { label: '价格', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  sync: { label: '同步', badge: 'bg-violet-500/20 text-violet-300 border-violet-500/30' },
  alert: { label: '告警', badge: 'bg-red-500/20 text-red-300 border-red-500/30' },
};

const FEATURE_LABELS: Record<string, string> = {
  connect: '连接',
  sign: '签名',
  send: '发送',
  contract: '合约',
};

const CATEGORIES = ['All', 'DEX', 'Lending', 'Oracle', 'Indexing', 'Staking', 'Identity', 'DEX Aggregator'] as const;

// ── Helpers ────────────────────────────────────────────
function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}

function formatCurrency(n: number): string {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
  return `$${n}`;
}

function formatRecords(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString();
}

function getRelativeTime(ts: string): string {
  const now = new Date('2026-03-10T15:00:00Z');
  const d = new Date(ts);
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return '刚刚';
  if (diffMins < 60) return `${diffMins}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  return `${diffDays}天前`;
}

function getFreshnessColor(freshness: string): string {
  const val = parseInt(freshness, 10);
  const unit = freshness.replace(/[0-9]/g, '');
  if (unit === 's' && val <= 5) return 'text-emerald-400';
  if (unit === 's' && val <= 60) return 'text-amber-400';
  return 'text-red-400';
}

// ── Deterministic Fallback Data ────────────────────────
const FALLBACK_DATA: EcosystemData = {
  protocols: [
    { id: 'uniswap', name: 'Uniswap V4', category: 'DEX', icon: '🦄', status: 'integrated', description: 'AFC/USDC流动性池托管，自动做市策略', integrationDate: '2026-02-20', tvl: 890000, volume24h: 45000, users: 1250 },
    { id: 'aave', name: 'Aave V3', category: 'Lending', icon: '👻', status: 'integrated', description: '分身金库AFC质押借贷，自动利率优化', integrationDate: '2026-02-25', tvl: 520000, volume24h: 18000, users: 890 },
    { id: 'chainlink', name: 'Chainlink', category: 'Oracle', icon: '🔗', status: 'integrated', description: 'AFC价格预言机，共振分外部数据源', integrationDate: '2026-01-15', tvl: 0, volume24h: 0, users: 0 },
    { id: 'the-graph', name: 'The Graph', category: 'Indexing', icon: '📊', status: 'integrated', description: '链上事件索引，分身活动Subgraph', integrationDate: '2026-01-10', tvl: 0, volume24h: 0, users: 0 },
    { id: 'lido', name: 'Lido', category: 'Staking', icon: '🏔️', status: 'pending', description: 'ETH质押收益接入分身金库', integrationDate: '', tvl: 0, volume24h: 0, users: 0 },
    { id: 'compound', name: 'Compound V3', category: 'Lending', icon: '🏦', status: 'pending', description: '备用借贷协议，利率比较策略', integrationDate: '', tvl: 0, volume24h: 0, users: 0 },
    { id: '1inch', name: '1inch', category: 'DEX Aggregator', icon: '🟣', status: 'planned', description: '最优路径兑换，Gas节省优化', integrationDate: '', tvl: 0, volume24h: 0, users: 0 },
    { id: 'ens', name: 'ENS', category: 'Identity', icon: '📛', status: 'planned', description: '分身.soul域名映射至ENS', integrationDate: '', tvl: 0, volume24h: 0, users: 0 },
  ],
  wallets: [
    { name: 'MetaMask', icon: '🦊', support: 'full', users: 8500, features: ['connect', 'sign', 'send', 'contract'] },
    { name: 'WalletConnect', icon: '📡', support: 'full', users: 6200, features: ['connect', 'sign', 'send'] },
    { name: 'Coinbase Wallet', icon: '🔵', support: 'full', users: 4100, features: ['connect', 'sign', 'send', 'contract'] },
    { name: 'Rainbow', icon: '🌈', support: 'partial', users: 2800, features: ['connect', 'sign'] },
    { name: 'Phantom', icon: '👻', support: 'planned', users: 0, features: [] },
    { name: 'Ledger', icon: '🔐', support: 'partial', users: 1500, features: ['connect', 'sign'] },
  ],
  dataAggregation: {
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
  },
  notifications: [
    { id: 'n1', type: 'governance', title: '新提案: 调整分账比例', message: '提案 #1 已进入投票期，请参与治理', priority: 'high', read: false, createdAt: '2026-03-10T14:30:00Z' },
    { id: 'n2', type: 'revenue', title: '收益到账', message: '您收到 $12.50 技能调用收益', priority: 'medium', read: false, createdAt: '2026-03-10T13:20:00Z' },
    { id: 'n3', type: 'security', title: '共振分预警', message: '分身 Alpha-7 共振分降至 55，已触发 SOFT_LIMIT', priority: 'critical', read: false, createdAt: '2026-03-10T12:15:00Z' },
    { id: 'n4', type: 'bridge', title: '跨链转账完成', message: 'Base → Ethereum: 5000 AFC 桥接成功', priority: 'low', read: true, createdAt: '2026-03-10T10:45:00Z' },
    { id: 'n5', type: 'skill', title: '技能解锁', message: 'RAG高级检索已解锁，累计收益达到阈值', priority: 'medium', read: true, createdAt: '2026-03-10T09:30:00Z' },
    { id: 'n6', type: 'system', title: '系统升级', message: 'V2.2.0 已部署至Canary环境，灰度5%', priority: 'low', read: true, createdAt: '2026-03-09T18:00:00Z' },
    { id: 'n7', type: 'delegation', title: '委托权重变更', message: '用户0x5b2a...已委托您3000 BPS技术领域权重', priority: 'medium', read: false, createdAt: '2026-03-10T11:00:00Z' },
    { id: 'n8', type: 'compliance', title: 'KYC模块已激活', message: '提案 #2 已执行，KYC合规模块现可启用', priority: 'low', read: true, createdAt: '2026-03-07T12:30:00Z' },
  ],
  ecosystemMetrics: {
    totalIntegrations: 8,
    activeIntegrations: 4,
    totalUsers: 23100,
    monthlyActiveUsers: 8400,
    transactionVolume: 12500000,
    developerCount: 156,
  },
  partnerProgram: {
    tiers: [
      { name: 'Explorer', requirements: '集成1个API端点', benefits: '基础技术支持, 社区徽章', partners: 45 },
      { name: 'Builder', requirements: '集成3+端点, 100+用户', benefits: '优先技术支持, 联合营销, API额度提升', partners: 12 },
      { name: 'Strategic', requirements: '深度定制集成, 1000+用户', benefits: '专属客户经理, 共同路线图, 优惠费率', partners: 3 },
    ],
  },
  activityFeed: [
    { protocol: 'Uniswap V4', event: 'AFC/USDC池流动性增加 $50K', timestamp: '2026-03-10T14:00:00Z', type: 'liquidity' },
    { protocol: 'Aave V3', event: 'AFC质押利率更新至 4.2% APY', timestamp: '2026-03-10T12:30:00Z', type: 'rate' },
    { protocol: 'Chainlink', event: 'AFC/USD价格更新 $2.45', timestamp: '2026-03-10T12:00:00Z', type: 'price' },
    { protocol: 'The Graph', event: 'Subgraph同步至区块 #21456789', timestamp: '2026-03-10T11:45:00Z', type: 'sync' },
    { protocol: 'AFC Bridge', event: '跨链状态同步延迟: Polygon', timestamp: '2026-03-10T10:15:00Z', type: 'alert' },
  ],
};

// ── Tab 1: Protocol Integration ────────────────────────
function ProtocolIntegrationTab({ protocols, metrics }: { protocols: Protocol[]; metrics: EcosystemMetrics }) {
  const [categoryFilter, setCategoryFilter] = useState<string>('All');

  const integrated = protocols.filter((p) => p.status === 'integrated').length;
  const pending = protocols.filter((p) => p.status === 'pending').length;
  const planned = protocols.filter((p) => p.status === 'planned').length;

  const filtered = categoryFilter === 'All' ? protocols : protocols.filter((p) => p.category === categoryFilter);

  return (
    <div className="space-y-4">
      {/* Ecosystem Metrics Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {[
          { label: '总集成数', value: metrics.totalIntegrations, icon: Puzzle, color: 'text-violet-400' },
          { label: '活跃集成', value: metrics.activeIntegrations, icon: CheckCircle2, color: 'text-emerald-400' },
          { label: '总用户', value: formatNumber(metrics.totalUsers), icon: Users, color: 'text-sky-400' },
          { label: '月活用户', value: formatNumber(metrics.monthlyActiveUsers), icon: Activity, color: 'text-amber-400' },
          { label: '交易量', value: formatCurrency(metrics.transactionVolume), icon: TrendingUp, color: 'text-emerald-400' },
          { label: '开发者', value: metrics.developerCount, icon: Zap, color: 'text-violet-400' },
        ].map((item) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border-slate-700 bg-slate-800/60 backdrop-blur-sm">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <item.icon className={cn('size-3.5', item.color)} />
                  <span className="text-[10px] text-slate-500">{item.label}</span>
                </div>
                <p className={cn('text-lg font-bold tabular-nums', item.color)}>{item.value}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Integration Stats Bar */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">协议状态:</span>
          <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-300 border-emerald-500/20">
            {integrated} 已集成
          </Badge>
          <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-300 border-amber-500/20">
            {pending} 接入中
          </Badge>
          <Badge variant="outline" className="text-[10px] bg-slate-500/10 text-slate-300 border-slate-500/20">
            {planned} 规划
          </Badge>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={cn(
              'px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors',
              categoryFilter === cat
                ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                : 'bg-slate-800/60 text-slate-400 border border-slate-700 hover:text-slate-300 hover:border-slate-600'
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Protocol Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((protocol, idx) => {
          const statusConfig = STATUS_CONFIG[protocol.status];
          const isIntegrated = protocol.status === 'integrated';
          return (
            <motion.div
              key={protocol.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.05 }}
            >
              <Card className={cn(
                'border-slate-700 bg-slate-800/60 backdrop-blur-sm overflow-hidden h-full',
                isIntegrated ? 'border-l-4 border-l-emerald-500' :
                protocol.status === 'pending' ? 'border-l-4 border-l-amber-500' :
                'border-l-4 border-l-slate-600'
              )}>
                <CardContent className="p-4 flex flex-col h-full">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">{protocol.icon}</span>
                      <div>
                        <h4 className="text-sm font-medium text-slate-100">{protocol.name}</h4>
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-slate-700/50 text-slate-300 border-slate-600 mt-0.5">
                          {protocol.category}
                        </Badge>
                      </div>
                    </div>
                    <Badge variant="outline" className={cn('text-[9px] px-1.5 py-0 shrink-0', statusConfig.badge)}>
                      <span className={cn('inline-block size-1.5 rounded-full mr-1', statusConfig.dot)} />
                      {statusConfig.label}
                    </Badge>
                  </div>

                  {/* Description */}
                  <p className="text-[11px] text-slate-400 leading-relaxed mb-3 line-clamp-2 flex-1">
                    {protocol.description}
                  </p>

                  {/* Stats (only for integrated) */}
                  {isIntegrated && (protocol.tvl > 0 || protocol.users > 0) && (
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div className="text-center">
                        <p className="text-[10px] text-slate-500">TVL</p>
                        <p className="text-xs font-semibold text-emerald-400 tabular-nums">{formatCurrency(protocol.tvl)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-slate-500">24h量</p>
                        <p className="text-xs font-semibold text-amber-400 tabular-nums">{formatCurrency(protocol.volume24h)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-slate-500">用户</p>
                        <p className="text-xs font-semibold text-sky-400 tabular-nums">{formatNumber(protocol.users)}</p>
                      </div>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between mt-auto pt-2 border-t border-slate-700/50">
                    {protocol.integrationDate ? (
                      <span className="text-[10px] text-slate-500 flex items-center gap-1">
                        <Clock className="size-3" />
                        {protocol.integrationDate}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-600">—</span>
                    )}
                    <Button
                      size="sm"
                      variant={isIntegrated ? 'default' : 'outline'}
                      className={cn(
                        'h-6 text-[10px] px-2.5',
                        isIntegrated ? 'bg-emerald-600 hover:bg-emerald-500 text-white' :
                        protocol.status === 'pending' ? 'border-amber-500/30 text-amber-400 hover:bg-amber-500/10' :
                        'border-slate-600 text-slate-400 hover:bg-slate-700/50'
                      )}
                    >
                      {isIntegrated ? '管理' : protocol.status === 'pending' ? '接入中' : '规划'}
                      {isIntegrated && <ExternalLink className="size-3 ml-1" />}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ── Tab 2: Wallet Ecosystem ────────────────────────────
function WalletEcosystemTab({ wallets }: { wallets: WalletItem[] }) {
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);

  const fullCount = wallets.filter((w) => w.support === 'full').length;
  const partialCount = wallets.filter((w) => w.support === 'partial').length;
  const plannedCount = wallets.filter((w) => w.support === 'planned').length;

  const allFeatures = ['connect', 'sign', 'send', 'contract'];

  const handleSimulateConnect = useCallback(() => {
    setConnecting(true);
    const timer = setTimeout(() => {
      setConnecting(false);
      setConnected(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="space-y-4">
      {/* Wallet Support Overview */}
      <div className="flex items-center gap-4">
        <span className="text-xs text-slate-400">钱包支持:</span>
        <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-300 border-emerald-500/20">
          <Check className="size-2.5 mr-0.5" /> {fullCount} 完整
        </Badge>
        <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-300 border-amber-500/20">
          {partialCount} 部分
        </Badge>
        <Badge variant="outline" className="text-[10px] bg-slate-500/10 text-slate-300 border-slate-500/20">
          {plannedCount} 计划
        </Badge>
      </div>

      {/* Wallet Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {wallets.map((wallet, idx) => {
          const supportConfig = SUPPORT_CONFIG[wallet.support];
          return (
            <motion.div
              key={wallet.name}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.05 }}
            >
              <Card className={cn(
                'border-slate-700 bg-slate-800/60 backdrop-blur-sm overflow-hidden',
                wallet.support === 'full' ? 'border-l-4 border-l-emerald-500' :
                wallet.support === 'partial' ? 'border-l-4 border-l-amber-500' :
                'border-l-4 border-l-slate-600'
              )}>
                <CardContent className="p-4 space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">{wallet.icon}</span>
                      <div>
                        <h4 className="text-sm font-medium text-slate-100">{wallet.name}</h4>
                        {wallet.users > 0 && (
                          <p className="text-[10px] text-slate-500">{formatNumber(wallet.users)} 用户</p>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline" className={cn('text-[9px] px-1.5 py-0 shrink-0', supportConfig.badge)}>
                      <span className={cn('inline-block size-1.5 rounded-full mr-1', supportConfig.dot)} />
                      {supportConfig.label}
                    </Badge>
                  </div>

                  {/* Feature Tags */}
                  <div className="flex flex-wrap gap-1.5">
                    {allFeatures.map((feature) => {
                      const supported = wallet.features.includes(feature);
                      return (
                        <div
                          key={feature}
                          className={cn(
                            'flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] border',
                            supported
                              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                              : 'bg-slate-700/30 text-slate-500 border-slate-700/50'
                          )}
                        >
                          {supported ? <Check className="size-2.5" /> : <X className="size-2.5" />}
                          {FEATURE_LABELS[feature]}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Connect Wallet Demo Area */}
      <Card className="border-slate-700 bg-slate-800/60 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                'flex size-10 items-center justify-center rounded-lg',
                connected ? 'bg-emerald-500/15' : 'bg-slate-700/50'
              )}>
                <Wallet className={cn('size-5', connected ? 'text-emerald-400' : 'text-slate-500')} />
              </div>
              <div>
                <h4 className="text-sm font-medium text-slate-100">
                  {connected ? '钱包已连接' : '连接钱包'}
                </h4>
                <p className="text-[11px] text-slate-400">
                  {connected ? '模拟连接成功 — MetaMask (0x7f3a...c4d2)' : '点击按钮模拟钱包连接'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {connected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="flex items-center gap-1.5"
                >
                  <span className="inline-block size-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] text-emerald-400">已连接</span>
                </motion.div>
              )}
              <Button
                onClick={connected ? () => setConnected(false) : handleSimulateConnect}
                disabled={connecting}
                size="sm"
                className={cn(
                  'h-8 text-xs px-4',
                  connected
                    ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                )}
              >
                {connecting ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="size-3.5 border-2 border-white/30 border-t-white rounded-full"
                    />
                    连接中...
                  </>
                ) : connected ? '断开' : '模拟连接'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Tab 3: Data Aggregation ────────────────────────────
function DataAggregationTab({ dataAggregation, activityFeed }: { dataAggregation: DataAggregation; activityFeed: ActivityFeedItem[] }) {
  return (
    <div className="space-y-4">
      {/* Data Sources Table */}
      <div>
        <h4 className="text-xs font-medium text-slate-300 mb-2 flex items-center gap-1.5">
          <Database className="size-3.5 text-violet-400" />
          数据源
        </h4>
        <Card className="border-slate-700 bg-slate-800/60 backdrop-blur-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="text-left px-4 py-2.5 text-slate-400 font-medium">数据源</th>
                  <th className="text-left px-4 py-2.5 text-slate-400 font-medium">提供商</th>
                  <th className="text-right px-4 py-2.5 text-slate-400 font-medium">记录数</th>
                  <th className="text-right px-4 py-2.5 text-slate-400 font-medium">新鲜度</th>
                  <th className="text-center px-4 py-2.5 text-slate-400 font-medium">状态</th>
                </tr>
              </thead>
              <tbody>
                {dataAggregation.sources.map((source, idx) => (
                  <motion.tr
                    key={source.name}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: idx * 0.04 }}
                    className="border-b border-slate-700/30 last:border-b-0 hover:bg-slate-700/20 transition-colors"
                  >
                    <td className="px-4 py-2.5 text-slate-200 font-medium">{source.name}</td>
                    <td className="px-4 py-2.5 text-slate-400">{source.provider}</td>
                    <td className="px-4 py-2.5 text-right text-slate-300 tabular-nums">{formatRecords(source.records)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <span className={cn('tabular-nums font-medium', getFreshnessColor(source.freshness))}>
                        {source.freshness}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <Badge variant="outline" className={cn(
                        'text-[9px] px-1.5 py-0',
                        source.status === 'active'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      )}>
                        {source.status === 'active' ? '活跃' : '延迟'}
                      </Badge>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Data Pipeline Visualization */}
      <div>
        <h4 className="text-xs font-medium text-slate-300 mb-2 flex items-center gap-1.5">
          <Radio className="size-3.5 text-emerald-400" />
          数据管道
        </h4>
        <Card className="border-slate-700 bg-slate-800/60 backdrop-blur-sm p-4">
          <div className="flex items-center gap-0 overflow-x-auto pb-2">
            {dataAggregation.pipeline.map((stage, idx) => (
              <div key={stage.stage} className="flex items-center flex-shrink-0">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: idx * 0.1 }}
                  className="flex flex-col items-center gap-1.5 min-w-[120px]"
                >
                  <div className="flex items-center justify-center">
                    <div className={cn(
                      'flex size-10 items-center justify-center rounded-full border-2',
                      stage.status === 'running' ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-slate-600/50 bg-slate-700/30'
                    )}>
                      {stage.status === 'running' ? (
                        <motion.div
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                        >
                          <CheckCircle2 className="size-5 text-emerald-400" />
                        </motion.div>
                      ) : (
                        <CircleDot className="size-5 text-slate-500" />
                      )}
                    </div>
                  </div>
                  <p className="text-[10px] font-medium text-slate-200 text-center">{stage.stage}</p>
                  <p className="text-[9px] text-emerald-400 tabular-nums">{stage.throughput}</p>
                  <p className="text-[9px] text-slate-500 tabular-nums">{stage.latency}</p>
                </motion.div>
                {idx < dataAggregation.pipeline.length - 1 && (
                  <ArrowRight className="size-4 text-slate-600 mx-1 flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Activity Feed */}
      <div>
        <h4 className="text-xs font-medium text-slate-300 mb-2 flex items-center gap-1.5">
          <Activity className="size-3.5 text-amber-400" />
          协议活动
        </h4>
        <Card className="border-slate-700 bg-slate-800/60 backdrop-blur-sm overflow-hidden">
          <ScrollArea className="max-h-64">
            <div className="divide-y divide-slate-700/30">
              {activityFeed.map((item, idx) => {
                const typeConfig = ACTIVITY_TYPE_CONFIG[item.type];
                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: idx * 0.05 }}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-700/20 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Badge variant="outline" className={cn('text-[9px] px-1.5 py-0 shrink-0', typeConfig.badge)}>
                        {typeConfig.label}
                      </Badge>
                      <span className="text-[11px] text-slate-300 truncate">
                        <span className="text-slate-400 font-medium">{item.protocol}</span> — {item.event}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 shrink-0 tabular-nums">{getRelativeTime(item.timestamp)}</span>
                  </motion.div>
                );
              })}
            </div>
          </ScrollArea>
        </Card>
      </div>
    </div>
  );
}

// ── Tab 4: Notification Center ─────────────────────────
function NotificationCenterTab({
  notifications: initialNotifications,
  partnerProgram,
}: {
  notifications: NotificationItem[];
  partnerProgram: PartnerProgram;
}) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [notifPrefs, setNotifPrefs] = useState<Record<NotificationType, boolean>>({
    governance: true,
    revenue: true,
    security: true,
    bridge: true,
    skill: true,
    system: false,
    delegation: true,
    compliance: false,
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const filtered = priorityFilter === 'all'
    ? notifications
    : notifications.filter((n) => n.priority === priorityFilter);

  const handleMarkRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  }, []);

  const handleMarkAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const handleDismiss = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const togglePref = useCallback((type: NotificationType) => {
    setNotifPrefs((prev) => ({ ...prev, [type]: !prev[type] }));
  }, []);

  const priorityFilters: { value: string; label: string; badge: string }[] = [
    { value: 'all', label: '全部', badge: 'bg-slate-500/10 text-slate-300 border-slate-500/20' },
    { value: 'critical', label: '紧急', badge: 'bg-red-500/10 text-red-300 border-red-500/20' },
    { value: 'high', label: '高', badge: 'bg-amber-500/10 text-amber-300 border-amber-500/20' },
    { value: 'medium', label: '中', badge: 'bg-sky-500/10 text-sky-300 border-sky-500/20' },
    { value: 'low', label: '低', badge: 'bg-slate-500/10 text-slate-300 border-slate-500/20' },
  ];

  const allNotifTypes: NotificationType[] = ['governance', 'revenue', 'security', 'bridge', 'skill', 'system', 'delegation', 'compliance'];

  return (
    <div className="space-y-4">
      {/* Notification Preferences */}
      <Card className="border-slate-700 bg-slate-800/60 backdrop-blur-sm">
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
            <Settings className="size-3.5 text-slate-400" />
            通知偏好
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {allNotifTypes.map((type) => {
              const TypeIcon = NOTIFICATION_TYPE_ICON[type];
              const enabled = notifPrefs[type];
              return (
                <div key={type} className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md bg-slate-700/30">
                  <div className="flex items-center gap-1.5">
                    <TypeIcon className={cn('size-3', enabled ? 'text-slate-300' : 'text-slate-500')} />
                    <span className={cn('text-[10px]', enabled ? 'text-slate-300' : 'text-slate-500')}>
                      {NOTIFICATION_TYPE_LABEL[type]}
                    </span>
                  </div>
                  <Switch
                    checked={enabled}
                    onCheckedChange={() => togglePref(type)}
                    className={cn(enabled ? 'data-[state=checked]:bg-emerald-500' : '')}
                  />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Priority Filter + Unread Count + Mark All Read */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {priorityFilters.map((f) => (
            <button
              key={f.value}
              onClick={() => setPriorityFilter(f.value)}
              className={cn(
                'px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors',
                priorityFilter === f.value
                  ? cn(f.badge, 'border')
                  : 'bg-slate-800/60 text-slate-400 border border-slate-700 hover:text-slate-300'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Badge variant="outline" className="text-[10px] bg-red-500/10 text-red-300 border-red-500/20">
              {unreadCount} 未读
            </Badge>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0}
            className="h-6 text-[10px] px-2.5 border-slate-600 text-slate-400 hover:text-slate-300 hover:border-slate-500"
          >
            <Check className="size-3 mr-1" />
            全部标为已读
          </Button>
        </div>
      </div>

      {/* Notification List */}
      <Card className="border-slate-700 bg-slate-800/60 backdrop-blur-sm overflow-hidden">
        <ScrollArea className="max-h-[400px]">
          <div className="divide-y divide-slate-700/30">
            <AnimatePresence>
              {filtered.map((notif) => {
                const priorityConfig = PRIORITY_CONFIG[notif.priority];
                const TypeIcon = NOTIFICATION_TYPE_ICON[notif.type];
                return (
                  <motion.div
                    key={notif.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className={cn(
                      'flex items-start gap-3 px-4 py-3 border-l-4 transition-colors',
                      priorityConfig.border,
                      notif.read ? 'bg-slate-800/30' : 'bg-slate-800/60'
                    )}
                  >
                    {/* Type Icon */}
                    <div className={cn(
                      'flex size-7 shrink-0 items-center justify-center rounded-lg mt-0.5',
                      notif.read ? 'bg-slate-700/30' : 'bg-slate-700/50'
                    )}>
                      <TypeIcon className={cn('size-3.5', notif.read ? 'text-slate-500' : priorityConfig.icon)} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h5 className={cn(
                          'text-xs',
                          notif.read ? 'text-slate-400 font-normal' : 'text-slate-100 font-medium'
                        )}>
                          {notif.title}
                        </h5>
                        <Badge variant="outline" className={cn('text-[8px] px-1 py-0', priorityConfig.badge)}>
                          {priorityConfig.label}
                        </Badge>
                        <Badge variant="outline" className="text-[8px] px-1 py-0 bg-slate-700/50 text-slate-400 border-slate-600">
                          {NOTIFICATION_TYPE_LABEL[notif.type]}
                        </Badge>
                      </div>
                      <p className={cn(
                        'text-[11px] mt-0.5',
                        notif.read ? 'text-slate-500' : 'text-slate-400'
                      )}>
                        {notif.message}
                      </p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-[10px] text-slate-500 flex items-center gap-1">
                          <Clock className="size-2.5" />
                          {getRelativeTime(notif.createdAt)}
                        </span>
                        {!notif.read && (
                          <button
                            onClick={() => handleMarkRead(notif.id)}
                            className="text-[10px] text-sky-400 hover:text-sky-300 transition-colors"
                          >
                            标记已读
                          </button>
                        )}
                        <button
                          onClick={() => handleDismiss(notif.id)}
                          className="text-[10px] text-slate-500 hover:text-slate-400 transition-colors"
                        >
                          忽略
                        </button>
                      </div>
                    </div>

                    {/* Read/Unread Indicator */}
                    {!notif.read && (
                      <span className="inline-block size-2 rounded-full bg-sky-400 shrink-0 mt-1.5" />
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </ScrollArea>
      </Card>

      {/* Partner Program */}
      <div>
        <h4 className="text-xs font-medium text-slate-300 mb-2 flex items-center gap-1.5">
          <Sparkles className="size-3.5 text-violet-400" />
          合作伙伴计划
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {partnerProgram.tiers.map((tier, idx) => {
            const tierColors = [
              { border: 'border-violet-500/30', bg: 'bg-violet-500/5', icon: 'text-violet-400', ring: 'ring-violet-500/20' },
              { border: 'border-emerald-500/30', bg: 'bg-emerald-500/5', icon: 'text-emerald-400', ring: 'ring-emerald-500/20' },
              { border: 'border-amber-500/30', bg: 'bg-amber-500/5', icon: 'text-amber-400', ring: 'ring-amber-500/20' },
            ];
            const color = tierColors[idx % tierColors.length];
            return (
              <motion.div
                key={tier.name}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.1 }}
              >
                <Card className={cn('border-slate-700 bg-slate-800/60 backdrop-blur-sm', color.border, 'border-t-2')}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h5 className={cn('text-sm font-semibold', color.icon)}>{tier.name}</h5>
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-slate-700/50 text-slate-300 border-slate-600">
                        {tier.partners} 合作方
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <p className="text-[10px] text-slate-500 mb-0.5">要求</p>
                        <p className="text-[11px] text-slate-300">{tier.requirements}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 mb-0.5">权益</p>
                        <p className="text-[11px] text-slate-300">{tier.benefits}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className={cn(
                        'w-full h-7 text-[10px]',
                        color.border,
                        color.icon,
                        'hover:bg-slate-700/50'
                      )}
                    >
                      申请加入
                      <ChevronRight className="size-3 ml-1" />
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────
export default function EcosystemHub() {
  const [data, setData] = useState<EcosystemData>(FALLBACK_DATA);
  const [activeTab, setActiveTab] = useState('protocols');

  useEffect(() => {
    fetch('/api/ecosystem')
      .then((res) => res.ok ? res.json() : null)
      .then((json) => {
        if (json) setData(json as EcosystemData);
      })
      .catch(() => {
        // Keep fallback data
      });
  }, []);

  const unreadCount = data.notifications.filter((n) => !n.read).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="border-slate-700 bg-slate-800/80 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <Puzzle className="size-4 text-violet-400" />
              生态集成中心
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[9px] bg-emerald-500/10 text-emerald-300 border-emerald-500/20">
                <span className="inline-block size-1.5 rounded-full bg-emerald-400 mr-1 animate-pulse" />
                {data.ecosystemMetrics.activeIntegrations} 活跃
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-slate-900/50 border border-slate-700/50 mb-4">
              <TabsTrigger value="protocols" className="data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-300 text-[11px] gap-1.5">
                <Puzzle className="size-3.5" />
                协议集成
              </TabsTrigger>
              <TabsTrigger value="wallets" className="data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-300 text-[11px] gap-1.5">
                <Wallet className="size-3.5" />
                钱包生态
              </TabsTrigger>
              <TabsTrigger value="data" className="data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-300 text-[11px] gap-1.5">
                <Database className="size-3.5" />
                数据聚合
              </TabsTrigger>
              <TabsTrigger value="notifications" className="data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-300 text-[11px] gap-1.5 relative">
                <Bell className="size-3.5" />
                通知中心
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="protocols">
              <AnimatePresence mode="wait">
                <motion.div
                  key="protocols"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  <ProtocolIntegrationTab protocols={data.protocols} metrics={data.ecosystemMetrics} />
                </motion.div>
              </AnimatePresence>
            </TabsContent>

            <TabsContent value="wallets">
              <AnimatePresence mode="wait">
                <motion.div
                  key="wallets"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  <WalletEcosystemTab wallets={data.wallets} />
                </motion.div>
              </AnimatePresence>
            </TabsContent>

            <TabsContent value="data">
              <AnimatePresence mode="wait">
                <motion.div
                  key="data"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  <DataAggregationTab dataAggregation={data.dataAggregation} activityFeed={data.activityFeed} />
                </motion.div>
              </AnimatePresence>
            </TabsContent>

            <TabsContent value="notifications">
              <AnimatePresence mode="wait">
                <motion.div
                  key="notifications"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  <NotificationCenterTab notifications={data.notifications} partnerProgram={data.partnerProgram} />
                </motion.div>
              </AnimatePresence>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </motion.div>
  );
}
