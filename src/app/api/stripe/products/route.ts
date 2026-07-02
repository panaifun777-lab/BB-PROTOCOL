import { NextRequest, NextResponse } from 'next/server';
import { stripe, PAYMENT_TIERS, SERVICE_PRICES } from '@/lib/stripe-config';
import { db } from '@/lib/db';

// GET /api/stripe/products — List available products and pricing tiers
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const avatarId = searchParams.get('avatarId');
    const includeUsage = searchParams.get('includeUsage') === 'true';

    // Build products list from configured tiers
    const products = Object.entries(PAYMENT_TIERS).map(([key, tier]) => ({
      id: key,
      name: tier.name,
      priceId: tier.priceId,
      amount: tier.amount,
      currency: tier.currency,
      displayPrice: `$${(tier.amount / 100).toFixed(2)}/mo`,
      features: [...tier.features],
    }));

    // Build one-time service prices
    const services = Object.entries(SERVICE_PRICES).map(([key, price]) => ({
      type: key,
      amount: price,
      displayPrice: `$${(price / 100).toFixed(2)}`,
    }));

    const result: {
      products: typeof products;
      services: typeof services;
      subscription?: {
        tier: string;
        status: string;
        currentPeriodEnd: Date;
      } | null;
      usageSummary?: {
        totalRecords: number;
        grandTotal: number;
      } | null;
    } = { products, services };

    // If avatarId is provided, include subscription & usage info
    if (avatarId) {
      const subscription = await db.subscription.findFirst({
        where: {
          avatarId,
          status: { in: ['active', 'trialing'] },
        },
        orderBy: { createdAt: 'desc' },
      });

      result.subscription = subscription
        ? {
            tier: subscription.tier,
            status: subscription.status,
            currentPeriodEnd: subscription.currentPeriodEnd,
          }
        : null;

      if (includeUsage) {
        const now = new Date();
        const billingPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        const usageRecords = await db.usageRecord.findMany({
          where: { avatarId, billingPeriod },
        });

        const grandTotal = usageRecords.reduce((sum, r) => sum + r.totalAmount, 0);
        result.usageSummary = {
          totalRecords: usageRecords.length,
          grandTotal,
        };
      }
    }

    // Attempt to fetch Stripe products for richer data (optional, non-blocking)
    try {
      const stripeProducts = await stripe.products.list({ active: true, limit: 100 });
      const stripePrices = await stripe.prices.list({ active: true, limit: 100 });

      const enrichedProducts = products.map((product) => {
        const matchedPrice = stripePrices.data.find(
          (p) => p.id === product.priceId
        );
        const matchedProduct = matchedPrice
          ? stripeProducts.data.find((sp) => sp.id === matchedPrice.product)
          : null;

        return {
          ...product,
          stripeProductId: matchedProduct?.id || null,
          description: matchedProduct?.description || null,
          images: matchedProduct?.images || [],
        };
      });

      result.products = enrichedProducts;
    } catch {
      // Stripe API unavailable — return local config data as-is
      console.warn('[API] Stripe products list unavailable, using local config only');
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('[API] Error in GET /api/stripe/products:', error);
    return NextResponse.json(
      {
        error: 'Failed to list products',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
