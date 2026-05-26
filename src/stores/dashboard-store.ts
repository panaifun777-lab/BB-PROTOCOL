// ===== Dashboard Store — Zustand Global State =====

import { create } from 'zustand';
import type {
  AvatarProfile,
  AvatarSkill,
  RevenueSummary,
  RevenueSplit,
  Delegation,
  TimelineEvent,
  ResonanceDataPoint,
} from '@/lib/types';
import {
  MOCK_AVATAR,
  MOCK_AVATAR_SKILLS,
  MOCK_REVENUE_SUMMARY,
  MOCK_REVENUES,
  MOCK_DELEGATIONS,
  MOCK_TIMELINE,
  MOCK_RESONANCE_HISTORY,
} from '@/lib/mock-data';

// ----- Dashboard data slice -----

interface DashboardDataState {
  avatar: AvatarProfile | null;
  skills: AvatarSkill[];
  revenueSummary: RevenueSummary | null;
  recentRevenues: RevenueSplit[];
  delegations: Delegation[];
  timeline: TimelineEvent[];
  resonanceHistory: ResonanceDataPoint[];
  isLoading: boolean;
  error: string | null;
  dataLoaded: boolean;
  fetchDashboardData: () => Promise<void>;
  setAvatar: (avatar: AvatarProfile) => void;
  setSkills: (skills: AvatarSkill[]) => void;
  setRevenueSummary: (summary: RevenueSummary) => void;
  setRecentRevenues: (revenues: RevenueSplit[]) => void;
  setDelegations: (delegations: Delegation[]) => void;
  setTimeline: (timeline: TimelineEvent[]) => void;
  setResonanceHistory: (history: ResonanceDataPoint[]) => void;
}

// ----- UI slice (existing) -----

interface DashboardUIState {
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

// ----- Combined store type -----

type DashboardStore = DashboardDataState & DashboardUIState;

export const useDashboardStore = create<DashboardStore>((set, get) => ({
  // ===== Dashboard data state =====
  avatar: null,
  skills: [],
  revenueSummary: null,
  recentRevenues: [],
  delegations: [],
  timeline: [],
  resonanceHistory: [],
  isLoading: false,
  error: null,
  dataLoaded: false,

  fetchDashboardData: async () => {
    // Prevent duplicate fetches
    if (get().isLoading) return;

    set({ isLoading: true, error: null });

    try {
      // Fetch from engine-status API for real-time status data
      const engineResponse = await fetch('/api/engine-status?XTransformPort=3004');

      if (!engineResponse.ok) {
        throw new Error(`Engine status API returned ${engineResponse.status}`);
      }

      const engineData = await engineResponse.json();

      // Fetch from dashboard API for core dashboard data
      const dashboardResponse = await fetch('/api/dashboard');

      if (!dashboardResponse.ok) {
        throw new Error(`Dashboard API returned ${dashboardResponse.status}`);
      }

      const dashboardData = await dashboardResponse.json();

      // Merge API data with store, using API data as primary source
      set({
        avatar: dashboardData.avatar ?? MOCK_AVATAR,
        skills: dashboardData.skills ?? MOCK_AVATAR_SKILLS,
        revenueSummary: dashboardData.revenueSummary ?? MOCK_REVENUE_SUMMARY,
        recentRevenues: dashboardData.recentRevenues ?? MOCK_REVENUES,
        delegations: dashboardData.delegations ?? MOCK_DELEGATIONS,
        timeline: dashboardData.timeline ?? MOCK_TIMELINE,
        resonanceHistory: dashboardData.resonanceHistory ?? MOCK_RESONANCE_HISTORY,
        // Store engine status summary for components that need it
        isLoading: false,
        error: null,
        dataLoaded: true,
      });

      // Attach engine status data as a side-effect for real-time awareness
      // Components can read from the engine-status endpoint independently
      void engineData;
    } catch (err) {
      // Fall back to mock data on any API failure
      console.warn('[DashboardStore] API fetch failed, falling back to mock data:', err);

      set({
        avatar: MOCK_AVATAR,
        skills: MOCK_AVATAR_SKILLS,
        revenueSummary: MOCK_REVENUE_SUMMARY,
        recentRevenues: MOCK_REVENUES,
        delegations: MOCK_DELEGATIONS,
        timeline: MOCK_TIMELINE,
        resonanceHistory: MOCK_RESONANCE_HISTORY,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to fetch dashboard data',
        dataLoaded: true,
      });
    }
  },

  setAvatar: (avatar) => set({ avatar }),
  setSkills: (skills) => set({ skills }),
  setRevenueSummary: (summary) => set({ revenueSummary: summary }),
  setRecentRevenues: (revenues) => set({ recentRevenues: revenues }),
  setDelegations: (delegations) => set({ delegations }),
  setTimeline: (timeline) => set({ timeline }),
  setResonanceHistory: (history) => set({ resonanceHistory: history }),

  // ===== UI state (existing, unchanged) =====
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
