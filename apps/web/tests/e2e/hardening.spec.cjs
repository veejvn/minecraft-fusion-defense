const { test, expect } = require('@playwright/test');

const fixture = 'http://127.0.0.1:5183/?hardening=owned';
const getState = page => page.evaluate(async () => (await import('/hardening/fake-game.ts')).getState());
const setMode = (page, mode) => page.evaluate(async next => (await import('/hardening/fake-game.ts')).setMode(next), mode);

test('terminal cleanup failure becomes visible when animation frames are suspended', async ({ page }) => {
  await page.addInitScript(() => {
    window.requestAnimationFrame = () => 1;
    window.cancelAnimationFrame = () => {};
  });
  await page.goto(fixture);
  await expect(page.getByText('Loading Phaser...')).toBeVisible();
  await expect.poll(async () => (await getState(page)).attempts).toBeGreaterThan(0);
  await setMode(page, 'failed');
  await expect(page.getByText('Failed to initialize Phaser.')).toBeVisible({ timeout: 1500 });
  expect((await getState(page)).created).toBe(0);
});

test('Host exits loading when the five-second cleanup watchdog reports failure', async ({ page }) => {
  await page.goto('http://127.0.0.1:5183/?hardening=stalled');
  await expect(page.getByText('Loading Phaser...')).toBeVisible();
  await expect.poll(async () => (await getState(page)).attempts).toBeGreaterThan(0);
  await expect(page.getByText('Failed to initialize Phaser.')).toBeVisible({ timeout: 7_000 });
  expect((await getState(page)).created).toBe(0);
});

test('permanently owned host reports failure without creating another game', async ({ page }) => {
  await page.goto(fixture);
  await expect.poll(async () => (await getState(page)).attempts).toBeGreaterThan(0);
  await expect(page.getByText('Failed to initialize Phaser.')).toBeVisible({ timeout: 8_000 });
  const state = await getState(page);
  expect(state.created).toBe(0);
  expect(state.attempts).toBeLessThan(20);
});

test('temporary ownership does not cause frame-by-frame factory attempts', async ({ page }) => {
  await page.goto(fixture);
  await expect.poll(async () => (await getState(page)).attempts).toBeGreaterThan(0);
  await page.waitForTimeout(400); // Measures retry rate; it is not cleanup evidence.
  const state = await getState(page);
  console.log('OWNED_RETRY_ATTEMPTS=' + state.attempts);
  expect(state.attempts).toBeLessThanOrEqual(4);
  expect(state.created).toBe(0);
});

test('unmount cancels pending ownership retry', async ({ page }) => {
  await page.goto(fixture);
  await expect.poll(async () => (await getState(page)).attempts).toBeGreaterThan(0);
  await page.locator('#unmount').click();
  const attemptsAtUnmount = (await getState(page)).attempts;
  await setMode(page, 'failed');
  await page.waitForTimeout(400);
  expect((await getState(page)).attempts).toBe(attemptsAtUnmount);
  await expect(page.getByText('Failed to initialize Phaser.')).toHaveCount(0);
});

test('verified host release permits recovery without a duplicate game', async ({ page }) => {
  await page.goto(fixture);
  await expect.poll(async () => (await getState(page)).attempts).toBeGreaterThan(0);
  await setMode(page, 'free');
  await expect(page.locator('canvas')).toHaveCount(1);
  await expect(page.getByText('Loading Phaser...')).toHaveCount(0);
  expect((await getState(page)).created).toBe(1);
  await page.locator('#unmount').click();
  await expect(page.locator('canvas')).toHaveCount(0);
  expect((await getState(page)).destroyed).toBe(1);
});
