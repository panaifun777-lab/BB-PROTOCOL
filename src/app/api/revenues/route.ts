import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/revenues — List revenues with optional avatarId filter
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const avatarId = searchParams.get('avatarId');

    const where = avatarId ? { avatarId } : {};

    const revenues = await db.revenue.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(revenues);
  } catch (error) {
    console.error('Failed to list revenues:', error);
    return NextResponse.json(
      { error: 'Failed to list revenues' },
      { status: 500 }
    );
  }
}

// POST /api/revenues — Create a revenue split record
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { avatarId, totalAmount, source } = body;

    if (!avatarId || totalAmount === undefined || !source) {
      return NextResponse.json(
        { error: 'avatarId, totalAmount, and source are required' },
        { status: 400 }
      );
    }

    // Auto-calculate 70/20/10 split
    const humanBps = 7000;
    const avatarBps = 2000;
    const protocolBps = 1000;

    const humanShare = Number((totalAmount * humanBps / 10000).toFixed(2));
    const avatarShare = Number((totalAmount * avatarBps / 10000).toFixed(2));
    const protocolShare = Number((totalAmount * protocolBps / 10000).toFixed(2));

    // Create revenue record and timeline event in a transaction
    const result = await db.$transaction(async (tx) => {
      const revenue = await tx.revenue.create({
        data: {
          avatarId,
          totalAmount,
          humanShare,
          avatarShare,
          protocolShare,
          humanBps,
          avatarBps,
          protocolBps,
          source,
        },
      });

      // Auto-create timeline event for the revenue
      await tx.timelineEvent.create({
        data: {
          avatarId,
          eventType: 'revenue_received',
          details: `收到收益 $${totalAmount.toFixed(2)} — 分账: $${humanShare.toFixed(2)}(人类) | $${avatarShare.toFixed(2)}(金库) | $${protocolShare.toFixed(2)}(协议)`,
          amount: totalAmount,
        },
      });

      // Update avatar balance
      await tx.avatar.update({
        where: { id: avatarId },
        data: {
          avatarBalance: { increment: avatarShare },
          lastActivityAt: new Date(),
        },
      });

      return revenue;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Failed to create revenue:', error);
    return NextResponse.json(
      { error: 'Failed to create revenue' },
      { status: 500 }
    );
  }
}
