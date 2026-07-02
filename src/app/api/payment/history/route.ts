import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/payment/history — Get payment history with pagination and stats
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const avatarId = searchParams.get('avatarId');
    const pageParam = searchParams.get('page');
    const limitParam = searchParams.get('limit');
    const status = searchParams.get('status');

    const page = Math.max(1, parseInt(pageParam || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(limitParam || '20', 10)));

    const where: Record<string, unknown> = {};
    if (avatarId) where.avatarId = avatarId;
    if (status) where.status = status;

    const [payments, total, statsData] = await Promise.all([
      db.payment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.payment.count({ where }),
      db.payment.aggregate({
        where: avatarId ? { avatarId } : {},
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    // Count by status
    const [confirmedCount, pendingCount, failedCount] = await Promise.all([
      db.payment.count({ where: { ...where, status: 'confirmed' } }),
      db.payment.count({ where: { ...where, status: 'pending' } }),
      db.payment.count({ where: { ...where, status: 'failed' } }),
    ]);

    const totalPages = Math.ceil(total / limit);

    const stats = {
      totalAmount: statsData._sum.amount || 0,
      confirmed: confirmedCount,
      pending: pendingCount,
      failed: failedCount,
    };

    return NextResponse.json({
      payments,
      total,
      page,
      totalPages,
      stats,
    });
  } catch (error) {
    console.error('Failed to get payment history:', error);
    return NextResponse.json(
      { error: 'Failed to get payment history', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
