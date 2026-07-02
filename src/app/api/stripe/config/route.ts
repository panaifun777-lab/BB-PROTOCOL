import { NextResponse } from 'next/server';
import {
  STRIPE_PUBLISHABLE_KEY,
  PAYMENT_TIERS,
  SERVICE_PRICES,
  FIAT_SPLIT_CONFIG,
  SUPPORTED_CURRENCIES,
  FALLBACK_RATES,
} from '@/lib/stripe-config';
import { db } from '@/lib/db';

// GET /api/stripe/config — Return Stripe public configuration
export async function GET() {
  try {
    // Fetch latest exchange rates from DB (if available)
    const dbRates = await db.currencyRate.findMany({
      where: { base: 'USD' },
    });

    // Build exchange rates: prefer DB rates, fallback to hardcoded
    const exchangeRates: Record<string, number> = { ...FALLBACK_RATES };
    for (const rate of dbRates) {
      exchangeRates[rate.target] = rate.rate;
    }

    return NextResponse.json({
      publishableKey: STRIPE_PUBLISHABLE_KEY,
      tiers: Object.entries(PAYMENT_TIERS).map(([key, tier]) => ({
        id: key,
        name: tier.name,
        priceId: tier.priceId,
        amount: tier.amount,
        currency: tier.currency,
        features: [...tier.features],
      })),
      servicePrices: Object.entries(SERVICE_PRICES).map(([key, price]) => ({
        type: key,
        amount: price,
      })),
      splitConfig: FIAT_SPLIT_CONFIG,
      supportedCurrencies: SUPPORTED_CURRENCIES.map((c) => ({
        code: c.code,
        symbol: c.symbol,
        name: c.name,
        default: c.default ?? false,
      })),
      exchangeRates,
    });
  } catch (error) {
    console.error('[API] Error in GET /api/stripe/config:', error);
    return NextResponse.json(
      {
        error: 'Failed to retrieve Stripe configuration',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
