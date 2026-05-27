import { NextRequest } from 'next/server';
import { execSync } from 'child_process';
import { existsSync, readFileSync, unlinkSync, statSync, writeFileSync } from 'fs';
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
  'node_modules',
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
  '.next',
  '.git',
  'bb-project-source.tar.gz',
  'bb-protocol-source.tar.gz',
  'dev.log',
  'agent-ctx',
  'download',
  'upload',
  'playwright-report',
  'test-results',
  'cache',
  '.cache',
  'tmp',
  'mini-services/*/node_modules',
  'node_modules/.cache',
  'node_modules/**/prebuilds',
  'node_modules/**/darwin-*',
  'node_modules/**/win32-*',
  'node_modules/**/android-*',
  'node_modules/**/ia32',
  'node_modules/**/*.md',
  'node_modules/**/LICENSE*',
  'node_modules/**/CHANGELOG*',
  'node_modules/**/.github',
  'node_modules/**/test',
  'node_modules/**/tests',
  'node_modules/**/__tests__',
  'node_modules/**/docs',
  'node_modules/**/*.map',
  'node_modules/**/README*',
  'node_modules/@next/swc-*',
  'node_modules/@img',
  'node_modules/@codesandbox',
  'node_modules/playwright-core',
  'node_modules/date-fns-jalali',
];

function pathExists(root: string, relativePath: string): boolean {
  try {
    statSync(join(root, relativePath));
    return true;
  } catch {
    return false;
  }
}

// GET /api/download — Serve full project source as tar.gz
export async function GET(_request: NextRequest) {
  const archiveName = 'bb-protocol-source.tar.gz';

  try {
    const projectRoot = process.cwd();

    const existingDirs = INCLUDE_DIRS.filter(d => pathExists(projectRoot, d));
    const existingFiles = INCLUDE_FILES.filter(f => pathExists(projectRoot, f));

    if (existingDirs.length === 0 && existingFiles.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No source files found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const archivePath = join(projectRoot, archiveName);

    // Create sanitized .env.example
    let envExamplePath: string | null = null;
    if (existsSync(join(projectRoot, '.env'))) {
      try {
        const envContent = readFileSync(join(projectRoot, '.env'), 'utf-8');
        const sanitized = envContent
          .split('\n')
          .map(line => {
            const match = line.match(/^(\s*[A-Za-z_][A-Za-z0-9_]*\s*=\s*)/);
            if (match && !line.startsWith('#')) {
              return `${match[1]}your-value-here`;
            }
            return line;
          })
          .join('\n');
        envExamplePath = join(projectRoot, '.env.example.tmp');
        writeFileSync(envExamplePath, sanitized);
      } catch {
        envExamplePath = null;
      }
    }

    // Build tar command
    const tarArgs = [
      '-czf', archivePath,
      '-C', projectRoot,
      ...EXCLUDE_PATTERNS.map(p => `--exclude=${p}`),
    ];

    if (envExamplePath) {
      tarArgs.push('--transform', 's/\\.env\\.example\\.tmp/.env.example/');
      tarArgs.push('.env.example.tmp');
    }

    tarArgs.push(...existingDirs, ...existingFiles);

    execSync(`tar ${tarArgs.map(a => `'${a}'`).join(' ')}`, {
      cwd: projectRoot,
      stdio: 'pipe',
      timeout: 300_000,
      maxBuffer: 1024 * 1024 * 1024,
    });

    // Clean up temp file
    if (envExamplePath) {
      try { unlinkSync(envExamplePath); } catch { /* ignore */ }
    }

    if (!existsSync(archivePath)) {
      return new Response(
        JSON.stringify({ error: 'Failed to create archive' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const fileBuffer = readFileSync(archivePath);

    // Clean up archive from disk
    try { unlinkSync(archivePath); } catch { /* ignore */ }

    const sizeMB = (fileBuffer.length / (1024 * 1024)).toFixed(1);
    console.log(`[Download] Serving ${archiveName} (${sizeMB} MB)`);

    return new Response(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/gzip',
        'Content-Disposition': `attachment; filename="${archiveName}"`,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'no-cache, no-store',
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
