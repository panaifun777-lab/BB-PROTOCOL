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

// Patterns to exclude (sensible pruning for smaller download)
const EXCLUDE_PATTERNS = [
  // Build artifacts & caches
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
  // Mini-services have their own node_modules (install separately)
  'mini-services/*/node_modules',
  // node_modules pruning: remove unnecessary files
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
  // Heavy packages not needed for runtime
  'node_modules/@next/swc-*',
  'node_modules/@img',
  'node_modules/@codesandbox',
  'node_modules/playwright-core',
  'node_modules/date-fns-jalali',
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

// GET /api/download — Serve full project source as tar.gz (includes node_modules)
export async function GET(_request: NextRequest) {
  const archiveName = 'bb-protocol-source.tar.gz';

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

    const archivePath = join(projectRoot, archiveName);

    // Create sanitized .env.example from .env
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

    // Build tar arguments
    const tarArgs = [
      '-czf', archivePath,
      '-C', projectRoot,
      ...EXCLUDE_PATTERNS.map(p => `--exclude=${p}`),
    ];

    // Add .env.example with rename transform
    if (envExamplePath) {
      tarArgs.push('--transform', 's/\\.env\\.example\\.tmp/.env.example/');
      tarArgs.push('.env.example.tmp');
    }

    tarArgs.push(...existingDirs, ...existingFiles);

    execSync(`tar ${tarArgs.map(a => `'${a}'`).join(' ')}`, {
      cwd: projectRoot,
      stdio: 'pipe',
      timeout: 180_000,
      maxBuffer: 512 * 1024 * 1024,
    });

    // Clean up temp .env.example.tmp
    if (envExamplePath) {
      try { unlinkSync(envExamplePath); } catch { /* ignore */ }
    }

    // Verify archive was created
    if (!existsSync(archivePath)) {
      return new Response(
        JSON.stringify({ error: 'Failed to create archive' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Read and serve
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
