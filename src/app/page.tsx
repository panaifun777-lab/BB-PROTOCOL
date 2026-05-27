'use client';

import { useState, Suspense, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
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
  Download,
  Receipt,
  BarChart3,
  Crown,
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
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
import { LazySection } from '@/components/ui/lazy-section';

// ── Dynamic imports for heavy dashboard components ────────────
const CognitiveCard = dynamic(() => import('@/components/dashboard/cognitive-card'), { ssr: false });
const SplitDashboard = dynamic(() => import('@/components/dashboard/split-dashboard'), { ssr: false });
const ResonanceWave = dynamic(() => import('@/components/dashboard/resonance-wave'), { ssr: false });
const CircuitPanel = dynamic(() => import('@/components/dashboard/circuit-panel'), { ssr: false });
const IFDDelegation = dynamic(() => import('@/components/dashboard/ifd-delegation'), { ssr: false });
const SkillVault = dynamic(() => import('@/components/dashboard/skill-vault'), { ssr: false });
const CognitiveTimeline = dynamic(() => import('@/components/dashboard/cognitive-timeline'), { ssr: false });
const X402Payment = dynamic(() => import('@/components/dashboard/x402-payment'), { ssr: false });
const AvatarMarketplace = dynamic(() => import('@/components/dashboard/avatar-marketplace'), { ssr: false });
const NotificationCenter = dynamic(() => import('@/components/dashboard/notification-center'), { ssr: false });
const CompliancePanel = dynamic(() => import('@/components/dashboard/compliance-panel'), { ssr: false });
const SecurityAudit = dynamic(() => import('@/components/dashboard/security-audit'), { ssr: false });
const LPLiquidity = dynamic(() => import('@/components/dashboard/lp-liquidity'), { ssr: false });
const ContractSimulation = dynamic(() => import('@/components/dashboard/contract-simulation'), { ssr: false });
const PerformanceDashboard = dynamic(() => import('@/components/dashboard/performance-dashboard'), { ssr: false });
const DeploymentCenter = dynamic(() => import('@/components/dashboard/deployment-center'), { ssr: false });
const MonitoringCenter = dynamic(() => import('@/components/dashboard/monitoring-center'), { ssr: false });
const FeatureFlags = dynamic(() => import('@/components/dashboard/feature-flags'), { ssr: false });
const MultichainDeploy = dynamic(() => import('@/components/dashboard/multichain-deploy'), { ssr: false });
const SdkPlatform = dynamic(() => import('@/components/dashboard/sdk-platform'), { ssr: false });
const DaoGovernance = dynamic(() => import('@/components/dashboard/dao-governance'), { ssr: false });
const EcosystemHub = dynamic(() => import('@/components/dashboard/ecosystem-hub'), { ssr: false });
const ContractsArch = dynamic(() => import('@/components/dashboard/contracts-arch'), { ssr: false });
const EngineArch = dynamic(() => import('@/components/dashboard/engine-arch'), { ssr: false });
const Web3Integration = dynamic(() => import('@/components/dashboard/web3-integration'), { ssr: false });
const DataInfra = dynamic(() => import('@/components/dashboard/data-infra'), { ssr: false });
const EngineStatusDashboard = dynamic(() => import('@/components/dashboard/engine-status'), { ssr: false });
const Web3Wallet = dynamic(() => import('@/components/dashboard/web3-wallet'), { ssr: false });
const PaymentHistory = dynamic(() => import('@/components/dashboard/payment-history'), { ssr: false });
const SubscriptionPanel = dynamic(() => import('@/components/dashboard/subscription-panel'), { ssr: false });
const InvoiceList = dynamic(() => import('@/components/dashboard/invoice-list'), { ssr: false });
const MeteredUsage = dynamic(() => import('@/components/dashboard/metered-usage'), { ssr: false });
const PaymentAnalytics = dynamic(() => import('@/components/dashboard/payment-analytics'), { ssr: false });

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
  { id: 'payment-history', navKey: 'nav.paymentHistory', icon: DollarSign },
  { id: 'subscription', navKey: 'nav.subscription', icon: Crown },
  { id: 'usage', navKey: 'nav.usage', icon: BarChart3 },
  { id: 'invoices', navKey: 'nav.invoices', icon: Receipt },
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

// ── Maps nav section IDs to their LazySection row ID ──────────
const SECTION_TO_ROW: Record<string, string> = {
  overview: 'overview',
  revenue: 'overview',
  resonance: 'resonance',
  skills: 'skills',
  governance: 'skills',
  marketplace: 'marketplace',
  liquidity: 'liquidity',
  simulation: 'simulation',
  timeline: 'timeline',
  security: 'security',
  compliance: 'security',
  performance: 'performance',
  deployment: 'deployment',
  monitoring: 'deployment',
  flags: 'flags',
  multichain: 'multichain',
  sdk: 'sdk',
  dao: 'sdk',
  ecosystem: 'ecosystem',
  contracts: 'contracts',
  engine: 'engine',
  web3: 'web3',
  data: 'data',
  'payment-history': 'payment-history',
  subscription: 'subscription',
  usage: 'usage',
  invoices: 'usage',
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

// ── Stripe Return URL Handler (needs Suspense for useSearchParams) ──
function StripeReturnHandler() {
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const handleStripeReturn = useCallback(() => {
    const successId = searchParams.get('stripe_success');
    const cancelId = searchParams.get('stripe_cancel');

    if (successId) {
      // Fetch payment status and show success toast
      fetch(`/api/payment/${successId}`)
        .then((res) => res.ok ? res.json() : null)
        .then((payment) => {
          if (payment) {
            toast({
              title: 'Payment Successful',
              description: `${payment.serviceName || 'Payment'} — $${Number(payment.amount).toFixed(2)} ${payment.currency || 'USD'}`,
            });
          } else {
            toast({
              title: 'Payment Successful',
              description: 'Your Stripe payment has been processed.',
            });
          }
        })
        .catch(() => {
          toast({
            title: 'Payment Successful',
            description: 'Your Stripe payment has been processed.',
          });
        });

      // Clean URL params
      window.history.replaceState({}, '', window.location.pathname);
    } else if (cancelId) {
      toast({
        title: 'Payment Cancelled',
        description: 'You cancelled the Stripe payment. No charges were made.',
        variant: 'destructive',
      });

      // Clean URL params
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [searchParams, toast]);

  useEffect(() => {
    handleStripeReturn();
  }, [handleStripeReturn]);

  return null; // This component renders nothing
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
  const [downloading, setDownloading] = useState(false);

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
    const rowId = SECTION_TO_ROW[id] || id;
    const el = document.getElementById(`section-${rowId}`);
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

            {/* Download Source Code */}
            <button
              aria-label="Download source code"
              onClick={async () => {
                if (downloading) return;
                setDownloading(true);
                try {
                  const res = await fetch('/api/download');
                  if (!res.ok) throw new Error('Download failed');
                  const blob = await res.blob();
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'bb-project-source.tar.gz';
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                } catch {
                  // fallback: open in new tab
                  window.open('/api/download', '_blank');
                } finally {
                  setDownloading(false);
                }
              }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 hover:border-emerald-500/50 hover:bg-slate-700/80 transition-all text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
            >
              <Download className={cn('w-3.5 h-3.5 text-emerald-400', downloading && 'animate-bounce')} />
              <span className="hidden sm:inline text-slate-300">{downloading ? t('dashboard.downloading') || 'Downloading...' : t('dashboard.download') || '下载'}</span>
            </button>

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

        {/* ── Dashboard Grid with Lazy Rendering ── */}
        <main className="flex-1 p-4 lg:p-6 space-y-6 pb-24 lg:pb-6 overflow-y-auto">
          {/* Row 1: Identity + Revenue — EAGER (above the fold) */}
          <LazySection id="section-overview" className="grid grid-cols-1 xl:grid-cols-2 gap-6" eager>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <CognitiveCard avatar={dashboardData.avatar} skills={dashboardData.skills} />
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <SplitDashboard summary={dashboardData.revenueSummary} recentRevenues={dashboardData.recentRevenues} />
            </motion.div>
          </LazySection>

          {/* Row 2: Resonance + Circuit */}
          <LazySection id="section-resonance" className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <motion.div className="xl:col-span-2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <ResonanceWave
                data={dashboardData.resonanceHistory}
                currentScore={dashboardData.avatar.resonanceScore}
                circuitState={dashboardData.avatar.circuitState}
              />
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <CircuitPanel avatar={dashboardData.avatar} />
            </motion.div>
          </LazySection>

          {/* Row 3: Skills + IFD */}
          <LazySection id="section-skills" className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <SkillVault
                skills={dashboardData.skills}
                cumulativeRevenue={dashboardData.revenueSummary.totalRevenue}
                currentTier={dashboardData.avatar.tier}
              />
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <IFDDelegation delegations={dashboardData.delegations} />
            </motion.div>
          </LazySection>

          {/* Row 4: Marketplace (full width) */}
          <LazySection id="section-marketplace">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <AvatarMarketplace
                onRent={(avatar: { name: string; hourlyRate: number }) => {
                  setPaymentService(`${t('dashboard.rentAvatar')} ${avatar.name}`);
                  setPaymentAmount(avatar.hourlyRate * 0.01);
                  setPaymentOpen(true);
                }}
              />
            </motion.div>
          </LazySection>

          {/* Row 5: LP Liquidity (full width) */}
          <LazySection id="section-liquidity">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <LPLiquidity />
            </motion.div>
          </LazySection>

          {/* Row 6: Contract Simulation (full width) */}
          <LazySection id="section-simulation">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <ContractSimulation />
            </motion.div>
          </LazySection>

          {/* Row 7: Timeline (full width) */}
          <LazySection id="section-timeline">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <CognitiveTimeline events={dashboardData.timeline} />
            </motion.div>
          </LazySection>

          {/* Row 8: Security + Compliance */}
          <LazySection id="section-security" className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <SecurityAudit />
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <CompliancePanel />
            </motion.div>
          </LazySection>

          {/* Row 9: Performance Dashboard (full width) */}
          <LazySection id="section-performance">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <PerformanceDashboard />
            </motion.div>
          </LazySection>

          {/* Row 10: Deployment + Monitoring */}
          <LazySection id="section-deployment" className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <DeploymentCenter />
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <MonitoringCenter />
            </motion.div>
          </LazySection>

          {/* Row 11: Feature Flags (full width) */}
          <LazySection id="section-flags">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <FeatureFlags />
            </motion.div>
          </LazySection>

          {/* Row 12: Multichain Deploy (full width) */}
          <LazySection id="section-multichain">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <MultichainDeploy />
            </motion.div>
          </LazySection>

          {/* Row 13: SDK Platform + DAO Governance */}
          <LazySection id="section-sdk" className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <SdkPlatform />
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <DaoGovernance />
            </motion.div>
          </LazySection>

          {/* Row 14: Ecosystem Hub (full width) */}
          <LazySection id="section-ecosystem">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <EcosystemHub />
            </motion.div>
          </LazySection>

          {/* Row 15: Contracts Arch (full width) */}
          <LazySection id="section-contracts">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <ContractsArch />
            </motion.div>
          </LazySection>

          {/* Row 16: Engine Arch + Engine Status */}
          <LazySection id="section-engine" className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <EngineArch />
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <EngineStatusDashboard engineStatus={engineStatus} />
            </motion.div>
          </LazySection>

          {/* Row 17: Web3 Integration + Web3 Wallet */}
          <LazySection id="section-web3" className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Web3Integration />
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <Web3Wallet />
            </motion.div>
          </LazySection>

          {/* Row 18: Data Infra (full width) */}
          <LazySection id="section-data">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <DataInfra />
            </motion.div>
          </LazySection>

          {/* Row 19: Payment History */}
          <LazySection id="section-payment-history">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <PaymentHistory />
            </motion.div>
          </LazySection>

          {/* Row 20: Subscription Panel (full width) */}
          <LazySection id="section-subscription">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <SubscriptionPanel />
            </motion.div>
          </LazySection>

          {/* Row 21: Metered Usage + Invoice List */}
          <LazySection id="section-usage" className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <MeteredUsage />
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <InvoiceList />
            </motion.div>
          </LazySection>

          {/* Row 22: Payment Analytics (full width) */}
          <LazySection id="section-analytics">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <PaymentAnalytics />
            </motion.div>
          </LazySection>
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

      {/* ── Stripe Return Handler (Suspense required for useSearchParams) ── */}
      <Suspense fallback={null}>
        <StripeReturnHandler />
      </Suspense>

      {/* ── Footer ────────────────────────────────── */}
      <footer className="hidden lg:block border-t border-slate-800/50 bg-[#0F172A] mt-auto">
        <div className="max-w-[1600px] mx-auto px-6 h-10 flex items-center justify-between text-[10px] text-slate-600">
          <span>{t('dashboard.footer')}</span>
          <span>{t('dashboard.migration')} · 6 Microservices · 8 i18n · Stripe + x402</span>
        </div>
      </footer>
    </div>
  );
}
