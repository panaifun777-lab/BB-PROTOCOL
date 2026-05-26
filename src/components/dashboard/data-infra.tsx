'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Database,
  HardDrive,
  RefreshCw,
  Copy,
  Search,
  Upload,
  ArrowRight,
  Check,
  CheckCircle2,
  XCircle,
  Zap,
  Shield,
  Activity,
  Server,
  Eye,
  BarChart3,
  Layers,
  Radio,
  Clock,
  Lock,
  Key,
  FileText,
  ChevronRight,
  ExternalLink,
  Globe,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useI18n, type TranslateFn } from '@/hooks/use-i18n';

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

// ── Config Map Functions (require t) ───────────────────
function getEntityLabels(t: TranslateFn): Record<string, string> {
  return {
    avatars: t('dataInfra.entityAvatars'),
    skills: t('dataInfra.entitySkills'),
    revenueSplits: t('dataInfra.entityRevenueSplits'),
    delegations: t('dataInfra.entityDelegations'),
    circuitEvents: t('dataInfra.entityCircuitEvents'),
    resonanceUpdates: t('dataInfra.entityResonanceUpdates'),
  };
}

const ENTITY_COLORS: Record<string, string> = {
  avatars: 'text-violet-400',
  skills: 'text-emerald-400',
  revenueSplits: 'text-amber-400',
  delegations: 'text-sky-400',
  circuitEvents: 'text-red-400',
  resonanceUpdates: 'text-pink-400',
};

const ENTITY_BG: Record<string, string> = {
  avatars: 'bg-violet-500/10 border-violet-500/20',
  skills: 'bg-emerald-500/10 border-emerald-500/20',
  revenueSplits: 'bg-amber-500/10 border-amber-500/20',
  delegations: 'bg-sky-500/10 border-sky-500/20',
  circuitEvents: 'bg-red-500/10 border-red-500/20',
  resonanceUpdates: 'bg-pink-500/10 border-pink-500/20',
};

function getPinTypeConfig(t: TranslateFn): Record<string, { label: string; badge: string }> {
  return {
    cognition_root: { label: t('dataInfra.pinCognitionRoot'), badge: 'bg-violet-500/20 text-violet-300 border-violet-500/30' },
    memory_snapshot: { label: t('dataInfra.pinMemorySnapshot'), badge: 'bg-sky-500/20 text-sky-300 border-sky-500/30' },
    skill_config: { label: t('dataInfra.pinSkillConfig'), badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
    delegation_snapshot: { label: t('dataInfra.pinDelegationSnapshot'), badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  };
}

function getPinStatusConfig(t: TranslateFn): Record<string, { label: string; badge: string }> {
  return {
    pinned: { label: t('dataInfra.pinned'), badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
    pinning: { label: t('dataInfra.pinning'), badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  };
}

// ── Helpers ────────────────────────────────────────────
function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString();
}

function getRelativeTime(ts: string, t: TranslateFn): string {
  const now = new Date('2026-03-10T15:00:00Z');
  const d = new Date(ts);
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return t('dataInfra.justNow');
  if (diffMins < 60) return t('dataInfra.minutesAgo', { count: diffMins });
  if (diffHours < 24) return t('dataInfra.hoursAgo', { count: diffHours });
  return t('dataInfra.daysAgo', { count: diffDays });
}

function getLatencyColor(latency: string): string {
  const val = parseFloat(latency);
  if (val < 200) return 'text-emerald-400';
  if (val < 1000) return 'text-amber-400';
  return 'text-red-400';
}

function getFreshnessColor(freshness: string): string {
  if (freshness === 'real-time') return 'text-emerald-400';
  if (freshness === 'on-demand' || freshness === 'on-tx') return 'text-amber-400';
  const val = parseInt(freshness, 10);
  const unit = freshness.replace(/[0-9]/g, '');
  if (unit === 's' && val <= 10) return 'text-emerald-400';
  if (unit === 's' && val <= 60) return 'text-amber-400';
  return 'text-red-400';
}

// ── Pipeline Stage (Tab 4) ─────────────────────────────
interface PipelineStage {
  name: string;
  method: string;
  latency: string;
}

const PIPELINE_STAGES: PipelineStage[] = [
  { name: 'On-chain', method: 'Smart Contract', latency: '2s' },
  { name: 'The Graph', method: 'Subgraph Indexing', latency: '4s' },
  { name: 'API Layer', method: 'REST/GraphQL', latency: '200ms' },
  { name: 'Frontend Cache', method: 'SWR + Zustand', latency: '30ms' },
  { name: 'User', method: 'React Render', latency: '<16ms' },
];

interface FreshnessCell {
  dataType: string;
  onChain: string;
  theGraph: string;
  apiLayer: string;
  frontend: string;
}

function getFreshnessMatrix(t: TranslateFn): FreshnessCell[] {
  const rt = t('dataInfra.realtime');
  return [
    { dataType: 'Avatar Profile', onChain: '2s', theGraph: '4s', apiLayer: '30s', frontend: rt },
    { dataType: 'Revenue Split', onChain: '2s', theGraph: '4s', apiLayer: '30s', frontend: rt },
    { dataType: 'Circuit State', onChain: '2s', theGraph: '4s', apiLayer: '30s', frontend: rt },
    { dataType: 'Resonance Score', onChain: '2s', theGraph: '4s', apiLayer: '30s', frontend: rt },
    { dataType: 'Delegations', onChain: '2s', theGraph: '4s', apiLayer: '30s', frontend: rt },
    { dataType: 'Skills', onChain: '2s', theGraph: '4s', apiLayer: '30s', frontend: rt },
  ];
}

function getCellFreshnessColor(val: string, t: TranslateFn): string {
  if (val === t('dataInfra.realtime')) return 'text-emerald-400 bg-emerald-500/10';
  const numVal = parseFloat(val);
  if (numVal <= 5) return 'text-emerald-400 bg-emerald-500/10';
  if (numVal <= 30) return 'text-amber-400 bg-amber-500/10';
  return 'text-red-400 bg-red-500/10';
}

// ── Fallback Data ──────────────────────────────────────
const FALLBACK_DATA: DataInfraData = {
  subgraph: {
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
      { name: 'queryGetAvatarList', query: '{ avatars(first: 10, orderBy: createdAt, orderDirection: desc) { soulId owner resonanceScore } }' },
      { name: 'queryRevenueSplits', query: '{ revenueSplits(where: { soulId: "1" }, first: 20) { amount humanShare timestamp } }' },
      { name: 'queryCircuitHistory', query: '{ circuitEvents(where: { newState: 2 }) { soulId newState timestamp } }' },
    ],
  },
  ipfs: {
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
  },
  stateSync: {
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
  },
  zustandStores: [
    { name: 'useAvatarStore', slices: ['profile', 'balance', 'circuitState'], persist: true, size: '2.1 KB', subscribers: 8 },
    { name: 'useRevenueStore', slices: ['summary', 'recentSplits', 'monthlyData'], persist: true, size: '4.8 KB', subscribers: 5 },
    { name: 'useResonanceStore', slices: ['currentScore', 'history', 'eceProof'], persist: false, size: '1.2 KB', subscribers: 3 },
    { name: 'useGovernanceStore', slices: ['proposals', 'delegations', 'votes'], persist: true, size: '8.5 KB', subscribers: 4 },
    { name: 'useUIStore', slices: ['activeSection', 'theme', 'sidebarOpen'], persist: true, size: '0.5 KB', subscribers: 12 },
  ],
  superset: {
    dashboards: [
      { id: 1, name: 'dashboardCoreMetrics', charts: 12, refreshRate: '30s', lastAccessed: '2026-03-10T14:00:00Z', status: 'active' },
      { id: 2, name: 'dashboardRevenueTrend', charts: 8, refreshRate: '1m', lastAccessed: '2026-03-10T12:30:00Z', status: 'active' },
      { id: 3, name: 'dashboardOnchainActivity', charts: 15, refreshRate: '10s', lastAccessed: '2026-03-10T14:28:00Z', status: 'active' },
      { id: 4, name: 'dashboardUserBehavior', charts: 10, refreshRate: '5m', lastAccessed: '2026-03-09T18:00:00Z', status: 'active' },
    ],
    totalQueries: 45,
    avgQueryTime: '1.2s',
    cacheHitRate: 78.5,
  },
};

// ── Tab 1: The Graph Subgraph ──────────────────────────
function SubgraphTab({ subgraph, t }: { subgraph: SubgraphData; t: TranslateFn }) {
  const [copiedQuery, setCopiedQuery] = useState<string | null>(null);

  const handleCopyQuery = useCallback((query: string, idx: number) => {
    navigator.clipboard.writeText(query).catch(() => {});
    setCopiedQuery(`query-${idx}`);
    setTimeout(() => setCopiedQuery(null), 2000);
  }, []);

  const pinnedRatio = subgraph.syncLag === 0;
  const entityLabels = getEntityLabels(t);

  return (
    <div className="space-y-4">
      {/* Subgraph Status Card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="border-slate-700 bg-slate-800/60 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-violet-500/15">
                  <Database className="size-5 text-violet-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-medium text-slate-100 font-mono">{subgraph.name}</h4>
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-slate-700/50 text-slate-300 border-slate-600">
                      {subgraph.network}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {t('dataInfra.syncBlocks')} <span className="text-emerald-400 font-mono tabular-nums">{subgraph.syncedBlock.toLocaleString()}</span>
                    <span className="text-slate-600 mx-1">/</span>
                    <span className="text-slate-300 font-mono tabular-nums">{subgraph.latestBlock.toLocaleString()}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-center">
                  <p className="text-[9px] text-slate-500 uppercase">{t('dataInfra.syncLag')}</p>
                  <p className={cn('text-sm font-bold tabular-nums', subgraph.syncLag === 0 ? 'text-emerald-400' : 'text-amber-400')}>
                    {subgraph.syncLag} blocks
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    'text-[10px] px-2 py-0.5',
                    pinnedRatio
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  )}
                >
                  <span className={cn('inline-block size-1.5 rounded-full mr-1', pinnedRatio ? 'bg-emerald-400' : 'bg-amber-400')} />
                  {subgraph.status}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Entity Count Grid */}
      <div>
        <h4 className="text-xs font-medium text-slate-300 mb-2 flex items-center gap-1.5">
          <Layers className="size-3.5 text-emerald-400" />
          {t('dataInfra.entityCount')}
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {Object.entries(subgraph.entityCount).map(([key, count], idx) => (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.05 }}
            >
              <Card className={cn('border backdrop-blur-sm', ENTITY_BG[key])}>
                <CardContent className="p-3 text-center">
                  <p className="text-[10px] text-slate-500 mb-1">{entityLabels[key]}</p>
                  <p className={cn('text-base font-bold tabular-nums', ENTITY_COLORS[key])}>
                    {formatNumber(count)}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Event Handlers Table */}
      <div>
        <h4 className="text-xs font-medium text-slate-300 mb-2 flex items-center gap-1.5">
          <Zap className="size-3.5 text-amber-400" />
          {t('dataInfra.eventHandlers')}
        </h4>
        <Card className="border-slate-700 bg-slate-800/60 backdrop-blur-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="text-left px-4 py-2.5 text-slate-400 font-medium">{t('dataInfra.eventSignature')}</th>
                  <th className="text-left px-4 py-2.5 text-slate-400 font-medium">{t('dataInfra.entity')}</th>
                  <th className="text-left px-4 py-2.5 text-slate-400 font-medium">{t('dataInfra.field')}</th>
                  <th className="text-center px-4 py-2.5 text-slate-400 font-medium">Indexed</th>
                </tr>
              </thead>
              <tbody>
                {subgraph.handlers.map((handler, idx) => (
                  <motion.tr
                    key={handler.event}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: idx * 0.04 }}
                    className="border-b border-slate-700/30 last:border-b-0 hover:bg-slate-700/20 transition-colors"
                  >
                    <td className="px-4 py-2.5">
                      <code className="text-violet-300 text-[10px] bg-violet-500/10 px-1.5 py-0.5 rounded font-mono">
                        {handler.event}
                      </code>
                    </td>
                    <td className="px-4 py-2.5 text-emerald-300 font-medium">{handler.entity}</td>
                    <td className="px-4 py-2.5 text-slate-400 font-mono text-[10px]">{handler.field}</td>
                    <td className="px-4 py-2.5 text-center">
                      {handler.indexed ? (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                          <Check className="size-2.5 mr-0.5" /> Yes
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-slate-600/30 text-slate-400 border-slate-600/50">
                          No
                        </Badge>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* GraphQL Query Examples */}
      <div>
        <h4 className="text-xs font-medium text-slate-300 mb-2 flex items-center gap-1.5">
          <Search className="size-3.5 text-violet-400" />
          {t('dataInfra.graphqlExamples')}
        </h4>
        <div className="space-y-2">
          {subgraph.queryExamples.map((example, idx) => (
            <motion.div
              key={example.name}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.08 }}
            >
              <Card className="border-slate-700 bg-slate-800/60 backdrop-blur-sm">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-slate-200">{t(`dataInfra.${example.name}`)}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 text-[10px] px-2 text-slate-400 hover:text-slate-200"
                      onClick={() => handleCopyQuery(example.query, idx)}
                    >
                      {copiedQuery === `query-${idx}` ? (
                        <><Check className="size-3 mr-1 text-emerald-400" /> {t('dataInfra.copied')}</>
                      ) : (
                        <><Copy className="size-3 mr-1" /> {t('dataInfra.copy')}</>
                      )}
                    </Button>
                  </div>
                  <pre className="text-[10px] text-slate-300 bg-slate-900/80 rounded-md p-3 overflow-x-auto font-mono leading-relaxed border border-slate-700/50">
                    {example.query}
                  </pre>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Query Subgraph Button */}
      <div className="flex justify-end">
        <Button className="bg-violet-600 hover:bg-violet-500 text-white h-9 text-xs px-4">
          <Search className="size-3.5 mr-1.5" />
          {t('dataInfra.querySubgraph')}
          <ChevronRight className="size-3.5 ml-1" />
        </Button>
      </div>
    </div>
  );
}

// ── Tab 2: IPFS Storage ────────────────────────────────
function IpfsTab({ ipfs, t }: { ipfs: IpfsData; t: TranslateFn }) {
  const [copiedCid, setCopiedCid] = useState<string | null>(null);

  const handleCopyCid = useCallback((cid: string) => {
    navigator.clipboard.writeText(cid).catch(() => {});
    setCopiedCid(cid);
    setTimeout(() => setCopiedCid(null), 2000);
  }, []);

  const pinnedRatio = ((ipfs.pinnedFiles / ipfs.totalPins) * 100).toFixed(1);
  const pinTypeConfig = getPinTypeConfig(t);
  const pinStatusConfig = getPinStatusConfig(t);

  return (
    <div className="space-y-4">
      {/* Storage Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: t('dataInfra.totalPins'), value: ipfs.totalPins.toLocaleString(), icon: HardDrive, color: 'text-violet-400' },
          { label: t('dataInfra.totalSize'), value: ipfs.totalSize, icon: Database, color: 'text-emerald-400' },
          { label: t('dataInfra.pinRate'), value: `${pinnedRatio}%`, icon: CheckCircle2, color: 'text-emerald-400' },
        ].map((item, idx) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: idx * 0.05 }}
          >
            <Card className="border-slate-700 bg-slate-800/60 backdrop-blur-sm">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <item.icon className={cn('size-3.5', item.color)} />
                  <span className="text-[10px] text-slate-500">{item.label}</span>
                </div>
                <p className={cn('text-lg font-bold tabular-nums', item.color)}>{item.value}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Recent Pins */}
      <div>
        <h4 className="text-xs font-medium text-slate-300 mb-2 flex items-center gap-1.5">
          <FileText className="size-3.5 text-sky-400" />
          {t('dataInfra.recentPins')}
        </h4>
        <Card className="border-slate-700 bg-slate-800/60 backdrop-blur-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="text-left px-4 py-2.5 text-slate-400 font-medium">CID</th>
                  <th className="text-left px-4 py-2.5 text-slate-400 font-medium">{t('dataInfra.type')}</th>
                  <th className="text-left px-4 py-2.5 text-slate-400 font-medium">{t('dataInfra.size')}</th>
                  <th className="text-left px-4 py-2.5 text-slate-400 font-medium">{t('dataInfra.time')}</th>
                  <th className="text-center px-4 py-2.5 text-slate-400 font-medium">{t('dataInfra.status')}</th>
                </tr>
              </thead>
              <tbody>
                {ipfs.recentPins.map((pin, idx) => {
                  const typeConfig = pinTypeConfig[pin.type] || { label: pin.type, badge: 'bg-slate-500/20 text-slate-300 border-slate-500/30' };
                  const statusConfig = pinStatusConfig[pin.status] || { label: pin.status, badge: 'bg-slate-500/20 text-slate-300 border-slate-500/30' };
                  return (
                    <motion.tr
                      key={pin.cid}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2, delay: idx * 0.04 }}
                      className="border-b border-slate-700/30 last:border-b-0 hover:bg-slate-700/20 transition-colors"
                    >
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <code className="text-violet-300 font-mono text-[10px] bg-violet-500/10 px-1.5 py-0.5 rounded">
                            {pin.cid}
                          </code>
                          <button
                            onClick={() => handleCopyCid(pin.cid)}
                            className="p-0.5 rounded hover:bg-slate-700 transition-colors"
                            title={t('dataInfra.copyCid')}
                          >
                            {copiedCid === pin.cid ? (
                              <Check className="size-3 text-emerald-400" />
                            ) : (
                              <Copy className="size-3 text-slate-500 hover:text-slate-300" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge variant="outline" className={cn('text-[9px] px-1.5 py-0', typeConfig.badge)}>
                          {typeConfig.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 text-slate-300 tabular-nums">{pin.size}</td>
                      <td className="px-4 py-2.5 text-slate-400">{getRelativeTime(pin.pinnedAt, t)}</td>
                      <td className="px-4 py-2.5 text-center">
                        <Badge variant="outline" className={cn('text-[9px] px-1.5 py-0', statusConfig.badge)}>
                          {pin.status === 'pinning' && <RefreshCw className="size-2.5 mr-0.5 animate-spin" />}
                          {statusConfig.label}
                        </Badge>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Replication + Encryption */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Replication */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="border-slate-700 bg-slate-800/60 backdrop-blur-sm h-full">
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <Server className="size-3.5 text-emerald-400" />
                {t('dataInfra.replicationStatus')}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">{t('dataInfra.targetNodes')}</span>
                  <span className="text-sm font-semibold text-slate-200 tabular-nums">{ipfs.replication.targetNodes}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">{t('dataInfra.currentReplicas')}</span>
                  <span className="text-sm font-semibold text-emerald-400 tabular-nums">{ipfs.replication.currentReplicas}</span>
                </div>
                <Progress value={(ipfs.replication.currentReplicas / ipfs.replication.targetNodes) * 100} className="h-1.5" />
                <Badge variant="outline" className="text-[10px] px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                  <CheckCircle2 className="size-2.5 mr-1" /> {ipfs.replication.status}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Encryption */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
        >
          <Card className="border-slate-700 bg-slate-800/60 backdrop-blur-sm h-full">
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <Lock className="size-3.5 text-amber-400" />
                {t('dataInfra.encryptionInfo')}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">{t('dataInfra.algorithm')}</span>
                  <code className="text-[10px] text-amber-300 font-mono bg-amber-500/10 px-1.5 py-0.5 rounded">
                    {ipfs.encryption.algorithm}
                  </code>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">{t('dataInfra.keyManagement')}</span>
                  <span className="text-[11px] text-slate-200 flex items-center gap-1">
                    <Key className="size-3 text-violet-400" />
                    {ipfs.encryption.keyManagement}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">{t('dataInfra.shardSize')}</span>
                  <span className="text-[11px] text-slate-200 tabular-nums">{ipfs.encryption.shardSize}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Upload Button */}
      <div className="flex justify-end">
        <Button className="bg-emerald-600 hover:bg-emerald-500 text-white h-9 text-xs px-4">
          <Upload className="size-3.5 mr-1.5" />
          {t('dataInfra.uploadToIpfs')}
        </Button>
      </div>
    </div>
  );
}

// ── Tab 3: State Synchronization ───────────────────────
function StateSyncTab({ stateSync, zustandStores, superset, t }: { stateSync: StateSyncData; zustandStores: ZustandStore[]; superset: SupersetData; t: TranslateFn }) {
  const [selectedStore, setSelectedStore] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {/* Sync Strategy Banner */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="border-slate-700 bg-gradient-to-r from-violet-500/10 to-emerald-500/10 backdrop-blur-sm border-l-4 border-l-violet-500">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-violet-500/20 shrink-0">
                <Radio className="size-4 text-violet-400" />
              </div>
              <div className="space-y-1.5 min-w-0">
                <h4 className="text-sm font-medium text-slate-100">{stateSync.strategy}</h4>
                <div className="flex flex-wrap gap-3 text-[11px]">
                  <span className="text-slate-400">
                    {t('dataInfra.consistencyModel')}: <span className="text-emerald-300">{stateSync.consistencyModel}</span>
                  </span>
                  <span className="text-slate-600">|</span>
                  <span className="text-slate-400">
                    {t('dataInfra.conflictResolution')}: <span className="text-amber-300">{stateSync.conflictResolution}</span>
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Data Flow Table */}
      <div>
        <h4 className="text-xs font-medium text-slate-300 mb-2 flex items-center gap-1.5">
          <Activity className="size-3.5 text-emerald-400" />
          {t('dataInfra.dataFlow')}
        </h4>
        <Card className="border-slate-700 bg-slate-800/60 backdrop-blur-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="text-left px-4 py-2.5 text-slate-400 font-medium">{t('dataInfra.sourceToTarget')}</th>
                  <th className="text-left px-4 py-2.5 text-slate-400 font-medium">{t('dataInfra.method')}</th>
                  <th className="text-right px-4 py-2.5 text-slate-400 font-medium">{t('dataInfra.latency')}</th>
                  <th className="text-right px-4 py-2.5 text-slate-400 font-medium">{t('dataInfra.freshness')}</th>
                </tr>
              </thead>
              <tbody>
                {stateSync.sources.map((src, idx) => (
                  <motion.tr
                    key={`${src.source}-${src.target}`}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: idx * 0.04 }}
                    className="border-b border-slate-700/30 last:border-b-0 hover:bg-slate-700/20 transition-colors"
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-200 font-medium">{src.source}</span>
                        <ArrowRight className="size-3 text-slate-600" />
                        <span className="text-violet-300">{src.target}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-slate-700/50 text-slate-300 border-slate-600">
                        {src.method}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span className={cn('tabular-nums font-medium', getLatencyColor(src.latency))}>
                        {src.latency}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span className={cn('tabular-nums', getFreshnessColor(src.freshness))}>
                        {src.freshness}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Zustand Stores Grid */}
      <div>
        <h4 className="text-xs font-medium text-slate-300 mb-2 flex items-center gap-1.5">
          <Layers className="size-3.5 text-violet-400" />
          {t('dataInfra.zustandStores')}
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {zustandStores.map((store, idx) => (
            <motion.div
              key={store.name}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.05 }}
            >
              <Card className={cn(
                'border-slate-700 bg-slate-800/60 backdrop-blur-sm h-full cursor-pointer transition-all',
                selectedStore === store.name ? 'ring-1 ring-violet-500/50 border-violet-500/30' : 'hover:border-slate-600'
              )}>
                <CardContent className="p-3 space-y-2.5">
                  {/* Store name */}
                  <div className="flex items-center justify-between">
                    <code className="text-[11px] text-violet-300 font-mono bg-violet-500/10 px-1.5 py-0.5 rounded">
                      {store.name}
                    </code>
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[9px] px-1.5 py-0',
                        store.persist
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : 'bg-slate-600/30 text-slate-400 border-slate-600/50'
                      )}
                    >
                      {store.persist ? 'Persist' : 'Memory'}
                    </Badge>
                  </div>

                  {/* Slices */}
                  <div className="flex flex-wrap gap-1">
                    {store.slices.map((slice) => (
                      <span
                        key={slice}
                        className="text-[9px] px-1.5 py-0.5 rounded-md bg-slate-700/50 text-slate-300 border border-slate-600/50"
                      >
                        {slice}
                      </span>
                    ))}
                  </div>

                  {/* Size + Subscribers */}
                  <div className="flex items-center justify-between pt-1.5 border-t border-slate-700/50">
                    <span className="text-[10px] text-slate-500 tabular-nums">{store.size}</span>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Eye className="size-2.5" />
                      {store.subscribers} {t('dataInfra.subscribers')}
                    </span>
                  </div>

                  {/* View State Button */}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="w-full h-6 text-[10px] text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
                    onClick={() => setSelectedStore(selectedStore === store.name ? null : store.name)}
                  >
                    {t('dataInfra.viewState')}
                    <ChevronRight className={cn('size-3 ml-1 transition-transform', selectedStore === store.name && 'rotate-90')} />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Superset Dashboards */}
      <div>
        <h4 className="text-xs font-medium text-slate-300 mb-2 flex items-center gap-1.5">
          <BarChart3 className="size-3.5 text-amber-400" />
          {t('dataInfra.supersetDashboards')}
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {superset.dashboards.map((dashboard, idx) => (
            <motion.div
              key={dashboard.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.06 }}
            >
              <Card className="border-slate-700 bg-slate-800/60 backdrop-blur-sm h-full">
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h5 className="text-xs font-medium text-slate-100">{t(`dataInfra.${dashboard.name}`)}</h5>
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 shrink-0 bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                      {dashboard.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div>
                      <p className="text-slate-500">{t('dataInfra.chartsCount')}</p>
                      <p className="text-slate-200 font-semibold tabular-nums">{dashboard.charts}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">{t('dataInfra.refreshRate')}</p>
                      <p className="text-slate-200 tabular-nums">{dashboard.refreshRate}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500 pt-1.5 border-t border-slate-700/50">
                    <Clock className="size-2.5" />
                    <span>{getRelativeTime(dashboard.lastAccessed, t)}</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Tab 4: Data Pipeline ───────────────────────────────
function DataPipelineTab({ superset, t }: { superset: SupersetData; t: TranslateFn }) {
  const [refreshing, setRefreshing] = useState(false);
  const freshnessMatrix = getFreshnessMatrix(t);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  }, []);

  return (
    <div className="space-y-4">
      {/* Pipeline Visualization */}
      <div>
        <h4 className="text-xs font-medium text-slate-300 mb-2 flex items-center gap-1.5">
          <Globe className="size-3.5 text-violet-400" />
          {t('dataInfra.dataPipelineFlow')}
        </h4>
        <Card className="border-slate-700 bg-slate-800/60 backdrop-blur-sm p-4">
          {/* Desktop: horizontal */}
          <div className="hidden sm:flex items-center gap-0 overflow-x-auto pb-2">
            {PIPELINE_STAGES.map((stage, idx) => (
              <div key={stage.name} className="flex items-center flex-shrink-0">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: idx * 0.1 }}
                  className="flex flex-col items-center gap-1.5 min-w-[130px]"
                >
                  <div className="flex items-center justify-center">
                    <div className="flex size-12 items-center justify-center rounded-full border-2 border-emerald-500/50 bg-emerald-500/10">
                      <motion.div
                        animate={{ scale: [1, 1.15, 1] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: idx * 0.3 }}
                      >
                        <CheckCircle2 className="size-5 text-emerald-400" />
                      </motion.div>
                    </div>
                  </div>
                  <p className="text-[11px] font-medium text-slate-200 text-center">{stage.name}</p>
                  <p className="text-[9px] text-slate-400 text-center">{stage.method}</p>
                  <Badge variant="outline" className={cn(
                    'text-[9px] px-1.5 py-0',
                    getLatencyColor(stage.latency).replace('text-', 'bg-').replace('-400', '-500/10') +
                    ' ' + getLatencyColor(stage.latency) +
                    ' border-slate-700/50'
                  )}>
                    {stage.latency}
                  </Badge>
                </motion.div>
                {idx < PIPELINE_STAGES.length - 1 && (
                  <ArrowRight className="size-4 text-slate-600 mx-2 flex-shrink-0" />
                )}
              </div>
            ))}
          </div>

          {/* Mobile: vertical */}
          <div className="sm:hidden space-y-0">
            {PIPELINE_STAGES.map((stage, idx) => (
              <div key={stage.name} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: idx * 0.1 }}
                    className="flex size-8 items-center justify-center rounded-full border-2 border-emerald-500/50 bg-emerald-500/10"
                  >
                    <CheckCircle2 className="size-4 text-emerald-400" />
                  </motion.div>
                  {idx < PIPELINE_STAGES.length - 1 && (
                    <div className="w-0.5 h-8 bg-slate-700/50" />
                  )}
                </div>
                <div className="pb-4">
                  <p className="text-[11px] font-medium text-slate-200">{stage.name}</p>
                  <p className="text-[9px] text-slate-400">{stage.method}</p>
                  <span className={cn('text-[10px] tabular-nums font-medium', getLatencyColor(stage.latency))}>
                    {stage.latency}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Data Freshness Matrix */}
      <div>
        <h4 className="text-xs font-medium text-slate-300 mb-2 flex items-center gap-1.5">
          <Clock className="size-3.5 text-amber-400" />
          {t('dataInfra.dataFreshnessMatrix')}
        </h4>
        <Card className="border-slate-700 bg-slate-800/60 backdrop-blur-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="text-left px-4 py-2.5 text-slate-400 font-medium">{t('dataInfra.dataType')}</th>
                  <th className="text-center px-3 py-2.5 text-slate-400 font-medium">On-chain</th>
                  <th className="text-center px-3 py-2.5 text-slate-400 font-medium">The Graph</th>
                  <th className="text-center px-3 py-2.5 text-slate-400 font-medium">API Layer</th>
                  <th className="text-center px-3 py-2.5 text-slate-400 font-medium">Frontend</th>
                </tr>
              </thead>
              <tbody>
                {freshnessMatrix.map((row, idx) => (
                  <motion.tr
                    key={row.dataType}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: idx * 0.04 }}
                    className="border-b border-slate-700/30 last:border-b-0"
                  >
                    <td className="px-4 py-2.5 text-slate-200 font-medium">{row.dataType}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={cn('text-[10px] px-2 py-0.5 rounded-md font-medium tabular-nums', getCellFreshnessColor(row.onChain, t))}>
                        {row.onChain}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={cn('text-[10px] px-2 py-0.5 rounded-md font-medium tabular-nums', getCellFreshnessColor(row.theGraph, t))}>
                        {row.theGraph}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={cn('text-[10px] px-2 py-0.5 rounded-md font-medium tabular-nums', getCellFreshnessColor(row.apiLayer, t))}>
                        {row.apiLayer}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={cn('text-[10px] px-2 py-0.5 rounded-md font-medium tabular-nums', getCellFreshnessColor(row.frontend, t))}>
                        {row.frontend}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Cache Statistics */}
      <div>
        <h4 className="text-xs font-medium text-slate-300 mb-2 flex items-center gap-1.5">
          <Shield className="size-3.5 text-emerald-400" />
          {t('dataInfra.supersetCacheStats')}
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border-slate-700 bg-slate-800/60 backdrop-blur-sm">
              <CardContent className="p-3">
                <p className="text-[10px] text-slate-500 mb-1">{t('dataInfra.totalQueries')}</p>
                <p className="text-lg font-bold text-violet-400 tabular-nums">{superset.totalQueries}</p>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
          >
            <Card className="border-slate-700 bg-slate-800/60 backdrop-blur-sm">
              <CardContent className="p-3">
                <p className="text-[10px] text-slate-500 mb-1">{t('dataInfra.avgQueryTime')}</p>
                <p className="text-lg font-bold text-amber-400 tabular-nums">{superset.avgQueryTime}</p>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <Card className="border-slate-700 bg-slate-800/60 backdrop-blur-sm">
              <CardContent className="p-3">
                <p className="text-[10px] text-slate-500 mb-1">{t('dataInfra.cacheHitRate')}</p>
                <div className="flex items-center gap-2 mb-1.5">
                  <p className="text-lg font-bold text-emerald-400 tabular-nums">{superset.cacheHitRate}%</p>
                </div>
                <div className="w-full h-2 bg-slate-700/50 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${superset.cacheHitRate}%` }}
                    transition={{ duration: 1, delay: 0.3 }}
                    className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400"
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* Refresh Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleRefresh}
          disabled={refreshing}
          className="bg-violet-600 hover:bg-violet-500 text-white h-9 text-xs px-4"
        >
          {refreshing ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="size-3.5 border-2 border-white/30 border-t-white rounded-full mr-1.5"
              />
              {t('dataInfra.refreshing')}
            </>
          ) : (
            <>
              <RefreshCw className="size-3.5 mr-1.5" />
              {t('dataInfra.refreshData')}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────
export default function DataInfra() {
  const [data, setData] = useState<DataInfraData | null>(null);
  const [loading, setLoading] = useState(true);
  const { t } = useI18n();

  useEffect(() => {
    fetch('/api/data-infra')
      .then((res) => res.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => {
        setData(FALLBACK_DATA);
        setLoading(false);
      });
  }, []);

  if (loading || !data) {
    return (
      <Card className="border-slate-700 bg-slate-800/60 backdrop-blur-sm">
        <CardContent className="p-6 flex items-center justify-center min-h-[300px]">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-3"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              className="size-8 border-2 border-violet-500/30 border-t-violet-400 rounded-full"
            />
            <p className="text-xs text-slate-400">{t('dataInfra.dataInfraLoading')}</p>
          </motion.div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="border-slate-700 bg-slate-800/80 backdrop-blur-sm">
        <CardHeader className="pb-3 pt-4 px-4 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/20 to-emerald-500/20 border border-violet-500/30">
                <Database className="size-4 text-violet-400" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold text-slate-100">{t('dataInfra.title')}</CardTitle>
                <p className="text-[10px] text-slate-500">{t('dataInfra.dataInfraSubtitle')}</p>
              </div>
            </div>
            <Badge variant="outline" className="text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-300 border-emerald-500/20">
              <span className="inline-block size-1.5 rounded-full bg-emerald-400 mr-1 animate-pulse" />
              {t('dataInfra.running')}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
          <Tabs defaultValue="subgraph" className="w-full">
            <TabsList className="bg-slate-900/50 border border-slate-700/50 h-9 p-0.5 w-full sm:w-auto">
              <TabsTrigger
                value="subgraph"
                className="text-[11px] px-3 py-1.5 data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-300 flex items-center gap-1.5"
              >
                <Database className="size-3" />
                <span className="hidden sm:inline">The Graph </span>{t('dataInfra.tabSubgraphLabel')}
              </TabsTrigger>
              <TabsTrigger
                value="ipfs"
                className="text-[11px] px-3 py-1.5 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-300 flex items-center gap-1.5"
              >
                <HardDrive className="size-3" />
                <span className="hidden sm:inline">IPFS </span>{t('dataInfra.tabIpfsLabel')}
              </TabsTrigger>
              <TabsTrigger
                value="sync"
                className="text-[11px] px-3 py-1.5 data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-300 flex items-center gap-1.5"
              >
                <RefreshCw className="size-3" />
                <span className="hidden sm:inline">{t('dataInfra.tabSyncPrefix')} </span>{t('dataInfra.tabSyncLabel')}
              </TabsTrigger>
              <TabsTrigger
                value="pipeline"
                className="text-[11px] px-3 py-1.5 data-[state=active]:bg-sky-500/20 data-[state=active]:text-sky-300 flex items-center gap-1.5"
              >
                <Globe className="size-3" />
                <span className="hidden sm:inline">{t('dataInfra.tabPipelinePrefix')} </span>{t('dataInfra.tabPipelineLabel')}
              </TabsTrigger>
            </TabsList>

            <div className="mt-4">
              <AnimatePresence mode="wait">
                <TabsContent value="subgraph" className="mt-0">
                  <motion.div
                    key="subgraph"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <SubgraphTab subgraph={data.subgraph} t={t} />
                  </motion.div>
                </TabsContent>
                <TabsContent value="ipfs" className="mt-0">
                  <motion.div
                    key="ipfs"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <IpfsTab ipfs={data.ipfs} t={t} />
                  </motion.div>
                </TabsContent>
                <TabsContent value="sync" className="mt-0">
                  <motion.div
                    key="sync"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <StateSyncTab stateSync={data.stateSync} zustandStores={data.zustandStores} superset={data.superset} t={t} />
                  </motion.div>
                </TabsContent>
                <TabsContent value="pipeline" className="mt-0">
                  <motion.div
                    key="pipeline"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <DataPipelineTab superset={data.superset} t={t} />
                  </motion.div>
                </TabsContent>
              </AnimatePresence>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </motion.div>
  );
}
