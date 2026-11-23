export { createGame } from './create-game';
export type { GameHandle } from './create-game';

export { createPlaytestGame } from './create-playtest-game';
export type { PlaytestGameHandle } from './create-playtest-game';

export type { PlaytestTool, PlaytestVisualStyle } from './scenes/playtest-scene';

export { PlaytestController } from './playtest/playtest-controller';
export type {
  PlaytestControllerOptions,
  PlaytestDefenderView,
  PlaytestEnemyView,
  PlaytestFlashEffect,
  PlaytestHudSnapshot,
  PlaytestItemView,
  PlaytestLogEntry,
  PlaytestProjectileView,
  PlaytestRedirectAuraView,
  PlaytestSlowZoneView,
  PlaytestSpeed,
  PlaytestStatusBadge,
} from './playtest/playtest-controller';

export {
  PLAYTEST_DEFENDER_META,
  PLAYTEST_ENEMY_META,
  PLAYTEST_FUSION_RECIPES_META,
  clonePlaytestPreset,
  createDefaultPlaytestPreset,
} from './playtest/playtest-presets';
export type {
  PlaytestDefenderConfig,
  PlaytestDefenderMeta,
  PlaytestEnemyConfig,
  PlaytestEnemyMeta,
  PlaytestFusionRecipeMeta,
  PlaytestMode,
  PlaytestPresetConfig,
} from './playtest/playtest-presets';
