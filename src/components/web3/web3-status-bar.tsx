'use client';

// ===== Web3 Status Bar — Compact Header Component =====

import { useMemo } from 'react';
import { useI18n } from '@/hooks/use-i18n';
import { motion } from 'framer-motion';
import {
  Wifi,
  WifiOff,
  Box,
  Fuel,
  Zap,
} from 'lucide-react';
import { useAccount, useBlockNumber, useGasPrice, useChainId } from 'wagmi';
import { formatGwei } from 'viem';
import { cn } from '@/lib/utils';

// ── Chain Name Map ───────────────────────────────────────
const CHAIN_NAMES: Record<number, string> = {
  8453: 'Base',
  84532: 'Base Sepolia',
  1: 'Ethereum',
  42161: 'Arbitrum One',
  137: 'Polygon',
  10: 'Optimism',
};

const CHAIN_COLORS: Record<number, string> = {
  8453: '#0052FF',
  84532: '#F59E0B',
  1: '#627EEA',
  42161: '#28A0F0',
  137: '#8247E5',
  10: '#FF0420',
};

// ── Main Component ──────────────────────────────────────
export default function Web3StatusBar() {
  const { t } = useI18n();
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { data: blockNumber } = useBlockNumber({ watch: true });
  const { data: gasPrice } = useGasPrice();
  const animBlock = useMemo(() => blockNumber ? Number(blockNumber) : 0, [blockNumber]);

  const chainName = CHAIN_NAMES[chainId] || `Chain ${chainId}`;
  const chainColor = CHAIN_COLORS[chainId] || '#6366f1';

  // ── Disconnected State ─────────────────────────────
  if (!isConnected) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/40"
      >
        <WifiOff className="w-3.5 h-3.5 text-slate-500" />
        <span className="text-[11px] text-slate-500 font-medium">{t("web3.notConnected")}</span>
        <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />
      </motion.div>
    );
  }

  // ── Connected State ────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/40"
    >
      {/* Connection Status */}
      <div className="flex items-center gap-1.5">
        <div className="relative">
          <Wifi className="w-3.5 h-3.5 text-emerald-400" />
          <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        </div>
        <span className="text-[11px] text-emerald-300 font-medium hidden sm:inline">{t("web3.connected")}</span>
      </div>

      {/* Network Name */}
      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-900/60">
        <div
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: chainColor }}
        />
        <span className="text-[10px] text-slate-300 font-medium">{chainName}</span>
      </div>

      {/* Block Number */}
      <div className="hidden md:flex items-center gap-1.5">
        <Box className="w-3 h-3 text-violet-400" />
        <span className="text-[10px] text-slate-300 font-mono tabular-nums">
          #{animBlock > 0 ? animBlock.toLocaleString() : '--'}
        </span>
      </div>

      {/* Gas Price */}
      <div className="hidden md:flex items-center gap-1.5">
        <Fuel className="w-3 h-3 text-amber-400" />
        <span className="text-[10px] text-slate-300 font-mono">
          {gasPrice ? `${parseFloat(formatGwei(gasPrice)).toFixed(1)} Gwei` : '-- Gwei'}
        </span>
      </div>

      {/* Speed Indicator */}
      <div className="hidden lg:flex items-center gap-1">
        <Zap className="w-3 h-3 text-emerald-400" />
        <span className="text-[10px] text-emerald-300">Fast</span>
      </div>
    </motion.div>
  );
}

// ── Ultra-compact variant for very tight spaces ────────
export function Web3StatusDot() {
  const { t } = useI18n();
  const { isConnected } = useAccount();

  return (
    <div
      className={cn(
        'flex items-center gap-1.5',
      )}
    >
      <div className={cn(
        'w-2 h-2 rounded-full',
        isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600',
      )} />
      <span className={cn(
        'text-[10px] font-medium',
        isConnected ? 'text-emerald-300' : 'text-slate-500',
      )}>
        {isConnected ? t('web3.online') : t('web3.offline')}
      </span>
    </div>
  );
}
