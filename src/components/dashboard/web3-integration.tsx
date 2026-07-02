'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet,
  Link,
  Bell,
  Fuel,
  Copy,
  ExternalLink,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  Shield,
  Unplug,
  Play,
  Ban,
  RefreshCw,
  ArrowRight,
  Activity,
  Coins,
  FileCode,
  Radio,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { cn } from '@/lib/utils';
import { useI18n } from '@/hooks/use-i18n';

// ── Types ──────────────────────────────────────────────
interface WalletConnection {
  wallet: string;
  status: 'connected' | 'available';
  address: string;
  chainId: number;
  chainName: string;
  balance: string;
  balanceUsd: string;
  lastConnected: string;
}

interface ContractInteraction {
  contract: string;
  function: string;
  status: 'available' | 'restricted';
  gasEstimate: string;
  gasCost: string;
  lastCalled: string;
  calls24h: number;
}

interface EventSubscription {
  event: string;
  contract: string;
  status: 'subscribed' | 'unsubscribed';
  events24h: number;
  lastEvent: string;
}

interface TransactionRecord {
  id: string;
  type: 'contract_call' | 'token_transfer';
  contract: string;
  function: string;
  hash: string;
  status: 'confirmed' | 'pending';
  gasUsed: number;
  gasCost: string;
  blockNumber: number;
  timestamp: string;
}

interface WagmiChain {
  id: number;
  name: string;
  status: 'active' | 'testnet' | 'available';
  rpcUrl: string;
  blockExplorer: string;
  nativeCurrency: string;
}

interface WagmiConfig {
  chains: WagmiChain[];
  connectors: string[];
  autoConnect: boolean;
  pollingInterval: number;
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

interface GasTrackerData {
  base: GasPrices;
  ethereum: GasPrices;
  arbitrum: GasPrices;
  gasHistory: GasHistoryPoint[];
}

interface Web3IntegrationData {
  walletConnections: WalletConnection[];
  contractInteractions: ContractInteraction[];
  eventSubscriptions: EventSubscription[];
  transactionHistory: TransactionRecord[];
  wagmiConfig: WagmiConfig;
  gasTracker: GasTrackerData;
}

// ── Mock event log for real-time section ───────────────
const MOCK_EVENT_LOG = [
  { event: 'ResonanceUpdated', contract: 'ECEOracle', data: '{ score: 82, delta: +1.2 }', block: 21456789, time: '2026-03-10T14:30:00Z' },
  { event: 'SplitExecuted', contract: 'DynamicSplitter', data: '{ amount: 150, split: 70/20/10 }', block: 21456788, time: '2026-03-10T14:28:00Z' },
  { event: 'CircuitStateChanged', contract: 'CircuitGuard', data: '{ from: NORMAL, to: NORMAL }', block: 21456787, time: '2026-03-10T14:28:30Z' },
  { event: 'CognitionUpdated', contract: 'AvatarCore', data: '{ root: 0xab12...cd34 }', block: 21456750, time: '2026-03-10T14:20:00Z' },
  { event: 'Staked', contract: 'TokenVault', data: '{ amount: 500 AFC }', block: 21456740, time: '2026-03-10T12:00:00Z' },
];

// ── Color Config ───────────────────────────────────────
const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  connected: { bg: 'bg-emerald-500/15', text: 'text-emerald-300', border: 'border-emerald-500/30' },
  available: { bg: 'bg-slate-600/20', text: 'text-slate-300', border: 'border-slate-600/30' },
  subscribed: { bg: 'bg-emerald-500/15', text: 'text-emerald-300', border: 'border-emerald-500/30' },
  unsubscribed: { bg: 'bg-red-500/15', text: 'text-red-300', border: 'border-red-500/30' },
  restricted: { bg: 'bg-amber-500/15', text: 'text-amber-300', border: 'border-amber-500/30' },
  confirmed: { bg: 'bg-emerald-500/15', text: 'text-emerald-300', border: 'border-emerald-500/30' },
  pending: { bg: 'bg-amber-500/15', text: 'text-amber-300', border: 'border-amber-500/30' },
  active: { bg: 'bg-emerald-500/15', text: 'text-emerald-300', border: 'border-emerald-500/30' },
  testnet: { bg: 'bg-amber-500/15', text: 'text-amber-300', border: 'border-amber-500/30' },
};

const TX_TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  contract_call: { bg: 'bg-blue-500/15', text: 'text-blue-300', border: 'border-blue-500/30' },
  token_transfer: { bg: 'bg-violet-500/15', text: 'text-violet-300', border: 'border-violet-500/30' },
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

// ── Helpers ────────────────────────────────────────────
function getRelativeTime(iso: string): string {
  if (!iso) return '--';
  const now = new Date('2026-03-10T15:00:00Z');
  const then = new Date(iso);
  const diffMs = now.getTime() - then.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  // NOTE: relative time units handled by caller via t() for i18n
  if (diffMin < 60) return `${diffMin}`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}`;
}

// ── Copy Button ────────────────────────────────────────
function CopyButton({ text, className }: { text: string; className?: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

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

// ── Custom Tooltip for Gas History ─────────────────────
function GasHistoryTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string; color: string }>; label?: string }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-xs shadow-xl">
      <p className="text-slate-300 font-medium mb-1">03-{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="tabular-nums" style={{ color: entry.color }}>
          {entry.dataKey === 'base' ? 'Base' : entry.dataKey === 'ethereum' ? 'Ethereum' : 'Arbitrum'}: {entry.value} {entry.dataKey === 'ethereum' ? 'Gwei' : 'Gwei'}
        </p>
      ))}
    </div>
  );
}

// ── Tab 1: Wallet Connection ───────────────────────────
function WalletConnectionTab({ data }: { data: Web3IntegrationData }) {
  const { t } = useI18n();
  const connected = data.walletConnections.filter((w) => w.status === 'connected');
  const available = data.walletConnections.filter((w) => w.status === 'available');

  return (
    <div className="space-y-5">
      {/* Connection Status */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-emerald-300 font-medium">{t('web3.connectedCount')} ({connected.length})</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-700/30 border border-slate-700/50">
          <Wallet className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs text-slate-400">{t('web3.availableWallets')} ({available.length})</span>
        </div>
      </div>

      {/* Connected Wallets */}
      {connected.map((wallet, idx) => (
        <motion.div
          key={wallet.wallet || `connected-${idx}`}
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
                  <CopyButton text={wallet.address} />
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
              <p className="text-xs font-medium text-slate-200">{getRelativeTime(wallet.lastConnected)}</p>
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
          <Wallet className="w-3.5 h-3.5 text-slate-500" />
          {t('web3.availableWallets')}
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {available.map((wallet, idx) => (
            <motion.div
              key={wallet.wallet || `available-${idx}`}
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
                <Link className="mr-1 size-3" /> {t('web3.connect')}
              </Button>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Wagmi Config Summary */}
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

// ── Tab 2: Contract Interaction ────────────────────────
function ContractInteractionTab({ data }: { data: Web3IntegrationData }) {
  const { t } = useI18n();
  const interactions = data.contractInteractions;
  const totalFunctions = interactions.length;
  const availableCount = interactions.filter((i) => i.status === 'available').length;
  const restrictedCount = interactions.filter((i) => i.status === 'restricted').length;

  return (
    <div className="space-y-5">
      {/* Interaction Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-3 text-center">
          <p className="text-xl font-bold text-slate-200 tabular-nums">{totalFunctions}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">{t('web3.totalFunctions')}</p>
        </div>
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-center">
          <p className="text-xl font-bold text-emerald-400 tabular-nums">{availableCount}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">{t('web3.available')}</p>
        </div>
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-center">
          <p className="text-xl font-bold text-amber-400 tabular-nums">{restrictedCount}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">{t('web3.restricted')}</p>
        </div>
      </div>

      {/* Contract Function List */}
      <ScrollArea className="max-h-96">
        <div className="space-y-2 pr-2">
          {interactions.map((item, idx) => (
            <motion.div
              key={`${item.contract}-${item.function}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              className="rounded-lg border border-slate-700/50 bg-slate-800/40 p-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Badge variant="outline" className="shrink-0 text-[9px] bg-violet-500/10 text-violet-300 border-violet-500/20 font-mono">
                    {item.contract}
                  </Badge>
                  <code className="text-xs font-mono text-slate-200 truncate">{item.function}</code>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    'shrink-0 text-[9px]',
                    item.status === 'available'
                      ? `${STATUS_COLORS.available.bg} ${STATUS_COLORS.available.text} ${STATUS_COLORS.available.border}`
                      : `${STATUS_COLORS.restricted.bg} ${STATUS_COLORS.restricted.text} ${STATUS_COLORS.restricted.border}`,
                  )}
                >
                  {item.status === 'available' ? t('web3.available') : t('web3.restricted')}
                </Badge>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2.5 text-[10px]">
                <div className="flex items-center gap-1.5">
                  <Fuel className="size-3 text-amber-400 shrink-0" />
                  <span className="text-slate-400">Gas:</span>
                  <span className="text-slate-200 font-mono">{item.gasEstimate}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Coins className="size-3 text-emerald-400 shrink-0" />
                  <span className="text-slate-400">{t('web3.cost')}:</span>
                  <span className="text-emerald-300 font-mono">{item.gasCost}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Activity className="size-3 text-violet-400 shrink-0" />
                  <span className="text-slate-400">24h:</span>
                  <span className="text-slate-200 tabular-nums">{item.calls24h}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="size-3 text-slate-400 shrink-0" />
                  <span className="text-slate-400">{t('web3.recent')}:</span>
                  <span className="text-slate-300">{getRelativeTime(item.lastCalled)}</span>
                </div>
              </div>

              <div className="flex justify-end mt-2">
                {item.status === 'available' ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 text-[10px] border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 hover:text-emerald-200"
                  >
                    <Play className="mr-1 size-3" /> {t('web3.call')}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 text-[10px] border-amber-500/30 bg-amber-500/10 text-amber-300 cursor-not-allowed opacity-60"
                    disabled
                  >
                    <Ban className="mr-1 size-3" /> {t('web3.restricted')}
                  </Button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </ScrollArea>

      {/* Quick Actions */}
      <div>
        <h4 className="text-xs font-semibold text-slate-300 mb-3 flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          {t('web3.quickActions')}
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { labelKey: 'web3.batchSplit', icon: FileCode, color: 'emerald' },
            { labelKey: 'web3.updateResonance', icon: Activity, color: 'violet' },
            { labelKey: 'web3.queryCircuit', icon: Shield, color: 'amber' },
          ].map((action) => (
            <Button
              key={action.labelKey}
              variant="outline"
              size="sm"
              className={cn(
                'h-9 text-[11px] justify-start',
                action.color === 'emerald' && 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 hover:text-emerald-200',
                action.color === 'violet' && 'border-violet-500/30 bg-violet-500/10 text-violet-300 hover:bg-violet-500/20 hover:text-violet-200',
                action.color === 'amber' && 'border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 hover:text-amber-200',
              )}
            >
              <action.icon className="mr-2 size-3.5" />
              {t(action.labelKey)}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Tab 3: Event Subscription ──────────────────────────
function EventSubscriptionTab({ data }: { data: Web3IntegrationData }) {
  const { t } = useI18n();
  const subscriptions = data.eventSubscriptions;
  const activeSubs = subscriptions.filter((s) => s.status === 'subscribed').length;
  const totalEvents24h = subscriptions.reduce((sum, s) => sum + s.events24h, 0);

  return (
    <div className="space-y-5">
      {/* Subscription Overview */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-center">
          <p className="text-xl font-bold text-emerald-400 tabular-nums">{activeSubs}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">{t('web3.activeSubs')}</p>
        </div>
        <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-3 text-center">
          <p className="text-xl font-bold text-violet-400 tabular-nums">{totalEvents24h.toLocaleString()}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">{t('web3.events24h')}</p>
        </div>
      </div>

      {/* Event List */}
      <div className="space-y-2">
        {subscriptions.map((sub, idx) => (
          <motion.div
            key={`${sub.event}-${sub.contract}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.04 }}
            className="rounded-lg border border-slate-700/50 bg-slate-800/40 p-3"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <code className="text-xs font-mono text-slate-200">{sub.event}</code>
                <Badge variant="outline" className="shrink-0 text-[9px] bg-violet-500/10 text-violet-300 border-violet-500/20 font-mono">
                  {sub.contract}
                </Badge>
              </div>
              <Badge
                variant="outline"
                className={cn('shrink-0 text-[9px]', STATUS_COLORS[sub.status]?.bg, STATUS_COLORS[sub.status]?.text, STATUS_COLORS[sub.status]?.border)}
              >
                {sub.status === 'subscribed' ? t('web3.subscribed') : t('web3.notSubscribed')}
              </Badge>
            </div>

            <div className="flex items-center justify-between mt-2.5">
              <div className="flex items-center gap-4 text-[10px]">
                <div className="flex items-center gap-1.5">
                  <Activity className="size-3 text-violet-400" />
                  <span className="text-slate-400">24h:</span>
                  <span className="text-slate-200 tabular-nums font-medium">{sub.events24h}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="size-3 text-slate-400" />
                  <span className="text-slate-400">{t('web3.recent')}:</span>
                  <span className="text-slate-300">{getRelativeTime(sub.lastEvent)}</span>
                </div>
              </div>
              <div className="flex gap-1.5">
                {sub.status === 'subscribed' ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 text-[10px] border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20 hover:text-red-200"
                  >
                    {t('web3.cancelSub')}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 text-[10px] border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 hover:text-emerald-200"
                  >
                    {t('web3.resubscribe')}
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Real-time Event Log */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-400" />
            <h4 className="text-xs font-semibold text-slate-200">{t('web3.realtimeLog')}</h4>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] text-emerald-300">{t('web3.autoScroll')}</span>
          </div>
        </div>
        <ScrollArea className="max-h-48">
          <div className="space-y-1.5">
            {MOCK_EVENT_LOG.map((log, idx) => (
              <motion.div
                key={`${log.event}-${idx}`}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.06 }}
                className="flex items-center gap-2 rounded-md bg-slate-900/50 p-2 text-[10px]"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                <code className="text-emerald-300 font-mono shrink-0">{log.event}</code>
                <Badge variant="outline" className="text-[8px] bg-violet-500/10 text-violet-300 border-violet-500/20 shrink-0">
                  {log.contract}
                </Badge>
                <span className="text-slate-500 truncate">{log.data}</span>
                <span className="text-slate-500 shrink-0 ml-auto">#{log.block}</span>
                <span className="text-slate-600 shrink-0">{getRelativeTime(log.time)}</span>
              </motion.div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

// ── Tab 4: Gas Tracker ─────────────────────────────────
function GasTrackerTab({ data }: { data: Web3IntegrationData }) {
  const { t } = useI18n();
  const gasData = data.gasTracker;
  const chainGasEntries = [
    { name: 'Base', key: 'base' as const, data: gasData.base, color: CHAIN_COLORS.base },
    { name: 'Ethereum', key: 'ethereum' as const, data: gasData.ethereum, color: CHAIN_COLORS.ethereum },
    { name: 'Arbitrum', key: 'arbitrum' as const, data: gasData.arbitrum, color: CHAIN_COLORS.arbitrum },
  ];

  const txHistory = data.transactionHistory;

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
                return (
                  <div key={tier} className="rounded-md p-2 text-center" style={{ background: 'rgba(30,41,59,0.6)' }}>
                    <p className={cn('text-[9px] font-medium mb-0.5', tierConf.text)}>{tier === 'slow' ? t('web3.gasSlow') : tier === 'standard' ? t('web3.gasStandard') : tier === 'fast' ? t('web3.gasFast') : t('web3.gasInstant')}</p>
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

      {/* Transaction History */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-violet-400" />
          <h4 className="text-xs font-semibold text-slate-200">{t('web3.txHistory')}</h4>
        </div>
        <ScrollArea className="max-h-72">
          <div className="space-y-2 pr-2">
            {txHistory.map((tx, idx) => {
              const typeConf = TX_TYPE_COLORS[tx.type];
              const statusConf = STATUS_COLORS[tx.status];
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
                      {tx.status === 'confirmed' ? t('web3.confirmed') : t('web3.pending')}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px]">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500">txHash:</span>
                      <code className="text-slate-400 font-mono">{tx.hash}</code>
                      <CopyButton text={tx.hash} className="p-0.5" />
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
                      <span className="text-slate-300">{getRelativeTime(tx.timestamp)}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────
export default function Web3Integration() {
  const { t } = useI18n();
  const [data, setData] = useState<Web3IntegrationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('wallets');

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
            <p className="text-slate-400 text-sm">{t('web3.loading')}</p>
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
                <CardTitle className="text-base font-semibold text-slate-100">{t('web3.title')}</CardTitle>
                <p className="text-[11px] text-slate-500 mt-0.5">{t('web3.subtitle')}</p>
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
                value="wallets"
                className="text-[11px] data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-300 px-3 h-8"
              >
                <Wallet className="mr-1.5 size-3.5" />
                {t('web3.tabWallets')}
              </TabsTrigger>
              <TabsTrigger
                value="contracts"
                className="text-[11px] data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-300 px-3 h-8"
              >
                <FileCode className="mr-1.5 size-3.5" />
                {t('web3.tabContracts')}
              </TabsTrigger>
              <TabsTrigger
                value="events"
                className="text-[11px] data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-300 px-3 h-8"
              >
                <Bell className="mr-1.5 size-3.5" />
                {t('web3.tabEvents')}
              </TabsTrigger>
              <TabsTrigger
                value="gas"
                className="text-[11px] data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-300 px-3 h-8"
              >
                <Fuel className="mr-1.5 size-3.5" />
                {t('web3.tabGas')}
              </TabsTrigger>
            </TabsList>
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="mt-4"
              >
                <TabsContent value="wallets" className="mt-0">
                  <WalletConnectionTab data={data} />
                </TabsContent>
                <TabsContent value="contracts" className="mt-0">
                  <ContractInteractionTab data={data} />
                </TabsContent>
                <TabsContent value="events" className="mt-0">
                  <EventSubscriptionTab data={data} />
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
