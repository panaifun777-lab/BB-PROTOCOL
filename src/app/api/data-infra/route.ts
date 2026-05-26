import { NextResponse } from 'next/server';

// ── Types ──────────────────────────────────────────────
interface EventHandler {
  event: string;
  entity: string;
  field: string;
  indexed: boolean;
}

interface QueryExample {
  name: string;
  query: string;
}

interface SubgraphData {
  name: string;
  network: string;
  status: string;
  syncedBlock: number;
  latestBlock: number;
  syncLag: number;
  entityCount: {
    avatars: number;
    skills: number;
    revenueSplits: number;
    delegations: number;
    circuitEvents: number;
    resonanceUpdates: number;
  };
  handlers: EventHandler[];
  queryExamples: QueryExample[];
}

interface RecentPin {
  cid: string;
  type: string;
  size: string;
  pinnedAt: string;
  status: string;
}

interface IpfsData {
  provider: string;
  totalPins: number;
  totalSize: string;
  pinnedFiles: number;
  unpinnedFiles: number;
  recentPins: RecentPin[];
  replication: {
    targetNodes: number;
    currentReplicas: number;
    status: string;
  };
  encryption: {
    algorithm: string;
    keyManagement: string;
    shardSize: string;
  };
}

interface SyncSource {
  source: string;
  target: string;
  method: string;
  latency: string;
  freshness: string;
}

interface StateSyncData {
  strategy: string;
  sources: SyncSource[];
  consistencyModel: string;
  conflictResolution: string;
}

interface ZustandStore {
  name: string;
  slices: string[];
  persist: boolean;
  size: string;
  subscribers: number;
}

interface SupersetDashboard {
  id: number;
  name: string;
  charts: number;
  refreshRate: string;
  lastAccessed: string;
  status: string;
}

interface SupersetData {
  dashboards: SupersetDashboard[];
  totalQueries: number;
  avgQueryTime: string;
  cacheHitRate: number;
}

interface DataInfraData {
  subgraph: SubgraphData;
  ipfs: IpfsData;
  stateSync: StateSyncData;
  zustandStores: ZustandStore[];
  superset: SupersetData;
}

// ── Deterministic Mock Data (no Math.random) ─────────
const SUBGRAPH: SubgraphData = {
  name: 'afc-avatar-protocol',
  network: 'base-mainnet',
  status: 'synced',
  syncedBlock: 21456789,
  latestBlock: 21456789,
  syncLag: 0,
  entityCount: {
    avatars: 12450,
    skills: 48,
    revenueSplits: 89200,
    delegations: 3450,
    circuitEvents: 890,
    resonanceUpdates: 156000,
  },
  handlers: [
    { event: 'AvatarCreated(address,uint256,bytes32)', entity: 'Avatar', field: 'soulId, owner, cognitionRoot, createdAt', indexed: true },
    { event: 'SplitExecuted(uint256,uint256,uint256,uint256)', entity: 'RevenueSplit', field: 'amount, humanShare, avatarShare, protocolShare, timestamp', indexed: true },
    { event: 'CircuitStateChanged(uint256,uint8,uint8)', entity: 'CircuitEvent', field: 'soulId, oldState, newState, timestamp', indexed: true },
    { event: 'DelegationCreated(address,address,string,uint256)', entity: 'Delegation', field: 'delegator, delegatee, domain, weight, timestamp', indexed: true },
    { event: 'ResonanceUpdated(uint256,uint256)', entity: 'ResonanceUpdate', field: 'soulId, score, timestamp', indexed: true },
    { event: 'SkillUnlocked(uint256,uint256)', entity: 'SkillUnlock', field: 'soulId, skillId, timestamp', indexed: false },
  ],
  queryExamples: [
    { name: '获取分身列表', query: '{ avatars(first: 10, orderBy: createdAt, orderDirection: desc) { soulId owner resonanceScore } }' },
    { name: '查询收益分账', query: '{ revenueSplits(where: { soulId: "1" }, first: 20) { amount humanShare timestamp } }' },
    { name: '熔断事件历史', query: '{ circuitEvents(where: { newState: 2 }) { soulId newState timestamp } }' },
  ],
};

const IPFS: IpfsData = {
  provider: 'Pinata',
  totalPins: 2450,
  totalSize: '12.8 GB',
  pinnedFiles: 2420,
  unpinnedFiles: 30,
  recentPins: [
    { cid: 'QmX7a3f...b2c1', type: 'cognition_root', size: '4.2 KB', pinnedAt: '2026-03-10T14:30:00Z', status: 'pinned' },
    { cid: 'QmY9c4e...d3f2', type: 'memory_snapshot', size: '128 KB', pinnedAt: '2026-03-10T14:25:00Z', status: 'pinned' },
    { cid: 'QmZ5b2a...e8d1', type: 'skill_config', size: '2.1 KB', pinnedAt: '2026-03-10T14:20:00Z', status: 'pinned' },
    { cid: 'QmW3f1c...a9b8', type: 'cognition_root', size: '4.0 KB', pinnedAt: '2026-03-10T12:00:00Z', status: 'pinned' },
    { cid: 'QmV8d7e...c4a5', type: 'delegation_snapshot', size: '8.5 KB', pinnedAt: '2026-03-10T11:30:00Z', status: 'pinning' },
  ],
  replication: { targetNodes: 3, currentReplicas: 3, status: 'healthy' },
  encryption: { algorithm: 'AES-256-GCM', keyManagement: 'Vault Transit', shardSize: '256KB' },
};

const STATE_SYNC: StateSyncData = {
  strategy: 'Optimistic + ZK Verification',
  sources: [
    { source: 'On-chain State', target: 'Frontend Cache', method: 'SWR (30s)', latency: '150ms', freshness: '30s' },
    { source: 'The Graph', target: 'API Layer', method: 'Polling (4s)', latency: '200ms', freshness: '4s' },
    { source: 'ECE Oracle', target: 'Rust Engine', method: 'WebSocket', latency: '50ms', freshness: 'real-time' },
    { source: 'IPFS', target: 'Frontend', method: 'Gateway Fetch', latency: '800ms', freshness: 'on-demand' },
    { source: 'Rust Engine', target: 'Smart Contract', method: 'TX Submission', latency: '2s', freshness: 'on-tx' },
  ],
  consistencyModel: 'Eventual Consistency (ZK-verified)',
  conflictResolution: 'Last-Writer-Wins with ECE Oracle timestamp',
};

const ZUSTAND_STORES: ZustandStore[] = [
  { name: 'useAvatarStore', slices: ['profile', 'balance', 'circuitState'], persist: true, size: '2.1 KB', subscribers: 8 },
  { name: 'useRevenueStore', slices: ['summary', 'recentSplits', 'monthlyData'], persist: true, size: '4.8 KB', subscribers: 5 },
  { name: 'useResonanceStore', slices: ['currentScore', 'history', 'eceProof'], persist: false, size: '1.2 KB', subscribers: 3 },
  { name: 'useGovernanceStore', slices: ['proposals', 'delegations', 'votes'], persist: true, size: '8.5 KB', subscribers: 4 },
  { name: 'useUIStore', slices: ['activeSection', 'theme', 'sidebarOpen'], persist: true, size: '0.5 KB', subscribers: 12 },
];

const SUPERSET: SupersetData = {
  dashboards: [
    { id: 1, name: '核心指标总览', charts: 12, refreshRate: '30s', lastAccessed: '2026-03-10T14:00:00Z', status: 'active' },
    { id: 2, name: '收益趋势分析', charts: 8, refreshRate: '1m', lastAccessed: '2026-03-10T12:30:00Z', status: 'active' },
    { id: 3, name: '链上活动监控', charts: 15, refreshRate: '10s', lastAccessed: '2026-03-10T14:28:00Z', status: 'active' },
    { id: 4, name: '用户行为分析', charts: 10, refreshRate: '5m', lastAccessed: '2026-03-09T18:00:00Z', status: 'active' },
  ],
  totalQueries: 45,
  avgQueryTime: '1.2s',
  cacheHitRate: 78.5,
};

const DATA: DataInfraData = {
  subgraph: SUBGRAPH,
  ipfs: IPFS,
  stateSync: STATE_SYNC,
  zustandStores: ZUSTAND_STORES,
  superset: SUPERSET,
};

export async function GET() {
  try {
    return NextResponse.json(DATA);
  } catch (error) {
    console.error('[API] Error in GET /api/data-infra:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
