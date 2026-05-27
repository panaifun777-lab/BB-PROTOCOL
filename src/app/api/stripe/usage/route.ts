import { NextRequest, NextResponse } from 'next/server';
import { stripe, SERVICE_PRICES, PAYMENT_TIERS } from '@/lib/stripe-config';
import { db } from '@/lib/db';

// POST /api/stripe/usage — Report usage for a metered subscription
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { avatarId, serviceType, quantity } = body;

    if (!avatarId || !serviceType || !quantity) {
      return NextResponse.json(
        { error: 'avatarId, serviceType, and quantity are required' },
        { status: 400 }
      );
    }

    const validServiceTypes = Object.keys(SERVICE_PRICES);
    if (!validServiceTypes.includes(serviceType)) {
      return NextResponse.json(
        { error: `Invalid serviceType. Must be one of: ${validServiceTypes.join(', ')}` },
        { status: 400 }
      );
    }

    const unitPrice = SERVICE_PRICES[serviceType as keyof typeof SERVICE_PRICES];
    const totalAmount = unitPrice * quantity;

    // Determine billing period (current month)
    const now = new Date();
    const billingPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Look up active subscription
    const subscription = await db.subscription.findFirst({
      where: {
        avatarId,
        status: { in: ['active', 'trialing'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    let stripeReportId: string | undefined;

    if (subscription?.stripeSubId) {
      try {
        // Report usage to Stripe
        const usageRecord = await stripe.subscriptionItems.createUsageRecord(
          subscription.stripeSubId,
          {
            quantity,
            timestamp: Math.floor(Date.now() / 1000),
            action: 'increment',
          }
        );
        stripeReportId = usageRecord.id;
      } catch (stripeError) {
        console.warn('[API] Stripe usage report failed, recording locally only:', stripeError);
      }
    }

    // Create UsageRecord in DB
    const usageRecordDb = await db.usageRecord.create({
      data: {
        avatarId,
        serviceType,
        quantity,
        unitPrice,
        totalAmount,
        billingPeriod,
        status: stripeReportId ? 'billed' : 'unbilled',
        stripeReportId: stripeReportId || null,
      },
    });

    return NextResponse.json({
      usageRecordId: usageRecordDb.id,
      totalAmount,
      billingPeriod,
      stripeReportId: stripeReportId || null,
    }, { status: 201 });
  } catch (error) {
    console.error('[API] Error in POST /api/stripe/usage:', error);
    return NextResponse.json(
      { error: 'Failed to report usage', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET /api/stripe/usage — Get usage summary for an avatar
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const avatarId = searchParams.get('avatarId');
    const billingPeriod = searchParams.get('billingPeriod');

    if (!avatarId) {
      return NextResponse.json(
        { error: 'avatarId query parameter is required' },
        { status: 400 }
      );
    }

    const where: Record<string, unknown> = { avatarId };
    if (billingPeriod) where.billingPeriod = billingPeriod;

    const usageRecords = await db.usageRecord.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    // Group by serviceType with totals
    const grouped = usageRecords.reduce((acc, record) => {
      const key = record.serviceType;
      if (!acc[key]) {
        acc[key] = {
          serviceType: key,
          totalQuantity: 0,
          totalAmount: 0,
          records: [],
        };
      }
      acc[key].totalQuantity += record.quantity;
      acc[key].totalAmount += record.totalAmount;
      acc[key].records.push(record);
      return acc;
    }, {} as Record<string, { serviceType: string; totalQuantity: number; totalAmount: number; records: typeof usageRecords }>);

    const summary = Object.values(grouped);
    const grandTotal = summary.reduce((sum, group) => sum + group.totalAmount, 0);

    // Get current subscription tier info if available
    const subscription = await db.subscription.findFirst({
      where: {
        avatarId,
        status: { in: ['active', 'trialing'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    let tierInfo = null;
    if (subscription) {
      const tierConfig = PAYMENT_TIERS[subscription.tier as keyof typeof PAYMENT_TIERS];
      tierInfo = {
        tier: subscription.tier,
        status: subscription.status,
        currentPeriodEnd: subscription.currentPeriodEnd,
      };
    }

    return NextResponse.json({
      avatarId,
      billingPeriod: billingPeriod || 'all',
      summary,
      grandTotal,
      totalRecords: usageRecords.length,
      subscription: tierInfo,
    });
  } catch (error) {
    console.error('[API] Error in GET /api/stripe/usage:', error);
    return NextResponse.json(
      { error: 'Failed to get usage summary', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
