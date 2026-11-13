const { test, expect } = require('@playwright/test');
const { existsSync, mkdirSync } = require('node:fs');
const path = require('node:path');

test('real production Host renders, cleans up, and remounts under Strict Mode', async ({ page }) => {
  const browserErrors = [];
  let delayedGameModules = 0;
  page.on('pageerror', error => browserErrors.push(error.message));
  await page.route('**/*', async route => {
    if (route.request().url().includes('/packages/game/')) {
      delayedGameModules++;
      await new Promise(resolve => setTimeout(resolve, 700));
    }
    await route.continue();
  });
  await page.goto('http://127.0.0.1:5182', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Loading Phaser...')).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(1);
  await expect(page.getByText('Loading Phaser...')).toHaveCount(0);
  expect(delayedGameModules).toBeGreaterThan(0);
  await expect(page.getByRole('alert')).toHaveCount(0);

  const canvas = page.locator('canvas');
  const dimensions = await canvas.evaluate(element => ({
    width: element.width, height: element.height,
    displayWidth: element.getBoundingClientRect().width,
    displayHeight: element.getBoundingClientRect().height,
  }));
  expect(dimensions.width).toBe(1280);
  expect(dimensions.height).toBe(720);
  expect(dimensions.displayWidth).toBeLessThanOrEqual(1280);
  expect(dimensions.displayWidth / dimensions.displayHeight).toBeCloseTo(16 / 9, 2);

  const candidate = path.resolve(__dirname, '../../../../docs/reports/artifacts/T-02-hello-scene-candidate.png');
  if (!existsSync(candidate)) {
    mkdirSync(path.dirname(candidate), { recursive: true });
    await canvas.screenshot({ path: candidate });
    console.log('SCREENSHOT_CANDIDATE=' + candidate);
  } else {
    console.log('SCREENSHOT_CANDIDATE_PRESERVED=' + candidate);
  }

  await page.locator('#unmount').click();
  await expect(page.locator('canvas')).toHaveCount(0);
  await page.locator('#mount').click();
  await expect(page.locator('canvas')).toHaveCount(1);
  await expect(page.getByText('Loading Phaser...')).toHaveCount(0);
  await page.locator('#unmount').click();
  await expect(page.locator('canvas')).toHaveCount(0);
  expect(browserErrors).toEqual([]);
});

test('production Host retains 16:9 display on a narrow viewport', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 600 });
  await page.goto('http://127.0.0.1:5182');
  await expect(page.locator('canvas')).toHaveCount(1);
  await expect(page.getByText('Loading Phaser...')).toHaveCount(0);
  const box = await page.locator('canvas').boundingBox();
  expect(box).not.toBeNull();
  expect(box.width).toBeLessThanOrEqual(800);
  expect(box.width / box.height).toBeCloseTo(16 / 9, 2);
});

test('production Host reaches ready with Canvas fallback', async ({ page }) => {
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (kind, ...args) {
      if (kind === 'webgl' || kind === 'webgl2' || kind === 'experimental-webgl') return null;
      return getContext.call(this, kind, ...args);
    };
  });
  await page.goto('http://127.0.0.1:5182');
  await expect(page.locator('canvas')).toHaveCount(1);
  await expect(page.getByText('Loading Phaser...')).toHaveCount(0);
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('unmount before the game module imports prevents late initialization', async ({ page }) => {
  let delayedGameModules = 0;
  await page.route('**/*', async route => {
    if (route.request().url().includes('/packages/game/')) {
      delayedGameModules++;
      await new Promise(resolve => setTimeout(resolve, 800));
    }
    await route.continue();
  });
  await page.goto('http://127.0.0.1:5182', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Loading Phaser...')).toBeVisible();
  await page.locator('#unmount').click();
  await expect(page.locator('canvas')).toHaveCount(0);
  await expect.poll(() => delayedGameModules).toBeGreaterThan(0);
  await page.waitForTimeout(1000); // Allow the delayed import to settle; not a cleanup signal.
  await expect(page.locator('canvas')).toHaveCount(0);
  await page.locator('#mount').click();
  await expect(page.locator('canvas')).toHaveCount(1);
  await expect(page.getByText('Loading Phaser...')).toHaveCount(0);
});

test('module initialization failure shows the approved message', async ({ page }) => {
  const consoleErrors = [];
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  await page.route('**/*', async route => {
    if (route.request().url().includes('/packages/game/')) return route.abort();
    return route.continue();
  });
  await page.goto('http://127.0.0.1:5182');
  await expect(page.getByText('Failed to initialize Phaser.')).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(0);
  expect(consoleErrors.some(message => message.includes('Failed to initialize Phaser'))).toBe(true);
});

test('real factory retains the same host until Phaser teardown completes', async ({ page }) => {
  await page.goto('http://127.0.0.1:5182');
  const result = await page.evaluate(async () => {
    const { createGame } = await import('/factory-probe.ts');
    const host = document.createElement('div');
    document.body.append(host);
    const first = createGame(host);
    await first.ready;
    let rejectedAtDestroyEvent = false;
    first.game.events.once('destroy', () => {
      try { createGame(host); } catch (error) { rejectedAtDestroyEvent = error.name === 'HostOwnedError'; }
    });
    first.destroy();
    let immediateRejected = false;
    try { createGame(host); } catch (error) { immediateRejected = error.name === 'HostOwnedError'; }
    let second;
    const deadline = performance.now() + 1500;
    while (!second && performance.now() < deadline) {
      await new Promise(resolve => requestAnimationFrame(resolve));
      try { second = createGame(host); } catch (error) {
        if (error.name !== 'HostOwnedError') throw error;
      }
    }
    if (!second) return { immediateRejected, rejectedAtDestroyEvent, remounted: false };
    const firstAfter = { canvasRemoved: !host.contains(first.game.canvas),
      loopStopped: first.game.loop.running === false,
      rendererGameCleared: first.game.renderer.game === null };
    await second.ready;
    second.destroy();
    while (host.querySelector('canvas') && performance.now() < deadline + 1500) {
      await new Promise(resolve => requestAnimationFrame(resolve));
    }
    return { immediateRejected, rejectedAtDestroyEvent, remounted: true,
      firstAfter, finalCanvasCount: host.querySelectorAll('canvas').length };
  });
  console.log('PRODUCTION_ADAPTER=' + JSON.stringify(result));
  expect(result).toMatchObject({ immediateRejected: true, rejectedAtDestroyEvent: true,
    remounted: true, firstAfter: { canvasRemoved: true, loopStopped: true, rendererGameCleared: true },
    finalCanvasCount: 0 });
});
