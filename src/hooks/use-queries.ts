'use client';

// ===== TanStack Query Hooks — API Data Fetching =====

import { useQuery } from '@tanstack/react-query';

// ── Query Key Factory ────────────────────────────────────────
export const queryKeys = {
  dashboard: ['dashboard'] as const,
  avatars: ['avatars'] as const,
  revenues: ['revenues'] as const,
  skills: ['skills'] as const,
  delegations: ['delegations'] as const,
  resonance: ['resonance'] as const,
  liquidity: ['liquidity'] as const,
  security: ['security'] as const,
  compliance: ['compliance'] as const,
  monitoring: ['monitoring'] as const,
  performance: ['performance'] as const,
  deployment: ['deployment'] as const,
  featureFlags: ['feature-flags'] as const,
  multichain: ['multichain'] as const,
  sdkPlatform: ['sdk-platform'] as const,
  ecosystem: ['ecosystem'] as const,
  dao: ['dao-governance'] as const,
};

// ── Shared Query Options ─────────────────────────────────────
const defaultOptions = {
  staleTime: 30 * 1000, // 30s
  refetchInterval: 60 * 1000, // 60s
  retry: 2 as const,
};

// ── Fetch Helper ─────────────────────────────────────────────
async function fetchApi<T>(endpoint: string): Promise<T> {
  const res = await fetch(endpoint);
  if (!res.ok) {
    throw new Error(`API Error: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

// ── Dashboard ────────────────────────────────────────────────
export function useDashboardData() {
  return useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: () => fetchApi('/api/dashboard'),
    ...defaultOptions,
  });
}

// ── Avatars ──────────────────────────────────────────────────
export function useAvatarData() {
  return useQuery({
    queryKey: queryKeys.avatars,
    queryFn: () => fetchApi('/api/avatars'),
    ...defaultOptions,
  });
}

// ── Revenues ─────────────────────────────────────────────────
export function useRevenueData() {
  return useQuery({
    queryKey: queryKeys.revenues,
    queryFn: () => fetchApi('/api/revenues'),
    ...defaultOptions,
  });
}

// ── Skills ───────────────────────────────────────────────────
export function useSkillData() {
  return useQuery({
    queryKey: queryKeys.skills,
    queryFn: () => fetchApi('/api/skills'),
    ...defaultOptions,
  });
}

// ── Delegations ──────────────────────────────────────────────
export function useDelegationData() {
  return useQuery({
    queryKey: queryKeys.delegations,
    queryFn: () => fetchApi('/api/delegations'),
    ...defaultOptions,
  });
}

// ── Resonance ────────────────────────────────────────────────
export function useResonanceData() {
  return useQuery({
    queryKey: queryKeys.resonance,
    queryFn: () => fetchApi('/api/resonance'),
    ...defaultOptions,
  });
}

// ── Liquidity ────────────────────────────────────────────────
export function useLiquidityData() {
  return useQuery({
    queryKey: queryKeys.liquidity,
    queryFn: () => fetchApi('/api/liquidity'),
    ...defaultOptions,
  });
}

// ── Security ─────────────────────────────────────────────────
export function useSecurityData() {
  return useQuery({
    queryKey: queryKeys.security,
    queryFn: () => fetchApi('/api/security'),
    ...defaultOptions,
  });
}

// ── Compliance ───────────────────────────────────────────────
export function useComplianceData() {
  return useQuery({
    queryKey: queryKeys.compliance,
    queryFn: () => fetchApi('/api/compliance'),
    ...defaultOptions,
  });
}

// ── Monitoring ───────────────────────────────────────────────
export function useMonitoringData() {
  return useQuery({
    queryKey: queryKeys.monitoring,
    queryFn: () => fetchApi('/api/monitoring'),
    ...defaultOptions,
  });
}

// ── Performance ──────────────────────────────────────────────
export function usePerformanceData() {
  return useQuery({
    queryKey: queryKeys.performance,
    queryFn: () => fetchApi('/api/performance'),
    ...defaultOptions,
  });
}

// ── Deployment ───────────────────────────────────────────────
export function useDeploymentData() {
  return useQuery({
    queryKey: queryKeys.deployment,
    queryFn: () => fetchApi('/api/deployment'),
    ...defaultOptions,
  });
}

// ── Feature Flags ────────────────────────────────────────────
export function useFeatureFlagsData() {
  return useQuery({
    queryKey: queryKeys.featureFlags,
    queryFn: () => fetchApi('/api/feature-flags'),
    ...defaultOptions,
  });
}

// ── Multichain ───────────────────────────────────────────────
export function useMultichainData() {
  return useQuery({
    queryKey: queryKeys.multichain,
    queryFn: () => fetchApi('/api/multichain'),
    ...defaultOptions,
  });
}

// ── SDK Platform ─────────────────────────────────────────────
export function useSdkPlatformData() {
  return useQuery({
    queryKey: queryKeys.sdkPlatform,
    queryFn: () => fetchApi('/api/sdk-platform'),
    ...defaultOptions,
  });
}

// ── Ecosystem ────────────────────────────────────────────────
export function useEcosystemData() {
  return useQuery({
    queryKey: queryKeys.ecosystem,
    queryFn: () => fetchApi('/api/ecosystem'),
    ...defaultOptions,
  });
}

// ── DAO Governance ───────────────────────────────────────────
export function useDaoData() {
  return useQuery({
    queryKey: queryKeys.dao,
    queryFn: () => fetchApi('/api/dao-governance'),
    ...defaultOptions,
  });
}
