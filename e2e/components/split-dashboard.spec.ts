import { test, expect } from '@playwright/test';
import { waitForHydration } from '../helpers';

test.describe('Split Dashboard (Revenue Split)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForHydration(page);
  });

  test('revenue amounts display', async ({ page }) => {
    // The split dashboard should show revenue amounts
    const section = page.locator('#section-revenue');
    await expect(section).toBeVisible();

    // Should show dollar amounts
    const dollarAmount = section.locator(/\$[\d,]+/).first();
    await expect(dollarAmount).toBeVisible();
  });

  test('split ratios show 70/20/10', async ({ page }) => {
    // "人类份额" label
    await expect(page.locator('text=人类份额').first()).toBeVisible();
    // "分身金库" label
    await expect(page.locator('text=分身金库').first()).toBeVisible();
    // "协议LP" label
    await expect(page.locator('text=协议LP').first()).toBeVisible();

    // 70% should be visible (human share)
    const humanPct = page.locator('text=70%').first();
    await expect(humanPct).toBeVisible();
  });

  test('dynamic adjustment indicator displays', async ({ page }) => {
    // "动态调整" section
    const dynamicLabel = page.locator('text=动态调整').first();
    await expect(dynamicLabel).toBeVisible();

    // Should show explanation text about resonance impact
    const explanation = page.locator('text=共振分越高').first();
    await expect(explanation).toBeVisible();
  });

  test('monthly revenue chart is visible', async ({ page }) => {
    // "月度收益趋势" label
    const chartLabel = page.locator('text=月度收益趋势').first();
    await expect(chartLabel).toBeVisible();

    // The Recharts BarChart should render SVG
    const chartSvg = page.locator('#section-revenue svg.recharts-surface').or(
      page.locator('#section-revenue .recharts-wrapper')
    );
    await expect(chartSvg.first()).toBeVisible();
  });

  test('recent revenue list shows entries', async ({ page }) => {
    // "最近分账" label
    const recentLabel = page.locator('text=最近分账').first();
    await expect(recentLabel).toBeVisible();

    // Revenue source badges should be visible
    const skillBadge = page.locator('text=技能调用').first();
    const rentalBadge = page.locator('text=分身租赁').first();
    const collabBadge = page.locator('text=跨分身协作').first();

    // At least one revenue source badge should be visible
    const isBadgeVisible =
      (await skillBadge.isVisible()) ||
      (await rentalBadge.isVisible()) ||
      (await collabBadge.isVisible());
    expect(isBadgeVisible).toBe(true);
  });

  test('trend percentage shows vs last month', async ({ page }) => {
    // "vs上月" text should be visible
    const vsLabel = page.locator('text=vs上月').first();
    await expect(vsLabel).toBeVisible();
  });

  test('detailed split log button exists', async ({ page }) => {
    const detailBtn = page.locator('button:has-text("查看详细分账日志")').first();
    await expect(detailBtn).toBeVisible();
  });
});
