'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Code2,
  Play,
  Zap,
  Calculator,
  CheckCircle,
  XCircle,
  ChevronRight,
  FlaskConical,
  AlertTriangle,
  Clock,
  Fuel,
  ArrowRight,
  RotateCcw,
  Copy,
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
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

// ===== Types =====
interface ContractInput {
  name: string;
  type: string;
}

interface ContractFunction {
  name: string;
  inputs: ContractInput[];
  gasEstimate: number;
}

interface ContractInfo {
  id: string;
  name: string;
  description: string;
  address: string;
  functions: ContractFunction[];
}

interface SimulationHistoryItem {
  id: string;
  contract: string;
  function: string;
  params: Record<string, number | string | boolean>;
  result: string;
  gasUsed: number;
  timestamp: string;
}

// ===== Mock Data =====
const CONTRACTS: ContractInfo[] = [
  {
    id: 'AvatarCore',
    name: 'AvatarCore',
    description: '认知身份核心合约',
    address: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    functions: [
      { name: 'createAvatar', inputs: [{ name: 'soulId', type: 'uint256' }, { name: 'cognitionRoot', type: 'bytes32' }], gasEstimate: 185000 },
      { name: 'updateCognitionRoot', inputs: [{ name: 'soulId', type: 'uint256' }, { name: 'newRoot', type: 'bytes32' }], gasEstimate: 45000 },
      { name: 'getAvatarProfile', inputs: [{ name: 'soulId', type: 'uint256' }], gasEstimate: 28000 },
    ],
  },
  {
    id: 'DynamicSplitter',
    name: 'DynamicSplitter',
    description: '动态分账合约',
    address: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
    functions: [
      { name: 'executeSplit', inputs: [{ name: 'amount', type: 'uint256' }, { name: 'resonanceScore', type: 'uint256' }, { name: 'complexity', type: 'uint8' }], gasEstimate: 65000 },
      { name: 'getSplitConfig', inputs: [{ name: 'resonanceScore', type: 'uint256' }], gasEstimate: 32000 },
    ],
  },
  {
    id: 'CircuitGuard',
    name: 'CircuitGuard',
    description: '认知熔断合约',
    address: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
    functions: [
      { name: 'evaluateState', inputs: [{ name: 'resonanceScore', type: 'uint256' }], gasEstimate: 35000 },
      { name: 'triggerRecovery', inputs: [{ name: 'soulId', type: 'uint256' }], gasEstimate: 52000 },
    ],
  },
  {
    id: 'SkillVault',
    name: 'SkillVault',
    description: '技能库合约',
    address: '0xDc64a140Aa8E0C49f1C6cC7F9E3aA15E0B2D6e2F',
    functions: [
      { name: 'unlockSkill', inputs: [{ name: 'soulId', type: 'uint256' }, { name: 'tier', type: 'uint8' }, { name: 'cumulativeRevenue', type: 'uint256' }], gasEstimate: 78000 },
      { name: 'getSkillStatus', inputs: [{ name: 'soulId', type: 'uint256' }, { name: 'tier', type: 'uint8' }], gasEstimate: 28000 },
    ],
  },
  {
    id: 'IFDRouter',
    name: 'IFDRouter',
    description: '流体民主路由合约',
    address: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9',
    functions: [
      { name: 'delegateVote', inputs: [{ name: 'domain', type: 'string' }, { name: 'weight', type: 'uint256' }], gasEstimate: 45000 },
      { name: 'executeRoutedVote', inputs: [{ name: 'proposalId', type: 'uint256' }], gasEstimate: 55000 },
    ],
  },
  {
    id: 'TokenVault',
    name: 'TokenVault',
    description: '代币金库合约',
    address: '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707',
    functions: [
      { name: 'deposit', inputs: [{ name: 'amount', type: 'uint256' }], gasEstimate: 42000 },
      { name: 'withdraw', inputs: [{ name: 'amount', type: 'uint256' }], gasEstimate: 48000 },
    ],
  },
];

const GAS_PRICE_USD = 0.0000000025;

const INITIAL_HISTORY: SimulationHistoryItem[] = [
  { id: 'sim1', contract: 'DynamicSplitter', function: 'executeSplit', params: { amount: 100, resonanceScore: 72, complexity: 1 }, result: 'SUCCESS', gasUsed: 62350, timestamp: '2026-03-04T14:00:00Z' },
  { id: 'sim2', contract: 'CircuitGuard', function: 'evaluateState', params: { resonanceScore: 58 }, result: 'SOFT_LIMIT', gasUsed: 32100, timestamp: '2026-03-04T13:30:00Z' },
  { id: 'sim3', contract: 'SkillVault', function: 'unlockSkill', params: { soulId: 1, tier: 3, cumulativeRevenue: 1200 }, result: 'REJECTED (revenue < threshold)', gasUsed: 28000, timestamp: '2026-03-04T12:00:00Z' },
];

// ===== Local Simulation Engine (Deterministic) =====
function localSimulate(
  contractId: string,
  fn: string,
  params: Record<string, number | string | boolean>
): { result: Record<string, unknown>; verification?: { status: 'pass' | 'fail'; details: string } } {
  // DynamicSplitter
  if (contractId === 'DynamicSplitter' && fn === 'executeSplit') {
    const amount = Number(params.amount) || 0;
    const resonanceScore = Number(params.resonanceScore) || 50;
    const complexity = Number(params.complexity) || 1;
    const avatarAdj = Math.max(1500, Math.min(2500, (70 - resonanceScore) * 50));
    const humanBps = 7000 - (avatarAdj - 2000);
    const avatarBps = avatarAdj;
    const protocolBps = 1000;
    const humanShare = (amount * humanBps) / 10000;
    const avatarShare = (amount * avatarBps) / 10000;
    const protocolShare = (amount * protocolBps) / 10000;
    const totalCheck = humanShare + avatarShare + protocolShare;
    const splitConservation = Math.abs(totalCheck - amount) < 0.01;
    return {
      result: {
        status: 'SUCCESS',
        input: { amount, resonanceScore, complexity },
        split: { humanBps, avatarBps, protocolBps, humanShare: Number(humanShare.toFixed(4)), avatarShare: Number(avatarShare.toFixed(4)), protocolShare: Number(protocolShare.toFixed(4)) },
        dynamicAdjustment: {
          formula: `avatarAdj = clamp((70 - ${resonanceScore}) × 50, 1500, 2500)`,
          avatarAdjBps: avatarAdj,
          humanShiftBps: avatarAdj - 2000,
        },
        conservationCheck: splitConservation,
      },
      verification: {
        status: splitConservation ? 'pass' : 'fail',
        details: splitConservation
          ? `Split conservation verified: ${humanShare.toFixed(4)} + ${avatarShare.toFixed(4)} + ${protocolShare.toFixed(4)} = ${totalCheck.toFixed(4)} = ${amount}`
          : `Split conservation FAILED: ${totalCheck.toFixed(4)} ≠ ${amount}`,
      },
    };
  }

  if (contractId === 'DynamicSplitter' && fn === 'getSplitConfig') {
    const resonanceScore = Number(params.resonanceScore) || 50;
    const avatarAdj = Math.max(1500, Math.min(2500, (70 - resonanceScore) * 50));
    const humanBps = 7000 - (avatarAdj - 2000);
    const avatarBps = avatarAdj;
    const protocolBps = 1000;
    return {
      result: {
        status: 'SUCCESS',
        resonanceScore,
        config: { humanBps, avatarBps, protocolBps },
        description: `Resonance ${resonanceScore}: Human ${(humanBps / 100).toFixed(0)}% / Avatar ${(avatarBps / 100).toFixed(0)}% / Protocol ${(protocolBps / 100).toFixed(0)}%`,
      },
    };
  }

  // CircuitGuard
  if (contractId === 'CircuitGuard' && fn === 'evaluateState') {
    const resonanceScore = Number(params.resonanceScore) || 50;
    let newState: string;
    let description: string;
    if (resonanceScore >= 70) {
      newState = 'NORMAL';
      description = `Resonance ${resonanceScore} ≥ 70: All systems operational`;
    } else if (resonanceScore >= 50) {
      newState = 'SOFT_LIMIT';
      description = `Resonance ${resonanceScore} in [50, 69]: High-risk actions paused`;
    } else {
      newState = 'HARD_PAUSE';
      description = `Resonance ${resonanceScore} < 50: All actions suspended`;
    }
    return {
      result: {
        status: 'SUCCESS',
        resonanceScore,
        previousState: 'NORMAL',
        newState,
        description,
        thresholds: { softLimit: 70, hardPause: 50 },
        allowedActions: newState === 'NORMAL' ? ['all'] : newState === 'SOFT_LIMIT' ? ['read', 'low_risk_write'] : ['read_only'],
      },
      verification: {
        status: 'pass',
        details: `State transition: NORMAL → ${newState} (resonance=${resonanceScore})`,
      },
    };
  }

  if (contractId === 'CircuitGuard' && fn === 'triggerRecovery') {
    const soulId = Number(params.soulId) || 0;
    return {
      result: {
        status: 'SUCCESS',
        soulId,
        previousState: 'HARD_PAUSE',
        newState: 'RECOVERY',
        recoveryPeriodHours: 48,
      },
      verification: {
        status: 'pass',
        details: 'Recovery initiated: 48-hour cooldown before auto-resume to NORMAL',
      },
    };
  }

  // SkillVault
  if (contractId === 'SkillVault' && fn === 'unlockSkill') {
    const soulId = Number(params.soulId) || 0;
    const tier = Number(params.tier) || 1;
    const cumulativeRevenue = Number(params.cumulativeRevenue) || 0;
    const TIER_THRESHOLDS: Record<number, number> = { 1: 0, 2: 500, 3: 2000, 4: 8000, 5: 30000 };
    const threshold = TIER_THRESHOLDS[tier] ?? 999999;
    const canUnlock = cumulativeRevenue >= threshold;
    return {
      result: {
        status: canUnlock ? 'SUCCESS' : 'REJECTED',
        soulId,
        tier,
        cumulativeRevenue,
        threshold,
        canUnlock,
        message: canUnlock
          ? `Tier ${tier} skill unlocked (revenue ${cumulativeRevenue} ≥ threshold ${threshold})`
          : `Tier ${tier} unlock rejected: revenue ${cumulativeRevenue} < threshold ${threshold}`,
      },
      verification: {
        status: canUnlock ? 'pass' : 'fail',
        details: canUnlock
          ? `Revenue check passed: ${cumulativeRevenue} ≥ ${threshold}`
          : `Revenue check failed: ${cumulativeRevenue} < ${threshold} (need ${(threshold - cumulativeRevenue).toFixed(0)} more)`,
      },
    };
  }

  if (contractId === 'SkillVault' && fn === 'getSkillStatus') {
    const soulId = Number(params.soulId) || 0;
    const tier = Number(params.tier) || 1;
    return {
      result: {
        status: 'SUCCESS',
        soulId,
        tier,
        threshold: [0, 0, 500, 2000, 8000, 30000][tier] ?? 999999,
        unlocked: tier <= 2,
        progress: tier <= 2 ? 100 : 65,
      },
    };
  }

  // AvatarCore
  if (contractId === 'AvatarCore' && fn === 'createAvatar') {
    const soulId = Number(params.soulId) || 0;
    return {
      result: {
        status: 'SUCCESS',
        soulId,
        avatarAddress: `0x${(soulId * 7919 + 0xabcd).toString(16).slice(0, 40).padStart(40, '0')}`,
        circuitState: 'NORMAL',
        tier: 'starter',
        message: 'Avatar created successfully',
      },
    };
  }

  if (contractId === 'AvatarCore' && fn === 'updateCognitionRoot') {
    const soulId = Number(params.soulId) || 0;
    return {
      result: {
        status: 'SUCCESS',
        soulId,
        previousRoot: '0x' + 'a1b2'.repeat(8),
        newRoot: String(params.newRoot || '0x0000'),
        version: 2,
      },
    };
  }

  if (contractId === 'AvatarCore' && fn === 'getAvatarProfile') {
    const soulId = Number(params.soulId) || 0;
    return {
      result: {
        status: 'SUCCESS',
        soulId,
        owner: '0x7a3f' + '0'.repeat(36),
        resonanceScore: 82,
        circuitState: 'NORMAL',
        tier: 'pro',
      },
    };
  }

  // IFDRouter
  if (contractId === 'IFDRouter' && fn === 'delegateVote') {
    return {
      result: {
        status: 'SUCCESS',
        domain: String(params.domain || 'governance'),
        delegateAddress: '0x' + 'def1'.repeat(10),
        weight: Number(params.weight) || 1,
        votingPower: (Number(params.weight) || 1) * 100,
      },
    };
  }

  if (contractId === 'IFDRouter' && fn === 'executeRoutedVote') {
    const proposalId = Number(params.proposalId) || 1;
    return {
      result: {
        status: 'SUCCESS',
        proposalId,
        totalVotes: 12500,
        quorum: 10000,
        passed: true,
      },
    };
  }

  // TokenVault
  if (contractId === 'TokenVault' && fn === 'deposit') {
    const amount = Number(params.amount) || 0;
    return {
      result: {
        status: 'SUCCESS',
        amount,
        vaultBalance: 10000 + amount,
        lpTokensMinted: Number((amount * 0.95).toFixed(2)),
      },
    };
  }

  if (contractId === 'TokenVault' && fn === 'withdraw') {
    const amount = Number(params.amount) || 0;
    return {
      result: {
        status: 'SUCCESS',
        amount,
        vaultBalance: Math.max(0, 10000 - amount),
        lpTokensBurned: Number((amount * 1.05).toFixed(2)),
      },
    };
  }

  return { result: { status: 'UNKNOWN_FUNCTION', message: `Unknown function ${fn} on ${contractId}` } };
}

// ===== Sub-components =====

function ResultViewer({ data, depth = 0 }: { data: unknown; depth?: number }) {
  if (data === null || data === undefined) {
    return <span className="text-slate-500">null</span>;
  }

  if (typeof data === 'boolean') {
    return (
      <span className={data ? 'text-emerald-400' : 'text-red-400'}>
        {String(data)}
      </span>
    );
  }

  if (typeof data === 'number') {
    return <span className="text-amber-300 font-mono text-xs">{data}</span>;
  }

  if (typeof data === 'string') {
    const isStatus = data === 'SUCCESS' || data === 'REJECTED';
    const isState = data === 'NORMAL' || data === 'SOFT_LIMIT' || data === 'HARD_PAUSE' || data === 'RECOVERY';
    if (isStatus) {
      return (
        <Badge
          variant="outline"
          className={cn(
            'text-[10px] px-1.5 py-0',
            data === 'SUCCESS'
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              : 'bg-red-500/10 text-red-400 border-red-500/30'
          )}
        >
          {data}
        </Badge>
      );
    }
    if (isState) {
      const stateColors: Record<string, string> = {
        NORMAL: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
        SOFT_LIMIT: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
        HARD_PAUSE: 'bg-red-500/10 text-red-400 border-red-500/30',
        RECOVERY: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
      };
      return (
        <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', stateColors[data] || '')}>
          {data}
        </Badge>
      );
    }
    return <span className="text-slate-300 font-mono text-xs">"{data}"</span>;
  }

  if (Array.isArray(data)) {
    if (data.length === 0) return <span className="text-slate-500">[]</span>;
    if (data.every((item) => typeof item === 'string')) {
      return <span className="text-slate-300 text-xs">[{(data as string[]).join(', ')}]</span>;
    }
    return (
      <div className={cn(depth > 0 && 'ml-3')}>
        {data.map((item, i) => (
          <div key={i} className="flex items-start gap-1">
            <span className="text-slate-600 text-[10px] shrink-0 w-4 text-right">{i}</span>
            <ResultViewer data={item} depth={depth + 1} />
          </div>
        ))}
      </div>
    );
  }

  if (typeof data === 'object') {
    const entries = Object.entries(data as Record<string, unknown>);
    return (
      <div className={cn('space-y-0.5', depth > 0 && 'ml-3')}>
        {entries.map(([key, value]) => (
          <div key={key} className="flex items-start gap-1.5">
            <span className="text-violet-400 text-[11px] font-medium shrink-0 min-w-[80px]">{key}:</span>
            <ResultViewer data={value} depth={depth + 1} />
          </div>
        ))}
      </div>
    );
  }

  return <span className="text-slate-300 text-xs">{String(data)}</span>;
}

// ===== Main Component =====
export default function ContractSimulation() {
  const [selectedContractId, setSelectedContractId] = useState<string>('DynamicSplitter');
  const [selectedFunctionName, setSelectedFunctionName] = useState<string>('executeSplit');
  const [paramValues, setParamValues] = useState<Record<string, string>>({ amount: '100', resonanceScore: '72', complexity: '1' });
  const [simulationResult, setSimulationResult] = useState<Record<string, unknown> | null>(null);
  const [simulationVerification, setSimulationVerification] = useState<{ status: 'pass' | 'fail'; details: string } | null>(null);
  const [simulationGas, setSimulationGas] = useState<{ units: number; costUsd: number } | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [history, setHistory] = useState<SimulationHistoryItem[]>(INITIAL_HISTORY);
  const [activeTab, setActiveTab] = useState('simulate');

  // Split verification state
  const [splitTotalAmount, setSplitTotalAmount] = useState('100');
  const [splitHumanBps, setSplitHumanBps] = useState('7000');
  const [splitAvatarBps, setSplitAvatarBps] = useState('2000');
  const [splitProtocolBps, setSplitProtocolBps] = useState('1000');
  const [splitVerificationResult, setSplitVerificationResult] = useState<{
    status: 'pass' | 'fail';
    details: string;
    calculated: Record<string, number>;
  } | null>(null);

  const selectedContract = useMemo(
    () => CONTRACTS.find((c) => c.id === selectedContractId),
    [selectedContractId]
  );

  const selectedFunction = useMemo(
    () => selectedContract?.functions.find((f) => f.name === selectedFunctionName),
    [selectedContract, selectedFunctionName]
  );

  const gasEstimate = useMemo(() => {
    if (!selectedFunction) return null;
    return {
      units: selectedFunction.gasEstimate,
      costUsd: Number((selectedFunction.gasEstimate * GAS_PRICE_USD).toFixed(8)),
    };
  }, [selectedFunction]);

  const gasOptimizationTips = useMemo(() => {
    if (!selectedFunction) return [];
    const tips: string[] = [];
    if (selectedFunction.gasEstimate > 100000) {
      tips.push('高Gas函数 — 考虑批量操作降低均摊成本');
    }
    if (selectedFunction.name.includes('update') || selectedFunction.name.includes('write')) {
      tips.push('写入操作 — 可在Gas低谷时段执行以节省成本');
    }
    if (selectedFunction.inputs.length > 2) {
      tips.push('多参数函数 — 可使用 multicall 合并调用');
    }
    if (selectedFunction.name.includes('get') || selectedFunction.name.includes('view')) {
      tips.push('只读操作 — 链下模拟无需Gas消耗');
    }
    if (tips.length === 0) {
      tips.push('Gas消耗在合理范围内');
    }
    return tips;
  }, [selectedFunction]);

  const handleContractChange = useCallback((contractId: string) => {
    setSelectedContractId(contractId);
    const contract = CONTRACTS.find((c) => c.id === contractId);
    if (contract && contract.functions.length > 0) {
      setSelectedFunctionName(contract.functions[0].name);
      // Initialize params with defaults
      const defaults: Record<string, string> = {};
      contract.functions[0].inputs.forEach((input) => {
        if (input.name === 'soulId') defaults[input.name] = '1';
        else if (input.name === 'tier') defaults[input.name] = '2';
        else if (input.name === 'resonanceScore') defaults[input.name] = '72';
        else if (input.name === 'amount') defaults[input.name] = '100';
        else if (input.name === 'complexity') defaults[input.name] = '1';
        else if (input.name === 'weight') defaults[input.name] = '1';
        else if (input.name === 'proposalId') defaults[input.name] = '1';
        else if (input.name === 'cumulativeRevenue') defaults[input.name] = '2500';
        else if (input.name === 'domain') defaults[input.name] = 'governance';
        else if (input.type === 'bytes32') defaults[input.name] = '0xabcd1234';
        else if (input.type === 'string') defaults[input.name] = 'sample';
        else defaults[input.name] = '0';
      });
      setParamValues(defaults);
    }
    setSimulationResult(null);
    setSimulationVerification(null);
    setSimulationGas(null);
  }, []);

  const handleFunctionChange = useCallback((fnName: string) => {
    setSelectedFunctionName(fnName);
    const contract = CONTRACTS.find((c) => c.id === selectedContractId);
    const fn = contract?.functions.find((f) => f.name === fnName);
    if (fn) {
      const defaults: Record<string, string> = {};
      fn.inputs.forEach((input) => {
        if (input.name === 'soulId') defaults[input.name] = '1';
        else if (input.name === 'tier') defaults[input.name] = '2';
        else if (input.name === 'resonanceScore') defaults[input.name] = '72';
        else if (input.name === 'amount') defaults[input.name] = '100';
        else if (input.name === 'complexity') defaults[input.name] = '1';
        else if (input.name === 'weight') defaults[input.name] = '1';
        else if (input.name === 'proposalId') defaults[input.name] = '1';
        else if (input.name === 'cumulativeRevenue') defaults[input.name] = '2500';
        else if (input.name === 'domain') defaults[input.name] = 'governance';
        else if (input.type === 'bytes32') defaults[input.name] = '0xabcd1234';
        else if (input.type === 'string') defaults[input.name] = 'sample';
        else defaults[input.name] = '0';
      });
      setParamValues(defaults);
    }
    setSimulationResult(null);
    setSimulationVerification(null);
    setSimulationGas(null);
  }, [selectedContractId]);

  const handleSimulate = useCallback(async () => {
    if (!selectedContract || !selectedFunction) return;

    setIsSimulating(true);

    // Build params
    const params: Record<string, number | string | boolean> = {};
    selectedFunction.inputs.forEach((input) => {
      const val = paramValues[input.name] || '0';
      if (input.type === 'uint256' || input.type === 'uint8') {
        params[input.name] = Number(val);
      } else {
        params[input.name] = val;
      }
    });

    // Simulate locally (deterministic, no Math.random)
    const simResult = localSimulate(selectedContract.id, selectedFunction.name, params);

    // Simulate a small delay for UX
    await new Promise((resolve) => setTimeout(resolve, 400));

    setSimulationResult(simResult.result);
    setSimulationVerification(simResult.verification || null);
    setSimulationGas(gasEstimate);

    // Add to history
    const historyItem: SimulationHistoryItem = {
      id: `sim${Date.now()}`,
      contract: selectedContract.id,
      function: selectedFunction.name,
      params,
      result: String(simResult.result.status || 'UNKNOWN'),
      gasUsed: gasEstimate?.units || 0,
      timestamp: new Date().toISOString(),
    };
    setHistory((prev) => [historyItem, ...prev].slice(0, 20));

    setIsSimulating(false);
  }, [selectedContract, selectedFunction, paramValues, gasEstimate]);

  const handleVerifySplit = useCallback(() => {
    const totalAmount = Number(splitTotalAmount) || 0;
    const humanBps = Number(splitHumanBps) || 0;
    const avatarBps = Number(splitAvatarBps) || 0;
    const protocolBps = Number(splitProtocolBps) || 0;

    const totalBps = humanBps + avatarBps + protocolBps;
    const humanAmount = (totalAmount * humanBps) / 10000;
    const avatarAmount = (totalAmount * avatarBps) / 10000;
    const protocolAmount = (totalAmount * protocolBps) / 10000;
    const totalCalculated = humanAmount + avatarAmount + protocolAmount;

    const bpsConservation = totalBps === 10000;
    const amountConservation = Math.abs(totalCalculated - totalAmount) < 0.01;

    setSplitVerificationResult({
      status: bpsConservation && amountConservation ? 'pass' : 'fail',
      details: bpsConservation && amountConservation
        ? `Conservation verified: ${humanBps} + ${avatarBps} + ${protocolBps} = ${totalBps} bps, amounts sum to ${totalCalculated.toFixed(4)}`
        : `Conservation FAILED: bps total = ${totalBps} (expected 10000), amount total = ${totalCalculated.toFixed(4)} (expected ${totalAmount})`,
      calculated: {
        humanAmount: Number(humanAmount.toFixed(4)),
        avatarAmount: Number(avatarAmount.toFixed(4)),
        protocolAmount: Number(protocolAmount.toFixed(4)),
        totalBps,
        totalCalculated: Number(totalCalculated.toFixed(4)),
      },
    });
  }, [splitTotalAmount, splitHumanBps, splitAvatarBps, splitProtocolBps]);

  const handleCopyAddress = useCallback((addr: string) => {
    navigator.clipboard.writeText(addr);
  }, []);

  const formatTimestamp = (ts: string) => {
    return format(parseISO(ts), 'MM/dd HH:mm');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      <Card className="border-slate-700 bg-slate-800/80 backdrop-blur-sm shadow-xl shadow-black/20 overflow-hidden">
        {/* Top accent bar */}
        <div className="h-1 bg-gradient-to-r from-violet-500 via-blue-500 to-emerald-500" />

        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base text-slate-100">
                <FlaskConical className="w-4 h-4 text-violet-400" />
                合约模拟器
              </CardTitle>
              <CardDescription className="text-xs text-slate-400 mt-0.5">
                链下模拟合约交互 · Gas估算 · 分账验证
              </CardDescription>
            </div>
            <Badge
              variant="outline"
              className="bg-violet-500/10 text-violet-300 border-violet-500/30 text-[10px]"
            >
              Base L2
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-0">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-slate-900/60 border border-slate-700/50 h-8">
              <TabsTrigger
                value="simulate"
                className="text-[11px] data-[state=active]:bg-slate-700 data-[state=active]:text-slate-100 text-slate-400 px-3 h-6"
              >
                <Code2 className="w-3 h-3 mr-1" />
                函数模拟
              </TabsTrigger>
              <TabsTrigger
                value="verify"
                className="text-[11px] data-[state=active]:bg-slate-700 data-[state=active]:text-slate-100 text-slate-400 px-3 h-6"
              >
                <Calculator className="w-3 h-3 mr-1" />
                分账验证
              </TabsTrigger>
              <TabsTrigger
                value="history"
                className="text-[11px] data-[state=active]:bg-slate-700 data-[state=active]:text-slate-100 text-slate-400 px-3 h-6"
              >
                <Clock className="w-3 h-3 mr-1" />
                历史
              </TabsTrigger>
            </TabsList>

            {/* ====== SIMULATE TAB ====== */}
            <TabsContent value="simulate" className="space-y-4 mt-3">
              {/* Contract Selector + Function Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Contract */}
                <div className="space-y-1.5">
                  <label className="text-[11px] text-slate-400 font-medium">合约选择</label>
                  <Select value={selectedContractId} onValueChange={handleContractChange}>
                    <SelectTrigger className="w-full bg-slate-900/60 border-slate-700 text-slate-200 text-xs h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      {CONTRACTS.map((contract) => (
                        <SelectItem key={contract.id} value={contract.id} className="text-xs text-slate-200 focus:bg-slate-700 focus:text-slate-100">
                          <div className="flex items-center gap-2">
                            <Code2 className="w-3 h-3 text-violet-400" />
                            <span>{contract.name}</span>
                            <span className="text-slate-500">— {contract.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Function */}
                <div className="space-y-1.5">
                  <label className="text-[11px] text-slate-400 font-medium">函数选择</label>
                  <Select value={selectedFunctionName} onValueChange={handleFunctionChange}>
                    <SelectTrigger className="w-full bg-slate-900/60 border-slate-700 text-slate-200 text-xs h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      {selectedContract?.functions.map((fn) => (
                        <SelectItem key={fn.name} value={fn.name} className="text-xs text-slate-200 focus:bg-slate-700 focus:text-slate-100">
                          <div className="flex items-center gap-2">
                            <Play className="w-3 h-3 text-emerald-400" />
                            <span className="font-mono">{fn.name}</span>
                            <span className="text-slate-500">({fn.inputs.map((i) => i.name).join(', ')})</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Contract Info */}
              {selectedContract && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-slate-900/40 border border-slate-700/50">
                  <Code2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="text-[10px] text-slate-500 font-mono truncate">{selectedContract.address}</span>
                  <button
                    onClick={() => handleCopyAddress(selectedContract.address)}
                    className="ml-auto shrink-0 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* Parameter Inputs */}
              {selectedFunction && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-400 font-medium">函数参数</span>
                    <Badge variant="outline" className="text-[9px] px-1 py-0 bg-slate-700/50 text-slate-400 border-slate-600">
                      {selectedFunction.inputs.length} 个参数
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {selectedFunction.inputs.map((input) => (
                      <div key={input.name} className="space-y-1">
                        <label className="text-[10px] text-slate-500">
                          {input.name}{' '}
                          <span className="text-slate-600">({input.type})</span>
                        </label>
                        <Input
                          value={paramValues[input.name] || ''}
                          onChange={(e) =>
                            setParamValues((prev) => ({
                              ...prev,
                              [input.name]: e.target.value,
                            }))
                          }
                          className="h-8 text-xs bg-slate-900/60 border-slate-700 text-slate-200 font-mono placeholder:text-slate-600 focus:border-violet-500/50"
                          placeholder={input.type === 'bytes32' ? '0x...' : '0'}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Simulate Button */}
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleSimulate}
                  disabled={isSimulating || !selectedFunction}
                  className="bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white text-xs h-9 px-4"
                >
                  {isSimulating ? (
                    <motion.span
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1, repeat: Infinity }}
                      className="flex items-center gap-1.5"
                    >
                      <FlaskConical className="w-3.5 h-3.5" />
                      模拟中...
                    </motion.span>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 mr-1.5" />
                      执行模拟
                    </>
                  )}
                </Button>

                {gasEstimate && (
                  <div className="flex items-center gap-3 ml-auto text-[10px]">
                    <div className="flex items-center gap-1 text-slate-400">
                      <Fuel className="w-3 h-3" />
                      <span>{gasEstimate.units.toLocaleString()} gas</span>
                    </div>
                    <div className="flex items-center gap-1 text-amber-400">
                      <Zap className="w-3 h-3" />
                      <span>~${gasEstimate.costUsd.toFixed(6)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Gas Estimation Panel */}
              {gasEstimate && (
                <div className="rounded-lg border border-slate-700/50 bg-slate-900/40 p-3 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium">
                    <Fuel className="w-3.5 h-3.5 text-amber-400" />
                    Gas 估算详情
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-[10px] text-slate-500">预估Gas单位</span>
                      <p className="text-sm font-mono text-slate-200">{gasEstimate.units.toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500">预估成本 (USD)</span>
                      <p className="text-sm font-mono text-amber-300">${gasEstimate.costUsd.toFixed(8)}</p>
                    </div>
                  </div>
                  {gasOptimizationTips.length > 0 && (
                    <div className="space-y-1 pt-1 border-t border-slate-700/30">
                      <span className="text-[10px] text-slate-500">优化建议</span>
                      {gasOptimizationTips.map((tip, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-[10px]">
                          <Zap className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                          <span className="text-slate-400">{tip}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Simulation Result */}
              <AnimatePresence mode="wait">
                {simulationResult && (
                  <motion.div
                    key="sim-result"
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.98 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-3"
                  >
                    <Separator className="bg-slate-700/50" />

                    {/* Result Header */}
                    <div className="flex items-center gap-2">
                      {simulationResult.status === 'SUCCESS' ? (
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-400" />
                      )}
                      <span className="text-sm font-medium text-slate-200">
                        模拟结果
                      </span>
                      {simulationResult.status && (
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] px-1.5 py-0',
                            simulationResult.status === 'SUCCESS'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : simulationResult.status === 'REJECTED'
                                ? 'bg-red-500/10 text-red-400 border-red-500/30'
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          )}
                        >
                          {String(simulationResult.status)}
                        </Badge>
                      )}
                      {simulationGas && (
                        <span className="ml-auto text-[10px] text-slate-500 font-mono">
                          {simulationGas.units.toLocaleString()} gas · ${simulationGas.costUsd.toFixed(6)}
                        </span>
                      )}
                    </div>

                    {/* Split visualization (DynamicSplitter only) */}
                    {selectedContractId === 'DynamicSplitter' && selectedFunctionName === 'executeSplit' && simulationResult.split && (
                      <div className="space-y-2">
                        <div className="text-[11px] text-slate-400 font-medium">分账可视化</div>
                        {(() => {
                          const split = simulationResult.split as { humanBps: number; avatarBps: number; protocolBps: number; humanShare: number; avatarShare: number; protocolShare: number };
                          return (
                            <div className="space-y-2">
                              {/* Split bar */}
                              <div className="h-4 w-full overflow-hidden rounded-full bg-slate-700/50 flex">
                                <motion.div
                                  className="h-full bg-blue-500"
                                  initial={{ width: 0 }}
                                  animate={{ width: `${split.humanBps / 100}%` }}
                                  transition={{ duration: 0.8, ease: 'easeOut' }}
                                />
                                <motion.div
                                  className="h-full bg-emerald-500"
                                  initial={{ width: 0 }}
                                  animate={{ width: `${split.avatarBps / 100}%` }}
                                  transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
                                />
                                <motion.div
                                  className="h-full bg-amber-500"
                                  initial={{ width: 0 }}
                                  animate={{ width: `${split.protocolBps / 100}%` }}
                                  transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
                                />
                              </div>
                              {/* Legend */}
                              <div className="grid grid-cols-3 gap-2">
                                <div className="text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                                    <span className="text-[10px] text-slate-400">人类</span>
                                  </div>
                                  <p className="text-xs font-mono text-blue-300">{(split.humanBps / 100).toFixed(0)}%</p>
                                  <p className="text-[10px] text-slate-500">${split.humanShare.toFixed(2)}</p>
                                </div>
                                <div className="text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                    <span className="text-[10px] text-slate-400">分身</span>
                                  </div>
                                  <p className="text-xs font-mono text-emerald-300">{(split.avatarBps / 100).toFixed(0)}%</p>
                                  <p className="text-[10px] text-slate-500">${split.avatarShare.toFixed(2)}</p>
                                </div>
                                <div className="text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                                    <span className="text-[10px] text-slate-400">协议</span>
                                  </div>
                                  <p className="text-xs font-mono text-amber-300">{(split.protocolBps / 100).toFixed(0)}%</p>
                                  <p className="text-[10px] text-slate-500">${split.protocolShare.toFixed(2)}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {/* Dynamic Adjustment Info (DynamicSplitter only) */}
                    {selectedContractId === 'DynamicSplitter' && selectedFunctionName === 'executeSplit' && simulationResult.dynamicAdjustment && (
                      <div className="rounded-md border border-slate-700/50 bg-slate-900/40 p-2.5">
                        <div className="text-[10px] text-slate-400 font-medium mb-1">动态调整公式</div>
                        <code className="text-[11px] text-violet-300 font-mono">
                          {(simulationResult.dynamicAdjustment as { formula: string }).formula}
                        </code>
                        <div className="mt-1 flex items-center gap-3 text-[10px]">
                          <span className="text-slate-500">Avatar调整: <span className="text-emerald-400">{(simulationResult.dynamicAdjustment as { avatarAdjBps: number }).avatarAdjBps} bps</span></span>
                          <span className="text-slate-500">人类偏移: <span className="text-blue-400">{(simulationResult.dynamicAdjustment as { humanShiftBps: number }).humanShiftBps > 0 ? '+' : ''}{(simulationResult.dynamicAdjustment as { humanShiftBps: number }).humanShiftBps} bps</span></span>
                        </div>
                      </div>
                    )}

                    {/* CircuitGuard state visualization */}
                    {selectedContractId === 'CircuitGuard' && selectedFunctionName === 'evaluateState' && simulationResult.newState && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-slate-400">状态转换:</span>
                          <Badge variant="outline" className="bg-slate-600/30 text-slate-300 border-slate-600 text-[10px]">
                            {String(simulationResult.previousState)}
                          </Badge>
                          <ArrowRight className="w-3 h-3 text-slate-500" />
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-[10px]',
                              simulationResult.newState === 'NORMAL' && 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
                              simulationResult.newState === 'SOFT_LIMIT' && 'bg-amber-500/10 text-amber-400 border-amber-500/30',
                              simulationResult.newState === 'HARD_PAUSE' && 'bg-red-500/10 text-red-400 border-red-500/30',
                              simulationResult.newState === 'RECOVERY' && 'bg-sky-500/10 text-sky-400 border-sky-500/30',
                            )}
                          >
                            {String(simulationResult.newState)}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          {String(simulationResult.description)}
                        </p>
                      </div>
                    )}

                    {/* Full result JSON */}
                    <div className="rounded-md border border-slate-700/50 bg-slate-900/60 p-3 max-h-64 overflow-y-auto custom-scrollbar">
                      <ResultViewer data={simulationResult} />
                    </div>

                    {/* Verification Badge */}
                    {simulationVerification && (
                      <Alert
                        className={cn(
                          'py-2',
                          simulationVerification.status === 'pass'
                            ? 'border-emerald-500/30 bg-emerald-500/5'
                            : 'border-red-500/30 bg-red-500/5'
                        )}
                      >
                        {simulationVerification.status === 'pass' ? (
                          <CheckCircle className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-400" />
                        )}
                        <AlertTitle
                          className={cn(
                            'text-xs',
                            simulationVerification.status === 'pass'
                              ? 'text-emerald-400'
                              : 'text-red-400'
                          )}
                        >
                          {simulationVerification.status === 'pass' ? '验证通过' : '验证失败'}
                        </AlertTitle>
                        <AlertDescription className="text-[10px] text-slate-400">
                          {simulationVerification.details}
                        </AlertDescription>
                      </Alert>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </TabsContent>

            {/* ====== VERIFY TAB ====== */}
            <TabsContent value="verify" className="space-y-4 mt-3">
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium">
                  <Calculator className="w-3.5 h-3.5 text-violet-400" />
                  分账守恒验证
                </div>
                <p className="text-[10px] text-slate-500">
                  验证 humanBps + avatarBps + protocolBps = 10000 且金额守恒
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400">总金额 (totalAmount)</label>
                  <Input
                    value={splitTotalAmount}
                    onChange={(e) => setSplitTotalAmount(e.target.value)}
                    className="h-8 text-xs bg-slate-900/60 border-slate-700 text-slate-200 font-mono"
                    placeholder="100"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400">人类份额 (humanBps)</label>
                  <Input
                    value={splitHumanBps}
                    onChange={(e) => setSplitHumanBps(e.target.value)}
                    className="h-8 text-xs bg-slate-900/60 border-slate-700 text-slate-200 font-mono"
                    placeholder="7000"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400">分身份额 (avatarBps)</label>
                  <Input
                    value={splitAvatarBps}
                    onChange={(e) => setSplitAvatarBps(e.target.value)}
                    className="h-8 text-xs bg-slate-900/60 border-slate-700 text-slate-200 font-mono"
                    placeholder="2000"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400">协议份额 (protocolBps)</label>
                  <Input
                    value={splitProtocolBps}
                    onChange={(e) => setSplitProtocolBps(e.target.value)}
                    className="h-8 text-xs bg-slate-900/60 border-slate-700 text-slate-200 font-mono"
                    placeholder="1000"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={handleVerifySplit}
                  className="bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white text-xs h-9 px-4"
                >
                  <Calculator className="w-3.5 h-3.5 mr-1.5" />
                  验证守恒
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-slate-600 text-slate-300 hover:bg-slate-700 text-xs h-9"
                  onClick={() => {
                    setSplitTotalAmount('100');
                    setSplitHumanBps('7000');
                    setSplitAvatarBps('2000');
                    setSplitProtocolBps('1000');
                    setSplitVerificationResult(null);
                  }}
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  重置默认
                </Button>
              </div>

              {/* Formula display */}
              <div className="rounded-md border border-slate-700/50 bg-slate-900/40 p-2.5">
                <div className="text-[10px] text-slate-400 font-medium mb-1">验证公式</div>
                <code className="text-[11px] text-violet-300 font-mono block">
                  totalAmount × (humanBps + avatarBps + protocolBps) / 10000 = totalAmount
                </code>
                <div className="mt-1.5 flex items-center gap-2 text-[10px]">
                  <span className="text-slate-500">约束:</span>
                  <code className="text-amber-300 font-mono">humanBps + avatarBps + protocolBps === 10000</code>
                </div>
              </div>

              {/* Verification Result */}
              <AnimatePresence mode="wait">
                {splitVerificationResult && (
                  <motion.div
                    key="split-verify"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-3"
                  >
                    <Alert
                      className={cn(
                        'py-2',
                        splitVerificationResult.status === 'pass'
                          ? 'border-emerald-500/30 bg-emerald-500/5'
                          : 'border-red-500/30 bg-red-500/5'
                      )}
                    >
                      {splitVerificationResult.status === 'pass' ? (
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-400" />
                      )}
                      <AlertTitle
                        className={cn(
                          'text-xs',
                          splitVerificationResult.status === 'pass'
                            ? 'text-emerald-400'
                            : 'text-red-400'
                        )}
                      >
                        {splitVerificationResult.status === 'pass' ? '验证通过 ✓' : '验证失败 ✗'}
                      </AlertTitle>
                      <AlertDescription className="text-[10px] text-slate-400">
                        {splitVerificationResult.details}
                      </AlertDescription>
                    </Alert>

                    {/* Calculated amounts */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div className="rounded-md border border-blue-500/20 bg-blue-500/5 p-2.5">
                        <div className="text-[10px] text-blue-400">人类份额</div>
                        <p className="text-sm font-mono text-blue-300">${splitVerificationResult.calculated.humanAmount.toFixed(4)}</p>
                        <p className="text-[10px] text-slate-500">{splitHumanBps} bps</p>
                      </div>
                      <div className="rounded-md border border-emerald-500/20 bg-emerald-500/5 p-2.5">
                        <div className="text-[10px] text-emerald-400">分身份额</div>
                        <p className="text-sm font-mono text-emerald-300">${splitVerificationResult.calculated.avatarAmount.toFixed(4)}</p>
                        <p className="text-[10px] text-slate-500">{splitAvatarBps} bps</p>
                      </div>
                      <div className="rounded-md border border-amber-500/20 bg-amber-500/5 p-2.5">
                        <div className="text-[10px] text-amber-400">协议份额</div>
                        <p className="text-sm font-mono text-amber-300">${splitVerificationResult.calculated.protocolAmount.toFixed(4)}</p>
                        <p className="text-[10px] text-slate-500">{splitProtocolBps} bps</p>
                      </div>
                    </div>

                    {/* Total check */}
                    <div className="flex items-center justify-between rounded-md border border-slate-700/50 bg-slate-900/40 p-2.5">
                      <span className="text-[10px] text-slate-400">BPS总和</span>
                      <span
                        className={cn(
                          'text-xs font-mono',
                          splitVerificationResult.calculated.totalBps === 10000
                            ? 'text-emerald-400'
                            : 'text-red-400'
                        )}
                      >
                        {splitVerificationResult.calculated.totalBps} / 10000
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </TabsContent>

            {/* ====== HISTORY TAB ====== */}
            <TabsContent value="history" className="space-y-3 mt-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-medium">
                  模拟历史 ({history.length})
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px] text-slate-500 hover:text-slate-300 px-2"
                  onClick={() => setHistory([])}
                >
                  清空
                </Button>
              </div>

              <div className="max-h-80 overflow-y-auto space-y-2 custom-scrollbar">
                {history.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-xs">
                    暂无模拟记录
                  </div>
                ) : (
                  history.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center gap-3 rounded-md border border-slate-700/50 bg-slate-900/40 px-3 py-2 hover:bg-slate-800/60 transition-colors"
                    >
                      <div className="shrink-0">
                        {item.result === 'SUCCESS' ? (
                          <CheckCircle className="w-4 h-4 text-emerald-400" />
                        ) : item.result.includes('REJECTED') || item.result.includes('FAIL') ? (
                          <XCircle className="w-4 h-4 text-red-400" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-amber-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-slate-200 font-mono">{item.contract}</span>
                          <ChevronRight className="w-3 h-3 text-slate-600" />
                          <span className="text-xs text-violet-300 font-mono">{item.function}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {Object.entries(item.params).map(([k, v]) => `${k}=${v}`).join(', ')}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[9px] px-1.5 py-0',
                            item.result === 'SUCCESS'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : item.result.includes('REJECTED') || item.result.includes('FAIL')
                                ? 'bg-red-500/10 text-red-400 border-red-500/30'
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          )}
                        >
                          {item.result}
                        </Badge>
                        <div className="text-[9px] text-slate-600 mt-0.5 font-mono">
                          {item.gasUsed.toLocaleString()} gas
                        </div>
                        <div className="text-[9px] text-slate-600" suppressHydrationWarning>
                          {formatTimestamp(item.timestamp)}
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </motion.div>
  );
}
