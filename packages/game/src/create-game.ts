import * as Phaser from 'phaser';
import { attachCleanupAdapter, claimHost, failOwner, requestDestroy } from './core/lifecycle-adapter';
import { HelloScene } from './scenes/hello-scene';

export type GameHandle = {
  game: Phaser.Game;
  ready: Promise<void>;
  destroy(): void;
};

export function createGame(host: HTMLElement): GameHandle {
  const owner = claimHost(host);
  let resolveReady!: () => void;
  let rejectReady!: (reason: Error) => void;
  let readySettled = false;
  const ready = new Promise<void>((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });
  ready.catch(() => {});

  function cancelReady(): void {
    if (readySettled) return;
    readySettled = true;
    const error = new Error('Game initialization cancelled');
    error.name = 'GameInitializationCancelledError';
    rejectReady(error);
  }

  const scene = new HelloScene(() => {
    if (readySettled) return;
    readySettled = true;
    resolveReady();
  });
  let game!: Phaser.Game;
  try {
    game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: host,
      width: 1280,
      height: 720,
      scale: { mode: Phaser.Scale.FIT, width: 1280, height: 720, autoCenter: Phaser.Scale.CENTER_HORIZONTALLY },
      scene: [scene],
    });
    attachCleanupAdapter(owner, game);
  } catch (error) {
    cancelReady();
    failOwner(owner, error);
    // A partially constructed Game has no proven teardown contract here.
    // Request cleanup if possible, but keep the host locked.
    try { game?.destroy(true); } catch (cleanupError) { console.error('Phaser cleanup request failed:', cleanupError); }
    throw error;
  }

  game.events.once(Phaser.Core.Events.DESTROY, cancelReady);

  return {
    game,
    ready,
    destroy() {
      cancelReady();
      requestDestroy(owner);
    },
  };
}
