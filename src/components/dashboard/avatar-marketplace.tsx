'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  DollarSign,
  Star,
  Zap,
  Users,
  BarChart3,
  MessageSquare,
  Code2,
  Palette,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

// ── Types ──────────────────────────────────────────────
interface MarketplaceAvatar {
  id: string;
  name: string;
  soulId: string;
  resonanceScore: number;
  hourlyRate: number;
  skills: string[];
  domain: string;
  avatarUrl?: string;
}

// ── Mock Data ──────────────────────────────────────────
const MARKETPLACE_DATA: MarketplaceAvatar[] = [
  { id: 'm1', name: '文案大师.soul', soulId: '0xa1b2...c3d4', resonanceScore: 85, hourlyRate: 5, skills: ['文案生成', 'SEO优化', '内容策划'], domain: '内容创作' },
  { id: 'm2', name: '数据猎手.soul', soulId: '0xe5f6...g7h8', resonanceScore: 68, hourlyRate: 8, skills: ['数据分析', 'BI报表', '预测建模'], domain: '数据分析' },
  { id: 'm3', name: '谈判专家.soul', soulId: '0xi9j0...k1l2', resonanceScore: 92, hourlyRate: 12, skills: ['商务谈判', '合同审核', '风险评估'], domain: '商务谈判' },
  { id: 'm4', name: '视觉匠人.soul', soulId: '0xm3n4...o5p6', resonanceScore: 78, hourlyRate: 6, skills: ['图像生成', '视频剪辑', 'UI设计'], domain: '内容创作' },
  { id: 'm5', name: '客服精灵.soul', soulId: '0xq7r8...s9t0', resonanceScore: 88, hourlyRate: 3, skills: ['客户服务', 'FAQ生成', '工单处理'], domain: '客户服务' },
  { id: 'm6', name: '全栈架构.soul', soulId: '0xu1v2...w3x4', resonanceScore: 75, hourlyRate: 15, skills: ['代码生成', '架构设计', '代码审查'], domain: '技术开发' },
];

// ── Domain options ─────────────────────────────────────
const DOMAIN_OPTIONS = [
  { value: 'all', label: '全部领域' },
  { value: '内容创作', label: '内容创作' },
  { value: '数据分析', label: '数据分析' },
  { value: '商务谈判', label: '商务谈判' },
  { value: '客户服务', label: '客户服务' },
  { value: '技术开发', label: '技术开发' },
];

const SORT_OPTIONS = [
  { value: 'default', label: '默认排序' },
  { value: 'resonance', label: '共振分' },
  { value: 'price-low', label: '价格低→高' },
  { value: 'price-high', label: '价格高→低' },
];

// ── Domain icon mapping ────────────────────────────────
const DOMAIN_ICONS: Record<string, React.ElementType> = {
  '内容创作': Palette,
  '数据分析': BarChart3,
  '商务谈判': MessageSquare,
  '客户服务': Users,
  '技术开发': Code2,
};

// ── Resonance color helper ─────────────────────────────
function getResonanceColor(score: number) {
  if (score >= 80) return { dot: 'bg-emerald-400', text: 'text-emerald-400', bg: 'bg-emerald-400/10' };
  if (score >= 60) return { dot: 'bg-amber-400', text: 'text-amber-400', bg: 'bg-amber-400/10' };
  return { dot: 'bg-red-400', text: 'text-red-400', bg: 'bg-red-400/10' };
}

// ── Props ──────────────────────────────────────────────
interface AvatarMarketplaceProps {
  onRent?: (avatar: MarketplaceAvatar) => void;
}

// ── Avatar Card ────────────────────────────────────────
function AvatarCard({
  avatar,
  onRent,
}: {
  avatar: MarketplaceAvatar;
  onRent: (avatar: MarketplaceAvatar) => void;
}) {
  const resonance = getResonanceColor(avatar.resonanceScore);
  const DomainIcon = DOMAIN_ICONS[avatar.domain] ?? Star;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8, scale: 0.95 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      whileHover={{ y: -2 }}
      className="h-full"
    >
      <Card className="group relative h-full border-slate-700/50 bg-[#1E293B] text-slate-100 shadow-lg shadow-black/10 transition-all hover:border-violet-500/30 hover:shadow-violet-500/5">
        {/* Domain badge + resonance */}
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <Badge
              variant="outline"
              className="border-slate-600/50 bg-slate-700/30 text-[10px] text-slate-300 gap-1"
            >
              <DomainIcon className="size-3" />
              {avatar.domain}
            </Badge>
            <div
              className={cn(
                'flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold',
                resonance.bg,
                resonance.text
              )}
            >
              <span className={cn('h-1.5 w-1.5 rounded-full', resonance.dot)} />
              {avatar.resonanceScore}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3 pt-0">
          {/* Name & soulId */}
          <div>
            <h3 className="text-sm font-semibold text-slate-100 truncate">
              {avatar.name}
            </h3>
            <p className="mt-0.5 font-mono text-[11px] text-slate-500 truncate">
              {avatar.soulId}
            </p>
          </div>

          {/* Hourly rate */}
          <div className="flex items-center gap-1.5">
            <DollarSign className="size-3.5 text-violet-400" />
            <span className="text-base font-bold text-violet-400">
              ${avatar.hourlyRate}
            </span>
            <span className="text-[11px] text-slate-500">/小时</span>
          </div>

          {/* Skill badges */}
          <div className="flex flex-wrap gap-1">
            {avatar.skills.map((skill) => (
              <Badge
                key={skill}
                variant="outline"
                className="border-slate-600/30 bg-slate-700/20 text-[10px] text-slate-300 hover:bg-slate-700/40"
              >
                {skill}
              </Badge>
            ))}
          </div>

          {/* Rent button */}
          <Button
            size="sm"
            className="w-full bg-violet-600 text-white hover:bg-violet-500 transition-colors text-xs"
            onClick={() => onRent(avatar)}
          >
            <Zap className="size-3.5" />
            租用
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Main Component ─────────────────────────────────────
export default function AvatarMarketplace({ onRent }: AvatarMarketplaceProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [domainFilter, setDomainFilter] = useState('all');
  const [sortBy, setSortBy] = useState('default');

  // Filter & sort logic
  const filteredAvatars = useMemo(() => {
    let result = [...MARKETPLACE_DATA];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.skills.some((s) => s.toLowerCase().includes(q)) ||
          a.domain.toLowerCase().includes(q)
      );
    }

    // Domain filter
    if (domainFilter !== 'all') {
      result = result.filter((a) => a.domain === domainFilter);
    }

    // Sort
    switch (sortBy) {
      case 'resonance':
        result.sort((a, b) => b.resonanceScore - a.resonanceScore);
        break;
      case 'price-low':
        result.sort((a, b) => a.hourlyRate - b.hourlyRate);
        break;
      case 'price-high':
        result.sort((a, b) => b.hourlyRate - a.hourlyRate);
        break;
      default:
        break;
    }

    return result;
  }, [searchQuery, domainFilter, sortBy]);

  const handleRent = (avatar: MarketplaceAvatar) => {
    if (onRent) {
      onRent(avatar);
    }
  };

  return (
    <Card className="border-slate-700/50 bg-slate-800/80 text-slate-100 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="size-5 text-violet-400" />
          分身市场
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4 pt-0">
        {/* ── Search & Filters ──────────────────────── */}
        <div className="space-y-3">
          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-500" />
            <Input
              placeholder="搜索技能/领域/价格..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 border-slate-700 bg-slate-900/60 pl-9 text-sm text-slate-200 placeholder:text-slate-500 focus-visible:ring-violet-500/30"
            />
          </div>

          {/* Filter row */}
          <div className="flex flex-wrap items-center gap-2">
            <Select value={domainFilter} onValueChange={setDomainFilter}>
              <SelectTrigger
                size="sm"
                className="h-8 w-auto min-w-[110px] border-slate-700 bg-slate-900/60 text-xs text-slate-300 [&_svg]:text-slate-500"
              >
                <SelectValue placeholder="领域" />
              </SelectTrigger>
              <SelectContent className="border-slate-700 bg-slate-800 text-slate-200">
                {DOMAIN_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs focus:bg-slate-700 focus:text-slate-100">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger
                size="sm"
                className="h-8 w-auto min-w-[110px] border-slate-700 bg-slate-900/60 text-xs text-slate-300 [&_svg]:text-slate-500"
              >
                <SelectValue placeholder="排序" />
              </SelectTrigger>
              <SelectContent className="border-slate-700 bg-slate-800 text-slate-200">
                {SORT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs focus:bg-slate-700 focus:text-slate-100">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Result count */}
            <span className="ml-auto text-[11px] text-slate-500">
              {filteredAvatars.length} 个分身
            </span>
          </div>
        </div>

        {/* ── Avatar Grid ──────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredAvatars.map((avatar) => (
              <AvatarCard
                key={avatar.id}
                avatar={avatar}
                onRent={handleRent}
              />
            ))}
          </AnimatePresence>
        </div>

        {/* Empty state */}
        {filteredAvatars.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-3 py-10 text-center"
          >
            <Search className="size-8 text-slate-600" />
            <p className="text-sm text-slate-500">未找到匹配的分身</p>
            <p className="text-xs text-slate-600">尝试调整搜索条件或筛选器</p>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}

export type { MarketplaceAvatar };
