import * as Phaser from 'phaser';
import { attachCleanupAdapter, claimHost, failOwner, requestDestroy } from './core/lifecycle-adapter';
import { CampaignController, type CampaignControllerOptions } from './campaign/campaign-controller';
import {
  GrasslandBattleScene,
  type CampaignTool,
  type CampaignVisualStyle,
  type ExternalDragPayload,
} from './scenes/grassland-battle-scene';

export interface CreateCampaignGameOptions {
  readonly onToolChange?: (tool: CampaignTool) => void;
}

export type CampaignGameHandle = {
  game: Phaser.Game;
  ready: Promise<void>;
  controller: CampaignController;
  setTool(tool: CampaignTool): void;
  setVisualStyle(style: CampaignVisualStyle): void;
  setShowGridCoords(show: boolean): void;
  setExternalDragAtClientPoint(
    payload: ExternalDragPayload | null,
    clientX: number,
    clientY: number,
  ): void;
  dropExternalDragAtClientPoint(
    payload: ExternalDragPayload,
    clientX: number,
    clientY: number,
  ): boolean;
  destroy(): void;
};

/**
 * Mount the interactive 5x10 Grassland Campaign Phaser Scene into a DOM host using
 * the T-02 lifecycle cleanup adapter with pixelArt: true nearest-neighbor rendering.
 */
export function createCampaignGame(
  host: HTMLElement,
  controllerOrOptions?: CampaignController | CampaignControllerOptions,
  options?: CreateCampaignGameOptions,
): CampaignGameHandle {
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

  const controller =
    controllerOrOptions instanceof CampaignController
      ? controllerOrOptions
      : new CampaignController(controllerOrOptions);
  const scene = new GrasslandBattleScene(
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
    setTool(tool: CampaignTool) {
      scene.setTool(tool);
    },
    setVisualStyle(style: CampaignVisualStyle) {
      scene.setVisualStyle(style);
    },
    setShowGridCoords(show: boolean) {
      scene.setShowGridCoords(show);
    },
    setExternalDragAtClientPoint(
      payload: ExternalDragPayload | null,
      clientX: number,
      clientY: number,
    ) {
      scene.setExternalDragAtClientPoint(payload, clientX, clientY);
    },
    dropExternalDragAtClientPoint(
      payload: ExternalDragPayload,
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
