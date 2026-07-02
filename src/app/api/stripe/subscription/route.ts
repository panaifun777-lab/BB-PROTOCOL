import { NextRequest, NextResponse } from 'next/server';
import { stripe, PAYMENT_TIERS } from '@/lib/stripe-config';
import { db } from '@/lib/db';

// POST /api/stripe/subscription — Create a Stripe subscription
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { avatarId, tier, paymentMethodId } = body;

    if (!avatarId || !tier) {
      return NextResponse.json(
        { error: 'avatarId and tier are required' },
        { status: 400 }
      );
    }

    const validTiers = Object.keys(PAYMENT_TIERS);
    if (!validTiers.includes(tier)) {
      return NextResponse.json(
        { error: `Invalid tier. Must be one of: ${validTiers.join(', ')}` },
        { status: 400 }
      );
    }

    const tierConfig = PAYMENT_TIERS[tier as keyof typeof PAYMENT_TIERS];

    // Check if avatar already has an active subscription for this tier
    const existingSub = await db.subscription.findFirst({
      where: {
        avatarId,
        tier,
        status: { in: ['active', 'trialing'] },
      },
    });

    if (existingSub) {
      return NextResponse.json(
        { error: 'Avatar already has an active subscription for this tier', subscriptionId: existingSub.id },
        { status: 409 }
      );
    }

    let clientSecret: string | undefined;
    let stripeSubId: string | undefined;

    try {
      // Create or retrieve Stripe Customer
      let customerId: string;
      try {
        const customer = await stripe.customers.create({
          metadata: { avatarId },
        });
        customerId = customer.id;
      } catch {
        // Fallback: use avatarId as customer identifier
        customerId = `cus_avatar_${avatarId}`;
      }

      // Create Stripe Subscription
      const subscriptionParams: Record<string, unknown> = {
        customer: customerId,
        items: [{ price: tierConfig.priceId }],
        metadata: { avatarId, tier },
        payment_behavior: 'default_incomplete',
        expand: ['latest_invoice.payment_intent'],
      };

      if (paymentMethodId) {
        subscriptionParams.default_payment_method = paymentMethodId;
      }

      const stripeSubscription = await stripe.subscriptions.create(subscriptionParams);

      stripeSubId = stripeSubscription.id;

      // Get client secret from the latest invoice's payment intent
      const latestInvoice = stripeSubscription.latest_invoice as Record<string, unknown> | null;
      if (latestInvoice && typeof latestInvoice === 'object') {
        const paymentIntent = latestInvoice.payment_intent as Record<string, unknown> | null;
        if (paymentIntent && typeof paymentIntent === 'object') {
          clientSecret = paymentIntent.client_secret as string | undefined;
        }
      }

      const currentPeriodStart = new Date(stripeSubscription.current_period_start * 1000);
      const currentPeriodEnd = new Date(stripeSubscription.current_period_end * 1000);

      // Store subscription in DB
      const subscription = await db.subscription.create({
        data: {
          avatarId,
          tier,
          stripePriceId: tierConfig.priceId,
          stripeSubId,
          status: stripeSubscription.status || 'active',
          currentPeriodStart,
          currentPeriodEnd,
          cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end || false,
        },
      });

      return NextResponse.json({
        subscriptionId: subscription.id,
        stripeSubId,
        clientSecret,
        status: subscription.status,
      }, { status: 201 });
    } catch (stripeError) {
      // Stripe API failed (e.g., test key placeholder) — create DB record without Stripe
      console.warn('[API] Stripe subscription creation failed, creating local-only subscription:', stripeError);

      const subscription = await db.subscription.create({
        data: {
          avatarId,
          tier,
          stripePriceId: tierConfig.priceId,
          stripeSubId: null,
          status: 'active',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          cancelAtPeriodEnd: false,
        },
      });

      return NextResponse.json({
        subscriptionId: subscription.id,
        clientSecret: null,
        status: subscription.status,
        warning: 'Subscription created locally (Stripe API unavailable)',
      }, { status: 201 });
    }
  } catch (error) {
    console.error('[API] Error in POST /api/stripe/subscription:', error);
    return NextResponse.json(
      { error: 'Failed to create subscription', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET /api/stripe/subscription — List subscriptions for an avatar
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const avatarId = searchParams.get('avatarId');

    if (!avatarId) {
      return NextResponse.json(
        { error: 'avatarId query parameter is required' },
        { status: 400 }
      );
    }

    const subscriptions = await db.subscription.findMany({
      where: { avatarId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(subscriptions);
  } catch (error) {
    console.error('[API] Error in GET /api/stripe/subscription:', error);
    return NextResponse.json(
      { error: 'Failed to list subscriptions', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// PATCH /api/stripe/subscription — Cancel or reactivate subscription
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { subscriptionId, action } = body;

    if (!subscriptionId || !action) {
      return NextResponse.json(
        { error: 'subscriptionId and action are required' },
        { status: 400 }
      );
    }

    if (!['cancel', 'reactivate'].includes(action)) {
      return NextResponse.json(
        { error: 'action must be "cancel" or "reactivate"' },
        { status: 400 }
      );
    }

    const subscription = await db.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      );
    }

    try {
      if (subscription.stripeSubId) {
        if (action === 'cancel') {
          // Set cancel_at_period_end on Stripe
          await stripe.subscriptions.update(subscription.stripeSubId, {
            cancel_at_period_end: true,
          });
        } else if (action === 'reactivate') {
          // Remove cancel_at_period_end on Stripe
          await stripe.subscriptions.update(subscription.stripeSubId, {
            cancel_at_period_end: false,
          });
        }
      }
    } catch (stripeError) {
      console.warn('[API] Stripe subscription update failed, updating locally only:', stripeError);
    }

    // Update DB
    const updateData: Record<string, unknown> = {};
    if (action === 'cancel') {
      updateData.cancelAtPeriodEnd = true;
    } else if (action === 'reactivate') {
      updateData.cancelAtPeriodEnd = false;
      if (subscription.status === 'canceled') {
        updateData.status = 'active';
      }
    }

    const updated = await db.subscription.update({
      where: { id: subscriptionId },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[API] Error in PATCH /api/stripe/subscription:', error);
    return NextResponse.json(
      { error: 'Failed to update subscription', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
