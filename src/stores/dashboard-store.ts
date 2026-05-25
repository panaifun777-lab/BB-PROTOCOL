// ===== Dashboard Store — Zustand Global State =====

import { create } from 'zustand';

interface DashboardState {
  activeSection: string;
  setActiveSection: (s: string) => void;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  theme: 'dark' | 'light';
  setTheme: (t: 'dark' | 'light') => void;
  locale: string;
  setLocale: (l: string) => void;
  unreadCount: number;
  setUnreadCount: (n: number) => void;
  incrementUnread: () => void;
  resetUnread: () => void;
  resonanceConnected: boolean;
  monitoringConnected: boolean;
  setResonanceConnected: (c: boolean) => void;
  setMonitoringConnected: (c: boolean) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  activeSection: 'overview',
  setActiveSection: (s) => set({ activeSection: s }),

  sidebarCollapsed: false,
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  theme: 'dark',
  setTheme: (t) => set({ theme: t }),

  locale: 'zh',
  setLocale: (l) => set({ locale: l }),

  unreadCount: 0,
  setUnreadCount: (n) => set({ unreadCount: n }),
  incrementUnread: () => set((state) => ({ unreadCount: state.unreadCount + 1 })),
  resetUnread: () => set({ unreadCount: 0 }),

  resonanceConnected: false,
  monitoringConnected: false,
  setResonanceConnected: (c) => set({ resonanceConnected: c }),
  setMonitoringConnected: (c) => set({ monitoringConnected: c }),
}));
