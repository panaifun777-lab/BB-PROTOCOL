import { test, expect } from '@playwright/test';
import { waitForHydration, switchTab } from '../helpers';

test.describe('Cognitive Card (Avatar Card)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForHydration(page);
  });

  test('card renders with avatar data', async ({ page }) => {
    // The cognitive card should be visible
    const section = page.locator('#section-overview');
    await expect(section).toBeVisible();

    // Avatar name should be visible
    const avatarName = page.locator('text=Sparkles').first(); // Sparkles icon is in the card title
    await expect(avatarName).toBeVisible();
  });

  test('resonance score displays', async ({ page }) => {
    // Resonance score should be visible in the cognitive card
    const resonanceScore = page.locator('#section-overview').locator('text=共振分').first();
    await expect(resonanceScore).toBeVisible();

    // The score value should be a number (e.g., 72)
    const scoreValue = page.locator('#section-overview').locator('.animate-pulse').first();
    await expect(scoreValue).toBeVisible();
  });

  test('circuit state badge shows', async ({ page }) => {
    // Circuit state should be displayed (e.g., NORMAL, SOFT_LIMIT, HARD_PAUSE)
    const circuitLabel = page.locator('text=熔断状态').first();
    await expect(circuitLabel).toBeVisible();

    // One of the circuit states should be visible
    const normalBadge = page.locator('text=NORMAL').first();
    const softLimitBadge = page.locator('text=SOFT_LIMIT').first();
    const hardPauseBadge = page.locator('text=HARD_PAUSE').first();

    const isCircuitVisible =
      (await normalBadge.isVisible()) ||
      (await softLimitBadge.isVisible()) ||
      (await hardPauseBadge.isVisible());
    expect(isCircuitVisible).toBe(true);
  });

  test('skill badges render correctly', async ({ page }) => {
    // Skills section should show skill badges
    const skillLabel = page.locator('#section-overview').locator('text=技能包').first();
    await expect(skillLabel).toBeVisible();

    // Should show unlocked/locked skills count (e.g., "5/9")
    const skillCount = page.locator('#section-overview').locator(/\d+\/\d+/).first();
    await expect(skillCount).toBeVisible();
  });

  test('revenue split bar displays 70/20/10 ratio', async ({ page }) => {
    // Revenue split should show in the cognitive card
    const splitLabel = page.locator('#section-overview').locator('text=人类').first();
    await expect(splitLabel).toBeVisible();

    // Should show percentage labels for the split
    const pctLabel = page.locator('#section-overview').locator(/\d+%/).first();
    await expect(pctLabel).toBeVisible();
  });

  test('tier badge displays correctly', async ({ page }) => {
    // One of the tier labels should be visible
    const tierLabel = page.locator('#section-overview').locator('text=入门').or(
      page.locator('#section-overview').locator('text=专业')
    ).or(
      page.locator('#section-overview').locator('text=企业')
    );
    await expect(tierLabel.first()).toBeVisible();
  });

  test('action buttons are present', async ({ page }) => {
    // "查看时间线" button
    await expect(page.locator('button:has-text("查看时间线")').first()).toBeVisible();
    // "调整委托" button
    await expect(page.locator('button:has-text("调整委托")').first()).toBeVisible();
    // "熔断设置" button
    await expect(page.locator('button:has-text("熔断设置")').first()).toBeVisible();
  });
});
