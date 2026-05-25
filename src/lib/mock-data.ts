// ===== AI分身系统 — Mock数据 (Phase 0 开发阶段) =====

import type {
  AvatarProfile,
  AvatarSkill,
  RevenueSplit,
  RevenueSummary,
  Delegation,
  TimelineEvent,
  ResonanceDataPoint,
  Skill,
} from './types';

// ----- 基础技能列表 -----
export const ALL_SKILLS: Skill[] = [
  { id: 's1', name: 'GPT-4o 文本生成', description: '高质量文案、脚本、邮件生成', tier: 1, revenueThreshold: 100, icon: '✍️', category: 'general' },
  { id: 's2', name: '智能客服', description: '7×24自动客户对话与问题解决', tier: 1, revenueThreshold: 100, icon: '🎯', category: 'general' },
  { id: 's3', name: '数据分析', description: '数据清洗、可视化与洞察报告', tier: 1, revenueThreshold: 100, icon: '📊', category: 'general' },
  { id: 's4', name: '高级RAG检索', description: '语义检索增强生成，知识库深度调用', tier: 2, revenueThreshold: 500, icon: '🔍', category: 'rag' },
  { id: 's5', name: '知识图谱构建', description: '自动构建领域知识图谱', tier: 2, revenueThreshold: 500, icon: '🧠', category: 'rag' },
  { id: 's6', name: 'DALL·E 3 图像生成', description: '营销海报、产品图、社交媒体图', tier: 3, revenueThreshold: 1500, icon: '🎨', category: 'multimodal' },
  { id: 's7', name: '视频分身生成', description: '基于HeyGen的数字人视频', tier: 3, revenueThreshold: 1500, icon: '🎬', category: 'multimodal' },
  { id: 's8', name: '跨分身协作', description: '多分身联合推理与任务协同', tier: 4, revenueThreshold: 5000, icon: '🤝', category: 'collaboration' },
  { id: 's9', name: '联合推理引擎', description: '多分身共识决策与复杂任务拆解', tier: 4, revenueThreshold: 5000, icon: '⚡', category: 'collaboration' },
];

// ----- 当前分身 -----
export const MOCK_AVATAR: AvatarProfile = {
  id: 'av_001',
  soulId: '0x7a3f...9b2c',
  ownerAddress: '0x7a3f8c2d1e5b4a6f9d0c3e7b8a2f1d5c4b6e9a0f',
  name: '飘叔.soul',
  cognitionRoot: 'QmX7kP9mN2qR5sT8vW1yZ4aB6cD8eF0gH2jK4mN6oP8',
  resonanceScore: 72,
  avatarBalance: 1245.80,
  circuitState: 'NORMAL',
  isFrozen: false,
  tier: 'pro',
  createdAt: '2026-01-15T08:00:00Z',
  lastActivityAt: '2026-03-04T14:32:18Z',
};

// ----- 分身技能 -----
export const MOCK_AVATAR_SKILLS: AvatarSkill[] = [
  { id: 'as1', skill: ALL_SKILLS[0], unlocked: true, usageCount: 142, satisfaction: 94, avgCost: 0.018, unlockedAt: '2026-01-20T10:00:00Z' },
  { id: 'as2', skill: ALL_SKILLS[1], unlocked: true, usageCount: 87, satisfaction: 91, avgCost: 0.012, unlockedAt: '2026-01-20T10:00:00Z' },
  { id: 'as3', skill: ALL_SKILLS[2], unlocked: true, usageCount: 56, satisfaction: 88, avgCost: 0.025, unlockedAt: '2026-01-22T14:00:00Z' },
  { id: 'as4', skill: ALL_SKILLS[3], unlocked: true, usageCount: 34, satisfaction: 92, avgCost: 0.035, unlockedAt: '2026-02-10T09:00:00Z' },
  { id: 'as5', skill: ALL_SKILLS[4], unlocked: true, usageCount: 18, satisfaction: 85, avgCost: 0.040, unlockedAt: '2026-02-15T16:00:00Z' },
  { id: 'as6', skill: ALL_SKILLS[5], unlocked: false, usageCount: 0, satisfaction: 0, avgCost: 0, unlockedAt: undefined },
  { id: 'as7', skill: ALL_SKILLS[6], unlocked: false, usageCount: 0, satisfaction: 0, avgCost: 0, unlockedAt: undefined },
  { id: 'as8', skill: ALL_SKILLS[7], unlocked: false, usageCount: 0, satisfaction: 0, avgCost: 0, unlockedAt: undefined },
  { id: 'as9', skill: ALL_SKILLS[8], unlocked: false, usageCount: 0, satisfaction: 0, avgCost: 0, unlockedAt: undefined },
];

// ----- 收益汇总 -----
export const MOCK_REVENUE_SUMMARY: RevenueSummary = {
  totalRevenue: 12450.00,
  totalHuman: 8715.00,
  totalAvatar: 2490.00,
  totalProtocol: 1245.00,
  currentHumanBps: 7000,
  currentAvatarBps: 2000,
  currentProtocolBps: 1000,
  resonanceImpact: '共振分72 → 人类份额+2%',
  monthlyRevenue: [
    { month: '2025-10', amount: 820 },
    { month: '2025-11', amount: 1450 },
    { month: '2025-12', amount: 2100 },
    { month: '2026-01', amount: 2800 },
    { month: '2026-02', amount: 3240 },
    { month: '2026-03', amount: 2040 },
  ],
};

// ----- 最近分账记录 -----
export const MOCK_REVENUES: RevenueSplit[] = [
  { id: 'r1', totalAmount: 45.20, humanShare: 31.64, avatarShare: 9.04, protocolShare: 4.52, humanBps: 7000, avatarBps: 2000, protocolBps: 1000, source: 'skill_call', txHash: '0xab12...cd34', createdAt: '2026-03-04T14:32:18Z' },
  { id: 'r2', totalAmount: 128.00, humanShare: 89.60, avatarShare: 25.60, protocolShare: 12.80, humanBps: 7000, avatarBps: 2000, protocolBps: 1000, source: 'rental', txHash: '0xef56...gh78', createdAt: '2026-03-04T10:15:42Z' },
  { id: 'r3', totalAmount: 12.50, humanShare: 8.75, avatarShare: 2.50, protocolShare: 1.25, humanBps: 7000, avatarBps: 2000, protocolBps: 1000, source: 'skill_call', txHash: '0xij90...kl12', createdAt: '2026-03-03T22:08:11Z' },
  { id: 'r4', totalAmount: 256.00, humanShare: 179.20, avatarShare: 51.20, protocolShare: 25.60, humanBps: 7000, avatarBps: 2000, protocolBps: 1000, source: 'collaboration', txHash: '0xmn34...op56', createdAt: '2026-03-03T16:45:30Z' },
  { id: 'r5', totalAmount: 67.80, humanShare: 47.46, avatarShare: 13.56, protocolShare: 6.78, humanBps: 7000, avatarBps: 2000, protocolBps: 1000, source: 'skill_call', txHash: '0xqr78...st90', createdAt: '2026-03-02T09:22:55Z' },
];

// ----- 委托关系 -----
export const MOCK_DELEGATIONS: Delegation[] = [
  { id: 'd1', domain: '内容创作', delegateName: '飘叔.soul (本体)', delegateAddr: '0x7a3f...9b2c', weight: 6000, isActive: true, createdAt: '2026-01-15T08:00:00Z' },
  { id: 'd2', domain: '内容创作', delegateName: '文案分身.soul', delegateAddr: '0x1b2c...3d4e', weight: 4000, isActive: true, createdAt: '2026-02-01T10:00:00Z' },
  { id: 'd3', domain: '商务谈判', delegateName: '飘叔.soul (本体)', delegateAddr: '0x7a3f...9b2c', weight: 8000, isActive: true, createdAt: '2026-01-15T08:00:00Z' },
  { id: 'd4', domain: '商务谈判', delegateName: '谈判分身.soul', delegateAddr: '0x5f6g...7h8i', weight: 2000, isActive: true, createdAt: '2026-02-10T14:00:00Z' },
  { id: 'd5', domain: '数据分析', delegateName: '飘叔.soul (本体)', delegateAddr: '0x7a3f...9b2c', weight: 3000, isActive: true, createdAt: '2026-01-15T08:00:00Z' },
  { id: 'd6', domain: '数据分析', delegateName: '数据分身.soul', delegateAddr: '0x9j0k...1l2m', weight: 7000, isActive: true, createdAt: '2026-02-20T09:00:00Z' },
];

// ----- 认知时间线 -----
export const MOCK_TIMELINE: TimelineEvent[] = [
  { id: 't1', eventType: 'revenue_received', details: '收到收益 $45.20 — 分账: $31.64(人类) | $9.04(金库) | $4.52(协议)', txHash: '0xab12...cd34', amount: 45.20, createdAt: '2026-03-04T14:32:18Z' },
  { id: 't2', eventType: 'skill_invocation', details: '调用 GPT-4o 生成营销文案 — 成本: $0.02 | 满意度: 96%', ipfsHash: 'QmX7...9kL', amount: 0.02, createdAt: '2026-03-04T12:15:42Z' },
  { id: 't3', eventType: 'resonance_update', details: '共振分更新: 68 → 72 (+4)', txHash: '0x9f2a...3b4c', createdAt: '2026-03-04T09:08:11Z' },
  { id: 't4', eventType: 'delegation_change', details: '委托变更: 数据分析领域权重 5000→7000 (数据分身.soul)', txHash: '0x5d6e...7f8g', createdAt: '2026-03-03T18:30:22Z' },
  { id: 't5', eventType: 'revenue_received', details: '收到收益 $128.00 — 来源: 分身租赁', txHash: '0xef56...gh78', amount: 128.00, createdAt: '2026-03-03T10:15:42Z' },
  { id: 't6', eventType: 'skill_invocation', details: '调用 高级RAG检索 生成行业报告 — 成本: $0.035 | 满意度: 93%', ipfsHash: 'QmP3...5rS', amount: 0.035, createdAt: '2026-03-02T16:45:30Z' },
  { id: 't7', eventType: 'circuit_change', details: '认知状态: NORMAL → SOFT_LIMIT (共振分降至58)', txHash: '0xh1i2...j3k4', createdAt: '2026-03-01T22:10:00Z' },
  { id: 't8', eventType: 'circuit_change', details: '认知状态: SOFT_LIMIT → NORMAL (共振分恢复72)', txHash: '0xl5m6...n7o8', createdAt: '2026-03-02T08:00:00Z' },
  { id: 't9', eventType: 'revenue_received', details: '收到协作收益 $256.00 — 来源: 跨分身协作', txHash: '0xmn34...op56', amount: 256.00, createdAt: '2026-03-01T14:20:00Z' },
  { id: 't10', eventType: 'skill_invocation', details: '调用 智能客服 处理用户咨询 23条 — 成本: $0.28', ipfsHash: 'QmA1...bC2', amount: 0.28, createdAt: '2026-02-28T11:30:00Z' },
];

// ----- 24小时共振分历史 -----
export function generateResonanceHistory(): ResonanceDataPoint[] {
  const data: ResonanceDataPoint[] = [];
  const now = new Date();
  let score = 68;
  for (let i = 24; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 3600000);
    const change = (Math.random() - 0.45) * 8;
    score = Math.max(40, Math.min(95, score + change));
    data.push({
      time: `${time.getHours().toString().padStart(2, '0')}:00`,
      score: Math.round(score),
    });
  }
  // Ensure last point is 72
  data[data.length - 1].score = 72;
  return data;
}

// ----- 可委托子分身 -----
export const AVAILABLE_SUB_AVATARS = [
  { id: 'sub1', name: '文案分身.soul', domain: '内容创作', cognitiveMatch: 85 },
  { id: 'sub2', name: '视频分身.soul', domain: '内容创作', cognitiveMatch: 78 },
  { id: 'sub3', name: '谈判分身.soul', domain: '商务谈判', cognitiveMatch: 82 },
  { id: 'sub4', name: '数据分身.soul', domain: '数据分析', cognitiveMatch: 91 },
  { id: 'sub5', name: '客服分身.soul', domain: '客户服务', cognitiveMatch: 75 },
];
