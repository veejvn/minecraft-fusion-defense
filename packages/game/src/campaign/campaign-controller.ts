import { BATTLEFIELD_COLUMNS, isLane, type Cell } from '../battlefield/grid';
import type { EntityId } from '../entities/runtime-entity';
import {
  ACTIVE_BATTLE_STORAGE_KEY,
  CheckpointManager,
} from '../persistence/checkpoint-manager';
import {
  ProgressionStore,
  getAchievementsView,
  getDefenderCollectionView,
  type AchievementView,
  type DefenderCollectionEntry,
  type ProgressionProfile,
} from '../persistence/progression-store';
import { peekCheckpointLevelId, type CheckpointTriggerReason } from '../persistence/snapshot-codec';
import {
  BrowserLocalStorageAdapter,
  InMemoryStorageAdapter,
  backupKey,
  type PersistenceStorageAdapter,
} from '../persistence/storage-adapter';
import type {
  PlaytestDefenderView,
  PlaytestEnemyView,
  PlaytestFlashEffect,
  PlaytestItemView,
  PlaytestProjectileView,
  PlaytestRedirectAuraView,
  PlaytestSlowZoneView,
  PlaytestStatusBadge,
} from '../playtest/playtest-controller';
import {
  PLAYTEST_DEFENDER_META,
  PLAYTEST_ENEMY_META,
  PLAYTEST_FUSION_RECIPES_META,
  type PlaytestDefenderMeta,
  type PlaytestEnemyMeta,
} from '../playtest/playtest-presets';
import { BattleRuntime } from '../systems/battle-runtime';
import type { WavePhaseStatus } from '../waves/wave-state';
import {
  CAMPAIGN_DEFENDER_CATALOG,
  CAMPAIGN_GLOVE_COOLDOWN_SECONDS,
  CAMPAIGN_LEVELS,
  GRASSLAND_CAMPAIGN_WAVES,
  GRASSLAND_VILLAGE_CHEST,
  createCampaignInputs,
  createGrasslandCampaignInputs,
  evaluateCampaignLevelUnlock,
  tryGetCampaignLevelById,
  type CampaignLevelCardView,
  type GrasslandCampaignRuntimeInputs,
} from './grassland-campaign-config';

const TICKS_PER_SECOND = 20;
const MAX_CATCH_UP_TICKS = 10;
const TICK_DURATION_MS = 1000 / TICKS_PER_SECOND;
const MAX_CRYSTALS = 5;

export type CampaignSpeed = 1 | 2;
export type CampaignBattleStatus = 'idle' | 'playing' | 'paused' | 'victory' | 'defeat';

export interface BaseDefenderCardView {
  readonly id: string;
  readonly name: string;
  readonly spriteUrl: string;
  readonly cost: number;
  readonly unlocked: boolean;
  readonly canAfford: boolean;
  readonly cooldownTotalSeconds: number;
  readonly cooldownRemainingSeconds: number;
  readonly cooldownProgressPct: number;
  readonly onCooldown: boolean;
  readonly role: string;
  readonly abilityName: string;
  readonly requirement: string;
}

export interface CampaignToast {
  readonly id: number;
  readonly kind: 'info' | 'success' | 'error';
  readonly message: string;
}

export interface SavedBattleSummary {
  readonly levelId: string;
  readonly levelName: string;
  readonly battleId: string;
  readonly tick: number;
  readonly waveNumber: number;
  readonly totalWaves: number;
  readonly energy: number;
  readonly crystals: number;
}

export interface GloveCooldownView {
  readonly totalSeconds: number;
  readonly remainingSeconds: number;
  readonly progressPct: number;
  readonly onCooldown: boolean;
}

export interface VillageChestView {
  readonly enabled: boolean;
  readonly ready: boolean;
  readonly remainingSeconds: number;
  readonly totalSeconds: number;
  readonly amount: number;
}

export interface CampaignSnapshot {
  readonly status: CampaignBattleStatus;
  readonly activeLevelId: string | null;
  readonly activeLevelName: string;
  readonly allowedBaseDefenderIds: readonly string[] | null;
  readonly battleId: string | null;
  readonly tick: number;
  readonly elapsedSeconds: number;
  readonly paused: boolean;
  readonly speedMultiplier: CampaignSpeed;
  readonly unlockAllMode: boolean;
  readonly energy: number;
  readonly crystals: number;
  readonly maxCrystals: number;
  readonly pendingWaveCrystals: number;
  readonly waveIndex: number | null;
  readonly waveNumber: number;
  readonly totalWaves: number;
  readonly wavePhase: WavePhaseStatus | 'idle';
  readonly enemiesRemaining: number;
  readonly enemiesKilled: number;
  readonly terminal: null | 'victory' | 'defeat';
  readonly defenders: readonly PlaytestDefenderView[];
  readonly enemies: readonly PlaytestEnemyView[];
  readonly projectiles: readonly PlaytestProjectileView[];
  readonly items: readonly PlaytestItemView[];
  readonly slowZones: readonly PlaytestSlowZoneView[];
  readonly redirectAuras: readonly PlaytestRedirectAuraView[];
  readonly flashes: readonly PlaytestFlashEffect[];
  readonly baseDefenderCards: readonly BaseDefenderCardView[];
  readonly gloveCooldown: GloveCooldownView;
  readonly villageChest: VillageChestView;
  readonly unlockedRecipeIds: readonly string[];
  readonly lastToast: CampaignToast | null;
  readonly newlyUnlocked: {
    readonly defenders: readonly string[];
    readonly recipes: readonly string[];
  };
  readonly progressionProfile: ProgressionProfile;
}

export interface CampaignControllerOptions {
  readonly storage?: PersistenceStorageAdapter;
  readonly seed?: number;
  readonly autoStart?: boolean;
  readonly unlockAll?: boolean;
}

const DEFENDER_META_BY_ID = new Map<string, PlaytestDefenderMeta>(
  PLAYTEST_DEFENDER_META.map(m => [m.id, m]),
);
const ENEMY_META_BY_ID = new Map<string, PlaytestEnemyMeta>(
  PLAYTEST_ENEMY_META.map(m => [m.id, m]),
);
const BASE_CATALOG = CAMPAIGN_DEFENDER_CATALOG.filter(d => d.tier === 1);
const RECIPE_BY_PAIR = new Map<string, (typeof PLAYTEST_FUSION_RECIPES_META)[number]>(
  PLAYTEST_FUSION_RECIPES_META.map(r => {
    const [a, b] = r.inputs;
    return [a <= b ? `${a}|${b}` : `${b}|${a}`, r];
  }),
);

function normalizePairKey(a: string, b: string): string {
  return a <= b ? `${a}|${b}` : `${b}|${a}`;
}

function parseEntityId(id: string): EntityId | null {
  if (typeof id !== 'string' || !/^\d+$/.test(id)) return null;
  return BigInt(id);
}

function isValidCell(cell: Cell): boolean {
  return (
    Number.isInteger(cell.row) &&
    Number.isInteger(cell.column) &&
    isLane(cell.row) &&
    cell.column >= 0 &&
    cell.column < BATTLEFIELD_COLUMNS
  );
}

function defaultStorageAdapter(): PersistenceStorageAdapter {
  if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
    return new BrowserLocalStorageAdapter();
  }
  return new InMemoryStorageAdapter();
}

function formatEnglishRejection(
  category: 'summon' | 'fuse' | 'move' | 'remove' | 'ability' | 'collect' | 'claim',
  reason?: string,
): string {
  switch (reason) {
    case 'paused':
      return 'Game is Paused';
    case 'terminal':
      return 'Battle has already ended';
    case 'insufficient-energy':
      return 'Insufficient Emeralds';
    case 'summon-on-cooldown':
      return 'Defender is recharging (on cooldown)';
    case 'glove-on-cooldown':
      return 'Fusion Glove is recharging (on cooldown)';
    case 'defender-unavailable':
      return 'Defender is still locked';
    case 'occupied':
    case 'occupied-cell':
    case 'grid-conflict':
      return 'Cell is already occupied';
    case 'same-cell':
      return 'Defender is already on that cell';
    case 'invalid-cell':
    case 'invalid-target-cell':
      return 'Invalid grid cell';
    case 'insufficient-crystals':
      return 'Insufficient Power Crystals';
    case 'no-target':
      return 'No valid Enemy target in range';
    case 'owner-disabled':
      return 'Defender is Stunned or Frozen';
    case 'on-cooldown':
      return 'Ability is on Cooldown';
    case 'no-recipe':
    case 'recipe-not-found':
      return 'No Fusion Recipe for these two Defenders';
    case 'recipe-unavailable':
    case 'recipe-disabled':
      return 'Fusion Recipe is still locked';
    case 'same-instance':
      return 'Cannot fuse a Defender with itself';
    case 'crystal-storage-full':
      return 'Power Crystal storage is full (5/5)';
    case 'nothing-to-claim':
      return 'No pending Power Crystals to claim';
    case 'chest-not-ready':
      return 'Village Supply Chest is still restocking';
    case 'chest-disabled':
      return 'Village Supply Chest is disabled';
    default:
      return `${category.toUpperCase()} rejected${reason ? ` (${reason})` : ''}`;
  }
}

function extractQueueReason(result: { status: string; reason?: string }): string | undefined {
  return result.reason;
}

function diffNewlyUnlocked(
  before: ProgressionProfile,
  after: ProgressionProfile,
): { readonly defenders: readonly string[]; readonly recipes: readonly string[] } {
  const prevDef = new Set(before.unlockedDefenderIds);
  const prevRec = new Set(before.unlockedRecipeIds);
  return {
    defenders: after.unlockedDefenderIds.filter(id => !prevDef.has(id)),
    recipes: after.unlockedRecipeIds.filter(id => !prevRec.has(id)),
  };
}

/**
 * Pure TypeScript campaign coordinator connecting BattleRuntime, CheckpointManager,
 * ProgressionStore, React screen stack/HUD, and Phaser GrasslandBattleScene.
 */
export class CampaignController {
  private readonly storage: PersistenceStorageAdapter;
  private readonly checkpointManager: CheckpointManager;
  private readonly progressionStore: ProgressionStore;
  private readonly seed: number;
  private runtime: BattleRuntime | null = null;
  private runtimeInputs: GrasslandCampaignRuntimeInputs | null = null;
  private activeLevelId: string | null = null;
  private battleId: string | null = null;
  private battleSeq = 0;
  private claimCounter = 0;
  private unlockAllMode: boolean;
  private paused = false;
  private speedMultiplier: CampaignSpeed = 1;
  private lastToast: CampaignToast | null = null;
  private nextToastId = 1;
  private nextFlashId = 1;
  private flashes: PlaytestFlashEffect[] = [];
  private lastResourceOutcomeEventId: string | null = null;
  private lastFusionOutcomeEventId: string | null = null;
  private lastAbilityOutcomeEventId: string | null = null;
  private lastTerminal: null | 'victory' | 'defeat' = null;
  private profileBeforeBattle: ProgressionProfile;
  private newlyUnlocked: { readonly defenders: readonly string[]; readonly recipes: readonly string[] } = {
    defenders: [],
    recipes: [],
  };
  private snapshotCache: CampaignSnapshot;
  private readonly listeners = new Set<(snapshot: CampaignSnapshot) => void>();

  constructor(options: CampaignControllerOptions = {}) {
    this.storage = options.storage ?? defaultStorageAdapter();
    this.checkpointManager = new CheckpointManager({ storage: this.storage });
    this.progressionStore = new ProgressionStore({ storage: this.storage });
    this.seed = options.seed ?? 20261123;
    this.unlockAllMode = options.unlockAll ?? false;
    this.profileBeforeBattle = this.progressionStore.getProfile();
    this.snapshotCache = this.buildSnapshot();
    if (options.autoStart) {
      this.startNewBattle({ unlockAll: this.unlockAllMode });
    }
  }

  getProgressionProfile(): ProgressionProfile {
    return this.progressionStore.getProfile();
  }

  getDefenderCollection(): readonly DefenderCollectionEntry[] {
    return getDefenderCollectionView(this.progressionStore.getProfile());
  }

  getAchievements(): readonly AchievementView[] {
    return getAchievementsView(this.progressionStore.getProfile());
  }

  getCampaignLevelsView(): readonly CampaignLevelCardView[] {
    const profile = this.progressionStore.getProfile();
    return CAMPAIGN_LEVELS.map(level => {
      const unlockState = evaluateCampaignLevelUnlock(level, profile, this.unlockAllMode);
      return {
        id: level.id,
        order: level.order,
        name: level.name,
        description: level.description,
        difficulty: level.difficulty,
        theme: level.theme,
        waveCount: level.waves.length,
        initialEmeralds: level.initialEmeralds,
        startingDefenderCount: level.startingDefenders?.length ?? 0,
        allowedBaseDefenderIds: level.allowedBaseDefenderIds
          ? [...level.allowedBaseDefenderIds]
          : null,
        unlocked: unlockState.unlocked,
        cleared: unlockState.cleared,
        requirementText: unlockState.requirementText,
      };
    });
  }

  hasSavedBattle(): boolean {
    return this.getSavedBattleSummary() !== null;
  }

  private resolveSavedLevelId(): string {
    const primary = this.storage.getItem(ACTIVE_BATTLE_STORAGE_KEY);
    const backup = this.storage.getItem(backupKey(ACTIVE_BATTLE_STORAGE_KEY));
    for (const raw of [primary, backup]) {
      if (typeof raw === 'string' && raw.length > 0) {
        const peekId = peekCheckpointLevelId(raw);
        if (tryGetCampaignLevelById(peekId)) {
          return peekId;
        }
      }
    }
    return 'grassland';
  }

  getSavedBattleSummary(): SavedBattleSummary | null {
    const profile = this.progressionStore.getProfile();
    const levelId = this.resolveSavedLevelId();
    const probeInputs = createCampaignInputs(levelId, profile, { unlockAll: true, seed: this.seed });
    try {
      const runtime = this.tryLoadSavedRuntime(probeInputs);
      if (!runtime) return null;
      const snap = runtime.snapshot();
      const terminal = snap.combat?.terminal ?? snap.resources?.terminal ?? snap.waves?.terminal ?? null;
      if (terminal !== null) return null;
      const waveIdx = snap.waves?.currentWaveIndex ?? 0;
      return {
        levelId: probeInputs.levelId,
        levelName: probeInputs.levelName,
        battleId: runtime.getPersistenceMeta().battleId,
        tick: snap.tick,
        waveNumber: Math.min(probeInputs.totalWaves, waveIdx + 1),
        totalWaves: probeInputs.totalWaves,
        energy: snap.resources?.energy ?? 0,
        crystals: snap.resources?.crystals ?? 0,
      };
    } catch {
      return null;
    }
  }

  clearSavedBattle(): void {
    this.checkpointManager.clearPersistentSave();
    this.checkpointManager.clearRamCheckpoints();
    this.refreshAndEmit();
  }

  resetProgression(): ProgressionProfile {
    const profile = this.progressionStore.reset();
    this.profileBeforeBattle = profile;
    this.newlyUnlocked = { defenders: [], recipes: [] };
    this.refreshAndEmit();
    return profile;
  }

  setUnlockAllMode(unlockAll: boolean): void {
    this.unlockAllMode = unlockAll;
    this.refreshAndEmit();
  }

  startNewBattle(
    options: { readonly levelId?: string; readonly unlockAll?: boolean; readonly battleId?: string } = {},
  ): void {
    const levelId = options.levelId ?? 'grassland';
    const level = tryGetCampaignLevelById(levelId);
    if (!level) {
      this.pushToast('error', `Unknown stage: ${levelId}`);
      this.refreshAndEmit();
      return;
    }
    const unlockAll = options.unlockAll ?? this.unlockAllMode;
    const profile = this.progressionStore.getProfile();
    const unlockState = evaluateCampaignLevelUnlock(level, profile, unlockAll);
    if (!unlockState.unlocked) {
      this.pushToast('error', unlockState.requirementText);
      this.refreshAndEmit();
      return;
    }

    this.checkpointManager.clearPersistentSave();
    this.checkpointManager.clearRamCheckpoints();
    this.unlockAllMode = unlockAll;
    this.activeLevelId = level.id;

    this.profileBeforeBattle = profile;
    this.newlyUnlocked = { defenders: [], recipes: [] };
    this.battleSeq += 1;
    this.battleId = options.battleId ?? `${level.id}_${Date.now()}_${this.battleSeq}`;
    this.claimCounter = 0;
    this.paused = false;
    this.speedMultiplier = 1;
    this.lastToast = null;
    this.flashes = [];
    this.lastResourceOutcomeEventId = null;
    this.lastFusionOutcomeEventId = null;
    this.lastAbilityOutcomeEventId = null;
    this.lastTerminal = null;

    const inputs = createCampaignInputs(level.id, profile, { unlockAll, seed: this.seed });
    this.runtimeInputs = inputs;
    this.runtime = new BattleRuntime(
      { ticksPerSecond: TICKS_PER_SECOND, maxCatchUpTicks: MAX_CATCH_UP_TICKS },
      inputs.resourceInput,
      inputs.combatInput,
      inputs.fusionInput,
      inputs.waveInput,
      inputs.abilityInput,
      {
        battleId: this.battleId,
        levelId: level.id,
        storage: this.storage,
        progressionStore: this.progressionStore,
        autoCheckpoint: true,
        checkpointManager: this.checkpointManager,
      },
    );
    this.pushToast('info', `${inputs.levelName} started — Defend all ${inputs.totalWaves} Waves!`);
    this.refreshAndEmit();
  }

  resumeSavedBattle(options: { readonly unlockAll?: boolean } = {}): boolean {
    const unlockAll = options.unlockAll ?? this.unlockAllMode;
    const profile = this.progressionStore.getProfile();
    const levelId = this.resolveSavedLevelId();
    const inputs = createCampaignInputs(levelId, profile, { unlockAll: true, seed: this.seed });
    const restored = this.tryLoadSavedRuntime(inputs, true);
    if (!restored) {
      this.pushToast('error', 'No valid saved battle found');
      this.refreshAndEmit();
      return false;
    }

    this.unlockAllMode = unlockAll;
    this.activeLevelId = inputs.levelId;
    this.profileBeforeBattle = profile;
    this.newlyUnlocked = { defenders: [], recipes: [] };
    this.runtimeInputs = inputs;
    this.runtime = restored;
    this.battleId = restored.getPersistenceMeta().battleId;
    // Resume into unpaused playing state even if saved on pause/unload so gameplay responds immediately.
    this.paused = false;
    restored.setPaused(false);
    this.flashes = [];
    this.lastTerminal = null;
    const snap = restored.snapshot();
    this.lastResourceOutcomeEventId = snap.resources?.outcome?.eventId ?? null;
    this.lastFusionOutcomeEventId = snap.fusion?.outcome?.eventId ?? null;
    this.lastAbilityOutcomeEventId = snap.abilities?.outcome?.eventId ?? null;
    this.pushToast('success', 'Resumed saved battle');
    this.refreshAndEmit();
    return true;
  }

  abandonBattleToMenu(saveCheckpoint = true): void {
    if (saveCheckpoint && this.runtime && this.lastTerminal === null) {
      this.saveCheckpointNow('manual');
    }
    this.runtime = null;
    this.runtimeInputs = null;
    this.activeLevelId = null;
    this.paused = false;
    this.flashes = [];
    this.refreshAndEmit();
  }

  saveCheckpointNow(reason: CheckpointTriggerReason = 'manual'): boolean {
    if (!this.runtime || this.lastTerminal !== null) return false;
    try {
      this.runtime.createCheckpoint(reason);
      return true;
    } catch {
      return false;
    }
  }

  getSnapshot(): CampaignSnapshot {
    return this.snapshotCache;
  }

  subscribe(listener: (snapshot: CampaignSnapshot) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  setPaused(paused: boolean): void {
    if (!this.runtime) return;
    if (this.lastTerminal !== null) {
      this.paused = true;
      this.runtime.setPaused(true);
      return;
    }
    if (this.paused === paused) return;
    this.paused = paused;
    this.runtime.setPaused(paused);
    this.pushToast('info', paused ? 'Game Paused' : 'Game Resumed');
    this.refreshAndEmit();
  }

  togglePause(): void {
    this.setPaused(!this.paused);
  }

  setSpeed(speed: CampaignSpeed): void {
    if (this.speedMultiplier === speed) return;
    this.speedMultiplier = speed;
    this.pushToast('info', `Game speed set to ${speed}x`);
    this.refreshAndEmit();
  }

  stepMs(deltaMs: number): number {
    if (!this.runtime || this.paused || this.lastTerminal !== null || deltaMs <= 0) {
      return 0;
    }
    const ticks = this.runtime.advance(deltaMs * this.speedMultiplier);
    if (ticks > 0) {
      this.processOutcomesAndTerminal();
      this.pruneFlashes();
      this.refreshAndEmit();
    }
    return ticks;
  }

  canFuse(sourceId: string, targetId: string): boolean {
    return this.getFusionOutputId(sourceId, targetId) !== null;
  }

  getFusionOutputId(sourceId: string, targetId: string): string | null {
    if (!this.runtime || sourceId === targetId) return null;
    const src = this.snapshotCache.defenders.find(d => d.id === sourceId);
    const tgt = this.snapshotCache.defenders.find(d => d.id === targetId);
    if (!src || !tgt || src.hp <= 0 || tgt.hp <= 0 || src.tier !== 1 || tgt.tier !== 1) {
      return null;
    }
    const recipe = RECIPE_BY_PAIR.get(normalizePairKey(src.definitionId, tgt.definitionId));
    if (!recipe) return null;
    const effectiveUnlockAll = this.unlockAllMode || Boolean(this.runtimeInputs?.ignoreUnlockRestrictions);
    if (!effectiveUnlockAll && !this.snapshotCache.unlockedRecipeIds.includes(recipe.id)) {
      return null;
    }
    return recipe.output;
  }

  getCardFusionOutputId(definitionId: string, targetEntityId: string): string | null {
    if (!this.runtime) return null;
    const tgt = this.snapshotCache.defenders.find(d => d.id === targetEntityId);
    if (!tgt || tgt.hp <= 0 || tgt.tier !== 1) {
      return null;
    }
    const recipe = RECIPE_BY_PAIR.get(normalizePairKey(definitionId, tgt.definitionId));
    if (!recipe) return null;
    const effectiveUnlockAll = this.unlockAllMode || Boolean(this.runtimeInputs?.ignoreUnlockRestrictions);
    if (!effectiveUnlockAll && !this.snapshotCache.unlockedRecipeIds.includes(recipe.id)) {
      return null;
    }
    return recipe.output;
  }

  summonDefender(definitionId: string, cell: Cell): boolean {
    if (!this.runtime || !isValidCell(cell)) {
      this.pushToast('error', 'Invalid grid cell');
      this.refreshAndEmit();
      return false;
    }
    if (this.paused || this.lastTerminal !== null) {
      this.pushToast('error', this.paused ? 'Game is Paused' : 'Battle has already ended');
      this.refreshAndEmit();
      return false;
    }
    const targetTick = this.runtime.snapshot().tick + 1;
    const prevEventId = this.runtime.snapshot().resources?.outcome?.eventId ?? null;
    const queued = this.runtime.enqueue({ type: 'summon', definitionId, cell }, targetTick);
    if (queued.status !== 'APPLIED') {
      this.pushToast('error', formatEnglishRejection('summon', extractQueueReason(queued)));
      this.refreshAndEmit();
      return false;
    }
    this.runtime.advance(TICK_DURATION_MS);
    this.processOutcomesAndTerminal();
    const outcome = this.runtime.snapshot().resources?.outcome;
    const applied = outcome && outcome.eventId !== prevEventId ? outcome.status === 'APPLIED' : true;
    if (applied) {
      const meta = DEFENDER_META_BY_ID.get(definitionId);
      const tickNow = this.runtime.snapshot().tick;
      this.flashes.push({
        id: this.nextFlashId++,
        kind: 'summon',
        lane: cell.row,
        cell,
        color: meta?.accentColor ?? 0x22c55e,
        label: meta?.shortLabel ?? definitionId,
        createdAtTick: tickNow,
        ttlMs: 450,
      });
    }
    this.refreshAndEmit();
    return applied;
  }

  fuseDefenders(sourceId: string, targetId: string): boolean {
    if (!this.runtime) return false;
    if (this.paused || this.lastTerminal !== null) {
      this.pushToast('error', this.paused ? 'Game is Paused' : 'Battle has already ended');
      this.refreshAndEmit();
      return false;
    }
    const src = parseEntityId(sourceId);
    const tgt = parseEntityId(targetId);
    if (src === null || tgt === null) return false;

    const targetTick = this.runtime.snapshot().tick + 1;
    const prevEventId = this.runtime.snapshot().fusion?.outcome?.eventId ?? null;
    const queued = this.runtime.enqueue({ type: 'fuse', sourceId: src, targetId: tgt }, targetTick);
    if (queued.status !== 'APPLIED') {
      this.pushToast('error', formatEnglishRejection('fuse', extractQueueReason(queued)));
      this.refreshAndEmit();
      return false;
    }
    this.runtime.advance(TICK_DURATION_MS);
    this.processOutcomesAndTerminal();
    this.refreshAndEmit();
    const outcome = this.runtime.snapshot().fusion?.outcome;
    return outcome && outcome.eventId !== prevEventId ? outcome.status === 'APPLIED' : true;
  }

  summonAndFuseDefender(definitionId: string, targetId: string): boolean {
    if (!this.runtime) return false;
    if (this.paused || this.lastTerminal !== null) {
      this.pushToast('error', this.paused ? 'Game is Paused' : 'Battle has already ended');
      this.refreshAndEmit();
      return false;
    }
    const tgt = parseEntityId(targetId);
    if (tgt === null) return false;

    const targetTick = this.runtime.snapshot().tick + 1;
    const prevEventId = this.runtime.snapshot().fusion?.outcome?.eventId ?? null;
    const queued = this.runtime.enqueue(
      { type: 'summon-fuse', definitionId, targetId: tgt },
      targetTick,
    );
    if (queued.status !== 'APPLIED') {
      this.pushToast('error', formatEnglishRejection('fuse', extractQueueReason(queued)));
      this.refreshAndEmit();
      return false;
    }
    this.runtime.advance(TICK_DURATION_MS);
    this.processOutcomesAndTerminal();
    this.refreshAndEmit();
    const outcome = this.runtime.snapshot().fusion?.outcome;
    return outcome && outcome.eventId !== prevEventId ? outcome.status === 'APPLIED' : true;
  }

  moveDefender(defenderId: string, targetCell: Cell): boolean {
    if (!this.runtime || !isValidCell(targetCell)) {
      this.pushToast('error', 'Invalid grid cell');
      this.refreshAndEmit();
      return false;
    }
    if (this.paused || this.lastTerminal !== null) {
      this.pushToast('error', this.paused ? 'Game is Paused' : 'Battle has already ended');
      this.refreshAndEmit();
      return false;
    }
    const id = parseEntityId(defenderId);
    if (id === null) return false;

    const existing = this.snapshotCache.defenders.find(d => d.id === defenderId);
    const targetTick = this.runtime.snapshot().tick + 1;
    const prevEventId = this.runtime.snapshot().resources?.outcome?.eventId ?? null;
    const queued = this.runtime.enqueue(
      { type: 'move-defender', defenderId: id, targetCell },
      targetTick,
    );
    if (queued.status !== 'APPLIED') {
      this.pushToast('error', formatEnglishRejection('move', extractQueueReason(queued)));
      this.refreshAndEmit();
      return false;
    }
    this.runtime.advance(TICK_DURATION_MS);
    this.processOutcomesAndTerminal();
    const outcome = this.runtime.snapshot().resources?.outcome;
    const applied = outcome && outcome.eventId !== prevEventId ? outcome.status === 'APPLIED' : true;
    if (applied) {
      const meta = existing ? DEFENDER_META_BY_ID.get(existing.definitionId) : undefined;
      this.pushToast('info', `Moved ${meta?.name ?? 'Defender'}!`);
      this.flashes.push({
        id: this.nextFlashId++,
        kind: 'summon',
        lane: targetCell.row,
        cell: targetCell,
        color: meta?.accentColor ?? 0x38bdf8,
        label: 'MOVED',
        createdAtTick: this.runtime.snapshot().tick,
        ttlMs: 420,
      });
    }
    this.refreshAndEmit();
    return applied;
  }

  removeDefender(defenderId: string): boolean {
    if (!this.runtime) return false;
    if (this.paused || this.lastTerminal !== null) {
      this.pushToast('error', this.paused ? 'Game is Paused' : 'Battle has already ended');
      this.refreshAndEmit();
      return false;
    }
    const id = parseEntityId(defenderId);
    if (id === null) return false;

    const existing = this.snapshotCache.defenders.find(d => d.id === defenderId);
    if (!existing) return false;

    const targetTick = this.runtime.snapshot().tick + 1;
    const queued = this.runtime.enqueue({ type: 'remove', id }, targetTick);
    if (queued.status !== 'APPLIED') {
      this.pushToast('error', formatEnglishRejection('remove', extractQueueReason(queued)));
      this.refreshAndEmit();
      return false;
    }
    this.runtime.advance(TICK_DURATION_MS);
    this.processOutcomesAndTerminal();
    const stillExists = this.runtime.snapshot().entities.has(id);
    if (!stillExists) {
      const meta = DEFENDER_META_BY_ID.get(existing.definitionId);
      if (this.lastTerminal === null) {
        this.saveCheckpointNow('manual');
      }
      this.pushToast('info', `Removed ${meta?.name ?? 'Defender'} with Shovel`);
    }
    this.refreshAndEmit();
    return !stillExists;
  }

  activateAbility(defenderId: string, targetCell?: Cell): boolean {
    if (!this.runtime) return false;
    if (this.paused || this.lastTerminal !== null) {
      this.pushToast('error', this.paused ? 'Game is Paused' : 'Battle has already ended');
      this.refreshAndEmit();
      return false;
    }
    const id = parseEntityId(defenderId);
    if (id === null) return false;

    const targetTick = this.runtime.snapshot().tick + 1;
    const prevEventId = this.runtime.snapshot().abilities?.outcome?.eventId ?? null;
    const queued = this.runtime.enqueue(
      {
        type: 'activate-ability',
        defenderId: id,
        ...(targetCell && isValidCell(targetCell) ? { targetCell } : {}),
      },
      targetTick,
    );
    if (queued.status !== 'APPLIED') {
      this.pushToast('error', formatEnglishRejection('ability', extractQueueReason(queued)));
      this.refreshAndEmit();
      return false;
    }
    this.runtime.advance(TICK_DURATION_MS);
    this.processOutcomesAndTerminal();
    this.refreshAndEmit();
    const outcome = this.runtime.snapshot().abilities?.outcome;
    return outcome && outcome.eventId !== prevEventId ? outcome.status === 'APPLIED' : true;
  }

  collectItem(itemId: string): boolean {
    if (!this.runtime) return false;
    if (this.paused || this.lastTerminal !== null) {
      this.pushToast('error', this.paused ? 'Game is Paused' : 'Battle has already ended');
      this.refreshAndEmit();
      return false;
    }
    const id = parseEntityId(itemId);
    if (id === null) return false;

    const targetTick = this.runtime.snapshot().tick + 1;
    const prevEventId = this.runtime.snapshot().resources?.outcome?.eventId ?? null;
    const queued = this.runtime.enqueue({ type: 'collect', id }, targetTick);
    if (queued.status !== 'APPLIED') {
      this.pushToast('error', formatEnglishRejection('collect', extractQueueReason(queued)));
      this.refreshAndEmit();
      return false;
    }
    this.runtime.advance(TICK_DURATION_MS);
    this.processOutcomesAndTerminal();
    const outcome = this.runtime.snapshot().resources?.outcome;
    const ok = outcome && outcome.eventId !== prevEventId ? outcome.status === 'APPLIED' : true;
    if (ok && this.lastTerminal === null) {
      this.saveCheckpointNow('manual');
    }
    this.refreshAndEmit();
    return ok;
  }

  claimPendingWaveReward(): boolean {
    if (!this.runtime) return false;
    if (this.paused || this.lastTerminal !== null) {
      this.pushToast('error', this.paused ? 'Game is Paused' : 'Battle has already ended');
      this.refreshAndEmit();
      return false;
    }
    const targetTick = this.runtime.snapshot().tick + 1;
    const prevEventId = this.runtime.snapshot().resources?.outcome?.eventId ?? null;
    const requestId = `claim_${++this.claimCounter}`;
    const queued = this.runtime.enqueue({ type: 'claim', requestId }, targetTick);
    if (queued.status !== 'APPLIED') {
      this.pushToast('error', formatEnglishRejection('claim', extractQueueReason(queued)));
      this.refreshAndEmit();
      return false;
    }
    this.runtime.advance(TICK_DURATION_MS);
    this.processOutcomesAndTerminal();
    const outcome = this.runtime.snapshot().resources?.outcome;
    const ok = outcome && outcome.eventId !== prevEventId ? outcome.status === 'APPLIED' : true;
    if (ok && this.lastTerminal === null) {
      this.saveCheckpointNow('manual');
    }
    this.refreshAndEmit();
    return ok;
  }

  claimVillageChest(): boolean {
    if (!this.runtime) return false;
    if (this.paused || this.lastTerminal !== null) {
      this.pushToast('error', this.paused ? 'Game is Paused' : 'Battle has already ended');
      this.refreshAndEmit();
      return false;
    }
    const targetTick = this.runtime.snapshot().tick + 1;
    const prevEventId = this.runtime.snapshot().resources?.outcome?.eventId ?? null;
    const queued = this.runtime.enqueue({ type: 'claim-village-chest' }, targetTick);
    if (queued.status !== 'APPLIED') {
      this.pushToast('error', formatEnglishRejection('claim', extractQueueReason(queued)));
      this.refreshAndEmit();
      return false;
    }
    this.runtime.advance(TICK_DURATION_MS);
    this.processOutcomesAndTerminal();
    const outcome = this.runtime.snapshot().resources?.outcome;
    const ok = outcome && outcome.eventId !== prevEventId ? outcome.status === 'APPLIED' : true;
    if (ok) {
      const chestAmount = this.runtimeInputs?.resourceInput.villageChest?.amount ?? 25;
      this.pushToast('success', `+${chestAmount} EM from Village Supply Chest!`);
      if (this.lastTerminal === null) {
        this.saveCheckpointNow('manual');
      }
    }
    this.refreshAndEmit();
    return ok;
  }

  private tryLoadSavedRuntime(
    inputs: GrasslandCampaignRuntimeInputs,
    withPersistence = false,
  ): BattleRuntime | null {
    const primary = this.storage.getItem(ACTIVE_BATTLE_STORAGE_KEY);
    const backup = this.storage.getItem(backupKey(ACTIVE_BATTLE_STORAGE_KEY));
    const candidates = [primary, backup].filter((v): v is string => typeof v === 'string' && v.length > 0);
    for (const rawJson of candidates) {
      try {
        return BattleRuntime.fromCheckpoint(
          rawJson,
          { ticksPerSecond: TICKS_PER_SECOND, maxCatchUpTicks: MAX_CATCH_UP_TICKS },
          inputs.resourceInput,
          inputs.combatInput,
          inputs.fusionInput,
          inputs.waveInput,
          inputs.abilityInput,
          withPersistence
            ? {
                levelId: inputs.levelId,
                storage: this.storage,
                progressionStore: this.progressionStore,
                autoCheckpoint: true,
                checkpointManager: this.checkpointManager,
              }
            : undefined,
        );
      } catch {
        // Try backup checkpoint if primary is invalid or tampered.
      }
    }
    return null;
  }

  private pushToast(kind: CampaignToast['kind'], message: string): void {
    this.lastToast = {
      id: this.nextToastId++,
      kind,
      message,
    };
  }

  private processOutcomesAndTerminal(): void {
    if (!this.runtime) return;
    const raw = this.runtime.snapshot();

    const rOut = raw.resources?.outcome;
    if (rOut && rOut.eventId !== this.lastResourceOutcomeEventId) {
      this.lastResourceOutcomeEventId = rOut.eventId;
      if (rOut.status === 'REJECTED') {
        this.pushToast('error', formatEnglishRejection('summon', rOut.reason));
      }
    }

    const fOut = raw.fusion?.outcome;
    if (fOut && fOut.eventId !== this.lastFusionOutcomeEventId) {
      this.lastFusionOutcomeEventId = fOut.eventId;
      if (fOut.status === 'APPLIED') {
        const outEntity = raw.entities.get(fOut.outputEntityId);
        const outMeta = outEntity ? DEFENDER_META_BY_ID.get(outEntity.definitionId) : undefined;
        this.pushToast('success', `Fused into ${outMeta?.name ?? outEntity?.definitionId ?? 'Defender'}!`);
        this.flashes.push({
          id: this.nextFlashId++,
          kind: 'fusion',
          ...(outEntity && outEntity.kind === 'defender'
            ? { lane: outEntity.cell.row, cell: outEntity.cell }
            : {}),
          color: outMeta?.accentColor ?? 0xfacc15,
          label: outMeta?.name ?? 'Fusion',
          createdAtTick: raw.tick,
          ttlMs: 800,
        });
      } else {
        this.pushToast('error', formatEnglishRejection('fuse', fOut.reason));
      }
    }

    const aOut = raw.abilities?.outcome;
    if (aOut && aOut.eventId !== this.lastAbilityOutcomeEventId) {
      this.lastAbilityOutcomeEventId = aOut.eventId;
      if (aOut.status === 'APPLIED') {
        const caster = aOut.defenderId !== undefined ? raw.entities.get(aOut.defenderId) : undefined;
        const casterMeta = caster ? DEFENDER_META_BY_ID.get(caster.definitionId) : undefined;
        const abilityName = casterMeta?.abilityName ?? aOut.abilityId ?? 'Ability';
        this.pushToast('info', `${casterMeta?.name ?? 'Defender'} activated ${abilityName}!`);
        this.flashes.push({
          id: this.nextFlashId++,
          kind: 'ability',
          abilityId: aOut.abilityId,
          ...(caster && caster.kind === 'defender'
            ? { lane: caster.cell.row, cell: caster.cell }
            : {}),
          color: casterMeta?.accentColor ?? 0x38bdf8,
          label: abilityName,
          createdAtTick: raw.tick,
          ttlMs: 750,
        });
      } else {
        this.pushToast('error', formatEnglishRejection('ability', aOut.reason));
      }
    }

    const terminal = raw.combat?.terminal ?? raw.resources?.terminal ?? raw.waves?.terminal ?? null;
    if (terminal && this.lastTerminal === null) {
      this.lastTerminal = terminal;
      this.paused = true;
      if (terminal === 'victory') {
        const afterProfile = this.progressionStore.getProfile();
        this.newlyUnlocked = diffNewlyUnlocked(this.profileBeforeBattle, afterProfile);
        const levelName = this.runtimeInputs?.levelName ?? 'Grassland';
        this.pushToast('success', `Victory! ${levelName} Cleared!`);
      } else {
        this.newlyUnlocked = { defenders: [], recipes: [] };
        this.pushToast('error', 'Defeat! An Enemy breached your base!');
      }
    }
  }

  private pruneFlashes(): void {
    if (!this.runtime || this.flashes.length === 0) return;
    const tick = this.runtime.snapshot().tick;
    this.flashes = this.flashes.filter(f => (tick - f.createdAtTick) * TICK_DURATION_MS <= f.ttlMs);
  }

  private refreshAndEmit(): void {
    this.snapshotCache = this.buildSnapshot();
    for (const listener of this.listeners) {
      listener(this.snapshotCache);
    }
  }

  private buildSnapshot(): CampaignSnapshot {
    const profile = this.progressionStore.getProfile();
    const unlockedSet = new Set(profile.unlockedDefenderIds);
    const effectiveUnlockAll =
      this.unlockAllMode || Boolean(this.runtimeInputs?.ignoreUnlockRestrictions);
    const unlockedRecipes = effectiveUnlockAll
      ? PLAYTEST_FUSION_RECIPES_META.map(r => r.id)
      : [...profile.unlockedRecipeIds];

    if (!this.runtime || !this.runtimeInputs) {
      return {
        status: 'idle',
        activeLevelId: null,
        activeLevelName: 'Grassland',
        allowedBaseDefenderIds: null,
        battleId: null,
        tick: 0,
        elapsedSeconds: 0,
        paused: false,
        speedMultiplier: this.speedMultiplier,
        unlockAllMode: this.unlockAllMode,
        energy: 0,
        crystals: 0,
        maxCrystals: MAX_CRYSTALS,
        pendingWaveCrystals: 0,
        waveIndex: null,
        waveNumber: 1,
        totalWaves: GRASSLAND_CAMPAIGN_WAVES.length,
        wavePhase: 'idle',
        enemiesRemaining: 0,
        enemiesKilled: 0,
        terminal: null,
        defenders: [],
        enemies: [],
        projectiles: [],
        items: [],
        slowZones: [],
        redirectAuras: [],
        flashes: [],
        baseDefenderCards: BASE_CATALOG.map(d => ({
          id: d.id,
          name: d.name,
          spriteUrl: d.spriteUrl,
          cost: d.summonEnergyCost,
          unlocked: this.unlockAllMode || unlockedSet.has(d.id),
          canAfford: false,
          cooldownTotalSeconds: d.summonCooldownSeconds,
          cooldownRemainingSeconds: 0,
          cooldownProgressPct: 0,
          onCooldown: false,
          role: d.role,
          abilityName: d.abilityName,
          requirement: this.getDefenderCollection().find(c => c.id === d.id)?.requirement ?? 'Unlocked',
        })),
        gloveCooldown: {
          totalSeconds: CAMPAIGN_GLOVE_COOLDOWN_SECONDS,
          remainingSeconds: 0,
          progressPct: 0,
          onCooldown: false,
        },
        villageChest: {
          enabled: GRASSLAND_VILLAGE_CHEST.enabled,
          ready: false,
          remainingSeconds: GRASSLAND_VILLAGE_CHEST.intervalSeconds,
          totalSeconds: GRASSLAND_VILLAGE_CHEST.intervalSeconds,
          amount: GRASSLAND_VILLAGE_CHEST.amount,
        },
        unlockedRecipeIds: unlockedRecipes,
        lastToast: this.lastToast,
        newlyUnlocked: this.newlyUnlocked,
        progressionProfile: profile,
      };
    }

    const raw = this.runtime.snapshot();
    const abilities = raw.abilities;
    const combat = raw.combat;
    const resources = raw.resources;
    const terminal = combat?.terminal ?? resources?.terminal ?? raw.waves?.terminal ?? null;

    const defenders: PlaytestDefenderView[] = [];
    const enemies: PlaytestEnemyView[] = [];

    for (const entity of raw.entities.values()) {
      const entityCombat = combat?.entities.get(entity.id);
      if (entity.kind === 'defender') {
        const meta = DEFENDER_META_BY_ID.get(entity.definitionId);
        let shieldAmount = 0;
        let shieldMaxAmount = 0;
        if (abilities) {
          for (const s of abilities.shields) {
            if (s.ownerId === entity.id && s.amount > 0) {
              shieldAmount += s.amount;
              shieldMaxAmount += s.maxAmount;
            }
          }
        }
        let isStunned = false;
        let isFrozen = false;
        let buffDamagePct = 0;
        let buffAttackSpeedPct = 0;
        if (abilities) {
          for (const st of abilities.statuses) {
            if (st.targetEntityId !== entity.id || st.remainingTicks <= 0) continue;
            if (st.kind === 'stun') isStunned = true;
            else if (st.kind === 'freeze') isFrozen = true;
            else if (st.kind === 'buff') {
              buffDamagePct += st.attackDamageBonusPct ?? 0;
              buffAttackSpeedPct += st.attackSpeedBonusPct ?? 0;
            }
          }
        }
        const hasRedirectAura = Boolean(
          abilities?.redirects.some(r => r.ownerId === entity.id && r.remainingTicks > 0),
        );
        const badges: PlaytestStatusBadge[] = [];
        if (shieldAmount > 0) badges.push({ kind: 'shield', label: 'SHIELD' });
        if (hasRedirectAura) badges.push({ kind: 'redirect', label: 'REDIRECT' });
        if (isStunned) badges.push({ kind: 'stun', label: 'STUN' });
        if (isFrozen) badges.push({ kind: 'freeze', label: 'FREEZE' });
        if (buffDamagePct > 0 || buffAttackSpeedPct > 0) badges.push({ kind: 'buff', label: 'BUFF' });

        defenders.push({
          id: String(entity.id),
          definitionId: entity.definitionId,
          name: meta?.name ?? entity.definitionId,
          shortLabel: meta?.shortLabel ?? entity.definitionId.slice(0, 3).toUpperCase(),
          tier: meta?.tier ?? 1,
          color: meta?.color ?? 0x94a3b8,
          accentColor: meta?.accentColor ?? 0xe2e8f0,
          row: entity.cell.row,
          column: entity.cell.column,
          hp: entityCombat?.hp ?? 0,
          maxHp: entityCombat?.maxHp ?? 0,
          shieldAmount,
          shieldMaxAmount,
          abilityId: meta?.abilityId ?? '',
          abilityName: meta?.abilityName ?? '',
          abilitySummary: meta?.abilitySummary ?? '',
          requiresTarget: meta?.requiresTarget ?? false,
          cooldownTicks: abilities?.cooldowns.get(entity.id) ?? 0,
          isStunned,
          isFrozen,
          buffDamagePct,
          buffAttackSpeedPct,
          hasRedirectAura,
          targetId: entityCombat?.targetId !== null && entityCombat?.targetId !== undefined
            ? String(entityCombat.targetId)
            : null,
          attackCount: entityCombat?.attackCount ?? 0,
          attackAnchorTick: entityCombat?.attackAnchorTick ?? null,
          badges,
        });
      } else {
        const meta = ENEMY_META_BY_ID.get(entity.definitionId);
        let slowPct = 0;
        let isStunned = false;
        let isFrozen = false;
        let isVulnerable = false;
        let burnCount = 0;
        if (abilities) {
          for (const st of abilities.statuses) {
            if (st.targetEntityId !== entity.id || st.remainingTicks <= 0) continue;
            if (st.kind === 'slow') slowPct = Math.max(slowPct, st.slowPct ?? 0);
            else if (st.kind === 'stun') isStunned = true;
            else if (st.kind === 'freeze') isFrozen = true;
            else if (st.kind === 'vulnerable') isVulnerable = true;
            else if (st.kind === 'burn') burnCount += 1;
          }
        }
        const badges: PlaytestStatusBadge[] = [];
        if (isFrozen) badges.push({ kind: 'freeze', label: 'FREEZE' });
        if (isStunned) badges.push({ kind: 'stun', label: 'STUN' });
        if (isVulnerable) badges.push({ kind: 'vulnerable', label: 'MARKED +40%' });
        if (slowPct > 0) badges.push({ kind: 'slow', label: `SLOW -${Math.round(slowPct * 100)}%` });
        if (burnCount > 0) badges.push({ kind: 'burn', label: burnCount > 1 ? `BURN x${burnCount}` : 'BURN' });

        enemies.push({
          id: String(entity.id),
          definitionId: entity.definitionId,
          name: meta?.name ?? entity.definitionId,
          shortLabel: meta?.shortLabel ?? entity.definitionId.slice(0, 2).toUpperCase(),
          color: meta?.color ?? 0x65a30d,
          lane: entity.lane,
          x: entity.position,
          hp: entityCombat?.hp ?? 0,
          maxHp: entityCombat?.maxHp ?? 0,
          slowPct,
          isStunned,
          isFrozen,
          isVulnerable,
          burnCount,
          targetId: entityCombat?.targetId !== null && entityCombat?.targetId !== undefined
            ? String(entityCombat.targetId)
            : null,
          attackCount: entityCombat?.attackCount ?? 0,
          attackAnchorTick: entityCombat?.attackAnchorTick ?? null,
          badges,
        });
      }
    }

    defenders.sort((a, b) => a.row - b.row || a.column - b.column);
    enemies.sort((a, b) => a.lane - b.lane || a.x - b.x);

    const abilityById = new Map(this.runtimeInputs.abilities.map(a => [a.id, a]));
    const projectiles: PlaytestProjectileView[] = (abilities?.projectiles ?? []).map(proj => {
      if (proj.kind === 'lane') {
        return {
          id: String(proj.projectileId),
          kind: 'lane',
          abilityId: proj.abilityId,
          lane: proj.lane,
          x: proj.x,
          pierce: proj.pierce,
          damageType: proj.damageType,
        };
      }
      const abilityDef = abilityById.get(proj.abilityId);
      const fallingEffect = abilityDef?.effects.find(e => e.kind === 'multihit-falling-area');
      const totalTravelTicks = fallingEffect
        ? Math.max(1, Math.ceil(fallingEffect.travelSeconds * TICKS_PER_SECOND - 1e-9))
        : proj.abilityId === 'inferno'
          ? 9
          : 8;
      return {
        id: String(proj.projectileId),
        kind: 'falling',
        abilityId: proj.abilityId,
        sourceId: String(proj.sourceId),
        impactCell: { row: proj.impactCell.row, column: proj.impactCell.column },
        remainingTravelTicks: proj.remainingTravelTicks,
        totalTravelTicks,
        damageType: proj.damageType,
      };
    });

    const items: PlaytestItemView[] = resources
      ? Array.from(resources.items.values())
          .map(item => ({
            id: String(item.id),
            kind: item.kind,
            amount: item.amount,
            position: item.position,
            expiresAtTick: item.expiresAt,
          }))
          .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
      : [];

    const slowZones: PlaytestSlowZoneView[] = [];
    if (abilities) {
      for (const s of abilities.shields) {
        if (s.amount > 0 && s.frontSlowZone) {
          slowZones.push({
            shieldId: String(s.shieldId),
            ownerId: String(s.ownerId),
            row: s.frontSlowZone.row,
            column: s.frontSlowZone.column,
            slowPct: s.frontSlowZone.slowPct,
          });
        }
      }
    }

    const redirectAuras: PlaytestRedirectAuraView[] = [];
    if (abilities) {
      for (const r of abilities.redirects) {
        if (r.remainingTicks <= 0) continue;
        const owner = raw.entities.get(r.ownerId);
        if (!owner || owner.kind !== 'defender') continue;
        const protectedAllyIds: string[] = [];
        for (const ally of defenders) {
          if (
            ally.id !== String(r.ownerId) &&
            Math.abs(ally.row - owner.cell.row) <= r.radius &&
            Math.abs(ally.column - owner.cell.column) <= r.radius
          ) {
            protectedAllyIds.push(ally.id);
          }
        }
        redirectAuras.push({
          redirectId: String(r.redirectId),
          ownerId: String(r.ownerId),
          ownerRow: owner.cell.row,
          ownerColumn: owner.cell.column,
          radius: r.radius,
          redirectSharePct: r.redirectSharePct,
          remainingTicks: r.remainingTicks,
          protectedAllyIds,
        });
      }
    }

    const energy = resources?.energy ?? 0;
    const collection = this.getDefenderCollection();
    const collectionById = new Map(collection.map(c => [c.id, c]));
    const resourceDefById = new Map(this.runtimeInputs.resourceInput.defenders.map(d => [d.id, d]));
    const allowedSet = this.runtimeInputs.allowedBaseDefenderIds
      ? new Set(this.runtimeInputs.allowedBaseDefenderIds)
      : null;

    const baseDefenderCards: BaseDefenderCardView[] = BASE_CATALOG.map(d => {
      const resourceDef = resourceDefById.get(d.id);
      const isAllowed = !allowedSet || allowedSet.has(d.id);
      const unlocked = isAllowed && (resourceDef?.unlocked ?? false);
      const cost = this.runtimeInputs!.defenderCosts[d.id] ?? d.summonEnergyCost;
      const cooldownTotalSeconds = resourceDef?.summonCooldownSeconds ?? d.summonCooldownSeconds;
      const readyTick = resources?.summonCooldownUntilTick?.get(d.id) ?? 0;
      const remainingTicks = Math.max(0, readyTick - raw.tick);
      const onCooldown = remainingTicks > 0;
      const cooldownRemainingSeconds = onCooldown
        ? Number((remainingTicks / TICKS_PER_SECOND).toFixed(1))
        : 0;
      const totalCooldownTicks = cooldownTotalSeconds * TICKS_PER_SECOND;
      const cooldownProgressPct =
        onCooldown && totalCooldownTicks > 0
          ? Math.min(100, Math.max(0, Math.round((remainingTicks / totalCooldownTicks) * 100)))
          : 0;
      return {
        id: d.id,
        name: d.name,
        spriteUrl: d.spriteUrl,
        cost,
        unlocked,
        canAfford: unlocked && energy >= cost,
        cooldownTotalSeconds,
        cooldownRemainingSeconds,
        cooldownProgressPct,
        onCooldown,
        role: d.role,
        abilityName: d.abilityName,
        requirement: !isAllowed
          ? 'Restricted in this stage'
          : (collectionById.get(d.id)?.requirement ?? 'Unlocked'),
      };
    });

    const waveIndex = raw.waves?.currentWaveIndex ?? null;
    const status: CampaignBattleStatus =
      terminal !== null ? terminal : this.paused ? 'paused' : 'playing';

    const gloveTotalSeconds = this.runtimeInputs.fusionGloveCooldownSeconds;
    const gloveReadyTick = resources?.gloveCooldownUntilTick ?? 0;
    const gloveRemainingTicks = Math.max(0, gloveReadyTick - raw.tick);
    const gloveOnCooldown = gloveRemainingTicks > 0;
    const gloveRemainingSeconds = gloveOnCooldown
      ? Number((gloveRemainingTicks / TICKS_PER_SECOND).toFixed(1))
      : 0;
    const gloveTotalTicks = gloveTotalSeconds * TICKS_PER_SECOND;
    const gloveProgressPct =
      gloveOnCooldown && gloveTotalTicks > 0
        ? Math.min(100, Math.max(0, Math.round((gloveRemainingTicks / gloveTotalTicks) * 100)))
        : 0;

    const chestCfg = this.runtimeInputs.resourceInput.villageChest;
    const chestEnabled = Boolean(chestCfg?.enabled);
    const chestReady = chestEnabled && Boolean(resources?.villageChestReady);
    const chestTotalSeconds = chestCfg?.intervalSeconds ?? this.runtimeInputs.villageChest.intervalSeconds;
    const chestAmount = chestCfg?.amount ?? this.runtimeInputs.villageChest.amount;
    const chestRemainingTicks =
      chestEnabled && !chestReady && resources?.villageChestNextTick !== undefined && resources.villageChestNextTick !== null
        ? Math.max(0, resources.villageChestNextTick - raw.tick)
        : 0;
    const chestRemainingSeconds =
      chestEnabled && !chestReady ? Number((chestRemainingTicks / TICKS_PER_SECOND).toFixed(1)) : 0;

    return {
      status,
      activeLevelId: this.activeLevelId ?? this.runtimeInputs.levelId,
      activeLevelName: this.runtimeInputs.levelName,
      allowedBaseDefenderIds: this.runtimeInputs.allowedBaseDefenderIds,
      battleId: this.battleId,
      tick: raw.tick,
      elapsedSeconds: Number((raw.tick / TICKS_PER_SECOND).toFixed(2)),
      paused: this.paused,
      speedMultiplier: this.speedMultiplier,
      unlockAllMode: this.unlockAllMode,
      energy,
      crystals: resources?.crystals ?? 0,
      maxCrystals: MAX_CRYSTALS,
      pendingWaveCrystals: resources?.pending ?? 0,
      waveIndex,
      waveNumber: waveIndex !== null ? Math.min(this.runtimeInputs.totalWaves, waveIndex + 1) : 1,
      totalWaves: this.runtimeInputs.totalWaves,
      wavePhase: raw.waves?.status ?? 'pending',
      enemiesRemaining: enemies.length,
      enemiesKilled: this.runtime.getPersistenceMeta().matchKills,
      terminal,
      defenders,
      enemies,
      projectiles,
      items,
      slowZones,
      redirectAuras,
      flashes: this.flashes.map(f => ({ ...f })),
      baseDefenderCards,
      gloveCooldown: {
        totalSeconds: gloveTotalSeconds,
        remainingSeconds: gloveRemainingSeconds,
        progressPct: gloveProgressPct,
        onCooldown: gloveOnCooldown,
      },
      villageChest: {
        enabled: chestEnabled,
        ready: chestReady,
        remainingSeconds: chestRemainingSeconds,
        totalSeconds: chestTotalSeconds,
        amount: chestAmount,
      },
      unlockedRecipeIds: unlockedRecipes,
      lastToast: this.lastToast,
      newlyUnlocked: this.newlyUnlocked,
      progressionProfile: profile,
    };
  }
}
