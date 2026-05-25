import { NextResponse } from 'next/server';

// ── Types ──────────────────────────────────────────────
interface ApiEndpoint {
  method: string;
  path: string;
  description: string;
  auth: string;
  rateLimit: string;
  status: string;
  version: string;
  category: string;
}

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsed: string;
  status: string;
  permissions: string[];
  rateLimit: string;
  usage30d: number;
}

interface SdkPackage {
  name: string;
  version: string;
  language: string;
  downloads: number;
  description: string;
  status: string;
  size: string;
  lastUpdate: string;
}

interface RateLimitQuota {
  tier: string;
  rpm: number;
  monthlyQuota: number | string;
  price: string;
}

interface RateLimitStats {
  currentRpm: number;
  maxRpm: number;
  burstLimit: number;
  quotas: RateLimitQuota[];
}

interface UsageHistoryPoint {
  date: string;
  calls: number;
  errors: number;
  avgLatency: number;
}

interface Webhook {
  id: string;
  url: string;
  events: string[];
  status: string;
  successRate: number;
  lastDelivery: string;
}

interface SdkPlatformData {
  apiEndpoints: ApiEndpoint[];
  apiKeys: ApiKey[];
  sdkPackages: SdkPackage[];
  rateLimitStats: RateLimitStats;
  usageHistory: UsageHistoryPoint[];
  webhooks: Webhook[];
}

// ── Deterministic Mock Data (no Math.random) ─────────
const API_ENDPOINTS: ApiEndpoint[] = [
  { method: 'GET', path: '/api/v1/avatars', description: '获取所有分身列表', auth: 'Bearer', rateLimit: '100/min', status: 'stable', version: 'v1', category: 'Avatar' },
  { method: 'GET', path: '/api/v1/avatars/:id', description: '获取分身详情', auth: 'Bearer', rateLimit: '200/min', status: 'stable', version: 'v1', category: 'Avatar' },
  { method: 'POST', path: '/api/v1/avatars', description: '创建新分身', auth: 'Bearer+Sig', rateLimit: '10/min', status: 'stable', version: 'v1', category: 'Avatar' },
  { method: 'PUT', path: '/api/v1/avatars/:id/cognition', description: '更新认知根哈希', auth: 'Bearer+Sig', rateLimit: '20/min', status: 'stable', version: 'v1', category: 'Avatar' },
  { method: 'GET', path: '/api/v1/skills', description: '获取技能列表', auth: 'Bearer', rateLimit: '100/min', status: 'stable', version: 'v1', category: 'Skill' },
  { method: 'POST', path: '/api/v1/skills/:id/invoke', description: '调用技能', auth: 'Bearer+Sig', rateLimit: '30/min', status: 'stable', version: 'v1', category: 'Skill' },
  { method: 'GET', path: '/api/v1/revenue/splits', description: '获取分账记录', auth: 'Bearer', rateLimit: '100/min', status: 'stable', version: 'v1', category: 'Revenue' },
  { method: 'POST', path: '/api/v1/revenue/split', description: '执行分账', auth: 'Bearer+Sig', rateLimit: '10/min', status: 'beta', version: 'v1', category: 'Revenue' },
  { method: 'GET', path: '/api/v1/resonance/:avatarId', description: '获取共振分数据', auth: 'Bearer', rateLimit: '200/min', status: 'stable', version: 'v1', category: 'Resonance' },
  { method: 'GET', path: '/api/v1/delegations', description: '获取委托关系', auth: 'Bearer', rateLimit: '100/min', status: 'stable', version: 'v1', category: 'Governance' },
  { method: 'POST', path: '/api/v1/delegations', description: '创建委托', auth: 'Bearer+Sig', rateLimit: '10/min', status: 'stable', version: 'v1', category: 'Governance' },
  { method: 'GET', path: '/api/v1/governance/proposals', description: '获取治理提案', auth: 'Bearer', rateLimit: '100/min', status: 'beta', version: 'v1', category: 'Governance' },
  { method: 'POST', path: '/api/v1/x402/pay', description: 'x402支付', auth: 'Bearer+Sig', rateLimit: '30/min', status: 'stable', version: 'v1', category: 'Payment' },
  { method: 'GET', path: '/api/v1/compliance/status', description: '合规状态查询', auth: 'Bearer', rateLimit: '50/min', status: 'beta', version: 'v1', category: 'Compliance' },
  { method: 'GET', path: '/api/v2/avatars/:id/circuit', description: '熔断状态查询(V2)', auth: 'Bearer', rateLimit: '300/min', status: 'alpha', version: 'v2', category: 'Avatar' },
];

const API_KEYS: ApiKey[] = [
  { id: 'key-1', name: 'Production Key', prefix: 'afc_prod_', createdAt: '2026-02-15', lastUsed: '2026-03-10T14:30:00Z', status: 'active', permissions: ['read', 'write'], rateLimit: '1000/min', usage30d: 45230 },
  { id: 'key-2', name: 'Staging Key', prefix: 'afc_stg_', createdAt: '2026-03-01', lastUsed: '2026-03-10T12:00:00Z', status: 'active', permissions: ['read', 'write', 'admin'], rateLimit: '5000/min', usage30d: 128450 },
  { id: 'key-3', name: 'Read-only Analytics', prefix: 'afc_ro_', createdAt: '2026-03-05', lastUsed: '2026-03-10T14:28:00Z', status: 'active', permissions: ['read'], rateLimit: '2000/min', usage30d: 89200 },
  { id: 'key-4', name: 'MCN Partner Key', prefix: 'afc_mcn_', createdAt: '2026-03-08', lastUsed: '2026-03-09T18:00:00Z', status: 'active', permissions: ['read', 'write'], rateLimit: '500/min', usage30d: 15600 },
  { id: 'key-5', name: 'Deprecated Legacy', prefix: 'afc_old_', createdAt: '2025-12-01', lastUsed: '2026-01-15T10:00:00Z', status: 'revoked', permissions: ['read'], rateLimit: '100/min', usage30d: 0 },
];

const SDK_PACKAGES: SdkPackage[] = [
  { name: '@afc/js-sdk', version: '2.1.0', language: 'TypeScript', downloads: 15230, description: '官方 JavaScript/TypeScript SDK', status: 'stable', size: '45KB', lastUpdate: '2026-03-08' },
  { name: '@afc/python-sdk', version: '1.4.0', language: 'Python', downloads: 8920, description: '官方 Python SDK', status: 'stable', size: '32KB', lastUpdate: '2026-03-05' },
  { name: '@afc/react-hooks', version: '1.2.0', language: 'React', downloads: 12100, description: 'React Hook 组件库', status: 'stable', size: '28KB', lastUpdate: '2026-03-01' },
  { name: '@afc/rust-sdk', version: '0.3.0', language: 'Rust', downloads: 2340, description: 'Rust 链下引擎 SDK', status: 'beta', size: '180KB', lastUpdate: '2026-03-10' },
  { name: '@afc/go-sdk', version: '0.1.0', language: 'Go', downloads: 890, description: 'Go 后端服务 SDK', status: 'alpha', size: '52KB', lastUpdate: '2026-02-28' },
];

const RATE_LIMIT_STATS: RateLimitStats = {
  currentRpm: 1247,
  maxRpm: 5000,
  burstLimit: 200,
  quotas: [
    { tier: 'Free', rpm: 100, monthlyQuota: 10000, price: '$0' },
    { tier: 'Pro', rpm: 1000, monthlyQuota: 500000, price: '$49/mo' },
    { tier: 'Enterprise', rpm: 5000, monthlyQuota: 'Unlimited', price: 'Custom' },
  ],
};

const USAGE_HISTORY: UsageHistoryPoint[] = [
  { date: '03-04', calls: 8500, errors: 45, avgLatency: 120 },
  { date: '03-05', calls: 9200, errors: 38, avgLatency: 115 },
  { date: '03-06', calls: 10100, errors: 52, avgLatency: 125 },
  { date: '03-07', calls: 10800, errors: 30, avgLatency: 110 },
  { date: '03-08', calls: 11500, errors: 42, avgLatency: 118 },
  { date: '03-09', calls: 12300, errors: 35, avgLatency: 112 },
  { date: '03-10', calls: 13200, errors: 28, avgLatency: 105 },
];

const WEBHOOKS: Webhook[] = [
  { id: 'wh-1', url: 'https://api.partner.com/afc/events', events: ['avatar.created', 'revenue.split'], status: 'active', successRate: 99.2, lastDelivery: '2026-03-10T14:30:00Z' },
  { id: 'wh-2', url: 'https://mcn.example.com/webhook', events: ['skill.invoked', 'circuit.triggered'], status: 'active', successRate: 97.8, lastDelivery: '2026-03-10T14:25:00Z' },
  { id: 'wh-3', url: 'https://analytics.internal/afc', events: ['resonance.updated'], status: 'paused', successRate: 95.5, lastDelivery: '2026-03-09T18:00:00Z' },
];

const DATA: SdkPlatformData = {
  apiEndpoints: API_ENDPOINTS,
  apiKeys: API_KEYS,
  sdkPackages: SDK_PACKAGES,
  rateLimitStats: RATE_LIMIT_STATS,
  usageHistory: USAGE_HISTORY,
  webhooks: WEBHOOKS,
};

export async function GET() {
  return NextResponse.json(DATA);
}
