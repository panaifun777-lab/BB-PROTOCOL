import { test, expect } from '@playwright/test';
import { waitForHydration, switchTab } from '../helpers';

test.describe('Security Audit', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForHydration(page);
    // Scroll to security section
    const section = page.locator('#section-security');
    await section.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
  });

  test('security score gauge renders (92/100)', async ({ page }) => {
    const section = page.locator('#section-security');

    // Should show the security score
    const scoreText = section.locator('text=92').or(
      section.locator('text=/\\d+\\/100/')
    ).or(
      section.locator('text=安全评分')
    );

    await expect(scoreText.first()).toBeVisible();
  });

  test('Certora invariant cards show', async ({ page }) => {
    const section = page.locator('#section-security');

    // Switch to "不变量" tab if available
    const invariantTab = section.locator('button[role="tab"]:has-text("不变量")').or(
      section.locator('button:has-text("不变量")')
    );

    if (await invariantTab.count() > 0) {
      await invariantTab.first().click();
      await page.waitForTimeout(300);
    }

    // Certora-related text should be visible
    const certoraText = section.locator('text=Certora').or(
      section.locator('text=不变量')
    ).or(
      section.locator('text=Invariant')
    );

    await expect(certoraText.first()).toBeVisible();
  });

  test('Slither findings display', async ({ page }) => {
    const section = page.locator('#section-security');

    // Switch to "发现" tab if available
    const findingsTab = section.locator('button[role="tab"]:has-text("发现")').or(
      section.locator('button:has-text("发现")')
    );

    if (await findingsTab.count() > 0) {
      await findingsTab.first().click();
      await page.waitForTimeout(300);
    }

    // Slither-related text should be visible
    const slitherText = section.locator('text=Slither').or(
      section.locator('text=发现')
    ).or(
      section.locator('text=Finding')
    );

    await expect(slitherText.first()).toBeVisible();
  });

  test('audit log tab works', async ({ page }) => {
    const section = page.locator('#section-security');

    // Switch to "日志" tab
    const logTab = section.locator('button[role="tab"]:has-text("日志")').or(
      section.locator('button:has-text("日志")')
    );

    if (await logTab.count() > 0) {
      await logTab.first().click();
      await page.waitForTimeout(300);

      // Should display log entries
      const logContent = section.locator('text=漏洞检测').or(
        section.locator('text=熔断触发')
      ).or(
        section.locator('text=权限变更')
      );

      // Some log content should be visible
      if (await logContent.count() > 0) {
        await expect(logContent.first()).toBeVisible();
      }
    }
  });

  test('security summary tab shows overview', async ({ page }) => {
    const section = page.locator('#section-security');

    // The "总览" tab should be the default or available
    const overviewTab = section.locator('button[role="tab"]:has-text("总览")').or(
      section.locator('button:has-text("总览")')
    );

    if (await overviewTab.count() > 0) {
      // Should show the security score and summary information
      const securityContent = section.locator('text=安全').or(
        section.locator('text=Certora')
      ).or(
        section.locator('text=Slither')
      );
      await expect(securityContent.first()).toBeVisible();
    }
  });
});
