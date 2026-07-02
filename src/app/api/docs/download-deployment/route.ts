import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function GET(_request: NextRequest) {
  try {
    const filePath = join(process.cwd(), 'BB-PROTOCOL-DEPLOYMENT-GUIDE.md');
    const fileBuffer = await readFile(filePath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': 'attachment; filename="BB-PROTOCOL-DEPLOYMENT-GUIDE.md"',
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('[download-deployment] Error:', error);
    return NextResponse.json(
      { error: 'Deployment guide file not found' },
      { status: 404 }
    );
  }
}
