import * as Phaser from 'phaser';
import { attachCleanupAdapter, claimHost, failOwner, requestDestroy } from './core/lifecycle-adapter';
import { PlaytestController, type PlaytestControllerOptions } from './playtest/playtest-controller';
import {
  PlaytestScene,
  type PlaytestExternalDragPayload,
  type PlaytestTool,
  type PlaytestVisualStyle,
} from './scenes/playtest-scene';

export interface PlaytestGameOptions extends PlaytestControllerOptions {
  readonly onToolChange?: (tool: PlaytestTool) => void;
}

export type PlaytestGameHandle = {
  game: Phaser.Game;
  ready: Promise<void>;
  controller: PlaytestController;
  setTool(tool: PlaytestTool): void;
  setVisualStyle(style: PlaytestVisualStyle): void;
  setShowGridCoords(show: boolean): void;
  setExternalDragAtClientPoint(
    payload: PlaytestExternalDragPayload | null,
    clientX: number,
    clientY: number,
  ): void;
  dropExternalDragAtClientPoint(
    payload: PlaytestExternalDragPayload,
    clientX: number,
    clientY: number,
  ): boolean;
  destroy(): void;
};

/**
 * Mount the interactive Phaser PlaytestScene into a DOM host using the verified
 * lifecycle cleanup adapter with pixelArt: true nearest-neighbor rendering.
 */
export function createPlaytestGame(
  host: HTMLElement,
  options?: PlaytestGameOptions,
): PlaytestGameHandle {
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

  const controller = new PlaytestController(options);
  const scene = new PlaytestScene(
    controller,
    () => {
      if (readySettled) return;
      readySettled = true;
      resolveReady();
    },
    options?.onToolChange,
  );

  let game!: Phaser.Game;
  try {
    game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: host,
      width: 1280,
      height: 720,
      backgroundColor: '#0F172A',
      render: {
        pixelArt: true,
        antialias: false,
        roundPixels: true,
      },
      scale: {
        mode: Phaser.Scale.FIT,
        width: 1280,
        height: 720,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      scene: [scene],
    });
    attachCleanupAdapter(owner, game);
  } catch (error) {
    cancelReady();
    failOwner(owner, error);
    try {
      game?.destroy(true);
    } catch (cleanupError) {
      console.error('Phaser cleanup request failed:', cleanupError);
    }
    throw error;
  }

  game.events.once(Phaser.Core.Events.DESTROY, cancelReady);

  return {
    game,
    ready,
    controller,
    setTool(tool: PlaytestTool) {
      scene.setTool(tool);
    },
    setVisualStyle(style: PlaytestVisualStyle) {
      scene.setVisualStyle(style);
    },
    setShowGridCoords(show: boolean) {
      scene.setShowGridCoords(show);
    },
    setExternalDragAtClientPoint(
      payload: PlaytestExternalDragPayload | null,
      clientX: number,
      clientY: number,
    ) {
      scene.setExternalDragAtClientPoint(payload, clientX, clientY);
    },
    dropExternalDragAtClientPoint(
      payload: PlaytestExternalDragPayload,
      clientX: number,
      clientY: number,
    ) {
      return scene.dropExternalDragAtClientPoint(payload, clientX, clientY);
    },
    destroy() {
      cancelReady();
      requestDestroy(owner);
    },
  };
}
