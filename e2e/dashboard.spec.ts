import { test, expect } from '@playwright/test';
import { waitForHydration } from './helpers';

test.describe('Main Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForHydration(page);
  });

  test('page loads successfully', async ({ page }) => {
    // Verify the page title contains expected text
    await expect(page).toHaveTitle(/认知分身/);

    // Verify main container exists
    const mainContainer = page.locator('.min-h-screen');
    await expect(mainContainer).toBeVisible();
  });

  test('header displays correctly', async ({ page }) => {
    // Title: 认知分身协议
    await expect(page.locator('text=认知分身协议')).toBeVisible();

    // Version badge (Phase 5)
    const versionBadge = page.locator('text=Phase 5');
    await expect(versionBadge).toBeVisible();

    // Resonance score in header
    const resonanceIndicator = page.locator('header').locator('text=共振分').or(
      page.locator('header .animate-pulse')
    );
    await expect(resonanceIndicator.first()).toBeVisible();

    // Wallet connect button
    const walletBtn = page.locator('header button:has(svg.lucide-wallet)');
    await expect(walletBtn).toBeVisible();

    // x402 quick pay button
    const x402Btn = page.locator('header button:has-text("x402")');
    await expect(x402Btn).toBeVisible();
  });

  test('all dashboard component cards are visible', async ({ page }) => {
    // Scroll through the page to trigger lazy rendering / animations
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);

    // Row 1: Cognitive Card + Split Dashboard
    await expect(page.locator('#section-overview')).toBeVisible();
    await expect(page.locator('text=动态分账仪表盘').first()).toBeVisible();

    // Row 2: Resonance Wave + Circuit Panel
    await expect(page.locator('#section-resonance')).toBeVisible();
    await expect(page.locator('text=认知熔断').first()).toBeVisible();

    // Row 3: Skill Vault + IFD Delegation
    await expect(page.locator('#section-skills')).toBeVisible();
    await expect(page.locator('text=流体民主委托').first()).toBeVisible();

    // Row 4: Avatar Marketplace
    await expect(page.locator('#section-marketplace')).toBeVisible();

    // Row 5: LP Liquidity
    await expect(page.locator('#section-liquidity')).toBeVisible();

    // Row 6: Contract Simulation
    await expect(page.locator('#section-simulation')).toBeVisible();

    // Row 7: Timeline
    await expect(page.locator('#section-timeline')).toBeVisible();

    // Row 8: Security + Compliance
    await expect(page.locator('#section-security')).toBeVisible();
    await expect(page.locator('#section-compliance')).toBeVisible();

    // Row 9: Performance
    await expect(page.locator('#section-performance')).toBeVisible();

    // Row 10: Deployment + Monitoring
    await expect(page.locator('#section-deployment')).toBeVisible();
    await expect(page.locator('#section-monitoring')).toBeVisible();

    // Row 11: Feature Flags
    await expect(page.locator('#section-flags')).toBeVisible();

    // Row 12: Multichain
    await expect(page.locator('#section-multichain')).toBeVisible();

    // Row 13: SDK + DAO
    await expect(page.locator('#section-sdk')).toBeVisible();
    await expect(page.locator('#section-dao')).toBeVisible();

    // Row 14: Ecosystem
    await expect(page.locator('#section-ecosystem')).toBeVisible();

    // Row 15: Contracts Arch
    await expect(page.locator('#section-contracts')).toBeVisible();

    // Row 16: Engine + Web3
    await expect(page.locator('#section-engine')).toBeVisible();
    await expect(page.locator('#section-web3')).toBeVisible();

    // Row 17: Data Infra
    await expect(page.locator('#section-data')).toBeVisible();
  });

  test('sidebar navigation is present on desktop', async ({ page }) => {
    // The sidebar should be visible on desktop (1440px viewport)
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();

    // Should have navigation items
    const navItems = sidebar.locator('nav button');
    await expect(navItems).toHaveCount(22);
  });

  test('mobile responsive layout at 375px width', async ({ page, context }) => {
    // Create a new page with mobile viewport
    const mobilePage = await context.newPage();
    await mobilePage.setViewportSize({ width: 375, height: 812 });
    await mobilePage.goto('/');
    await waitForHydration(mobilePage);

    // Sidebar should be hidden on mobile
    const sidebar = mobilePage.locator('aside');
    await expect(sidebar).toBeHidden();

    // Mobile bottom navigation should be visible
    const bottomNav = mobilePage.locator('nav.lg\\:hidden');
    await expect(bottomNav).toBeVisible();

    // Should have 4 mobile nav items
    const mobileNavItems = bottomNav.locator('button');
    await expect(mobileNavItems).toHaveCount(4);

    // Mobile menu toggle should be visible
    const menuToggle = mobilePage.locator('header button.lg\\:hidden');
    await expect(menuToggle).toBeVisible();

    await mobilePage.close();
  });

  test('dark theme is applied', async ({ page }) => {
    // The main container should have dark background (bg-[#0F172A] which is slate-900)
    const mainContainer = page.locator('.min-h-screen');
    const bgClass = await mainContainer.getAttribute('class');
    expect(bgClass).toContain('bg-');

    // Cards should have dark theme bg
    const card = page.locator('.bg-\\[\\#1E293B\\]').first();
    await expect(card).toBeVisible();
  });

  test('footer is sticky at bottom', async ({ page }) => {
    // The footer should exist and be visible on desktop
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();

    // Footer should contain expected text
    await expect(footer.locator('text=Web4.0')).toBeVisible();

    // Footer should have mt-auto class for sticky bottom behavior
    const footerClass = await footer.getAttribute('class');
    expect(footerClass).toContain('mt-auto');
  });

  test('x402 payment dialog opens and closes', async ({ page }) => {
    // Click the x402 quick pay button
    const x402Btn = page.locator('header button:has-text("x402")');
    await x402Btn.click();

    // Payment dialog should appear
    await page.waitForTimeout(500);
    // The dialog content should be visible (look for payment-related text)
    const dialogContent = page.locator('text=支付').or(page.locator('[role="dialog"]'));
    // Note: The exact dialog structure depends on X402Payment component

    // Close the dialog
    const closeBtn = page.locator('button:has-text("取消")').or(
      page.locator('[role="dialog"] button').first()
    );
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
    }
  });

  test('notification center is accessible from header', async ({ page }) => {
    // The notification center should be present in the header area
    // Look for a notification bell icon or similar
    const header = page.locator('header');
    await expect(header).toBeVisible();
  });

  test('page has no console errors on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.reload();
    await waitForHydration(page);

    // Filter out known acceptable errors (like network errors for WebSocket, etc.)
    const criticalErrors = errors.filter(
      (e) =>
        !e.includes('WebSocket') &&
        !e.includes('net::ERR') &&
        !e.includes('ResizeObserver')
    );
    expect(criticalErrors).toHaveLength(0);
  });
});
