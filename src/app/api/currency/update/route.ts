import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { FALLBACK_RATES } from '@/lib/stripe-config';

// POST /api/currency/update — Update currency rates (admin)
export async function POST() {
  try {
    // In production, this would fetch live rates from an API (e.g., Stripe or external FX API)
    // For now, we use the fallback rates and store them in DB
    const rates = FALLBACK_RATES;
    const results: any[] = [];

    for (const [target, rate] of Object.entries(rates)) {
      if (target === 'USD') continue; // Skip base currency

      // Upsert the rate in DB using the @@unique([base, target]) compound key
      const upserted = await db.currencyRate.upsert({
        where: {
          base_target: {
            base: 'USD',
            target,
          },
        },
        update: {
          rate,
          source: 'fallback',
        },
        create: {
          base: 'USD',
          target,
          rate,
          source: 'fallback',
        },
      });
      results.push(upserted);
    }

    return NextResponse.json({
      message: 'Currency rates updated successfully',
      base: 'USD',
      updatedCount: results.length,
      rates: FALLBACK_RATES,
    });
  } catch (error) {
    console.error('[API] Error in POST /api/currency/update:', error);
    return NextResponse.json(
      { error: 'Failed to update currency rates', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
