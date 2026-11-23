const { test, expect } = require('@playwright/test');

test('built homepage serves full MVP Menu, Collection (20 Defenders), Achievements, 5x9 Grassland Battle, and Save/Resume flow', async ({ page }) => {
  const browserErrors = [];
  const consoleErrors = [];
  page.on('pageerror', error => browserErrors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  const response = await page.goto('/');
  expect(response.status()).toBe(200);

  // 1. Main Menu
  await expect(page.getByRole('heading', { name: 'Minecraft Fusion Defense' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Play Grassland Campaign' })).toBeVisible();

  // 2. Defender Collection (5 Base + 15 Fusion + 15 Recipes)
  await page.getByRole('button', { name: /Collection \(/i }).click();
  await expect(page.getByRole('heading', { name: /Defender Collection/i })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Base Defenders (5)' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Fusion Defenders (15)' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Fusion Recipes (15)' })).toBeVisible();
  await page.getByRole('button', { name: 'Fusion Defenders (15)' }).click();
  await expect(page.getByText('Iron Ranger')).toBeVisible();
  await expect(page.getByText('Infernal Archon')).toBeVisible();
  await page.getByRole('button', { name: 'Back to Menu' }).click();

  // 3. Achievements
  await page.getByRole('button', { name: /Achievements \(/i }).click();
  await expect(page.getByRole('heading', { name: 'Achievements & Progression' })).toBeVisible();
  await page.getByRole('button', { name: 'Back to Menu' }).click();

  // 4. Level Selection -> Start Grassland 5x9 Battle
  await page.getByRole('button', { name: 'Play Grassland Campaign' }).click();
  await expect(page.getByRole('heading', { name: 'Level Selection' })).toBeVisible();
  await page.getByRole('button', { name: /Play Grassland Campaign|Start New Battle/i }).click();

  // Phaser 1280x720 Canvas + React HUD mount cleanly inside a single viewport (zero vertical scroll)
  await expect(page.locator('canvas')).toHaveCount(1);
  await expect(page.getByText('Loading Grassland Battlefield...')).toHaveCount(0);
  await expect(page.getByText('Failed to initialize Phaser battlefield.')).toHaveCount(0);
  await expect(page.getByText('WAVE 1/5')).toBeVisible();

  const layoutMetrics = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    const rect = canvas.getBoundingClientRect();
    return {
      scrollHeight: document.documentElement.scrollHeight,
      innerHeight: window.innerHeight,
      canvasBottom: rect.bottom,
      canvasHeight: rect.height,
    };
  });
  expect(layoutMetrics.scrollHeight).toBeLessThanOrEqual(layoutMetrics.innerHeight);
  expect(layoutMetrics.canvasBottom).toBeLessThanOrEqual(layoutMetrics.innerHeight);
  expect(layoutMetrics.canvasHeight).toBeGreaterThan(400);

  // Summoning Skeleton puts Skeleton card into recharge cooldown (CD Xs) and resets active tool
  const skeletonCard = page.getByRole('button', { name: /Skeleton/i });
  await skeletonCard.click();
  const canvasBox = await page.locator('canvas').boundingBox();
  await page.mouse.click(
    canvasBox.x + (304 / 1280) * canvasBox.width,
    canvasBox.y + (220 / 720) * canvasBox.height,
  );
  await expect(skeletonCard).toContainText(/CD \d+\.\ds/);

  // Pause and Save & Return to Menu -> triggers localStorage active battle checkpoint
  await page.getByRole('button', { name: 'Pause' }).click();
  await expect(page.getByRole('heading', { name: 'Game Paused' })).toBeVisible();
  await page.getByRole('button', { name: 'Save & Return to Menu' }).click();
  await expect(page.locator('canvas')).toHaveCount(0);

  // 5. Reload browser and verify Continue Saved Battle resumes cleanly
  await page.reload();
  const continueBtn = page.getByRole('button', { name: /Continue Saved Battle/i });
  await expect(continueBtn).toBeVisible();
  await continueBtn.click();
  await expect(page.locator('canvas')).toHaveCount(1);
  await expect(page.getByText('WAVE 1/5')).toBeVisible();

  expect(browserErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test('1366x768 laptop viewport fits with 0 scroll, verifies all Collection PNG sprites, supports HUD drag-and-drop summon, and keeps /playtest clean', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });

  const browserErrors = [];
  const consoleErrors = [];
  const failedAssets = [];
  page.on('pageerror', error => browserErrors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('response', response => {
    if (response.url().includes('/assets/') && response.status() >= 400) {
      failedAssets.push(`${response.status()} ${response.url()}`);
    }
  });

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Minecraft Fusion Defense' })).toBeVisible();

  // 1. How to Play modal & Settings modal
  await page.getByRole('button', { name: 'How to Play' }).click();
  await expect(page.getByRole('heading', { name: 'How to Play' })).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).click();

  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).click();

  // 2. Verify all Defender Collection PNG images load cleanly across all 3 tabs (0 broken images)
  await page.getByRole('button', { name: /Collection \(/i }).click();
  for (const tabName of ['Base Defenders (5)', 'Fusion Defenders (15)', 'Fusion Recipes (15)']) {
    await page.getByRole('button', { name: tabName }).click();
    await page.waitForTimeout(150);
    const brokenImgs = await page.evaluate(() =>
      Array.from(document.querySelectorAll('img'))
        .filter(img => !img.complete || img.naturalWidth === 0)
        .map(img => img.getAttribute('src')),
    );
    expect(brokenImgs, `Broken images on tab ${tabName}`).toEqual([]);
  }
  await page.getByRole('button', { name: 'Back to Menu' }).click();

  // 3. Start Grassland Battle at 1366x768 -> zero vertical scroll & full canvas fit
  await page.getByRole('button', { name: 'Play Grassland Campaign' }).click();
  await page.getByRole('button', { name: /Play Grassland Campaign|Start New Battle/i }).click();
  await expect(page.locator('canvas')).toHaveCount(1);
  await expect(page.getByText('Loading Grassland Battlefield...')).toHaveCount(0);

  const metrics = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    const rect = canvas.getBoundingClientRect();
    return {
      scrollHeight: document.documentElement.scrollHeight,
      innerHeight: window.innerHeight,
      canvasBottom: rect.bottom,
      canvasHeight: rect.height,
    };
  });
  expect(metrics.scrollHeight).toBeLessThanOrEqual(metrics.innerHeight);
  expect(metrics.canvasBottom).toBeLessThanOrEqual(metrics.innerHeight);
  expect(metrics.canvasHeight).toBeGreaterThan(450);

  // 4. Drag-and-drop Skeleton HUD card onto empty cell (col=1, row=2) on canvas
  const skeletonCard = page.getByRole('button', { name: /Skeleton/i });
  const cardBox = await skeletonCard.boundingBox();
  const canvasBox = await page.locator('canvas').boundingBox();
  const targetX = canvasBox.x + (304 / 1280) * canvasBox.width;
  const targetY = canvasBox.y + (352 / 720) * canvasBox.height;

  await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(targetX, targetY, { steps: 10 });
  await page.mouse.up();
  await expect(skeletonCard).toContainText(/CD \d+\.\ds/);

  // Verify Fusion Glove & Shovel controls, then remove placed Skeleton with Shovel
  await expect(page.getByRole('button', { name: /Glove/i })).toBeVisible();
  const shovelBtn = page.getByRole('button', { name: /Shovel/i });
  await expect(shovelBtn).toBeVisible();
  await shovelBtn.click();
  await page.mouse.click(targetX, targetY);
  await expect(page.getByText('Removed Skeleton with Shovel')).toBeVisible();

  // 5. /playtest sandbox sanity check
  await page.goto('/playtest');
  await expect(page.locator('canvas')).toHaveCount(1);
  await expect(page.getByText(/Failed to initialize/i)).toHaveCount(0);

  expect(failedAssets).toEqual([]);
  expect(browserErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
