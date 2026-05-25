import { NextResponse } from 'next/server';

// ── Types ────────────────────────────────────────────────────

interface SystemMetrics {
  cpu: number;
  memory: number;
  memoryUsed: string;
  memoryTotal: string;
  diskUsage: number;
  networkIn: number;
  networkOut: number;
  activeConnections: number;
  requestRate: number;
  errorRate: number;
  p50Latency: number;
  p95Latency: number;
  p99Latency: number;
}

interface PrometheusMetric {
  name: string;
  value: number;
  unit: string;
  status: 'healthy' | 'warning' | 'critical';
  threshold: string;
  description: string;
}

interface ChainEvent {
  eventName: string;
  contract: string;
  blockNumber: number;
  txHash: string;
  timestamp: string;
  data: Record<string, string | number>;
}

interface AlertRule {
  id: string;
  name: string;
  condition: string;
  severity: 'critical' | 'warning' | 'info';
  status: 'active' | 'silenced' | 'disabled';
  triggerCount: number;
  lastTriggered: string;
}

interface Anomaly {
  description: string;
  detectionMethod: string;
  detectedAt: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'investigating' | 'resolved' | 'monitoring';
}

interface AnomalyDetection {
  status: 'monitoring' | 'anomaly_detected' | 'investigating' | 'resolved';
  anomalies: Anomaly[];
  baselineWindow: string;
  detectionMethod: string;
}

interface GrafanaDashboard {
  name: string;
  url: string;
  panels: number;
  lastUpdated: string;
}

// ── Deterministic Data ───────────────────────────────────────

const systemMetrics: SystemMetrics = {
  cpu: 34,
  memory: 62,
  memoryUsed: '8.2GB',
  memoryTotal: '16GB',
  diskUsage: 45,
  networkIn: 245,
  networkOut: 128,
  activeConnections: 1247,
  requestRate: 3420,
  errorRate: 0.12,
  p50Latency: 45,
  p95Latency: 180,
  p99Latency: 420,
};

const prometheusMetrics: PrometheusMetric[] = [
  {
    name: 'http_requests_total',
    value: 1284503,
    unit: 'requests',
    status: 'healthy',
    threshold: '> 5000/s warning',
    description: 'HTTP请求总数',
  },
  {
    name: 'http_request_duration_seconds',
    value: 0.045,
    unit: 'seconds',
    status: 'healthy',
    threshold: '> 0.5s warning, > 2s critical',
    description: 'HTTP请求延迟',
  },
  {
    name: 'circuit_breaker_state',
    value: 1,
    unit: 'gauge',
    status: 'healthy',
    threshold: '0=closed, 1=open, 2=half-open',
    description: '熔断器状态',
  },
  {
    name: 'resonance_score_gauge',
    value: 72,
    unit: 'score',
    status: 'healthy',
    threshold: '< 50 critical, < 70 warning',
    description: '共振分仪表',
  },
  {
    name: 'liquidity_pool_depth',
    value: 87500,
    unit: 'USD',
    status: 'healthy',
    threshold: '< 50000 critical',
    description: '流动性池深度',
  },
];

const chainEvents: ChainEvent[] = [
  {
    eventName: 'AvatarCreated',
    contract: 'AvatarCore',
    blockNumber: 28451020,
    txHash: '0xa3f1...8b2c',
    timestamp: '2026-05-25T18:30:00Z',
    data: { avatarId: '0x7a3f...9b2c', owner: '0xd4e2...1f3a' },
  },
  {
    eventName: 'SkillUnlocked',
    contract: 'SkillVault',
    blockNumber: 28451018,
    txHash: '0xb7c2...3e4d',
    timestamp: '2026-05-25T18:28:00Z',
    data: { skillId: 'SKILL-005', tier: 3, cost: 500 },
  },
  {
    eventName: 'RevenueSplit',
    contract: 'DynamicSplitter',
    blockNumber: 28451015,
    txHash: '0xc9d3...5f6e',
    timestamp: '2026-05-25T18:25:00Z',
    data: { totalAmount: '$125.50', humanShare: '$87.85', avatarShare: '$25.10', protocolShare: '$12.55' },
  },
  {
    eventName: 'CircuitStateChange',
    contract: 'CircuitGuard',
    blockNumber: 28451010,
    txHash: '0xd1e4...7a8b',
    timestamp: '2026-05-25T18:20:00Z',
    data: { from: 'NORMAL', to: 'SOFT_LIMIT', reason: '共振分低于70' },
  },
  {
    eventName: 'DelegationWeightUpdate',
    contract: 'IFDRouter',
    blockNumber: 28451005,
    txHash: '0xe5f6...9c0d',
    timestamp: '2026-05-25T18:15:00Z',
    data: { delegate: '0x1234...5678', weight: 150, domain: '技术治理' },
  },
  {
    eventName: 'TokensBurned',
    contract: 'TokenVault',
    blockNumber: 28451001,
    txHash: '0xf8a7...2b3c',
    timestamp: '2026-05-25T18:10:00Z',
    data: { amount: '5000 AFC', reason: '通缩回购' },
  },
  {
    eventName: 'LiquidityAdded',
    contract: 'TokenVault',
    blockNumber: 28450998,
    txHash: '0x1a2b...3c4d',
    timestamp: '2026-05-25T18:05:00Z',
    data: { amount: '$12,500', provider: '0xabcd...ef01' },
  },
  {
    eventName: 'AvatarUpdated',
    contract: 'AvatarCore',
    blockNumber: 28450990,
    txHash: '0x2b3c...4d5e',
    timestamp: '2026-05-25T18:00:00Z',
    data: { avatarId: '0x7a3f...9b2c', field: 'cognitionRoot', version: 'v2.1' },
  },
];

const alertRules: AlertRule[] = [
  {
    id: 'AR-001',
    name: '激活率偏低',
    condition: '7日激活率 < 80%',
    severity: 'warning',
    status: 'active',
    triggerCount: 2,
    lastTriggered: '2026-05-24T14:30:00Z',
  },
  {
    id: 'AR-002',
    name: '首笔收益延迟',
    condition: '中位时间 > 16h',
    severity: 'critical',
    status: 'active',
    triggerCount: 0,
    lastTriggered: '从未触发',
  },
  {
    id: 'AR-003',
    name: '熔断异常',
    condition: '1h触发率 > 12%',
    severity: 'warning',
    status: 'active',
    triggerCount: 3,
    lastTriggered: '2026-05-25T10:15:00Z',
  },
  {
    id: 'AR-004',
    name: '流动性不足',
    condition: 'LP深度 < $50K',
    severity: 'critical',
    status: 'active',
    triggerCount: 1,
    lastTriggered: '2026-05-23T08:00:00Z',
  },
  {
    id: 'AR-005',
    name: '支付失败',
    condition: '1h失败率 > 5%',
    severity: 'critical',
    status: 'active',
    triggerCount: 0,
    lastTriggered: '从未触发',
  },
  {
    id: 'AR-006',
    name: '共振采集延迟',
    condition: '延迟 > 5s',
    severity: 'warning',
    status: 'silenced',
    triggerCount: 8,
    lastTriggered: '2026-05-25T16:45:00Z',
  },
];

const anomalyDetection: AnomalyDetection = {
  status: 'monitoring',
  anomalies: [
    {
      description: '共振分异常波动',
      detectionMethod: 'score deviation > 2σ',
      detectedAt: '-2h',
      severity: 'medium',
      status: 'investigating',
    },
    {
      description: 'Gas费用突增',
      detectionMethod: '3x baseline',
      detectedAt: '-6h',
      severity: 'low',
      status: 'resolved',
    },
  ],
  baselineWindow: '7天滑动窗口',
  detectionMethod: '3σ 统计异常检测 + ZK证明验证',
};

const grafanaDashboards: GrafanaDashboard[] = [
  { name: '系统总览', url: 'https://grafana.example.com/d/sys-overview', panels: 12, lastUpdated: '2026-05-25T17:00:00Z' },
  { name: '链上指标', url: 'https://grafana.example.com/d/chain-metrics', panels: 8, lastUpdated: '2026-05-25T16:30:00Z' },
  { name: '性能分析', url: 'https://grafana.example.com/d/perf-analysis', panels: 10, lastUpdated: '2026-05-25T15:45:00Z' },
  { name: '安全监控', url: 'https://grafana.example.com/d/sec-monitor', panels: 6, lastUpdated: '2026-05-25T14:00:00Z' },
];

// ── Handler ──────────────────────────────────────────────────

export async function GET() {
  return NextResponse.json({
    systemMetrics,
    prometheusMetrics,
    chainEvents,
    alertRules,
    anomalyDetection,
    grafanaDashboards,
  });
}
