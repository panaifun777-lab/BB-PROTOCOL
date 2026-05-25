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

// ===== Phase 2: 安全审计类型 =====

export type InvariantStatus = 'pass' | 'fail' | 'unknown';
export type InvariantCategory = 'split_conservation' | 'weight_norm' | 'circuit_intercept' | 'sybil_resistance';

export interface SecurityInvariant {
  id: string;
  name: string;
  formula: string;
  category: InvariantCategory;
  status: InvariantStatus;
  counterexamples: number;
  lastVerified: string;
  proverRuns?: number;
  fuzzRuns?: number;
  branchCoverage?: number;
  proofMethod?: string;
}

export type FindingSeverity = 'critical' | 'high' | 'medium' | 'low';
export type FindingStatus = 'fixed' | 'pending' | 'accepted_risk';

export interface SecurityFinding {
  id: string;
  severity: FindingSeverity;
  title: string;
  contract: string;
  function: string;
  description: string;
  status: FindingStatus;
}

export type AuditEventType = 'invariant_check' | 'vulnerability_detected' | 'circuit_trigger' | 'access_change';

export interface AuditLogEntry {
  id: string;
  type: AuditEventType;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info' | 'warn';
  details: string;
  txHash?: string;
  createdAt: string;
}

// ===== Phase 2: LP流动性类型 =====

export interface LiquidityPoolData {
  pair: string;
  totalLiquidity: number;
  afcReserve: number;
  usdcReserve: number;
  afcPrice: number;
  priceChange24h: number;
  volume24h: number;
  fees24h: number;
  feeRate: number;
}

export interface TokenEconomics {
  totalSupply: number;
  circulatingSupply: number;
  burnRate: number;
  buybackRate: number;
  valueCaptureRate: number;
  monthlyBurn: { month: string; burned: number }[];
}

export interface StakingInfo {
  totalStaked: number;
  apy: number;
  stakers: number;
  minStake: number;
  lockPeriod: string;
  rewardsDistributed: number;
}

export interface DepthDataPoint {
  price: number;
  bidLiquidity: number;
  askLiquidity: number;
}

export type LpTxType = 'add_liquidity' | 'remove_liquidity' | 'swap';

export interface LpTransaction {
  id: string;
  type: LpTxType;
  amountAfc: number;
  amountUsdc: number;
  direction?: 'buy' | 'sell';
  txHash: string;
  createdAt: string;
}

// ===== Phase 2: 合规类型 =====

export type CompliancePluginId = 'kyc' | 'tax' | 'zk_privacy' | 'geo' | 'arbitration';

export interface CompliancePluginData {
  id: CompliancePluginId;
  name: string;
  label: string;
  icon: string;
  description: string;
  isActive: boolean;
  activationCondition: string;
  futureIntegration: string;
  status: 'active' | 'inactive';
}

export type JurisdictionStatus = 'in_progress' | 'pending' | 'active' | 'not_required';

export interface JurisdictionData {
  id: string;
  name: string;
  flag: string;
  entityName: string;
  status: JurisdictionStatus;
  statusLabel: string;
  lawFramework: string;
}

export interface LegalStatus {
  tokenClassification: string;
  classificationStatus: 'confirmed' | 'pending' | 'under_review';
  legalOpinion: string;
  opinionDate: string;
  complianceOfficer: string;
}

export interface RiskConfig {
  low: { threshold: number; confirmation: string; timeout: number };
  medium: { threshold: number; confirmation: string; timeout: number };
  high: { threshold: number; confirmation: string; timeout: number };
}

export interface AccessibilityAudit {
  lighthouseScore: number;
  colorContrast: 'pass' | 'fail';
  keyboardNav: 'pass' | 'fail' | 'partial';
  screenReader: 'pass' | 'fail' | 'partial';
  ariaLabels: number;
  ariaMissing: number;
}

// ===== Phase 2: 合约模拟类型 =====

export interface ContractFunction {
  name: string;
  inputs: { name: string; type: string }[];
  gasEstimate: number;
}

export interface ContractInfo {
  id: string;
  name: string;
  description: string;
  address: string;
  functions: ContractFunction[];
}

export interface SimulationResult {
  success: boolean;
  result: Record<string, unknown>;
  gasEstimate: { units: number; costUsd: number };
  verification?: { status: 'pass' | 'fail'; details: string };
  timestamp: string;
}

export interface SimulationHistoryEntry {
  id: string;
  contract: string;
  function: string;
  params: Record<string, unknown>;
  result: string;
  gasUsed: number;
  timestamp: string;
}
