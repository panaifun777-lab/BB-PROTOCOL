import { NextResponse } from 'next/server';

// ── DAO Governance API Route ──────────────────────────────────────
// Returns deterministic mock data for the DAO Governance dashboard.

export async function GET() {
  const data = {
    proposals: [
      {
        id: 'prop-1',
        title: '调整分账比例为 65/25/10',
        category: 'economics',
        status: 'active',
        proposer: '0x7a3f...b2c1',
        createdAt: '2026-03-05T10:00:00Z',
        endTime: '2026-03-12T10:00:00Z',
        description:
          '提议将人类份额从70%降至65%，分身金库从20%升至25%，以激励更多自主行为。基于过去30天的共振分数据分析，金库比例提升有助于分身长期价值增长。',
        votesFor: 1520000,
        votesAgainst: 890000,
        votesAbstain: 230000,
        totalVotingPower: 5000000,
        quorum: 2000000,
        executionHash: '0xabc123...',
        riskAssessment: 'medium',
      },
      {
        id: 'prop-2',
        title: '激活 KYC 合规模块',
        category: 'compliance',
        status: 'passed',
        proposer: '0x9c4e...d3f2',
        createdAt: '2026-02-28T08:00:00Z',
        endTime: '2026-03-07T08:00:00Z',
        description:
          '为企业级客户激活KYC身份验证插件，默认关闭，仅在用户主动选择时启用。符合瑞士基金会运营合规要求。',
        votesFor: 3200000,
        votesAgainst: 1100000,
        votesAbstain: 700000,
        totalVotingPower: 5000000,
        quorum: 2000000,
        executionHash: '0xdef456...',
        riskAssessment: 'low',
        executedAt: '2026-03-07T12:00:00Z',
      },
      {
        id: 'prop-3',
        title: '新增 Arbitrum 链支持',
        category: 'technical',
        status: 'active',
        proposer: '0x5b2a...e8d1',
        createdAt: '2026-03-08T14:00:00Z',
        endTime: '2026-03-15T14:00:00Z',
        description:
          '将认知分身协议扩展至Arbitrum L2，部署核心合约副本，启用跨链状态同步。预估Gas节省40%。',
        votesFor: 2100000,
        votesAgainst: 450000,
        votesAbstain: 150000,
        totalVotingPower: 5000000,
        quorum: 2000000,
        executionHash: '0x789012...',
        riskAssessment: 'medium',
      },
      {
        id: 'prop-4',
        title: '调整熔断阈值为 45/65',
        category: 'security',
        status: 'defeated',
        proposer: '0x3f1c...a9b8',
        createdAt: '2026-02-20T16:00:00Z',
        endTime: '2026-02-27T16:00:00Z',
        description:
          '提议将HARD_PAUSE阈值从50降至45，SOFT_LIMIT阈值从50-70调整为45-65。社区认为当前阈值已足够安全，过度保护可能影响正常使用。',
        votesFor: 890000,
        votesAgainst: 3100000,
        votesAbstain: 510000,
        totalVotingPower: 5000000,
        quorum: 2000000,
        executionHash: '0x345678...',
        riskAssessment: 'high',
      },
      {
        id: 'prop-5',
        title: '社区金库资助: 认知发现研究',
        category: 'community',
        status: 'queued',
        proposer: '0x8d7e...c4a5',
        createdAt: '2026-03-10T09:00:00Z',
        endTime: '2026-03-17T09:00:00Z',
        description:
          '申请50,000 AFC社区金库资助，用于认知发现协议(MCP扩展)的语义匹配算法研究。预期提升技能匹配Top-N准确率至85%。',
        votesFor: 0,
        votesAgainst: 0,
        votesAbstain: 0,
        totalVotingPower: 5000000,
        quorum: 2000000,
        executionHash: '0x901234...',
        riskAssessment: 'low',
      },
    ],

    votingStats: {
      totalVoters: 12847,
      participationRate: 67.3,
      averageQuorum: 72.5,
      proposalsTotal: 24,
      proposalsPassed: 18,
      proposalsActive: 3,
      proposalsDefeated: 3,
    },

    delegationTree: [
      { delegator: '0x7a3f...b2c1', delegatee: '0x9c4e...d3f2', weight: 5000, domain: 'economics', isActive: true },
      { delegator: '0x5b2a...e8d1', delegatee: '0x9c4e...d3f2', weight: 3000, domain: 'economics', isActive: true },
      { delegator: '0x3f1c...a9b8', delegatee: '0x7a3f...b2c1', weight: 2000, domain: 'security', isActive: true },
      { delegator: '0x8d7e...c4a5', delegatee: '0x5b2a...e8d1', weight: 8000, domain: 'technical', isActive: true },
      { delegator: '0x2a6d...f7e3', delegatee: '0x9c4e...d3f2', weight: 4000, domain: 'compliance', isActive: false },
      { delegator: '0x4e9b...d1c2', delegatee: '0x7a3f...b2c1', weight: 6000, domain: 'economics', isActive: true },
    ],

    topDelegates: [
      { address: '0x9c4e...d3f2', name: 'CryptoSage', votingPower: 2800000, proposalsVoted: 22, agreementRate: 78, delegators: 12, domains: ['economics', 'compliance'] },
      { address: '0x7a3f...b2c1', name: 'MindForge', votingPower: 1950000, proposalsVoted: 20, agreementRate: 82, delegators: 8, domains: ['security', 'economics'] },
      { address: '0x5b2a...e8d1', name: 'ChainWalker', votingPower: 1200000, proposalsVoted: 18, agreementRate: 71, delegators: 5, domains: ['technical'] },
      { address: '0x8d7e...c4a5', name: 'DataWeaver', votingPower: 850000, proposalsVoted: 15, agreementRate: 88, delegators: 3, domains: ['community'] },
    ],

    treasury: {
      balance: 2500000,
      currency: 'AFC',
      allocated: 850000,
      available: 1650000,
      monthlyIncome: 120000,
      monthlyExpense: 45000,
      recentTransactions: [
        { type: 'income', amount: 15000, description: '协议手续费收入', txHash: '0xaaa...', timestamp: '2026-03-10T08:00:00Z' },
        { type: 'expense', amount: 50000, description: 'Prop-5 社区资助预拨', txHash: '0xbbb...', timestamp: '2026-03-09T16:00:00Z' },
        { type: 'income', amount: 12000, description: 'LP手续费分成', txHash: '0xccc...', timestamp: '2026-03-09T12:00:00Z' },
        { type: 'expense', amount: 8000, description: '节点运营成本', txHash: '0xddd...', timestamp: '2026-03-08T10:00:00Z' },
        { type: 'income', amount: 20000, description: 'x402支付手续费', txHash: '0xeee...', timestamp: '2026-03-08T08:00:00Z' },
      ],
    },

    governanceParams: {
      votingPeriod: '7 days',
      proposalThreshold: '100 AFC',
      quorum: '40%',
      executionDelay: '48h',
      timeLock: '72h',
    },

    votingHistory: [
      { date: '02-28', participation: 65, proposals: 3 },
      { date: '03-03', participation: 70, proposals: 1 },
      { date: '03-07', participation: 72, proposals: 2 },
      { date: '03-10', participation: 67, proposals: 3 },
    ],
  };

  return NextResponse.json(data);
}
