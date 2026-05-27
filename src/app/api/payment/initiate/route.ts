import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { FIAT_SPLIT_CONFIG } from '@/lib/stripe-config';

// POST /api/payment/initiate — Unified payment router
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { avatarId, serviceName, amount, preferredMethod = 'auto', currency } = body;

    if (!avatarId || !serviceName || amount === undefined || amount <= 0) {
      return NextResponse.json(
        { error: 'avatarId, serviceName, and a positive amount are required' },
        { status: 400 }
      );
    }

    // Determine payment method based on routing logic
    let method: 'x402' | 'stripe';
    let resolvedCurrency: string;

    // Explicit currency overrides
    if (currency === 'USD') {
      method = 'stripe';
      resolvedCurrency = 'USD';
    } else if (currency === 'USDC') {
      method = 'x402';
      resolvedCurrency = 'USDC';
    } else if (preferredMethod === 'x402') {
      method = 'x402';
      resolvedCurrency = 'USDC';
    } else if (preferredMethod === 'stripe') {
      method = 'stripe';
      resolvedCurrency = 'USD';
    } else {
      // Auto-routing logic
      if (amount < 1) {
        // Micro-payment: prefer x402
        method = 'x402';
        resolvedCurrency = 'USDC';
      } else if (amount >= 1 && amount < 50) {
        // Mid-range: prefer x402 for now (could check wallet connection)
        method = 'x402';
        resolvedCurrency = 'USDC';
      } else {
        // Large amount: prefer Stripe for security
        method = 'stripe';
        resolvedCurrency = 'USD';
      }
    }

    // Auto-calculate risk level and gas fee
    const riskLevel = amount <= 0.05 ? 'low' : amount <= 0.5 ? 'medium' : 'high';
    const gasFee = method === 'x402' ? Number((amount * 0.05).toFixed(6)) : 0;

    // Create payment record
    const payment = await db.payment.create({
      data: {
        avatarId,
        serviceName,
        amount,
        currency: resolvedCurrency,
        gasFee,
        riskLevel,
        status: 'pending',
      },
    });

    // Build response
    const response: Record<string, unknown> = {
      method,
      paymentId: payment.id,
    };

    if (method === 'x402') {
      // Return split config and gas fee for x402
      response.splitConfig = {
        humanBps: FIAT_SPLIT_CONFIG.humanBps,
        avatarBps: FIAT_SPLIT_CONFIG.avatarBps,
        protocolBps: FIAT_SPLIT_CONFIG.protocolBps,
      };
      response.gasFee = gasFee;
    } else {
      // For Stripe: return a simulated checkout URL
      // In production, this would create a real Stripe Checkout Session
      response.stripeCheckoutUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/stripe/create-session?paymentId=${payment.id}`;
    }

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Failed to initiate payment:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
