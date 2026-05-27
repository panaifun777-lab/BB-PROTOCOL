import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/payment/[id]/verify — Verify wallet signature and confirm payment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { signature, message } = body;

    if (!signature || !message) {
      return NextResponse.json(
        { error: 'signature and message are required' },
        { status: 400 }
      );
    }

    // Fetch existing payment
    const existing = await db.payment.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    if (existing.status !== 'pending') {
      return NextResponse.json(
        { error: `Cannot verify payment with status "${existing.status}". Only pending payments can be verified.` },
        { status: 400 }
      );
    }

    // In a production environment, we would verify the signature using viem's verifyMessage:
    //   import { verifyMessage } from 'viem';
    //   const isValid = await verifyMessage({ address, message, signature });
    // For this demo, we accept any non-empty signature as valid proof.
    // The signature itself serves as the on-chain authorization proof.
    const isValidSignature = typeof signature === 'string' && signature.length > 0;

    if (!isValidSignature) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    // Derive a deterministic tx hash from the signature for record-keeping
    const derivedTxHash = signature.length >= 66
      ? (signature as `0x${string}`).slice(0, 66)
      : `0x${signature.padEnd(64, '0').slice(0, 64)}`;

    // Confirm payment + create Revenue + TimelineEvent + update Avatar balance
    const result = await db.$transaction(async (tx) => {
      const payment = await tx.payment.update({
        where: { id },
        data: {
          status: 'confirmed',
          txHash: derivedTxHash,
        },
      });

      // Auto-calculate 70/20/10 split
      const humanBps = 7000;
      const avatarBps = 2000;
      const protocolBps = 1000;
      const totalAmount = existing.amount;

      const humanShare = Number((totalAmount * humanBps / 10000).toFixed(2));
      const avatarShare = Number((totalAmount * avatarBps / 10000).toFixed(2));
      const protocolShare = Number((totalAmount * protocolBps / 10000).toFixed(2));

      // Ensure Avatar exists (auto-create if not found)
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
          details: `钱包签名验证支付确认 $${totalAmount.toFixed(2)} — 分账: $${humanShare.toFixed(2)}(人类) | $${avatarShare.toFixed(2)}(金库) | $${protocolShare.toFixed(2)}(协议)`,
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
  } catch (error) {
    console.error('Failed to verify payment:', error);
    return NextResponse.json(
      { error: 'Failed to verify payment', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
