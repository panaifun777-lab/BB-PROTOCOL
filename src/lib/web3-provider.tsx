'use client';

// ===== Wagmi Provider — Web3 Connection Layer for Base L2 =====

import React, { type ReactNode } from 'react';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { base, baseSepolia } from 'viem/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConnectKitProvider, getDefaultConfig } from 'connectkit';

// ── Wagmi Config ────────────────────────────────────────
const config = createConfig(
  getDefaultConfig({
    chains: [base, baseSepolia],
    transports: {
      [base.id]: http('https://mainnet.base.org'),
      [baseSepolia.id]: http('https://sepolia.base.org'),
    },
    walletConnectProjectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo-project-id',
    appName: 'AI Avatar DeFi — BB Platform',
    appDescription: 'AI分身去中心化金融系统 on Base L2',
  } as Record<string, unknown>),
);

// ── Query Client ────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
      retry: 2,
    },
  },
});

// ── Provider Component ──────────────────────────────────
export function Web3Provider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider
          theme="midnight"
          mode="dark"
          options={{
            hideBalance: false,
            hideTooltips: false,
            embedGoogleFonts: true,
            disclaimer: (
              <div className="text-xs text-slate-400 text-center p-2">
                By connecting, you agree to the Terms of Service and acknowledge the Privacy Policy.
              </div>
            ),
          }}
          customTheme={{
            '--ck-font-family': '"Inter", system-ui, sans-serif',
            '--ck-border-radius': '12px',
            '--ck-overlay-background': 'rgba(15, 23, 42, 0.85)',
            '--ck-modal-background': '#1e293b',
            '--ck-modal-border': '1px solid rgba(100, 116, 139, 0.3)',
            '--ck-body-background': '#0f172a',
            '--ck-body-color': '#e2e8f0',
            '--ck-primary-button-background': '#8b5cf6',
            '--ck-primary-button-color': '#ffffff',
            '--ck-secondary-button-border': '1px solid rgba(100, 116, 139, 0.3)',
            '--ck-secondary-button-background': '#1e293b',
          }}
        >
          {children}
        </ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

// ── Export config for hooks ─────────────────────────────
export { config };
