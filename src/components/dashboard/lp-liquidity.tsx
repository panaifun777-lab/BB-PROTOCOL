'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import {
  Droplets,
  TrendingUp,
  Flame,
  Coins,
  BarChart3,
  ArrowRight,
  ArrowDownRight,
  ArrowUpRight,
  Users,
  Clock,
  Wallet,
  Lock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useI18n } from '@/hooks/use-i18n';

// ── Types ─────────────────────────────────────────────────────

interface LiquidityPool {
  pair: string;
  totalLiquidity: number;
  afcReserve: number;
  usdcReserve: number;
  afcPrice: number;
  priceChange24h: number;
  volume24h: number;
  fees24h: number;
  feeRate: number;
}

interface TokenEconomics {
  totalSupply: number;
  circulatingSupply: number;
  burnRate: number;
  buybackRate: number;
  valueCaptureRate: number;
  monthlyBurn: Array<{ month: string; burned: number }>;
}

interface StakingInfo {
  totalStaked: number;
  apy: number;
  stakers: number;
  minStake: number;
  lockPeriod: string;
  rewardsDistributed: number;
}

interface DepthDataPoint {
  price: number;
  bidLiquidity: number;
  askLiquidity: number;
}

interface LPTransaction {
  id: string;
  type: 'add_liquidity' | 'remove_liquidity' | 'swap';
  amountAfc: number;
  amountUsdc: number;
  direction?: 'buy' | 'sell';
  txHash: string;
  createdAt: string;
}

interface LPLiquidityProps {
  pool?: LiquidityPool;
  tokenEconomics?: TokenEconomics;
  staking?: StakingInfo;
  depthData?: DepthDataPoint[];
  transactions?: LPTransaction[];
}

// ── Default Mock Data ─────────────────────────────────────────

const DEFAULT_POOL: LiquidityPool = {
  pair: 'AFC/USDC',
  totalLiquidity: 52847.50,
  afcReserve: 264237500,
  usdcReserve: 26423.75,
  afcPrice: 0.10,
  priceChange24h: 2.5,
  volume24h: 12450,
  fees24h: 62.25,
  feeRate: 0.003,
};

const DEFAULT_TOKEN_ECONOMICS: TokenEconomics = {
  totalSupply: 1000000000,
  circulatingSupply: 20000000,
  burnRate: 0.05,
  buybackRate: 0.20,
  valueCaptureRate: 0.157,
  monthlyBurn: [
    { month: '2025-10', burned: 12000 },
    { month: '2025-11', burned: 18500 },
    { month: '2025-12', burned: 24000 },
    { month: '2026-01', burned: 31000 },
    { month: '2026-02', burned: 38000 },
    { month: '2026-03', burned: 45000 },
  ],
};

const DEFAULT_STAKING: StakingInfo = {
  totalStaked: 5200000,
  apy: 12.5,
  stakers: 342,
  minStake: 1000,
  lockPeriod: 'liquidity.lockPeriod30d',
  rewardsDistributed: 650000,
};

const DEFAULT_DEPTH_DATA: DepthDataPoint[] = (() => {
  const data: DepthDataPoint[] = [];
  const basePrice = 0.10;
  for (let i = -20; i <= 20; i++) {
    const price = basePrice + i * 0.002;
    const depth = 50000 * Math.exp(-Math.abs(i) * 0.15);
    data.push({
      price: Math.round(price * 1000) / 1000,
      bidLiquidity: i <= 0 ? Math.round(depth) : 0,
      askLiquidity: i >= 0 ? Math.round(depth) : 0,
    });
  }
  return data;
})();

const DEFAULT_TRANSACTIONS: LPTransaction[] = [
  { id: 'lp1', type: 'add_liquidity', amountAfc: 50000, amountUsdc: 5000, txHash: '0xlp01...ab12', createdAt: '2026-03-04T14:30:00Z' },
  { id: 'lp2', type: 'swap', amountAfc: 10000, amountUsdc: 1000, direction: 'buy', txHash: '0xlp02...cd34', createdAt: '2026-03-04T13:15:00Z' },
  { id: 'lp3', type: 'remove_liquidity', amountAfc: 20000, amountUsdc: 2000, txHash: '0xlp03...ef56', createdAt: '2026-03-04T11:00:00Z' },
  { id: 'lp4', type: 'swap', amountAfc: 5000, amountUsdc: 500, direction: 'sell', txHash: '0xlp04...gh78', createdAt: '2026-03-04T09:45:00Z' },
  { id: 'lp5', type: 'add_liquidity', amountAfc: 100000, amountUsdc: 10000, txHash: '0xlp05...ij90', createdAt: '2026-03-03T16:00:00Z' },
];

// ── Helpers ───────────────────────────────────────────────────

function formatNumber(n: number, decimals = 0): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(decimals > 0 ? 1 : 0)}K`;
  return n.toFixed(decimals);
}

function formatUSD(n: number): string {
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

function formatPct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

// ── Sub-Components ────────────────────────────────────────────

function MetricCard({
  icon,
  label,
  value,
  subValue,
  color = 'violet',
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue?: string;
  color?: 'violet' | 'emerald' | 'blue' | 'amber' | 'red';
}) {
  const colorMap = {
    violet: 'from-violet-500/10 to-violet-500/5 border-violet-500/20',
    emerald: 'from-emerald-500/10 to-emerald-500/5 border-emerald-500/20',
    blue: 'from-blue-500/10 to-blue-500/5 border-blue-500/20',
    amber: 'from-amber-500/10 to-amber-500/5 border-amber-500/20',
    red: 'from-red-500/10 to-red-500/5 border-red-500/20',
  };
  const iconColorMap = {
    violet: 'text-violet-400',
    emerald: 'text-emerald-400',
    blue: 'text-blue-400',
    amber: 'text-amber-400',
    red: 'text-red-400',
  };

  return (
    <div className={cn(
      'rounded-xl border bg-gradient-to-br p-3 space-y-1',
      colorMap[color]
    )}>
      <div className="flex items-center gap-1.5">
        <span className={iconColorMap[color]}>{icon}</span>
        <span className="text-[10px] text-slate-400 uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-lg font-bold text-white">{value}</p>
      {subValue && (
        <p className="text-[11px] text-slate-400">{subValue}</p>
      )}
    </div>
  );
}

function RevenueFlowDiagram({ t }: { t: (key: string, params?: Record<string, string | number>) => string }) {
  const flowItems = [
    {
      id: 'user',
      label: t('liquidity.flowUserPay'),
      icon: <Wallet className="h-4 w-4" />,
      color: 'bg-blue-500/15 border-blue-500/30 text-blue-300',
      iconColor: 'text-blue-400',
    },
    {
      id: 'human',
      label: t('liquidity.flowHuman70'),
      icon: <Users className="h-4 w-4" />,
      color: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
      iconColor: 'text-emerald-400',
    },
    {
      id: 'treasury',
      label: t('liquidity.flowTreasury20'),
      icon: <Coins className="h-4 w-4" />,
      color: 'bg-violet-500/15 border-violet-500/30 text-violet-300',
      iconColor: 'text-violet-400',
    },
    {
      id: 'protocol',
      label: t('liquidity.flowProtocolLP10'),
      icon: <Droplets className="h-4 w-4" />,
      color: 'bg-amber-500/15 border-amber-500/30 text-amber-300',
      iconColor: 'text-amber-400',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Main Split Flow */}
      <div className="flex flex-col items-center gap-3">
        {/* Source */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className={cn(
            'flex items-center gap-2 rounded-xl border px-4 py-2.5',
            flowItems[0].color
          )}
        >
          <span className={flowItems[0].iconColor}>{flowItems[0].icon}</span>
          <span className="text-sm font-medium">{flowItems[0].label}</span>
        </motion.div>

        {/* Arrow down */}
        <div className="flex flex-col items-center">
          <ArrowDownRight className="h-4 w-4 text-slate-500 rotate-[135deg]" />
          <span className="text-[9px] text-slate-500 mt-0.5">{t('liquidity.autoSplit')}</span>
        </div>

        {/* Three destinations */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
          {flowItems.slice(1).map((item, idx) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + idx * 0.1 }}
              className={cn(
                'flex flex-col items-center gap-1.5 rounded-xl border px-3 py-2.5 text-center',
                item.color
              )}
            >
              <span className={item.iconColor}>{item.icon}</span>
              <span className="text-xs font-medium">{item.label}</span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Secondary effects */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
          className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-3"
        >
          <div className="flex items-center gap-2 mb-1.5">
            <Coins className="h-3.5 w-3.5 text-violet-400" />
            <span className="text-xs font-medium text-violet-300">{t('liquidity.treasuryBuyback')}</span>
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <span className="text-slate-400">{t('liquidity.afcBuyback')}</span>
            <ArrowRight className="h-3 w-3 text-violet-400" />
            <span className="text-violet-300 font-medium">{t('liquidity.deflationPressure')}</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.7 }}
          className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3"
        >
          <div className="flex items-center gap-2 mb-1.5">
            <Droplets className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-xs font-medium text-amber-300">{t('liquidity.protocolLPInjection')}</span>
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <span className="text-slate-400">{t('liquidity.increaseDepth')}</span>
            <ArrowRight className="h-3 w-3 text-amber-400" />
            <span className="text-amber-300 font-medium">{t('liquidity.stabilizePrice')}</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// ── Custom Tooltip for Depth Chart ────────────────────────────

function DepthChartTooltip({ active, payload, label, t }: {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string; color: string }>;
  label?: number;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800/95 backdrop-blur-sm px-3 py-2 text-xs shadow-xl">
      <p className="text-slate-300 font-medium mb-1">{t('liquidity.price')}: ${label?.toFixed(3)}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-slate-400">
          <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: entry.color }} />
          {entry.dataKey === 'bidLiquidity' ? t('liquidity.bidDepth') : t('liquidity.askDepth')}: {formatNumber(entry.value)}
        </p>
      ))}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────

export default function LPLiquidity({
  pool = DEFAULT_POOL,
  tokenEconomics = DEFAULT_TOKEN_ECONOMICS,
  staking = DEFAULT_STAKING,
  depthData = DEFAULT_DEPTH_DATA,
  transactions = DEFAULT_TRANSACTIONS,
}: LPLiquidityProps) {
  const { t } = useI18n();

  const circulatingPct = useMemo(
    () => ((tokenEconomics.circulatingSupply / tokenEconomics.totalSupply) * 100),
    [tokenEconomics]
  );

  const stakingPct = useMemo(
    () => ((staking.totalStaked / tokenEconomics.circulatingSupply) * 100),
    [staking, tokenEconomics]
  );

  const maxDepth = useMemo(
    () => Math.max(...depthData.map(d => Math.max(d.bidLiquidity, d.askLiquidity))),
    [depthData]
  );

  const getTimeAgo = (iso: string): string => {
    const diff = Date.now() - new Date(iso).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return t('liquidity.justNow');
    if (hours < 24) return t('liquidity.hoursAgo', { count: hours });
    const days = Math.floor(hours / 24);
    return t('liquidity.daysAgo', { count: days });
  };

  const getTxTypeLabel = (type: LPTransaction['type']): string => {
    switch (type) {
      case 'add_liquidity': return t('liquidity.addLiquidity');
      case 'remove_liquidity': return t('liquidity.removeLiquidity');
      case 'swap': return t('liquidity.swap');
    }
  };

  const getTxTypeStyle = (type: LPTransaction['type'], direction?: 'buy' | 'sell'): string => {
    if (type === 'add_liquidity') return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30';
    if (type === 'remove_liquidity') return 'bg-red-500/10 text-red-300 border-red-500/30';
    if (direction === 'buy') return 'bg-blue-500/10 text-blue-300 border-blue-500/30';
    return 'bg-amber-500/10 text-amber-300 border-amber-500/30';
  };

  const getTxIcon = (type: LPTransaction['type'], direction?: 'buy' | 'sell') => {
    if (type === 'add_liquidity') return <ArrowUpRight className="h-3.5 w-3.5 text-emerald-400" />;
    if (type === 'remove_liquidity') return <ArrowDownRight className="h-3.5 w-3.5 text-red-400" />;
    if (direction === 'buy') return <ArrowUpRight className="h-3.5 w-3.5 text-blue-400" />;
    return <ArrowDownRight className="h-3.5 w-3.5 text-amber-400" />;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="border-slate-700/50 bg-[#1E293B] text-slate-100 shadow-xl shadow-black/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Droplets className="h-4 w-4 text-violet-400" />
                {t('liquidity.title')}
              </CardTitle>
              <CardDescription className="text-xs text-slate-400 mt-0.5">
                {t('liquidity.subtitle')}
              </CardDescription>
            </div>
            <Badge
              variant="outline"
              className="bg-emerald-500/10 text-emerald-300 border-emerald-500/30 text-[10px]"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
              {t('liquidity.active')}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="bg-slate-800/80 h-8 p-0.5">
              <TabsTrigger
                value="overview"
                className="text-[11px] px-3 py-1 data-[state=active]:bg-slate-700 data-[state=active]:text-violet-300"
              >
                <BarChart3 className="h-3 w-3 mr-1" />
                {t('liquidity.tabOverview')}
              </TabsTrigger>
              <TabsTrigger
                value="depth"
                className="text-[11px] px-3 py-1 data-[state=active]:bg-slate-700 data-[state=active]:text-violet-300"
              >
                <Droplets className="h-3 w-3 mr-1" />
                {t('liquidity.tabDepth')}
              </TabsTrigger>
              <TabsTrigger
                value="tokenomics"
                className="text-[11px] px-3 py-1 data-[state=active]:bg-slate-700 data-[state=active]:text-violet-300"
              >
                <Coins className="h-3 w-3 mr-1" />
                {t('liquidity.tabTokenomics')}
              </TabsTrigger>
              <TabsTrigger
                value="staking"
                className="text-[11px] px-3 py-1 data-[state=active]:bg-slate-700 data-[state=active]:text-violet-300"
              >
                <Lock className="h-3 w-3 mr-1" />
                {t('liquidity.tabStaking')}
              </TabsTrigger>
            </TabsList>

            {/* ── Overview Tab ──────────────────────────── */}
            <TabsContent value="overview" className="mt-4 space-y-4">
              {/* Pool Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <MetricCard
                  icon={<Droplets className="h-3.5 w-3.5" />}
                  label={t('liquidity.totalLiquidity')}
                  value={formatUSD(pool.totalLiquidity)}
                  subValue={`${formatNumber(pool.afcReserve, 0)} AFC`}
                  color="violet"
                />
                <MetricCard
                  icon={<TrendingUp className="h-3.5 w-3.5" />}
                  label={t('liquidity.afcPrice')}
                  value={`$${pool.afcPrice.toFixed(2)}`}
                  subValue={
                    pool.priceChange24h > 0
                      ? `+${pool.priceChange24h.toFixed(1)}% 24h`
                      : `${pool.priceChange24h.toFixed(1)}% 24h`
                  }
                  color={pool.priceChange24h >= 0 ? 'emerald' : 'red'}
                />
                <MetricCard
                  icon={<BarChart3 className="h-3.5 w-3.5" />}
                  label={t('liquidity.volume24h')}
                  value={formatUSD(pool.volume24h)}
                  subValue={`${t('liquidity.feeRate')} ${(pool.feeRate * 100).toFixed(1)}%`}
                  color="blue"
                />
                <MetricCard
                  icon={<Coins className="h-3.5 w-3.5" />}
                  label={t('liquidity.fees24h')}
                  value={formatUSD(pool.fees24h)}
                  subValue={t('liquidity.lpRevenueSource')}
                  color="amber"
                />
              </div>

              {/* Revenue Flow */}
              <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <ArrowRight className="h-4 w-4 text-violet-400" />
                  <span className="text-sm font-medium text-slate-200">{t('liquidity.revenueFlow')}</span>
                </div>
                <RevenueFlowDiagram t={t} />
              </div>

              {/* Recent Transactions */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-medium">{t('liquidity.recentLiquidityEvents')}</span>
                  <span className="text-[10px] text-slate-500">{t('liquidity.txCount', { count: transactions.length })}</span>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                  {transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between rounded-lg bg-slate-800/60 px-3 py-2 hover:bg-slate-700/60 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {getTxIcon(tx.type, tx.direction)}
                        <div>
                          <div className="flex items-center gap-1.5">
                            <Badge
                              variant="outline"
                              className={cn('text-[10px] px-1.5 py-0', getTxTypeStyle(tx.type, tx.direction))}
                            >
                              {getTxTypeLabel(tx.type)}
                            </Badge>
                            {tx.direction && (
                              <span className={cn(
                                'text-[10px] font-medium',
                                tx.direction === 'buy' ? 'text-blue-300' : 'text-amber-300'
                              )}>
                                {tx.direction === 'buy' ? t('liquidity.buy') : t('liquidity.sell')}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5">{tx.txHash}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium text-white">
                          {formatNumber(tx.amountAfc)} AFC
                        </p>
                        <p className="text-[10px] text-slate-500 flex items-center justify-end gap-1">
                          <Clock className="h-2.5 w-2.5" />
                          {getTimeAgo(tx.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* ── Depth Chart Tab ──────────────────────── */}
            <TabsContent value="depth" className="mt-4 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border border-slate-700/50 bg-slate-800/40 p-2.5 text-center">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">{t('liquidity.currentPrice')}</p>
                  <p className="text-sm font-bold text-white">${pool.afcPrice.toFixed(3)}</p>
                </div>
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2.5 text-center">
                  <p className="text-[10px] text-emerald-400 uppercase tracking-wider">{t('liquidity.bidDepth')}</p>
                  <p className="text-sm font-bold text-emerald-300">{formatUSD(maxDepth * pool.afcPrice)}</p>
                </div>
                <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-2.5 text-center">
                  <p className="text-[10px] text-red-400 uppercase tracking-wider">{t('liquidity.askDepth')}</p>
                  <p className="text-sm font-bold text-red-300">{formatUSD(maxDepth * pool.afcPrice)}</p>
                </div>
              </div>

              <div className="h-64 sm:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={depthData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="bidGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="askGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis
                      dataKey="price"
                      tick={{ fontSize: 10, fill: '#94a3b8' }}
                      axisLine={{ stroke: '#334155' }}
                      tickLine={false}
                      tickFormatter={(v: number) => `$${v.toFixed(3)}`}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: '#94a3b8' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v: number) => formatNumber(v)}
                    />
                    <Tooltip content={<DepthChartTooltip t={t} />} />
                    <ReferenceLine
                      x={pool.afcPrice}
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      strokeDasharray="4 2"
                      label={{
                        value: `$${pool.afcPrice}`,
                        position: 'top',
                        fill: '#8b5cf6',
                        fontSize: 11,
                        fontWeight: 'bold',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="bidLiquidity"
                      stroke="#10b981"
                      strokeWidth={2}
                      fill="url(#bidGradient)"
                      dot={false}
                      activeDot={{ r: 4, fill: '#10b981' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="askLiquidity"
                      stroke="#ef4444"
                      strokeWidth={2}
                      fill="url(#askGradient)"
                      dot={false}
                      activeDot={{ r: 4, fill: '#ef4444' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="flex items-center justify-center gap-6 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-1.5 rounded-full bg-emerald-500" />
                  <span className="text-slate-400">{t('liquidity.bidDepthLabel')}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-1.5 rounded-full bg-red-500" />
                  <span className="text-slate-400">{t('liquidity.askDepthLabel')}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-violet-500" style={{ borderTop: '2px dashed #8b5cf6' }} />
                  <span className="text-slate-400">{t('liquidity.currentPrice')}</span>
                </div>
              </div>
            </TabsContent>

            {/* ── Tokenomics Tab ───────────────────────── */}
            <TabsContent value="tokenomics" className="mt-4 space-y-4">
              {/* Key Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <MetricCard
                  icon={<Coins className="h-3.5 w-3.5" />}
                  label={t('liquidity.totalSupply')}
                  value={`${formatNumber(tokenEconomics.totalSupply)} AFC`}
                  color="violet"
                />
                <MetricCard
                  icon={<TrendingUp className="h-3.5 w-3.5" />}
                  label={t('liquidity.circulatingSupply')}
                  value={`${formatNumber(tokenEconomics.circulatingSupply)} AFC`}
                  subValue={`${t('liquidity.proportion')} ${circulatingPct.toFixed(1)}%`}
                  color="blue"
                />
                <MetricCard
                  icon={<Flame className="h-3.5 w-3.5" />}
                  label={t('liquidity.burnRate')}
                  value={formatPct(tokenEconomics.burnRate)}
                  color="red"
                />
                <MetricCard
                  icon={<Coins className="h-3.5 w-3.5" />}
                  label={t('liquidity.buybackRate')}
                  value={formatPct(tokenEconomics.buybackRate)}
                  color="emerald"
                />
                <MetricCard
                  icon={<TrendingUp className="h-3.5 w-3.5" />}
                  label={t('liquidity.valueCaptureRate')}
                  value={formatPct(tokenEconomics.valueCaptureRate)}
                  subValue={t('liquidity.risingTrend')}
                  color="violet"
                />
                <MetricCard
                  icon={<BarChart3 className="h-3.5 w-3.5" />}
                  label={t('liquidity.monthlyBurn')}
                  value={`${formatNumber(tokenEconomics.monthlyBurn[tokenEconomics.monthlyBurn.length - 1].burned)} AFC`}
                  subValue={t('liquidity.increasingTrend')}
                  color="amber"
                />
              </div>

              {/* Circulating Supply Progress */}
              <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-400">{t('liquidity.circulatingRatio')}</span>
                  <span className="text-xs text-violet-300 font-medium">{circulatingPct.toFixed(2)}%</span>
                </div>
                <Progress value={circulatingPct} className="h-2 bg-slate-700/50 [&>div]:bg-gradient-to-r [&>div]:from-violet-500 [&>div]:to-blue-500" />
                <div className="flex items-center justify-between mt-1.5 text-[10px] text-slate-500">
                  <span>0</span>
                  <span>{t('liquidity.totalSupply1B')}</span>
                </div>
              </div>

              {/* Monthly Burn Chart */}
              <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Flame className="h-3.5 w-3.5 text-red-400" />
                  <span className="text-xs text-slate-300 font-medium">{t('liquidity.monthlyDeflationBurn')}</span>
                </div>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={tokenEconomics.monthlyBurn} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="burnGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 10, fill: '#94a3b8' }}
                        axisLine={{ stroke: '#334155' }}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: '#94a3b8' }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v: number) => `${formatNumber(v)}`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1e293b',
                          border: '1px solid #334155',
                          borderRadius: '8px',
                          fontSize: '11px',
                          color: '#e2e8f0',
                        }}
                        formatter={(value: number) => [`${formatNumber(value)} AFC`, t('liquidity.burnAmount')]}
                        labelFormatter={(label: string) => label}
                      />
                      <Area
                        type="monotone"
                        dataKey="burned"
                        stroke="#ef4444"
                        strokeWidth={2}
                        fill="url(#burnGradient)"
                        dot={{ fill: '#ef4444', r: 3 }}
                        activeDot={{ r: 5, fill: '#ef4444' }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </TabsContent>

            {/* ── Staking Tab ──────────────────────────── */}
            <TabsContent value="staking" className="mt-4 space-y-4">
              {/* Staking Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <MetricCard
                  icon={<Lock className="h-3.5 w-3.5" />}
                  label={t('liquidity.totalStaked')}
                  value={`${formatNumber(staking.totalStaked)} AFC`}
                  subValue={`${t('liquidity.proportion')} ${stakingPct.toFixed(1)}%`}
                  color="violet"
                />
                <MetricCard
                  icon={<TrendingUp className="h-3.5 w-3.5" />}
                  label={t('liquidity.apy')}
                  value={`${staking.apy}%`}
                  subValue={t('liquidity.compoundCalc')}
                  color="emerald"
                />
                <MetricCard
                  icon={<Users className="h-3.5 w-3.5" />}
                  label={t('liquidity.stakerCount')}
                  value={staking.stakers.toLocaleString()}
                  color="blue"
                />
              </div>

              {/* Staking Progress */}
              <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-400">{t('liquidity.stakingProgress')}</span>
                  <span className="text-xs text-violet-300 font-medium">{stakingPct.toFixed(1)}%</span>
                </div>
                <Progress value={stakingPct} className="h-2 bg-slate-700/50 [&>div]:bg-gradient-to-r [&>div]:from-violet-500 [&>div]:to-emerald-500" />
                <div className="flex items-center justify-between mt-1.5 text-[10px] text-slate-500">
                  <span>0</span>
                  <span>{t('liquidity.circulatingLabel')} {formatNumber(tokenEconomics.circulatingSupply)} AFC</span>
                </div>
              </div>

              {/* Staking Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Coins className="h-4 w-4 text-amber-400" />
                    <span className="text-sm font-medium text-slate-200">{t('liquidity.stakingParams')}</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">{t('liquidity.minStake')}</span>
                      <span className="text-white font-medium">{formatNumber(staking.minStake)} AFC</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">{t('liquidity.lockPeriod')}</span>
                      <span className="text-white font-medium">{t(staking.lockPeriod)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">{t('liquidity.rewardsDistributed')}</span>
                      <span className="text-emerald-300 font-medium">{formatNumber(staking.rewardsDistributed)} AFC</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 to-blue-500/5 p-4 flex flex-col justify-between">
                  <div>
                    <p className="text-xs text-violet-300/60 uppercase tracking-widest mb-1">{t('liquidity.stakeAfc')}</p>
                    <p className="text-2xl font-bold text-white">{staking.apy}% <span className="text-sm font-normal text-violet-300">APY</span></p>
                  </div>
                  <Button
                    className="w-full mt-3 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white text-xs font-medium h-9"
                  >
                    <Lock className="h-3.5 w-3.5 mr-1.5" />
                    {t('liquidity.stakeNow')}
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>

        <CardFooter className="pt-0">
          <Button
            variant="outline"
            size="sm"
            className="w-full bg-slate-700/30 border-slate-600/50 text-slate-300 hover:bg-slate-600/50 hover:text-white text-xs"
          >
            {t('liquidity.viewBaseL2')}
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
