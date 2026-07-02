'use client';

// ===== Web3 Wallet Dashboard — Full-featured Web3 Panel =====

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet,
  FileCode,
  Clock,
  Fuel,
  Copy,
  ExternalLink,
  CheckCircle,
  XCircle,
  ArrowRight,
  Activity,
  Coins,
  Shield,
  Unplug,
  Play,
  RefreshCw,
  Link2,
  Radio,
  Zap,
  ChevronRight,
  AlertTriangle,
  Eye,
  Fuel as GasPump,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { cn } from '@/lib/utils';
import {
  useWallet,
  useNetworkInfo,
  useAvatarNFT,
  useDynamicSplitter,
  useCircuitGuard,
  useTokenVault,
  useGasEstimate,
} from '@/hooks/use-web3';
import {
  CONTRACT_ADDRESSES,
  CONTRACT_ABIS,
  GAS_CONSTANTS,
  getBlockExplorerUrl,
} from '@/lib/web3-config';
import type { ContractName } from '@/lib/web3-config';
import { useI18n } from '@/hooks/use-i18n';
import type { TranslateFn } from '@/hooks/use-i18n';

// ── Types ──────────────────────────────────────────────

interface WalletConnectionData {
  wallet: string;
  status: 'connected' | 'available';
  address: string;
  chainId: number;
  chainName: string;
  balance: string;
  balanceUsd: string;
  lastConnected: string;
}

interface ContractInteractionData {
  contract: string;
  function: string;
  status: 'available' | 'restricted';
  gasEstimate: string;
  gasCost: string;
  lastCalled: string;
  calls24h: number;
}

interface TransactionData {
  id: string;
  type: 'contract_call' | 'token_transfer';
  contract: string;
  function: string;
  hash: string;
  status: 'confirmed' | 'pending' | 'failed';
  gasUsed: number;
  gasCost: string;
  blockNumber: number;
  timestamp: string;
}

interface GasPrices {
  slow: string;
  standard: string;
  fast: string;
  instant: string;
}

interface GasHistoryPoint {
  date: string;
  base: number;
  ethereum: number;
  arbitrum: number;
}

interface Web3IntegrationData {
  walletConnections: WalletConnectionData[];
  contractInteractions: ContractInteractionData[];
  eventSubscriptions: {
    event: string;
    contract: string;
    status: 'subscribed' | 'unsubscribed';
    events24h: number;
    lastEvent: string;
  }[];
  transactionHistory: TransactionData[];
  wagmiConfig: {
    chains: { id: number; name: string; status: string; rpcUrl: string; blockExplorer: string; nativeCurrency: string }[];
    connectors: string[];
    autoConnect: boolean;
    pollingInterval: number;
  };
  gasTracker: {
    base: GasPrices;
    ethereum: GasPrices;
    arbitrum: GasPrices;
    gasHistory: GasHistoryPoint[];
  };
}

// ── Color Config ───────────────────────────────────────
const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  connected: { bg: 'bg-emerald-500/15', text: 'text-emerald-300', border: 'border-emerald-500/30' },
  available: { bg: 'bg-slate-600/20', text: 'text-slate-300', border: 'border-slate-600/30' },
  restricted: { bg: 'bg-amber-500/15', text: 'text-amber-300', border: 'border-amber-500/30' },
  confirmed: { bg: 'bg-emerald-500/15', text: 'text-emerald-300', border: 'border-emerald-500/30' },
  pending: { bg: 'bg-amber-500/15', text: 'text-amber-300', border: 'border-amber-500/30' },
  failed: { bg: 'bg-red-500/15', text: 'text-red-300', border: 'border-red-500/30' },
};

const TX_TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  contract_call: { bg: 'bg-violet-500/15', text: 'text-violet-300', border: 'border-violet-500/30' },
  token_transfer: { bg: 'bg-emerald-500/15', text: 'text-emerald-300', border: 'border-emerald-500/30' },
};

const CHAIN_COLORS: Record<string, string> = {
  base: '#0052FF',
  ethereum: '#627EEA',
  arbitrum: '#28A0F0',
};

const GAS_TIER_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  slow: { bg: 'bg-emerald-500/10', text: 'text-emerald-300', border: 'border-emerald-500/20' },
  standard: { bg: 'bg-emerald-500/15', text: 'text-emerald-300', border: 'border-emerald-500/30' },
  fast: { bg: 'bg-amber-500/15', text: 'text-amber-300', border: 'border-amber-500/30' },
  instant: { bg: 'bg-red-500/15', text: 'text-red-300', border: 'border-red-500/30' },
};

// ── Contract Selector Config ───────────────────────────
const CONTRACTS_LIST = [
  { key: 'avatarCore' as ContractName, name: 'AvatarCore', color: 'violet', descKey: 'descAvatarCore' },
  { key: 'dynamicSplitter' as ContractName, name: 'DynamicSplitter', color: 'emerald', descKey: 'descDynamicSplitter' },
  { key: 'circuitGuard' as ContractName, name: 'CircuitGuard', color: 'amber', descKey: 'descCircuitGuard' },
  { key: 'tokenVault' as ContractName, name: 'TokenVault', color: 'blue', descKey: 'descTokenVault' },
  { key: 'skillVault' as ContractName, name: 'SkillVault', color: 'cyan', descKey: 'descSkillVault' },
  { key: 'ifdRouter' as ContractName, name: 'IFDRouter', color: 'rose', descKey: 'descIfdRouter' },
  { key: 'governanceToken' as ContractName, name: 'GovToken', color: 'orange', descKey: 'descGovernance' },
  { key: 'poueVerifier' as ContractName, name: 'PoUEVerifier', color: 'teal', descKey: 'descAfcToken' },
];

// ── Helpers ────────────────────────────────────────────
function getRelativeTime(iso: string, t: TranslateFn): string {
  if (!iso) return '--';
  const now = new Date('2026-03-10T15:00:00Z');
  const then = new Date(iso);
  const diffMs = now.getTime() - then.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 60) return t('web3.minutesAgo', { count: diffMin });
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return t('web3.hoursAgo', { count: diffHr });
  const diffDay = Math.floor(diffHr / 24);
  return t('web3.daysAgo', { count: diffDay });
}

function truncateAddr(addr: string): string {
  if (!addr || addr.length < 12) return addr;
  return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
}

// ── Copy Button ────────────────────────────────────────
function CopyBtn({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const { t } = useI18n();
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className={cn(
        'shrink-0 flex items-center justify-center rounded-md p-1 transition-colors',
        copied ? 'bg-emerald-500/20' : 'bg-slate-700/50 hover:bg-slate-600/50',
        className,
      )}
      aria-label={t('web3.copy')}
    >
      {copied ? (
        <CheckCircle className="size-3.5 text-emerald-400" />
      ) : (
        <Copy className="size-3.5 text-slate-400" />
      )}
    </button>
  );
}

// ── Gas History Tooltip ────────────────────────────────
function GasHistoryTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string; color: string }>; label?: string }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-xs shadow-xl">
      <p className="text-slate-300 font-medium mb-1">03-{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="tabular-nums" style={{ color: entry.color }}>
          {entry.dataKey === 'base' ? 'Base' : entry.dataKey === 'ethereum' ? 'Ethereum' : 'Arbitrum'}: {entry.value} Gwei
        </p>
      ))}
    </div>
  );
}

// ── Tab 1: Wallet ─────────────────────────────────────
function WalletTab({ data }: { data: Web3IntegrationData }) {
  const { t } = useI18n();
  const walletState = useWallet();
  const networkInfo = useNetworkInfo();
  const connected = data.walletConnections.filter((w) => w.status === 'connected');
  const available = data.walletConnections.filter((w) => w.status === 'available');

  return (
    <div className="space-y-5">
      {/* Live Wallet State from Hooks */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-3">
          <p className="text-[10px] text-slate-500 mb-1">{t('web3.connectionStatus')}</p>
          <div className="flex items-center gap-1.5">
            <div className={cn(
              'w-2 h-2 rounded-full',
              walletState.isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600',
            )} />
            <span className={cn(
              'text-xs font-medium',
              walletState.isConnected ? 'text-emerald-300' : 'text-slate-400',
            )}>
              {walletState.isConnected ? t('web3.connected') : t('web3.notConnected')}
            </span>
          </div>
        </div>
        <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-3">
          <p className="text-[10px] text-slate-500 mb-1">{t('web3.network')}</p>
          <span className="text-xs font-medium text-slate-200">{walletState.chainName || networkInfo.chainName}</span>
          <p className="text-[10px] text-slate-500 font-mono">ID: {walletState.chainId || networkInfo.chainId}</p>
        </div>
        <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-3">
          <p className="text-[10px] text-slate-500 mb-1">{t('web3.balance')}</p>
          <span className="text-xs font-medium text-emerald-300 font-mono">
            {walletState.balance || '--'}
          </span>
          <p className="text-[10px] text-slate-500">{walletState.balanceUsd || '--'}</p>
        </div>
        <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-3">
          <p className="text-[10px] text-slate-500 mb-1">{t('web3.blockHeight')}</p>
          <span className="text-xs font-medium text-violet-300 font-mono tabular-nums">
            #{networkInfo.blockNumber > 0 ? networkInfo.blockNumber.toLocaleString() : '--'}
          </span>
          <p className="text-[10px] text-slate-500">Gas: {networkInfo.gasPrice} Gwei</p>
        </div>
      </div>

      {/* Connected Wallets Detail */}
      {connected.map((wallet, idx) => (
        <motion.div
          key={wallet.wallet}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.1 }}
          className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-100">{wallet.wallet}</span>
                  <Badge variant="outline" className={cn('text-[9px]', STATUS_COLORS.connected.bg, STATUS_COLORS.connected.text, STATUS_COLORS.connected.border)}>
                    {t('web3.connected')}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-xs font-mono text-slate-400">{wallet.address}</code>
                  <CopyBtn text={wallet.address} />
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[10px] border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20 hover:text-red-200"
            >
              <Unplug className="mr-1 size-3" /> {t('web3.disconnectBtn')}
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-lg bg-slate-800/60 p-3">
              <p className="text-[10px] text-slate-500 mb-0.5">{t('web3.chain')}</p>
              <p className="text-xs font-medium text-slate-200">{wallet.chainName}</p>
              <p className="text-[10px] text-slate-500 font-mono">Chain ID: {wallet.chainId}</p>
            </div>
            <div className="rounded-lg bg-slate-800/60 p-3">
              <p className="text-[10px] text-slate-500 mb-0.5">{t('web3.balance')}</p>
              <p className="text-xs font-medium text-emerald-300">{wallet.balance}</p>
              <p className="text-[10px] text-slate-500">{wallet.balanceUsd}</p>
            </div>
            <div className="rounded-lg bg-slate-800/60 p-3">
              <p className="text-[10px] text-slate-500 mb-0.5">{t('web3.lastConnected')}</p>
              <p className="text-xs font-medium text-slate-200">{getRelativeTime(wallet.lastConnected, t)}</p>
            </div>
            <div className="rounded-lg bg-slate-800/60 p-3">
              <p className="text-[10px] text-slate-500 mb-0.5">{t('web3.status')}</p>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <p className="text-xs font-medium text-emerald-300">{t('web3.online')}</p>
              </div>
            </div>
          </div>
        </motion.div>
      ))}

      {/* Available Wallets */}
      <div>
        <h4 className="text-xs font-semibold text-slate-300 mb-3 flex items-center gap-2">
          <Link2 className="w-3.5 h-3.5 text-slate-500" />
          {t('web3.availableWallets')}
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {available.map((wallet, idx) => (
            <motion.div
              key={wallet.wallet}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + idx * 0.05 }}
              className="rounded-xl border border-slate-700 bg-slate-800/60 p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-700/50 flex items-center justify-center">
                  <Wallet className="w-4 h-4 text-slate-400" />
                </div>
                <div>
                  <span className="text-sm text-slate-200">{wallet.wallet}</span>
                  <Badge variant="outline" className={cn('ml-2 text-[9px]', STATUS_COLORS.available.bg, STATUS_COLORS.available.text, STATUS_COLORS.available.border)}>
                    {t('web3.available')}
                  </Badge>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-[10px] border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 hover:text-emerald-200"
              >
                <Link2 className="mr-1 size-3" /> {t('web3.connect')}
              </Button>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Wagmi Config */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-violet-400" />
          <h4 className="text-xs font-semibold text-slate-200">{t('web3.wagmiConfig')}</h4>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] text-slate-500 mb-2">{t('web3.supportedChains')}</p>
            <div className="flex flex-wrap gap-1.5">
              {data.wagmiConfig.chains.map((chain) => (
                <Badge
                  key={chain.id}
                  variant="outline"
                  className={cn(
                    'text-[9px]',
                    chain.status === 'active'
                      ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                      : chain.status === 'testnet'
                      ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                      : 'bg-slate-600/20 text-slate-300 border-slate-600/30',
                  )}
                >
                  {chain.name} ({chain.id})
                </Badge>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">{t('web3.connectors')}</span>
              <span className="text-slate-200 font-mono text-[10px]">{data.wagmiConfig.connectors.join(', ')}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">{t('web3.autoConnect')}</span>
              <Badge variant="outline" className={cn('text-[9px]', data.wagmiConfig.autoConnect ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' : 'bg-slate-600/20 text-slate-400 border-slate-600/30')}>
                {data.wagmiConfig.autoConnect ? t('web3.enabled') : t('web3.notEnabled')}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">{t('web3.pollingInterval')}</span>
              <span className="text-slate-200 font-mono">{(data.wagmiConfig.pollingInterval / 1000).toFixed(1)}s</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Tab 2: Contracts ──────────────────────────────────
function ContractsTab({ data }: { data: Web3IntegrationData }) {
  const { t } = useI18n();
  const [selectedContract, setSelectedContract] = useState<ContractName>('avatarCore');
  const [simulating, setSimulating] = useState(false);
  const [simResult, setSimResult] = useState<Record<string, unknown> | null>(null);

  const contractInfo = useMemo(() => {
    const entry = CONTRACTS_LIST.find((c) => c.key === selectedContract);
    return entry || CONTRACTS_LIST[0];
  }, [selectedContract]);

  const abi = CONTRACT_ABIS[selectedContract];
  const address = CONTRACT_ADDRESSES[selectedContract];
  const gasEst = useGasEstimate(abi, address, 'getAvatarProfile');

  const readFunctions = useMemo(() => {
    if (!abi) return [];
    return abi.filter((item): item is Extract<typeof item, { type: 'function'; name: string }> =>
      item.type === 'function' && item.stateMutability === 'view'
    );
  }, [abi]);

  const writeFunctions = useMemo(() => {
    if (!abi) return [];
    return abi.filter((item): item is Extract<typeof item, { type: 'function'; name: string }> =>
      item.type === 'function' && item.stateMutability === 'nonpayable'
    );
  }, [abi]);

  const handleSimulate = useCallback(() => {
    setSimulating(true);
    setTimeout(() => {
      // Deterministic mock simulation result
      const results: Record<string, Record<string, unknown>> = {
        avatarCore: { soulId: 'soul-001', owner: '0x7a3f...b2c1', resonanceScore: 82, circuitState: 0, isFrozen: false },
        dynamicSplitter: { humanBps: 7000, avatarBps: 2000, protocolBps: 1000, lastUpdated: 1710072000 },
        circuitGuard: { circuitState: 0, stateName: 'NORMAL' },
        tokenVault: { balance: '1,250.45 AFC', stakingInfo: { totalStaked: 500000, apy: 12, stakers: 1280 } },
        skillVault: { unlocked: true, tier: 2 },
        ifdRouter: { delegated: true, weight: 100 },
        governance: { proposalCount: 7, quorum: 4 },
        governanceToken: { balance: '10,000 BBGOV', allowance: '5,000 BBGOV' },
      };
      setSimResult(results[selectedContract] || { success: true });
      setSimulating(false);
    }, 800);
  }, [selectedContract]);

  return (
    <div className="space-y-5">
      {/* Contract Selector */}
      <div className="flex flex-wrap gap-2">
        {CONTRACTS_LIST.map((c) => (
          <button
            key={c.key}
            onClick={() => { setSelectedContract(c.key); setSimResult(null); }}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all border',
              selectedContract === c.key
                ? 'bg-violet-500/15 text-violet-300 border-violet-500/30'
                : 'bg-slate-800/60 text-slate-400 border-slate-700/50 hover:bg-slate-700/50 hover:text-slate-200',
            )}
          >
            <FileCode className="w-3 h-3" />
            {c.name}
          </button>
        ))}
      </div>

      {/* Contract Detail */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-100">{contractInfo.name}</span>
              <Badge variant="outline" className={cn(
                'text-[9px]',
                contractInfo.color === 'violet' && 'bg-violet-500/10 text-violet-300 border-violet-500/20',
                contractInfo.color === 'emerald' && 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
                contractInfo.color === 'amber' && 'bg-amber-500/10 text-amber-300 border-amber-500/20',
                contractInfo.color === 'blue' && 'bg-blue-500/10 text-blue-300 border-blue-500/20',
              )}>
                {t(`web3.${contractInfo.descKey}`)}
              </Badge>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <code className="text-[11px] font-mono text-slate-400">{truncateAddr(address)}</code>
              <CopyBtn text={address} />
              <button
                onClick={() => window.open(getBlockExplorerUrl(8453, 'address', address), '_blank')}
                className="p-1 rounded hover:bg-slate-700 transition-colors"
                aria-label={t('web3.viewInExplorer')}
              >
                <ExternalLink className="w-3 h-3 text-slate-500" />
              </button>
            </div>
          </div>
        </div>

        <Separator className="bg-slate-700/50 my-3" />

        {/* Read Functions */}
        {readFunctions.length > 0 && (
          <div className="mb-4">
            <h5 className="text-[10px] text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Eye className="w-3 h-3" /> {t('web3.readFunctions')}
            </h5>
            <div className="space-y-1.5">
              {readFunctions.map((fn, idx) => (
                <div key={idx} className="flex items-center justify-between rounded-lg bg-slate-900/50 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[8px] bg-emerald-500/10 text-emerald-300 border-emerald-500/20">view</Badge>
                    <code className="text-xs font-mono text-slate-200">{fn.name}</code>
                    <span className="text-[10px] text-slate-500">
                      ({(fn as any).inputs?.map((i: any) => `${i.name}: ${i.type}`).join(', ') || ''})
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Write Functions */}
        {writeFunctions.length > 0 && (
          <div className="mb-4">
            <h5 className="text-[10px] text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Zap className="w-3 h-3" /> {t('web3.writeFunctions')}
            </h5>
            <div className="space-y-1.5">
              {writeFunctions.map((fn, idx) => (
                <div key={idx} className="flex items-center justify-between rounded-lg bg-slate-900/50 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[8px] bg-amber-500/10 text-amber-300 border-amber-500/20">write</Badge>
                    <code className="text-xs font-mono text-slate-200">{fn.name}</code>
                    <span className="text-[10px] text-slate-500">
                      ({(fn as any).inputs?.map((i: any) => `${i.name}: ${i.type}`).join(', ') || ''})
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Simulate Button + Result */}
        <div className="mt-4">
          <Button
            onClick={handleSimulate}
            disabled={simulating}
            className={cn(
              'h-9 text-xs gap-2 rounded-lg',
              'bg-violet-600 hover:bg-violet-500 text-white',
              simulating && 'opacity-60 cursor-wait',
            )}
          >
            {simulating ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
            {simulating ? t('web3.simulating') : t('web3.executeSimRead')}
          </Button>
            {simResult && (
              <motion.div
                initial={{ opacity: 0, y: 8, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                className="mt-3"
              >
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-medium text-emerald-300">{t('web3.simResult')}</span>
                  </div>
                  <pre className="text-[11px] font-mono text-slate-300 whitespace-pre-wrap overflow-x-auto">
                    {JSON.stringify(simResult, null, 2)}
                  </pre>
                </div>
              </motion.div>
            )}
        </div>

        {/* Gas Estimate */}
        <div className="mt-4 rounded-lg border border-slate-700/50 bg-slate-900/40 p-3">
          <div className="flex items-center gap-2 mb-2">
            <GasPump className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[11px] font-medium text-slate-300">{t('web3.gasEstimateLabel')}</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-[9px] text-slate-500">{t('web3.gasUnits')}</p>
              <p className="text-xs font-mono text-slate-200 tabular-nums">{gasEst.gasUnits > 0 ? gasEst.gasUnits.toLocaleString() : '--'}</p>
            </div>
            <div>
              <p className="text-[9px] text-slate-500">{t('web3.ethCost')}</p>
              <p className="text-xs font-mono text-slate-200">{gasEst.costEth || '--'}</p>
            </div>
            <div>
              <p className="text-[9px] text-slate-500">{t('web3.usdCost')}</p>
              <p className="text-xs font-mono text-emerald-300">{gasEst.costUsd || '--'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Contract Interactions Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-3 text-center">
          <p className="text-xl font-bold text-slate-200 tabular-nums">{data.contractInteractions.length}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">{t('web3.totalFunctions')}</p>
        </div>
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-center">
          <p className="text-xl font-bold text-emerald-400 tabular-nums">{data.contractInteractions.filter((i) => i.status === 'available').length}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">{t('web3.available')}</p>
        </div>
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-center">
          <p className="text-xl font-bold text-amber-400 tabular-nums">{data.contractInteractions.filter((i) => i.status === 'restricted').length}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">{t('web3.restricted')}</p>
        </div>
      </div>
    </div>
  );
}

// ── Tab 3: Transactions ────────────────────────────────
function TransactionsTab({ data }: { data: Web3IntegrationData }) {
  const { t } = useI18n();
  const txHistory = data.transactionHistory;
  const confirmed = txHistory.filter((tx) => tx.status === 'confirmed').length;
  const pending = txHistory.filter((tx) => tx.status === 'pending').length;
  const totalGas = txHistory.reduce((sum, tx) => sum + tx.gasUsed, 0);

  return (
    <div className="space-y-5">
      {/* Transaction Stats */}
      <div className="grid grid-cols-4 gap-3">
        <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-3 text-center">
          <p className="text-xl font-bold text-slate-200 tabular-nums">{txHistory.length}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">{t('web3.totalTx')}</p>
        </div>
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-center">
          <p className="text-xl font-bold text-emerald-400 tabular-nums">{confirmed}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">{t('web3.confirmed')}</p>
        </div>
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-center">
          <p className="text-xl font-bold text-amber-400 tabular-nums">{pending}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">{t('web3.pending')}</p>
        </div>
        <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-3 text-center">
          <p className="text-xl font-bold text-violet-400 tabular-nums">{totalGas > 0 ? (totalGas / 1000).toFixed(1) + 'K' : '--'}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">{t('web3.totalGas')}</p>
        </div>
      </div>

      {/* Transaction List */}
      <ScrollArea className="max-h-96">
        <div className="space-y-2 pr-2">
          {txHistory.map((tx, idx) => {
            const typeConf = TX_TYPE_COLORS[tx.type] || TX_TYPE_COLORS.contract_call;
            const statusConf = STATUS_COLORS[tx.status] || STATUS_COLORS.confirmed;
            return (
              <motion.div
                key={tx.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.06 }}
                className="rounded-lg border border-slate-700/50 bg-slate-800/40 p-3"
              >
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge variant="outline" className={cn('shrink-0 text-[9px] font-mono', typeConf.bg, typeConf.text, typeConf.border)}>
                      {tx.type === 'contract_call' ? t('web3.contractCall') : t('web3.tokenTransfer')}
                    </Badge>
                    <span className="text-xs text-slate-300 font-mono">{tx.contract}</span>
                    <ArrowRight className="size-3 text-slate-600 shrink-0" />
                    <code className="text-xs font-mono text-slate-200">{tx.function}</code>
                  </div>
                  <Badge variant="outline" className={cn('shrink-0 text-[9px]', statusConf.bg, statusConf.text, statusConf.border)}>
                    {tx.status === 'confirmed' ? t('web3.confirmed') : tx.status === 'pending' ? t('web3.pending') : t('web3.failed')}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px]">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500">txHash:</span>
                    <code className="text-slate-400 font-mono">{truncateAddr(tx.hash)}</code>
                    <CopyBtn text={tx.hash} className="p-0.5" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Fuel className="size-3 text-amber-400" />
                    <span className="text-slate-500">Gas:</span>
                    <span className="text-slate-200 font-mono tabular-nums">{tx.gasUsed > 0 ? tx.gasUsed.toLocaleString() : '--'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Coins className="size-3 text-emerald-400" />
                    <span className="text-slate-500">{t('web3.cost')}:</span>
                    <span className="text-emerald-300 font-mono">{tx.gasCost}</span>
                  </div>
                  {tx.blockNumber > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500">{t('web3.block')}:</span>
                      <span className="text-slate-300 font-mono tabular-nums">{tx.blockNumber.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <Clock className="size-3 text-slate-400" />
                    <span className="text-slate-300">{getRelativeTime(tx.timestamp, t)}</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Event Subscriptions Summary */}
      <div>
        <h4 className="text-xs font-semibold text-slate-300 mb-3 flex items-center gap-2">
          <Radio className="w-3.5 h-3.5 text-emerald-400" />
          {t('web3.eventSubscription')}
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-center">
            <p className="text-xl font-bold text-emerald-400 tabular-nums">{data.eventSubscriptions.filter((s) => s.status === 'subscribed').length}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">{t('web3.activeSubs')}</p>
          </div>
          <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-3 text-center">
            <p className="text-xl font-bold text-violet-400 tabular-nums">{data.eventSubscriptions.reduce((sum, s) => sum + s.events24h, 0).toLocaleString()}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">{t('web3.events24h')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Tab 4: Gas Tracker ────────────────────────────────
function GasTrackerTab({ data }: { data: Web3IntegrationData }) {
  const { t } = useI18n();
  const gasData = data.gasTracker;
  const networkInfo = useNetworkInfo();
  const [estimateFn, setEstimateFn] = useState('executeSplit');
  const [estimateAmount, setEstimateAmount] = useState('100');

  const chainGasEntries = [
    { name: 'Base', key: 'base' as const, data: gasData.base, color: CHAIN_COLORS.base },
    { name: 'Ethereum', key: 'ethereum' as const, data: gasData.ethereum, color: CHAIN_COLORS.ethereum },
    { name: 'Arbitrum', key: 'arbitrum' as const, data: gasData.arbitrum, color: CHAIN_COLORS.arbitrum },
  ];

  // Gas estimation calculation
  const gasMap: Record<string, number> = {
    createAvatar: 185000,
    updateCognitionRoot: 45000,
    executeSplit: 92000,
    evaluateState: 38000,
    deposit: 75000,
    withdraw: 68000,
    unlockSkill: 45000,
    delegateVote: 55000,
  };
  const estimatedGas = gasMap[estimateFn] || 50000;
  const estimatedCostEth = (estimatedGas * Number(GAS_CONSTANTS.baseL2GasPrice)).toFixed(6);
  const estimatedCostUsd = `$${(estimatedGas * Number(GAS_CONSTANTS.baseL2GasPrice)).toFixed(4)}`;

  return (
    <div className="space-y-5">
      {/* Current Gas Prices */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {chainGasEntries.map((chain) => (
          <motion.div
            key={chain.name}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-slate-700 bg-slate-800/60 p-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: chain.color }} />
              <h4 className="text-xs font-semibold text-slate-200">{chain.name}</h4>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(['slow', 'standard', 'fast', 'instant'] as const).map((tier) => {
                const tierConf = GAS_TIER_COLORS[tier];
                const value = chain.data[tier];
                const tierLabelKey = tier === 'slow' ? 'gasSlow' : tier === 'standard' ? 'gasStandard' : tier === 'fast' ? 'gasFast' : 'gasInstant';
                return (
                  <div key={tier} className="rounded-md p-2 text-center" style={{ background: 'rgba(30,41,59,0.6)' }}>
                    <p className={cn('text-[9px] font-medium mb-0.5', tierConf.text)}>
                      {t(`web3.${tierLabelKey}`)}
                    </p>
                    <p className="text-xs font-mono font-bold text-slate-200">{value} <span className="text-[9px] text-slate-500">Gwei</span></p>
                  </div>
                );
              })}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Gas History Chart */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Fuel className="w-4 h-4 text-amber-400" />
          <h4 className="text-xs font-semibold text-slate-200">{t('web3.gas7dTrend')}</h4>
        </div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={gasData.gasHistory} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={{ stroke: '#334155' }} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={{ stroke: '#334155' }} tickLine={false} />
              <Tooltip content={<GasHistoryTooltip />} />
              <Line type="monotone" dataKey="base" stroke={CHAIN_COLORS.base} strokeWidth={2} dot={{ fill: CHAIN_COLORS.base, r: 3 }} name="Base" />
              <Line type="monotone" dataKey="ethereum" stroke={CHAIN_COLORS.ethereum} strokeWidth={2} dot={{ fill: CHAIN_COLORS.ethereum, r: 3 }} name="Ethereum" />
              <Line type="monotone" dataKey="arbitrum" stroke={CHAIN_COLORS.arbitrum} strokeWidth={2} dot={{ fill: CHAIN_COLORS.arbitrum, r: 3 }} name="Arbitrum" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center gap-6 mt-2 text-[10px]">
          {chainGasEntries.map((chain) => (
            <div key={chain.name} className="flex items-center gap-1.5">
              <div className="size-2.5 rounded-full" style={{ backgroundColor: chain.color }} />
              <span className="text-slate-400">{chain.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Gas Estimation Tool */}
      <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-4 h-4 text-violet-400" />
          <h4 className="text-xs font-semibold text-slate-200">{t('web3.gasEstTool')}</h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-[10px] text-slate-500 mb-1 block">{t('web3.selectFunction')}</label>
            <select
              value={estimateFn}
              onChange={(e) => setEstimateFn(e.target.value)}
              className="w-full h-9 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-200 px-3 focus:outline-none focus:border-violet-500/50"
            >
              <option value="createAvatar">createAvatar</option>
              <option value="updateCognitionRoot">updateCognitionRoot</option>
              <option value="executeSplit">executeSplit</option>
              <option value="evaluateState">evaluateState</option>
              <option value="deposit">deposit</option>
              <option value="withdraw">withdraw</option>
              <option value="unlockSkill">unlockSkill</option>
              <option value="delegateVote">delegateVote</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] text-slate-500 mb-1 block">{t('web3.amountAfc')}</label>
            <Input
              value={estimateAmount}
              onChange={(e) => setEstimateAmount(e.target.value)}
              className="h-9 text-xs bg-slate-800 border-slate-700 text-slate-200"
              placeholder="100"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-slate-800/80 p-3 text-center">
            <p className="text-[9px] text-slate-500 mb-1">{t('web3.estimatedGas')}</p>
            <p className="text-sm font-bold text-amber-300 font-mono tabular-nums">{estimatedGas.toLocaleString()}</p>
            <p className="text-[9px] text-slate-500">gas units</p>
          </div>
          <div className="rounded-lg bg-slate-800/80 p-3 text-center">
            <p className="text-[9px] text-slate-500 mb-1">{t('web3.ethCostShort')}</p>
            <p className="text-sm font-bold text-slate-200 font-mono">{estimatedCostEth}</p>
            <p className="text-[9px] text-slate-500">ETH</p>
          </div>
          <div className="rounded-lg bg-slate-800/80 p-3 text-center">
            <p className="text-[9px] text-slate-500 mb-1">{t('web3.usdCostShort')}</p>
            <p className="text-sm font-bold text-emerald-300 font-mono">{estimatedCostUsd}</p>
            <p className="text-[9px] text-slate-500">≈ Base L2</p>
          </div>
        </div>

        {/* Live Network Info */}
        <div className="mt-3 flex items-center gap-4 text-[10px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>{t('web3.currentGas')}: {networkInfo.gasPrice} Gwei</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>{t('web3.blockLabel')}: #{networkInfo.blockNumber > 0 ? networkInfo.blockNumber.toLocaleString() : '--'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────
export default function Web3Wallet() {
  const { t } = useI18n();
  const [data, setData] = useState<Web3IntegrationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('wallet');

  useEffect(() => {
    fetch('/api/web3-integration')
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // ── Loading State ──────────────────────────────────
  if (loading || !data) {
    return (
      <Card className="border-slate-700 bg-slate-800/80">
        <CardContent className="p-6 flex items-center justify-center min-h-[300px]">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-3"
          >
            <Wallet className="size-8 text-violet-400 animate-pulse" />
            <p className="text-slate-400 text-sm">{t('web3.walletLoading')}</p>
          </motion.div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="border-slate-700 bg-slate-800/80">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center">
                <Wallet className="w-4.5 h-4.5 text-white" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold text-slate-100">{t('web3.walletTitle')}</CardTitle>
                <p className="text-[11px] text-slate-500 mt-0.5">{t('web3.walletSubtitle')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[9px] bg-emerald-500/10 text-emerald-300 border-emerald-500/20">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1 animate-pulse" />
                Base Mainnet
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-slate-900/50 border border-slate-700/50 h-9 p-0.5">
              <TabsTrigger
                value="wallet"
                className="text-[11px] data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-300 px-3 h-8"
              >
                <Wallet className="mr-1.5 size-3.5" />
                {t('web3.walletTab')}
              </TabsTrigger>
              <TabsTrigger
                value="contracts"
                className="text-[11px] data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-300 px-3 h-8"
              >
                <FileCode className="mr-1.5 size-3.5" />
                {t('web3.contractsTab')}
              </TabsTrigger>
              <TabsTrigger
                value="transactions"
                className="text-[11px] data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-300 px-3 h-8"
              >
                <Clock className="mr-1.5 size-3.5" />
                {t('web3.txTab')}
              </TabsTrigger>
              <TabsTrigger
                value="gas"
                className="text-[11px] data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-300 px-3 h-8"
              >
                <Fuel className="mr-1.5 size-3.5" />
                {t('web3.gasTab')}
              </TabsTrigger>
            </TabsList>
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="mt-4"
              >
                <TabsContent value="wallet" className="mt-0">
                  <WalletTab data={data} />
                </TabsContent>
                <TabsContent value="contracts" className="mt-0">
                  <ContractsTab data={data} />
                </TabsContent>
                <TabsContent value="transactions" className="mt-0">
                  <TransactionsTab data={data} />
                </TabsContent>
                <TabsContent value="gas" className="mt-0">
                  <GasTrackerTab data={data} />
                </TabsContent>
              </motion.div>
          </Tabs>
        </CardContent>
      </Card>
    </motion.div>
  );
}
