'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Brain,
  Wallet,
  Activity,
  Shield,
  Sparkles,
  Clock,
  DollarSign,
  Users,
  Menu,
  X,
  Zap,
  Scale,
  FlaskConical,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DashboardState } from '@/lib/types';
import {
  MOCK_AVATAR,
  MOCK_AVATAR_SKILLS,
  MOCK_REVENUE_SUMMARY,
  MOCK_REVENUES,
  MOCK_DELEGATIONS,
  MOCK_TIMELINE,
  MOCK_RESONANCE_HISTORY,
} from '@/lib/mock-data';

import CognitiveCard from '@/components/dashboard/cognitive-card';
import SplitDashboard from '@/components/dashboard/split-dashboard';
import ResonanceWave from '@/components/dashboard/resonance-wave';
import CircuitPanel from '@/components/dashboard/circuit-panel';
import IFDDelegation from '@/components/dashboard/ifd-delegation';
import SkillVault from '@/components/dashboard/skill-vault';
import CognitiveTimeline from '@/components/dashboard/cognitive-timeline';
import X402Payment from '@/components/dashboard/x402-payment';
import AvatarMarketplace from '@/components/dashboard/avatar-marketplace';
import NotificationCenter from '@/components/dashboard/notification-center';
import CompliancePanel from '@/components/dashboard/compliance-panel';
import SecurityAudit from '@/components/dashboard/security-audit';
import LPLiquidity from '@/components/dashboard/lp-liquidity';
import ContractSimulation from '@/components/dashboard/contract-simulation';

// ── Navigation Items ──────────────────────────────────────────
const NAV_ITEMS = [
  { id: 'overview', label: '总览', icon: Brain },
  { id: 'revenue', label: '收益', icon: DollarSign },
  { id: 'resonance', label: '共振', icon: Activity },
  { id: 'skills', label: '技能', icon: Sparkles },
  { id: 'marketplace', label: '市场', icon: Users },
  { id: 'liquidity', label: '流动性', icon: DollarSign },
  { id: 'simulation', label: '模拟', icon: FlaskConical },
  { id: 'governance', label: '治理', icon: Users },
  { id: 'timeline', label: '时间线', icon: Clock },
  { id: 'security', label: '安全', icon: Shield },
  { id: 'compliance', label: '合规', icon: Scale },
];

// ── Mobile Bottom Nav Items ───────────────────────────────────
const MOBILE_NAV = [
  { id: 'overview', label: '总览', icon: Brain },
  { id: 'revenue', label: '收益', icon: DollarSign },
  { id: 'marketplace', label: '市场', icon: Users },
  { id: 'security', label: '安全', icon: Shield },
];

const INITIAL_DATA: DashboardState = {
  avatar: MOCK_AVATAR,
  skills: MOCK_AVATAR_SKILLS,
  revenueSummary: MOCK_REVENUE_SUMMARY,
  recentRevenues: MOCK_REVENUES,
  delegations: MOCK_DELEGATIONS,
  timeline: MOCK_TIMELINE,
  resonanceHistory: MOCK_RESONANCE_HISTORY,
};

export default function Home() {
  const [activeSection, setActiveSection] = useState('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentService, setPaymentService] = useState('GPT-4o 文本生成');
  const [paymentAmount, setPaymentAmount] = useState(0.02);
  const [data] = useState<DashboardState>(INITIAL_DATA);

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F172A]">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <Brain className="w-12 h-12 text-violet-400 animate-pulse" />
          <p className="text-slate-400 text-sm">正在加载认知分身系统...</p>
        </motion.div>
      </div>
    );
  }

  const scrollTo = (id: string) => {
    setActiveSection(id);
    setMobileMenuOpen(false);
    const el = document.getElementById(`section-${id}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-50 flex flex-col">
      {/* ── Header ──────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-[#0F172A]/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="max-w-[1600px] mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-sm tracking-tight hidden sm:inline">
              认知分身协议
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-300 font-mono">
              MVP
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Resonance Indicator */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-emerald-300 font-medium">{data.avatar.resonanceScore}</span>
            </div>

            {/* Wallet Connect */}
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 hover:border-violet-500/50 transition-colors text-xs">
              <Wallet className="w-3.5 h-3.5 text-violet-400" />
              <span className="hidden sm:inline text-slate-300 font-mono">{data.avatar.soulId}</span>
              <span className="sm:hidden text-slate-300 font-mono">0x7a3f</span>
            </button>

            {/* Notification Center */}
            <NotificationCenter />

            {/* x402 Quick Pay */}
            <button
              onClick={() => {
                setPaymentService('GPT-4o 文本生成');
                setPaymentAmount(0.02);
                setPaymentOpen(true);
              }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 transition-all text-xs font-medium"
            >
              <Zap className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">x402 支付</span>
            </button>

            {/* Mobile Menu Toggle */}
            <button
              className="lg:hidden p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Content ────────────────────────────── */}
      <div className="flex-1 flex max-w-[1600px] mx-auto w-full">
        {/* ── Desktop Sidebar ─────────────────────── */}
        <aside className="hidden lg:flex flex-col w-[220px] shrink-0 border-r border-slate-800/50 py-6 px-3 sticky top-14 h-[calc(100vh-3.5rem)]">
          <nav className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollTo(item.id)}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all',
                  activeSection === item.id
                    ? 'bg-violet-500/15 text-violet-300 font-medium'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                )}
              >
                <item.icon className={cn(
                  'w-4 h-4',
                  activeSection === item.id ? 'text-violet-400' : 'text-slate-500'
                )} />
                {item.label}
              </button>
            ))}
          </nav>

          {/* Tier Badge */}
          <div className="mt-auto p-3 rounded-xl bg-gradient-to-br from-violet-500/10 to-blue-500/10 border border-violet-500/20">
            <div className="text-[10px] text-violet-300/60 uppercase tracking-widest mb-1">当前方案</div>
            <div className="text-sm font-semibold text-violet-200">Pro</div>
            <div className="text-[10px] text-slate-500 mt-0.5">3 个分身 · 优先算力</div>
          </div>
        </aside>

        {/* ── Mobile Slide-out Menu ────────────────── */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="fixed inset-0 z-40 lg:hidden"
          >
            <div className="absolute inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)} />
            <div className="absolute left-0 top-0 bottom-0 w-64 bg-[#0F172A] border-r border-slate-800 p-4 pt-20">
              <nav className="flex flex-col gap-1">
                {NAV_ITEMS.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => scrollTo(item.id)}
                    className={cn(
                      'flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all',
                      activeSection === item.id
                        ? 'bg-violet-500/15 text-violet-300 font-medium'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </button>
                ))}
              </nav>
            </div>
          </motion.div>
        )}

        {/* ── Dashboard Grid ─────────────────────── */}
        <main className="flex-1 p-4 lg:p-6 space-y-6 pb-24 lg:pb-6 overflow-y-auto">
          {/* Row 1: Identity + Revenue */}
          <div id="section-overview" className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <CognitiveCard avatar={data.avatar} skills={data.skills} />
            </motion.div>
            <motion.div
              id="section-revenue"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <SplitDashboard summary={data.revenueSummary} recentRevenues={data.recentRevenues} />
            </motion.div>
          </div>

          {/* Row 2: Resonance + Circuit */}
          <div id="section-resonance" className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <motion.div
              className="xl:col-span-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <ResonanceWave
                data={data.resonanceHistory}
                currentScore={data.avatar.resonanceScore}
                circuitState={data.avatar.circuitState}
              />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <CircuitPanel avatar={data.avatar} />
            </motion.div>
          </div>

          {/* Row 3: Skills + IFD */}
          <div id="section-skills" className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <SkillVault
                skills={data.skills}
                cumulativeRevenue={data.revenueSummary.totalRevenue}
                currentTier={data.avatar.tier}
              />
            </motion.div>
            <motion.div
              id="section-governance"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <IFDDelegation delegations={data.delegations} />
            </motion.div>
          </div>

          {/* Row 4: Marketplace (full width) */}
          <motion.div
            id="section-marketplace"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <AvatarMarketplace
              onRent={(avatar) => {
                setPaymentService(`租用 ${avatar.name}`);
                setPaymentAmount(avatar.hourlyRate * 0.01);
                setPaymentOpen(true);
              }}
            />
          </motion.div>

          {/* Row 5: LP Liquidity (full width) */}
          <motion.div
            id="section-liquidity"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            <LPLiquidity />
          </motion.div>

          {/* Row 6: Contract Simulation (full width) */}
          <motion.div
            id="section-simulation"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.85 }}
          >
            <ContractSimulation />
          </motion.div>

          {/* Row 7: Timeline (full width) */}
          <motion.div
            id="section-timeline"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
          >
            <CognitiveTimeline events={data.timeline} />
          </motion.div>

          {/* Row 8: Security + Compliance */}
          <div id="section-security" className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0 }}
            >
              <SecurityAudit />
            </motion.div>
            <motion.div
              id="section-compliance"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1 }}
            >
              <CompliancePanel />
            </motion.div>
          </div>
        </main>
      </div>

      {/* ── Mobile Bottom Navigation ──────────────── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0F172A]/90 backdrop-blur-xl border-t border-slate-800/50 safe-area-pb">
        <div className="flex items-center justify-around h-14">
          {MOBILE_NAV.map((item) => (
            <button
              key={item.id}
              onClick={() => scrollTo(item.id)}
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-all',
                activeSection === item.id
                  ? 'text-violet-300'
                  : 'text-slate-500 hover:text-slate-300'
              )}
            >
              <item.icon className={cn(
                'w-5 h-5',
                activeSection === item.id && 'text-violet-400'
              )} />
              <span className="text-[10px]">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* ── x402 Payment Dialog ──────────────────── */}
      <X402Payment
        isOpen={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        service={paymentService}
        amount={paymentAmount}
      />

      {/* ── Footer ────────────────────────────────── */}
      <footer className="hidden lg:block border-t border-slate-800/50 bg-[#0F172A] mt-auto">
        <div className="max-w-[1600px] mx-auto px-6 h-10 flex items-center justify-between text-[10px] text-slate-600">
          <span>认知分身协议 · Cognitive Avatar Protocol · Web4.0</span>
          <span>Base L2 MVP → AFC 主网平滑迁移</span>
        </div>
      </footer>
    </div>
  );
}
