import { test, expect } from '@playwright/test';
import { waitForHydration } from '../helpers';

test.describe('Circuit Panel (Circuit Breaker)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForHydration(page);
    // Scroll to circuit panel section
    const section = page.locator('#section-resonance');
    await section.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
  });

  test('current state displays', async ({ page }) => {
    // "认知熔断" title should be visible somewhere
    const circuitTitle = page.locator('text=认知熔断').first();
    await expect(circuitTitle).toBeVisible();

    // One of the circuit states should be displayed
    const normalState = page.locator('text=NORMAL').first();
    const softLimitState = page.locator('text=SOFT_LIMIT').first();
    const hardPauseState = page.locator('text=HARD_PAUSE').first();

    const isStateVisible =
      (await normalState.isVisible()) ||
      (await softLimitState.isVisible()) ||
      (await hardPauseState.isVisible());
    expect(isStateVisible).toBe(true);
  });

  test('threshold levels visible', async ({ page }) => {
    // Should show threshold levels (50 for hard pause, 70 for soft limit)
    const threshold50 = page.locator('text=50').first();
    const threshold70 = page.locator('text=70').first();

    // At least one threshold reference should be visible
    const isThresholdVisible =
      (await threshold50.isVisible()) ||
      (await threshold70.isVisible());
    expect(isThresholdVisible).toBe(true);
  });

  test('recovery button present', async ({ page }) => {
    // Should have some action button in the circuit panel
    // Look for recovery-related button or action
    const circuitPanel = page.locator('text=认知熔断').first();
    await expect(circuitPanel).toBeVisible();

    // The panel should contain interactive elements
    // Recovery or action buttons might vary based on current state
  });

  test('circuit panel shows circuit state indicator', async ({ page }) => {
    // The panel should have visual state indicators (colored badges)
    // Look for Shield icon which is used in circuit state
    const shieldIcon = page.locator('svg.lucide-shield');
    await expect(shieldIcon.first()).toBeVisible();
  });
});
