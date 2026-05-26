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
  Gauge,
  Globe,
  Radio,
  Flag,
  Link2,
  Code2,
  Vote,
  Puzzle,
  FileCode,
  Cog,
  Database,
  ChevronsLeft,
  ChevronsRight,
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
import { useDashboardStore } from '@/stores/dashboard-store';
import { useWeb3Store } from '@/stores/web3-store';
import { useI18n } from '@/hooks/use-i18n';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { useEngineStatus } from '@/hooks/use-engine-status';
import { LanguageSwitcher } from '@/components/ui/language-switcher';

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
import PerformanceDashboard from '@/components/dashboard/performance-dashboard';
import DeploymentCenter from '@/components/dashboard/deployment-center';
import MonitoringCenter from '@/components/dashboard/monitoring-center';
import FeatureFlags from '@/components/dashboard/feature-flags';
import MultichainDeploy from '@/components/dashboard/multichain-deploy';
import SdkPlatform from '@/components/dashboard/sdk-platform';
import DaoGovernance from '@/components/dashboard/dao-governance';
import EcosystemHub from '@/components/dashboard/ecosystem-hub';
import ContractsArch from '@/components/dashboard/contracts-arch';
import EngineArch from '@/components/dashboard/engine-arch';
import Web3Integration from '@/components/dashboard/web3-integration';
import DataInfra from '@/components/dashboard/data-infra';
import EngineStatusDashboard from '@/components/dashboard/engine-status';
import Web3Wallet from '@/components/dashboard/web3-wallet';

// ── Navigation Items ──────────────────────────────────────────
const NAV_ITEMS = [
  { id: 'overview', navKey: 'nav.overview', icon: Brain },
  { id: 'revenue', navKey: 'nav.split', icon: DollarSign },
  { id: 'resonance', navKey: 'nav.resonance', icon: Activity },
  { id: 'skills', navKey: 'nav.skills', icon: Sparkles },
  { id: 'marketplace', navKey: 'nav.marketplace', icon: Users },
  { id: 'liquidity', navKey: 'nav.liquidity', icon: DollarSign },
  { id: 'simulation', navKey: 'nav.simulation', icon: FlaskConical },
  { id: 'governance', navKey: 'nav.governance', icon: Users },
  { id: 'timeline', navKey: 'nav.timeline', icon: Clock },
  { id: 'security', navKey: 'nav.security', icon: Shield },
  { id: 'compliance', navKey: 'nav.compliance', icon: Scale },
  { id: 'performance', navKey: 'nav.performance', icon: Gauge },
  { id: 'deployment', navKey: 'nav.deployment', icon: Globe },
  { id: 'monitoring', navKey: 'nav.monitoring', icon: Radio },
  { id: 'flags', navKey: 'nav.featureFlags', icon: Flag },
  { id: 'multichain', navKey: 'nav.multichain', icon: Link2 },
  { id: 'sdk', navKey: 'nav.sdk', icon: Code2 },
  { id: 'dao', navKey: 'nav.dao', icon: Vote },
  { id: 'ecosystem', navKey: 'nav.ecosystem', icon: Puzzle },
  { id: 'contracts', navKey: 'nav.contracts', icon: FileCode },
  { id: 'engine', navKey: 'nav.engine', icon: Cog },
  { id: 'web3', navKey: 'nav.web3', icon: Wallet },
  { id: 'data', navKey: 'nav.data', icon: Database },
];

// ── Mobile Bottom Nav Items ───────────────────────────────────
const MOBILE_NAV = [
  { id: 'overview', navKey: 'nav.overview', icon: Brain },
  { id: 'revenue', navKey: 'nav.split', icon: DollarSign },
  { id: 'marketplace', navKey: 'nav.marketplace', icon: Users },
  { id: 'security', navKey: 'nav.security', icon: Shield },
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

// ── Web3 Connect Button (using Web3Store) ────────────────────
function Web3ConnectButton() {
  const { address, isConnected } = useWeb3Store();
  const truncated = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : 'Connect';
  const truncatedShort = address
    ? `${address.slice(0, 6)}...`
    : 'Connect';

  return (
    <button
      aria-label="Connect wallet"
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 hover:border-violet-500/50 transition-colors text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
    >
      <Wallet className="w-3.5 h-3.5 text-violet-400" />
      {isConnected ? (
        <>
          <span className="hidden sm:inline text-slate-300 font-mono">{truncated}</span>
          <span className="sm:hidden text-slate-300 font-mono">{truncatedShort}</span>
        </>
      ) : (
        <span className="text-slate-300">{truncated}</span>
      )}
    </button>
  );
}

export default function Home() {
  const { activeSection, setActiveSection, sidebarCollapsed, toggleSidebar } = useDashboardStore();
  const { t } = useI18n();
  const {
    avatar, skills, revenueSummary, recentRevenues,
    delegations, timeline, resonanceHistory, isLoading,
  } = useDashboardData();
  const engineStatus = useEngineStatus();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentService, setPaymentService] = useState('GPT-4o 文本生成');
  const [paymentAmount, setPaymentAmount] = useState(0.02);

  // Construct DashboardState from store data, falling back to mock
  const dashboardData: DashboardState = (avatar && revenueSummary)
    ? { avatar, skills, revenueSummary, recentRevenues, delegations, timeline, resonanceHistory }
    : INITIAL_DATA;

  if (isLoading && !avatar) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F172A]">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <Brain className="w-12 h-12 text-violet-400 animate-pulse" />
          <p className="text-slate-400 text-sm">{t('dashboard.loadingSystem')}</p>
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
              {t('dashboard.title')}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
              {t('dashboard.phase')} 6
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Resonance Indicator */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-emerald-300 font-medium">{dashboardData.avatar.resonanceScore}</span>
            </div>

            {/* Service Health Indicator */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <div className={cn(
                "w-1.5 h-1.5 rounded-full",
                engineStatus.allConnected ? "bg-emerald-400 animate-pulse" : "bg-amber-400 animate-pulse"
              )} />
              <span className="text-xs text-slate-300 font-mono">{engineStatus.connectedCount}/{engineStatus.totalServices}</span>
            </div>

            {/* Language Switcher */}
            <LanguageSwitcher />

            {/* Wallet Connect */}
            <Web3ConnectButton />

            {/* Notification Center */}
            <NotificationCenter />

            {/* x402 Quick Pay */}
            <button
              aria-label="Quick payment"
              onClick={() => {
                setPaymentService(t('dashboard.defaultService'));
                setPaymentAmount(0.02);
                setPaymentOpen(true);
              }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 transition-all text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
            >
              <Zap className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('nav.payment')}</span>
            </button>

            {/* Mobile Menu Toggle */}
            <button
              aria-label="Toggle menu"
              className="lg:hidden p-1.5 rounded-lg hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
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
        <aside className={cn(
          "hidden lg:flex flex-col shrink-0 border-r border-slate-800/50 py-6 sticky top-14 h-[calc(100vh-3.5rem)] transition-all duration-300",
          sidebarCollapsed ? "w-[60px] px-1.5" : "w-[220px] px-3"
        )}>
          <nav className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                aria-label={t(item.navKey)}
                onClick={() => scrollTo(item.id)}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900',
                  sidebarCollapsed ? 'px-2 py-2 justify-center' : 'px-3 py-2',
                  activeSection === item.id
                    ? 'bg-violet-500/15 text-violet-300 font-medium'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                )}
                title={sidebarCollapsed ? t(item.navKey) : undefined}
              >
                <item.icon className={cn(
                  'w-4 h-4 shrink-0',
                  activeSection === item.id ? 'text-violet-400' : 'text-slate-500'
                )} />
                {!sidebarCollapsed && t(item.navKey)}
              </button>
            ))}
          </nav>

          {/* Collapse toggle button */}
          <button
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            onClick={toggleSidebar}
            className="mt-2 mx-auto flex items-center justify-center w-7 h-7 rounded-md bg-slate-800/60 border border-slate-700/50 hover:bg-slate-700/60 hover:border-slate-600/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
          >
            {sidebarCollapsed ? (
              <ChevronsRight className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <ChevronsLeft className="w-3.5 h-3.5 text-slate-400" />
            )}
          </button>

          {/* Tier Badge */}
          {!sidebarCollapsed && (
            <div className="mt-auto p-3 rounded-xl bg-gradient-to-br from-violet-500/10 to-blue-500/10 border border-violet-500/20">
              <div className="text-[10px] text-violet-300/60 uppercase tracking-widest mb-1">{t('dashboard.currentPlan')}</div>
              <div className="text-sm font-semibold text-violet-200">{t('dashboard.proTier')}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">{t('dashboard.avatarsCount', { count: 3 })}</div>
            </div>
          )}
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
                    aria-label={t(item.navKey)}
                    onClick={() => scrollTo(item.id)}
                    className={cn(
                      'flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900',
                      activeSection === item.id
                        ? 'bg-violet-500/15 text-violet-300 font-medium'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    {t(item.navKey)}
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
              <CognitiveCard avatar={dashboardData.avatar} skills={dashboardData.skills} />
            </motion.div>
            <motion.div
              id="section-revenue"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <SplitDashboard summary={dashboardData.revenueSummary} recentRevenues={dashboardData.recentRevenues} />
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
                data={dashboardData.resonanceHistory}
                currentScore={dashboardData.avatar.resonanceScore}
                circuitState={dashboardData.avatar.circuitState}
              />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <CircuitPanel avatar={dashboardData.avatar} />
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
                skills={dashboardData.skills}
                cumulativeRevenue={dashboardData.revenueSummary.totalRevenue}
                currentTier={dashboardData.avatar.tier}
              />
            </motion.div>
            <motion.div
              id="section-governance"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <IFDDelegation delegations={dashboardData.delegations} />
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
                setPaymentService(`${t('dashboard.rentAvatar')} ${avatar.name}`);
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
            <CognitiveTimeline events={dashboardData.timeline} />
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

          {/* Row 9: Performance Dashboard (full width) */}
          <motion.div
            id="section-performance"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.15 }}
          >
            <PerformanceDashboard />
          </motion.div>

          {/* Row 10: Deployment + Monitoring */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <motion.div
              id="section-deployment"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 }}
            >
              <DeploymentCenter />
            </motion.div>
            <motion.div
              id="section-monitoring"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.25 }}
            >
              <MonitoringCenter />
            </motion.div>
          </div>

          {/* Row 11: Feature Flags (full width) */}
          <motion.div
            id="section-flags"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.3 }}
          >
            <FeatureFlags />
          </motion.div>

          {/* Row 12: Multichain Deploy (full width) */}
          <motion.div
            id="section-multichain"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.35 }}
          >
            <MultichainDeploy />
          </motion.div>

          {/* Row 13: SDK Platform + DAO Governance */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <motion.div
              id="section-sdk"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.4 }}
            >
              <SdkPlatform />
            </motion.div>
            <motion.div
              id="section-dao"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.45 }}
            >
              <DaoGovernance />
            </motion.div>
          </div>

          {/* Row 14: Ecosystem Hub (full width) */}
          <motion.div
            id="section-ecosystem"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.5 }}
          >
            <EcosystemHub />
          </motion.div>

          {/* Row 15: Contracts Arch (full width) */}
          <motion.div
            id="section-contracts"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.55 }}
          >
            <ContractsArch />
          </motion.div>

          {/* Row 16: Engine Arch + Engine Status */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <motion.div
              id="section-engine"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.6 }}
            >
              <EngineArch />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.65 }}
            >
              <EngineStatusDashboard engineStatus={engineStatus} />
            </motion.div>
          </div>

          {/* Row 17: Web3 Integration + Web3 Wallet */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <motion.div
              id="section-web3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.7 }}
            >
              <Web3Integration />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.75 }}
            >
              <Web3Wallet />
            </motion.div>
          </div>

          {/* Row 18: Data Infra (full width) */}
          <motion.div
            id="section-data"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.8 }}
          >
            <DataInfra />
          </motion.div>
        </main>
      </div>

      {/* ── Mobile Bottom Navigation ──────────────── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0F172A]/90 backdrop-blur-xl border-t border-slate-800/50 safe-area-pb">
        <div className="flex items-center justify-around h-14">
          {MOBILE_NAV.map((item) => (
            <button
              key={item.id}
              aria-label={t(item.navKey)}
              onClick={() => scrollTo(item.id)}
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900',
                activeSection === item.id
                  ? 'text-violet-300'
                  : 'text-slate-500 hover:text-slate-300'
              )}
            >
              <item.icon className={cn(
                'w-5 h-5',
                activeSection === item.id && 'text-violet-400'
              )} />
              <span className="text-[10px]">{t(item.navKey)}</span>
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
          <span>{t('dashboard.footer')}</span>
          <span>{t('dashboard.migration')} · 6 Microservices · 8 i18n</span>
        </div>
      </footer>
    </div>
  );
}
