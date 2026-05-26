'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Activity, ArrowUpRight, ArrowDownRight, Minus, AlertTriangle, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/hooks/use-i18n';
import type { ResonanceDataPoint, AvatarProfile } from '@/lib/types';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ResonanceWaveProps {
  data: ResonanceDataPoint[];
  currentScore: number;
  circuitState: string;
}

// Color helper for score zones
function getScoreColor(score: number): { text: string; dot: string; fill: string; stroke: string } {
  if (score >= 70) {
    return {
      text: 'text-emerald-400',
      dot: 'bg-emerald-400',
      fill: '#10b981',
      stroke: '#34d399',
    };
  }
  if (score >= 50) {
    return {
      text: 'text-amber-400',
      dot: 'bg-amber-400',
      fill: '#f59e0b',
      stroke: '#fbbf24',
    };
  }
  return {
    text: 'text-red-400',
    dot: 'bg-red-400',
    fill: '#ef4444',
    stroke: '#f87171',
  };
}

function getCircuitBadge(state: string, t: (key: string, params?: Record<string, string | number>) => string) {
  switch (state) {
    case 'NORMAL':
      return { label: t('resonance.normalOperation'), cls: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' };
    case 'SOFT_LIMIT':
      return { label: t('resonance.softLimit'), cls: 'bg-amber-500/10 text-amber-300 border-amber-500/30' };
    case 'HARD_PAUSE':
      return { label: t('resonance.hardPause'), cls: 'bg-red-500/10 text-red-300 border-red-500/30' };
    case 'RECOVERY':
      return { label: t('resonance.recovery'), cls: 'bg-blue-500/10 text-blue-300 border-blue-500/30' };
    default:
      return { label: state, cls: 'bg-slate-500/10 text-slate-300 border-slate-500/30' };
  }
}

export default function ResonanceWave({ data, currentScore, circuitState }: ResonanceWaveProps) {
  const { t } = useI18n();
  const scoreColor = getScoreColor(currentScore);
  const circuitBadge = getCircuitBadge(circuitState, t);

  // Calculate trend (compare last 6h avg vs previous 6h avg)
  const trend = useMemo(() => {
    if (data.length < 6) return 0;
    const recentSlice = data.slice(-6);
    const prevSlice = data.slice(-12, -6);
    const recentAvg = recentSlice.reduce((s, d) => s + d.score, 0) / recentSlice.length;
    const prevAvg = prevSlice.length > 0
      ? prevSlice.reduce((s, d) => s + d.score, 0) / prevSlice.length
      : recentAvg;
    if (prevAvg === 0) return 0;
    return Math.round(((recentAvg - prevAvg) / prevAvg) * 100);
  }, [data]);

  // Compute a gradient ID that's stable
  const gradientId = 'resonanceGradient';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      <Card className="border-slate-700/50 bg-[#1E293B] text-slate-100 shadow-xl shadow-black/20">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="h-4 w-4 text-emerald-400" />
                {t('resonance.title')}
              </CardTitle>
              <CardDescription className="text-xs text-slate-400 mt-0.5">
                {t('resonance.subtitle')}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={cn('text-[10px] px-1.5 py-0', circuitBadge.cls)}
              >
                {circuitBadge.label}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-0">
          {/* Current Score + Trend */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-1.5',
                currentScore >= 70 ? 'bg-emerald-500/10' :
                currentScore >= 50 ? 'bg-amber-500/10' : 'bg-red-500/10'
              )}>
                <span className={cn('h-2.5 w-2.5 rounded-full animate-pulse', scoreColor.dot)} />
                <span className={cn('text-2xl font-bold tabular-nums', scoreColor.text)}>
                  {currentScore}
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs">
                {trend > 0 ? (
                  <>
                    <ArrowUpRight className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-emerald-400">+{trend}%</span>
                  </>
                ) : trend < 0 ? (
                  <>
                    <ArrowDownRight className="h-3.5 w-3.5 text-red-400" />
                    <span className="text-red-400">{trend}%</span>
                  </>
                ) : (
                  <>
                    <Minus className="h-3.5 w-3.5 text-slate-400" />
                    <span className="text-slate-400">0%</span>
                  </>
                )}
                <span className="text-slate-500">(6h)</span>
              </div>
            </div>
            {/* Threshold Legend */}
            <div className="hidden sm:flex items-center gap-3 text-[10px] text-slate-500">
              <span className="flex items-center gap-1">
                <span className="inline-block w-4 h-0 border-t-2 border-dashed border-amber-500" />
                {t('resonance.softLimit')} 70
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-4 h-0 border-t-2 border-dashed border-red-500" />
                {t('resonance.hardPause')} 50
              </span>
            </div>
          </div>

          {/* Area Chart */}
          <div className="h-48 relative">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={scoreColor.fill} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={scoreColor.fill} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  axisLine={{ stroke: '#334155' }}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  ticks={[0, 25, 50, 70, 100]}
                />
                {/* Threshold Lines */}
                <ReferenceLine
                  y={70}
                  stroke="#f59e0b"
                  strokeDasharray="6 4"
                  strokeWidth={1.5}
                  label={{
                    value: t('resonance.softLimit'),
                    position: 'right',
                    fill: '#f59e0b',
                    fontSize: 10,
                  }}
                />
                <ReferenceLine
                  y={50}
                  stroke="#ef4444"
                  strokeDasharray="6 4"
                  strokeWidth={1.5}
                  label={{
                    value: t('resonance.hardPause'),
                    position: 'right',
                    fill: '#ef4444',
                    fontSize: 10,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke={scoreColor.stroke}
                  strokeWidth={2}
                  fill={`url(#${gradientId})`}
                  dot={false}
                  activeDot={{
                    r: 4,
                    fill: scoreColor.fill,
                    stroke: '#fff',
                    strokeWidth: 2,
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>

            {/* Zone overlays - purely decorative via CSS */}
            <div className="absolute top-0 left-0 right-0 pointer-events-none">
              {/* Green zone indicator (70+) */}
              <div className="flex items-center justify-between px-12 text-[9px] text-slate-600">
                <span />
                <span className="flex items-center gap-1">
                  <ShieldAlert className="h-2.5 w-2.5 text-red-500/50" />
                  {t('resonance.dangerZone')} &lt;50
                </span>
                <span className="flex items-center gap-1">
                  <AlertTriangle className="h-2.5 w-2.5 text-amber-500/50" />
                  {t('resonance.warningZone')} 50-70
                </span>
                <span />
              </div>
            </div>
          </div>

          {/* Zone Summary */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-2 text-center">
              <p className="text-[10px] text-emerald-400/70">{t('resonance.safeZone')}</p>
              <p className="text-xs font-semibold text-emerald-300">≥70</p>
              <p className="text-[10px] text-slate-500">{t('resonance.normalOperation')}</p>
            </div>
            <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-2 text-center">
              <p className="text-[10px] text-amber-400/70">{t('resonance.warningZone')}</p>
              <p className="text-xs font-semibold text-amber-300">50-69</p>
              <p className="text-[10px] text-slate-500">{t('resonance.softLimitActive')}</p>
            </div>
            <div className="rounded-lg bg-red-500/5 border border-red-500/20 p-2 text-center">
              <p className="text-[10px] text-red-400/70">{t('resonance.dangerZone')}</p>
              <p className="text-xs font-semibold text-red-300">&lt;50</p>
              <p className="text-[10px] text-slate-500">{t('resonance.hardPauseTriggered')}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
