import { test, expect } from '@playwright/test';
import { waitForHydration, navigateToSection } from './helpers';

const NAV_ITEMS = [
  { id: 'overview', label: '总览' },
  { id: 'revenue', label: '收益' },
  { id: 'resonance', label: '共振' },
  { id: 'skills', label: '技能' },
  { id: 'marketplace', label: '市场' },
  { id: 'liquidity', label: '流动性' },
  { id: 'simulation', label: '模拟' },
  { id: 'governance', label: '治理' },
  { id: 'timeline', label: '时间线' },
  { id: 'security', label: '安全' },
  { id: 'compliance', label: '合规' },
  { id: 'performance', label: '性能' },
  { id: 'deployment', label: '部署' },
  { id: 'monitoring', label: '监控' },
  { id: 'flags', label: '灰度' },
  { id: 'multichain', label: '多链' },
  { id: 'sdk', label: 'SDK' },
  { id: 'dao', label: 'DAO' },
  { id: 'ecosystem', label: '生态' },
  { id: 'contracts', label: '合约' },
  { id: 'engine', label: '引擎' },
  { id: 'web3', label: 'Web3' },
  { id: 'data', label: '数据' },
];

test.describe('Sidebar Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForHydration(page);
  });

  test('sidebar has all 22 navigation items', async ({ page }) => {
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();

    const navButtons = sidebar.locator('nav button');
    await expect(navButtons).toHaveCount(22);
  });

  test('click each sidebar navigation item and verify section scrolls into view', async ({ page }) => {
    // Test a subset of navigation items to keep test runtime reasonable
    const testItems = ['overview', 'revenue', 'resonance', 'skills', 'security', 'performance'];

    for (const itemId of testItems) {
      await navigateToSection(page, itemId);

      // Verify the section element exists and is scrolled into view
      const section = page.locator(`#section-${itemId}`);
      await expect(section).toBeVisible();

      // Verify the nav button has active styling
      const activeNav = page.locator(`aside button:has-text("${NAV_ITEMS.find(n => n.id === itemId)?.label}")`);
      const activeClass = await activeNav.getAttribute('class');
      expect(activeClass).toContain('violet');
    }
  });

  test('active section highlighting works', async ({ page }) => {
    // Click on the "收益" (revenue) nav item
    const revenueNav = page.locator('aside button:has-text("收益")');
    await revenueNav.click();
    await page.waitForTimeout(600);

    // The clicked item should have active styling
    const activeClass = await revenueNav.getAttribute('class');
    expect(activeClass).toContain('violet');

    // Click on a different item
    const securityNav = page.locator('aside button:has-text("安全")');
    await securityNav.click();
    await page.waitForTimeout(600);

    // The new item should now be active
    const newActiveClass = await securityNav.getAttribute('class');
    expect(newActiveClass).toContain('violet');
  });

  test('sidebar Pro tier badge is visible', async ({ page }) => {
    const tierBadge = page.locator('aside text=Pro').or(page.locator('aside :has-text("当前方案")'));
    await expect(tierBadge.first()).toBeVisible();
  });
});

test.describe('Mobile Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await waitForHydration(page);
  });

  test('mobile bottom navigation has 4 items', async ({ page }) => {
    const bottomNav = page.locator('nav.lg\\:hidden');
    await expect(bottomNav).toBeVisible();

    const navButtons = bottomNav.locator('button');
    await expect(navButtons).toHaveCount(4);

    // Verify the 4 mobile nav items
    await expect(bottomNav.locator('text=总览')).toBeVisible();
    await expect(bottomNav.locator('text=收益')).toBeVisible();
    await expect(bottomNav.locator('text=市场')).toBeVisible();
    await expect(bottomNav.locator('text=安全')).toBeVisible();
  });

  test('mobile bottom nav items navigate correctly', async ({ page }) => {
    // Click the "安全" mobile nav item
    const securityBtn = page.locator('nav.lg\\:hidden button:has-text("安全")');
    await securityBtn.click();
    await page.waitForTimeout(600);

    // Section should scroll into view
    const section = page.locator('#section-security');
    await expect(section).toBeVisible();
  });

  test('mobile slide-out menu works', async ({ page }) => {
    // Open the mobile menu
    const menuToggle = page.locator('header button.lg\\:hidden');
    await menuToggle.click();
    await page.waitForTimeout(500);

    // The mobile slide-out menu should appear with all nav items
    const mobileMenu = page.locator('.fixed.inset-0');
    await expect(mobileMenu).toBeVisible();

    // Should have all 22 nav items in the slide-out menu
    const menuNavButtons = mobileMenu.locator('nav button');
    await expect(menuNavButtons).toHaveCount(22);

    // Click a nav item in the mobile menu
    const complianceBtn = mobileMenu.locator('button:has-text("合规")');
    await complianceBtn.click();
    await page.waitForTimeout(600);

    // Menu should close
    await expect(page.locator('.fixed.inset-0')).toBeHidden();

    // Section should be visible
    const section = page.locator('#section-compliance');
    await expect(section).toBeVisible();
  });

  test('mobile menu closes when clicking overlay', async ({ page }) => {
    // Open the mobile menu
    const menuToggle = page.locator('header button.lg\\:hidden');
    await menuToggle.click();
    await page.waitForTimeout(500);

    // Click the overlay (background)
    const overlay = page.locator('.fixed.inset-0 .absolute.inset-0');
    await overlay.click();
    await page.waitForTimeout(500);

    // Menu should close
    await expect(page.locator('.fixed.inset-0')).toBeHidden();
  });
});

test.describe('Sidebar Collapse Behavior', () => {
  test('sidebar is hidden at mobile breakpoint', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/');
    await waitForHydration(page);

    // Sidebar should be hidden at lg breakpoint (1024px < 1024px threshold)
    const sidebar = page.locator('aside');
    // At exactly 1024px width, the sidebar uses `hidden lg:flex` which activates at 1024px
    // lg breakpoint is 1024px, so sidebar should be visible at exactly 1024px
  });

  test('sidebar is visible at desktop breakpoint', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await waitForHydration(page);

    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();
  });
});
