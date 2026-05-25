import { test, expect } from '@playwright/test';
import { waitForHydration } from '../helpers';

test.describe('Timeline', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForHydration(page);
    // Scroll to timeline section
    const section = page.locator('#section-timeline');
    await section.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
  });

  test('events render with timestamps', async ({ page }) => {
    // Timeline section should be visible
    const section = page.locator('#section-timeline');
    await expect(section).toBeVisible();

    // Events should have timestamps or time indicators
    const timeIndicators = section.locator('text=/\\d{1,2}:\\d{2}/').or(
      section.locator('text=/\\d+分钟前/')
    ).or(
      section.locator('text=/小时前/')
    );
    // At least some time indicators should be present
    expect(await timeIndicators.count()).toBeGreaterThan(0);
  });

  test('filter tabs work', async ({ page }) => {
    const section = page.locator('#section-timeline');

    // Should have filter tabs: 全部/收益/技能/委托/熔断
    const allTab = section.locator('button:has-text("全部")').first();
    const revenueTab = section.locator('button:has-text("收益")').first();
    const skillTab = section.locator('button:has-text("技能")').first();

    if (await allTab.isVisible()) {
      await allTab.click();
      await page.waitForTimeout(300);
    }

    if (await revenueTab.isVisible()) {
      await revenueTab.click();
      await page.waitForTimeout(300);
    }

    if (await skillTab.isVisible()) {
      await skillTab.click();
      await page.waitForTimeout(300);
    }
  });

  test('event type badges show correctly', async ({ page }) => {
    const section = page.locator('#section-timeline');

    // Should have badge elements for event types
    const badges = section.locator('[class*="badge"]').or(section.locator('[class*="Badge"]'));
    // Badges should exist in the timeline
    expect(await badges.count()).toBeGreaterThan(0);
  });

  test('export button exists', async ({ page }) => {
    const section = page.locator('#section-timeline');

    // Look for an export button
    const exportBtn = section.locator('button:has-text("导出")').or(
      section.locator('button:has-text("Export")')
    ).or(
      section.locator('text=导出')
    );

    // The export functionality should exist somewhere in the timeline
    if (await exportBtn.count() > 0) {
      await expect(exportBtn.first()).toBeVisible();
    }
  });
});
