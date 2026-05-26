import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for BB (AI Avatar/DeFi) project
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',
  /* Run tests in parallel within files */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in source code */
  forbidOnly: !!process.env.CI,
  /* Retry once on failure */
  retries: 1,
  /* Parallel workers */
  workers: process.env.CI ? 1 : 2,
  /* Global timeout */
  timeout: 30_000,
  /* Expect timeout */
  expect: {
    timeout: 10_000,
  },
  /* Reporter */
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
  ],
  /* Shared settings for all projects */
  use: {
    baseURL: 'http://localhost:3000',
    /* Collect trace on first retry */
    trace: 'on-first-retry',
    /* Screenshot on failure */
    screenshot: 'on',
    /* Video on first retry */
    video: 'on-first-retry',
    /* Action timeout */
    actionTimeout: 10_000,
    /* Navigation timeout */
    navigationTimeout: 15_000,
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },
  ],

  /* Auto-start dev server */
  webServer: {
    command: 'bun run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
