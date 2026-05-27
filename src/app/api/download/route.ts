import { NextRequest, NextResponse } from 'next/server';
import { readFile, stat } from 'fs/promises';
import { join } from 'path';

const FILE_PATH = join(process.cwd(), 'bb-project-source.tar.gz');

export async function GET(_request: NextRequest) {
  try {
    const fileStat = await stat(FILE_PATH);
    const data = await readFile(FILE_PATH);

    return new NextResponse(data, {
      status: 200,
      headers: {
        'Content-Type': 'application/gzip',
        'Content-Disposition': 'attachment; filename="bb-project-source.tar.gz"',
        'Content-Length': fileStat.size.toString(),
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'File not found';
    return NextResponse.json({ error: msg }, { status: 404 });
  }
}
