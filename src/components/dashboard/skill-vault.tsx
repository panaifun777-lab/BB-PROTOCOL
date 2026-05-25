'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Lock,
  Unlock,
  TrendingUp,
  Star,
  BookOpen,
  Brain,
  Image,
  Users,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import type { AvatarSkill } from '@/lib/types';

// ===== Tier thresholds =====
const TIER_THRESHOLDS: Record<number, number> = {
  1: 100,
  2: 500,
  3: 1500,
  4: 5000,
};

const TIER_LABELS: Record<number, string> = {
  1: '基础',
  2: '高级RAG',
  3: '多模态',
  4: '协作',
};

// ===== Category icon mapping =====
const CATEGORY_ICONS: Record<string, React.ElementType> = {
  general: BookOpen,
  rag: Brain,
  multimodal: Image,
  collaboration: Users,
};

// ===== Skill status =====
type SkillStatus = 'unlocked' | 'unlockable' | 'locked';

function getSkillStatus(
  skill: AvatarSkill,
  cumulativeRevenue: number,
  currentTier: 'starter' | 'pro' | 'enterprise'
): SkillStatus {
  if (skill.unlocked) return 'unlocked';
  const threshold = TIER_THRESHOLDS[skill.skill.tier] ?? 0;
  // Tier 4 requires pro/enterprise subscription
  if (skill.skill.tier >= 4 && currentTier === 'starter') return 'locked';
  // If revenue is enough and not tier-locked, it's unlockable
  if (cumulativeRevenue >= threshold && !(skill.skill.tier >= 4 && currentTier === 'starter'))
    return 'unlockable';
  // If it's just revenue-gated (not subscription-gated)
  if (skill.skill.tier < 4) return 'unlockable';
  return 'locked';
}

// ===== Star rating component =====
function StarRating({ value, max = 5 }: { value: number; max?: number }) {
  const stars = Math.round((value / 100) * max);
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            'size-3.5',
            i < stars
              ? 'fill-yellow-400 text-yellow-400'
              : 'fill-transparent text-slate-600'
          )}
        />
      ))}
      <span className="ml-1 text-xs text-slate-400">{value}%</span>
    </div>
  );
}

// ===== Individual skill card =====
function SkillCard({
  avatarSkill,
  status,
  cumulativeRevenue,
  currentTier,
  onUnlockClick,
}: {
  avatarSkill: AvatarSkill;
  status: SkillStatus;
  cumulativeRevenue: number;
  currentTier: 'starter' | 'pro' | 'enterprise';
  onUnlockClick: (skill: AvatarSkill) => void;
}) {
  const { skill } = avatarSkill;
  const IconComponent = CATEGORY_ICONS[skill.category] ?? Sparkles;
  const threshold = TIER_THRESHOLDS[skill.tier] ?? 0;
  const progressPercent = Math.min(
    100,
    Math.round((cumulativeRevenue / threshold) * 100)
  );

  const isUnlocked = status === 'unlocked';
  const isUnlockable = status === 'unlockable';
  const isLocked = status === 'locked';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      whileHover={{ scale: 1.01 }}
      className={cn(
        'group relative rounded-lg border p-4 transition-colors',
        isUnlocked &&
          'border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/50',
        isUnlockable &&
          'border-amber-500/30 bg-amber-500/5 hover:border-amber-500/50',
        isLocked && 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
      )}
    >
      {/* Glow effect for unlocked */}
      {isUnlocked && (
        <div className="pointer-events-none absolute inset-0 rounded-lg bg-emerald-500/5 opacity-0 transition-opacity group-hover:opacity-100" />
      )}

      <div className="relative flex items-start gap-3">
        {/* Icon */}
        <div
          className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded-lg',
            isUnlocked && 'bg-emerald-500/15 text-emerald-400',
            isUnlockable && 'bg-amber-500/15 text-amber-400',
            isLocked && 'bg-slate-700/50 text-slate-500'
          )}
        >
          {isLocked ? (
            <Lock className="size-5" />
          ) : (
            <IconComponent className="size-5" />
          )}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="truncate text-sm font-semibold text-slate-100">
              {skill.name}
            </h4>
            {isUnlocked && (
              <Badge className="border-emerald-500/30 bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25">
                <Unlock className="mr-1 size-3" />
                已解锁
              </Badge>
            )}
            {isUnlockable && !avatarSkill.unlocked && cumulativeRevenue < threshold && (
              <Badge className="border-amber-500/30 bg-amber-500/15 text-amber-400 hover:bg-amber-500/25">
                <TrendingUp className="mr-1 size-3" />
                可解锁
              </Badge>
            )}
            {isLocked && (
              <Badge className="border-slate-600 bg-slate-700/50 text-slate-400 hover:bg-slate-700">
                <Lock className="mr-1 size-3" />
                锁定
              </Badge>
            )}
          </div>

          <p className="mt-1 text-xs text-slate-400">{skill.description}</p>

          {/* Stats for unlocked skills */}
          {isUnlocked && (
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
              <span>
                使用次数:{' '}
                <span className="font-medium text-slate-200">
                  {avatarSkill.usageCount}
                </span>
              </span>
              <span>
                平均成本:{' '}
                <span className="font-medium text-slate-200">
                  ${avatarSkill.avgCost.toFixed(3)}
                </span>
              </span>
              <StarRating value={avatarSkill.satisfaction} />
            </div>
          )}

          {/* Progress for unlockable skills */}
          {isUnlockable && !avatarSkill.unlocked && cumulativeRevenue < threshold && (
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">
                  需累计收益 ${threshold}
                  <span className="text-slate-500"> (当前: ${cumulativeRevenue})</span>
                </span>
                <span className="font-medium text-amber-400">{progressPercent}%</span>
              </div>
              <Progress value={progressPercent} className="h-1.5 bg-slate-700 [&>[data-slot=progress-indicator]]:bg-amber-500" />
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-amber-400 hover:text-amber-300"
                onClick={() => onUnlockClick(avatarSkill)}
              >
                查看解锁进度
              </Button>
            </div>
          )}

          {/* Locked (subscription-gated) */}
          {isLocked && (
            <div className="mt-3 space-y-2">
              <p className="text-xs text-slate-500">
                需Pro订阅 ($99/月)
              </p>
              <Button
                variant="outline"
                size="sm"
                className="h-7 border-slate-600 bg-slate-800 text-xs text-slate-300 hover:border-slate-500 hover:bg-slate-700"
                onClick={() => onUnlockClick(avatarSkill)}
              >
                <Sparkles className="mr-1 size-3" />
                升级套餐
              </Button>
            </div>
          )}

          {/* Already revenue-met but not yet unlocked — instant unlock */}
          {isUnlockable && !avatarSkill.unlocked && cumulativeRevenue >= threshold && !isLocked && (
            <div className="mt-3">
              <Button
                size="sm"
                className="h-7 bg-amber-500 text-xs text-black hover:bg-amber-400"
                onClick={() => onUnlockClick(avatarSkill)}
              >
                <Unlock className="mr-1 size-3" />
                立即解锁
              </Button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ===== Main SkillVault Component =====
interface SkillVaultProps {
  skills: AvatarSkill[];
  cumulativeRevenue: number;
  currentTier: 'starter' | 'pro' | 'enterprise';
}

const TAB_VALUES = ['all', 'general', 'rag', 'multimodal', 'collaboration'] as const;
const TAB_LABELS: Record<string, string> = {
  all: '全部',
  general: '基础',
  rag: '高级RAG',
  multimodal: '多模态',
  collaboration: '协作',
};

export default function SkillVault({
  skills,
  cumulativeRevenue,
  currentTier,
}: SkillVaultProps) {
  const [activeTab, setActiveTab] = useState<string>('all');

  const filteredSkills = useMemo(() => {
    if (activeTab === 'all') return skills;
    return skills.filter((s) => s.skill.category === activeTab);
  }, [skills, activeTab]);

  const handleUnlockClick = (skill: AvatarSkill) => {
    // Placeholder: in production this would trigger an unlock flow
    console.log('Unlock clicked for:', skill.skill.name);
  };

  // Summary stats
  const unlockedCount = skills.filter((s) => s.unlocked).length;
  const totalSkills = skills.length;

  return (
    <Card className="border-slate-700/50 bg-slate-800/80 text-slate-100 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="size-5 text-amber-400" />
            技能库
          </CardTitle>
          <Badge
            variant="outline"
            className="border-slate-600 bg-slate-700/50 text-xs text-slate-300"
          >
            {unlockedCount}/{totalSkills} 已解锁
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Category Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="mb-4 h-8 w-full bg-slate-900/80 p-0.5 sm:w-auto">
            {TAB_VALUES.map((tab) => (
              <TabsTrigger
                key={tab}
                value={tab}
                className="h-7 px-2.5 text-xs data-[state=active]:bg-slate-700 data-[state=active]:text-slate-100"
              >
                {TAB_LABELS[tab]}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Single content area, filtered by state */}
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {filteredSkills.map((avatarSkill) => {
                const status = getSkillStatus(
                  avatarSkill,
                  cumulativeRevenue,
                  currentTier
                );
                return (
                  <SkillCard
                    key={avatarSkill.id}
                    avatarSkill={avatarSkill}
                    status={status}
                    cumulativeRevenue={cumulativeRevenue}
                    currentTier={currentTier}
                    onUnlockClick={handleUnlockClick}
                  />
                );
              })}
            </AnimatePresence>

            {filteredSkills.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-8 text-center text-sm text-slate-500"
              >
                该分类下暂无技能
              </motion.div>
            )}
          </div>
        </Tabs>

        {/* Revenue progress to next tier */}
        <div className="mt-4 rounded-lg border border-slate-700/50 bg-slate-900/50 p-3">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="text-slate-400">累计收益</span>
            <span className="font-medium text-emerald-400">
              ${cumulativeRevenue.toLocaleString()}
            </span>
          </div>
          <TierProgressBar cumulativeRevenue={cumulativeRevenue} currentTier={currentTier} />
        </div>
      </CardContent>
    </Card>
  );
}

// ===== Tier progress sub-component =====
function TierProgressBar({
  cumulativeRevenue,
  currentTier,
}: {
  cumulativeRevenue: number;
  currentTier: 'starter' | 'pro' | 'enterprise';
}) {
  // Find the next tier that hasn't been reached
  const tiers = [1, 2, 3, 4];
  let nextTier: number | null = null;
  for (const t of tiers) {
    if (cumulativeRevenue < TIER_THRESHOLDS[t]) {
      // Skip tier 4 if currentTier is starter (subscription-gated, not revenue-gated)
      if (t === 4 && currentTier === 'starter') continue;
      nextTier = t;
      break;
    }
  }

  if (nextTier === null) {
    return (
      <div className="flex items-center gap-2 text-xs text-emerald-400">
        <Unlock className="size-3.5" />
        所有收益门槛技能已解锁
      </div>
    );
  }

  const threshold = TIER_THRESHOLDS[nextTier];
  const prevThreshold = TIER_THRESHOLDS[nextTier - 1] ?? 0;
  const rangeProgress = Math.min(
    100,
    Math.round(
      ((cumulativeRevenue - prevThreshold) / (threshold - prevThreshold)) * 100
    )
  );

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-500">
          下一阶段: {TIER_LABELS[nextTier]} (${threshold})
        </span>
        <span className="font-medium text-amber-400">{rangeProgress}%</span>
      </div>
      <Progress
        value={rangeProgress}
        className="h-1.5 bg-slate-700 [&>[data-slot=progress-indicator]]:bg-gradient-to-r [&>[data-slot=progress-indicator]]:from-amber-500 [&>[data-slot=progress-indicator]]:to-emerald-500"
      />
    </div>
  );
}
