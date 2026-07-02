import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe, SERVICE_PRICES, PAYMENT_TIERS, type TierName } from '@/lib/stripe-config';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { avatarId, serviceName, amount, paymentType = 'one_time', tier, successUrl, cancelUrl } = body;

    if (!avatarId || !serviceName || amount === undefined) {
      return NextResponse.json(
        { error: 'avatarId, serviceName, and amount are required' },
        { status: 400 }
      );
    }

    // Create payment record in DB first
    const gasFee = 0; // No gas for fiat
    const riskLevel = amount <= 5 ? 'low' : amount <= 50 ? 'medium' : 'high';
    const payment = await db.payment.create({
      data: {
        avatarId,
        serviceName,
        amount,
        currency: 'USD',
        gasFee,
        riskLevel,
        status: 'pending',
      },
    });

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const success = successUrl || `${baseUrl}/?stripe_success=${payment.id}`;
    const cancel = cancelUrl || `${baseUrl}/?stripe_cancel=${payment.id}`;

    // Create Stripe Checkout Session
    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card', 'link'],
      mode: paymentType === 'subscription' ? 'subscription' : 'payment',
      line_items:
        paymentType === 'subscription' && tier && PAYMENT_TIERS[tier as TierName]
          ? [
              {
                price: PAYMENT_TIERS[tier as TierName].priceId,
                quantity: 1,
              },
            ]
          : [
              {
                price_data: {
                  currency: 'usd',
                  product_data: {
                    name: serviceName,
                    description: `BB Protocol - ${serviceName}`,
                  },
                  unit_amount: Math.round(amount * 100), // Convert to cents
                },
                quantity: 1,
              },
            ],
      success_url: success,
      cancel_url: cancel,
      metadata: {
        avatarId,
        paymentId: payment.id,
        serviceName,
        paymentType,
      },
    };

    const session = await stripe.checkout.sessions.create(sessionConfig);

    // Update payment with Stripe session ID
    await db.payment.update({
      where: { id: payment.id },
      data: { txHash: session.id }, // Store session ID temporarily in txHash
    });

    return NextResponse.json({
      sessionId: session.id,
      paymentId: payment.id,
      url: session.url,
    });
  } catch (error) {
    console.error('[API] Error in POST /api/stripe/create-session:', error);
    return NextResponse.json(
      {
        error: 'Failed to create payment session',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
