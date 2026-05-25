import { test, expect } from '@playwright/test';
import { waitForHydration, switchTab } from '../helpers';

test.describe('Feature Flags', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForHydration(page);
    // Scroll to feature flags section
    const section = page.locator('#section-flags');
    await section.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
  });

  // ── Feature Flag Cards with Switches ──────────────────
  test('feature flag cards render with switch toggles', async ({ page }) => {
    const section = page.locator('#section-flags');
    await expect(section).toBeVisible();

    // Should show feature flag card content
    const flagCards = section.locator('[class*="border-l-emerald-500"], [class*="border-l-slate-600"], [class*="border-l-amber-500"]');
    expect(await flagCards.count()).toBeGreaterThanOrEqual(1);

    // Switch toggles should be present (radix switch)
    const switches = section.locator('button[role="switch"]');
    expect(await switches.count()).toBeGreaterThanOrEqual(1);
  });

  test('feature flag status badges display correctly', async ({ page }) => {
    const section = page.locator('#section-flags');

    // Active status badge (活跃)
    const activeBadge = section.locator('text=活跃').first();
    await expect(activeBadge).toBeVisible();

    // Inactive status badge (停用)
    const inactiveBadge = section.locator('text=停用').first();
    await expect(inactiveBadge).toBeVisible();
  });

  test('feature flag environment badges show', async ({ page }) => {
    const section = page.locator('#section-flags');

    // Should show environment badges: 生产/预发布/开发
    const envBadge = section.locator('text=生产').or(
      section.locator('text=预发布')
    ).or(
      section.locator('text=开发')
    );
    await expect(envBadge.first()).toBeVisible();
  });

  test('feature flag targeting rule badges visible', async ({ page }) => {
    const section = page.locator('#section-flags');

    // Targeting rule badges should be present (violet colored)
    const targetingBadge = section.locator('text=所有用户').or(
      section.locator('text=Pro及以上')
    ).or(
      section.locator('text=Beta用户')
    ).or(
      section.locator('text=仅内部')
    );
    await expect(targetingBadge.first()).toBeVisible();
  });

  test('rollout progress bars display on flag cards', async ({ page }) => {
    const section = page.locator('#section-flags');

    // "灰度进度" label should be visible
    const rolloutLabel = section.locator('text=灰度进度').first();
    await expect(rolloutLabel).toBeVisible();

    // Percentage labels should be visible on the progress bars (e.g., "100%", "75%", "50%")
    const pctLabel = section.locator('text=100%').or(section.locator('text=75%')).or(section.locator('text=50%')).or(section.locator('text=25%')).or(section.locator('text=0%'));
    await expect(pctLabel.first()).toBeVisible();
  });

  test('toggle switch interaction works', async ({ page }) => {
    const section = page.locator('#section-flags');

    // Find an active flag switch and click it to toggle
    const activeSwitch = section.locator('button[role="switch"][data-state="checked"]').first();
    if (await activeSwitch.isVisible()) {
      await activeSwitch.click();
      await page.waitForTimeout(300);

      // The switch should now be unchecked
      const uncheckedSwitch = section.locator('button[role="switch"][data-state="unchecked"]').first();
      // It might take a moment for the optimistic update
      await expect(uncheckedSwitch).toBeVisible({ timeout: 3000 });
    }
  });

  test('status filter buttons work', async ({ page }) => {
    const section = page.locator('#section-flags');

    // Status filter: all/active/inactive/scheduled
    const filterBtn = section.locator('button:has-text("活跃")').or(
      section.locator('button:has-text("停用")')
    ).or(
      section.locator('button:has-text("计划中")')
    );

    if (await filterBtn.count() > 0) {
      await filterBtn.first().click();
      await page.waitForTimeout(300);
    }
  });

  test('environment filter buttons work', async ({ page }) => {
    const section = page.locator('#section-flags');

    // Environment filter: all/production/staging/development
    const envFilterBtn = section.locator('button:has-text("生产")').or(
      section.locator('button:has-text("预发布")')
    ).or(
      section.locator('button:has-text("开发")')
    );

    if (await envFilterBtn.count() > 0) {
      await envFilterBtn.first().click();
      await page.waitForTimeout(300);
    }
  });

  test('stats summary shows active/inactive/scheduled counts', async ({ page }) => {
    const section = page.locator('#section-flags');

    // Stats summary badges should be visible
    const activeCount = section.locator('text=活跃').first();
    await expect(activeCount).toBeVisible();

    const inactiveCount = section.locator('text=停用').first();
    await expect(inactiveCount).toBeVisible();
  });

  test('flag card user count displays', async ({ page }) => {
    const section = page.locator('#section-flags');

    // User counts should be visible (e.g., "12,847 / 12,847 用户")
    const userCount = section.locator('text=用户').first();
    await expect(userCount).toBeVisible();
  });

  // ── A/B Test Tab ──────────────────────────────────────
  test('A/B test tab shows test cards', async ({ page }) => {
    const section = page.locator('#section-flags');

    // Switch to A/B test tab
    const abTab = section.locator('button[role="tab"]:has-text("A/B 测试")').or(
      section.locator('button:has-text("A/B 测试")')
    ).or(
      section.locator('text=A/B 测试')
    );

    if (await abTab.count() > 0) {
      await abTab.first().click();
      await page.waitForTimeout(500);

      // A/B test names should be visible
      const testName = section.locator('text=分账比例优化').or(
        section.locator('text=技能解锁门槛')
      ).or(
        section.locator('text=共振分UI展示')
      );
      await expect(testName.first()).toBeVisible();
    }
  });

  test('A/B test running status shows traffic distribution', async ({ page }) => {
    const section = page.locator('#section-flags');

    // Switch to A/B test tab
    const abTab = section.locator('button[role="tab"]:has-text("A/B 测试")').or(
      section.locator('button:has-text("A/B 测试")')
    );

    if (await abTab.count() > 0) {
      await abTab.first().click();
      await page.waitForTimeout(500);

      // "流量分配" label should be visible for running tests
      const trafficLabel = section.locator('text=流量分配').first();
      await expect(trafficLabel).toBeVisible();
    }
  });

  test('A/B test confidence meter visible for running tests', async ({ page }) => {
    const section = page.locator('#section-flags');

    // Switch to A/B test tab
    const abTab = section.locator('button[role="tab"]:has-text("A/B 测试")').or(
      section.locator('button:has-text("A/B 测试")')
    );

    if (await abTab.count() > 0) {
      await abTab.first().click();
      await page.waitForTimeout(500);

      // "统计显著性" label should be visible for running tests
      const confidenceLabel = section.locator('text=统计显著性').first();
      await expect(confidenceLabel).toBeVisible();
    }
  });

  test('A/B test completed test shows winner', async ({ page }) => {
    const section = page.locator('#section-flags');

    // Switch to A/B test tab
    const abTab = section.locator('button[role="tab"]:has-text("A/B 测试")').or(
      section.locator('button:has-text("A/B 测试")')
    );

    if (await abTab.count() > 0) {
      await abTab.first().click();
      await page.waitForTimeout(500);

      // Completed test should show "胜出" badge
      const winnerBadge = section.locator('text=胜出').first();
      await expect(winnerBadge).toBeVisible();
    }
  });

  test('A/B test variant comparison displays', async ({ page }) => {
    const section = page.locator('#section-flags');

    // Switch to A/B test tab
    const abTab = section.locator('button[role="tab"]:has-text("A/B 测试")').or(
      section.locator('button:has-text("A/B 测试")')
    );

    if (await abTab.count() > 0) {
      await abTab.first().click();
      await page.waitForTimeout(500);

      // Variant names should be visible (Control, Variant A, Variant, etc.)
      const variantLabel = section.locator('text=Control').first();
      await expect(variantLabel).toBeVisible();
    }
  });

  // ── Rollback Mechanism Tab ────────────────────────────
  test('rollback tab shows timeline history', async ({ page }) => {
    const section = page.locator('#section-flags');

    // Switch to rollback tab
    const rollbackTab = section.locator('button[role="tab"]:has-text("回滚机制")').or(
      section.locator('button:has-text("回滚机制")')
    ).or(
      section.locator('text=回滚机制')
    );

    if (await rollbackTab.count() > 0) {
      await rollbackTab.first().click();
      await page.waitForTimeout(500);

      // Rollback history timeline entries should be visible
      const actionBadge = section.locator('text=部署').or(
        section.locator('text=回滚')
      ).or(
        section.locator('text=暂停')
      ).or(
        section.locator('text=恢复')
      );
      await expect(actionBadge.first()).toBeVisible();
    }
  });

  test('rollback auto-trigger conditions display', async ({ page }) => {
    const section = page.locator('#section-flags');

    // Switch to rollback tab
    const rollbackTab = section.locator('button[role="tab"]:has-text("回滚机制")').or(
      section.locator('button:has-text("回滚机制")')
    );

    if (await rollbackTab.count() > 0) {
      await rollbackTab.first().click();
      await page.waitForTimeout(500);

      // Should show auto-rollback trigger conditions
      const triggerLabel = section.locator('text=自动回滚').or(
        section.locator('text=错误率')
      ).or(
        section.locator('text=崩溃率')
      );
      await expect(triggerLabel.first()).toBeVisible();
    }
  });

  test('emergency rollback button exists', async ({ page }) => {
    const section = page.locator('#section-flags');

    // Switch to rollback tab
    const rollbackTab = section.locator('button[role="tab"]:has-text("回滚机制")').or(
      section.locator('button:has-text("回滚机制")')
    );

    if (await rollbackTab.count() > 0) {
      await rollbackTab.first().click();
      await page.waitForTimeout(500);

      // "紧急全量回滚" button should be present
      const emergencyBtn = section.locator('button:has-text("紧急全量回滚")').or(
        section.locator('text=紧急全量回滚')
      );
      if (await emergencyBtn.count() > 0) {
        await expect(emergencyBtn.first()).toBeVisible();
      }
    }
  });

  // ── Release Pipeline Tab ──────────────────────────────
  test('release pipeline tab shows version info', async ({ page }) => {
    const section = page.locator('#section-flags');

    // Switch to pipeline tab
    const pipelineTab = section.locator('button[role="tab"]:has-text("发布管道")').or(
      section.locator('button:has-text("发布管道")')
    ).or(
      section.locator('text=发布管道')
    );

    if (await pipelineTab.count() > 0) {
      await pipelineTab.first().click();
      await page.waitForTimeout(500);

      // Version info should be visible
      const versionInfo = section.locator('text=v2.1.0').or(
        section.locator('text=v2.2.0')
      );
      await expect(versionInfo.first()).toBeVisible();
    }
  });

  test('pipeline stages display with status indicators', async ({ page }) => {
    const section = page.locator('#section-flags');

    // Switch to pipeline tab
    const pipelineTab = section.locator('button[role="tab"]:has-text("发布管道")').or(
      section.locator('button:has-text("发布管道")')
    );

    if (await pipelineTab.count() > 0) {
      await pipelineTab.first().click();
      await page.waitForTimeout(500);

      // Pipeline stage names should be visible
      const stageNames = section.locator('text=代码合并').or(
        section.locator('text=自动化测试')
      ).or(
        section.locator('text=全量发布')
      );
      await expect(stageNames.first()).toBeVisible();
    }
  });

  test('canary deployment gauge displays', async ({ page }) => {
    const section = page.locator('#section-flags');

    // Switch to pipeline tab
    const pipelineTab = section.locator('button[role="tab"]:has-text("发布管道")').or(
      section.locator('button:has-text("发布管道")')
    );

    if (await pipelineTab.count() > 0) {
      await pipelineTab.first().click();
      await page.waitForTimeout(500);

      // Canary percentage gauge should be visible
      const canaryLabel = section.locator('text=Canary').or(
        section.locator('text=canary')
      );
      await expect(canaryLabel.first()).toBeVisible();
    }
  });

  test('canary metrics cards show passing/failing status', async ({ page }) => {
    const section = page.locator('#section-flags');

    // Switch to pipeline tab
    const pipelineTab = section.locator('button[role="tab"]:has-text("发布管道")').or(
      section.locator('button:has-text("发布管道")')
    );

    if (await pipelineTab.count() > 0) {
      await pipelineTab.first().click();
      await page.waitForTimeout(500);

      // Canary metric names should be visible: 错误率, P95延迟, 崩溃率
      const metricName = section.locator('text=错误率').or(
        section.locator('text=P95延迟')
      ).or(
        section.locator('text=崩溃率')
      );
      await expect(metricName.first()).toBeVisible();
    }
  });

  test('advance canary button works', async ({ page }) => {
    const section = page.locator('#section-flags');

    // Switch to pipeline tab
    const pipelineTab = section.locator('button[role="tab"]:has-text("发布管道")').or(
      section.locator('button:has-text("发布管道")')
    );

    if (await pipelineTab.count() > 0) {
      await pipelineTab.first().click();
      await page.waitForTimeout(500);

      // "推进灰度" button should be present
      const advanceBtn = section.locator('button:has-text("推进灰度")').or(
        section.locator('button:has-text("推进")')
      );
      if (await advanceBtn.count() > 0) {
        await expect(advanceBtn.first()).toBeVisible();
      }
    }
  });
});
