// ===== useDashboardData — Auto-fetching hook for dashboard state =====

'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useDashboardStore } from '@/stores/dashboard-store';
import type {
  AvatarProfile,
  AvatarSkill,
  RevenueSummary,
  RevenueSplit,
  Delegation,
  TimelineEvent,
  ResonanceDataPoint,
} from '@/lib/types';

interface DashboardDataResult {
  avatar: AvatarProfile | null;
  skills: AvatarSkill[];
  revenueSummary: RevenueSummary | null;
  recentRevenues: RevenueSplit[];
  delegations: Delegation[];
  timeline: TimelineEvent[];
  resonanceHistory: ResonanceDataPoint[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useDashboardData(): DashboardDataResult {
  const avatar = useDashboardStore((s) => s.avatar);
  const skills = useDashboardStore((s) => s.skills);
  const revenueSummary = useDashboardStore((s) => s.revenueSummary);
  const recentRevenues = useDashboardStore((s) => s.recentRevenues);
  const delegations = useDashboardStore((s) => s.delegations);
  const timeline = useDashboardStore((s) => s.timeline);
  const resonanceHistory = useDashboardStore((s) => s.resonanceHistory);
  const isLoading = useDashboardStore((s) => s.isLoading);
  const error = useDashboardStore((s) => s.error);
  const dataLoaded = useDashboardStore((s) => s.dataLoaded);
  const fetchDashboardData = useDashboardStore((s) => s.fetchDashboardData);

  const hasFetched = useRef(false);

  // Auto-fetch on mount if data hasn't been loaded yet
  useEffect(() => {
    if (!dataLoaded && !hasFetched.current) {
      hasFetched.current = true;
      fetchDashboardData();
    }
  }, [dataLoaded, fetchDashboardData]);

  // Refresh function — forces a re-fetch regardless of current state
  const refresh = useCallback(async () => {
    // Reset dataLoaded so the store allows re-fetching, then fetch
    await fetchDashboardData();
  }, [fetchDashboardData]);

  return {
    avatar,
    skills,
    revenueSummary,
    recentRevenues,
    delegations,
    timeline,
    resonanceHistory,
    isLoading,
    error,
    refresh,
  };
}
