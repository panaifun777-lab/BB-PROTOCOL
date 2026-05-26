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
import { useI18n } from '@/hooks/use-i18n';

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

// ── Domain options (values used as filter keys) ────────
const DOMAIN_OPTIONS = [
  { value: 'all', labelKey: 'marketplace.allDomains' },
  { value: '内容创作', labelKey: 'marketplace.domainContent' },
  { value: '数据分析', labelKey: 'marketplace.domainData' },
  { value: '商务谈判', labelKey: 'marketplace.domainBusiness' },
  { value: '客户服务', labelKey: 'marketplace.domainCustomer' },
  { value: '技术开发', labelKey: 'marketplace.domainTech' },
];

const SORT_OPTIONS = [
  { value: 'default', labelKey: 'marketplace.sortDefault' },
  { value: 'resonance', labelKey: 'marketplace.sortResonance' },
  { value: 'price-low', labelKey: 'marketplace.sortPriceLow' },
  { value: 'price-high', labelKey: 'marketplace.sortPriceHigh' },
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

// ── Translation key mappings ───────────────────────────
const DOMAIN_LABEL_KEYS: Record<string, string> = {
  '内容创作': 'marketplace.domainContent',
  '数据分析': 'marketplace.domainData',
  '商务谈判': 'marketplace.domainBusiness',
  '客户服务': 'marketplace.domainCustomer',
  '技术开发': 'marketplace.domainTech',
};

const SKILL_LABEL_KEYS: Record<string, string> = {
  '文案生成': 'marketplace.skillCopyGen',
  'SEO优化': 'marketplace.skillSeo',
  '内容策划': 'marketplace.skillContentPlan',
  '数据分析': 'marketplace.skillDataAnalysis',
  'BI报表': 'marketplace.skillBiReport',
  '预测建模': 'marketplace.skillPredictModel',
  '商务谈判': 'marketplace.skillBizNegotiate',
  '合同审核': 'marketplace.skillContractReview',
  '风险评估': 'marketplace.skillRiskAssess',
  '图像生成': 'marketplace.skillImageGen',
  '视频剪辑': 'marketplace.skillVideoEdit',
  'UI设计': 'marketplace.skillUiDesign',
  '客户服务': 'marketplace.skillCustomerService',
  'FAQ生成': 'marketplace.skillFaqGen',
  '工单处理': 'marketplace.skillTicketProcess',
  '代码生成': 'marketplace.skillCodeGen',
  '架构设计': 'marketplace.skillArchDesign',
  '代码审查': 'marketplace.skillCodeReview',
};

const AVATAR_NAME_KEYS: Record<string, string> = {
  'm1': 'marketplace.nameCopywriting',
  'm2': 'marketplace.nameDataHunter',
  'm3': 'marketplace.nameNegotiator',
  'm4': 'marketplace.nameVisualArtisan',
  'm5': 'marketplace.nameServiceElf',
  'm6': 'marketplace.nameFullStack',
};

// ── Props ──────────────────────────────────────────────
interface AvatarMarketplaceProps {
  onRent?: (avatar: MarketplaceAvatar) => void;
}

// ── Avatar Card ────────────────────────────────────────
function AvatarCard({
  avatar,
  onRent,
  domainLabel,
  nameLabel,
  skillLabelMap,
  t,
}: {
  avatar: MarketplaceAvatar;
  onRent: (avatar: MarketplaceAvatar) => void;
  domainLabel: string;
  nameLabel: string;
  skillLabelMap: Record<string, string>;
  t: (key: string) => string;
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
              {domainLabel}
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
              {nameLabel}
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
            <span className="text-[11px] text-slate-500">{t('marketplace.perHour')}</span>
          </div>

          {/* Skill badges */}
          <div className="flex flex-wrap gap-1">
            {avatar.skills.map((skill) => (
              <Badge
                key={skill}
                variant="outline"
                className="border-slate-600/30 bg-slate-700/20 text-[10px] text-slate-300 hover:bg-slate-700/40"
              >
                {skillLabelMap[skill] || skill}
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
            {t('marketplace.rent')}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Main Component ─────────────────────────────────────
export default function AvatarMarketplace({ onRent }: AvatarMarketplaceProps) {
  const { t } = useI18n();
  const [searchQuery, setSearchQuery] = useState('');
  const [domainFilter, setDomainFilter] = useState('all');
  const [sortBy, setSortBy] = useState('default');

  // Build translation mappings
  const domainLabelMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const key of Object.keys(DOMAIN_LABEL_KEYS)) {
      map[key] = t(DOMAIN_LABEL_KEYS[key]);
    }
    return map;
  }, [t]);

  const skillLabelMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const key of Object.keys(SKILL_LABEL_KEYS)) {
      map[key] = t(SKILL_LABEL_KEYS[key]);
    }
    return map;
  }, [t]);

  const nameLabelMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const key of Object.keys(AVATAR_NAME_KEYS)) {
      map[key] = t(AVATAR_NAME_KEYS[key]);
    }
    return map;
  }, [t]);

  // Filter & sort logic
  const filteredAvatars = useMemo(() => {
    let result = [...MARKETPLACE_DATA];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          (nameLabelMap[a.id]?.toLowerCase().includes(q)) ||
          a.skills.some((s) => s.toLowerCase().includes(q) || (skillLabelMap[s]?.toLowerCase().includes(q))) ||
          a.domain.toLowerCase().includes(q) ||
          (domainLabelMap[a.domain]?.toLowerCase().includes(q))
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
  }, [searchQuery, domainFilter, sortBy, nameLabelMap, skillLabelMap, domainLabelMap]);

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
          {t('marketplace.title')}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4 pt-0">
        {/* ── Search & Filters ──────────────────────── */}
        <div className="space-y-3">
          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-500" />
            <Input
              placeholder={t('marketplace.searchPlaceholder')}
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
                <SelectValue placeholder={t('marketplace.domainPlaceholder')} />
              </SelectTrigger>
              <SelectContent className="border-slate-700 bg-slate-800 text-slate-200">
                {DOMAIN_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs focus:bg-slate-700 focus:text-slate-100">
                    {t(opt.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger
                size="sm"
                className="h-8 w-auto min-w-[110px] border-slate-700 bg-slate-900/60 text-xs text-slate-300 [&_svg]:text-slate-500"
              >
                <SelectValue placeholder={t('marketplace.sortPlaceholder')} />
              </SelectTrigger>
              <SelectContent className="border-slate-700 bg-slate-800 text-slate-200">
                {SORT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs focus:bg-slate-700 focus:text-slate-100">
                    {t(opt.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Result count */}
            <span className="ml-auto text-[11px] text-slate-500">
              {t('marketplace.avatarCount', { count: filteredAvatars.length })}
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
                domainLabel={domainLabelMap[avatar.domain] || avatar.domain}
                nameLabel={`${nameLabelMap[avatar.id] || avatar.name.replace('.soul', '')}.soul`}
                skillLabelMap={skillLabelMap}
                t={t}
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
            <p className="text-sm text-slate-500">{t('marketplace.emptyTitle')}</p>
            <p className="text-xs text-slate-600">{t('marketplace.emptyHint')}</p>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}

export type { MarketplaceAvatar };
