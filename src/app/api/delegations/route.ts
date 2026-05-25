import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/delegations — List delegations with optional avatarId filter
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const avatarId = searchParams.get('avatarId');

    const where = avatarId ? { avatarId } : {};

    const delegations = await db.delegation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(delegations);
  } catch (error) {
    console.error('Failed to list delegations:', error);
    return NextResponse.json(
      { error: 'Failed to list delegations' },
      { status: 500 }
    );
  }
}

// POST /api/delegations — Create a delegation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { avatarId, domain, delegateName, delegateAddr, weight } = body;

    if (!avatarId || !domain || !delegateName || weight === undefined) {
      return NextResponse.json(
        { error: 'avatarId, domain, delegateName, and weight are required' },
        { status: 400 }
      );
    }

    const result = await db.$transaction(async (tx) => {
      const delegation = await tx.delegation.create({
        data: {
          avatarId,
          domain,
          delegateName,
          delegateAddr: delegateAddr || null,
          weight,
        },
      });

      // Create timeline event
      await tx.timelineEvent.create({
        data: {
          avatarId,
          eventType: 'delegation_change',
          details: `新增委托: ${domain}领域 → ${delegateName} (权重: ${weight})`,
        },
      });

      return delegation;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Failed to create delegation:', error);
    return NextResponse.json(
      { error: 'Failed to create delegation' },
      { status: 500 }
    );
  }
}

// PATCH /api/delegations — Revoke a delegation
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { delegationId } = body;

    if (!delegationId) {
      return NextResponse.json(
        { error: 'delegationId is required' },
        { status: 400 }
      );
    }

    const existing = await db.delegation.findUnique({
      where: { id: delegationId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Delegation not found' },
        { status: 404 }
      );
    }

    if (!existing.isActive) {
      return NextResponse.json(
        { error: 'Delegation already revoked' },
        { status: 400 }
      );
    }

    const result = await db.$transaction(async (tx) => {
      const delegation = await tx.delegation.update({
        where: { id: delegationId },
        data: {
          isActive: false,
          revokedAt: new Date(),
        },
      });

      // Create timeline event
      await tx.timelineEvent.create({
        data: {
          avatarId: delegation.avatarId,
          eventType: 'delegation_change',
          details: `撤销委托: ${delegation.domain}领域 → ${delegation.delegateName}`,
        },
      });

      return delegation;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to revoke delegation:', error);
    return NextResponse.json(
      { error: 'Failed to revoke delegation' },
      { status: 500 }
    );
  }
}
