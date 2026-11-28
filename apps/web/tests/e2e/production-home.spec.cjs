const { test, expect } = require('@playwright/test');

test('built homepage serves full MVP Menu, Collection (22 Defenders), Achievements, 5x9 Grassland Battle, and Save/Resume flow', async ({ page }) => {
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

  // 2. Defender Collection (6 Base + 16 Fusion + 16 Recipes)
  await page.getByRole('button', { name: /Collection \(/i }).click();
  await expect(page.getByRole('heading', { name: /Defender Collection/i })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Base Defenders (6)' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Fusion Defenders (16)' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Fusion Recipes (16)' })).toBeVisible();
  await page.getByRole('button', { name: 'Fusion Defenders (16)' }).click();
  await expect(page.getByText('Master Trader', { exact: true })).toBeVisible();
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
  await expect(page.getByText('EMERALDS')).toBeVisible();
  await expect(page.getByRole('button', { name: /Villager/i })).toBeVisible();

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

  // Summoning Iron Golem (50 EN) puts Iron Golem card into recharge cooldown (CD Xs) and resets active tool
  const golemCard = page.getByRole('button', { name: /Iron Golem/i });
  await golemCard.click();
  const canvasBox = await page.locator('canvas').boundingBox();
  await page.mouse.click(
    canvasBox.x + (304 / 1280) * canvasBox.width,
    canvasBox.y + (220 / 720) * canvasBox.height,
  );
  await expect(golemCard).toContainText(/CD \d+\.\ds/);

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
  await expect(page.getByText('EMERALDS')).toBeVisible();
  await expect(page.getByRole('button', { name: /Villager/i })).toBeVisible();

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
  for (const tabName of ['Base Defenders (6)', 'Fusion Defenders (16)', 'Fusion Recipes (16)']) {
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

  // 4. Drag-and-drop Iron Golem (50 EN) HUD card onto empty cell (col=1, row=2) on canvas
  const golemCard = page.getByRole('button', { name: /Iron Golem/i });
  const cardBox = await golemCard.boundingBox();
  const canvasBox = await page.locator('canvas').boundingBox();
  const targetX = canvasBox.x + (304 / 1280) * canvasBox.width;
  const targetY = canvasBox.y + (352 / 720) * canvasBox.height;

  await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(targetX, targetY, { steps: 10 });
  await page.mouse.up();
  await expect(golemCard).toContainText(/CD \d+\.\ds/);

  // Verify Fusion Glove & Shovel controls, then remove placed Iron Golem with Shovel
  await expect(page.getByRole('button', { name: /Glove/i })).toBeVisible();
  const shovelBtn = page.getByRole('button', { name: /Shovel/i });
  await expect(shovelBtn).toBeVisible();
  await shovelBtn.click();
  await page.mouse.click(targetX, targetY);
  await expect(page.getByText('Removed Iron Golem with Shovel')).toBeVisible();

  // 5. /playtest Campaign-parity sandbox check (1366x768 zero scroll + HUD controls + Balance Editor)
  await page.goto('/playtest');
  await expect(page.locator('canvas')).toHaveCount(1);
  await expect(page.getByText(/Loading Playtest Battlefield/i)).toHaveCount(0);
  await expect(page.getByText(/Failed to initialize/i)).toHaveCount(0);

  const playtestMetrics = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    const rect = canvas.getBoundingClientRect();
    return {
      scrollHeight: document.documentElement.scrollHeight,
      innerHeight: window.innerHeight,
      canvasBottom: rect.bottom,
      canvasHeight: rect.height,
    };
  });
  expect(playtestMetrics.scrollHeight).toBeLessThanOrEqual(playtestMetrics.innerHeight);
  expect(playtestMetrics.canvasBottom).toBeLessThanOrEqual(playtestMetrics.innerHeight);
  expect(playtestMetrics.canvasHeight).toBeGreaterThan(400);

  await expect(page.getByRole('button', { name: /Villager/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Skeleton/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Glove/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Shovel/i })).toBeVisible();
  const balanceBtn = page.getByRole('button', { name: /Balance/i });
  await expect(balanceBtn).toBeVisible();
  await balanceBtn.click();
  await expect(page.getByRole('heading', { name: /Live Game Balance Editor/i })).toBeVisible();
  await page.getByRole('button', { name: /Close \[Esc\]/i }).click();

  expect(failedAssets).toEqual([]);
  expect(browserErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test('/playtest persists tuned balance preset in localStorage across reload and warns before Reset Campaign Defaults', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });

  const browserErrors = [];
  const consoleErrors = [];
  page.on('pageerror', error => browserErrors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  await page.goto('/playtest');
  await expect(page.locator('canvas')).toHaveCount(1);
  await expect(page.getByText(/Loading Playtest Battlefield/i)).toHaveCount(0);

  await page.getByRole('button', { name: /Balance/i }).click();
  await expect(page.getByRole('heading', { name: /Live Game Balance Editor/i })).toBeVisible();

  const defaultIronGolemHp = await page.getByLabel('Max HP').inputValue();
  await page.getByLabel('Max HP').fill('777');
  await page.getByLabel('Select Defender').selectOption('skeleton');
  const defaultArrowCount = await page.getByLabel('Projectile Count').inputValue();
  const defaultArrowPct = await page.getByLabel('Damage (% AD)').inputValue();
  await page.getByLabel('Projectile Count').fill('24');
  await page.getByLabel('Damage (% AD)').fill('150');
  await page.getByLabel('Select Defender').selectOption('snow_golem');
  const defaultSnowSlowPct = await page.getByLabel('On-Hit Slow (%)').inputValue();
  const defaultSnowSlowDur = await page.getByLabel('On-Hit Slow Duration (s)').inputValue();
  await page.getByLabel('On-Hit Slow (%)').fill('60');
  await page.getByLabel('On-Hit Slow Duration (s)').fill('4');
  await page.getByRole('button', { name: /Apply & Restart Playtest/i }).click();

  await page.reload();
  await expect(page.locator('canvas')).toHaveCount(1);
  await expect(page.getByText(/Loading Playtest Battlefield/i)).toHaveCount(0);

  await page.getByRole('button', { name: /Balance/i }).click();
  await expect(page.getByText('Saved locally')).toBeVisible();
  await expect(page.getByLabel('Max HP')).toHaveValue('777');
  await page.getByLabel('Select Defender').selectOption('skeleton');
  await expect(page.getByLabel('Projectile Count')).toHaveValue('24');
  await expect(page.getByLabel('Damage (% AD)')).toHaveValue('150');
  await page.getByLabel('Select Defender').selectOption('snow_golem');
  await expect(page.getByLabel('On-Hit Slow (%)')).toHaveValue('60');
  await expect(page.getByLabel('On-Hit Slow Duration (s)')).toHaveValue('4');

  await page.getByRole('button', { name: /Reset Campaign Defaults/i }).click();
  await expect(page.getByRole('alertdialog', { name: /Confirm Reset Campaign Defaults/i })).toBeVisible();
  await page.getByRole('button', { name: /Delete Saved & Reset/i }).click();
  await expect(page.getByText('Saved locally')).toHaveCount(0);
  await expect(page.getByLabel('On-Hit Slow (%)')).toHaveValue(defaultSnowSlowPct);
  await expect(page.getByLabel('On-Hit Slow Duration (s)')).toHaveValue(defaultSnowSlowDur);
  await page.getByLabel('Select Defender').selectOption('skeleton');
  await expect(page.getByLabel('Projectile Count')).toHaveValue(defaultArrowCount);
  await expect(page.getByLabel('Damage (% AD)')).toHaveValue(defaultArrowPct);
  await page.getByLabel('Select Defender').selectOption('iron_golem');
  await expect(page.getByLabel('Max HP')).toHaveValue(defaultIronGolemHp);

  await page.getByRole('button', { name: /Close \[Esc\]/i }).click();

  // Dev-only game-data sync button must not appear in production, and API route must reject with 403
  await page.getByRole('button', { name: /Balance/i }).click();
  await expect(page.getByRole('button', { name: /Save to Game JSON/i })).toHaveCount(0);
  await page.getByRole('button', { name: /Close \[Esc\]/i }).click();

  const syncResp = await page.request.post('/api/dev/sync-game-data', { data: {} });
  expect(syncResp.status()).toBe(403);

  expect(browserErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test('/editor renders 5-Lane Wave Timeline, Starting Grid, Test Play modal, and keeps dev levels API 403 in production', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });

  const browserErrors = [];
  const consoleErrors = [];
  page.on('pageerror', error => browserErrors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  const resp = await page.goto('/editor');
  expect(resp.status()).toBe(200);
  await expect(page.getByRole('heading', { name: /Dev Stage Studio \(\/editor\)/i })).toBeVisible();
  await expect(page.getByText(/5-Lane Wave 1 Timeline/i)).toBeVisible();

  // Create new stage, open Starting Grid & Roster tab, place 1 starter unit, return to Timeline & launch Test Play
  await page.getByRole('button', { name: '+ New Stage' }).click();
  await expect(page.getByRole('button', { name: /Starting Grid & Roster \(0\)/i })).toBeVisible();
  await page.getByRole('button', { name: /Starting Grid & Roster \(0\)/i }).click();
  await expect(page.getByRole('heading', { name: /Starting Defenders on Grid/i })).toBeVisible();
  await page.getByTitle('L1 C1: Empty').click();
  await expect(page.getByRole('button', { name: /Starting Grid & Roster \(1\)/i })).toBeVisible();

  await page.getByRole('button', { name: /Test Play Stage/i }).click();
  const modal = page.getByRole('dialog', { name: 'Stage Test Play' });
  await expect(modal).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(1);
  await expect(page.getByText('Loading Test Play arena...')).toHaveCount(0);
  await modal.getByRole('button', { name: /Back to Editor/i }).click();
  await expect(page.locator('canvas')).toHaveCount(0);

  // Dev-only /api/dev/levels endpoints must reject with 403 in production
  const getResp = await page.request.get('/api/dev/levels');
  const postResp = await page.request.post('/api/dev/levels', { data: {} });
  const delResp = await page.request.delete('/api/dev/levels?id=stage_2');
  expect(getResp.status()).toBe(403);
  expect(postResp.status()).toBe(403);
  expect(delResp.status()).toBe(403);

  expect(browserErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test('mobile portrait shows rotate-to-landscape guard and rotating to landscape fits 5x9 battlefield cleanly', async ({ page }) => {
  const browserErrors = [];
  const consoleErrors = [];
  page.on('pageerror', error => browserErrors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  // 1. Mobile Portrait (390x844) -> Rotate-to-Landscape prompt appears automatically
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const rotateDialog = page.getByRole('dialog', { name: 'Rotate Device to Landscape' });
  await expect(rotateDialog).toBeVisible();
  await expect(rotateDialog.getByText('Xoay ngang màn hình để chơi')).toBeVisible();

  // 2. Rotate to Mobile Landscape (844x390) -> prompt auto-dismisses and Grassland battle fits with 0 vertical scroll
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(rotateDialog).toHaveCount(0);

  await page.getByRole('button', { name: 'Play Grassland Campaign' }).click();
  await page.getByRole('button', { name: /Play Grassland Campaign|Start New Battle/i }).click();
  await expect(page.locator('canvas')).toHaveCount(1);
  await expect(page.getByText('Loading Grassland Battlefield...')).toHaveCount(0);

  const landscapeMetrics = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    const rect = canvas.getBoundingClientRect();
    return {
      scrollHeight: document.documentElement.scrollHeight,
      innerHeight: window.innerHeight,
      canvasBottom: rect.bottom,
      canvasWidth: rect.width,
      canvasHeight: rect.height,
    };
  });
  expect(landscapeMetrics.scrollHeight).toBeLessThanOrEqual(landscapeMetrics.innerHeight);
  expect(landscapeMetrics.canvasBottom).toBeLessThanOrEqual(landscapeMetrics.innerHeight);
  expect(landscapeMetrics.canvasWidth).toBeGreaterThan(400);
  expect(landscapeMetrics.canvasHeight).toBeGreaterThan(220);
  await expect(page.getByRole('button', { name: 'Toggle Fullscreen Landscape' })).toBeVisible();

  expect(browserErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
