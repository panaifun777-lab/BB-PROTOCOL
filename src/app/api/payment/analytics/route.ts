import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/payment/analytics — Payment analytics dashboard data
export async function GET() {
  try {
    // 1. Total revenue from confirmed payments
    const revenueResult = await db.payment.aggregate({
      where: { status: 'confirmed' },
      _sum: { amount: true },
      _count: true,
    });
    const totalRevenue = revenueResult._sum.amount || 0;

    // 2. Monthly revenue for last 6 months
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const confirmedPayments = await db.payment.findMany({
      where: {
        status: 'confirmed',
        createdAt: { gte: sixMonthsAgo },
      },
      select: { amount: true, currency: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    // Group by month
    const monthlyMap = new Map<string, number>();
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyMap.set(key, 0);
    }
    for (const p of confirmedPayments) {
      const key = `${p.createdAt.getFullYear()}-${String(p.createdAt.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyMap.has(key)) {
        monthlyMap.set(key, (monthlyMap.get(key) || 0) + p.amount);
      }
    }
    const monthlyRevenue = Array.from(monthlyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, amount]) => ({ month, amount: Math.round(amount * 100) / 100 }));

    // 3. Average transaction size
    const avgTransactionSize = revenueResult._count > 0
      ? Math.round((totalRevenue / revenueResult._count) * 100) / 100
      : 0;

    // 4. Payment method breakdown: x402 (USDC) vs Stripe (USD) vs Subscription
    const [x402Count, stripeCount, subscriptionCount] = await Promise.all([
      db.payment.count({ where: { currency: 'USDC' } }),
      db.payment.count({ where: { currency: 'USD' } }),
      db.subscription.count(),
    ]);

    const methodBreakdown = { x402: x402Count, stripe: stripeCount, subscription: subscriptionCount };

    // 5. Conversion funnel
    const [initiatedCount, completedCount, failedCount] = await Promise.all([
      db.payment.count(), // all = initiated
      db.payment.count({ where: { status: 'confirmed' } }),
      db.payment.count({ where: { status: 'failed' } }),
    ]);

    const conversionRate = initiatedCount > 0
      ? Math.round((completedCount / initiatedCount) * 10000) / 100
      : 0;
    const failureRate = initiatedCount > 0
      ? Math.round((failedCount / initiatedCount) * 10000) / 100
      : 0;

    const conversionFunnel = {
      initiated: initiatedCount,
      completed: completedCount,
      failed: failedCount,
      rates: {
        conversionRate,
        failureRate,
        pendingRate: Math.round((1 - conversionRate / 100 - failureRate / 100) * 10000) / 100,
      },
    };

    // 6. Top 5 services by revenue
    const allPayments = await db.payment.findMany({
      where: { status: 'confirmed' },
      select: { serviceName: true, amount: true },
    });

    const serviceMap = new Map<string, { count: number; totalAmount: number }>();
    for (const p of allPayments) {
      const existing = serviceMap.get(p.serviceName) || { count: 0, totalAmount: 0 };
      existing.count++;
      existing.totalAmount += p.amount;
      serviceMap.set(p.serviceName, existing);
    }

    const topServices = Array.from(serviceMap.entries())
      .map(([serviceName, data]) => ({
        serviceName,
        count: data.count,
        totalAmount: Math.round(data.totalAmount * 100) / 100,
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 5);

    // 7. Recent 5 payments
    const recentPayments = await db.payment.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    return NextResponse.json({
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      monthlyRevenue,
      avgTransactionSize,
      methodBreakdown,
      conversionFunnel,
      topServices,
      recentPayments,
    });
  } catch (error) {
    console.error('Failed to get payment analytics:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
