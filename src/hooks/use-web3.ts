'use client';

// ===== Web3 Hooks — Wagmi v2/v3 + Viem for Base L2 =====

import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import {
  useAccount,
  useBalance,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useBlockNumber,
  useGasPrice,
  useChainId,
  useDisconnect,
  useSwitchChain,
} from 'wagmi';
import { formatEther, formatGwei, type Address, type Abi } from 'viem';
import {
  CONTRACT_ADDRESSES,
  AVATAR_CORE_ABI,
  DYNAMIC_SPLITTER_ABI,
  CIRCUIT_GUARD_ABI,
  TOKEN_VAULT_ABI,
  GAS_CONSTANTS,
} from '@/lib/web3-config';

// ── Types ────────────────────────────────────────────────

export interface WalletState {
  isConnected: boolean;
  address: Address | undefined;
  balance: string | undefined;
  balanceUsd: string | undefined;
  chainId: number | undefined;
  chainName: string;
  isConnecting: boolean;
  isReconnecting: boolean;
}

export interface AvatarNFTData {
  soulId: string;
  owner: Address;
  cognitionRoot: `0x${string}`;
  resonanceScore: number;
  circuitState: number; // 0=NORMAL, 1=SOFT_LIMIT, 2=HARD_PAUSE, 3=RECOVERY
  isFrozen: boolean;
  createdAt: number;
}

export interface SplitConfig {
  humanBps: number;
  avatarBps: number;
  protocolBps: number;
  lastUpdated: number;
}

export interface StakingInfo {
  totalStaked: number;
  apy: number;
  stakers: number;
}

export interface GasEstimateResult {
  gasUnits: number;
  costUsd: string;
  costEth: string;
  isEstimated: boolean;
}

export interface ContractWriteResult {
  write: (() => void) | undefined;
  writeAsync: (() => Promise<`0x${string}`>) | undefined;
  hash: `0x${string}` | undefined;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  receipt: unknown;
  isSuccess: boolean;
}

export interface ContractReadResult<T> {
  data: T | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

// ── Chain Name Map ───────────────────────────────────────
const CHAIN_NAMES: Record<number, string> = {
  8453: 'Base',
  84532: 'Base Sepolia',
  1: 'Ethereum',
  42161: 'Arbitrum One',
  137: 'Polygon',
  10: 'Optimism',
};

// ── Hook: useWallet ──────────────────────────────────────
export function useWallet(): WalletState {
  const { address, isConnected, isConnecting, isReconnecting, connector } = useAccount();
  const chainId = useChainId();
  const { data: balanceData } = useBalance({ address });
  const disconnect = useDisconnect();

  const balance = balanceData ? `${parseFloat(formatEther(balanceData.value)).toFixed(4)} ${balanceData.symbol}` : undefined;

  // Mock USD conversion rate: 1 ETH ≈ $3,500
  const balanceUsd = balanceData
    ? `$${(parseFloat(formatEther(balanceData.value)) * 3500).toFixed(2)}`
    : undefined;

  return {
    isConnected,
    address,
    balance,
    balanceUsd,
    chainId,
    chainName: CHAIN_NAMES[chainId] || `Chain ${chainId}`,
    isConnecting,
    isReconnecting,
  };
}

// ── Hook: useAvatarNFT ───────────────────────────────────
export function useAvatarNFT(avatarId: number = 1) {
  const { address, isConnected } = useAccount();

  // Read avatar profile
  const {
    data: profileData,
    isLoading,
    isError,
    error,
    refetch,
  } = useReadContract({
    address: CONTRACT_ADDRESSES.avatarCore,
    abi: AVATAR_CORE_ABI,
    functionName: 'getAvatarProfile',
    args: [BigInt(avatarId)],
    query: {
      enabled: isConnected,
    },
  });

  // Read NFT balance for connected wallet
  const {
    data: nftBalance,
  } = useReadContract({
    address: CONTRACT_ADDRESSES.avatarCore,
    abi: AVATAR_CORE_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: isConnected && !!address,
    },
  });

  const avatarData: AvatarNFTData | undefined = profileData
    ? {
        soulId: (profileData as Record<string, unknown>).soulId as string || '',
        owner: (profileData as Record<string, unknown>).owner as Address || '0x0',
        cognitionRoot: (profileData as Record<string, unknown>).cognitionRoot as `0x${string}` || '0x0',
        resonanceScore: Number((profileData as Record<string, unknown>).resonanceScore || 0),
        circuitState: Number((profileData as Record<string, unknown>).circuitState || 0),
        isFrozen: (profileData as Record<string, unknown>).isFrozen as boolean || false,
        createdAt: Number((profileData as Record<string, unknown>).createdAt || 0),
      }
    : undefined;

  return {
    data: avatarData,
    nftBalance: nftBalance ? Number(nftBalance) : 0,
    isLoading,
    isError,
    error,
    refetch,
  };
}

// ── Hook: useDynamicSplitter ─────────────────────────────
export function useDynamicSplitter() {
  const { isConnected } = useAccount();
  const { writeContract, writeContractAsync } = useWriteContract();

  // Read split config for avatar 1
  const {
    data: splitConfigData,
    isLoading,
    refetch,
  } = useReadContract({
    address: CONTRACT_ADDRESSES.dynamicSplitter,
    abi: DYNAMIC_SPLITTER_ABI,
    functionName: 'getSplitConfig',
    args: [1n],
    query: {
      enabled: isConnected,
    },
  });

  const splitConfig: SplitConfig | undefined = splitConfigData
    ? {
        humanBps: Number((splitConfigData as Record<string, unknown>).humanBps || 7000),
        avatarBps: Number((splitConfigData as Record<string, unknown>).avatarBps || 2000),
        protocolBps: Number((splitConfigData as Record<string, unknown>).protocolBps || 1000),
        lastUpdated: Number((splitConfigData as Record<string, unknown>).lastUpdated || 0),
      }
    : undefined;

  const executeSplit = useCallback(
    async (avatarId: number, amount: bigint, source: number) => {
      if (!isConnected) return;
      return writeContractAsync({
        address: CONTRACT_ADDRESSES.dynamicSplitter,
        abi: DYNAMIC_SPLITTER_ABI,
        functionName: 'executeSplit',
        args: [BigInt(avatarId), amount, source],
      });
    },
    [isConnected, writeContractAsync],
  );

  return {
    splitConfig,
    isLoading,
    refetch,
    executeSplit,
  };
}

// ── Hook: useCircuitGuard ────────────────────────────────
export function useCircuitGuard(avatarId: number = 1) {
  const { isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();

  // Read current circuit state
  const {
    data: circuitStateData,
    isLoading,
    refetch,
  } = useReadContract({
    address: CONTRACT_ADDRESSES.circuitGuard,
    abi: CIRCUIT_GUARD_ABI,
    functionName: 'getCircuitState',
    args: [BigInt(avatarId)],
    query: {
      enabled: isConnected,
    },
  });

  const circuitState = circuitStateData !== undefined
    ? Number(circuitStateData)
    : undefined;

  const evaluateState = useCallback(
    async () => {
      if (!isConnected) return;
      return writeContractAsync({
        address: CONTRACT_ADDRESSES.circuitGuard,
        abi: CIRCUIT_GUARD_ABI,
        functionName: 'evaluateState',
        args: [BigInt(avatarId)],
      });
    },
    [isConnected, writeContractAsync, avatarId],
  );

  const triggerRecovery = useCallback(
    async () => {
      if (!isConnected) return;
      return writeContractAsync({
        address: CONTRACT_ADDRESSES.circuitGuard,
        abi: CIRCUIT_GUARD_ABI,
        functionName: 'triggerRecovery',
        args: [BigInt(avatarId)],
      });
    },
    [isConnected, writeContractAsync, avatarId],
  );

  return {
    circuitState,
    isLoading,
    refetch,
    evaluateState,
    triggerRecovery,
  };
}

// ── Hook: useTokenVault ──────────────────────────────────
export function useTokenVault(avatarId: number = 1) {
  const { isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();

  // Read vault balance
  const {
    data: vaultBalance,
    isLoading,
    refetch,
  } = useReadContract({
    address: CONTRACT_ADDRESSES.tokenVault,
    abi: TOKEN_VAULT_ABI,
    functionName: 'getBalance',
    args: [BigInt(avatarId)],
    query: {
      enabled: isConnected,
    },
  });

  // Read staking info
  const {
    data: stakingData,
  } = useReadContract({
    address: CONTRACT_ADDRESSES.tokenVault,
    abi: TOKEN_VAULT_ABI,
    functionName: 'getStakingInfo',
    query: {
      enabled: isConnected,
    },
  });

  const stakingInfo: StakingInfo | undefined = stakingData
    ? {
        totalStaked: Number((stakingData as Record<string, unknown>).totalStaked || 0),
        apy: Number((stakingData as Record<string, unknown>).apy || 0),
        stakers: Number((stakingData as Record<string, unknown>).stakers || 0),
      }
    : undefined;

  const deposit = useCallback(
    async (amount: bigint) => {
      if (!isConnected) return;
      return writeContractAsync({
        address: CONTRACT_ADDRESSES.tokenVault,
        abi: TOKEN_VAULT_ABI,
        functionName: 'deposit',
        args: [BigInt(avatarId), amount],
      });
    },
    [isConnected, writeContractAsync, avatarId],
  );

  const withdraw = useCallback(
    async (amount: bigint) => {
      if (!isConnected) return;
      return writeContractAsync({
        address: CONTRACT_ADDRESSES.tokenVault,
        abi: TOKEN_VAULT_ABI,
        functionName: 'withdraw',
        args: [BigInt(avatarId), amount],
      });
    },
    [isConnected, writeContractAsync, avatarId],
  );

  return {
    vaultBalance: vaultBalance ? Number(vaultBalance) : 0,
    stakingInfo,
    isLoading,
    refetch,
    deposit,
    withdraw,
  };
}

// ── Hook: useContractRead (Generic) ──────────────────────
export function useContractRead<T = unknown>(
  abi: Abi,
  address: Address,
  functionName: string,
  args?: unknown[],
): ContractReadResult<T> {
  const { isConnected } = useAccount();

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useReadContract({
    address,
    abi,
    functionName,
    args: args as unknown[],
    query: {
      enabled: isConnected,
    },
  });

  return {
    data: data as T | undefined,
    isLoading,
    isError,
    error: error as Error | null,
    refetch: refetch as () => void,
  };
}

// ── Hook: useContractWrite (Generic) ─────────────────────
export function useContractWrite(
  abi: Abi,
  address: Address,
  functionName: string,
): ContractWriteResult {
  const { isConnected } = useAccount();
  const {
    writeContract,
    writeContractAsync,
    data: hash,
    isPending,
    isError,
    error,
  } = useWriteContract();

  // Wait for transaction receipt
  const { data: receipt, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const write = useCallback(() => {
    if (!isConnected) return;
    writeContract({
      address,
      abi,
      functionName,
    });
  }, [isConnected, writeContract, address, abi, functionName]);

  const writeAsync = useCallback(() => {
    if (!isConnected) return Promise.reject(new Error('Wallet not connected'));
    return writeContractAsync({
      address,
      abi,
      functionName,
    });
  }, [isConnected, writeContractAsync, address, abi, functionName]);

  return {
    write,
    writeAsync,
    hash,
    isPending,
    isError,
    error: error as Error | null,
    receipt,
    isSuccess,
  };
}

// ── Hook: useGasEstimate ─────────────────────────────────

// Deterministic gas estimation map based on function name
const GAS_MAP: Record<string, number> = {
  createAvatar: 185000,
  updateCognitionRoot: 45000,
  getAvatarProfile: 28000,
  executeSplit: 92000,
  getSplitConfig: 25000,
  evaluateState: 38000,
  triggerRecovery: 65000,
  getCircuitState: 22000,
  deposit: 75000,
  withdraw: 68000,
  getBalance: 20000,
  getStakingInfo: 23000,
  unlockSkill: 45000,
  getSkillStatus: 21000,
  delegateVote: 55000,
  submitResonanceScore: 68000,
  propose: 120000,
  upgrade: 85000,
  balanceOf: 18000,
  approve: 42000,
};

export function useGasEstimate(
  _abi: Abi,
  _address: Address,
  functionName: string,
  _args?: unknown[],
): GasEstimateResult & { isLoading: boolean } {
  const { isConnected } = useAccount();

  const estimate = useMemo<GasEstimateResult>(() => {
    if (!isConnected) {
      return { gasUnits: 0, costUsd: '$0.00', costEth: '0', isEstimated: false };
    }

    const gasUnits = GAS_MAP[functionName] || 50000;
    const costEth = gasUnits * Number(GAS_CONSTANTS.baseL2GasPrice);
    const costUsd = costEth.toFixed(4);

    return {
      gasUnits,
      costUsd: `$${costUsd}`,
      costEth: costEth.toString(),
      isEstimated: true,
    };
  }, [isConnected, functionName]);

  return { ...estimate, isLoading: false };
}

// ── Hook: useContractEvents ──────────────────────────────
export function useContractEvents(
  _address: Address,
  _abi: Abi,
  eventName?: string,
) {
  const { isConnected } = useAccount();
  const [events, setEvents] = useState<unknown[]>([]);
  const isConnectedRef = useRef(isConnected);

  useEffect(() => {
    isConnectedRef.current = isConnected;
  }, [isConnected]);

  useEffect(() => {
    if (!isConnected) return;

    // Simulate receiving events periodically
    const interval = setInterval(() => {
      if (!isConnectedRef.current) return;
      // Only add events 30% of the time (deterministic-ish)
      const now = Date.now();
      if (now % 10 < 3) {
        setEvents((prev) => {
          const newEvents = [
            {
              eventName: eventName || 'ContractEvent',
              blockNumber: Math.floor(now / 1000),
              transactionHash: `0x${now.toString(16).padStart(64, '0')}`,
              data: {},
              timestamp: new Date().toISOString(),
            },
            ...prev,
          ].slice(0, 50); // Keep last 50 events
          return newEvents;
        });
      }
    }, 6000);

    return () => clearInterval(interval);
  }, [isConnected, eventName]);

  const isSubscribed = isConnected;

  return {
    events: isConnected ? events : [],
    isSubscribed,
    eventCount: isConnected ? events.length : 0,
  };
}

// ── Hook: useNetworkInfo ─────────────────────────────────
export function useNetworkInfo() {
  const { isConnected } = useAccount();
  const { data: blockNumber } = useBlockNumber({ watch: true });
  const { data: gasPrice } = useGasPrice();
  const chainId = useChainId();

  return {
    blockNumber: blockNumber ? Number(blockNumber) : 0,
    gasPrice: gasPrice ? formatGwei(gasPrice) : '0',
    gasPriceWei: gasPrice || 0n,
    chainId,
    chainName: CHAIN_NAMES[chainId] || `Chain ${chainId}`,
    isConnected,
  };
}

// ── Hook: useWalletActions ───────────────────────────────
export function useWalletActions() {
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();

  return {
    disconnect,
    switchToBase: () => switchChain({ chainId: 8453 }),
    switchToBaseSepolia: () => switchChain({ chainId: 84532 }),
  };
}
