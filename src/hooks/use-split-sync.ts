'use client';

import { useState, useEffect, useCallback } from 'react';
import { useDynamicSplitter } from '@/hooks/use-web3';
import { FIAT_SPLIT_CONFIG } from '@/lib/stripe-config';

export interface SplitConfigBps {
  humanBps: number;
  avatarBps: number;
  protocolBps: number;
}

export interface SplitSyncState {
  isSynced: boolean;
  chainConfig: SplitConfigBps | null;
  fiatConfig: SplitConfigBps;
  lastSyncedAt: Date | null;
}

/**
 * Watches on-chain splitConfig from DynamicSplitter.sol and compares
 * with the fiat FIAT_SPLIT_CONFIG. When they differ, shows a toast
 * notification suggesting admin to update the fiat split config.
 */
export function useSplitSync(): SplitSyncState {
  const { splitConfig } = useDynamicSplitter();
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [hasNotified, setHasNotified] = useState(false);

  const chainConfig: SplitConfigBps | null = splitConfig
    ? {
        humanBps: splitConfig.humanBps,
        avatarBps: splitConfig.avatarBps,
        protocolBps: splitConfig.protocolBps,
      }
    : null;

  const fiatConfig: SplitConfigBps = {
    humanBps: FIAT_SPLIT_CONFIG.humanBps,
    avatarBps: FIAT_SPLIT_CONFIG.avatarBps,
    protocolBps: FIAT_SPLIT_CONFIG.protocolBps,
  };

  // Compare chain config with fiat config
  const isSynced = chainConfig
    ? chainConfig.humanBps === fiatConfig.humanBps &&
      chainConfig.avatarBps === fiatConfig.avatarBps &&
      chainConfig.protocolBps === fiatConfig.protocolBps
    : true; // If chain not connected, consider synced (no data to compare)

  // Show toast notification when out of sync (once per change)
  useEffect(() => {
    if (!isSynced && chainConfig && !hasNotified) {
      // Dynamically import toast to avoid circular deps
      import('sonner').then(({ toast }) => {
        toast.warning('链上分账比例已更新，法币分账待同步', {
          description: `链上: ${chainConfig.humanBps / 100}/${chainConfig.avatarBps / 100}/${chainConfig.protocolBps / 100} vs 法币: ${fiatConfig.humanBps / 100}/${fiatConfig.avatarBps / 100}/${fiatConfig.protocolBps / 100}`,
          duration: 8000,
        });
      });
      setHasNotified(true);
      setLastSyncedAt(new Date());
    }

    if (isSynced && hasNotified) {
      setHasNotified(false);
      setLastSyncedAt(new Date());
    }
  }, [isSynced, chainConfig, fiatConfig, hasNotified]);

  // Reset notification flag when chain config changes
  const checkSync = useCallback(() => {
    setHasNotified(false);
    setLastSyncedAt(new Date());
  }, []);

  // Call checkSync when splitConfig changes
  useEffect(() => {
    if (splitConfig) {
      setLastSyncedAt(new Date());
    }
  }, [splitConfig]);

  return {
    isSynced,
    chainConfig,
    fiatConfig,
    lastSyncedAt,
  };
}
