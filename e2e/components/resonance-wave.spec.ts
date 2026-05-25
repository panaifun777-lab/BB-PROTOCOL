import { test, expect } from '@playwright/test';
import { waitForHydration } from '../helpers';

test.describe('Resonance Wave', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForHydration(page);
  });

  test('chart renders', async ({ page }) => {
    // The resonance wave section should be visible
    const section = page.locator('#section-resonance');
    await expect(section).toBeVisible();

    // Recharts AreaChart should render SVG content
    const chartSvg = section.locator('.recharts-wrapper').or(section.locator('svg'));
    await expect(chartSvg.first()).toBeVisible();
  });

  test('current resonance score displays', async ({ page }) => {
    // "情绪共振波形" title
    const title = page.locator('text=情绪共振波形').first();
    await expect(title).toBeVisible();

    // Current score should be prominently displayed
    const section = page.locator('#section-resonance');
    const scoreDisplay = section.locator('.tabular-nums').or(section.locator('text=共振分'));
    await expect(scoreDisplay.first()).toBeVisible();
  });

  test('24h history chart visible', async ({ page }) => {
    // "24小时共振强度监测" description
    const description = page.locator('text=24小时共振强度监测').first();
    await expect(description).toBeVisible();

    // The chart area should have data points (24h of data)
    const section = page.locator('#section-resonance');
    const chartArea = section.locator('.recharts-area');
    await expect(chartArea.first()).toBeVisible();
  });

  test('circuit state badge in resonance chart', async ({ page }) => {
    // Circuit state badge should be visible in the resonance card
    const section = page.locator('#section-resonance');
    const badge = section.locator('text=正常运行').or(
      section.locator('text=软限制')
    ).or(
      section.locator('text=硬暂停')
    ).or(
      section.locator('text=恢复中')
    );
    await expect(badge.first()).toBeVisible();
  });

  test('threshold reference lines display', async ({ page }) => {
    // "软限制" reference line label
    const softLimit = page.locator('#section-resonance').locator('text=软限制').first();
    await expect(softLimit).toBeVisible();

    // "硬暂停" reference line label
    const hardPause = page.locator('#section-resonance').locator('text=硬暂停').first();
    await expect(hardPause).toBeVisible();
  });

  test('zone summary cards display', async ({ page }) => {
    // Three zone cards: 安全区, 警告区, 危险区
    const safeZone = page.locator('text=安全区').first();
    const warningZone = page.locator('text=警告区').first();
    const dangerZone = page.locator('text=危险区').first();

    await expect(safeZone).toBeVisible();
    await expect(warningZone).toBeVisible();
    await expect(dangerZone).toBeVisible();
  });

  test('trend indicator shows', async ({ page }) => {
    // Should show trend percentage (6h trend)
    const trendLabel = page.locator('text=6h').first();
    await expect(trendLabel).toBeVisible();
  });
});
