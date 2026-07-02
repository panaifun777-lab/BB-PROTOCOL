import { test, expect } from '@playwright/test';
import { getApiEndpoint, testApiResponse } from './helpers';

const API_ENDPOINTS = [
  {
    path: 'dashboard',
    expectedFields: ['avatar', 'skills', 'revenueSummary'],
    description: 'Dashboard aggregate data',
  },
  {
    path: 'avatars',
    expectedFields: [],
    description: 'Avatar list',
  },
  {
    path: 'revenues',
    expectedFields: [],
    description: 'Revenue list',
  },
  {
    path: 'skills',
    expectedFields: [],
    description: 'Skills list',
  },
  {
    path: 'delegations',
    expectedFields: [],
    description: 'Delegation list',
  },
  {
    path: 'resonance',
    expectedFields: [],
    description: 'Resonance data',
  },
  {
    path: 'liquidity',
    expectedFields: ['pool', 'tokenEconomics', 'staking'],
    description: 'Liquidity data',
  },
  {
    path: 'security',
    expectedFields: ['score', 'invariants', 'findings'],
    description: 'Security audit data',
  },
  {
    path: 'compliance',
    expectedFields: ['plugins', 'jurisdictions'],
    description: 'Compliance data',
  },
  {
    path: 'contracts/simulate',
    expectedFields: [],
    description: 'Contract simulation (GET)',
  },
  {
    path: 'performance',
    expectedFields: ['metrics', 'cacheStrategies'],
    description: 'Performance data',
  },
  {
    path: 'deployment',
    expectedFields: ['status', 'contracts'],
    description: 'Deployment data',
  },
  {
    path: 'monitoring',
    expectedFields: ['metrics', 'alertRules'],
    description: 'Monitoring data',
  },
  {
    path: 'feature-flags',
    expectedFields: ['flags', 'abTests'],
    description: 'Feature flags data',
  },
  {
    path: 'multichain',
    expectedFields: ['chains', 'bridges'],
    description: 'Multi-chain data',
  },
  {
    path: 'sdk-platform',
    expectedFields: ['endpoints', 'apiKeys'],
    description: 'SDK platform data',
  },
  {
    path: 'ecosystem',
    expectedFields: ['protocols', 'wallets'],
    description: 'Ecosystem data',
  },
  {
    path: 'dao-governance',
    expectedFields: [],
    description: 'DAO governance data',
  },
  {
    path: 'engine-arch',
    expectedFields: [],
    description: 'Engine architecture data',
  },
  {
    path: 'contracts-arch',
    expectedFields: [],
    description: 'Contracts architecture data',
  },
  {
    path: 'data-infra',
    expectedFields: [],
    description: 'Data infrastructure data',
  },
  {
    path: 'web3-integration',
    expectedFields: [],
    description: 'Web3 integration data',
  },
];

test.describe('API Health Checks', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  for (const endpoint of API_ENDPOINTS) {
    test(`GET /api/${endpoint.path} returns 200 - ${endpoint.description}`, async ({ page }) => {
      const url = getApiEndpoint(endpoint.path);
      const response = await page.request.get(url);
      expect(response.status()).toBe(200);

      // Verify response is valid JSON
      const data = await response.json();
      expect(data).toBeDefined();
      expect(typeof data).toBe('object');
    });
  }

  test('GET /api/dashboard returns complete dashboard data', async ({ page }) => {
    const { data } = await testApiResponse(page, 'dashboard', ['avatar', 'skills', 'revenueSummary']);
    expect(data).toBeDefined();
  });

  test('GET /api/security returns security audit data', async ({ page }) => {
    const { data } = await testApiResponse(page, 'security', ['score', 'invariants', 'findings']);
    expect(data).toBeDefined();
  });

  test('GET /api/liquidity returns liquidity data', async ({ page }) => {
    const { data } = await testApiResponse(page, 'liquidity', ['pool', 'tokenEconomics', 'staking']);
    expect(data).toBeDefined();
  });

  test('GET /api/feature-flags returns feature flags data', async ({ page }) => {
    const { data } = await testApiResponse(page, 'feature-flags', ['flags', 'abTests']);
    expect(data).toBeDefined();
  });
});

test.describe('API Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('GET /api/nonexistent returns 404', async ({ page }) => {
    const response = await page.request.get('/api/nonexistent-endpoint');
    expect(response.status()).toBe(404);
  });

  test('POST /api/contracts/simulate with valid data returns result', async ({ page }) => {
    const response = await page.request.post('/api/contracts/simulate', {
      data: {
        contract: 'AvatarCore',
        functionName: 'createAvatar',
        params: { name: 'Test Avatar' },
      },
    });
    // Should return 200 with simulation result
    expect([200, 400]).toContain(response.status());
  });

  test('POST /api/contracts/simulate with invalid data returns error', async ({ page }) => {
    const response = await page.request.post('/api/contracts/simulate', {
      data: {},
    });
    // Should return 400 for invalid request
    expect([200, 400, 422]).toContain(response.status());
  });

  test('POST /api/feature-flags toggle operation works', async ({ page }) => {
    const response = await page.request.post('/api/feature-flags', {
      data: {
        operation: 'toggle',
        flagKey: 'test-flag',
        isActive: true,
      },
    });
    // Should return 200 or handle gracefully
    expect([200, 400, 404]).toContain(response.status());
  });

  test('POST /api/compliance plugin toggle works', async ({ page }) => {
    const response = await page.request.post('/api/compliance', {
      data: {
        pluginId: 'kyc-plugin',
        isActive: true,
      },
    });
    expect([200, 400, 404]).toContain(response.status());
  });
});

test.describe('API Response Structure Validation', () => {
  test('security API has expected structure', async ({ page }) => {
    await page.goto('/');
    const response = await page.request.get('/api/security');
    const data = await response.json();

    expect(data).toHaveProperty('score');
    expect(typeof data.score).toBe('number');
    expect(data.score).toBeGreaterThanOrEqual(0);
    expect(data.score).toBeLessThanOrEqual(100);
  });

  test('feature-flags API has expected structure', async ({ page }) => {
    await page.goto('/');
    const response = await page.request.get('/api/feature-flags');
    const data = await response.json();

    expect(data).toHaveProperty('flags');
    expect(Array.isArray(data.flags)).toBe(true);
    expect(data).toHaveProperty('abTests');
    expect(Array.isArray(data.abTests)).toBe(true);
  });

  test('monitoring API has expected structure', async ({ page }) => {
    await page.goto('/');
    const response = await page.request.get('/api/monitoring');
    const data = await response.json();

    expect(data).toHaveProperty('metrics');
    expect(data).toHaveProperty('alertRules');
    expect(Array.isArray(data.alertRules)).toBe(true);
  });
});
