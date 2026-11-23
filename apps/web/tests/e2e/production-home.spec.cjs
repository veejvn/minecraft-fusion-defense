const { test, expect } = require('@playwright/test');

test('built homepage serves full MVP Menu, Collection (20 Defenders), Achievements, 5x9 Grassland Battle, and Save/Resume flow', async ({ page }) => {
  const browserErrors = [];
  const consoleErrors = [];
  page.on('pageerror', error => browserErrors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  const response = await page.goto('http://127.0.0.1:3000/');
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

  // Phaser 1280x720 Canvas + React HUD mount cleanly
  await expect(page.locator('canvas')).toHaveCount(1);
  await expect(page.getByText('Loading Grassland Battlefield...')).toHaveCount(0);
  await expect(page.getByText('Failed to initialize Phaser battlefield.')).toHaveCount(0);
  await expect(page.getByText('WAVE 1/5')).toBeVisible();

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
