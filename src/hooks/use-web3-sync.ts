'use client';

import { useEffect } from 'react';
import { useAccount, useBalance } from 'wagmi';
import { useWeb3Store } from '@/stores/web3-store';

/**
 * Syncs wagmi wallet state (address, chainId, isConnected, balance)
 * into the Zustand Web3Store so that components reading from
 * useWeb3Store get real-time wallet data instead of dead defaults.
 *
 * Must be called inside a component wrapped by WagmiProvider.
 */
export function useWeb3Sync() {
  const { address, isConnected, chainId } = useAccount();
  const { data: balanceData } = useBalance({ address });
  const { setAddress, setChainId, setConnected, setBalance, reset } = useWeb3Store();

  useEffect(() => {
    if (isConnected && address) {
      setAddress(address);
      setChainId(chainId ?? null);
      setConnected(true);
      setBalance(balanceData?.value?.toString() ?? '0');
    } else {
      reset();
    }
  }, [address, isConnected, chainId, balanceData, setAddress, setChainId, setConnected, setBalance, reset]);
}
