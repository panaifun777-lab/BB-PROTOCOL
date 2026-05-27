import { NextRequest } from 'next/server';
import { spawn } from 'child_process';
import { Readable } from 'stream';
import { statSync } from 'fs';
import { join } from 'path';

// Directories to include in the archive
const INCLUDE_DIRS = [
  'src',
  'prisma',
  'public',
  'contracts',
  'mini-services',
  'db',
  'e2e',
  'rust-engine',
  'examples',
];

// Individual files to include
const INCLUDE_FILES = [
  'package.json',
  'next.config.ts',
  'tsconfig.json',
  'components.json',
  'postcss.config.mjs',
  'eslint.config.mjs',
  'tailwind.config.ts',
  'Dockerfile',
  'docker-compose.yml',
  'docker-compose.dev.yml',
  'Caddyfile',
  'bun.lock',
  'next-env.d.ts',
  'playwright.config.ts',
  'add-i18n-keys.mjs',
  'replace-i18n-strings.mjs',
  'BB-PROTOCOL-FEATURES.md',
  'DEPLOYMENT-GUIDE.md',
];

// Patterns to exclude
const EXCLUDE_PATTERNS = [
  'node_modules',
  '.next',
  '.git',
  'bb-project-source.tar.gz',
  'dev.log',
  'agent-ctx',
  'download',
  'upload',
  'playwright-report',
  'test-results',
];

// Check if a path exists
function pathExists(root: string, relativePath: string): boolean {
  try {
    statSync(join(root, relativePath));
    return true;
  } catch {
    return false;
  }
}

// GET /api/download — Stream project source as tar.gz
export async function GET(_request: NextRequest) {
  try {
    const projectRoot = process.cwd();

    // Filter to only existing paths
    const existingDirs = INCLUDE_DIRS.filter(d => pathExists(projectRoot, d));
    const existingFiles = INCLUDE_FILES.filter(f => pathExists(projectRoot, f));

    if (existingDirs.length === 0 && existingFiles.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No source files found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Build tar arguments
    const tarArgs = [
      '-czf', '-',           // Compress to stdout
      '-C', projectRoot,     // Change to project dir
      ...EXCLUDE_PATTERNS.map(p => `--exclude=${p}`),
      ...existingDirs,
      ...existingFiles,
    ];

    const tarProcess = spawn('tar', tarArgs, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    // Convert Node.js Readable to Web ReadableStream
    const readable = Readable.toWeb(tarProcess.stdout) as ReadableStream<Uint8Array>;

    // Log stderr but don't block
    tarProcess.stderr.on('data', (data: Buffer) => {
      console.error('[Download] tar stderr:', data.toString());
    });

    tarProcess.on('error', (err) => {
      console.error('[Download] tar process error:', err);
    });

    // Create a TransformStream to handle streaming
    const { readable: outputReadable, writable } = new TransformStream<Uint8Array, Uint8Array>();

    // Pipe the tar output through
    const reader = readable.getReader();
    const writer = writable.getWriter();

    // Stream data asynchronously
    (async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          await writer.write(value);
        }
      } catch {
        // Stream may be cancelled if client disconnects
      } finally {
        try { await writer.close(); } catch { /* already closed */ }
      }
    })();

    return new Response(outputReadable, {
      status: 200,
      headers: {
        'Content-Type': 'application/gzip',
        'Content-Disposition': 'attachment; filename="bb-protocol-source.tar.gz"',
        'Cache-Control': 'no-cache, no-store',
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (error) {
    console.error('[Download] Error creating archive:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to create source archive',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
