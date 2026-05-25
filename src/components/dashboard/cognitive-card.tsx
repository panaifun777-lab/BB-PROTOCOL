'use client';

import { motion } from 'framer-motion';
import { Shield, Brain, Wallet, Activity, Sparkles, Check, Lock, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AvatarProfile, AvatarSkill } from '@/lib/types';
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';

interface CognitiveCardProps {
  avatar: AvatarProfile;
  skills: AvatarSkill[];
}

// Helper: resonance score color
function getResonanceColor(score: number): { dot: string; text: string; bg: string } {
  if (score >= 70) return { dot: 'bg-emerald-400', text: 'text-emerald-400', bg: 'bg-emerald-400/10' };
  if (score >= 50) return { dot: 'bg-amber-400', text: 'text-amber-400', bg: 'bg-amber-400/10' };
  return { dot: 'bg-red-400', text: 'text-red-400', bg: 'bg-red-400/10' };
}

// Helper: truncate hash
function truncateHash(hash: string, prefix = 6, suffix = 4): string {
  if (hash.length <= prefix + suffix + 3) return hash;
  return `${hash.slice(0, prefix)}...${hash.slice(-suffix)}`;
}

// Helper: tier label
function getTierLabel(tier: AvatarProfile['tier']): string {
  switch (tier) {
    case 'starter': return '入门';
    case 'pro': return '专业';
    case 'enterprise': return '企业';
    default: return tier;
  }
}

function getTierColor(tier: AvatarProfile['tier']): string {
  switch (tier) {
    case 'starter': return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    case 'pro': return 'bg-violet-500/20 text-violet-300 border-violet-500/30';
    case 'enterprise': return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
    default: return '';
  }
}

// Revenue split bar
function RevenueSplitBar({ humanBps, avatarBps, protocolBps }: { humanBps: number; avatarBps: number; protocolBps: number }) {
  const total = humanBps + avatarBps + protocolBps;
  const humanPct = Math.round((humanBps / total) * 100);
  const avatarPct = Math.round((avatarBps / total) * 100);
  const protocolPct = 100 - humanPct - avatarPct;

  return (
    <div className="space-y-1.5">
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-700/50">
        <motion.div
          className="bg-blue-500"
          initial={{ width: 0 }}
          animate={{ width: `${humanPct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
        <motion.div
          className="bg-emerald-500"
          initial={{ width: 0 }}
          animate={{ width: `${avatarPct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
        />
        <motion.div
          className="bg-amber-500"
          initial={{ width: 0 }}
          animate={{ width: `${protocolPct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
        />
      </div>
      <div className="flex items-center gap-3 text-[11px] text-slate-400">
        <span className="flex items-center gap-1">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-500" />
          人类 {humanPct}%
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
          金库 {avatarPct}%
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
          LP {protocolPct}%
        </span>
      </div>
    </div>
  );
}

export default function CognitiveCard({ avatar, skills }: CognitiveCardProps) {
  const resonance = getResonanceColor(avatar.resonanceScore);
  const unlockedSkills = skills.filter((s) => s.unlocked);
  const lockedSkills = skills.filter((s) => !s.unlocked);
  const annualRevenue = avatar.avatarBalance * 10; // mock calculation

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="border-slate-700/50 bg-[#1E293B] text-slate-100 shadow-xl shadow-black/20">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-11 w-11 border-2 border-violet-500/50">
                <AvatarFallback className="bg-gradient-to-br from-violet-600 to-indigo-700 text-white font-bold text-sm">
                  <Brain className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="h-4 w-4 text-violet-400" />
                  {avatar.name}
                </CardTitle>
                <CardDescription className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                  <Wallet className="h-3 w-3" />
                  <span className="font-mono">{truncateHash(avatar.soulId)}</span>
                  <span className="text-slate-600">|</span>
                  <span className="text-slate-500">认知根:</span>
                  <span className="font-mono">{truncateHash(avatar.cognitionRoot, 4, 4)}</span>
                </CardDescription>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold cursor-default',
                      resonance.bg,
                      resonance.text
                    )}
                  >
                    <span className={cn('h-2 w-2 rounded-full animate-pulse', resonance.dot)} />
                    共振分 {avatar.resonanceScore}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="left" className="bg-slate-800 text-slate-200 border-slate-700">
                  <p>情绪共振强度评分</p>
                  <p className="text-[10px] text-slate-400">
                    {avatar.resonanceScore >= 70 ? '正常运作区间' : avatar.resonanceScore >= 50 ? '接近软限制阈值' : '已触发硬暂停'}
                  </p>
                </TooltipContent>
              </Tooltip>
              <Badge
                variant="outline"
                className={cn('text-[10px] px-1.5 py-0', getTierColor(avatar.tier))}
              >
                {getTierLabel(avatar.tier)}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-0">
          {/* Skills */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Activity className="h-3 w-3" />
              <span>技能包</span>
              <span className="text-slate-600">({unlockedSkills.length}/{skills.length})</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {skills.map((as) => (
                <Tooltip key={as.id}>
                  <TooltipTrigger asChild>
                    <Badge
                      variant="outline"
                      className={cn(
                        'cursor-default text-[11px] gap-1 transition-colors',
                        as.unlocked
                          ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                          : 'bg-slate-700/30 text-slate-500 border-slate-600/30 hover:bg-slate-700/50'
                      )}
                    >
                      {as.unlocked ? (
                        <Check className="h-2.5 w-2.5" />
                      ) : (
                        <Lock className="h-2.5 w-2.5" />
                      )}
                      {as.skill.icon && <span>{as.skill.icon}</span>}
                      {as.skill.name}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="bg-slate-800 text-slate-200 border-slate-700">
                    {as.unlocked ? (
                      <>
                        <p>使用 {as.usageCount} 次 · 满意度 {as.satisfaction}%</p>
                        <p className="text-[10px] text-slate-400">平均成本 ${as.avgCost.toFixed(3)}</p>
                      </>
                    ) : (
                      <p>收益阈值: ${as.skill.revenueThreshold} 解锁</p>
                    )}
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>

          {/* Revenue */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Wallet className="h-3 w-3" />
                <span>年度收益</span>
              </div>
              <span className="text-sm font-semibold text-white">
                ${annualRevenue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
            </div>
            <RevenueSplitBar
              humanBps={7000}
              avatarBps={2000}
              protocolBps={1000}
            />
          </div>

          {/* Circuit State */}
          <div className="flex items-center gap-2">
            <Shield className={cn(
              'h-3.5 w-3.5',
              avatar.circuitState === 'NORMAL' ? 'text-emerald-400' :
              avatar.circuitState === 'SOFT_LIMIT' ? 'text-amber-400' :
              avatar.circuitState === 'HARD_PAUSE' ? 'text-red-400' :
              'text-blue-400'
            )} />
            <span className="text-[11px] text-slate-400">熔断状态:</span>
            <Badge
              variant="outline"
              className={cn(
                'text-[10px] px-1.5 py-0',
                avatar.circuitState === 'NORMAL' ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' :
                avatar.circuitState === 'SOFT_LIMIT' ? 'bg-amber-500/10 text-amber-300 border-amber-500/30' :
                avatar.circuitState === 'HARD_PAUSE' ? 'bg-red-500/10 text-red-300 border-red-500/30' :
                'bg-blue-500/10 text-blue-300 border-blue-500/30'
              )}
            >
              {avatar.circuitState}
            </Badge>
          </div>
        </CardContent>

        <CardFooter className="gap-2 pt-0">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 bg-slate-700/30 border-slate-600/50 text-slate-300 hover:bg-slate-600/50 hover:text-white text-xs"
          >
            <Clock className="h-3 w-3" />
            查看时间线
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 bg-slate-700/30 border-slate-600/50 text-slate-300 hover:bg-slate-600/50 hover:text-white text-xs"
          >
            调整委托
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 bg-slate-700/30 border-slate-600/50 text-slate-300 hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/30 text-xs"
          >
            <Shield className="h-3 w-3" />
            熔断设置
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
