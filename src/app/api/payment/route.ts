import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/payment — List payments with optional filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const avatarId = searchParams.get('avatarId');
    const status = searchParams.get('status');
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 50;

    const where: Record<string, unknown> = {};
    if (avatarId) where.avatarId = avatarId;
    if (status) where.status = status;

    const payments = await db.payment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return NextResponse.json(payments);
  } catch (error) {
    console.error('Failed to list payments:', error);
    return NextResponse.json(
      { error: 'Failed to list payments', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST /api/payment — Create a new payment record
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { avatarId, serviceName, amount, currency, gasFee, riskLevel } = body;

    if (!avatarId || !serviceName || amount === undefined) {
      return NextResponse.json(
        { error: 'avatarId, serviceName, and amount are required' },
        { status: 400 }
      );
    }

    // Auto-calculate riskLevel based on amount
    const computedRiskLevel = riskLevel || (amount <= 0.05 ? 'low' : amount <= 0.5 ? 'medium' : 'high');

    // Auto-calculate gasFee as 5% of amount if not provided
    const computedGasFee = gasFee !== undefined ? gasFee : Number((amount * 0.05).toFixed(6));

    const payment = await db.payment.create({
      data: {
        avatarId,
        serviceName,
        amount,
        currency: currency || 'USDC',
        gasFee: computedGasFee,
        riskLevel: computedRiskLevel,
        status: 'pending',
      },
    });

    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    console.error('Failed to create payment:', error);
    return NextResponse.json(
      { error: 'Failed to create payment', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
