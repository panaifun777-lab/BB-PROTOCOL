'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Wallet, TrendingUp, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RevenueSummary, RevenueSplit } from '@/lib/types';
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

interface SplitDashboardProps {
  summary: RevenueSummary;
  recentRevenues: RevenueSplit[];
}

// Split bar item
interface SplitBarData {
  label: string;
  bps: number;
  amount: number;
  color: string;
  bgColor: string;
}

function SplitBar({ data }: { data: SplitBarData }) {
  const pct = Math.round(data.bps / 100);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-400">{data.label}</span>
        <span className="text-slate-300 font-medium">
          {pct}% <span className="text-slate-500">(${data.amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })})</span>
        </span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-slate-700/50">
        <motion.div
          className={cn('h-full rounded-full', data.color)}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

function getSourceLabel(source: RevenueSplit['source']): string {
  switch (source) {
    case 'skill_call': return '技能调用';
    case 'rental': return '分身租赁';
    case 'collaboration': return '跨分身协作';
    default: return source;
  }
}

function getSourceColor(source: RevenueSplit['source']): string {
  switch (source) {
    case 'skill_call': return 'bg-blue-500/10 text-blue-300 border-blue-500/30';
    case 'rental': return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30';
    case 'collaboration': return 'bg-violet-500/10 text-violet-300 border-violet-500/30';
    default: return '';
  }
}

export default function SplitDashboard({ summary, recentRevenues }: SplitDashboardProps) {
  const monthlyRevenue = summary.monthlyRevenue;
  const latestMonth = monthlyRevenue[monthlyRevenue.length - 1];
  const prevMonth = monthlyRevenue.length > 1 ? monthlyRevenue[monthlyRevenue.length - 2] : null;
  const trendPct = prevMonth
    ? Math.round(((latestMonth.amount - prevMonth.amount) / prevMonth.amount) * 100)
    : 0;

  const splitBars: SplitBarData[] = useMemo(() => [
    {
      label: '人类份额',
      bps: summary.currentHumanBps,
      amount: summary.totalHuman,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: '分身金库',
      bps: summary.currentAvatarBps,
      amount: summary.totalAvatar,
      color: 'bg-emerald-500',
      bgColor: 'bg-emerald-500/10',
    },
    {
      label: '协议LP',
      bps: summary.currentProtocolBps,
      amount: summary.totalProtocol,
      color: 'bg-amber-500',
      bgColor: 'bg-amber-500/10',
    },
  ], [summary]);

  const maxRevenue = useMemo(
    () => Math.max(...monthlyRevenue.map((m) => m.amount)),
    [monthlyRevenue]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15 }}
    >
      <Card className="border-slate-700/50 bg-[#1E293B] text-slate-100 shadow-xl shadow-black/20">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Wallet className="h-4 w-4 text-blue-400" />
                动态分账仪表盘
              </CardTitle>
              <CardDescription className="text-xs text-slate-400 mt-0.5">
                本月收益及分账详情
              </CardDescription>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-white">
                ${latestMonth.amount.toLocaleString()}
              </p>
              <div className="flex items-center justify-end gap-1 text-[11px]">
                {trendPct > 0 ? (
                  <>
                    <ArrowUpRight className="h-3 w-3 text-emerald-400" />
                    <span className="text-emerald-400">+{trendPct}%</span>
                  </>
                ) : trendPct < 0 ? (
                  <>
                    <ArrowDownRight className="h-3 w-3 text-red-400" />
                    <span className="text-red-400">{trendPct}%</span>
                  </>
                ) : (
                  <>
                    <Minus className="h-3 w-3 text-slate-400" />
                    <span className="text-slate-400">0%</span>
                  </>
                )}
                <span className="text-slate-500">vs上月</span>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5 pt-0">
          {/* Split Bars */}
          <div className="space-y-3">
            {splitBars.map((bar) => (
              <SplitBar key={bar.label} data={bar} />
            ))}
          </div>

          {/* Dynamic Adjustment */}
          <div className="rounded-lg border border-slate-700/50 bg-slate-800/50 p-3">
            <div className="flex items-center gap-2 text-xs">
              <TrendingUp className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-slate-300 font-medium">动态调整</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-400 leading-relaxed">
              {summary.resonanceImpact}
            </p>
            <p className="mt-0.5 text-[10px] text-slate-500">
              共振分越高 → 人类份额越大；低于50触发硬暂停
            </p>
          </div>

          {/* Monthly Revenue Chart */}
          <div className="space-y-2">
            <p className="text-xs text-slate-400 font-medium">月度收益趋势</p>
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyRevenue} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    axisLine={{ stroke: '#334155' }}
                    tickLine={false}
                    tickFormatter={(v: string) => v.split('-')[1] + '月'}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => `$${(v / 1000).toFixed(1)}k`}
                  />
                  <Bar dataKey="amount" radius={[4, 4, 0, 0]} maxBarSize={32}>
                    {monthlyRevenue.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={index === monthlyRevenue.length - 1 ? '#8b5cf6' : '#3b82f6'}
                        fillOpacity={index === monthlyRevenue.length - 1 ? 1 : 0.6}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Revenue List */}
          <div className="space-y-2">
            <p className="text-xs text-slate-400 font-medium">最近分账</p>
            <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
              {recentRevenues.map((rev) => (
                <div
                  key={rev.id}
                  className="flex items-center justify-between rounded-md bg-slate-800/60 px-3 py-2 hover:bg-slate-700/60 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn('text-[10px] px-1.5 py-0', getSourceColor(rev.source))}
                    >
                      {getSourceLabel(rev.source)}
                    </Badge>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {rev.txHash || '—'}
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-white">
                    +${rev.totalAmount.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>

        <CardFooter className="pt-0">
          <Button
            variant="outline"
            size="sm"
            className="w-full bg-slate-700/30 border-slate-600/50 text-slate-300 hover:bg-slate-600/50 hover:text-white text-xs"
          >
            查看详细分账日志
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
