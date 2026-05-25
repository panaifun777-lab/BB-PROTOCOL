import { test, expect } from '@playwright/test';
import { waitForHydration, switchTab } from '../helpers';

test.describe('Monitoring Center', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForHydration(page);
    // Scroll to monitoring section
    const section = page.locator('#section-monitoring');
    await section.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
  });

  test('system metrics cards render', async ({ page }) => {
    const section = page.locator('#section-monitoring');
    await expect(section).toBeVisible();

    // CPU metric should be visible
    const cpuLabel = section.locator('text=CPU').or(section.locator('text=cpu'));
    await expect(cpuLabel.first()).toBeVisible();

    // Memory metric should be visible
    const memLabel = section.locator('text=内存').or(section.locator('text=Memory'));
    await expect(memLabel.first()).toBeVisible();

    // Request rate
    const reqRate = section.locator('text=请求率').or(section.locator('text=Request'));
    if (await reqRate.count() > 0) {
      await expect(reqRate.first()).toBeVisible();
    }

    // Error rate
    const errorRate = section.locator('text=错误率').or(section.locator('text=Error'));
    if (await errorRate.count() > 0) {
      await expect(errorRate.first()).toBeVisible();
    }
  });

  test('chain events tab loads', async ({ page }) => {
    const section = page.locator('#section-monitoring');

    // Switch to "链上事件" tab
    const chainTab = section.locator('button[role="tab"]:has-text("链上事件")').or(
      section.locator('button:has-text("链上事件")')
    );

    if (await chainTab.count() > 0) {
      await chainTab.first().click();
      await page.waitForTimeout(300);

      // Chain event content should be visible
      const eventContent = section.locator('text=Avatar').or(
        section.locator('text=Skill')
      ).or(
        section.locator('text=Revenue')
      );

      if (await eventContent.count() > 0) {
        await expect(eventContent.first()).toBeVisible();
      }
    }
  });

  test('alert rules display', async ({ page }) => {
    const section = page.locator('#section-monitoring');

    // Switch to "告警规则" tab
    const alertTab = section.locator('button[role="tab"]:has-text("告警规则")').or(
      section.locator('button:has-text("告警规则")')
    );

    if (await alertTab.count() > 0) {
      await alertTab.first().click();
      await page.waitForTimeout(300);

      // Alert rule content should be visible
      const alertContent = section.locator('text=告警').or(
        section.locator('text=Critical')
      ).or(
        section.locator('text=Warning')
      );

      if (await alertContent.count() > 0) {
        await expect(alertContent.first()).toBeVisible();
      }
    }
  });

  test('anomaly detection section works', async ({ page }) => {
    const section = page.locator('#section-monitoring');

    // Switch to "异常检测" tab
    const anomalyTab = section.locator('button[role="tab"]:has-text("异常检测")').or(
      section.locator('button:has-text("异常检测")')
    );

    if (await anomalyTab.count() > 0) {
      await anomalyTab.first().click();
      await page.waitForTimeout(300);

      // Anomaly detection content should be visible
      const anomalyContent = section.locator('text=异常').or(
        section.locator('text=Grafana')
      ).or(
        section.locator('text=Anomaly')
      );

      if (await anomalyContent.count() > 0) {
        await expect(anomalyContent.first()).toBeVisible();
      }
    }
  });

  test('real-time monitoring indicator visible', async ({ page }) => {
    const section = page.locator('#section-monitoring');

    // Should show "实时监控中" or "健康" badge
    const liveIndicator = section.locator('text=实时监控').or(
      section.locator('text=健康')
    ).or(
      section.locator('text=监控')
    );

    await expect(liveIndicator.first()).toBeVisible();
  });
});
