import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ALL_SKILLS } from '@/lib/mock-data';

// POST /api/seed — Seed the database with mock data
export async function POST() {
  try {
    // Check if data already exists
    const existingAvatars = await db.avatar.count();
    if (existingAvatars > 0) {
      return NextResponse.json(
        { error: 'Database already seeded. Clear data first.' },
        { status: 409 }
      );
    }

    const result = await db.$transaction(async (tx) => {
      // 1. Create the 9 skills from ALL_SKILLS
      const skills = [];
      for (const s of ALL_SKILLS) {
        const skill = await tx.skill.create({
          data: {
            name: s.name,
            description: s.description,
            tier: s.tier,
            revenueThreshold: s.revenueThreshold,
            icon: s.icon || null,
            category: s.category,
          },
        });
        skills.push(skill);
      }

      // 2. Create 1 demo avatar (飘叔.soul)
      const avatar = await tx.avatar.create({
        data: {
          soulId: '0x7a3f...9b2c',
          ownerAddress: '0x7a3f8c2d1e5b4a6f9d0c3e7b8a2f1d5c4b6e9a0f',
          name: '飘叔.soul',
          cognitionRoot: 'QmX7kP9mN2qR5sT8vW1yZ4aB6cD8eF0gH2jK4mN6oP8',
          resonanceScore: 72,
          avatarBalance: 1245.80,
          circuitState: 'NORMAL',
          isFrozen: false,
          tier: 'pro',
        },
      });

      // 3. Create avatar skills (5 unlocked, 4 locked)
      const avatarSkillData = [
        { skillIdx: 0, unlocked: true, usageCount: 142, satisfaction: 94, avgCost: 0.018, unlockedAt: new Date('2026-01-20T10:00:00Z') },
        { skillIdx: 1, unlocked: true, usageCount: 87, satisfaction: 91, avgCost: 0.012, unlockedAt: new Date('2026-01-20T10:00:00Z') },
        { skillIdx: 2, unlocked: true, usageCount: 56, satisfaction: 88, avgCost: 0.025, unlockedAt: new Date('2026-01-22T14:00:00Z') },
        { skillIdx: 3, unlocked: true, usageCount: 34, satisfaction: 92, avgCost: 0.035, unlockedAt: new Date('2026-02-10T09:00:00Z') },
        { skillIdx: 4, unlocked: true, usageCount: 18, satisfaction: 85, avgCost: 0.040, unlockedAt: new Date('2026-02-15T16:00:00Z') },
        { skillIdx: 5, unlocked: false, usageCount: 0, satisfaction: 0, avgCost: 0, unlockedAt: null },
        { skillIdx: 6, unlocked: false, usageCount: 0, satisfaction: 0, avgCost: 0, unlockedAt: null },
        { skillIdx: 7, unlocked: false, usageCount: 0, satisfaction: 0, avgCost: 0, unlockedAt: null },
        { skillIdx: 8, unlocked: false, usageCount: 0, satisfaction: 0, avgCost: 0, unlockedAt: null },
      ];

      for (const as of avatarSkillData) {
        await tx.avatarSkill.create({
          data: {
            avatarId: avatar.id,
            skillId: skills[as.skillIdx].id,
            unlocked: as.unlocked,
            usageCount: as.usageCount,
            satisfaction: as.satisfaction,
            avgCost: as.avgCost,
            unlockedAt: as.unlockedAt,
          },
        });
      }

      // 4. Create 5 revenue records
      const revenueData = [
        { totalAmount: 45.20, source: 'skill_call', createdAt: new Date('2026-03-04T14:32:18Z') },
        { totalAmount: 128.00, source: 'rental', createdAt: new Date('2026-03-04T10:15:42Z') },
        { totalAmount: 12.50, source: 'skill_call', createdAt: new Date('2026-03-03T22:08:11Z') },
        { totalAmount: 256.00, source: 'collaboration', createdAt: new Date('2026-03-03T16:45:30Z') },
        { totalAmount: 67.80, source: 'skill_call', createdAt: new Date('2026-03-02T09:22:55Z') },
      ];

      for (const r of revenueData) {
        const humanShare = Number((r.totalAmount * 0.7).toFixed(2));
        const avatarShare = Number((r.totalAmount * 0.2).toFixed(2));
        const protocolShare = Number((r.totalAmount * 0.1).toFixed(2));

        await tx.revenue.create({
          data: {
            avatarId: avatar.id,
            totalAmount: r.totalAmount,
            humanShare,
            avatarShare,
            protocolShare,
            humanBps: 7000,
            avatarBps: 2000,
            protocolBps: 1000,
            source: r.source,
            createdAt: r.createdAt,
          },
        });
      }

      // 5. Create 6 delegation records
      const delegationData = [
        { domain: '内容创作', delegateName: '飘叔.soul (本体)', delegateAddr: '0x7a3f...9b2c', weight: 6000, createdAt: new Date('2026-01-15T08:00:00Z') },
        { domain: '内容创作', delegateName: '文案分身.soul', delegateAddr: '0x1b2c...3d4e', weight: 4000, createdAt: new Date('2026-02-01T10:00:00Z') },
        { domain: '商务谈判', delegateName: '飘叔.soul (本体)', delegateAddr: '0x7a3f...9b2c', weight: 8000, createdAt: new Date('2026-01-15T08:00:00Z') },
        { domain: '商务谈判', delegateName: '谈判分身.soul', delegateAddr: '0x5f6g...7h8i', weight: 2000, createdAt: new Date('2026-02-10T14:00:00Z') },
        { domain: '数据分析', delegateName: '飘叔.soul (本体)', delegateAddr: '0x7a3f...9b2c', weight: 3000, createdAt: new Date('2026-01-15T08:00:00Z') },
        { domain: '数据分析', delegateName: '数据分身.soul', delegateAddr: '0x9j0k...1l2m', weight: 7000, createdAt: new Date('2026-02-20T09:00:00Z') },
      ];

      for (const d of delegationData) {
        await tx.delegation.create({
          data: {
            avatarId: avatar.id,
            domain: d.domain,
            delegateName: d.delegateName,
            delegateAddr: d.delegateAddr,
            weight: d.weight,
            createdAt: d.createdAt,
          },
        });
      }

      // 6. Create 10 timeline events
      const timelineData = [
        { eventType: 'revenue_received', details: '收到收益 $45.20 — 分账: $31.64(人类) | $9.04(金库) | $4.52(协议)', amount: 45.20, createdAt: new Date('2026-03-04T14:32:18Z') },
        { eventType: 'skill_invocation', details: '调用 GPT-4o 生成营销文案 — 成本: $0.02 | 满意度: 96%', amount: 0.02, createdAt: new Date('2026-03-04T12:15:42Z') },
        { eventType: 'resonance_update', details: '共振分更新: 68 → 72 (+4)', createdAt: new Date('2026-03-04T09:08:11Z') },
        { eventType: 'delegation_change', details: '委托变更: 数据分析领域权重 5000→7000 (数据分身.soul)', createdAt: new Date('2026-03-03T18:30:22Z') },
        { eventType: 'revenue_received', details: '收到收益 $128.00 — 来源: 分身租赁', amount: 128.00, createdAt: new Date('2026-03-03T10:15:42Z') },
        { eventType: 'skill_invocation', details: '调用 高级RAG检索 生成行业报告 — 成本: $0.035 | 满意度: 93%', amount: 0.035, createdAt: new Date('2026-03-02T16:45:30Z') },
        { eventType: 'circuit_change', details: '认知状态: NORMAL → SOFT_LIMIT (共振分降至58)', createdAt: new Date('2026-03-01T22:10:00Z') },
        { eventType: 'circuit_change', details: '认知状态: SOFT_LIMIT → NORMAL (共振分恢复72)', createdAt: new Date('2026-03-02T08:00:00Z') },
        { eventType: 'revenue_received', details: '收到协作收益 $256.00 — 来源: 跨分身协作', amount: 256.00, createdAt: new Date('2026-03-01T14:20:00Z') },
        { eventType: 'skill_invocation', details: '调用 智能客服 处理用户咨询 23条 — 成本: $0.28', amount: 0.28, createdAt: new Date('2026-02-28T11:30:00Z') },
      ];

      for (const t of timelineData) {
        await tx.timelineEvent.create({
          data: {
            avatarId: avatar.id,
            eventType: t.eventType,
            details: t.details,
            amount: t.amount || null,
            createdAt: t.createdAt,
          },
        });
      }

      // 7. Create 25 resonance history points
      const baseTime = new Date('2026-03-04T00:00:00Z');
      let resonanceScore = 68;
      for (let i = 0; i < 25; i++) {
        const change = (Math.sin(i * 37 + 7) * 0.5 - 0.45) * 8;
        resonanceScore = Math.max(40, Math.min(95, resonanceScore + change));
        const time = new Date(baseTime.getTime() + i * 3600000); // each hour

        await tx.resonanceHistory.create({
          data: {
            avatarId: avatar.id,
            score: Math.round(resonanceScore),
            source: 'ece_oracle',
            createdAt: time,
          },
        });
      }
      // Ensure last point is 72
      await tx.resonanceHistory.create({
        data: {
          avatarId: avatar.id,
          score: 72,
          source: 'ece_oracle',
          createdAt: new Date(baseTime.getTime() + 25 * 3600000),
        },
      });

      return {
        avatar,
        skillsCount: skills.length,
        avatarSkillsCount: avatarSkillData.length,
        revenuesCount: revenueData.length,
        delegationsCount: delegationData.length,
        timelineCount: timelineData.length,
        resonanceCount: 26, // 25 + 1 final
      };
    });

    return NextResponse.json({
      message: 'Database seeded successfully',
      data: result,
    }, { status: 201 });
  } catch (error) {
    console.error('Failed to seed database:', error);
    return NextResponse.json(
      { error: 'Failed to seed database' },
      { status: 500 }
    );
  }
}
