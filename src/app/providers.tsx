'use client';

// ===== Root Providers — Web3 + Query + Toast + i18n =====

import { type ReactNode, useEffect, Component, type ReactNode as RNode } from 'react';
import { QueryProvider } from '@/lib/query-provider';
import { Web3Provider } from '@/lib/web3-provider';
import { Toaster } from '@/components/ui/toaster';

// ── Suppress Aave SDK console.error noise ─────────────────────
// ConnectKit bundles @aave/account SDK which emits console.error
// on lazy connection failure — this is non-critical in sandbox/offline.
// We filter these specific messages instead of silencing all errors.
const AAVE_ERROR_PATTERNS = [
  '[Aave Account]',
  'AaveAccountSdk',
  'Failed to establish lazy connection',
  'EIP1193 provider connection timeout',
  'Aave Account is not connected',
];

function isAaveConsoleError(args: unknown[]): boolean {
  if (args.length === 0) return false;
  const msg = String(args[0] || '');
  return AAVE_ERROR_PATTERNS.some((p) => msg.includes(p));
}

function isAaveError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error || '');
  return AAVE_ERROR_PATTERNS.some((p) => msg.includes(p));
}

// ── Aave Error Boundary (catches sync render errors from ConnectKit/Aave SDK) ──
interface AaveBoundaryState { hasError: boolean; error: Error | null }

class AaveBoundary extends Component<{ children: RNode }, AaveBoundaryState> {
  constructor(props: { children: RNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): AaveBoundaryState {
    if (isAaveError(error)) {
      return { hasError: true, error };
    }
    throw error; // re-throw non-Aave errors
  }

  componentDidCatch(error: Error) {
    if (isAaveError(error)) {
      // Silently swallow — Aave Account is not required for wallet functionality
      return;
    }
  }

  render() {
    // Even on Aave error, render children normally — the error is non-critical
    return this.props.children;
  }
}

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  // ── Install global guards IMMEDIATELY (before any Aave SDK init) ──
  // These must run before ConnectKit/Aave SDK mounts to prevent
  // Next.js error overlay from catching the unhandled rejection.
  useEffect(() => {
    // ── 1. Suppress Aave SDK console.error noise ──────────
    const originalError = console.error;
    console.error = (...args: unknown[]) => {
      if (isAaveConsoleError(args)) return;
      originalError.apply(console, args);
    };

    // ── 2. Suppress Aave SDK unhandled Promise rejections ──
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (isAaveError(event.reason?.message || event.reason)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    // Use capture phase to intercept before Next.js error overlay
    window.addEventListener('unhandledrejection', handleUnhandledRejection, true);

    // ── 3. Suppress Aave SDK error events ──
    const handleError = (event: ErrorEvent) => {
      if (isAaveError(event.message || event.error?.message)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener('error', handleError, true);

    return () => {
      console.error = originalError;
      window.removeEventListener('unhandledrejection', handleUnhandledRejection, true);
      window.removeEventListener('error', handleError, true);
    };
  }, []);

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
