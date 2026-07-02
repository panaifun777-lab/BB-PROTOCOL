import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { SUPPORTED_CURRENCIES, FALLBACK_RATES } from '@/lib/stripe-config';

// GET /api/currency — Get supported currencies and rates
export async function GET() {
  try {
    // Try to get rates from DB first
    const dbRates = await db.currencyRate.findMany({
      orderBy: { target: 'asc' },
    });

    let rates: Record<string, { rate: number; source: string; updatedAt: string }>;

    if (dbRates.length > 0) {
      // Use DB rates
      rates = {};
      // Always include USD base
      rates['USD'] = { rate: 1, source: 'base', updatedAt: new Date().toISOString() };
      for (const row of dbRates) {
        rates[row.target] = {
          rate: row.rate,
          source: row.source,
          updatedAt: row.updatedAt.toISOString(),
        };
      }
    } else {
      // Fallback to hardcoded rates
      rates = {};
      rates['USD'] = { rate: 1, source: 'fallback', updatedAt: new Date().toISOString() };
      for (const [code, rate] of Object.entries(FALLBACK_RATES)) {
        if (code !== 'USD') {
          rates[code] = { rate, source: 'fallback', updatedAt: new Date().toISOString() };
        }
      }
    }

    const currencies = SUPPORTED_CURRENCIES.map(c => ({
      ...c,
      rate: rates[c.code]?.rate || FALLBACK_RATES[c.code] || 1,
      source: rates[c.code]?.source || 'fallback',
    }));

    return NextResponse.json({
      base: 'USD',
      currencies,
      rates,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[API] Error in GET /api/currency:', error);
    return NextResponse.json(
      { error: 'Failed to get currency rates', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST /api/currency — Convert amount between currencies
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, fromCurrency, toCurrency } = body;

    if (amount === undefined || !fromCurrency || !toCurrency) {
      return NextResponse.json(
        { error: 'amount, fromCurrency, and toCurrency are required' },
        { status: 400 }
      );
    }

    const numericAmount = Number(amount);
    if (isNaN(numericAmount)) {
      return NextResponse.json(
        { error: 'amount must be a valid number' },
        { status: 400 }
      );
    }

    // Validate currency codes
    const validCodes = SUPPORTED_CURRENCIES.map(c => c.code);
    if (!validCodes.includes(fromCurrency as typeof validCodes[number])) {
      return NextResponse.json(
        { error: `Invalid fromCurrency. Supported: ${validCodes.join(', ')}` },
        { status: 400 }
      );
    }
    if (!validCodes.includes(toCurrency as typeof validCodes[number])) {
      return NextResponse.json(
        { error: `Invalid toCurrency. Supported: ${validCodes.join(', ')}` },
        { status: 400 }
      );
    }

    // Get rates
    const fromRate = FALLBACK_RATES[fromCurrency] || 1;
    const toRate = FALLBACK_RATES[toCurrency] || 1;

    // Convert: amount in fromCurrency → USD → toCurrency
    const usdAmount = numericAmount / fromRate;
    const convertedAmount = Number((usdAmount * toRate).toFixed(2));
    const rate = Number((toRate / fromRate).toFixed(6));

    return NextResponse.json({
      originalAmount: numericAmount,
      convertedAmount,
      rate,
      fromCurrency,
      toCurrency,
    });
  } catch (error) {
    console.error('[API] Error in POST /api/currency:', error);
    return NextResponse.json(
      { error: 'Failed to convert currency', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
