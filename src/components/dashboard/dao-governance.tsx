'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Vote,
  Users,
  TreePine,
  Landmark,
  Clock,
  Shield,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
  ChevronUp,
  Gavel,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lock,
  Copy,
  ExternalLink,
  Settings,
  UserCheck,
  Banknote,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useI18n } from '@/hooks/use-i18n';
import type { TranslateFn } from '@/hooks/use-i18n';

// ── Types ─────────────────────────────────────────────────────

interface Proposal {
  id: string;
  title: string;
  category: string;
  status: 'active' | 'passed' | 'defeated' | 'queued';
  proposer: string;
  createdAt: string;
  endTime: string;
  description: string;
  votesFor: number;
  votesAgainst: number;
  votesAbstain: number;
  totalVotingPower: number;
  quorum: number;
  executionHash: string;
  riskAssessment: 'low' | 'medium' | 'high';
  executedAt?: string;
}

interface VotingStats {
  totalVoters: number;
  participationRate: number;
  averageQuorum: number;
  proposalsTotal: number;
  proposalsPassed: number;
  proposalsActive: number;
  proposalsDefeated: number;
}

interface DelegationEdge {
  delegator: string;
  delegatee: string;
  weight: number;
  domain: string;
  isActive: boolean;
}

interface TopDelegate {
  address: string;
  name: string;
  votingPower: number;
  proposalsVoted: number;
  agreementRate: number;
  delegators: number;
  domains: string[];
}

interface TreasuryTx {
  type: 'income' | 'expense';
  amount: number;
  description: string;
  txHash: string;
  timestamp: string;
}

interface Treasury {
  balance: number;
  currency: string;
  allocated: number;
  available: number;
  monthlyIncome: number;
  monthlyExpense: number;
  recentTransactions: TreasuryTx[];
}

interface GovernanceParams {
  votingPeriod: string;
  proposalThreshold: string;
  quorum: string;
  executionDelay: string;
  timeLock: string;
}

interface VotingHistoryPoint {
  date: string;
  participation: number;
  proposals: number;
}

interface DAOData {
  proposals: Proposal[];
  votingStats: VotingStats;
  delegationTree: DelegationEdge[];
  topDelegates: TopDelegate[];
  treasury: Treasury;
  governanceParams: GovernanceParams;
  votingHistory: VotingHistoryPoint[];
}

// ── Helpers ───────────────────────────────────────────────────

function formatNumber(n: number, decimals = 0): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(decimals > 0 ? 1 : 0)}K`;
  return n.toFixed(decimals);
}

function formatAFC(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M AFC`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K AFC`;
  return `${n.toFixed(0)} AFC`;
}

function getTimeRemaining(t: TranslateFn, endTime: string): string {
  const diff = new Date(endTime).getTime() - Date.now();
  if (diff <= 0) return t('dao.ended');
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return t('dao.daysHours', { days, hours });
  return t('dao.hoursOnly', { hours });
}

function getTimeAgo(t: TranslateFn, iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return t('dao.justNow');
  if (hours < 24) return t('dao.hoursAgo', { hours });
  const days = Math.floor(hours / 24);
  if (days < 30) return t('dao.daysAgo', { days });
  return t('dao.monthsAgo', { months: Math.floor(days / 30) });
}

function getCategoryStyle(cat: string): string {
  switch (cat) {
    case 'economics': return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30';
    case 'technical': return 'bg-blue-500/10 text-blue-300 border-blue-500/30';
    case 'security': return 'bg-red-500/10 text-red-300 border-red-500/30';
    case 'compliance': return 'bg-amber-500/10 text-amber-300 border-amber-500/30';
    case 'community': return 'bg-violet-500/10 text-violet-300 border-violet-500/30';
    default: return 'bg-slate-500/10 text-slate-300 border-slate-500/30';
  }
}

function getCategoryLabel(t: TranslateFn, cat: string): string {
  const map: Record<string, string> = {
    economics: t('dao.economics'),
    technical: t('dao.technical'),
    security: t('dao.security'),
    compliance: t('dao.categoryCompliance'),
    community: t('dao.community'),
  };
  return map[cat] ?? cat;
}

function getStatusStyle(status: string): string {
  switch (status) {
    case 'active': return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30';
    case 'passed': return 'bg-blue-500/10 text-blue-300 border-blue-500/30';
    case 'defeated': return 'bg-red-500/10 text-red-300 border-red-500/30';
    case 'queued': return 'bg-amber-500/10 text-amber-300 border-amber-500/30';
    default: return 'bg-slate-500/10 text-slate-300 border-slate-500/30';
  }
}

function getStatusLabel(t: TranslateFn, status: string): string {
  const map: Record<string, string> = {
    active: t('dao.statusVoting'),
    passed: t('dao.passed'),
    defeated: t('dao.defeated'),
    queued: t('dao.queued'),
  };
  return map[status] ?? status;
}

function getRiskStyle(risk: string): string {
  switch (risk) {
    case 'low': return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30';
    case 'medium': return 'bg-amber-500/10 text-amber-300 border-amber-500/30';
    case 'high': return 'bg-red-500/10 text-red-300 border-red-500/30';
    default: return 'bg-slate-500/10 text-slate-300 border-slate-500/30';
  }
}

function getRiskLabel(t: TranslateFn, risk: string): string {
  const map: Record<string, string> = { low: t('dao.lowRisk'), medium: t('dao.mediumRisk'), high: t('dao.highRisk') };
  return map[risk] ?? risk;
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
    <div className={cn('rounded-xl border bg-gradient-to-br p-3 space-y-1', colorMap[color])}>
      <div className="flex items-center gap-1.5">
        <span className={iconColorMap[color]}>{icon}</span>
        <span className="text-[10px] text-slate-400 uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-lg font-bold text-white">{value}</p>
      {subValue && <p className="text-[11px] text-slate-400">{subValue}</p>}
    </div>
  );
}

function CircularGauge({ value, size = 80, strokeWidth = 6, color = '#10b981' }: {
  value: number; size?: number; strokeWidth?: number; color?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#334155" strokeWidth={strokeWidth} />
      <motion.circle
        cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeLinecap="round" strokeDasharray={circumference} initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }} transition={{ duration: 1, ease: 'easeOut' }}
      />
    </svg>
  );
}

// ── Proposal Card ─────────────────────────────────────────────

function ProposalCard({ proposal, expanded, onToggle, t }: {
  proposal: Proposal; expanded: boolean; onToggle: () => void; t: TranslateFn;
}) {
  const totalVotes = proposal.votesFor + proposal.votesAgainst + proposal.votesAbstain;
  const forPct = totalVotes > 0 ? (proposal.votesFor / totalVotes) * 100 : 0;
  const againstPct = totalVotes > 0 ? (proposal.votesAgainst / totalVotes) * 100 : 0;
  const abstainPct = totalVotes > 0 ? (proposal.votesAbstain / totalVotes) * 100 : 0;
  const quorumPct = totalVotes > 0 ? (totalVotes / proposal.totalVotingPower) * 100 : 0;
  const quorumTargetPct = (proposal.quorum / proposal.totalVotingPower) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-slate-700/50 bg-slate-800/60 p-4 space-y-3 hover:bg-slate-800/80 transition-colors"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm font-semibold text-white truncate">{proposal.title}</h4>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', getCategoryStyle(proposal.category))}>
              {getCategoryLabel(t, proposal.category)}
            </Badge>
            <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', getStatusStyle(proposal.status))}>
              {getStatusLabel(t, proposal.status)}
            </Badge>
            <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', getRiskStyle(proposal.riskAssessment))}>
              {getRiskLabel(t, proposal.riskAssessment)}
            </Badge>
          </div>
        </div>
      </div>

      {/* Description */}
      <p className={cn('text-xs text-slate-400 leading-relaxed', !expanded && 'line-clamp-2')}>
        {proposal.description}
      </p>
      <button onClick={onToggle} className="text-[10px] text-violet-400 hover:text-violet-300 flex items-center gap-0.5">
        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        {expanded ? t('dao.collapse') : t('dao.expand')}
      </button>

      {/* Voting progress bar */}
      <div className="space-y-1.5">
        <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-700/50">
          <motion.div
            className="bg-emerald-500" initial={{ width: 0 }}
            animate={{ width: `${forPct}%` }} transition={{ duration: 0.6 }}
          />
          <motion.div
            className="bg-red-500" initial={{ width: 0 }}
            animate={{ width: `${againstPct}%` }} transition={{ duration: 0.6, delay: 0.1 }}
          />
          <motion.div
            className="bg-slate-500" initial={{ width: 0 }}
            animate={{ width: `${abstainPct}%` }} transition={{ duration: 0.6, delay: 0.2 }}
          />
        </div>
        <div className="flex items-center justify-between text-[10px]">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-emerald-300">{t('dao.forLabel')} {formatNumber(proposal.votesFor)} ({forPct.toFixed(1)}%)</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-1.5 rounded-full bg-red-500" />
              <span className="text-red-300">{t('dao.againstLabel')} {formatNumber(proposal.votesAgainst)} ({againstPct.toFixed(1)}%)</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-1.5 rounded-full bg-slate-500" />
              <span className="text-slate-400">{t('dao.abstainLabel')} {formatNumber(proposal.votesAbstain)} ({abstainPct.toFixed(1)}%)</span>
            </span>
          </div>
        </div>
      </div>

      {/* Quorum progress */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-slate-400">
            {t('dao.quorum')}: {formatNumber(totalVotes)}/{formatNumber(proposal.quorum)} ({quorumPct.toFixed(1)}%)
          </span>
          <span className={cn(
            quorumPct >= quorumTargetPct ? 'text-emerald-400' : 'text-amber-400'
          )}>
            {quorumPct >= quorumTargetPct ? t('dao.quorumReached') : t('dao.quorumNotReached')}
          </span>
        </div>
        <Progress
          value={Math.min(quorumPct, 100)}
          className="h-1.5 bg-slate-700/50"
          classNameIndicator={cn(
            quorumPct >= quorumTargetPct
              ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
              : 'bg-gradient-to-r from-amber-500 to-amber-400'
          )}
        />
      </div>

      {/* Footer info */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3 text-[10px] text-slate-500">
          <span className="font-mono">{proposal.proposer}</span>
          <Separator orientation="vertical" className="h-3 bg-slate-700" />
          {proposal.status === 'active' ? (
            <span className="flex items-center gap-1 text-amber-300">
              <Clock className="h-3 w-3" />
              {t('dao.timeRemaining')} {getTimeRemaining(t, proposal.endTime)}
            </span>
          ) : proposal.status === 'passed' && proposal.executedAt ? (
            <span className="flex items-center gap-1 text-blue-300">
              <CheckCircle2 className="h-3 w-3" />
              {t('dao.executedAt')} {getTimeAgo(t, proposal.executedAt)}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-slate-400">
              <Clock className="h-3 w-3" />
              {t('dao.endedAt')} {getTimeAgo(t, proposal.endTime)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline" size="sm"
            className="h-6 text-[10px] px-2 bg-slate-700/30 border-slate-600/50 text-slate-300 hover:bg-slate-600/50 hover:text-white"
          >
            {t('dao.viewDetails')}
          </Button>
          {proposal.status === 'active' && (
            <Button
              size="sm"
              className="h-6 text-[10px] px-2 bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              <Vote className="h-3 w-3 mr-0.5" />
              {t('dao.vote')}
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── Tab 2: Voting History Chart Tooltip ───────────────────────

function VotingChartTooltip({ active, payload, label, t }: {
  active?: boolean; payload?: Array<{ value: number; dataKey: string; color: string }>; label?: string; t: TranslateFn;
}) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800/95 backdrop-blur-sm px-3 py-2 text-xs shadow-xl">
      <p className="text-slate-300 font-medium mb-1">{t('dao.dateLabel')}: {label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-slate-400">
          <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: entry.color }} />
          {entry.dataKey === 'participation' ? t('dao.participationRate') : t('dao.proposalCount')}: {entry.value}
          {entry.dataKey === 'participation' ? '%' : ''}
        </p>
      ))}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────

export default function DAOGovernance() {
  const { t } = useI18n();
  const [data, setData] = useState<DAOData | null>(null);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [expandedProposals, setExpandedProposals] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch('/api/dao-governance')
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filteredProposals = useMemo(() => {
    if (!data) return [];
    if (categoryFilter === 'all') return data.proposals;
    return data.proposals.filter((p) => p.category === categoryFilter);
  }, [data, categoryFilter]);

  const toggleProposal = (id: string) => {
    setExpandedProposals((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Treasury allocation for pie chart
  const treasuryPieData = useMemo(() => {
    if (!data) return [];
    const reserved = data.treasury.balance - data.treasury.allocated - data.treasury.available;
    return [
      { name: t('dao.available'), value: data.treasury.available, color: '#10b981' },
      { name: t('dao.allocated'), value: data.treasury.allocated, color: '#8b5cf6' },
      { name: t('dao.reserved'), value: reserved > 0 ? reserved : 0, color: '#64748b' },
    ];
  }, [data, t]);

  if (loading || !data) {
    return (
      <Card className="border-slate-700/50 bg-[#1E293B] text-slate-100 shadow-xl shadow-black/20">
        <CardContent className="p-8 flex items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="h-6 w-6 border-2 border-violet-500 border-t-transparent rounded-full"
          />
        </CardContent>
      </Card>
    );
  }

  const { votingStats, delegationTree, topDelegates, treasury, governanceParams, votingHistory } = data;
  const passRate = votingStats.proposalsTotal > 0
    ? ((votingStats.proposalsPassed / votingStats.proposalsTotal) * 100).toFixed(0)
    : '0';

  const activeDelegations = delegationTree.filter((d) => d.isActive).length;
  const totalDelegatedWeight = delegationTree.filter((d) => d.isActive).reduce((s, d) => s + d.weight, 0);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <Card className="border-slate-700/50 bg-[#1E293B] text-slate-100 shadow-xl shadow-black/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Gavel className="h-4 w-4 text-violet-400" />
                {t('dao.dashboard')}
              </CardTitle>
              <CardDescription className="text-xs text-slate-400 mt-0.5">
                {t('dao.subtitle')}
              </CardDescription>
            </div>
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-300 border-emerald-500/30 text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
              {t('dao.governanceActive')}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <Tabs defaultValue="proposals" className="w-full">
            <TabsList className="bg-slate-800/80 h-8 p-0.5">
              <TabsTrigger
                value="proposals"
                className="text-[11px] px-3 py-1 data-[state=active]:bg-slate-700 data-[state=active]:text-violet-300"
              >
                <Vote className="h-3 w-3 mr-1" />
                {t('dao.governanceProposals')}
              </TabsTrigger>
              <TabsTrigger
                value="stats"
                className="text-[11px] px-3 py-1 data-[state=active]:bg-slate-700 data-[state=active]:text-violet-300"
              >
                <TrendingUp className="h-3 w-3 mr-1" />
                {t('dao.votingStatistics')}
              </TabsTrigger>
              <TabsTrigger
                value="delegation"
                className="text-[11px] px-3 py-1 data-[state=active]:bg-slate-700 data-[state=active]:text-violet-300"
              >
                <TreePine className="h-3 w-3 mr-1" />
                {t('dao.delegationNetwork')}
              </TabsTrigger>
              <TabsTrigger
                value="treasury"
                className="text-[11px] px-3 py-1 data-[state=active]:bg-slate-700 data-[state=active]:text-violet-300"
              >
                <Landmark className="h-3 w-3 mr-1" />
                {t('dao.communityTreasury')}
              </TabsTrigger>
            </TabsList>

            {/* ═══════ Tab 1 ═══════ */}
            <TabsContent value="proposals" className="mt-4 space-y-4">
              {/* Stats bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <MetricCard
                  icon={<FileText className="h-3.5 w-3.5" />}
                  label={t('dao.totalProposals')}
                  value={String(votingStats.proposalsTotal)}
                  color="violet"
                />
                <MetricCard
                  icon={<Vote className="h-3.5 w-3.5" />}
                  label={t('dao.statusVoting')}
                  value={String(votingStats.proposalsActive)}
                  color="emerald"
                />
                <MetricCard
                  icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                  label={t('dao.passed')}
                  value={String(votingStats.proposalsPassed)}
                  color="blue"
                />
                <MetricCard
                  icon={<XCircle className="h-3.5 w-3.5" />}
                  label={t('dao.defeated')}
                  value={String(votingStats.proposalsDefeated)}
                  color="red"
                />
              </div>

              {/* Category filter */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {['all', 'economics', 'technical', 'security', 'compliance', 'community'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={cn(
                      'text-[10px] px-2.5 py-1 rounded-full border transition-colors',
                      categoryFilter === cat
                        ? 'bg-violet-500/20 text-violet-300 border-violet-500/40'
                        : 'bg-slate-800/60 text-slate-400 border-slate-700/50 hover:bg-slate-700/60'
                    )}
                  >
                    {cat === 'all' ? t('common.all') : getCategoryLabel(t, cat)}
                  </button>
                ))}
              </div>

              {/* Proposal list */}
              <ScrollArea className="max-h-[500px] pr-1">
                  <div className="space-y-3">
                    {filteredProposals.map((proposal) => (
                      <ProposalCard
                        key={proposal.id}
                        proposal={proposal}
                        expanded={expandedProposals.has(proposal.id)}
                        onToggle={() => toggleProposal(proposal.id)}
                        t={t}
                      />
                    ))}
                  </div>
              </ScrollArea>
            </TabsContent>

            {/* ═══════ Tab 2 ═══════ */}
            <TabsContent value="stats" className="mt-4 space-y-4">
              {/* Key metrics grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <MetricCard
                  icon={<Users className="h-3.5 w-3.5" />}
                  label={t('dao.totalVoters')}
                  value={votingStats.totalVoters.toLocaleString()}
                  color="violet"
                />
                <div className="rounded-xl border bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20 p-3 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-emerald-400"><TrendingUp className="h-3.5 w-3.5" /></span>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider">{t('dao.participationRate')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-bold text-white">{votingStats.participationRate}%</p>
                    <CircularGauge value={votingStats.participationRate} size={36} strokeWidth={4} color="#10b981" />
                  </div>
                </div>
                <MetricCard
                  icon={<Shield className="h-3.5 w-3.5" />}
                  label={t('dao.avgQuorum')}
                  value={`${votingStats.averageQuorum}%`}
                  color="amber"
                />
                <MetricCard
                  icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                  label={t('dao.passRate')}
                  value={`${passRate}%`}
                  subValue={`${votingStats.proposalsPassed}/${votingStats.proposalsTotal}`}
                  color="blue"
                />
              </div>

              {/* Voting history chart */}
              <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="h-3.5 w-3.5 text-violet-400" />
                  <span className="text-xs text-slate-300 font-medium">{t('dao.votingTrend')}</span>
                </div>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={votingHistory} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10, fill: '#94a3b8' }}
                        axisLine={{ stroke: '#334155' }}
                        tickLine={false}
                      />
                      <YAxis
                        yAxisId="left"
                        tick={{ fontSize: 10, fill: '#94a3b8' }}
                        axisLine={false}
                        tickLine={false}
                        domain={[0, 100]}
                        tickFormatter={(v: number) => `${v}%`}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        tick={{ fontSize: 10, fill: '#94a3b8' }}
                        axisLine={false}
                        tickLine={false}
                        domain={[0, 5]}
                      />
                      <Tooltip content={<VotingChartTooltip t={t} />} />
                      <Bar yAxisId="left" dataKey="participation" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={24} />
                      <Bar yAxisId="right" dataKey="proposals" fill="#10b981" radius={[4, 4, 0, 0]} barSize={16} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center justify-center gap-6 mt-2 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-1.5 rounded-full bg-violet-500" />
                    <span className="text-slate-400">{t('dao.participationPct')}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-1.5 rounded-full bg-emerald-500" />
                    <span className="text-slate-400">{t('dao.proposalCount')}</span>
                  </div>
                </div>
              </div>

              {/* Governance parameters */}
              <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Settings className="h-3.5 w-3.5 text-amber-400" />
                    <span className="text-xs text-slate-300 font-medium">{t('dao.governanceParams')}</span>
                  </div>
                  <Button
                    variant="outline" size="sm"
                    className="h-6 text-[10px] px-2 bg-slate-700/30 border-slate-600/50 text-slate-300 hover:bg-slate-600/50 hover:text-white"
                  >
                    {t('dao.modifyParams')}
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { icon: <Clock className="h-3.5 w-3.5 text-violet-400" />, label: t('dao.votingPeriod'), value: governanceParams.votingPeriod },
                    { icon: <Banknote className="h-3.5 w-3.5 text-emerald-400" />, label: t('dao.proposalThreshold'), value: governanceParams.proposalThreshold },
                    { icon: <Shield className="h-3.5 w-3.5 text-amber-400" />, label: t('dao.quorum'), value: governanceParams.quorum },
                    { icon: <AlertTriangle className="h-3.5 w-3.5 text-blue-400" />, label: t('dao.executionDelay'), value: governanceParams.executionDelay },
                    { icon: <Lock className="h-3.5 w-3.5 text-red-400" />, label: t('dao.timeLock'), value: governanceParams.timeLock },
                  ].map((param) => (
                    <div
                      key={param.label}
                      className="flex items-center justify-between rounded-lg bg-slate-800/60 px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        {param.icon}
                        <span className="text-xs text-slate-400">{param.label}</span>
                      </div>
                      <span className="text-xs text-white font-medium">{param.value}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-slate-500 mt-2 text-center">
                  {t('dao.paramNote')}
                </p>
              </div>
            </TabsContent>

            {/* ═══════ Tab 3 ═══════ */}
            <TabsContent value="delegation" className="mt-4 space-y-4">
              {/* Delegation overview */}
              <div className="grid grid-cols-2 gap-3">
                <MetricCard
                  icon={<UserCheck className="h-3.5 w-3.5" />}
                  label={t('dao.activeDelegation')}
                  value={String(activeDelegations)}
                  subValue={t('dao.totalCount', { count: delegationTree.length })}
                  color="emerald"
                />
                <MetricCard
                  icon={<Vote className="h-3.5 w-3.5" />}
                  label={t('dao.delegationWeight')}
                  value={`${formatNumber(totalDelegatedWeight)} BPS`}
                  subValue={t('dao.activeOnly')}
                  color="violet"
                />
              </div>

              {/* Top delegates leaderboard */}
              <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Users className="h-3.5 w-3.5 text-violet-400" />
                    <span className="text-xs text-slate-300 font-medium">{t('dao.topDelegates')}</span>
                  </div>
                </div>
                <div className="space-y-3">
                  {topDelegates.map((delegate, idx) => {
                    const maxPower = topDelegates[0].votingPower;
                    const powerPct = (delegate.votingPower / maxPower) * 100;
                    return (
                      <motion.div
                        key={delegate.address}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.08 }}
                        className="rounded-lg border border-slate-700/40 bg-slate-800/60 p-3 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              'flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold',
                              idx === 0 ? 'bg-amber-500/20 text-amber-300' :
                              idx === 1 ? 'bg-slate-400/20 text-slate-300' :
                              idx === 2 ? 'bg-amber-700/20 text-amber-500' :
                              'bg-slate-600/20 text-slate-400'
                            )}>
                              {idx + 1}
                            </span>
                            <div>
                              <p className="text-xs font-semibold text-white">{delegate.name}</p>
                              <p className="text-[10px] text-slate-500 font-mono">{delegate.address}</p>
                            </div>
                          </div>
                          <Button
                            variant="outline" size="sm"
                            className="h-5 text-[9px] px-2 bg-violet-500/10 border-violet-500/30 text-violet-300 hover:bg-violet-500/20 hover:text-violet-200"
                          >
                            {t('dao.delegate')}
                          </Button>
                        </div>

                        {/* Voting power bar */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-slate-400">{t('dao.votingPower')}</span>
                            <span className="text-white font-medium">{formatAFC(delegate.votingPower)}</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-700/50 rounded-full overflow-hidden">
                            <motion.div
                              className="h-full bg-gradient-to-r from-violet-500 to-blue-500 rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${powerPct}%` }}
                              transition={{ duration: 0.5, delay: idx * 0.1 }}
                            />
                          </div>
                        </div>

                        {/* Stats row */}
                        <div className="flex items-center gap-4 text-[10px]">
                          <span className="text-slate-400">
                            {t('dao.proposalsLabel')} <span className="text-white font-medium">{delegate.proposalsVoted}</span>
                          </span>
                          <span className="text-slate-400">
                            {t('dao.agreementRate')} <span className="text-emerald-300 font-medium">{delegate.agreementRate}%</span>
                          </span>
                          <span className="text-slate-400">
                            {t('dao.delegatorsLabel')} <span className="text-white font-medium">{delegate.delegators}</span>
                          </span>
                        </div>

                        {/* Agreement rate bar */}
                        <div className="space-y-0.5">
                          <Progress
                            value={delegate.agreementRate}
                            className="h-1 bg-slate-700/50"
                            classNameIndicator="bg-gradient-to-r from-emerald-500 to-emerald-400"
                          />
                        </div>

                        {/* Domain badges */}
                        <div className="flex items-center gap-1">
                          {delegate.domains.map((domain) => (
                            <Badge
                              key={domain}
                              variant="outline"
                              className={cn('text-[9px] px-1.5 py-0', getCategoryStyle(domain))}
                            >
                              {getCategoryLabel(t, domain)}
                            </Badge>
                          ))}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Delegation tree visualization */}
              <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <TreePine className="h-3.5 w-3.5 text-amber-400" />
                    <span className="text-xs text-slate-300 font-medium">{t('dao.delegationTree')}</span>
                  </div>
                  <Button
                    variant="outline" size="sm"
                    className="h-6 text-[10px] px-2 bg-slate-700/30 border-slate-600/50 text-slate-300 hover:bg-slate-600/50 hover:text-white"
                  >
                    {t('dao.modifyDelegation')}
                  </Button>
                </div>
                <div className="space-y-2">
                  {delegationTree.map((edge, idx) => (
                    <motion.div
                      key={`${edge.delegator}-${edge.delegatee}-${idx}`}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2',
                        edge.isActive ? 'bg-slate-800/60' : 'bg-slate-800/30 opacity-50'
                      )}
                    >
                      {/* Delegator */}
                      <span className="text-[10px] font-mono text-slate-300 min-w-[100px] truncate">
                        {edge.delegator}
                      </span>

                      {/* Arrow */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <div className={cn(
                          'w-1.5 h-1.5 rounded-full',
                          edge.isActive ? 'bg-emerald-400' : 'bg-slate-600'
                        )} />
                        <div className={cn(
                          'w-8 h-px',
                          edge.isActive ? 'bg-emerald-500/50' : 'bg-slate-600/50'
                        )} />
                        <ArrowUpRight className={cn(
                          'h-3 w-3',
                          edge.isActive ? 'text-emerald-400' : 'text-slate-600'
                        )} />
                      </div>

                      {/* Delegatee */}
                      <span className="text-[10px] font-mono text-white min-w-[100px] truncate">
                        {edge.delegatee}
                      </span>

                      {/* Weight */}
                      <span className="text-[10px] text-amber-300 font-medium ml-auto">
                        {edge.weight} BPS
                      </span>

                      {/* Domain badge */}
                      <Badge
                        variant="outline"
                        className={cn('text-[9px] px-1.5 py-0', getCategoryStyle(edge.domain))}
                      >
                        {getCategoryLabel(t, edge.domain)}
                      </Badge>

                      {/* Active/Inactive status */}
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[9px] px-1.5 py-0',
                          edge.isActive
                            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                            : 'bg-slate-500/10 text-slate-400 border-slate-500/30'
                        )}
                      >
                        {edge.isActive ? t('common.active') : t('dao.paused')}
                      </Badge>
                    </motion.div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* ═══════ Tab 4 ═══════ */}
            <TabsContent value="treasury" className="mt-4 space-y-4">
              {/* Treasury overview */}
              <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Landmark className="h-4 w-4 text-amber-400" />
                  <span className="text-sm font-semibold text-white">{t('dao.treasuryOverview')}</span>
                </div>
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="text-3xl font-bold text-white">{formatNumber(treasury.balance)}</span>
                  <span className="text-sm text-amber-300 font-medium">{treasury.currency}</span>
                </div>

                {/* Allocated vs Available bar */}
                <div className="space-y-1.5 mb-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-400">{t('dao.allocatedVsAvailable')}</span>
                    <span className="text-slate-400">
                      {((treasury.allocated / treasury.balance) * 100).toFixed(1)}% / {((treasury.available / treasury.balance) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-700/50">
                    <motion.div
                      className="bg-violet-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${(treasury.allocated / treasury.balance) * 100}%` }}
                      transition={{ duration: 0.6 }}
                    />
                    <motion.div
                      className="bg-emerald-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${(treasury.available / treasury.balance) * 100}%` }}
                      transition={{ duration: 0.6, delay: 0.1 }}
                    />
                  </div>
                  <div className="flex items-center gap-4 text-[10px]">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-1.5 rounded-full bg-violet-500" />
                      <span className="text-violet-300">{t('dao.allocated')} {formatAFC(treasury.allocated)}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-1.5 rounded-full bg-emerald-500" />
                      <span className="text-emerald-300">{t('dao.available')} {formatAFC(treasury.available)}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Monthly income/expense cards */}
              <div className="grid grid-cols-2 gap-3">
                <MetricCard
                  icon={<ArrowUpRight className="h-3.5 w-3.5" />}
                  label={t('dao.monthlyIncome')}
                  value={formatAFC(treasury.monthlyIncome)}
                  color="emerald"
                />
                <MetricCard
                  icon={<ArrowDownRight className="h-3.5 w-3.5" />}
                  label={t('dao.monthlyExpense')}
                  value={formatAFC(treasury.monthlyExpense)}
                  color="red"
                />
              </div>

              {/* Treasury allocation pie chart */}
              <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Banknote className="h-3.5 w-3.5 text-violet-400" />
                  <span className="text-xs text-slate-300 font-medium">{t('dao.treasuryAllocation')}</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-32 h-32 flex-shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={treasuryPieData}
                          cx="50%" cy="50%"
                          innerRadius={30} outerRadius={55}
                          paddingAngle={2}
                          dataKey="value"
                          strokeWidth={0}
                        >
                          {treasuryPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1e293b',
                            border: '1px solid #334155',
                            borderRadius: '8px',
                            fontSize: '11px',
                            color: '#e2e8f0',
                          }}
                          formatter={(value: number) => [formatAFC(value)]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2 flex-1">
                    {treasuryPieData.map((item) => (
                      <div key={item.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-xs text-slate-300">{item.name}</span>
                        </div>
                        <span className="text-xs text-white font-medium">{formatAFC(item.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recent transactions */}
              <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5 text-blue-400" />
                    <span className="text-xs text-slate-300 font-medium">{t('dao.recentTransactions')}</span>
                  </div>
                  <span className="text-[10px] text-slate-500">{t('dao.transactionCount', { count: treasury.recentTransactions.length })}</span>
                </div>
                <ScrollArea className="max-h-64">
                  <div className="space-y-2">
                    {treasury.recentTransactions.map((tx, idx) => (
                      <motion.div
                        key={`${tx.txHash}-${idx}`}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="flex items-center justify-between rounded-lg bg-slate-800/60 px-3 py-2 hover:bg-slate-700/60 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          {tx.type === 'income' ? (
                            <ArrowUpRight className="h-3.5 w-3.5 text-emerald-400" />
                          ) : (
                            <ArrowDownRight className="h-3.5 w-3.5 text-red-400" />
                          )}
                          <div>
                            <div className="flex items-center gap-1.5">
                              <Badge
                                variant="outline"
                                className={cn(
                                  'text-[10px] px-1.5 py-0',
                                  tx.type === 'income'
                                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                                    : 'bg-red-500/10 text-red-300 border-red-500/30'
                                )}
                              >
                                {tx.type === 'income' ? t('dao.income') : t('dao.expense')}
                              </Badge>
                              <span className="text-xs text-slate-300">{tx.description}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-slate-500 font-mono">{tx.txHash}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={cn(
                            'text-xs font-medium',
                            tx.type === 'income' ? 'text-emerald-300' : 'text-red-300'
                          )}>
                            {tx.type === 'income' ? '+' : '-'}{formatNumber(tx.amount)} AFC
                          </p>
                          <p className="text-[10px] text-slate-500">{getTimeAgo(t, tx.timestamp)}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Submit funding proposal button */}
              <Button
                className="w-full bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white text-xs font-medium h-9"
              >
                <Landmark className="h-3.5 w-3.5 mr-1.5" />
                {t('dao.submitGrantProposal')}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </motion.div>
  );
}
