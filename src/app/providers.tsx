'use client';

// ===== Root Providers — Web3 + Query + Toast + i18n =====

import { type ReactNode, Component, type ReactNode as RNode } from 'react';
import { QueryProvider } from '@/lib/query-provider';
import { Web3Provider } from '@/lib/web3-provider';
import { Toaster } from '@/components/ui/toaster';

// ── Aave SDK Error Boundary (safety net) ──────────────────
// ConnectKit's Aave Account SDK is now disabled at config level
// (enableAaveAccount: false in web3-provider.tsx), so these errors
// should no longer occur. This boundary remains as a safety net.
const AAVE_ERROR_PATTERNS = [
  '[Aave Account]',
  'AaveAccountSdk',
  'Failed to establish lazy connection',
  'EIP1193 provider connection timeout',
  'Aave Account is not connected',
];

function isAaveError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error || '');
  return AAVE_ERROR_PATTERNS.some((p) => msg.includes(p));
}

// Install global guards at module level (before React renders)
// as a safety net in case any residual Aave code fires
if (typeof window !== 'undefined') {
  // Suppress Aave SDK console.error noise
  const _origErr = console.error;
  console.error = (...args: unknown[]) => {
    const msg = String(args[0] || '');
    if (AAVE_ERROR_PATTERNS.some(p => msg.includes(p))) return;
    _origErr.apply(console, args);
  };

  // Suppress unhandled Promise rejections from Aave SDK
  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    if (isAaveError(event.reason?.message || event.reason)) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);

  // Suppress error events from Aave SDK
  window.addEventListener('error', (event: ErrorEvent) => {
    if (isAaveError(event.message || event.error?.message)) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);
}

// ── Aave Error Boundary ──────────────────────────────────
interface AaveBoundaryState { hasError: boolean }

class AaveBoundary extends Component<{ children: RNode }, AaveBoundaryState> {
  constructor(props: { children: RNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): AaveBoundaryState {
    if (isAaveError(error)) {
      return { hasError: true };
    }
    throw error;
  }

  componentDidCatch(error: Error) {
    if (isAaveError(error)) return;
  }

  render() {
    return this.props.children;
  }
}

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <AaveBoundary>
      <QueryProvider>
        <Web3Provider>
          {children}
          <Toaster />
        </Web3Provider>
      </QueryProvider>
    </AaveBoundary>
  );
}
