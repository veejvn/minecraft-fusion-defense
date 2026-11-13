import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('phaser', () => ({ VERSION: '3.90.0' }));

import {
  attachCleanupAdapter,
  claimHost,
  HostCleanupError,
  HostOwnedError,
  requestDestroy,
} from '../src/core/lifecycle-adapter';

function fixture(options: { throwDuringCleanup?: boolean; leaveResources?: boolean } = {}) {
  let canvasInHost = true;
  const canvas = {};
  const host = { contains: (value: unknown) => value === canvas && canvasInHost } as HTMLElement;
  const game = {
    canvas,
    pendingDestroy: false,
    scene: { game: {} as unknown },
    renderer: { game: {} as unknown },
    loop: { running: true, raf: {}, game: {} as unknown },
    destroy: vi.fn(function (this: { pendingDestroy: boolean }) { this.pendingDestroy = true; }),
    runDestroy: vi.fn(function (this: {
      pendingDestroy: boolean;
      scene: { game: unknown };
      renderer: { game: unknown };
      loop: { running: boolean; raf: unknown; game: unknown };
    }) {
      if (options.throwDuringCleanup) throw new Error('teardown failed');
      if (!options.leaveResources) {
        this.scene.game = null;
        this.renderer.game = null;
        this.loop.running = false;
        this.loop.raf = null;
        this.loop.game = null;
        canvasInHost = false;
        this.pendingDestroy = false;
      }
      return 'original result';
    }),
  };
  return { host, game };
}

describe('private Phaser 3.90.0 cleanup adapter', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('holds ownership through destroy request and releases only after verified teardown', () => {
    const { host, game } = fixture();
    const owner = claimHost(host);
    attachCleanupAdapter(owner, game as never);
    requestDestroy(owner);
    expect(() => claimHost(host)).toThrow(HostOwnedError);
    expect(game.destroy).toHaveBeenCalledTimes(1);
    expect(game.runDestroy()).toBe('original result');
    expect(owner.state).toBe('destroyed');
    expect(claimHost(host).state).toBe('constructing');
  });

  it('makes repeated destroy calls idempotent', () => {
    const { host, game } = fixture();
    const owner = claimHost(host);
    attachCleanupAdapter(owner, game as never);
    requestDestroy(owner);
    requestDestroy(owner);
    expect(game.destroy).toHaveBeenCalledTimes(1);
    game.runDestroy();
  });

  it('keeps the host locked when cleanup returns without clearing resources', () => {
    const { host, game } = fixture({ leaveResources: true });
    const owner = claimHost(host);
    attachCleanupAdapter(owner, game as never);
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
    requestDestroy(owner);
    expect(game.runDestroy()).toBe('original result');
    expect(owner.state).toBe('failed');
    expect(() => claimHost(host)).toThrow(HostCleanupError);
    expect(errorLog).toHaveBeenCalledOnce();
  });

  it('keeps the host locked and reports an exception from cleanup', () => {
    const { host, game } = fixture({ throwDuringCleanup: true });
    const owner = claimHost(host);
    attachCleanupAdapter(owner, game as never);
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
    requestDestroy(owner);
    expect(() => game.runDestroy()).toThrow('teardown failed');
    expect(owner.state).toBe('failed');
    expect(() => claimHost(host)).toThrow(HostCleanupError);
    expect(errorLog).toHaveBeenCalledOnce();
  });

  it('reports a stalled cleanup without releasing host ownership', () => {
    vi.useFakeTimers();
    try {
      const { host, game } = fixture();
      const owner = claimHost(host);
      attachCleanupAdapter(owner, game as never);
      const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
      requestDestroy(owner);
      vi.advanceTimersByTime(5_000);
      expect(owner.state).toBe('failed');
      expect(() => claimHost(host)).toThrow(HostCleanupError);
      expect(errorLog).toHaveBeenCalledOnce();
    } finally {
      vi.useRealTimers();
    }
  });

  it('rejects a missing private method before depending on it', () => {
    const { host, game } = fixture();
    const owner = claimHost(host);
    expect(() => attachCleanupAdapter(owner, { ...game, runDestroy: undefined } as never)).toThrow(HostCleanupError);
  });

  it('cannot release a newer owner when an old method is called again', () => {
    const { host, game } = fixture();
    const oldOwner = claimHost(host);
    attachCleanupAdapter(oldOwner, game as never);
    requestDestroy(oldOwner);
    game.runDestroy();
    const newerOwner = claimHost(host);
    game.runDestroy();
    expect(newerOwner.state).toBe('constructing');
    expect(() => claimHost(host)).toThrow(HostOwnedError);
  });
});
