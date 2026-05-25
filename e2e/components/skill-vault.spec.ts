import { test, expect } from '@playwright/test';
import { waitForHydration } from '../helpers';

test.describe('Skill Vault', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForHydration(page);
  });

  test('skill cards render', async ({ page }) => {
    // Scroll to skills section
    const section = page.locator('#section-skills');
    await section.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    await expect(section).toBeVisible();

    // Should display skill-related content
    const skillContent = page.locator('text=技能库').or(page.locator('text=技能'));
    await expect(skillContent.first()).toBeVisible();
  });

  test('tier badges display', async ({ page }) => {
    // Scroll to skills section
    await page.locator('#section-skills').scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    // Tier labels should be visible (Tier 1-5 or equivalent)
    const tierBadge = page.locator('text=Tier').or(page.locator('text=阶层'));
    await expect(tierBadge.first()).toBeVisible();
  });

  test('unlock status indicators show', async ({ page }) => {
    // Scroll to skills section
    await page.locator('#section-skills').scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    // Locked/unlocked icons should be present (Lock and Check icons)
    const lockIcon = page.locator('svg.lucide-lock');
    const checkIcon = page.locator('svg.lucide-check');

    // At least one of these should be visible in the skills section
    const isIndicatorVisible =
      (await lockIcon.count()) > 0 ||
      (await checkIcon.count()) > 0;
    expect(isIndicatorVisible).toBe(true);
  });

  test('revenue threshold information displays', async ({ page }) => {
    // Skills should show revenue threshold for unlocking
    await page.locator('#section-skills').scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    // Revenue threshold text or dollar amounts should be present
    const thresholdInfo = page.locator('text=阈值').or(page.locator('text=收益'));
    await expect(thresholdInfo.first()).toBeVisible();
  });
});
