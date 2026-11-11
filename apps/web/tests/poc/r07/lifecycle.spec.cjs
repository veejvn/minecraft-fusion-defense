const { test, expect } = require('@playwright/test');
const { readFileSync } = require('node:fs');

test('R-07 destroy immediately after construction while document is loading', async ({ page }) => {
  const phaserBundle = readFileSync(require.resolve('phaser/dist/phaser.js'), 'utf8');
  await page.route('http://127.0.0.1:5177/preboot.html', async (route) => {
    await route.fulfill({ contentType: 'text/html', body: `<!doctype html><html><body>
      <div id="host"></div><script>${phaserBundle}</script><script>
      window.r07Preboot = { events: [], readyState: document.readyState };
      const host = document.querySelector('#host');
      const game = new Phaser.Game({ type: Phaser.CANVAS, parent: host, width: 32, height: 32,
        scene: { create() { window.r07Preboot.events.push('scene-create'); } } });
      window.r07Preboot.events.push('constructed');
      const original = game.runDestroy;
      game.runDestroy = function (...args) {
        window.r07Preboot.events.push('runDestroy-enter');
        const value = original.apply(this, args);
        window.r07Preboot.events.push('runDestroy-return');
        window.r07Preboot.after = { canvasCount: host.querySelectorAll('canvas').length,
          loopRunning: game.loop.running, pendingDestroy: game.pendingDestroy };
        return value;
      };
      game.events.once(Phaser.Core.Events.DESTROY, () => window.r07Preboot.events.push('DESTROY'));
      game.destroy(true);
      window.r07Preboot.events.push('destroy-request');
      window.r07Preboot.atRequest = { canvasCount: host.querySelectorAll('canvas').length,
        loopRunning: game.loop.running, pendingDestroy: game.pendingDestroy };
      </script></body></html>` });
  });
  await page.goto('http://127.0.0.1:5177/preboot.html');
  await page.waitForTimeout(1500); // Failure detector only; never a cleanup signal.
  const result = await page.evaluate(() => window.r07Preboot);
  console.log('R07_DOCUMENT_LOADING=' + JSON.stringify(result));
  expect(result.readyState).toBe('loading');
  expect(result.events).toContain('runDestroy-return');
  expect(result.after).toMatchObject({ canvasCount: 0, loopRunning: false, pendingDestroy: false });
});

test('R-07 lifecycle chronology: rendered, prerender, preboot', async ({ page }) => {
  await page.goto('http://127.0.0.1:5177');
  await expect.poll(() => page.evaluate(() => Boolean(window.R07Phaser))).toBe(true);

  const results = await page.evaluate(async () => {
    const Phaser = window.R07Phaser;
    const out = [];
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    async function run(id, mode) {
      const host = document.createElement('div');
      host.id = id;
      document.querySelector('#hosts').append(host);
      const timeline = [];
      const stamp = (name, game) => timeline.push({
        name, pending: game.pendingDestroy,
        canvasInHost: host.contains(game.canvas),
        canvasCount: host.querySelectorAll('canvas').length,
        renderer: game.renderer?.type ?? null,
        loopRunning: game.loop?.running ?? null,
      });
      let firstRender;
      const rendered = new Promise((resolve) => { firstRender = resolve; });
      let afterDestroy;
      const destroyed = new Promise((resolve) => { afterDestroy = resolve; });
      let game;
      const config = {
        type: Phaser.CANVAS, parent: host, width: 32, height: 32,
        scene: { create() { this.events.once('render', () => { stamp('first-render', this.game); firstRender(); }); } },
        callbacks: {
          preBoot(instance) {
            stamp('preboot', instance);
            if (mode === 'preboot') { instance.destroy(true); stamp('destroy-request-preboot', instance); }
            if (mode === 'boot-event') {
              instance.events.once(Phaser.Core.Events.BOOT, () => {
                stamp('BOOT-event-before-textures-ready', instance);
                instance.destroy(true);
                stamp('destroy-request-boot-event', instance);
              });
            }
          },
        },
      };
      game = new Phaser.Game(config);
      const originalRunDestroy = game.runDestroy;
      game.runDestroy = function (...args) {
        stamp('runDestroy-enter', this);
        const value = originalRunDestroy.apply(this, args);
        stamp('runDestroy-return', this);
        afterDestroy();
        return value;
      };
      game.events.once(Phaser.Core.Events.DESTROY, () => stamp('DESTROY-event', game));
      if (mode === 'rendered') {
        await Promise.race([rendered, delay(1500)]);
        stamp('before-destroy-request', game);
        game.destroy(true);
        stamp('after-destroy-request', game);
      } else if (mode === 'prerender') {
        stamp('before-destroy-request', game);
        game.destroy(true);
        stamp('after-destroy-request', game);
      }
      const completed = await Promise.race([destroyed.then(() => true), delay(1500).then(() => false)]);
      stamp(completed ? 'observed-after-runDestroy' : 'watchdog-no-completion', game);
      out.push({ id, completed, timeline });
      return completed;
    }

    await run('POC-01', 'rendered');
    await run('POC-02', 'prerender');
    await run('POC-03', 'preboot');
    await run('POC-03b', 'boot-event');
    return out;
  });
  console.log('R07_RESULTS=' + JSON.stringify(results));
  expect(results[0].completed).toBe(true);
  expect(results[1].completed).toBe(true);
  // Failure here is a stop condition. The watchdog is detection, not completion.
  expect(results[2].completed).toBe(true);
  expect(results[3].completed).toBe(true);
});

test('R-07 ownership, remount, readiness, renderer teardown', async ({ page }) => {
  await page.goto('http://127.0.0.1:5177');
  await expect.poll(() => page.evaluate(() => Boolean(window.R07Phaser))).toBe(true);
  const results = await page.evaluate(async () => {
    const Phaser = window.R07Phaser;
    const owners = new WeakMap();
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const result = {};
    function host(id) {
      const element = document.createElement('div');
      element.id = id;
      document.querySelector('#hosts').append(element);
      return element;
    }
    function create(element, type = Phaser.CANVAS) {
      if (owners.has(element)) throw new Error('host-owned');
      let resolveReady, rejectReady, resolveCleanup;
      let readySettled = false;
      const ready = new Promise((resolve, reject) => {
        resolveReady = resolve;
        rejectReady = reject;
      });
      // Handle rejection immediately, including when no consumer awaits ready.
      ready.catch(() => {});
      const cleaned = new Promise((resolve) => { resolveCleanup = resolve; });
      const events = [];
      const game = new Phaser.Game({
        type, parent: element, width: 32, height: 32,
        scene: { create() {
          this.events.once('render', () => {
            events.push('first-render');
            readySettled = true;
            resolveReady();
          });
        } },
      });
      const record = { game, ready, cleaned, events, destroyCalls: 0, destroyed: false };
      owners.set(element, record);
      const original = game.runDestroy;
      game.runDestroy = function (...args) {
        events.push('runDestroy-enter');
        const value = original.apply(this, args);
        events.push('runDestroy-return');
        // Isolated instrumentation observes the private method boundary.
        record.after = {
          canvasCount: element.querySelectorAll('canvas').length,
          loopRunning: game.loop.running,
          pendingDestroy: game.pendingDestroy,
          rendererGameCleared: game.renderer?.game === null,
          rendererCanvasCleared: game.renderer?.gameCanvas === null,
        };
        if (owners.get(element) === record) owners.delete(element);
        resolveCleanup();
        return value;
      };
      game.events.once(Phaser.Core.Events.DESTROY, () => {
        events.push('DESTROY');
        record.atEvent = {
          canvasCount: element.querySelectorAll('canvas').length,
          loopRunning: game.loop.running,
          ownerHeld: owners.get(element) === record,
          rendererGamePresent: game.renderer?.game === game,
        };
      });
      record.destroy = () => {
        record.destroyCalls++;
        if (record.destroyed) return;
        record.destroyed = true;
        if (!readySettled) { readySettled = true; rejectReady(new Error('ready-cancelled')); }
        events.push('destroy-request');
        game.destroy(true);
      };
      return record;
    }
    async function complete(record) {
      return Promise.race([record.cleaned.then(() => true), delay(1500).then(() => false)]);
    }

    const h1 = host('ownership-a');
    const a = create(h1);
    a.destroy();
    a.destroy();
    let immediateRejected = false;
    try { create(h1); } catch (error) { immediateRejected = error.message === 'host-owned'; }
    const immediateOwnerHeld = owners.get(h1) === a;
    result['POC-04'] = { calls: a.destroyCalls, destroyRequests: a.events.filter(x => x === 'destroy-request').length,
      completed: await complete(a), events: a.events };
    const b = create(h1);
    let rejected = false;
    try { create(h1); } catch (error) { rejected = error.message === 'host-owned'; }
    b.destroy();
    const duringCleanupOwned = owners.get(h1) === b;
    const bCompleted = await complete(b);
    result['POC-05'] = { immediateRejected, immediateOwnerHeld, rejected, duringCleanupOwned, bCompleted, eventOwnerHeld: b.atEvent?.ownerHeld };
    const c = create(h1);
    const afterCleanupAllowed = owners.get(h1) === c;
    c.destroy();
    result['POC-06'] = { afterCleanupAllowed, completed: await complete(c), canvasCount: h1.querySelectorAll('canvas').length };

    const h2 = host('ownership-b');
    const h3 = host('ownership-c');
    const d = create(h2), e = create(h3);
    const independent = owners.get(h2) === d && owners.get(h3) === e;
    d.destroy();
    const dCompleted = await complete(d);
    const otherStillOwned = owners.get(h3) === e;
    e.destroy();
    result['POC-07'] = { independent, dCompleted, otherStillOwned, eCompleted: await complete(e) };

    const h4 = host('readiness');
    const f = create(h4);
    f.destroy();
    let cancellation;
    try { await f.ready; } catch (error) { cancellation = error.message; }
    const fCompleted = await complete(f);
    const g = create(h4);
    const settled = await Promise.race([g.ready.then(() => 'resolved'), delay(1500).then(() => 'timeout')]);
    g.destroy();
    const gCompleted = await complete(g);
    const stillResolved = await g.ready.then(() => true, () => false);
    result['POC-08'] = { cancellation, fCompleted, settled, gCompleted, stillResolved, firstRenderBeforeDestroy: g.events.indexOf('first-render') < g.events.indexOf('destroy-request') };
    result['POC-09'] = { atEvent: g.atEvent, after: g.after, events: g.events };
    return result;
  });
  console.log('R07_OWNERSHIP=' + JSON.stringify(results));
  expect(results['POC-04'].destroyRequests).toBe(1);
  expect(results['POC-05']).toMatchObject({ immediateRejected: true, immediateOwnerHeld: true, rejected: true, duringCleanupOwned: true, bCompleted: true, eventOwnerHeld: true });
  expect(results['POC-06']).toMatchObject({ afterCleanupAllowed: true, completed: true, canvasCount: 0 });
  expect(results['POC-07']).toMatchObject({ independent: true, dCompleted: true, otherStillOwned: true, eCompleted: true });
  expect(results['POC-08']).toMatchObject({ cancellation: 'ready-cancelled', fCompleted: true, settled: 'resolved', gCompleted: true, stillResolved: true, firstRenderBeforeDestroy: true });
  expect(results['POC-09'].atEvent).toMatchObject({ canvasCount: 1, loopRunning: true, ownerHeld: true, rendererGamePresent: true });
  expect(results['POC-09'].after).toMatchObject({ canvasCount: 0, loopRunning: false, pendingDestroy: false, rendererGameCleared: true, rendererCanvasCleared: true });
});

test('R-07 Canvas fallback when WebGL contexts are unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (kind, ...args) {
      if (kind === 'webgl' || kind === 'webgl2' || kind === 'experimental-webgl') return null;
      return original.call(this, kind, ...args);
    };
  });
  await page.goto('http://127.0.0.1:5177');
  await expect.poll(() => page.evaluate(() => Boolean(window.R07Phaser))).toBe(true);
  const result = await page.evaluate(async () => {
    const Phaser = window.R07Phaser;
    const host = document.createElement('div');
    document.querySelector('#hosts').append(host);
    const game = new Phaser.Game({ type: Phaser.AUTO, parent: host, width: 32, height: 32, scene: { create() {} } });
    const selectedType = game.renderer.type;
    let atEvent;
    game.events.once(Phaser.Core.Events.DESTROY, () => {
      atEvent = { canvasCount: host.querySelectorAll('canvas').length, loopRunning: game.loop.running };
    });
    let done;
    const completed = new Promise(resolve => { done = resolve; });
    const original = game.runDestroy;
    game.runDestroy = function (...args) {
      const value = original.apply(this, args);
      done({ canvasCount: host.querySelectorAll('canvas').length, loopRunning: game.loop.running });
      return value;
    };
    game.destroy(true);
    const after = await Promise.race([completed, new Promise(resolve => setTimeout(() => resolve(null), 1500))]);
    return { selectedType, canvasType: Phaser.CANVAS, atEvent, after };
  });
  console.log('R07_FALLBACK=' + JSON.stringify(result));
  expect(result.selectedType).toBe(result.canvasType);
  expect(result.atEvent).toMatchObject({ canvasCount: 1, loopRunning: true });
  expect(result.after).toMatchObject({ canvasCount: 0, loopRunning: false });
});

test('R-07 WebGL renderer teardown when Chromium supports WebGL', async ({ page }) => {
  await page.goto('http://127.0.0.1:5177');
  await expect.poll(() => page.evaluate(() => Boolean(window.R07Phaser))).toBe(true);
  const result = await page.evaluate(async () => {
    const Phaser = window.R07Phaser;
    const host = document.createElement('div');
    document.querySelector('#hosts').append(host);
    const game = new Phaser.Game({ type: Phaser.AUTO, parent: host, width: 32, height: 32, scene: { create() {} } });
    const selectedType = game.renderer?.type ?? null;
    let atEvent;
    game.events.once(Phaser.Core.Events.DESTROY, () => {
      atEvent = { canvasCount: host.querySelectorAll('canvas').length, glPresent: Boolean(game.renderer.gl) };
    });
    let done;
    const completed = new Promise(resolve => { done = resolve; });
    const original = game.runDestroy;
    game.runDestroy = function (...args) {
      const value = original.apply(this, args);
      done({ canvasCount: host.querySelectorAll('canvas').length, glCleared: game.renderer.gl === null, loopRunning: game.loop.running });
      return value;
    };
    game.destroy(true);
    const after = await Promise.race([completed, new Promise(resolve => setTimeout(() => resolve(null), 1500))]);
    return { selectedType, webglType: Phaser.WEBGL, atEvent, after };
  });
  console.log('R07_WEBGL=' + JSON.stringify(result));
  expect(result.after).not.toBeNull();
  if (result.selectedType === result.webglType) {
    expect(result.atEvent).toMatchObject({ canvasCount: 1, glPresent: true });
    expect(result.after).toMatchObject({ canvasCount: 0, glCleared: true, loopRunning: false });
  }
});
