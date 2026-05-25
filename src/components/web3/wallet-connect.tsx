'use client';

// ===== Wallet Connect Component — ConnectKit + Wagmi Integration =====

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet,
  ChevronDown,
  Copy,
  CheckCircle,
  ExternalLink,
  Unplug,
  ArrowRightLeft,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { ConnectKitButton } from 'connectkit';
import { useAccount, useDisconnect, useSwitchChain, useBalance } from 'wagmi';
import { formatEther } from 'viem';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { getBlockExplorerUrl } from '@/lib/web3-config';

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

// ── Helper: Truncate Address ────────────────────────────
function truncateAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// ── Main Component ──────────────────────────────────────
export default function WalletConnect() {
  const { address, isConnected, chainId } = useAccount();
  const { data: balanceData } = useBalance({ address });
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const [copied, setCopied] = useState(false);

  const chainName = CHAIN_NAMES[chainId || 8453] || `Chain ${chainId}`;
  const chainColor = CHAIN_COLORS[chainId || 8453] || '#6366f1';

  const balance = balanceData
    ? `${parseFloat(formatEther(balanceData.value)).toFixed(4)} ${balanceData.symbol}`
    : '--';

  const balanceUsd = balanceData
    ? `$${(parseFloat(formatEther(balanceData.value)) * 3500).toFixed(2)}`
    : '--';

  const handleCopy = useCallback(() => {
    if (!address) return;
    navigator.clipboard.writeText(address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [address]);

  // ── Disconnected State ─────────────────────────────
  if (!isConnected) {
    return (
      <ConnectKitButton.Custom>
        {({ show }) => (
          <Button
            onClick={show}
            className={cn(
              'h-9 gap-2 rounded-lg bg-gradient-to-r from-violet-600 to-blue-600',
              'hover:from-violet-500 hover:to-blue-500',
              'text-white text-xs font-medium transition-all',
              'border-0 shadow-lg shadow-violet-500/20',
            )}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">连接钱包</span>
            <Wallet className="w-3.5 h-3.5 sm:hidden" />
          </Button>
        )}
      </ConnectKitButton.Custom>
    );
  }

  // ── Connected State ────────────────────────────────
  return (
    <div className="flex items-center gap-2">
      {/* Chain Badge */}
      <Badge
        variant="outline"
        className="hidden sm:flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-md border-slate-600/50 bg-slate-800/60"
      >
        <div
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: chainColor }}
        />
        <span className="text-slate-300">{chainName}</span>
      </Badge>

      {/* Wallet Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'h-9 gap-2 rounded-lg',
              'bg-slate-800/60 border-slate-700/50',
              'hover:bg-slate-700/60 hover:border-violet-500/40',
              'text-xs transition-all',
            )}
          >
            <div className="w-4 h-4 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
              <Wallet className="w-2.5 h-2.5 text-white" />
            </div>
            <span className="hidden sm:inline font-mono text-slate-200">
              {address ? truncateAddress(address) : '--'}
            </span>
            <span className="sm:hidden font-mono text-slate-200">
              {address ? `${address.slice(0, 4)}..` : '--'}
            </span>
            <ChevronDown className="w-3 h-3 text-slate-500" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          className="w-72 bg-slate-800 border-slate-700 rounded-xl shadow-xl shadow-black/40"
        >
          {/* Wallet Header */}
          <div className="p-4 border-b border-slate-700/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
                <Wallet className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-100">已连接</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <code className="text-[11px] font-mono text-slate-400 truncate">
                    {address ? truncateAddress(address) : '--'}
                  </code>
                  <button
                    onClick={handleCopy}
                    className="shrink-0 p-0.5 rounded hover:bg-slate-700 transition-colors"
                    aria-label="复制地址"
                  >
                    {copied ? (
                      <CheckCircle className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3 text-slate-500 hover:text-slate-300" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Balance */}
          <div className="p-4 border-b border-slate-700/50">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-slate-900/60 p-2.5">
                <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">余额</p>
                <p className="text-sm font-semibold text-emerald-300 font-mono">{balance}</p>
              </div>
              <div className="rounded-lg bg-slate-900/60 p-2.5">
                <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">估值</p>
                <p className="text-sm font-semibold text-slate-200 font-mono">{balanceUsd}</p>
              </div>
            </div>
          </div>

          {/* Chain Badge */}
          <div className="px-4 py-2 border-b border-slate-700/50">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: chainColor }}
              />
              <span className="text-xs text-slate-300">{chainName}</span>
              <span className="text-[10px] text-slate-500 font-mono ml-auto">Chain ID: {chainId}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="p-2">
            <DropdownMenuItem
              onClick={handleCopy}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs text-slate-300 hover:bg-slate-700/50 focus:bg-slate-700/50 cursor-pointer"
            >
              <Copy className="w-4 h-4 text-slate-400" />
              复制地址
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => {
                if (address) {
                  window.open(getBlockExplorerUrl(chainId || 8453, 'address', address), '_blank');
                }
              }}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs text-slate-300 hover:bg-slate-700/50 focus:bg-slate-700/50 cursor-pointer"
            >
              <ExternalLink className="w-4 h-4 text-slate-400" />
              在浏览器中查看
            </DropdownMenuItem>

            <DropdownMenuSeparator className="bg-slate-700/50" />

            {/* Switch Chain */}
            <DropdownMenuItem
              onClick={() => {
                const targetChainId = chainId === 8453 ? 84532 : 8453;
                switchChain?.({ chainId: targetChainId });
              }}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs text-slate-300 hover:bg-slate-700/50 focus:bg-slate-700/50 cursor-pointer"
            >
              <ArrowRightLeft className="w-4 h-4 text-violet-400" />
              切换到 {chainId === 8453 ? 'Base Sepolia' : 'Base Mainnet'}
            </DropdownMenuItem>

            <DropdownMenuSeparator className="bg-slate-700/50" />

            <DropdownMenuItem
              onClick={() => disconnect()}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs text-red-300 hover:bg-red-500/10 focus:bg-red-500/10 cursor-pointer"
            >
              <Unplug className="w-4 h-4 text-red-400" />
              断开连接
            </DropdownMenuItem>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// ── Compact Wallet Button (icon-only for mobile) ────────
export function WalletConnectCompact() {
  const { isConnected } = useAccount();

  if (!isConnected) {
    return (
      <ConnectKitButton.Custom>
        {({ show }) => (
          <button
            onClick={show}
            className="p-2 rounded-lg bg-slate-800 border border-slate-700 hover:border-violet-500/50 transition-colors"
            aria-label="连接钱包"
          >
            <WifiOff className="w-4 h-4 text-slate-400" />
          </button>
        )}
      </ConnectKitButton.Custom>
    );
  }

  return (
    <ConnectKitButton.Custom>
      {({ show }) => (
        <button
          onClick={show}
          className="p-2 rounded-lg bg-slate-800 border border-emerald-500/30 hover:border-emerald-500/50 transition-colors relative"
          aria-label="钱包已连接"
        >
          <Wifi className="w-4 h-4 text-emerald-400" />
          <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        </button>
      )}
    </ConnectKitButton.Custom>
  );
}
