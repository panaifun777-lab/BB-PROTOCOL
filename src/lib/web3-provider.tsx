'use client';

// ===== Wagmi Provider — Web3 Connection Layer for Base L2 =====

import React, { Component, type ReactNode } from 'react';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { base, baseSepolia } from 'viem/chains';
import { ConnectKitProvider, getDefaultConfig } from 'connectkit';
import { useWeb3Sync } from '@/hooks/use-web3-sync';

// ── Wagmi Config ────────────────────────────────────────
// NOTE: enableAaveAccount is explicitly set to false.
// ConnectKit bundles @aave/account SDK which defaults to enabled.
// In sandbox/offline environments the Aave Account SDK fails to
// establish a lazy connection and throws:
//   "Aave Account is not connected. Make sure to call AaveAccountSdk.connect() first."
// Disabling it at the config level prevents the SDK from initializing at all,
// eliminating the error at its source while keeping wallet connect working.
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
    enableAaveAccount: false,
  } as any),
);

// ── Aave Account SDK Error Boundary (safety net) ────────────
// Even with enableAaveAccount:false, we keep a boundary as a safety net
// in case any residual Aave SDK code throws during React rendering.
function isAaveSdkError(error: Error): boolean {
  const msg = error.message || '';
  return (
    msg.includes('Aave Account') ||
    msg.includes('AaveAccountSdk') ||
    msg.includes('Failed to establish lazy connection') ||
    msg.includes('EIP1193 provider connection timeout')
  );
}

interface AaveErrorBoundaryState {
  hasError: boolean;
}

class AaveErrorBoundary extends Component<
  { children: ReactNode },
  AaveErrorBoundaryState
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): AaveErrorBoundaryState {
    if (isAaveSdkError(error)) {
      return { hasError: true };
    }
    throw error;
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    if (isAaveSdkError(error)) {
      // Silently swallow Aave SDK errors
      return;
    }
    console.error('[Web3Provider] Unhandled error:', error, errorInfo);
  }

  render() {
    return this.props.children;
  }
}

// ── Web3 Sync Wrapper ──────────────────────────────────
function Web3SyncWrapper({ children }: { children: ReactNode }) {
  useWeb3Sync();
  return <>{children}</>;
}

// ── Provider Component ──────────────────────────────────
export function Web3Provider({ children }: { children: ReactNode }) {
  return (
    <AaveErrorBoundary>
      <WagmiProvider config={config}>
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
          <Web3SyncWrapper>{children}</Web3SyncWrapper>
        </ConnectKitProvider>
      </WagmiProvider>
    </AaveErrorBoundary>
  );
}

// ── Export config for hooks ─────────────────────────────
export { config };
