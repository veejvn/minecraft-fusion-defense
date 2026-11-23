export { createGame } from './create-game';
export type { GameHandle } from './create-game';

export { createPlaytestGame } from './create-playtest-game';
export type { PlaytestGameHandle } from './create-playtest-game';

export { createCampaignGame } from './create-campaign-game';
export type { CampaignGameHandle, CreateCampaignGameOptions } from './create-campaign-game';

export type { PlaytestTool, PlaytestVisualStyle } from './scenes/playtest-scene';
export type {
  CampaignTool,
  CampaignVisualStyle,
  ExternalDragPayload,
} from './scenes/grassland-battle-scene';

export {
  ALL_GAME_ASSETS,
  DEFENDER_SPRITE_ASSETS,
  EFFECT_SPRITE_ASSETS,
  ENEMY_SPRITE_ASSETS,
  ITEM_SPRITE_ASSETS,
  MAP_TILE_ASSETS,
  getDefenderAsset,
  getEffectAsset,
  getEnemyAsset,
  type SpriteAssetEntry,
} from './assets/asset-manifest';

export { CampaignController } from './campaign/campaign-controller';
export type {
  BaseDefenderCardView,
  CampaignBattleStatus,
  CampaignControllerOptions,
  CampaignSnapshot,
  CampaignSpeed,
  CampaignToast,
  SavedBattleSummary,
} from './campaign/campaign-controller';

export {
  CAMPAIGN_DEFENDER_CATALOG,
  CAMPAIGN_ENEMY_CATALOG,
  CAMPAIGN_ITEM_URLS,
  CAMPAIGN_RECIPE_CATALOG,
  GRASSLAND_CAMPAIGN_WAVES,
  GRASSLAND_WAVE_CRYSTALS,
  createGrasslandCampaignInputs,
  type CampaignDefenderCatalogItem,
  type CampaignEnemyCatalogItem,
  type CampaignRecipeCatalogItem,
} from './campaign/grassland-campaign-config';

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

export {
  BrowserLocalStorageAdapter,
  InMemoryStorageAdapter,
  type PersistenceStorageAdapter,
} from './persistence/storage-adapter';

export {
  SAVE_SCHEMA_VERSION,
  SnapshotValidationError,
  type BattleCheckpointEnvelope,
  type CheckpointSemanticContext,
  type CheckpointTriggerReason,
  type DecodedBattleCheckpoint,
  type SnapshotValidationErrorCode,
} from './persistence/snapshot-codec';

export {
  ACTIVE_BATTLE_STORAGE_KEY,
  CheckpointManager,
  MAX_RAM_CHECKPOINTS,
  type CheckpointManagerOptions,
  type CheckpointRecord,
  type RecoveredCheckpointMatch,
} from './persistence/checkpoint-manager';

export {
  PROGRESSION_SCHEMA_VERSION,
  PROGRESSION_STORAGE_KEY,
  ProgressionStore,
  ProgressionValidationError,
  STARTER_DEFENDER_IDS,
  STARTER_RECIPE_IDS,
  applyProgressionUnlocks,
  createStarterProgressionProfile,
  getAchievementsView,
  getDefenderCollectionView,
  type AchievementView,
  type BattleOutcomeInput,
  type DefenderCollectionEntry,
  type ProgressionEnvelope,
  type ProgressionProfile,
  type ProgressionStoreOptions,
  type ProgressionValidationErrorCode,
  type RecordBattleOutcomeResult,
} from './persistence/progression-store';

export type {
  BattlePersistenceMeta,
  BattlePersistenceOptions,
  BattleRecoveryResult,
  CheckpointRestoreResult,
} from './systems/battle-runtime';
