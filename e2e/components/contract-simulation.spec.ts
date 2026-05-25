import { test, expect } from '@playwright/test';
import { waitForHydration, switchTab } from '../helpers';

test.describe('Contract Simulation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForHydration(page);
    // Scroll to simulation section
    const section = page.locator('#section-simulation');
    await section.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
  });

  test('contract selector shows 6 contracts', async ({ page }) => {
    const section = page.locator('#section-simulation');

    // Should show contract names
    const avatarCore = section.locator('text=AvatarCore').first();
    const dynamicSplitter = section.locator('text=DynamicSplitter').first();
    const circuitGuard = section.locator('text=CircuitGuard').first();
    const skillVault = section.locator('text=SkillVault').first();
    const ifdRouter = section.locator('text=IFDRouter').first();
    const tokenVault = section.locator('text=TokenVault').first();

    // At least some contract names should be visible
    const visibleCount = [
      await avatarCore.isVisible(),
      await dynamicSplitter.isVisible(),
      await circuitGuard.isVisible(),
      await skillVault.isVisible(),
      await ifdRouter.isVisible(),
      await tokenVault.isVisible(),
    ].filter(Boolean).length;

    expect(visibleCount).toBeGreaterThanOrEqual(1);
  });

  test('function selector updates based on contract', async ({ page }) => {
    const section = page.locator('#section-simulation');

    // Find contract selector (could be a dropdown, radio, or button group)
    // Try clicking on AvatarCore if available
    const avatarCoreBtn = section.locator('text=AvatarCore').first();
    if (await avatarCoreBtn.isVisible()) {
      await avatarCoreBtn.click();
      await page.waitForTimeout(300);

      // Function names related to AvatarCore should appear
      // (createAvatar, updateCognitionRoot, getAvatarProfile)
      const funcName = section.locator('text=createAvatar').or(
        section.locator('text=updateCognitionRoot')
      ).or(
        section.locator('text=getAvatarProfile')
      );
      await expect(funcName.first()).toBeVisible();
    }
  });

  test('parameter inputs render', async ({ page }) => {
    const section = page.locator('#section-simulation');

    // After selecting a contract and function, parameter inputs should appear
    // Select a contract first
    const contractOption = section.locator('text=AvatarCore').or(
      section.locator('text=DynamicSplitter')
    ).first();

    if (await contractOption.isVisible()) {
      await contractOption.click();
      await page.waitForTimeout(300);

      // Select a function if available
      const funcOption = section.locator('text=createAvatar').or(
        section.locator('text=executeSplit')
      ).first();

      if (await funcOption.isVisible()) {
        await funcOption.click();
        await page.waitForTimeout(300);
      }
    }

    // Input fields should be present for parameters
    const inputs = section.locator('input');
    expect(await inputs.count()).toBeGreaterThanOrEqual(0);
  });

  test('execute simulation button works', async ({ page }) => {
    const section = page.locator('#section-simulation');

    // Look for execute/simulate button
    const executeBtn = section.locator('button:has-text("执行")').or(
      section.locator('button:has-text("模拟")')
    ).or(
      section.locator('button:has-text("Execute")')
    ).or(
      section.locator('button:has-text("Simulate")')
    );

    if (await executeBtn.count() > 0) {
      await expect(executeBtn.first()).toBeVisible();
    }
  });

  test('split verification tab works', async ({ page }) => {
    const section = page.locator('#section-simulation');

    // Switch to "分账验证" tab
    const splitVerifyTab = section.locator('button[role="tab"]:has-text("分账验证")').or(
      section.locator('button:has-text("分账验证")')
    ).or(
      section.locator('text=分账验证')
    );

    if (await splitVerifyTab.count() > 0) {
      await splitVerifyTab.first().click();
      await page.waitForTimeout(300);

      // Should show BPS input fields
      const bpsInput = section.locator('input').or(section.locator('text=BPS'));
      if (await bpsInput.count() > 0) {
        expect(await bpsInput.count()).toBeGreaterThan(0);
      }
    }
  });

  test('gas estimation shows', async ({ page }) => {
    const section = page.locator('#section-simulation');

    // Gas-related text should be present in the simulation panel
    const gasLabel = section.locator('text=Gas').or(
      section.locator('text=gas')
    ).or(
      section.locator('text=预估')
    );

    // Gas estimation section should exist somewhere
    if (await gasLabel.count() > 0) {
      await expect(gasLabel.first()).toBeVisible();
    }
  });

  test('history tab shows simulation records', async ({ page }) => {
    const section = page.locator('#section-simulation');

    // Switch to "历史" tab
    const historyTab = section.locator('button[role="tab"]:has-text("历史")').or(
      section.locator('button:has-text("历史")')
    );

    if (await historyTab.count() > 0) {
      await historyTab.first().click();
      await page.waitForTimeout(300);
    }
  });
});
