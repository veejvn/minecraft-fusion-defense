const { test, expect } = require('@playwright/test');

test('built homepage hydrates the production Phaser Host', async ({ page }) => {
  const browserErrors = [];
  const consoleErrors = [];
  page.on('pageerror', error => browserErrors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  const response = await page.goto('http://127.0.0.1:3000/');
  expect(response.status()).toBe(200);
  await expect(page.getByRole('heading', { name: 'Minecraft Fusion Defender' })).toBeVisible();
  await expect(page.getByText('The web foundation is in place. Gameplay is not available yet.')).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(1);
  await expect(page.getByText('Loading Phaser...')).toHaveCount(0);
  await expect(page.getByText('Failed to initialize Phaser.')).toHaveCount(0);
  expect(browserErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
