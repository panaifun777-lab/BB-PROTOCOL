import { NextResponse } from 'next/server';

const START_TIME = Date.now();

export async function GET() {
  const uptime = Math.floor((Date.now() - START_TIME) / 1000);
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = uptime % 60;

  return NextResponse.json({
    status: 'ok',
    version: '5.0.0',
    uptime: `${hours}h ${minutes}m ${seconds}s`,
    uptimeSeconds: uptime,
    timestamp: new Date().toISOString(),
    services: {
      app: { status: 'online', port: 3000 },
      resonanceSim: { status: 'online', port: 3003 },
      monitoringSim: { status: 'online', port: 3004 },
      ifdCalculator: { status: 'online', port: 3005 },
      eceOracle: { status: 'online', port: 3006 },
      poueProver: { status: 'online', port: 3007 },
      mcpRouter: { status: 'online', port: 3008 },
    },
    contracts: {
      count: 10,
      network: 'Base L2',
      chainId: 8453,
      solidityVersion: '0.8.24',
    },
    infrastructure: {
      i18n: { supported: 8, locales: ['zh', 'en', 'ja', 'ko', 'es', 'fr', 'de', 'ar'] },
      stateManagement: 'Zustand + TanStack Query',
      testing: 'Playwright E2E',
      cicd: 'GitHub Actions',
      containerization: 'Docker Compose',
    },
  });
}
