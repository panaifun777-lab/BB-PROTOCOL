import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/payment/[id] — Get a single payment by ID
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const payment = await db.payment.findUnique({
      where: { id },
    });

    if (!payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(payment);
  } catch (error) {
    console.error('Failed to get payment:', error);
    return NextResponse.json(
      { error: 'Failed to get payment', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// PATCH /api/payment/[id] — Update payment status and txHash
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, txHash } = body;

    // Fetch existing payment
    const existing = await db.payment.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    // Validate status transitions
    if (status && !['confirmed', 'failed'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be "confirmed" or "failed"' },
        { status: 400 }
      );
    }

    if (existing.status !== 'pending') {
      return NextResponse.json(
        { error: `Cannot update payment with status "${existing.status}". Only pending payments can be updated.` },
        { status: 400 }
      );
    }

    // If confirming, create Revenue + TimelineEvent + update Avatar balance in a transaction
    if (status === 'confirmed') {
      const result = await db.$transaction(async (tx) => {
        const payment = await tx.payment.update({
          where: { id },
          data: {
            status: 'confirmed',
            txHash: txHash || existing.txHash,
          },
        });

        // Auto-calculate 70/20/10 split (same logic as /api/revenues)
        const humanBps = 7000;
        const avatarBps = 2000;
        const protocolBps = 1000;
        const totalAmount = existing.amount;

        const humanShare = Number((totalAmount * humanBps / 10000).toFixed(2));
        const avatarShare = Number((totalAmount * avatarBps / 10000).toFixed(2));
        const protocolShare = Number((totalAmount * protocolBps / 10000).toFixed(2));

        // Ensure Avatar exists (auto-create if not found, e.g. for "default" avatarId)
        const avatarExists = await tx.avatar.findUnique({ where: { id: existing.avatarId } });
        if (!avatarExists) {
          await tx.avatar.create({
            data: {
              id: existing.avatarId,
              soulId: `soul-${existing.avatarId}`,
              ownerAddress: '0x0000000000000000000000000000000000000000',
              name: existing.avatarId === 'default' ? 'Default Avatar' : existing.avatarId,
              cognitionRoot: '0x0000000000000000000000000000000000000000000000000000000000000000',
              resonanceScore: 70,
              avatarBalance: 0,
              circuitState: 'NORMAL',
              tier: 'starter',
            },
          });
        }

        // Create Revenue record
        await tx.revenue.create({
          data: {
            avatarId: existing.avatarId,
            totalAmount,
            humanShare,
            avatarShare,
            protocolShare,
            humanBps,
            avatarBps,
            protocolBps,
            source: 'skill_call',
            txHash: payment.txHash,
          },
        });

        // Create TimelineEvent
        await tx.timelineEvent.create({
          data: {
            avatarId: existing.avatarId,
            eventType: 'revenue_received',
            details: `支付确认 $${totalAmount.toFixed(2)} — 分账: $${humanShare.toFixed(2)}(人类) | $${avatarShare.toFixed(2)}(金库) | $${protocolShare.toFixed(2)}(协议)`,
            amount: totalAmount,
            txHash: payment.txHash,
          },
        });

        // Update Avatar balance
        await tx.avatar.update({
          where: { id: existing.avatarId },
          data: {
            avatarBalance: { increment: avatarShare },
            lastActivityAt: new Date(),
          },
        });

        return payment;
      });

      return NextResponse.json(result);
    }

    // If failing, just update status
    const payment = await db.payment.update({
      where: { id },
      data: {
        status: 'failed',
        txHash: txHash !== undefined ? txHash : existing.txHash,
      },
    });

    return NextResponse.json(payment);
  } catch (error) {
    console.error('Failed to update payment:', error);
    return NextResponse.json(
      { error: 'Failed to update payment', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// DELETE /api/payment/[id] — Cancel a pending payment (set status to "failed")
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.payment.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    if (existing.status !== 'pending') {
      return NextResponse.json(
        { error: `Cannot cancel payment with status "${existing.status}". Only pending payments can be cancelled.` },
        { status: 400 }
      );
    }

    const payment = await db.payment.update({
      where: { id },
      data: { status: 'failed' },
    });

    return NextResponse.json(payment);
  } catch (error) {
    console.error('Failed to cancel payment:', error);
    return NextResponse.json(
      { error: 'Failed to cancel payment', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
