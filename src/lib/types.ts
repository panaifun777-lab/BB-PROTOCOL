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

// ===== Phase 3: 性能优化类型 =====

export interface WebVitalMetric {
  name: string;
  value: number;
  unit: string;
  target: number;
  status: 'good' | 'needs_improvement' | 'poor';
}

export interface CacheStrategyEntry {
  name: string;
  ttl: number;
  hitRate: number;
  swrInterval: number;
  type: string;
}

export interface CDNConfig {
  provider: string;
  edgeLocations: number;
  cacheHitRate: number;
  bandwidthSaved: string;
  ssl: string;
  http2: boolean;
  brotli: boolean;
}

export interface LazyLoadingModule {
  name: string;
  chunkSize: number;
  loadTime: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  loaded: boolean;
}

export interface PerformanceBudgetItem {
  category: string;
  current: number;
  budget: number;
  unit: string;
}

// ===== Phase 3: 链上部署类型 =====

export type DeployStatus = 'live' | 'deploying' | 'paused' | 'verifying';
export type ContractVerificationStatus = 'verified' | 'pending' | 'failed';

export interface ContractDeployment {
  name: string;
  address: string;
  version: string;
  status: ContractVerificationStatus;
  deployTx: string;
  verifiedAt: string;
  bytecodeSize: string;
  optimizerRuns: number;
}

export interface MultiSigSigner {
  name: string;
  address: string;
  confirmed: boolean;
}

export interface PendingOperation {
  description: string;
  confirmations: number;
  required: number;
}

export interface StateConsistencyCheck {
  name: string;
  status: 'match' | 'mismatch';
  sepoliaValue: string;
  mainnetValue: string;
  note?: string;
}

export interface PipelineStage {
  name: string;
  status: 'passed' | 'in_progress' | 'pending' | 'failed';
  detail?: string;
}

// ===== Phase 3: 监控告警类型 =====

export interface SystemMetrics {
  cpu: number;
  memory: number;
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

export interface PrometheusMetric {
  name: string;
  value: number;
  unit: string;
  status: 'healthy' | 'warning' | 'critical';
  threshold: string;
  description: string;
}

export interface ChainEvent {
  eventName: string;
  contract: string;
  blockNumber: number;
  txHash: string;
  timestamp: string;
  data: string;
}

export type AlertSeverity = 'critical' | 'warning' | 'info';
export type AlertStatus = 'active' | 'silenced' | 'disabled';

export interface AlertRule {
  id: string;
  name: string;
  condition: string;
  severity: AlertSeverity;
  status: AlertStatus;
  triggerCount7d: number;
  lastTriggered: string;
}

export interface AnomalyEntry {
  description: string;
  detectionMethod: string;
  detectedAt: string;
  severity: 'high' | 'medium' | 'low';
  status: 'investigating' | 'resolved' | 'monitoring';
}

// ===== Phase 3: 灰度发布类型 =====

export type FeatureFlagStatus = 'active' | 'inactive' | 'scheduled';
export type FeatureFlagEnvironment = 'production' | 'staging' | 'development';

export interface FeatureFlag {
  id: string;
  name: string;
  key: string;
  description: string;
  status: FeatureFlagStatus;
  rolloutPercentage: number;
  targetingRules: string;
  environment: FeatureFlagEnvironment;
  createdAt: string;
  updatedAt: string;
  enabledForUsers: number;
  totalUsers: number;
}

export type ABTestStatus = 'running' | 'completed' | 'draft';

export interface ABTestVariant {
  name: string;
  description: string;
  trafficPercent: number;
  metricValue: number;
  metricLabel: string;
}

export interface ABTest {
  id: string;
  name: string;
  description: string;
  status: ABTestStatus;
  variants: ABTestVariant[];
  startDate: string;
  endDate: string;
  winner?: string;
  confidence: number;
}

export interface RollbackEntry {
  id: string;
  flagName: string;
  action: 'deployed' | 'rolled_back' | 'paused' | 'resumed';
  reason: string;
  timestamp: string;
  operator: string;
}

export interface CanaryMetrics {
  errorRate: number;
  latencyP95: number;
  crashRate: number;
}

// ===== Phase 4: 多链部署类型 =====

export type ChainStatus = 'active' | 'pending' | 'planned';

export interface SupportedChain {
  id: string;
  name: string;
  chainId: number;
  color: string;
  icon: string;
  status: ChainStatus;
  blockHeight: number;
  gasPrice: string;
  avgBlockTime: string;
  contractsDeployed: number;
  tvl: number;
  lastSync: string;
}

export interface CrossChainBridge {
  id: string;
  name: string;
  sourceChain: string;
  targetChain: string;
  status: 'active' | 'pending';
  totalLocked: number;
  totalMinted: number;
  fee: string;
  avgTime: string;
  transactions24h: number;
}

export interface ChainSwitchRecord {
  id: string;
  fromChain: string;
  toChain: string;
  action: string;
  amount: number;
  status: 'completed' | 'pending' | 'failed';
  txHash: string;
  timestamp: string;
}

export interface StateSyncRecord {
  id: string;
  type: string;
  sourceChain: string;
  targetChain: string;
  lastSync: string;
  status: 'synced' | 'delayed' | 'error';
  latency: string;
}

export interface TvlHistoryPoint {
  date: string;
  base: number;
  ethereum: number;
  arbitrum: number;
}

// ===== Phase 4: SDK/API开放类型 =====

export type ApiMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
export type ApiStability = 'stable' | 'beta' | 'alpha';

export interface ApiEndpoint {
  method: ApiMethod;
  path: string;
  description: string;
  auth: string;
  rateLimit: string;
  status: ApiStability;
  version: string;
  category: string;
}

export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsed: string;
  status: 'active' | 'revoked';
  permissions: string[];
  rateLimit: string;
  usage30d: number;
}

export interface SdkPackage {
  name: string;
  version: string;
  language: string;
  downloads: number;
  description: string;
  status: ApiStability;
  size: string;
  lastUpdate: string;
}

export interface RateLimitQuota {
  tier: string;
  rpm: number;
  monthlyQuota: number | string;
  price: string;
}

export interface UsageHistoryPoint {
  date: string;
  calls: number;
  errors: number;
  avgLatency: number;
}

export interface WebhookConfig {
  id: string;
  url: string;
  events: string[];
  status: 'active' | 'paused';
  successRate: number;
  lastDelivery: string;
}

// ===== Phase 4: DAO治理类型 =====

export type ProposalCategory = 'economics' | 'technical' | 'security' | 'compliance' | 'community';
export type ProposalStatus = 'active' | 'passed' | 'defeated' | 'queued';

export interface GovernanceProposal {
  id: string;
  title: string;
  category: ProposalCategory;
  status: ProposalStatus;
  proposer: string;
  createdAt: string;
  endTime: string;
  description: string;
  votesFor: number;
  votesAgainst: number;
  votesAbstain: number;
  totalVotingPower: number;
  quorum: number;
  executionHash: string;
  riskAssessment: 'low' | 'medium' | 'high';
  executedAt?: string;
}

export interface VotingStats {
  totalVoters: number;
  participationRate: number;
  averageQuorum: number;
  proposalsTotal: number;
  proposalsPassed: number;
  proposalsActive: number;
  proposalsDefeated: number;
}

export interface DelegationEdge {
  delegator: string;
  delegatee: string;
  weight: number;
  domain: string;
  isActive: boolean;
}

export interface TopDelegate {
  address: string;
  name: string;
  votingPower: number;
  proposalsVoted: number;
  agreementRate: number;
  delegators: number;
  domains: string[];
}

export interface TreasuryTransaction {
  type: 'income' | 'expense';
  amount: number;
  description: string;
  txHash: string;
  timestamp: string;
}

export interface TreasuryData {
  balance: number;
  currency: string;
  allocated: number;
  available: number;
  monthlyIncome: number;
  monthlyExpense: number;
  recentTransactions: TreasuryTransaction[];
}

export interface GovernanceParams {
  votingPeriod: string;
  proposalThreshold: string;
  quorum: string;
  executionDelay: string;
  timeLock: string;
}

// ===== Phase 4: 生态集成类型 =====

export type ProtocolStatus = 'integrated' | 'pending' | 'planned';

export interface ProtocolIntegration {
  id: string;
  name: string;
  category: string;
  icon: string;
  status: ProtocolStatus;
  description: string;
  integrationDate: string;
  tvl: number;
  volume24h: number;
  users: number;
}

export type WalletSupport = 'full' | 'partial' | 'planned';

export interface WalletIntegration {
  name: string;
  icon: string;
  support: WalletSupport;
  users: number;
  features: string[];
}

export interface DataSource {
  name: string;
  provider: string;
  records: number;
  freshness: string;
  status: 'active' | 'delayed';
}

export interface PipelineStageInfo {
  stage: string;
  status: 'running' | 'stopped';
  throughput: string;
  latency: string;
}

export interface EcosystemNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  read: boolean;
  createdAt: string;
}

export interface PartnerTier {
  name: string;
  requirements: string;
  benefits: string;
  partners: number;
}

export interface ActivityFeedItem {
  protocol: string;
  event: string;
  timestamp: string;
  type: string;
}

// ===== Phase 5: 合约架构类型 =====

export type ContractCategory = 'core' | 'economics' | 'security' | 'governance';

export interface ContractFunctionDef {
  name: string;
  visibility: string;
  mutability: string;
  gasEstimate: number;
  params: string[];
  returns: string;
}

export interface ContractArchDef {
  id: string;
  name: string;
  filename: string;
  category: ContractCategory;
  description: string;
  version: string;
  linesOfCode: number;
  optimizerRuns: number;
  bytecodeSize: string;
  deployed: boolean;
  address: string;
  functions: ContractFunctionDef[];
  events: string[];
  stateVariables: string[];
  inherits: string[];
  securityPatterns: string[];
}

export interface ContractInteraction {
  from: string;
  to: string;
  type: string;
  description: string;
}

export interface InvariantTest {
  name: string;
  formula: string;
  status: 'pass' | 'fail';
  counterexamples: number;
}

export interface GasReportEntry {
  contract: string;
  function: string;
  gas: number;
  gasCost: string;
  optimization: string;
}

export interface VerificationEntry {
  contract: string;
  tool: string;
  status: string;
  invariants?: number;
  counterexamples?: number;
  findings?: number;
  highCritical?: number;
  lastRun: string;
}

// ===== Phase 5: 引擎架构类型 =====

export type EngineModuleCategory = 'core' | 'oracle' | 'zkp' | 'discovery' | 'economics' | 'monitoring';
export type EngineModuleStatus = 'production' | 'beta' | 'alpha';

export interface EngineFunction {
  name: string;
  signature: string;
  description: string;
  complexity: string;
}

export interface MathParameter {
  symbol: string;
  name: string;
  value: number;
  description: string;
}

export interface MathModel {
  formula: string;
  parameters: MathParameter[];
}

export interface EngineModule {
  id: string;
  name: string;
  category: EngineModuleCategory;
  description: string;
  version: string;
  linesOfCode: number;
  status: EngineModuleStatus;
  performanceMs: number;
  throughput: string;
  memoryUsage: string;
  functions: EngineFunction[];
  mathModel: MathModel;
  tests: { unit: number; property: number; benchmark: number; passing: number };
}

export interface BenchmarkEntry {
  operation: string;
  p50: number;
  p95: number;
  p99: number;
  unit: string;
}

// ===== Phase 5: Web3集成类型 =====

export type WalletConnectionStatus = 'connected' | 'available';

export interface WalletConnection {
  wallet: string;
  status: WalletConnectionStatus;
  address: string;
  chainId: number;
  chainName: string;
  balance: string;
  balanceUsd: string;
  lastConnected: string;
}

export type ContractInteractionStatus = 'available' | 'restricted';

export interface ContractInteractionDef {
  contract: string;
  function: string;
  status: ContractInteractionStatus;
  gasEstimate: string;
  gasCost: string;
  lastCalled: string;
  calls24h: number;
}

export interface EventSubscription {
  event: string;
  contract: string;
  status: 'subscribed' | 'unsubscribed';
  events24h: number;
  lastEvent: string;
}

export type TxStatus = 'confirmed' | 'pending' | 'failed';

export interface TransactionRecord {
  id: string;
  type: string;
  contract: string;
  function: string;
  hash: string;
  status: TxStatus;
  gasUsed: number;
  gasCost: string;
  blockNumber: number;
  timestamp: string;
}

// ===== Phase 5: 数据基建类型 =====

export interface SubgraphEntityCount {
  avatars: number;
  skills: number;
  revenueSplits: number;
  delegations: number;
  circuitEvents: number;
  resonanceUpdates: number;
}

export interface EventHandler {
  event: string;
  entity: string;
  field: string;
  indexed: boolean;
}

export interface GraphQLExample {
  name: string;
  query: string;
}

export interface IPFSPin {
  cid: string;
  type: string;
  size: string;
  pinnedAt: string;
  status: 'pinned' | 'pinning';
}

export interface DataFlowPath {
  source: string;
  target: string;
  method: string;
  latency: string;
  freshness: string;
}

export interface ZustandStore {
  name: string;
  slices: string[];
  persist: boolean;
  size: string;
  subscribers: number;
}
