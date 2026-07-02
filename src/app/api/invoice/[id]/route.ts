import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/invoice/[id] — Get single invoice with full details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const invoice = await db.invoice.findUnique({
      where: { id },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Parse line items from JSON
    let parsedLineItems;
    try {
      parsedLineItems = JSON.parse(invoice.lineItems);
    } catch {
      parsedLineItems = [];
    }

    // Parse metadata from JSON
    let parsedMetadata;
    try {
      parsedMetadata = invoice.metadata ? JSON.parse(invoice.metadata) : null;
    } catch {
      parsedMetadata = null;
    }

    return NextResponse.json({
      ...invoice,
      lineItems: parsedLineItems,
      metadata: parsedMetadata,
    });
  } catch (error) {
    console.error('[API] Error in GET /api/invoice/[id]:', error);
    return NextResponse.json(
      { error: 'Failed to get invoice', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
