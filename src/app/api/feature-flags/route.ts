import { NextRequest, NextResponse } from 'next/server';

// ── Types ──────────────────────────────────────────────
type FlagStatus = 'active' | 'inactive' | 'scheduled';
type Environment = 'production' | 'staging' | 'development';
type TargetingRule = 'all' | 'tier_pro' | 'opt_in' | 'beta_testers' | 'internal_only' | 'enterprise_only' | 'premium_users';

interface FeatureFlag {
  id: string;
  name: string;
  key: string;
  description: string;
  status: FlagStatus;
  rolloutPercentage: number;
  targetingRules: TargetingRule;
  environment: Environment;
  createdAt: string;
  updatedAt: string;
  enabledForUsers: number;
  totalUsers: number;
  scheduledDate?: string;
}

type ABTestStatus = 'running' | 'completed' | 'draft';

interface ABTestVariant {
  name: string;
  description: string;
  trafficPercent: number;
  metricChange?: string;
  metricValue?: string;
}

interface ABTest {
  id: string;
  name: string;
  description: string;
  status: ABTestStatus;
  variants: ABTestVariant[];
  startDate: string;
  endDate?: string;
  winner?: string;
  confidence?: number;
  metrics: Record<string, string>;
}

type RollbackAction = 'deployed' | 'rolled_back' | 'paused' | 'resumed';

interface RollbackHistoryEntry {
  id: string;
  flagName: string;
  action: RollbackAction;
  reason: string;
  timestamp: string;
  operator: string;
}

interface PipelineStage {
  name: string;
  status: 'completed' | 'in_progress' | 'pending';
  details: string;
}

interface CanaryMetric {
  name: string;
  value: string;
  threshold: string;
  passing: boolean;
}

interface ReleasePipeline {
  currentVersion: string;
  nextVersion: string;
  pipeline: PipelineStage[];
  canaryMetrics: CanaryMetric[];
  canaryPercentage: number;
}

// ── Deterministic Mock Data ────────────────────────────
const INITIAL_FLAGS: FeatureFlag[] = [
  {
    id: 'ff_01',
    name: '分身市场',
    key: 'avatar-marketplace',
    description: '分身租赁市场，支持认知分身的共享与变现',
    status: 'active',
    rolloutPercentage: 100,
    targetingRules: 'all',
    environment: 'production',
    createdAt: '2025-12-01T08:00:00Z',
    updatedAt: '2026-02-28T10:00:00Z',
    enabledForUsers: 12847,
    totalUsers: 12847,
  },
  {
    id: 'ff_02',
    name: '合约模拟器',
    key: 'contract-simulation',
    description: '智能合约模拟执行与Gas估算工具',
    status: 'active',
    rolloutPercentage: 75,
    targetingRules: 'tier_pro',
    environment: 'production',
    createdAt: '2026-01-15T08:00:00Z',
    updatedAt: '2026-02-28T14:00:00Z',
    enabledForUsers: 6423,
    totalUsers: 8564,
  },
  {
    id: 'ff_03',
    name: 'LP流动性面板',
    key: 'lp-liquidity',
    description: '流动性提供者仪表盘，深度图与代币经济',
    status: 'active',
    rolloutPercentage: 50,
    targetingRules: 'opt_in',
    environment: 'production',
    createdAt: '2026-01-20T08:00:00Z',
    updatedAt: '2026-02-25T16:00:00Z',
    enabledForUsers: 3200,
    totalUsers: 6400,
  },
  {
    id: 'ff_04',
    name: 'IFD v2 委托',
    key: 'ifd-v2-delegation',
    description: '流体民主委托系统v2，支持多级委托与权重衰减',
    status: 'active',
    rolloutPercentage: 25,
    targetingRules: 'beta_testers',
    environment: 'production',
    createdAt: '2026-02-01T08:00:00Z',
    updatedAt: '2026-02-27T09:00:00Z',
    enabledForUsers: 856,
    totalUsers: 3424,
  },
  {
    id: 'ff_05',
    name: 'ZK实体验证',
    key: 'zk-identity',
    description: '零知识证明身份验证，隐私保护的身份认证',
    status: 'inactive',
    rolloutPercentage: 0,
    targetingRules: 'internal_only',
    environment: 'staging',
    createdAt: '2026-02-10T08:00:00Z',
    updatedAt: '2026-02-10T08:00:00Z',
    enabledForUsers: 0,
    totalUsers: 150,
  },
  {
    id: 'ff_06',
    name: '多链部署',
    key: 'multi-chain',
    description: '多链部署支持，跨链分身同步',
    status: 'inactive',
    rolloutPercentage: 0,
    targetingRules: 'internal_only',
    environment: 'development',
    createdAt: '2026-02-15T08:00:00Z',
    updatedAt: '2026-02-15T08:00:00Z',
    enabledForUsers: 0,
    totalUsers: 45,
  },
  {
    id: 'ff_07',
    name: 'DAO治理模块',
    key: 'dao-governance',
    description: '去中心化治理提案与投票系统',
    status: 'scheduled',
    rolloutPercentage: 0,
    targetingRules: 'all',
    environment: 'production',
    createdAt: '2026-02-20T08:00:00Z',
    updatedAt: '2026-02-20T08:00:00Z',
    enabledForUsers: 0,
    totalUsers: 12847,
    scheduledDate: '2026-04-01T00:00:00Z',
  },
  {
    id: 'ff_08',
    name: 'SDK/API平台',
    key: 'sdk-api',
    description: '开发者SDK与API管理平台',
    status: 'inactive',
    rolloutPercentage: 0,
    targetingRules: 'enterprise_only',
    environment: 'staging',
    createdAt: '2026-02-18T08:00:00Z',
    updatedAt: '2026-02-18T08:00:00Z',
    enabledForUsers: 0,
    totalUsers: 200,
  },
  {
    id: 'ff_09',
    name: '跨链桥集成',
    key: 'cross-chain-bridge',
    description: '跨链桥协议集成，支持资产跨链转移',
    status: 'inactive',
    rolloutPercentage: 0,
    targetingRules: 'internal_only',
    environment: 'development',
    createdAt: '2026-02-22T08:00:00Z',
    updatedAt: '2026-02-22T08:00:00Z',
    enabledForUsers: 0,
    totalUsers: 45,
  },
  {
    id: 'ff_10',
    name: '高级分析',
    key: 'advanced-analytics',
    description: '高级数据分析与BI可视化工具',
    status: 'active',
    rolloutPercentage: 10,
    targetingRules: 'premium_users',
    environment: 'production',
    createdAt: '2026-02-25T08:00:00Z',
    updatedAt: '2026-02-28T11:00:00Z',
    enabledForUsers: 128,
    totalUsers: 1280,
  },
];

const INITIAL_AB_TESTS: ABTest[] = [
  {
    id: 'ab_01',
    name: '分账比例优化',
    description: '测试不同分账比例对收益和用户行为的影响',
    status: 'running',
    variants: [
      { name: 'Control', description: '70/20/10 分账比例', trafficPercent: 45, metricChange: 'baseline', metricValue: '100%' },
      { name: 'Variant A', description: '65/25/10 分账比例', trafficPercent: 45, metricChange: '+8.2%', metricValue: '108.2%' },
      { name: 'Variant B', description: '75/15/10 分账比例', trafficPercent: 10, metricChange: '-3.1%', metricValue: '96.9%' },
    ],
    startDate: '2026-02-15T00:00:00Z',
    confidence: 87,
    metrics: { primary: 'revenue', secondary: 'user_retention' },
  },
  {
    id: 'ab_02',
    name: '技能解锁门槛',
    description: '测试降低技能解锁门槛对解锁率和收入的影响',
    status: 'completed',
    variants: [
      { name: 'Control', description: '$500/$2000/$8000 门槛', trafficPercent: 50, metricChange: 'baseline', metricValue: '100%' },
      { name: 'Variant', description: '$300/$1500/$6000 门槛', trafficPercent: 50, metricChange: '+34%', metricValue: '134%' },
    ],
    startDate: '2026-01-15T00:00:00Z',
    endDate: '2026-02-28T00:00:00Z',
    winner: 'Variant',
    confidence: 95,
    metrics: { primary: 'unlock_rate', secondary: 'revenue' },
  },
  {
    id: 'ab_03',
    name: '共振分UI展示',
    description: '测试共振分不同展示方式的用户交互效果',
    status: 'draft',
    variants: [
      { name: 'Control', description: '数值显示', trafficPercent: 50 },
      { name: 'Variant', description: '波形+数值', trafficPercent: 50 },
    ],
    startDate: '2026-03-15T00:00:00Z',
    metrics: { primary: 'engagement', secondary: 'session_duration' },
  },
];

const INITIAL_ROLLBACK_HISTORY: RollbackHistoryEntry[] = [
  {
    id: 'rb_01',
    flagName: 'contract-simulation',
    action: 'deployed',
    reason: '灰度放量第三阶段',
    timestamp: '2026-02-28T14:00:00Z',
    operator: 'devops_lead',
  },
  {
    id: 'rb_02',
    flagName: 'contract-simulation',
    action: 'paused',
    reason: '发现Gas估算偏差',
    timestamp: '2026-02-25T16:00:00Z',
    operator: 'devops_lead',
  },
  {
    id: 'rb_03',
    flagName: 'contract-simulation',
    action: 'resumed',
    reason: 'Gas估算修复完成',
    timestamp: '2026-02-20T10:00:00Z',
    operator: 'engineer_zhang',
  },
  {
    id: 'rb_04',
    flagName: 'contract-simulation',
    action: 'rolled_back',
    reason: '模拟结果不一致',
    timestamp: '2026-02-15T18:00:00Z',
    operator: 'engineer_li',
  },
  {
    id: 'rb_05',
    flagName: 'contract-simulation',
    action: 'deployed',
    reason: '开始灰度发布',
    timestamp: '2026-02-10T09:00:00Z',
    operator: 'devops_lead',
  },
];

const INITIAL_RELEASE_PIPELINE: ReleasePipeline = {
  currentVersion: 'v2.1.0',
  nextVersion: 'v2.2.0',
  pipeline: [
    { name: '代码合并', status: 'completed', details: '12 commits' },
    { name: '自动化测试', status: 'completed', details: '97.2% pass' },
    { name: 'Canary部署(5%)', status: 'in_progress', details: '5% 流量' },
    { name: '灰度扩展(25%→50%→75%)', status: 'pending', details: '渐进放量' },
    { name: '全量发布(100%)', status: 'pending', details: '全量上线' },
  ],
  canaryMetrics: [
    { name: '错误率', value: '0.08%', threshold: '< 1%', passing: true },
    { name: 'P95延迟', value: '165ms', threshold: '< 500ms', passing: true },
    { name: '崩溃率', value: '0%', threshold: '< 0.1%', passing: true },
  ],
  canaryPercentage: 5,
};

// ── In-memory state (allows POST mutations) ────────────
let flags: FeatureFlag[] = JSON.parse(JSON.stringify(INITIAL_FLAGS));
let abTests: ABTest[] = JSON.parse(JSON.stringify(INITIAL_AB_TESTS));
const rollbackHistory: RollbackHistoryEntry[] = JSON.parse(JSON.stringify(INITIAL_ROLLBACK_HISTORY));
let releasePipeline: ReleasePipeline = JSON.parse(JSON.stringify(INITIAL_RELEASE_PIPELINE));

// ── GET Handler ────────────────────────────────────────
export async function GET() {
  try {
    const activeCount = flags.filter((f) => f.status === 'active').length;
    const inactiveCount = flags.filter((f) => f.status === 'inactive').length;
    const scheduledCount = flags.filter((f) => f.status === 'scheduled').length;

    return NextResponse.json({
      featureFlags: flags,
      abTests,
      rollbackHistory,
      releasePipeline,
      stats: {
        active: activeCount,
        inactive: inactiveCount,
        scheduled: scheduledCount,
        total: flags.length,
      },
    });
  } catch (error) {
    console.error('[API] Error in GET /api/feature-flags:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// ── POST Handler ───────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, flagId, data } = body as {
      action: 'toggle' | 'update_rollout' | 'rollback' | 'create_ab_test';
      flagId?: string;
      data?: Record<string, unknown>;
    };

    switch (action) {
      case 'toggle': {
        if (!flagId) {
          return NextResponse.json({ success: false, error: 'flagId is required' }, { status: 400 });
        }
        const flag = flags.find((f) => f.id === flagId);
        if (!flag) {
          return NextResponse.json({ success: false, error: 'Flag not found' }, { status: 404 });
        }
        flag.status = flag.status === 'active' ? 'inactive' : 'active';
        flag.updatedAt = new Date().toISOString();
        if (flag.status === 'inactive') {
          flag.rolloutPercentage = 0;
          flag.enabledForUsers = 0;
        }
        return NextResponse.json({ success: true, data: flag });
      }

      case 'update_rollout': {
        if (!flagId || !data) {
          return NextResponse.json({ success: false, error: 'flagId and data are required' }, { status: 400 });
        }
        const flag = flags.find((f) => f.id === flagId);
        if (!flag) {
          return NextResponse.json({ success: false, error: 'Flag not found' }, { status: 404 });
        }
        const newPercentage = Number(data.rolloutPercentage);
        if (Number.isNaN(newPercentage) || newPercentage < 0 || newPercentage > 100) {
          return NextResponse.json({ success: false, error: 'Invalid rollout percentage' }, { status: 400 });
        }
        flag.rolloutPercentage = newPercentage;
        flag.enabledForUsers = Math.round((newPercentage / 100) * flag.totalUsers);
        flag.updatedAt = new Date().toISOString();
        if (newPercentage > 0 && flag.status === 'inactive') {
          flag.status = 'active';
        }
        return NextResponse.json({ success: true, data: flag });
      }

      case 'rollback': {
        if (!flagId) {
          return NextResponse.json({ success: false, error: 'flagId is required' }, { status: 400 });
        }
        const flag = flags.find((f) => f.id === flagId);
        if (!flag) {
          return NextResponse.json({ success: false, error: 'Flag not found' }, { status: 404 });
        }
        const previousPercentage = flag.rolloutPercentage;
        const rollbackPercentage = Number(data?.rolloutPercentage) || 0;
        flag.rolloutPercentage = rollbackPercentage;
        flag.enabledForUsers = Math.round((rollbackPercentage / 100) * flag.totalUsers);
        if (rollbackPercentage === 0) {
          flag.status = 'inactive';
        }
        flag.updatedAt = new Date().toISOString();

        const newEntry: RollbackHistoryEntry = {
          id: `rb_${String(rollbackHistory.length + 1).padStart(2, '0')}`,
          flagName: flag.key,
          action: 'rolled_back',
          reason: `回滚 ${previousPercentage}% → ${rollbackPercentage}%`,
          timestamp: new Date().toISOString(),
          operator: 'admin',
        };
        rollbackHistory.unshift(newEntry);

        return NextResponse.json({ success: true, data: flag, rollbackEntry: newEntry });
      }

      case 'create_ab_test': {
        if (!data) {
          return NextResponse.json({ success: false, error: 'data is required' }, { status: 400 });
        }
        const newTest: ABTest = {
          id: `ab_${String(abTests.length + 1).padStart(2, '0')}`,
          name: String(data.name || 'New A/B Test'),
          description: String(data.description || ''),
          status: 'draft',
          variants: Array.isArray(data.variants)
            ? (data.variants as ABTestVariant[])
            : [
                { name: 'Control', description: '对照组', trafficPercent: 50 },
                { name: 'Variant', description: '实验组', trafficPercent: 50 },
              ],
          startDate: String(data.startDate || new Date().toISOString()),
          metrics: (data.metrics as Record<string, string>) || { primary: 'conversion' },
        };
        abTests.push(newTest);
        return NextResponse.json({ success: true, data: newTest });
      }

      default:
        return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('[API] Error in POST /api/feature-flags:', error);
    return NextResponse.json({ success: false, error: 'Invalid request body', message: error instanceof Error ? error.message : 'Unknown error' }, { status: 400 });
  }
}
