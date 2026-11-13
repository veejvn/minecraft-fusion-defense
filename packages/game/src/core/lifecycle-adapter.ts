import * as Phaser from 'phaser';

type InternalGame = Phaser.Game & {
  runDestroy?: (...args: unknown[]) => unknown;
  pendingDestroy?: boolean;
};

type OwnerState = 'constructing' | 'active' | 'destroying' | 'destroyed' | 'failed';

export type HostOwner = {
  readonly host: HTMLElement;
  game?: Phaser.Game;
  state: OwnerState;
  watchdog?: ReturnType<typeof setTimeout>;
};

const owners = new WeakMap<HTMLElement, HostOwner>();
const CLEANUP_WATCHDOG_MS = 5_000;

export class HostOwnedError extends Error {
  constructor() {
    super('Phaser host is still owned');
    this.name = 'HostOwnedError';
  }
}

export class HostCleanupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HostCleanupError';
  }
}

export function claimHost(host: HTMLElement): HostOwner {
  const existing = owners.get(host);
  if (existing?.state === 'failed') {
    throw new HostCleanupError('Previous Phaser cleanup could not be confirmed');
  }
  if (existing) throw new HostOwnedError();
  const owner: HostOwner = { host, state: 'constructing' };
  owners.set(host, owner);
  return owner;
}

export function failOwner(owner: HostOwner, error: unknown): void {
  if (owner.watchdog) clearTimeout(owner.watchdog);
  owner.state = 'failed';
  console.error('Phaser lifecycle failure:', error);
}

function teardownCompleted(owner: HostOwner, game: Phaser.Game): boolean {
  const loop = game.loop as Phaser.Core.TimeStep & { raf?: unknown; game?: unknown };
  const renderer = game.renderer as unknown as { game?: unknown };
  const scenes = game.scene as Phaser.Scenes.SceneManager & { game?: unknown };

  return (game as InternalGame).pendingDestroy === false
    && loop.running === false
    && loop.raf === null
    && loop.game === null
    && renderer.game === null
    && scenes.game === null
    && !owner.host.contains(game.canvas);
}

export function attachCleanupAdapter(owner: HostOwner, game: Phaser.Game): void {
  // Phaser 3.90.0 has no public post-teardown event. This instance-only wrapper
  // observes the private method boundary proven by the R-07 Chromium PoC.
  // Revalidate on every Phaser version change; never patch the global prototype.
  if (Phaser.VERSION !== '3.90.0') {
    throw new HostCleanupError(`Unsupported Phaser version: ${Phaser.VERSION}`);
  }
  const internal = game as InternalGame;
  const original = internal.runDestroy;
  if (typeof original !== 'function') {
    throw new HostCleanupError('Phaser runDestroy is unavailable');
  }

  owner.game = game;
  owner.state = 'active';
  internal.runDestroy = function (this: Phaser.Game, ...args: unknown[]): unknown {
    let result: unknown;
    try {
      result = original.apply(this, args);
    } catch (error) {
      failOwner(owner, error);
      throw error;
    }

    if (!teardownCompleted(owner, game)) {
      failOwner(owner, new HostCleanupError('Phaser teardown did not meet completion checks'));
      return result;
    }

    owner.state = 'destroyed';
    if (owner.watchdog) clearTimeout(owner.watchdog);
    if (owners.get(owner.host) === owner) owners.delete(owner.host);
    return result;
  };
}

export function requestDestroy(owner: HostOwner): void {
  if (owner.state === 'destroying' || owner.state === 'destroyed' || owner.state === 'failed') return;
  owner.state = 'destroying';
  try {
    owner.game?.destroy(true);
    // The timer detects a stalled teardown; it never authorizes host reuse.
    if (owner.state === 'destroying') {
      owner.watchdog = setTimeout(() => {
        if (owner.state === 'destroying') {
          failOwner(owner, new HostCleanupError('Phaser teardown did not complete'));
        }
      }, CLEANUP_WATCHDOG_MS);
    }
  } catch (error) {
    failOwner(owner, error);
    throw error;
  }
}
