'use client';

// ===== Root Providers — Web3 + Query + Toast + i18n =====

import { type ReactNode } from 'react';
import { QueryProvider } from '@/lib/query-provider';
import { Web3Provider } from '@/lib/web3-provider';
import { Toaster } from '@/components/ui/toaster';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <QueryProvider>
      <Web3Provider>
        {children}
        <Toaster />
      </Web3Provider>
    </QueryProvider>
  );
}
