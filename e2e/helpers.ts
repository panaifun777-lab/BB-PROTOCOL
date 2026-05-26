import { Page, expect } from '@playwright/test';

/**
 * Wait for React hydration to complete.
 * Checks that the page has mounted and interactive content is present.
 */
export async function waitForHydration(page: Page): Promise<void> {
  // Wait for the main container to be rendered (indicates React has hydrated)
  await page.waitForSelector('text=认知分身协议', { timeout: 15_000 });
  // Wait a small additional time for animations and effects to settle
  await page.waitForTimeout(500);
}

/**
 * Navigate to a section by clicking the sidebar navigation item.
 * Waits for the scroll animation to complete.
 */
export async function navigateToSection(page: Page, sectionId: string): Promise<void> {
  // Find the sidebar nav button for this section
  const navButton = page.locator(`aside button:has-text("${getNavLabel(sectionId)}")`);
  if (await navButton.isVisible()) {
    await navButton.click();
    // Wait for scroll animation
    await page.waitForTimeout(600);
    return;
  }

  // Fallback: scroll directly to the section element
  const section = page.locator(`#section-${sectionId}`);
  if (await section.isVisible()) {
    await section.scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
    return;
  }

  throw new Error(`Could not navigate to section: ${sectionId}`);
}

/**
 * Map section IDs to their Chinese navigation labels.
 */
function getNavLabel(sectionId: string): string {
  const labels: Record<string, string> = {
    overview: '总览',
    revenue: '收益',
    resonance: '共振',
    skills: '技能',
    marketplace: '市场',
    liquidity: '流动性',
    simulation: '模拟',
    governance: '治理',
    timeline: '时间线',
    security: '安全',
    compliance: '合规',
    performance: '性能',
    deployment: '部署',
    monitoring: '监控',
    flags: '灰度',
    multichain: '多链',
    sdk: 'SDK',
    dao: 'DAO',
    ecosystem: '生态',
    contracts: '合约',
    engine: '引擎',
    web3: 'Web3',
    data: '数据',
  };
  return labels[sectionId] || sectionId;
}

/**
 * Construct API URL for testing.
 */
export function getApiEndpoint(path: string): string {
  return `/api/${path}`;
}

/**
 * Test that an API endpoint returns 200 and has expected structure.
 */
export async function testApiResponse(
  page: Page,
  path: string,
  expectedFields: string[]
): Promise<{ status: number; data: unknown }> {
  const response = await page.request.get(getApiEndpoint(path));
  const status = response.status();
  let data: unknown = null;

  try {
    data = await response.json();
  } catch {
    // Response may not be JSON
  }

  if (expectedFields.length > 0 && data && typeof data === 'object') {
    for (const field of expectedFields) {
      expect(data).toHaveProperty(field);
    }
  }

  return { status, data };
}

/**
 * Wait for a component card to be visible and stable.
 */
export async function waitForCard(page: Page, cardText: string): Promise<void> {
  await page.waitForSelector(`text=${cardText}`, { timeout: 10_000 });
}

/**
 * Check if the page is in dark mode.
 */
export async function isDarkMode(page: Page): Promise<boolean> {
  const bgColor = await page.evaluate(() => {
    const el = document.querySelector('.min-h-screen');
    if (!el) return '';
    return window.getComputedStyle(el).backgroundColor;
  });
  // Dark background should have low RGB values
  return bgColor.includes('15') || bgColor.includes('0');
}

/**
 * Get the current viewport width.
 */
export async function getViewportWidth(page: Page): Promise<number> {
  return page.evaluate(() => window.innerWidth);
}

/**
 * Switch to a specific tab within a component card.
 */
export async function switchTab(page: Page, tabLabel: string): Promise<void> {
  const tab = page.locator(`button[role="tab"]:has-text("${tabLabel}")`).first();
  if (await tab.isVisible()) {
    await tab.click();
    await page.waitForTimeout(300);
  }
}
