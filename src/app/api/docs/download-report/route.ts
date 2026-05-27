import { NextRequest } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

// GET /api/docs/download-report — Download system feature report
export async function GET(_request: NextRequest) {
  try {
    const filePath = join(process.cwd(), 'docs', 'BB-PROTOCOL-SYSTEM-REPORT.md');
    const content = readFileSync(filePath, 'utf-8');

    return new Response(content, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': 'attachment; filename="BB-PROTOCOL-SYSTEM-REPORT.md"',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Report file not found' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
