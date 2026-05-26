// ===== Web3 Store — Zustand Global State =====

import { create } from 'zustand';

interface Web3State {
  address: string | null;
  chainId: number | null;
  isConnected: boolean;
  balance: string;
  setAddress: (a: string | null) => void;
  setChainId: (c: number | null) => void;
  setConnected: (c: boolean) => void;
  setBalance: (b: string) => void;
  reset: () => void;
}

const initialState = {
  address: null,
  chainId: null,
  isConnected: false,
  balance: '0',
};

export const useWeb3Store = create<Web3State>((set) => ({
  ...initialState,

  setAddress: (a) => set({ address: a }),
  setChainId: (c) => set({ chainId: c }),
  setConnected: (c) => set({ isConnected: c }),
  setBalance: (b) => set({ balance: b }),
  reset: () => set(initialState),
}));
