// ===== AI分身系统 — 全局类型定义 =====

// 认知分身档案
export interface AvatarProfile {
  id: string;
  soulId: string;
  ownerAddress: string;
  name: string;
  cognitionRoot: string;
  resonanceScore: number;
  avatarBalance: number;
  circuitState: CircuitState;
  isFrozen: boolean;
  tier: 'starter' | 'pro' | 'enterprise';
  createdAt: string;
  lastActivityAt: string;
}

// 熔断状态枚举
export type CircuitState = 'NORMAL' | 'SOFT_LIMIT' | 'HARD_PAUSE' | 'RECOVERY';

// 技能定义
export interface Skill {
  id: string;
  name: string;
  description: string;
  tier: number;
  revenueThreshold: number;
  mcpEndpoint?: string;
  icon?: string;
  category: 'general' | 'rag' | 'multimodal' | 'collaboration';
}

// 分身技能关联
export interface AvatarSkill {
  id: string;
  skill: Skill;
  unlocked: boolean;
  usageCount: number;
  satisfaction: number;
  avgCost: number;
  unlockedAt?: string;
}

// 收益分账记录
export interface RevenueSplit {
  id: string;
  totalAmount: number;
  humanShare: number;
  avatarShare: number;
  protocolShare: number;
  humanBps: number;
  avatarBps: number;
  protocolBps: number;
  source: 'skill_call' | 'rental' | 'collaboration';
  txHash?: string;
  createdAt: string;
}

// 收益汇总
export interface RevenueSummary {
  totalRevenue: number;
  totalHuman: number;
  totalAvatar: number;
  totalProtocol: number;
  currentHumanBps: number;
  currentAvatarBps: number;
  currentProtocolBps: number;
  resonanceImpact: string;
  monthlyRevenue: { month: string; amount: number }[];
}

// 委托关系
export interface Delegation {
  id: string;
  domain: string;
  delegateName: string;
  delegateAddr?: string;
  weight: number;
  isActive: boolean;
  createdAt: string;
  revokedAt?: string;
}

// 时间线事件
export interface TimelineEvent {
  id: string;
  eventType: 'skill_invocation' | 'revenue_received' | 'resonance_update' | 'delegation_change' | 'circuit_change';
  details: string;
  txHash?: string;
  ipfsHash?: string;
  amount?: number;
  createdAt: string;
}

// 共振分历史数据点
export interface ResonanceDataPoint {
  time: string;
  score: number;
}

// x402支付流程
export interface X402PaymentFlow {
  estimate: {
    service: string;
    amount: number;
    currency: string;
    gasFee: number;
    splitPreview: {
      human: number;
      avatar: number;
      protocol: number;
    };
  };
  confirmation: {
    method: 'wallet_sign' | 'biometric' | 'auto_approved';
    timeout: number;
  };
  receipt?: {
    txHash: string;
    timestamp: number;
    actualSplit: {
      human: number;
      avatarTreasuryBalance: number;
      protocolLpAdded: number;
    };
  };
}

// Dashboard全局状态
export interface DashboardState {
  avatar: AvatarProfile;
  skills: AvatarSkill[];
  revenueSummary: RevenueSummary;
  recentRevenues: RevenueSplit[];
  delegations: Delegation[];
  timeline: TimelineEvent[];
  resonanceHistory: ResonanceDataPoint[];
}
