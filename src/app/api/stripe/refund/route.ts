import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe-config';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { paymentId, reason } = body;

    if (!paymentId) {
      return NextResponse.json(
        { error: 'paymentId is required' },
        { status: 400 }
      );
    }

    // Find the payment in DB
    const payment = await db.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    if (payment.status !== 'confirmed') {
      return NextResponse.json(
        { error: 'Only confirmed payments can be refunded' },
        { status: 400 }
      );
    }

    // Get the Stripe payment_intent from txHash
    const paymentIntentId = payment.txHash;

    if (!paymentIntentId) {
      return NextResponse.json(
        { error: 'No Stripe payment intent found for this payment' },
        { status: 400 }
      );
    }

    // Create a refund via Stripe
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      reason: reason === 'duplicate' ? 'duplicate'
        : reason === 'fraudulent' ? 'fraudulent'
        : 'requested_by_customer',
      metadata: {
        paymentId: payment.id,
        avatarId: payment.avatarId,
        originalAmount: payment.amount.toString(),
      },
    });

    // Update payment status to failed (refunded)
    await db.payment.update({
      where: { id: paymentId },
      data: { status: 'failed' },
    });

    return NextResponse.json({
      refundId: refund.id,
      status: refund.status,
      amount: refund.amount,
    });
  } catch (error) {
    console.error('[API] Error in POST /api/stripe/refund:', error);
    return NextResponse.json(
      {
        error: 'Failed to process refund',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
