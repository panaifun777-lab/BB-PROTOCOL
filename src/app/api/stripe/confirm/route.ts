import { NextRequest, NextResponse } from 'next/server';
import { stripe, FIAT_SPLIT_CONFIG } from '@/lib/stripe-config';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      );
    }

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    const isPaid = session.payment_status === 'paid';
    const paymentId = session.metadata?.paymentId;
    const avatarId = session.metadata?.avatarId;

    if (isPaid && paymentId) {
      // Check if payment is already confirmed (idempotency)
      const existingPayment = await db.payment.findUnique({
        where: { id: paymentId },
      });

      if (existingPayment && existingPayment.status !== 'confirmed') {
        // Update payment status to confirmed
        await db.payment.update({
          where: { id: paymentId },
          data: {
            status: 'confirmed',
            txHash: (session.payment_intent as string) || session.id,
          },
        });

        // Create revenue split record if not already created
        if (avatarId) {
          const payment = await db.payment.findUnique({
            where: { id: paymentId },
          });

          if (payment) {
            // Check if revenue record already exists to avoid duplicates
            const existingRevenue = await db.revenue.findFirst({
              where: {
                avatarId,
                txHash: (session.payment_intent as string) || session.id,
              },
            });

            if (!existingRevenue) {
              const { humanBps, avatarBps, protocolBps } = FIAT_SPLIT_CONFIG;
              const totalAmount = payment.amount;
              const humanShare = Number((totalAmount * humanBps / 10000).toFixed(2));
              const avatarShare = Number((totalAmount * avatarBps / 10000).toFixed(2));
              const protocolShare = Number((totalAmount * protocolBps / 10000).toFixed(2));

              await db.$transaction(async (tx) => {
                // Ensure Avatar exists (auto-create if not found)
                const avatarExists = await tx.avatar.findUnique({ where: { id: avatarId } });
                if (!avatarExists) {
                  await tx.avatar.create({
                    data: {
                      id: avatarId,
                      soulId: `soul-${avatarId}`,
                      ownerAddress: '0x0000000000000000000000000000000000000000',
                      name: avatarId === 'default' ? 'Default Avatar' : avatarId,
                      cognitionRoot: '0x0000000000000000000000000000000000000000000000000000000000000000',
                      resonanceScore: 70,
                      avatarBalance: 0,
                      circuitState: 'NORMAL',
                      tier: 'starter',
                    },
                  });
                }

                await tx.revenue.create({
                  data: {
                    avatarId,
                    totalAmount,
                    humanShare,
                    avatarShare,
                    protocolShare,
                    humanBps,
                    avatarBps,
                    protocolBps,
                    source: 'skill_call',
                    txHash: (session.payment_intent as string) || session.id,
                  },
                });

                await tx.timelineEvent.create({
                  data: {
                    avatarId,
                    eventType: 'revenue_received',
                    details: `Stripe法币支付 $${totalAmount.toFixed(2)} — 分账: $${humanShare.toFixed(2)}(人类) | $${avatarShare.toFixed(2)}(金库) | $${protocolShare.toFixed(2)}(协议)`,
                    amount: totalAmount,
                    txHash: (session.payment_intent as string) || session.id,
                  },
                });

                await tx.avatar.update({
                  where: { id: avatarId },
                  data: {
                    avatarBalance: { increment: avatarShare },
                    lastActivityAt: new Date(),
                  },
                });
              });
            }
          }
        }
      }
    }

    // Return the confirmation status
    const payment = paymentId
      ? await db.payment.findUnique({ where: { id: paymentId } })
      : null;

    return NextResponse.json({
      confirmed: isPaid,
      paymentStatus: session.payment_status,
      payment,
    });
  } catch (error) {
    console.error('[API] Error in POST /api/stripe/confirm:', error);
    return NextResponse.json(
      {
        error: 'Failed to confirm payment',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
