import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  config: undefined as unknown,
  game: undefined as unknown,
  failConstruction: false,
  text: undefined as unknown,
  background: undefined as unknown,
}));

vi.mock('phaser', () => {
  class Emitter {
    private listeners = new Map<string, Array<() => void>>();
    once(event: string, callback: () => void) {
      this.listeners.set(event, [...(this.listeners.get(event) ?? []), callback]);
    }
    emit(event: string) {
      const callbacks = this.listeners.get(event) ?? [];
      this.listeners.delete(event);
      callbacks.forEach(callback => callback());
    }
  }
  class Scene {
    events = new Emitter();
    cameras = { main: { setBackgroundColor: (color: string) => { state.background = color; } } };
    add = { text: (x: number, y: number, content: string, style: unknown) => {
      state.text = { x, y, content, style };
      return { setOrigin: (origin: number) => { state.text = { x, y, content, style, origin }; } };
    } };
    constructor(_config: unknown) {}
  }
  class Game {
    canvas = {};
    pendingDestroy = false;
    renderer = { game: this };
    scene = { game: this };
    loop = { running: true, raf: {}, game: this };
    events = new Emitter();
    config: { parent: { contains: (value: unknown) => boolean }; scene: Scene[] };
    constructor(config: Game['config']) {
      if (state.failConstruction) throw new Error('construction failed');
      this.config = config;
      state.config = config;
      state.game = this;
    }
    destroy(removeCanvas: boolean) {
      expect(removeCanvas).toBe(true);
      this.pendingDestroy = true;
    }
    runDestroy() {
      this.events.emit('destroy');
      this.renderer.game = null as never;
      this.scene.game = null as never;
      this.loop.running = false;
      this.loop.raf = null as never;
      this.loop.game = null as never;
      this.pendingDestroy = false;
      return 42;
    }
  }
  return {
    VERSION: '3.90.0', AUTO: 0,
    Scale: { FIT: 3, CENTER_HORIZONTALLY: 1 },
    Scenes: { Events: { RENDER: 'render' } },
    Core: { Events: { DESTROY: 'destroy' } },
    Scene, Game,
  };
});

import { createGame } from '../src/create-game';

function host() {
  let containsCanvas = true;
  return {
    element: { contains: () => containsCanvas } as unknown as HTMLElement,
    removeCanvas: () => { containsCanvas = false; },
  };
}

describe('public Game Factory', () => {
  beforeEach(() => {
    state.config = undefined;
    state.game = undefined;
    state.text = undefined;
    state.background = undefined;
    state.failConstruction = false;
  });

  it('constructs the approved 1280x720 AUTO FIT Hello Scene', async () => {
    const fixture = host();
    const handle = createGame(fixture.element);
    const config = state.config as { type: number; width: number; height: number; parent: HTMLElement; scale: { mode: number }; scene: Array<{ create(): void; events: { emit(event: string): void } }> };
    expect(config).toMatchObject({ type: 0, width: 1280, height: 720, parent: fixture.element, scale: { mode: 3 } });
    config.scene[0].create();
    expect(state.background).toBe('#1E293B');
    expect(state.text).toMatchObject({ x: 640, y: 360, content: 'Phaser Ready', origin: 0.5,
      style: { color: '#FFFFFF', fontFamily: 'Arial', fontSize: '48px' } });
    let settled = false;
    void handle.ready.then(() => { settled = true; });
    await Promise.resolve();
    expect(settled).toBe(false);
    config.scene[0].events.emit('render');
    await handle.ready;
    expect(settled).toBe(true);
    handle.destroy();
    fixture.removeCanvas();
    (handle.game as never as { runDestroy(): void }).runDestroy();
  });

  it('rejects duplicate creation and cancels a pending ready Promise on destroy', async () => {
    const fixture = host();
    const handle = createGame(fixture.element);
    expect(() => createGame(fixture.element)).toThrow('Phaser host is still owned');
    handle.destroy();
    await expect(handle.ready).rejects.toMatchObject({ name: 'GameInitializationCancelledError' });
    expect(() => createGame(fixture.element)).toThrow('Phaser host is still owned');
    fixture.removeCanvas();
    (handle.game as never as { runDestroy(): void }).runDestroy();
    const remounted = createGame(fixture.element);
    remounted.destroy();
    (remounted.game as never as { runDestroy(): void }).runDestroy();
  });

  it('keeps ready resolved when destroy happens after first render', async () => {
    const fixture = host();
    const handle = createGame(fixture.element);
    const config = state.config as { scene: Array<{ create(): void; events: { emit(event: string): void } }> };
    config.scene[0].create();
    config.scene[0].events.emit('render');
    await handle.ready;
    handle.destroy();
    await expect(handle.ready).resolves.toBeUndefined();
    fixture.removeCanvas();
    (handle.game as never as { runDestroy(): void }).runDestroy();
  });

  it('reports construction failure without releasing uncertain ownership', () => {
    const fixture = host();
    state.failConstruction = true;
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => createGame(fixture.element)).toThrow('construction failed');
    state.failConstruction = false;
    expect(() => createGame(fixture.element)).toThrow('Previous Phaser cleanup could not be confirmed');
    expect(errorLog).toHaveBeenCalled();
    errorLog.mockRestore();
  });
});
