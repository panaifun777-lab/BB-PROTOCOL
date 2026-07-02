import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe, FIAT_SPLIT_CONFIG } from '@/lib/stripe-config';
import { db } from '@/lib/db';

// Disable body parsing for webhook signature verification
export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;
  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_placeholder';
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('[API] Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const { avatarId, paymentId, serviceName } = session.metadata || {};

        if (paymentId) {
          // Update payment status
          await db.payment.update({
            where: { id: paymentId },
            data: {
              status: 'confirmed',
              txHash: (session.payment_intent as string) || session.id,
            },
          });

          // Create revenue split record
          const payment = await db.payment.findUnique({ where: { id: paymentId } });
          if (payment && avatarId) {
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
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        // Try to find payment by txHash containing the payment intent ID
        const payment = await db.payment.findFirst({
          where: { txHash: { contains: paymentIntent.id } },
        });
        if (payment) {
          await db.payment.update({
            where: { id: payment.id },
            data: { status: 'failed' },
          });
        }
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        const payment = await db.payment.findFirst({
          where: { txHash: { contains: (charge.payment_intent as string) || '' } },
        });
        if (payment) {
          // Create negative revenue record for the refund
          const { avatarId } = payment;
          const { humanBps, avatarBps, protocolBps } = FIAT_SPLIT_CONFIG;
          const totalAmount = -payment.amount; // Negative amount
          const humanShare = Number((totalAmount * humanBps / 10000).toFixed(2));
          const avatarShare = Number((totalAmount * avatarBps / 10000).toFixed(2));
          const protocolShare = Number((totalAmount * protocolBps / 10000).toFixed(2));

          await db.$transaction(async (tx) => {
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
                txHash: `refund_${charge.id}`,
              },
            });

            await tx.timelineEvent.create({
              data: {
                avatarId,
                eventType: 'revenue_received',
                details: `退款 $${Math.abs(totalAmount).toFixed(2)} — 反向分账记录`,
                amount: totalAmount,
                txHash: `refund_${charge.id}`,
              },
            });

            await tx.avatar.update({
              where: { id: avatarId },
              data: {
                avatarBalance: { increment: avatarShare }, // This will be negative
                lastActivityAt: new Date(),
              },
            });
          });

          await db.payment.update({
            where: { id: payment.id },
            data: { status: 'failed' },
          });
        }
        break;
      }

      case 'customer.subscription.created': {
        const sub = event.data.object as Stripe.Subscription;
        const { avatarId: subAvatarId, tier: subTier } = sub.metadata || {};
        if (subAvatarId) {
          // Update existing subscription record or create one
          const existing = await db.subscription.findFirst({
            where: { stripeSubId: sub.id },
          });
          if (existing) {
            await db.subscription.update({
              where: { id: existing.id },
              data: {
                status: sub.status || 'active',
                currentPeriodStart: new Date(sub.current_period_start * 1000),
                currentPeriodEnd: new Date(sub.current_period_end * 1000),
                cancelAtPeriodEnd: sub.cancel_at_period_end || false,
              },
            });
          } else {
            // Create subscription record from webhook
            await db.subscription.create({
              data: {
                avatarId: subAvatarId,
                tier: subTier || 'starter',
                stripePriceId: sub.items.data[0]?.price.id || '',
                stripeSubId: sub.id,
                status: sub.status || 'active',
                currentPeriodStart: new Date(sub.current_period_start * 1000),
                currentPeriodEnd: new Date(sub.current_period_end * 1000),
                cancelAtPeriodEnd: sub.cancel_at_period_end || false,
              },
            });
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subUpdated = event.data.object as Stripe.Subscription;
        const existingSub = await db.subscription.findFirst({
          where: { stripeSubId: subUpdated.id },
        });
        if (existingSub) {
          await db.subscription.update({
            where: { id: existingSub.id },
            data: {
              status: subUpdated.status || existingSub.status,
              currentPeriodStart: new Date(subUpdated.current_period_start * 1000),
              currentPeriodEnd: new Date(subUpdated.current_period_end * 1000),
              cancelAtPeriodEnd: subUpdated.cancel_at_period_end || false,
            },
          });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subDeleted = event.data.object as Stripe.Subscription;
        const deletedSub = await db.subscription.findFirst({
          where: { stripeSubId: subDeleted.id },
        });
        if (deletedSub) {
          await db.subscription.update({
            where: { id: deletedSub.id },
            data: {
              status: 'canceled',
              cancelAtPeriodEnd: false,
            },
          });
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const stripeInvoice = event.data.object as Stripe.Invoice;
        const invoiceAvatarId = stripeInvoice.metadata?.avatarId || stripeInvoice.customer_metadata?.avatarId;
        if (invoiceAvatarId && stripeInvoice.id) {
          // Check if we already have an invoice record for this Stripe invoice
          const existingInvoice = await db.invoice.findFirst({
            where: {
              metadata: { contains: stripeInvoice.id },
            },
          });
          if (!existingInvoice) {
            // Auto-create Invoice record from Stripe invoice
            const now = new Date();
            const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
            const prefix = `INV-${yearMonth}-`;
            const latest = await db.invoice.findFirst({
              where: { invoiceNumber: { startsWith: prefix } },
              orderBy: { invoiceNumber: 'desc' },
            });
            let sequence = 1;
            if (latest) {
              const parts = latest.invoiceNumber.split('-');
              const lastSeq = parseInt(parts[parts.length - 1], 10);
              if (!isNaN(lastSeq)) sequence = lastSeq + 1;
            }
            const invoiceNumber = `${prefix}${String(sequence).padStart(4, '0')}`;

            const lineItems = (stripeInvoice.lines.data || []).map(line => ({
              description: line.description || 'Subscription payment',
              quantity: line.quantity || 1,
              unitPrice: (line.amount || 0) / 100,
              amount: (line.amount || 0) / 100,
            }));

            const totalAmount = (stripeInvoice.total || 0) / 100;

            await db.invoice.create({
              data: {
                avatarId: invoiceAvatarId,
                invoiceNumber,
                amount: (stripeInvoice.subtotal || 0) / 100,
                currency: stripeInvoice.currency || 'usd',
                tax: (stripeInvoice.tax || 0) / 100,
                discount: Math.abs((stripeInvoice.total_discount_amounts || []).reduce((sum, d) => sum + d.amount, 0)) / 100,
                totalAmount,
                status: 'paid',
                dueDate: now,
                issuedAt: now,
                paidAt: now,
                lineItems: JSON.stringify(lineItems),
                metadata: JSON.stringify({ stripeInvoiceId: stripeInvoice.id }),
              },
            });
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const failedInvoice = event.data.object as Stripe.Invoice;
        console.warn('[API] Invoice payment failed:', {
          invoiceId: failedInvoice.id,
          customer: failedInvoice.customer,
          amount: failedInvoice.total,
          attemptCount: failedInvoice.attempt_count,
        });
        // Log payment failure - could integrate with notification system
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[API] Webhook handler error:', error);
    return NextResponse.json(
      {
        error: 'Webhook handler failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
