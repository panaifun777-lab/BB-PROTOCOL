import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { INVOICE_LINE_ITEMS, PAYMENT_TIERS, SERVICE_PRICES, FALLBACK_RATES } from '@/lib/stripe-config';

// Helper: generate invoice number INV-YYYYMM-XXXX
async function generateInvoiceNumber(): Promise<string> {
  const now = new Date();
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prefix = `INV-${yearMonth}-`;

  // Find the latest invoice number with this prefix
  const latest = await db.invoice.findFirst({
    where: { invoiceNumber: { startsWith: prefix } },
    orderBy: { invoiceNumber: 'desc' },
  });

  let sequence = 1;
  if (latest) {
    const parts = latest.invoiceNumber.split('-');
    const lastSeq = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastSeq)) {
      sequence = lastSeq + 1;
    }
  }

  return `${prefix}${String(sequence).padStart(4, '0')}`;
}

// Helper: convert amount from USD to target currency
function convertCurrency(amount: number, fromCurrency: string, toCurrency: string): number {
  if (fromCurrency === toCurrency) return amount;
  // Convert from source to USD first, then to target
  const fromRate = FALLBACK_RATES[fromCurrency] || 1;
  const toRate = FALLBACK_RATES[toCurrency] || 1;
  const usdAmount = amount / fromRate;
  return Number((usdAmount * toRate).toFixed(2));
}

// POST /api/invoice — Generate invoice for a payment or subscription
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { avatarId, paymentId, subscriptionId, currency } = body;

    if (!avatarId) {
      return NextResponse.json(
        { error: 'avatarId is required' },
        { status: 400 }
      );
    }

    if (!paymentId && !subscriptionId) {
      return NextResponse.json(
        { error: 'Either paymentId or subscriptionId is required' },
        { status: 400 }
      );
    }

    const targetCurrency = currency || 'usd';
    let lineItems: Array<{ description: string; quantity: number; unitPrice: number; amount: number }> = [];
    let baseAmount = 0;
    let invoicePaymentId: string | undefined;
    let invoiceSubscriptionId: string | undefined;

    if (paymentId) {
      // Generate invoice from a one-time payment
      const payment = await db.payment.findUnique({ where: { id: paymentId } });
      if (!payment) {
        return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
      }
      if (payment.avatarId !== avatarId) {
        return NextResponse.json({ error: 'Payment does not belong to this avatar' }, { status: 403 });
      }

      lineItems = [INVOICE_LINE_ITEMS.oneTime(payment.serviceName, payment.amount)];
      baseAmount = payment.amount;
      invoicePaymentId = paymentId;
    } else if (subscriptionId) {
      // Generate invoice from a subscription
      const subscription = await db.subscription.findUnique({ where: { id: subscriptionId } });
      if (!subscription) {
        return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
      }
      if (subscription.avatarId !== avatarId) {
        return NextResponse.json({ error: 'Subscription does not belong to this avatar' }, { status: 403 });
      }

      const tierConfig = PAYMENT_TIERS[subscription.tier as keyof typeof PAYMENT_TIERS];
      lineItems = [INVOICE_LINE_ITEMS.subscription(subscription.tier, tierConfig.amount / 100)];
      baseAmount = tierConfig.amount / 100;
      invoiceSubscriptionId = subscriptionId;

      // Add usage records for this billing period
      const billingPeriod = `${subscription.currentPeriodStart.getFullYear()}-${String(subscription.currentPeriodStart.getMonth() + 1).padStart(2, '0')}`;
      const usageRecords = await db.usageRecord.findMany({
        where: {
          avatarId,
          billingPeriod,
          status: 'unbilled',
        },
      });

      for (const record of usageRecords) {
        lineItems.push(INVOICE_LINE_ITEMS.usage(record.serviceType, record.quantity, record.unitPrice / 100));
      }

      // Mark usage records as billed
      if (usageRecords.length > 0) {
        await db.usageRecord.updateMany({
          where: {
            id: { in: usageRecords.map(r => r.id) },
          },
          data: { status: 'billed' },
        });
      }
    }

    // Calculate totals
    const amount = lineItems.reduce((sum, item) => sum + item.amount, 0);
    const tax = Number((amount * 0).toFixed(2)); // No tax by default
    const discount = 0;
    const totalAmount = Number((amount + tax - discount).toFixed(2));

    // Convert to target currency if needed
    const convertedTotal = targetCurrency !== 'usd' ? convertCurrency(totalAmount, 'usd', targetCurrency) : totalAmount;

    // Generate invoice number
    const invoiceNumber = await generateInvoiceNumber();

    // Due date: 30 days from now
    const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const invoice = await db.invoice.create({
      data: {
        avatarId,
        paymentId: invoicePaymentId || null,
        subscriptionId: invoiceSubscriptionId || null,
        invoiceNumber,
        amount: targetCurrency !== 'usd' ? convertCurrency(amount, 'usd', targetCurrency) : amount,
        currency: targetCurrency,
        tax: targetCurrency !== 'usd' ? convertCurrency(tax, 'usd', targetCurrency) : tax,
        discount,
        totalAmount: convertedTotal,
        status: 'issued',
        dueDate,
        issuedAt: new Date(),
        lineItems: JSON.stringify(lineItems),
        metadata: JSON.stringify({ originalUsdAmount: totalAmount, targetCurrency }),
      },
    });

    return NextResponse.json({
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      totalAmount: invoice.totalAmount,
      currency: invoice.currency,
      lineItems,
      pdfUrl: invoice.pdfUrl,
    }, { status: 201 });
  } catch (error) {
    console.error('[API] Error in POST /api/invoice:', error);
    return NextResponse.json(
      { error: 'Failed to generate invoice', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET /api/invoice — List invoices
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const avatarId = searchParams.get('avatarId');
    const status = searchParams.get('status');
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');
    const limit = limitParam ? parseInt(limitParam, 10) : 50;
    const offset = offsetParam ? parseInt(offsetParam, 10) : 0;

    const where: Record<string, unknown> = {};
    if (avatarId) where.avatarId = avatarId;
    if (status) where.status = status;

    const [invoices, total] = await Promise.all([
      db.invoice.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.invoice.count({ where }),
    ]);

    return NextResponse.json({
      invoices,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('[API] Error in GET /api/invoice:', error);
    return NextResponse.json(
      { error: 'Failed to list invoices', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
