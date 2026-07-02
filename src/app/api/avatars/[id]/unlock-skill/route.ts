import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/avatars/[id]/unlock-skill — Unlock a skill for an avatar
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { skillId } = body;

    if (!skillId) {
      return NextResponse.json(
        { error: 'skillId is required' },
        { status: 400 }
      );
    }

    // Get avatar with cumulative revenue
    const avatar = await db.avatar.findUnique({
      where: { id },
      include: {
        revenues: true,
        skills: true,
      },
    });

    if (!avatar) {
      return NextResponse.json(
        { error: 'Avatar not found' },
        { status: 404 }
      );
    }

    // Get skill definition
    const skill = await db.skill.findUnique({
      where: { id: skillId },
    });

    if (!skill) {
      return NextResponse.json(
        { error: 'Skill not found' },
        { status: 404 }
      );
    }

    // Check if already unlocked
    const existingSkill = avatar.skills.find((s) => s.skillId === skillId);
    if (existingSkill?.unlocked) {
      return NextResponse.json(
        { error: 'Skill already unlocked' },
        { status: 400 }
      );
    }

    // Calculate cumulative revenue
    const cumulativeRevenue = avatar.revenues.reduce(
      (sum, r) => sum + r.totalAmount,
      0
    );

    // Check if avatar meets the revenue threshold
    if (cumulativeRevenue < skill.revenueThreshold) {
      return NextResponse.json(
        {
          error: `Insufficient cumulative revenue. Required: $${skill.revenueThreshold}, Current: $${cumulativeRevenue.toFixed(2)}`,
          cumulativeRevenue,
          revenueThreshold: skill.revenueThreshold,
        },
        { status: 400 }
      );
    }

    // Create or update AvatarSkill record
    const avatarSkill = await db.avatarSkill.upsert({
      where: {
        avatarId_skillId: { avatarId: id, skillId },
      },
      create: {
        avatarId: id,
        skillId,
        unlocked: true,
        unlockedAt: new Date(),
      },
      update: {
        unlocked: true,
        unlockedAt: new Date(),
      },
    });

    // Create timeline event
    await db.timelineEvent.create({
      data: {
        avatarId: id,
        eventType: 'skill_invocation',
        details: `解锁技能: ${skill.name} — 累计收益 $${cumulativeRevenue.toFixed(2)} 达到阈值 $${skill.revenueThreshold}`,
      },
    });

    return NextResponse.json(avatarSkill, { status: 201 });
  } catch (error) {
    console.error('Failed to unlock skill:', error);
    return NextResponse.json(
      { error: 'Failed to unlock skill' },
      { status: 500 }
    );
  }
}
