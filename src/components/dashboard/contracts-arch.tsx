'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileCode,
  GitBranch,
  TestTube,
  ShieldCheck,
  ArrowRight,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Copy,
  Fuel,
  Zap,
  Box,
  Lock,
  Eye,
  Layers,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useI18n } from '@/hooks/use-i18n';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

// ===== Types =====
interface ContractFunction {
  name: string;
  visibility: string;
  mutability: string;
  gasEstimate: number;
  params: string[];
  returns: string;
}

interface ContractData {
  id: string;
  name: string;
  filename: string;
  category: 'core' | 'economics' | 'security' | 'governance';
  description: string;
  version: string;
  linesOfCode: number;
  optimizerRuns: number;
  bytecodeSize: string;
  deployed: boolean;
  address: string;
  functions: ContractFunction[];
  events: string[];
  stateVariables: string[];
  inherits: string[];
  securityPatterns: string[];
}

interface ContractInteraction {
  from: string;
  to: string;
  type: 'calls' | 'feeds';
  description: string;
}

interface TestCoverageByContract {
  name: string;
  tests: number;
  passing: number;
  coverage: number;
}

interface InvariantTest {
  name: string;
  formula: string;
  status: 'pass' | 'fail';
  counterexamples: number;
}

interface GasReportEntry {
  contract: string;
  function: string;
  gas: number;
  gasCost: string;
  optimization: string;
}

interface VerificationEntry {
  contract: string;
  tool: string;
  status: 'verified' | 'passed' | 'failed';
  invariants?: number;
  counterexamples?: number;
  findings?: number;
  highCritical?: number;
  lastRun: string;
}

interface ContractsArchData {
  contracts: ContractData[];
  contractInteractions: ContractInteraction[];
  testCoverage: {
    totalTests: number;
    passing: number;
    failing: number;
    skipped: number;
    statementCoverage: number;
    branchCoverage: number;
    functionCoverage: number;
    lineCoverage: number;
    byContract: TestCoverageByContract[];
    fuzzTests: { runs: number; maxCpuTime: string; invariantsVerified: number };
    invariantTests: InvariantTest[];
  };
  gasReport: GasReportEntry[];
  verificationStatus: VerificationEntry[];
}

// ===== Category Helpers =====
const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  core: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30', dot: 'bg-emerald-400' },
  economics: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30', dot: 'bg-amber-400' },
  security: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30', dot: 'bg-red-400' },
  governance: { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/30', dot: 'bg-violet-400' },
};

const CATEGORY_LABEL_KEYS: Record<string, string> = {
  core: 'contracts.coreContracts',
  economics: 'contracts.economicsContracts',
  security: 'contracts.securityContracts',
  governance: 'contracts.governanceContracts',
};

// ===== Coverage Color Helper =====
function coverageColor(val: number): string {
  if (val >= 95) return 'text-emerald-400';
  if (val >= 90) return 'text-amber-400';
  return 'text-red-400';
}

function coverageBarColor(val: number): string {
  if (val >= 95) return 'bg-emerald-500';
  if (val >= 90) return 'bg-amber-500';
  return 'bg-red-500';
}

// ===== Circular Gauge Sub-component =====
function CoverageGauge({ value, label, size = 80 }: { value: number; label: string; size?: number }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const color = value >= 95 ? '#10b981' : value >= 90 ? '#f59e0b' : '#ef4444';

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(100,116,139,0.2)"
          strokeWidth="4"
          fill="none"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center" style={{ width: size, height: size }}>
        <span className={cn('text-sm font-bold', coverageColor(value))}>{value}%</span>
      </div>
      <span className="text-[10px] text-slate-400 mt-1">{label}</span>
    </div>
  );
}

// ===== Main Component =====
export default function ContractsArch() {
  const { t } = useI18n();
  const [data, setData] = useState<ContractsArchData | null>(null);
  const [activeTab, setActiveTab] = useState('architecture');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [expandedContracts, setExpandedContracts] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/contracts-arch');
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch {
        // fallback: data stays null
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const toggleContract = useCallback((id: string) => {
    setExpandedContracts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  if (loading || !data) {
    return (
      <Card className="border-slate-700 bg-slate-800/80 backdrop-blur-sm shadow-xl shadow-black/20">
        <div className="h-1 bg-gradient-to-r from-emerald-500 via-amber-500 to-violet-500" />
        <CardContent className="p-6 flex items-center justify-center min-h-[300px]">
          <motion.div
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="text-slate-400 text-sm flex items-center gap-2"
          >
            <Box className="w-4 h-4 animate-spin" />
            {t('contracts.loadingData')}
          </motion.div>
        </CardContent>
      </Card>
    );
  }

  const { contracts, contractInteractions, testCoverage, gasReport, verificationStatus } = data;

  const filteredContracts = categoryFilter === 'all'
    ? contracts
    : contracts.filter((c) => c.category === categoryFilter);

  const totalLoc = contracts.reduce((s, c) => s + c.linesOfCode, 0);
  const deployedCount = contracts.filter((c) => c.deployed).length;
  const avgCoverage = testCoverage.byContract.reduce((s, c) => s + c.coverage, 0) / testCoverage.byContract.length;

  // Build dependency matrix
  const contractNames = contracts.map((c) => c.name);
  const depMatrix: boolean[][] = contractNames.map((name) =>
    contractNames.map((other) =>
      contractInteractions.some((i) => i.from === name && i.to === other)
    )
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      <Card className="border-slate-700 bg-slate-800/80 backdrop-blur-sm shadow-xl shadow-black/20 overflow-hidden">
        {/* Top accent bar */}
        <div className="h-1 bg-gradient-to-r from-emerald-500 via-amber-500 to-violet-500" />

        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base text-slate-100">
                <FileCode className="w-4 h-4 text-emerald-400" />
                {t('contracts.solidityContracts')}
              </CardTitle>
              <CardDescription className="text-xs text-slate-400 mt-0.5">
                {t('contracts.subtitle')}
              </CardDescription>
            </div>
            <Badge
              variant="outline"
              className="bg-emerald-500/10 text-emerald-300 border-emerald-500/30 text-[10px]"
            >
              Foundry
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-0">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-slate-900/60 border border-slate-700/50 h-8">
              <TabsTrigger
                value="architecture"
                className="text-[11px] data-[state=active]:bg-slate-700 data-[state=active]:text-slate-100 text-slate-400 px-3 h-6"
              >
                <FileCode className="w-3 h-3 mr-1" />
                {t('contracts.architectureTab')}
              </TabsTrigger>
              <TabsTrigger
                value="interactions"
                className="text-[11px] data-[state=active]:bg-slate-700 data-[state=active]:text-slate-100 text-slate-400 px-3 h-6"
              >
                <GitBranch className="w-3 h-3 mr-1" />
                {t('contracts.interactionsTab')}
              </TabsTrigger>
              <TabsTrigger
                value="coverage"
                className="text-[11px] data-[state=active]:bg-slate-700 data-[state=active]:text-slate-100 text-slate-400 px-3 h-6"
              >
                <TestTube className="w-3 h-3 mr-1" />
                {t('contracts.coverageTab')}
              </TabsTrigger>
              <TabsTrigger
                value="verification"
                className="text-[11px] data-[state=active]:bg-slate-700 data-[state=active]:text-slate-100 text-slate-400 px-3 h-6"
              >
                <ShieldCheck className="w-3 h-3 mr-1" />
                {t('contracts.verificationTab')}
              </TabsTrigger>
            </TabsList>

            {/* ====== TAB 1: Architecture ====== */}
            <TabsContent value="architecture" className="space-y-4 mt-3">
              {/* Overview Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="rounded-lg bg-slate-900/40 border border-slate-700/50 p-3 text-center">
                  <p className="text-lg font-bold text-slate-100">{contracts.length}</p>
                  <p className="text-[10px] text-slate-400">{t('contracts.totalContracts')}</p>
                </div>
                <div className="rounded-lg bg-slate-900/40 border border-slate-700/50 p-3 text-center">
                  <p className="text-lg font-bold text-emerald-400">{deployedCount}</p>
                  <p className="text-[10px] text-slate-400">{t('contracts.deployed')}</p>
                </div>
                <div className="rounded-lg bg-slate-900/40 border border-slate-700/50 p-3 text-center">
                  <p className="text-lg font-bold text-amber-400">{totalLoc.toLocaleString()}</p>
                  <p className="text-[10px] text-slate-400">{t('contracts.linesOfCode')}</p>
                </div>
                <div className="rounded-lg bg-slate-900/40 border border-slate-700/50 p-3 text-center">
                  <p className={cn('text-lg font-bold', coverageColor(avgCoverage))}>{avgCoverage.toFixed(1)}%</p>
                  <p className="text-[10px] text-slate-400">{t('contracts.avgCoverage')}</p>
                </div>
              </div>

              {/* Category Filter */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-slate-500 mr-1">{t('contracts.category')}</span>
                {['all', 'core', 'economics', 'security', 'governance'].map((cat) => {
                  const isActive = categoryFilter === cat;
                  const label = cat === 'all' ? t('common.all') : t(CATEGORY_LABEL_KEYS[cat]);
                  const colors = cat === 'all'
                    ? { bg: 'bg-slate-500/10', text: 'text-slate-300', border: 'border-slate-500/30' }
                    : CATEGORY_COLORS[cat];
                  return (
                    <button
                      key={cat}
                      onClick={() => setCategoryFilter(cat)}
                      className={cn(
                        'text-[10px] px-2 py-0.5 rounded-full border transition-all',
                        isActive
                          ? cn(colors.bg, colors.text, colors.border)
                          : 'bg-transparent text-slate-500 border-slate-700/50 hover:border-slate-600'
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* Contract Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <AnimatePresence mode="popLayout">
                  {filteredContracts.map((contract, idx) => {
                    const catColor = CATEGORY_COLORS[contract.category];
                    const isExpanded = expandedContracts.has(contract.id);

                    return (
                      <motion.div
                        key={contract.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3, delay: idx * 0.05 }}
                        className={cn(
                          'rounded-lg border bg-slate-900/40 p-4 space-y-3',
                          catColor.border,
                          'border-l-2'
                        )}
                        style={{ borderLeftColor: contract.category === 'core' ? '#10b981' : contract.category === 'economics' ? '#f59e0b' : contract.category === 'security' ? '#ef4444' : '#8b5cf6' }}
                      >
                        {/* Header */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-slate-100">{contract.name}</span>
                              <Badge
                                variant="outline"
                                className={cn('text-[9px] px-1.5 py-0', catColor.bg, catColor.text, catColor.border)}
                              >
                                {t(CATEGORY_LABEL_KEYS[contract.category])}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 text-[10px]">
                              <span className="font-mono text-slate-500">{contract.filename}</span>
                              <span className="text-slate-600">v{contract.version}</span>
                            </div>
                          </div>
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-[9px] px-1.5 py-0 shrink-0',
                              contract.deployed
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : 'bg-slate-500/10 text-slate-400 border-slate-500/30'
                            )}
                          >
                            {contract.deployed ? t('contracts.deployed') : t('contracts.notDeployed')}
                          </Badge>
                        </div>

                        {/* Description */}
                        <p className="text-[11px] text-slate-400 leading-relaxed">{contract.description}</p>

                        {/* Deployed Address */}
                        {contract.deployed && contract.address && (
                          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-800/60 border border-slate-700/30">
                            <span className="text-[9px] font-mono text-slate-500">{contract.address}</span>
                            <button
                              onClick={() => navigator.clipboard.writeText(contract.address)}
                              className="ml-auto text-slate-500 hover:text-slate-300 transition-colors"
                            >
                              <Copy className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        )}

                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="rounded bg-slate-800/40 p-1.5">
                            <p className="text-[11px] font-mono text-slate-200">{contract.linesOfCode}</p>
                            <p className="text-[8px] text-slate-500">LoC</p>
                          </div>
                          <div className="rounded bg-slate-800/40 p-1.5">
                            <p className="text-[11px] font-mono text-slate-200">{contract.bytecodeSize}</p>
                            <p className="text-[8px] text-slate-500">Bytecode</p>
                          </div>
                          <div className="rounded bg-slate-800/40 p-1.5">
                            <p className="text-[11px] font-mono text-slate-200">{contract.optimizerRuns.toLocaleString()}</p>
                            <p className="text-[8px] text-slate-500">Opt Runs</p>
                          </div>
                        </div>

                        {/* Inherited Contracts */}
                        <div className="space-y-1">
                          <span className="text-[10px] text-slate-500">{t('contracts.inheritsLabel')}</span>
                          <div className="flex flex-wrap gap-1">
                            {contract.inherits.map((inh) => (
                              <Badge
                                key={inh}
                                variant="outline"
                                className="text-[8px] px-1 py-0 bg-slate-700/50 text-slate-400 border-slate-600/50"
                              >
                                {inh}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        {/* Security Patterns */}
                        <div className="space-y-1">
                          <span className="text-[10px] text-slate-500">{t('contracts.securityPatternsLabel')}</span>
                          <div className="flex flex-wrap gap-1">
                            {contract.securityPatterns.map((sp) => (
                              <span
                                key={sp}
                                className="inline-flex items-center gap-0.5 text-[8px] px-1.5 py-0.5 rounded bg-emerald-500/5 text-emerald-400/80 border border-emerald-500/20"
                              >
                                <Lock className="w-2 h-2" />
                                {sp}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Expand Button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleContract(contract.id)}
                          className="w-full h-7 text-[10px] text-slate-400 hover:text-slate-200 hover:bg-slate-700/30"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="w-3 h-3 mr-1" />
                              {t('contracts.collapseFunctions')}
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-3 h-3 mr-1" />
                              {t('contracts.viewFunctions')} ({contract.functions.length})
                            </>
                          )}
                        </Button>

                        {/* Expanded: Functions Table */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3 }}
                              className="overflow-hidden"
                            >
                              <div className="rounded border border-slate-700/50 overflow-hidden">
                                <table className="w-full text-[9px]">
                                  <thead>
                                    <tr className="bg-slate-800/60 text-slate-500">
                                      <th className="text-left px-2 py-1.5 font-medium">{t('contracts.functionCol')}</th>
                                      <th className="text-left px-2 py-1.5 font-medium">{t('contracts.visibilityCol')}</th>
                                      <th className="text-left px-2 py-1.5 font-medium">{t('contracts.typeCol')}</th>
                                      <th className="text-right px-2 py-1.5 font-medium">Gas</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {contract.functions.map((fn) => (
                                      <tr key={fn.name} className="border-t border-slate-700/30">
                                        <td className="px-2 py-1.5">
                                          <span className="font-mono text-slate-200">{fn.name}</span>
                                          <div className="text-[8px] text-slate-500 mt-0.5">
                                            ({fn.params.join(', ')})
                                          </div>
                                          <div className="text-[8px] text-violet-400 mt-0.5">
                                            → {fn.returns}
                                          </div>
                                        </td>
                                        <td className="px-2 py-1.5">
                                          <Badge
                                            variant="outline"
                                            className={cn(
                                              'text-[8px] px-1 py-0',
                                              fn.visibility === 'external'
                                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                                : fn.visibility === 'internal'
                                                  ? 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                                                  : 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                                            )}
                                          >
                                            {fn.visibility}
                                          </Badge>
                                        </td>
                                        <td className="px-2 py-1.5">
                                          <Badge
                                            variant="outline"
                                            className={cn(
                                              'text-[8px] px-1 py-0',
                                              fn.mutability === 'view'
                                                ? 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                                                : fn.mutability === 'payable'
                                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                  : fn.mutability === 'pure'
                                                    ? 'bg-violet-500/10 text-violet-400 border-violet-500/20'
                                                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                            )}
                                          >
                                            {fn.mutability}
                                          </Badge>
                                        </td>
                                        <td className="px-2 py-1.5 text-right font-mono text-amber-300">
                                          {fn.gasEstimate.toLocaleString()}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>

                              {/* Events */}
                              <div className="mt-2 space-y-1">
                                <span className="text-[10px] text-slate-500">{t('contracts.eventsLabel')}</span>
                                <div className="flex flex-wrap gap-1">
                                  {contract.events.map((evt) => (
                                    <Badge
                                      key={evt}
                                      variant="outline"
                                      className="text-[8px] px-1 py-0 bg-sky-500/10 text-sky-400 border-sky-500/20"
                                    >
                                      {evt}
                                    </Badge>
                                  ))}
                                </div>
                              </div>

                              {/* State Variables */}
                              <div className="mt-2 space-y-1">
                                <span className="text-[10px] text-slate-500">{t('contracts.stateVariablesLabel')}</span>
                                <div className="space-y-0.5">
                                  {contract.stateVariables.map((sv) => (
                                    <div key={sv} className="text-[9px] font-mono text-slate-400 px-2 py-0.5 rounded bg-slate-800/40">
                                      {sv}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </TabsContent>

            {/* ====== TAB 2: Interaction Graph ====== */}
            <TabsContent value="interactions" className="space-y-4 mt-3">
              {/* Interaction Diagram (Visual) */}
              <div className="rounded-lg border border-slate-700/50 bg-slate-900/40 p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <GitBranch className="w-3.5 h-3.5 text-violet-400" />
                  <span className="text-xs text-slate-300 font-medium">{t('contracts.interactionDiagram')}</span>
                </div>

                {/* Visual Node Graph */}
                <div className="relative min-h-[280px]">
                  <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
                    {contractInteractions.map((interaction, i) => {
                      const fromContract = contracts.find((c) => c.name === interaction.from);
                      const toContract = contracts.find((c) => c.name === interaction.to);
                      if (!fromContract || !toContract) return null;

                      const fromIdx = contracts.indexOf(fromContract);
                      const toIdx = contracts.indexOf(toContract);

                      // Position nodes in a grid layout
                      const colFrom = fromIdx % 3;
                      const rowFrom = Math.floor(fromIdx / 3);
                      const colTo = toIdx % 3;
                      const rowTo = Math.floor(toIdx / 3);

                      const x1 = colFrom * 33.3 + 16.65;
                      const y1 = rowFrom * 33.3 + 16.65;
                      const x2 = colTo * 33.3 + 16.65;
                      const y2 = rowTo * 33.3 + 16.65;

                      return (
                        <motion.line
                          key={i}
                          x1={`${x1}%`}
                          y1={`${y1}%`}
                          x2={`${x2}%`}
                          y2={`${y2}%`}
                          stroke={interaction.type === 'calls' ? '#10b981' : '#3b82f6'}
                          strokeWidth="1.5"
                          strokeDasharray={interaction.type === 'feeds' ? '4,4' : 'none'}
                          opacity={0.5}
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 0.8, delay: i * 0.1 }}
                        />
                      );
                    })}
                  </svg>

                  {/* Contract Nodes */}
                  <div className="grid grid-cols-3 gap-4 relative" style={{ zIndex: 1 }}>
                    {contracts.map((contract, idx) => {
                      const catColor = CATEGORY_COLORS[contract.category];
                      const hasOutgoing = contractInteractions.some((i) => i.from === contract.name);
                      const hasIncoming = contractInteractions.some((i) => i.to === contract.name);

                      return (
                        <motion.div
                          key={contract.id}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.4, delay: idx * 0.08 }}
                          className={cn(
                            'flex flex-col items-center gap-1 p-3 rounded-lg border',
                            catColor.bg,
                            catColor.border,
                            contract.deployed ? 'border' : 'border-dashed'
                          )}
                        >
                          <div className={cn('w-8 h-8 rounded-full flex items-center justify-center', catColor.bg, 'border', catColor.border)}>
                            <FileCode className={cn('w-4 h-4', catColor.text)} />
                          </div>
                          <span className="text-[10px] font-medium text-slate-200 text-center">{contract.name}</span>
                          <div className="flex gap-1">
                            {hasOutgoing && (
                              <span className="text-[8px] text-emerald-400">→ out</span>
                            )}
                            {hasIncoming && (
                              <span className="text-[8px] text-blue-400">← in</span>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Interaction List */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-slate-300 font-medium">
                  <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
                  {t('contracts.interactionList')}
                </div>
                <div className="space-y-1.5">
                  {contractInteractions.map((interaction, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: i * 0.05 }}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900/40 border border-slate-700/30"
                    >
                      <span className="text-[10px] font-mono text-slate-200 min-w-[110px]">
                        {interaction.from}
                      </span>
                      <ArrowRight className={cn(
                        'w-3.5 h-3.5 shrink-0',
                        interaction.type === 'calls' ? 'text-emerald-400' : 'text-blue-400'
                      )} />
                      <span className="text-[10px] font-mono text-slate-200 min-w-[110px]">
                        {interaction.to}
                      </span>
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[8px] px-1.5 py-0 shrink-0',
                          interaction.type === 'calls'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                        )}
                      >
                        {interaction.type === 'calls' ? t('contracts.callType') : t('contracts.dataSourceType')}
                      </Badge>
                      <span className="text-[9px] text-slate-400 ml-auto">{interaction.description}</span>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Dependency Matrix */}
              <div className="rounded-lg border border-slate-700/50 bg-slate-900/40 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-xs text-slate-300 font-medium">{t('contracts.dependencyMatrix')}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="text-[9px]">
                    <thead>
                      <tr>
                        <th className="px-2 py-1 text-slate-500 font-medium text-left">From ↓ / To →</th>
                        {contractNames.map((name) => (
                          <th key={name} className="px-1.5 py-1 text-slate-500 font-medium text-center">
                            <span className="writing-mode-vertical transform -rotate-45 inline-block origin-center" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                              {name.slice(0, 6)}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {contractNames.map((name, rowIdx) => (
                        <tr key={name}>
                          <td className="px-2 py-1 text-slate-300 font-mono">{name.slice(0, 8)}</td>
                          {contractNames.map((_, colIdx) => (
                            <td key={colIdx} className="px-1 py-1 text-center">
                              {depMatrix[rowIdx][colIdx] ? (
                                <div className="w-3 h-3 rounded-sm bg-emerald-500/60 mx-auto" />
                              ) : rowIdx === colIdx ? (
                                <div className="w-3 h-3 rounded-sm bg-slate-600/30 mx-auto" />
                              ) : (
                                <div className="w-3 h-3 rounded-sm bg-slate-800/30 mx-auto" />
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center gap-3 text-[8px] text-slate-500">
                  <div className="flex items-center gap-1">
                    <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500/60" />
                    <span>{t('contracts.hasDependency')}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2.5 h-2.5 rounded-sm bg-slate-600/30" />
                    <span>{t('contracts.self')}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2.5 h-2.5 rounded-sm bg-slate-800/30" />
                    <span>{t('contracts.noDependency')}</span>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ====== TAB 3: Test Coverage ====== */}
            <TabsContent value="coverage" className="space-y-4 mt-3">
              {/* Overall Coverage Gauges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="relative flex flex-col items-center">
                  <CoverageGauge value={testCoverage.statementCoverage} label={t('contracts.statementCoverage')} />
                </div>
                <div className="relative flex flex-col items-center">
                  <CoverageGauge value={testCoverage.branchCoverage} label={t('contracts.branchCoverage')} />
                </div>
                <div className="relative flex flex-col items-center">
                  <CoverageGauge value={testCoverage.functionCoverage} label={t('contracts.functionCoverage')} />
                </div>
                <div className="relative flex flex-col items-center">
                  <CoverageGauge value={testCoverage.lineCoverage} label={t('contracts.lineCoverage')} />
                </div>
              </div>

              {/* Test Summary */}
              <div className="grid grid-cols-4 gap-2">
                <div className="rounded-lg bg-slate-900/40 border border-slate-700/50 p-2.5 text-center">
                  <p className="text-sm font-bold text-slate-100">{testCoverage.totalTests}</p>
                  <p className="text-[9px] text-slate-400">{t('contracts.totalTests')}</p>
                </div>
                <div className="rounded-lg bg-slate-900/40 border border-slate-700/50 p-2.5 text-center">
                  <p className="text-sm font-bold text-emerald-400">{testCoverage.passing}</p>
                  <p className="text-[9px] text-slate-400">{t('contracts.passed')}</p>
                </div>
                <div className="rounded-lg bg-slate-900/40 border border-slate-700/50 p-2.5 text-center">
                  <p className="text-sm font-bold text-red-400">{testCoverage.failing}</p>
                  <p className="text-[9px] text-slate-400">{t('contracts.failed')}</p>
                </div>
                <div className="rounded-lg bg-slate-900/40 border border-slate-700/50 p-2.5 text-center">
                  <p className="text-sm font-bold text-amber-400">{testCoverage.skipped}</p>
                  <p className="text-[9px] text-slate-400">{t('contracts.skipped')}</p>
                </div>
              </div>

              <Separator className="bg-slate-700/50" />

              {/* Per-Contract Coverage Bars */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs text-slate-300 font-medium">
                  <TestTube className="w-3.5 h-3.5 text-amber-400" />
                  {t('contracts.contractCoverage')}
                </div>

                {/* Bar Chart */}
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={testCoverage.byContract} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                      <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 9, fill: '#94a3b8' }} tickFormatter={(v) => `${v}%`} />
                      <YAxis type="category" dataKey="name" width={85} tick={{ fontSize: 9, fill: '#cbd5e1' }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1e293b',
                          border: '1px solid #334155',
                          borderRadius: '8px',
                          fontSize: '10px',
                          color: '#e2e8f0',
                        }}
                        formatter={(value: number) => [`${value}%`, t('contracts.coverageRate')]}
                      />
                      <Bar dataKey="coverage" radius={[0, 4, 4, 0]} barSize={14}>
                        {testCoverage.byContract.map((entry) => (
                          <Cell
                            key={entry.name}
                            fill={entry.coverage >= 95 ? '#10b981' : entry.coverage >= 90 ? '#f59e0b' : '#ef4444'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Detailed Coverage Bars */}
                <div className="space-y-2">
                  {testCoverage.byContract.map((entry, idx) => (
                    <motion.div
                      key={entry.name}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: idx * 0.06 }}
                      className="space-y-1"
                    >
                      <div className="flex items-center justify-between text-[10px]">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-200 font-medium">{entry.name}</span>
                          <span className="text-slate-500">{entry.tests} tests</span>
                        </div>
                        <span className={cn('font-mono font-medium', coverageColor(entry.coverage))}>
                          {entry.coverage}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-700/40 overflow-hidden">
                        <motion.div
                          className={cn('h-full rounded-full', coverageBarColor(entry.coverage))}
                          initial={{ width: 0 }}
                          animate={{ width: `${entry.coverage}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut', delay: idx * 0.08 }}
                        />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              <Separator className="bg-slate-700/50" />

              {/* Fuzz Test Info */}
              <div className="rounded-lg border border-slate-700/50 bg-slate-900/40 p-3 space-y-2">
                <div className="flex items-center gap-2 text-xs text-slate-300 font-medium">
                  <Zap className="w-3.5 h-3.5 text-violet-400" />
                  {t('contracts.fuzzTests')}
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-sm font-bold text-slate-200">{testCoverage.fuzzTests.runs}</p>
                    <p className="text-[9px] text-slate-500">{t('contracts.runCount')}</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-amber-400">{testCoverage.fuzzTests.maxCpuTime}</p>
                    <p className="text-[9px] text-slate-500">{t('contracts.maxCpuTime')}</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-emerald-400">{testCoverage.fuzzTests.invariantsVerified}</p>
                    <p className="text-[9px] text-slate-500">{t('contracts.verifiedInvariants')}</p>
                  </div>
                </div>
              </div>

              {/* Invariant Test Results */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-slate-300 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  {t('contracts.invariantTests')}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {testCoverage.invariantTests.map((inv, idx) => (
                    <motion.div
                      key={inv.name}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: idx * 0.08 }}
                      className={cn(
                        'rounded-lg border p-3 space-y-2',
                        inv.status === 'pass'
                          ? 'bg-emerald-500/5 border-emerald-500/20'
                          : 'bg-red-500/5 border-red-500/20'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium text-slate-200">{inv.name}</span>
                        {inv.status === 'pass' ? (
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-red-400" />
                        )}
                      </div>
                      <div className="px-2 py-1 rounded bg-slate-900/60 border border-slate-700/30">
                        <code className="text-[9px] text-violet-300 font-mono">{inv.formula}</code>
                      </div>
                      <div className="flex items-center justify-between text-[9px]">
                        <span className={cn(
                          'px-1.5 py-0.5 rounded',
                          inv.status === 'pass'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-red-500/10 text-red-400'
                        )}>
                          {inv.status === 'pass' ? t('contracts.passStatus') : t('contracts.failStatus')}
                        </span>
                        <span className="text-slate-500">
                          {t('contracts.counterexamples')}: {inv.counterexamples}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              <Separator className="bg-slate-700/50" />

              {/* Gas Report Table */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-slate-300 font-medium">
                  <Fuel className="w-3.5 h-3.5 text-amber-400" />
                  {t('contracts.gasReport')}
                </div>
                <ScrollArea className="max-h-64">
                  <div className="rounded border border-slate-700/50 overflow-hidden">
                    <table className="w-full text-[9px]">
                      <thead>
                        <tr className="bg-slate-800/60 text-slate-500">
                          <th className="text-left px-2 py-1.5 font-medium">{t('contracts.contractCol')}</th>
                          <th className="text-left px-2 py-1.5 font-medium">{t('contracts.functionColReport')}</th>
                          <th className="text-right px-2 py-1.5 font-medium">Gas</th>
                          <th className="text-right px-2 py-1.5 font-medium">{t('contracts.costCol')}</th>
                          <th className="text-left px-2 py-1.5 font-medium">{t('contracts.optimizationCol')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...gasReport]
                          .sort((a, b) => b.gas - a.gas)
                          .map((entry, i) => (
                            <motion.tr
                              key={`${entry.contract}-${entry.function}`}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: i * 0.04 }}
                              className="border-t border-slate-700/30"
                            >
                              <td className="px-2 py-1.5 font-mono text-slate-300">{entry.contract}</td>
                              <td className="px-2 py-1.5 font-mono text-slate-200">{entry.function}</td>
                              <td className="px-2 py-1.5 text-right font-mono text-amber-300">{entry.gas.toLocaleString()}</td>
                              <td className="px-2 py-1.5 text-right font-mono text-emerald-400">{entry.gasCost}</td>
                              <td className="px-2 py-1.5">
                                <Badge variant="outline" className="text-[8px] px-1 py-0 bg-violet-500/10 text-violet-400 border-violet-500/20">
                                  {entry.optimization}
                                </Badge>
                              </td>
                            </motion.tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </ScrollArea>
              </div>
            </TabsContent>

            {/* ====== TAB 4: Formal Verification ====== */}
            <TabsContent value="verification" className="space-y-4 mt-3">
              {/* Verification Overview */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="rounded-lg bg-slate-900/40 border border-slate-700/50 p-3 text-center">
                  <p className="text-lg font-bold text-emerald-400">
                    {verificationStatus.filter((v) => v.status === 'verified').length}
                  </p>
                  <p className="text-[10px] text-slate-400">{t('contracts.certoraVerification')}</p>
                </div>
                <div className="rounded-lg bg-slate-900/40 border border-slate-700/50 p-3 text-center">
                  <p className="text-lg font-bold text-blue-400">
                    {verificationStatus.filter((v) => v.status === 'passed').length}
                  </p>
                  <p className="text-[10px] text-slate-400">{t('contracts.slitherPassed')}</p>
                </div>
                <div className="rounded-lg bg-slate-900/40 border border-slate-700/50 p-3 text-center">
                  <p className="text-lg font-bold text-slate-100">
                    {new Set(verificationStatus.map((v) => v.tool)).size}
                  </p>
                  <p className="text-[10px] text-slate-400">{t('contracts.verificationTools')}</p>
                </div>
                <div className="rounded-lg bg-slate-900/40 border border-slate-700/50 p-3 text-center">
                  <p className="text-lg font-bold text-emerald-400">
                    {verificationStatus.reduce((s, v) => s + (v.invariants || 0), 0)}
                  </p>
                  <p className="text-[10px] text-slate-400">{t('contracts.totalInvariants')}</p>
                </div>
              </div>

              {/* Verification Results Table */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-slate-300 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  {t('contracts.verificationResults')}
                </div>
                <div className="rounded border border-slate-700/50 overflow-hidden">
                  <table className="w-full text-[9px]">
                    <thead>
                      <tr className="bg-slate-800/60 text-slate-500">
                        <th className="text-left px-2 py-1.5 font-medium">{t('contracts.contractCol')}</th>
                        <th className="text-left px-2 py-1.5 font-medium">{t('contracts.toolCol')}</th>
                        <th className="text-center px-2 py-1.5 font-medium">{t('contracts.statusCol')}</th>
                        <th className="text-center px-2 py-1.5 font-medium">{t('contracts.invariantsCol')}</th>
                        <th className="text-center px-2 py-1.5 font-medium">{t('contracts.counterexamplesCol')}</th>
                        <th className="text-center px-2 py-1.5 font-medium">{t('contracts.findingsCol')}</th>
                        <th className="text-center px-2 py-1.5 font-medium">{t('contracts.highCriticalCol')}</th>
                        <th className="text-right px-2 py-1.5 font-medium">{t('contracts.lastRunCol')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {verificationStatus.map((entry, i) => (
                        <motion.tr
                          key={`${entry.contract}-${entry.tool}`}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.05 }}
                          className="border-t border-slate-700/30"
                        >
                          <td className="px-2 py-1.5 font-mono text-slate-200">{entry.contract}</td>
                          <td className="px-2 py-1.5">
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-[8px] px-1 py-0',
                                entry.tool === 'Certora Prover'
                                  ? 'bg-violet-500/10 text-violet-400 border-violet-500/20'
                                  : 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                              )}
                            >
                              {entry.tool === 'Certora Prover' ? 'Certora' : 'Slither'}
                            </Badge>
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-[8px] px-1 py-0',
                                entry.status === 'verified'
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                  : entry.status === 'passed'
                                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                                    : 'bg-red-500/10 text-red-400 border-red-500/30'
                              )}
                            >
                              {entry.status === 'verified' ? t('contracts.verified') : entry.status === 'passed' ? t('contracts.passedStatus') : t('contracts.notPassed')}
                            </Badge>
                          </td>
                          <td className="px-2 py-1.5 text-center font-mono text-slate-300">
                            {entry.invariants ?? '-'}
                          </td>
                          <td className="px-2 py-1.5 text-center font-mono text-slate-300">
                            {entry.counterexamples ?? '-'}
                          </td>
                          <td className="px-2 py-1.5 text-center font-mono text-slate-300">
                            {entry.findings ?? '-'}
                          </td>
                          <td className="px-2 py-1.5 text-center font-mono text-slate-300">
                            {entry.highCritical ?? '-'}
                          </td>
                          <td className="px-2 py-1.5 text-right text-slate-400">{entry.lastRun}</td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <Separator className="bg-slate-700/50" />

              {/* Security Audit Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Certora Prover Summary */}
                <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-violet-500/10 border border-violet-500/30 flex items-center justify-center">
                      <ShieldCheck className="w-3 h-3 text-violet-400" />
                    </div>
                    <span className="text-xs font-medium text-slate-200">Certora Prover</span>
                  </div>
                  <div className="space-y-2">
                    {verificationStatus
                      .filter((v) => v.tool === 'Certora Prover')
                      .map((entry) => (
                        <div key={entry.contract} className="flex items-center justify-between px-2 py-1.5 rounded bg-slate-900/40">
                          <span className="text-[10px] font-mono text-slate-300">{entry.contract}</span>
                          <div className="flex items-center gap-1.5">
                            <CheckCircle className="w-3 h-3 text-emerald-400" />
                            <span className="text-[9px] text-emerald-400">{t('contracts.invariantsCount', { count: entry.invariants })}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                  <div className="text-[9px] text-slate-500">
                    {t('contracts.totalInvariantsSummary', { count: verificationStatus.filter((v) => v.tool === 'Certora Prover').reduce((s, v) => s + (v.invariants || 0), 0) })}
                    {' · '}{t('contracts.counterexamplesSummary', { count: verificationStatus.filter((v) => v.tool === 'Certora Prover').reduce((s, v) => s + (v.counterexamples || 0), 0) })}
                  </div>
                </div>

                {/* Slither Summary */}
                <div className="rounded-lg border border-sky-500/20 bg-sky-500/5 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-sky-500/10 border border-sky-500/30 flex items-center justify-center">
                      <Eye className="w-3 h-3 text-sky-400" />
                    </div>
                    <span className="text-xs font-medium text-slate-200">{t('contracts.slitherAnalysis')}</span>
                  </div>
                  <div className="space-y-2">
                    {verificationStatus
                      .filter((v) => v.tool === 'Slither')
                      .map((entry) => (
                        <div key={entry.contract} className="flex items-center justify-between px-2 py-1.5 rounded bg-slate-900/40">
                          <span className="text-[10px] font-mono text-slate-300">{entry.contract}</span>
                          <div className="flex items-center gap-1.5">
                            <CheckCircle className="w-3 h-3 text-blue-400" />
                            <span className="text-[9px] text-blue-400">
                              {entry.findings === 0 ? t('contracts.noFindings') : t('contracts.findingsCount', { count: entry.findings })}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                  <div className="text-[9px] text-slate-500">
                    {t('contracts.totalFindings', { count: verificationStatus.filter((v) => v.tool === 'Slither').reduce((s, v) => s + (v.findings || 0), 0) })}
                    {' · '}{t('contracts.highCriticalSummary', { count: verificationStatus.filter((v) => v.tool === 'Slither').reduce((s, v) => s + (v.highCritical || 0), 0) })}
                  </div>
                </div>
              </div>

              {/* Overall Security Score */}
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span className="text-sm font-semibold text-slate-100">{t('contracts.securityScore')}</span>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      {t('contracts.scoreBasis')}
                    </p>
                  </div>
                  <div className="relative w-20 h-20">
                    <svg width="80" height="80" className="-rotate-90">
                      <circle
                        cx="40"
                        cy="40"
                        r="32"
                        stroke="rgba(100,116,139,0.2)"
                        strokeWidth="6"
                        fill="none"
                      />
                      <motion.circle
                        cx="40"
                        cy="40"
                        r="32"
                        stroke="#10b981"
                        strokeWidth="6"
                        fill="none"
                        strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 32}
                        initial={{ strokeDashoffset: 2 * Math.PI * 32 }}
                        animate={{ strokeDashoffset: 2 * Math.PI * 32 * (1 - 0.94) }}
                        transition={{ duration: 1.5, ease: 'easeOut' }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xl font-bold text-emerald-400">94</span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded bg-slate-900/40 p-2">
                    <p className="text-[10px] text-emerald-400 font-medium">0</p>
                    <p className="text-[8px] text-slate-500">{t('contracts.highFindings')}</p>
                  </div>
                  <div className="rounded bg-slate-900/40 p-2">
                    <p className="text-[10px] text-emerald-400 font-medium">4/4</p>
                    <p className="text-[8px] text-slate-500">{t('contracts.invariantsPassed')}</p>
                  </div>
                  <div className="rounded bg-slate-900/40 p-2">
                    <p className="text-[10px] text-amber-400 font-medium">3</p>
                    <p className="text-[8px] text-slate-500">{t('contracts.lowFindings')}</p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </motion.div>
  );
}
