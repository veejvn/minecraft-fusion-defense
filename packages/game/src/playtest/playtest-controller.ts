import { BATTLEFIELD_COLUMNS, cellIndex, isLane, type Cell } from '../battlefield/grid';
import type { AbilityDamageType as DamageType } from '../abilities/ability-session';
import type { AbilityOutcome } from '../abilities/ability-state';
import { DEFENDER_SPRITE_ASSETS } from '../assets/asset-manifest';
import type {
  BaseDefenderCardView,
  CampaignToast,
  GloveCooldownView,
  VillageChestView,
} from '../campaign/campaign-controller';
import type { EntityId } from '../entities/runtime-entity';
import { BattleRuntime } from '../systems/battle-runtime';
import type { WavePhaseStatus } from '../waves/wave-state';
import {
  PLAYTEST_DEFENDER_META,
  PLAYTEST_ENEMY_META,
  PLAYTEST_FUSION_RECIPES_META,
  buildRuntimeInputsFromPreset,
  clonePlaytestPreset,
  createDefaultPlaytestPreset,
  type PlaytestDefenderMeta,
  type PlaytestEnemyMeta,
  type PlaytestMode,
  type PlaytestPresetConfig,
} from './playtest-presets';

const TICKS_PER_SECOND = 20;
const MAX_CATCH_UP_TICKS = 10;
const TICK_DURATION_MS = 1000 / TICKS_PER_SECOND;
const MAX_LOG_ENTRIES = 40;
const MAX_SANDBOX_CRYSTAL_GRANTS = 50;
const MAX_CRYSTALS = 5;
const ENERGY_GRANT_SOURCE_BASE = 1_000_000n;

/** Supported simulation playback speed multipliers. */
export type PlaytestSpeed = 0.5 | 1 | 2 | 4;

/** Status pill rendered on unit cards and canvas overlays. */
export interface PlaytestStatusBadge {
  readonly kind: 'slow' | 'stun' | 'freeze' | 'burn' | 'buff' | 'shield' | 'redirect' | 'vulnerable';
  readonly label: string;
}

/** Detached UI and scene view for a living Defender on the grid. */
export interface PlaytestDefenderView {
  readonly id: string;
  readonly definitionId: string;
  readonly name: string;
  readonly shortLabel: string;
  readonly tier: 1 | 2;
  readonly color: number;
  readonly accentColor: number;
  readonly row: number;
  readonly column: number;
  readonly hp: number;
  readonly maxHp: number;
  readonly shieldAmount: number;
  readonly shieldMaxAmount: number;
  readonly abilityId: string;
  readonly abilityName: string;
  readonly abilitySummary: string;
  readonly requiresTarget: boolean;
  readonly cooldownTicks: number;
  readonly isStunned: boolean;
  readonly isFrozen: boolean;
  readonly buffDamagePct: number;
  readonly buffAttackSpeedPct: number;
  readonly hasRedirectAura: boolean;
  readonly targetId: string | null;
  readonly attackCount: number;
  readonly attackAnchorTick: number | null;
  readonly badges: readonly PlaytestStatusBadge[];
}

/** Detached UI and scene view for a living Enemy on the battlefield. */
export interface PlaytestEnemyView {
  readonly id: string;
  readonly definitionId: string;
  readonly name: string;
  readonly shortLabel: string;
  readonly color: number;
  readonly lane: number;
  readonly x: number;
  readonly hp: number;
  readonly maxHp: number;
  readonly slowPct: number;
  readonly isStunned: boolean;
  readonly isFrozen: boolean;
  readonly isVulnerable: boolean;
  readonly burnCount: number;
  readonly targetId: string | null;
  readonly attackCount: number;
  readonly attackAnchorTick: number | null;
  readonly badges: readonly PlaytestStatusBadge[];
}

/** Detached view of an active ability projectile (lane arrow or falling meteor arrow). */
export type PlaytestProjectileView =
  | {
      readonly id: string;
      readonly kind: 'lane';
      readonly abilityId: string;
      readonly lane: number;
      readonly x: number;
      readonly pierce: boolean;
      readonly damageType: DamageType;
    }
  | {
      readonly id: string;
      readonly kind: 'falling';
      readonly abilityId: string;
      readonly sourceId: string;
      readonly impactCell: Cell;
      readonly remainingTravelTicks: number;
      readonly totalTravelTicks: number;
      readonly damageType: DamageType;
    };

/** Detached view of a collectible Energy or Power Crystal item on the battlefield. */
export interface PlaytestItemView {
  readonly id: string;
  readonly kind: 'energy' | 'crystal';
  readonly amount: number;
  readonly position:
    | { readonly kind: 'normalized'; readonly point: { readonly x: number; readonly y: number } }
    | { readonly kind: 'cell'; readonly cell: Cell }
    | { readonly kind: 'lane'; readonly lane: number; readonly position: number };
  readonly expiresAtTick: number;
}

/** Detached view of an active Glacial Fortress front-tile slow zone. */
export interface PlaytestSlowZoneView {
  readonly shieldId: string;
  readonly ownerId: string;
  readonly row: number;
  readonly column: number;
  readonly slowPct: number;
}

/** Detached view of an active Steel Guardian 3x3 damage redirect aura. */
export interface PlaytestRedirectAuraView {
  readonly redirectId: string;
  readonly ownerId: string;
  readonly ownerRow: number;
  readonly ownerColumn: number;
  readonly radius: number;
  readonly redirectSharePct: number;
  readonly remainingTicks: number;
  readonly protectedAllyIds: readonly string[];
}

/** Ephemeral visual flash emitted when abilities, fusions, or summons resolve. */
export interface PlaytestFlashEffect {
  readonly id: number;
  readonly kind: 'ability' | 'fusion' | 'summon';
  readonly abilityId?: string;
  readonly lane?: number;
  readonly cell?: Cell;
  readonly color: number;
  readonly label: string;
  readonly createdAtTick: number;
  readonly ttlMs: number;
}

/** Structured combat, ability, fusion, and wave outcome entry for the HUD log. */
export interface PlaytestLogEntry {
  readonly id: number;
  readonly tick: number;
  readonly category: 'ability' | 'fusion' | 'summon' | 'wave' | 'resource' | 'system' | 'error';
  readonly status: 'info' | 'applied' | 'rejected';
  readonly message: string;
}

/** Complete immutable snapshot consumed by PlaytestScene and React HUD. */
export interface PlaytestHudSnapshot {
  readonly tick: number;
  readonly elapsedSeconds: number;
  readonly mode: PlaytestMode;
  readonly paused: boolean;
  readonly speedMultiplier: PlaytestSpeed;
  readonly showAuxLanes: boolean;
  readonly allowMultiLaneWaves: boolean;
  readonly energy: number;
  readonly crystals: number;
  readonly maxCrystals: number;
  readonly pendingCrystals: number;
  readonly enemiesKilled: number;
  readonly waveStatus: WavePhaseStatus | 'sandbox';
  readonly currentWaveIndex: number | null;
  readonly totalWaves: number;
  readonly terminal: null | 'victory' | 'defeat';
  readonly selectedDefenderId: string | null;
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
  readonly lastToast: CampaignToast | null;
  readonly eventLog: readonly PlaytestLogEntry[];
}

/** Initialization options for PlaytestController. */
export interface PlaytestControllerOptions {
  readonly preset?: PlaytestPresetConfig;
  readonly mode?: PlaytestMode;
  readonly showAuxLanes?: boolean;
  readonly allowMultiLaneWaves?: boolean;
}

const DEFENDER_META_BY_ID = new Map<string, PlaytestDefenderMeta>(
  PLAYTEST_DEFENDER_META.map(meta => [meta.id, meta]),
);

const ENEMY_META_BY_ID = new Map<string, PlaytestEnemyMeta>(
  PLAYTEST_ENEMY_META.map(meta => [meta.id, meta]),
);

const RECIPE_BY_PAIR = new Map<string, (typeof PLAYTEST_FUSION_RECIPES_META)[number]>(
  PLAYTEST_FUSION_RECIPES_META.map(recipe => {
    const [a, b] = recipe.inputs;
    return [a <= b ? `${a}|${b}` : `${b}|${a}`, recipe];
  }),
);

const BASE_DEFENDER_META = PLAYTEST_DEFENDER_META.filter(meta => meta.tier === 1);

function normalizePairKey(a: string, b: string): string {
  return a <= b ? `${a}|${b}` : `${b}|${a}`;
}

function formatPlaytestRejection(
  category: 'summon' | 'fuse' | 'move' | 'remove' | 'ability' | 'collect' | 'claim',
  reason?: string,
): string {
  switch (reason) {
    case 'paused':
      return 'Game is Paused — unpause first';
    case 'terminal':
      return 'Battle has already ended';
    case 'insufficient-energy':
      return 'Insufficient Emeralds';
    case 'summon-on-cooldown':
      return 'Defender is recharging (on cooldown)';
    case 'glove-on-cooldown':
      return 'Fusion Glove is recharging (on cooldown)';
    case 'occupied':
    case 'occupied-cell':
    case 'grid-conflict':
      return 'Cell is already occupied';
    case 'same-cell':
      return 'Defender is already on that cell';
    case 'invalid-cell':
    case 'invalid-target-cell':
      return 'Invalid battlefield cell';
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

/**
 * Pure headless controller bridging BattleRuntime and Phaser/React playtest UIs.
 * Contains zero Phaser imports so it runs fast in Vitest and Node environments.
 */
export class PlaytestController {
  private preset: PlaytestPresetConfig;
  private mode: PlaytestMode;
  private allowMultiLaneWaves: boolean;
  private runtime: BattleRuntime;
  private paused = false;
  private speedMultiplier: PlaytestSpeed = 1;
  private showAuxLanes: boolean;
  private selectedDefenderId: string | null = null;
  private energyGrantCounter = 0;
  private crystalGrantCounter = 0;
  private claimCounter = 0;
  private nextLogId = 1;
  private nextFlashId = 1;
  private nextToastId = 1;
  private lastToast: CampaignToast | null = null;
  private pendingCollectItemTicks = new Map<string, number>();
  private pendingVillageChestClaimTick: number | null = null;
  private pendingResourceVisual:
    | { readonly kind: 'summon'; readonly label: string; readonly cell: Cell; readonly color: number }
    | { readonly kind: 'move'; readonly label: string; readonly cell: Cell; readonly color: number }
    | null = null;
  private lastResourceOutcomeEventId: string | null = null;
  private lastCombatOutcomeEventId: string | null = null;
  private lastFusionOutcomeEventId: string | null = null;
  private lastAbilityOutcomeEventId: string | null = null;
  private lastWaveKey: string | null = null;
  private lastTerminal: null | 'victory' | 'defeat' = null;
  private flashes: PlaytestFlashEffect[] = [];
  private eventLog: PlaytestLogEntry[] = [];
  private snapshotCache: PlaytestHudSnapshot;
  private readonly listeners = new Set<(snapshot: PlaytestHudSnapshot) => void>();

  constructor(options: PlaytestControllerOptions = {}) {
    this.preset = clonePlaytestPreset(options.preset ?? createDefaultPlaytestPreset());
    this.mode = options.mode ?? 'sandbox';
    this.showAuxLanes = options.showAuxLanes ?? false;
    this.allowMultiLaneWaves = options.allowMultiLaneWaves ?? false;
    this.runtime = this.createRuntime();
    this.pushLog('system', 'info', `Playtest initialized (${this.mode} mode)`);
    this.snapshotCache = this.buildSnapshot();
  }

  private createRuntime(): BattleRuntime {
    const inputs = buildRuntimeInputsFromPreset(this.preset, this.mode, this.allowMultiLaneWaves);
    return new BattleRuntime(
      { ticksPerSecond: TICKS_PER_SECOND, maxCatchUpTicks: MAX_CATCH_UP_TICKS },
      inputs.resourceInput,
      inputs.combatInput,
      inputs.fusionInput,
      inputs.waveInput,
      inputs.abilityInput,
    );
  }

  /** Return the latest detached HUD and battlefield snapshot. */
  getSnapshot(): PlaytestHudSnapshot {
    return this.snapshotCache;
  }

  /** Return a deep-cloned copy of the active playtest preset. */
  getPreset(): PlaytestPresetConfig {
    return clonePlaytestPreset(this.preset);
  }

  /** Subscribe to controller snapshot updates; returns an unsubscribe function. */
  subscribe(listener: (snapshot: PlaytestHudSnapshot) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Toggle simulation pause state, synchronizing directly with BattleRuntime. */
  setPaused(paused: boolean): void {
    if (this.snapshotCache.terminal !== null) {
      this.paused = true;
      this.runtime.setPaused(true);
      return;
    }
    if (this.paused === paused) return;
    this.paused = paused;
    this.runtime.setPaused(paused);
    this.pushLog('system', 'info', paused ? 'Simulation paused' : 'Simulation resumed');
    this.refreshAndEmit();
  }

  /** Change playback speed multiplier (0.5x, 1x, 2x, 4x). */
  setSpeed(speed: PlaytestSpeed): void {
    if (this.speedMultiplier === speed) return;
    this.speedMultiplier = speed;
    this.pushLog('system', 'info', `Speed set to ${speed}x`);
    this.refreshAndEmit();
  }

  /** Toggle visibility of auxiliary rows 1..4 for cross-lane ability testing. */
  setShowAuxLanes(show: boolean): void {
    if (this.showAuxLanes === show) return;
    this.showAuxLanes = show;
    this.refreshAndEmit();
  }

  /** Select or clear the active Defender inspected in the sidebar. */
  selectDefender(defenderId: string | null): void {
    if (defenderId !== null && !this.snapshotCache.defenders.some(d => d.id === defenderId)) {
      return;
    }
    if (this.selectedDefenderId === defenderId) return;
    this.selectedDefenderId = defenderId;
    this.refreshAndEmit();
  }

  /** Check whether two currently living Defenders form an enabled MVP Fusion recipe. */
  canFuse(sourceId: string, targetId: string): boolean {
    return this.getFusionOutputId(sourceId, targetId) !== null;
  }

  /** Return the resulting Fusion Defender definitionId for two placed Defenders, or null if incompatible. */
  getFusionOutputId(sourceId: string, targetId: string): string | null {
    if (sourceId === targetId) return null;
    const source = this.snapshotCache.defenders.find(d => d.id === sourceId);
    const target = this.snapshotCache.defenders.find(d => d.id === targetId);
    if (!source || !target || source.hp <= 0 || target.hp <= 0) return null;
    const recipe = RECIPE_BY_PAIR.get(normalizePairKey(source.definitionId, target.definitionId));
    return recipe ? recipe.output : null;
  }

  /** Return the resulting Fusion Defender definitionId when fusing a Base shop card onto a placed Defender, or null. */
  getCardFusionOutputId(cardDefinitionId: string, targetDefenderId: string): string | null {
    const target = this.snapshotCache.defenders.find(d => d.id === targetDefenderId);
    if (!target || target.hp <= 0 || target.tier !== 1) return null;
    const recipe = RECIPE_BY_PAIR.get(normalizePairKey(cardDefinitionId, target.definitionId));
    return recipe ? recipe.output : null;
  }

  /**
   * Advance simulation time by realDeltaMs * speedMultiplier.
   * Returns the number of simulation ticks executed.
   */
  stepMs(realDeltaMs: number): number {
    if (!Number.isFinite(realDeltaMs) || realDeltaMs < 0) {
      throw new RangeError('Expected nonnegative finite delta ms');
    }
    if (this.paused || this.snapshotCache.terminal !== null || realDeltaMs === 0) {
      return 0;
    }

    const flashesChanged = this.ageFlashes(realDeltaMs);
    const ticksExecuted = this.runtime.advance(realDeltaMs * this.speedMultiplier);
    if (ticksExecuted > 0 || flashesChanged) {
      this.syncOutcomes();
      this.refreshAndEmit();
    }
    return ticksExecuted;
  }

  /** Step exactly one simulation tick (50ms) even while paused, for frame-by-frame inspection. */
  stepOneTick(): number {
    if (this.snapshotCache.terminal !== null) return 0;

    this.ageFlashes(TICK_DURATION_MS);
    this.runtime.setPaused(false);
    const executed = this.runtime.advance(TICK_DURATION_MS);
    const raw = this.runtime.snapshot();
    const isTerminal = Boolean(raw.combat?.terminal || raw.resources?.terminal || raw.waves?.terminal);
    if (isTerminal) {
      this.paused = true;
    }
    this.runtime.setPaused(this.paused);
    this.syncOutcomes();
    this.refreshAndEmit();
    return executed;
  }

  /**
   * Place a Defender onto an empty cell.
   * When freeSandbox is true, uses internal `add` at 0 Energy for any Tier 1 or Tier 2 Defender.
   * When freeSandbox is false, uses standard `summon` (Tier-1 Base Defenders only).
   */
  placeDefender(definitionId: string, cell: Cell, freeSandbox: boolean): boolean {
    if (this.snapshotCache.terminal !== null) {
      this.pushLog('summon', 'rejected', 'Cannot place Defender after battle ended');
      this.pushToast('error', 'Battle has already ended');
      this.refreshAndEmit();
      return false;
    }
    if (!isValidCell(cell)) {
      this.pushLog('summon', 'rejected', 'Invalid battlefield cell');
      this.pushToast('error', 'Invalid battlefield cell');
      this.refreshAndEmit();
      return false;
    }
    const def = this.preset.defenders.find(d => d.id === definitionId);
    if (!def) {
      this.pushLog('summon', 'rejected', `Unknown Defender: ${definitionId}`);
      this.pushToast('error', `Unknown Defender: ${definitionId}`);
      this.refreshAndEmit();
      return false;
    }
    const raw = this.runtime.snapshot();
    const hasPendingAddAtCell = raw.queue.events.some(
      event =>
        event.payload.type === 'add' &&
        event.payload.entity.kind === 'defender' &&
        event.payload.entity.cell.row === cell.row &&
        event.payload.entity.cell.column === cell.column,
    );
    if (raw.occupancy[cellIndex(cell)] !== null || hasPendingAddAtCell) {
      this.pushLog('summon', 'rejected', `Cell (${cell.row}, ${cell.column}) is already occupied`);
      this.pushToast('error', 'Cell is already occupied');
      this.refreshAndEmit();
      return false;
    }

    const meta = DEFENDER_META_BY_ID.get(definitionId);
    const label = meta?.name ?? definitionId;
    const targetTick = raw.tick + 1;

    if (freeSandbox) {
      const res = this.runtime.enqueue(
        { type: 'add', entity: { kind: 'defender', definitionId, cell } },
        targetTick,
      );
      if (res.status === 'REJECTED' || res.status === 'FAILED') {
        const msg = formatPlaytestRejection('summon', 'reason' in res ? res.reason : undefined);
        this.pushLog('summon', 'rejected', msg);
        this.pushToast('error', msg);
        this.refreshAndEmit();
        return false;
      }
      this.pendingResourceVisual = {
        kind: 'summon',
        label: label.toUpperCase(),
        cell: { row: cell.row, column: cell.column },
        color: meta?.accentColor ?? 0x4ade80,
      };
      this.pushLog('summon', 'info', `Placed ${label} (Sandbox) at (${cell.row}, ${cell.column})`);
      this.refreshAndEmit();
      return true;
    }

    if (def.tier !== 1) {
      this.pushLog(
        'summon',
        'rejected',
        `Standard Summon only supports Tier-1 Base Defenders (${label} is Tier 2)`,
      );
      this.pushToast('error', `Standard Summon only supports Tier-1 Base Defenders`);
      this.refreshAndEmit();
      return false;
    }

    if (
      this.preset.allowedBaseDefenderIds &&
      this.preset.allowedBaseDefenderIds.length > 0 &&
      !this.preset.allowedBaseDefenderIds.includes(definitionId)
    ) {
      const msg = `${label} is restricted in this stage`;
      this.pushLog('summon', 'rejected', msg);
      this.pushToast('error', msg);
      this.refreshAndEmit();
      return false;
    }

    const res = this.runtime.enqueue({ type: 'summon', definitionId, cell }, targetTick);
    if (res.status === 'REJECTED' || res.status === 'FAILED') {
      const msg = formatPlaytestRejection('summon', 'reason' in res ? res.reason : undefined);
      this.pushLog('summon', 'rejected', msg);
      this.pushToast('error', msg);
      this.refreshAndEmit();
      return false;
    }
    this.pendingResourceVisual = {
      kind: 'summon',
      label: label.toUpperCase(),
      cell: { row: cell.row, column: cell.column },
      color: meta?.accentColor ?? 0x4ade80,
    };
    this.pushLog(
      'summon',
      'info',
      `Queued Summon ${label} (${def.summonEnergyCost} EM) at (${cell.row}, ${cell.column})`,
    );
    this.refreshAndEmit();
    return true;
  }

  /** Enqueue a T-08 Fusion command combining Source onto Target (Fusion Glove). */
  fuseDefenders(sourceId: string, targetId: string): boolean {
    const src = parseEntityId(sourceId);
    const tgt = parseEntityId(targetId);
    if (src === null || tgt === null) {
      this.pushLog('fusion', 'rejected', 'Invalid Fusion entity ID');
      this.pushToast('error', 'Invalid Fusion target');
      this.refreshAndEmit();
      return false;
    }

    const raw = this.runtime.snapshot();
    const res = this.runtime.enqueue({ type: 'fuse', sourceId: src, targetId: tgt }, raw.tick + 1);
    if (res.status === 'REJECTED') {
      const msg = formatPlaytestRejection('fuse', res.reason);
      this.pushLog('fusion', 'rejected', msg);
      this.pushToast('error', msg);
      this.refreshAndEmit();
      return false;
    }
    if (res.status === 'FAILED') {
      this.pushLog('fusion', 'rejected', 'Fusion enqueue failed');
      this.pushToast('error', 'Fusion failed');
      this.refreshAndEmit();
      return false;
    }
    return true;
  }

  /** Enqueue a Direct Shop-Card Fusion (`summon-fuse`) combining a Base Defender card onto a placed Target. */
  summonAndFuseDefender(definitionId: string, targetId: string): boolean {
    if (this.snapshotCache.terminal !== null) {
      this.pushLog('fusion', 'rejected', 'Battle has already ended');
      this.pushToast('error', 'Battle has already ended');
      this.refreshAndEmit();
      return false;
    }
    const tgt = parseEntityId(targetId);
    if (tgt === null) {
      this.pushLog('fusion', 'rejected', 'Invalid Fusion target ID');
      this.pushToast('error', 'Invalid Fusion target');
      this.refreshAndEmit();
      return false;
    }

    const raw = this.runtime.snapshot();
    const res = this.runtime.enqueue(
      { type: 'summon-fuse', definitionId, targetId: tgt },
      raw.tick + 1,
    );
    if (res.status === 'REJECTED') {
      const msg = formatPlaytestRejection('fuse', res.reason);
      this.pushLog('fusion', 'rejected', msg);
      this.pushToast('error', msg);
      this.refreshAndEmit();
      return false;
    }
    if (res.status === 'FAILED') {
      this.pushLog('fusion', 'rejected', 'Shop-card Fusion enqueue failed');
      this.pushToast('error', 'Shop-card Fusion failed');
      this.refreshAndEmit();
      return false;
    }
    return true;
  }

  /** Enqueue a Fusion Glove `move-defender` command relocating a placed Defender to an empty cell (0 EN, Glove CD). */
  moveDefender(defenderId: string, targetCell: Cell): boolean {
    if (this.snapshotCache.terminal !== null) {
      this.pushLog('summon', 'rejected', 'Battle has already ended');
      this.pushToast('error', 'Battle has already ended');
      this.refreshAndEmit();
      return false;
    }
    if (!isValidCell(targetCell)) {
      this.pushLog('summon', 'rejected', 'Invalid battlefield cell');
      this.pushToast('error', 'Invalid battlefield cell');
      this.refreshAndEmit();
      return false;
    }
    const id = parseEntityId(defenderId);
    if (id === null) {
      this.pushLog('summon', 'rejected', 'Invalid Defender ID');
      this.pushToast('error', 'Invalid Defender ID');
      this.refreshAndEmit();
      return false;
    }

    const existing = this.snapshotCache.defenders.find(d => d.id === defenderId);
    const meta = existing ? DEFENDER_META_BY_ID.get(existing.definitionId) : undefined;
    const raw = this.runtime.snapshot();
    const res = this.runtime.enqueue(
      { type: 'move-defender', defenderId: id, targetCell },
      raw.tick + 1,
    );
    if (res.status === 'REJECTED') {
      const msg = formatPlaytestRejection('move', res.reason);
      this.pushLog('summon', 'rejected', msg);
      this.pushToast('error', msg);
      this.refreshAndEmit();
      return false;
    }
    if (res.status === 'FAILED') {
      this.pushLog('summon', 'rejected', 'Move Defender enqueue failed');
      this.pushToast('error', 'Move Defender failed');
      this.refreshAndEmit();
      return false;
    }
    this.pendingResourceVisual = {
      kind: 'move',
      label: meta?.name ?? 'Defender',
      cell: { row: targetCell.row, column: targetCell.column },
      color: meta?.accentColor ?? 0x38bdf8,
    };
    this.pushLog(
      'summon',
      'info',
      `Queued Move ${meta?.name ?? 'Defender'} to (${targetCell.row}, ${targetCell.column})`,
    );
    this.refreshAndEmit();
    return true;
  }

  /** Enqueue a T-10 Special Ability activation for the specified Defender. */
  activateAbility(defenderId: string, targetCell?: Cell): boolean {
    const id = parseEntityId(defenderId);
    if (id === null) {
      this.pushLog('ability', 'rejected', 'Invalid Defender ID for Ability');
      this.refreshAndEmit();
      return false;
    }

    const raw = this.runtime.snapshot();
    const res = this.runtime.enqueue(
      {
        type: 'activate-ability',
        defenderId: id,
        ...(targetCell ? { targetCell } : {}),
      },
      raw.tick + 1,
    );
    if (res.status === 'REJECTED') {
      const message =
        res.reason === 'paused'
          ? 'Cannot cast Ability while Paused — unpause first!'
          : `Cannot cast Ability: ${res.reason}`;
      this.pushLog('ability', 'rejected', message);
      this.pushToast('error', formatPlaytestRejection('ability', res.reason));
      this.refreshAndEmit();
      return false;
    }
    if (res.status === 'FAILED') {
      this.pushLog('ability', 'rejected', 'Ability enqueue failed');
      this.pushToast('error', 'Ability failed');
      this.refreshAndEmit();
      return false;
    }
    return true;
  }

  /** Remove a living Defender from the battlefield (Shovel: 0% refund). */
  removeDefender(defenderId: string): boolean {
    const id = parseEntityId(defenderId);
    if (id === null) return false;
    const raw = this.runtime.snapshot();
    const entity = raw.entities.get(id);
    if (!entity || entity.kind !== 'defender') return false;
    const alreadyQueuedRemove = raw.queue.events.some(
      event => event.payload.type === 'remove' && event.payload.id === id,
    );
    if (alreadyQueuedRemove) return false;

    const res = this.runtime.enqueue({ type: 'remove', id }, raw.tick + 1);
    if (res.status === 'REJECTED' || res.status === 'FAILED') {
      if (res.status === 'REJECTED') {
        const msg = formatPlaytestRejection('remove', res.reason);
        this.pushLog('summon', 'rejected', msg);
        this.pushToast('error', msg);
        this.refreshAndEmit();
      }
      return false;
    }

    if (this.selectedDefenderId === defenderId) {
      this.selectedDefenderId = null;
    }
    const meta = DEFENDER_META_BY_ID.get(entity.definitionId);
    const label = meta?.name ?? entity.definitionId;
    this.pushLog('summon', 'info', `Removed ${label} with Shovel`);
    this.pushToast('info', `Removed ${label} with Shovel`);
    this.refreshAndEmit();
    return true;
  }

  /** Spawn a single Enemy on the specified lane (default Lane 0). */
  spawnEnemy(definitionId: string, lane = 0): boolean {
    if (!isLane(lane) || !this.preset.enemies.some(e => e.id === definitionId)) {
      this.pushLog('wave', 'rejected', `Invalid enemy spawn: ${definitionId} on lane ${lane}`);
      this.refreshAndEmit();
      return false;
    }
    const raw = this.runtime.snapshot();
    const res = this.runtime.enqueue({ type: 'spawn-enemy', definitionId, lane }, raw.tick + 1);
    if (res.status === 'REJECTED' || res.status === 'FAILED') {
      this.pushLog('wave', 'rejected', 'Cannot spawn Enemy after battle ended');
      this.refreshAndEmit();
      return false;
    }
    const meta = ENEMY_META_BY_ID.get(definitionId);
    this.pushLog('wave', 'info', `Spawned ${meta?.name ?? definitionId} on Lane ${lane + 1}`);
    this.refreshAndEmit();
    return true;
  }

  /** Schedule a custom wave burst of Enemies along a lane at a fixed interval. */
  spawnWaveBurst(definitionId: string, count: number, intervalSeconds: number, lane = 0): boolean {
    if (
      !isLane(lane) ||
      !this.preset.enemies.some(e => e.id === definitionId) ||
      !Number.isSafeInteger(count) ||
      count < 1 ||
      count > 50 ||
      !Number.isFinite(intervalSeconds) ||
      intervalSeconds < 0
    ) {
      this.pushLog('wave', 'rejected', 'Invalid wave burst parameters');
      this.refreshAndEmit();
      return false;
    }
    const raw = this.runtime.snapshot();
    const baseTick = raw.tick + 1;
    for (let i = 0; i < count; i++) {
      const scheduledTick = baseTick + Math.round(i * intervalSeconds * TICKS_PER_SECOND);
      const res = this.runtime.enqueue({ type: 'spawn-enemy', definitionId, lane }, scheduledTick);
      if (res.status === 'REJECTED' || res.status === 'FAILED') {
        this.pushLog('wave', 'rejected', 'Failed to schedule wave burst');
        this.refreshAndEmit();
        return false;
      }
    }
    const meta = ENEMY_META_BY_ID.get(definitionId);
    this.pushLog(
      'wave',
      'info',
      `Scheduled burst: ${count}x ${meta?.name ?? definitionId} every ${intervalSeconds}s (Lane ${lane + 1})`,
    );
    this.refreshAndEmit();
    return true;
  }

  /** Collect an Energy or Power Crystal item by ID. */
  collectItem(itemId: string): boolean {
    const id = parseEntityId(itemId);
    if (id === null) return false;
    const raw = this.runtime.snapshot();
    const pendingTick = this.pendingCollectItemTicks.get(itemId);
    if (pendingTick !== undefined && raw.tick < pendingTick) {
      return false;
    }
    if (!raw.resources?.items.has(id)) {
      return false;
    }
    const targetTick = raw.tick + 1;
    const res = this.runtime.enqueue({ type: 'collect', id }, targetTick);
    if (res.status === 'REJECTED') {
      const msg =
        res.reason === 'paused'
          ? 'Cannot collect items while Paused — unpause first!'
          : `Cannot collect item: ${res.reason}`;
      this.pushLog('resource', 'rejected', msg);
      this.pushToast('error', formatPlaytestRejection('collect', res.reason));
      this.refreshAndEmit();
      return false;
    }
    if (res.status === 'APPLIED') {
      this.pendingCollectItemTicks.set(itemId, targetTick);
      return true;
    }
    return false;
  }

  /** Claim any overflow Pending Power Crystals into active storage. */
  claimPendingCrystals(): boolean {
    const raw = this.runtime.snapshot();
    const res = this.runtime.enqueue(
      { type: 'claim', requestId: `playtest_claim_${++this.claimCounter}` },
      raw.tick + 1,
    );
    if (res.status === 'REJECTED') {
      const msg =
        res.reason === 'paused'
          ? 'Cannot claim crystals while Paused — unpause first!'
          : `Cannot claim crystals: ${res.reason}`;
      this.pushLog('resource', 'rejected', msg);
      this.pushToast('error', formatPlaytestRejection('claim', res.reason));
      this.refreshAndEmit();
      return false;
    }
    return res.status === 'APPLIED';
  }

  /** Open the Village Supply Chest at the Base margin to collect bonus Emeralds. */
  claimVillageChest(): boolean {
    if (!this.snapshotCache.villageChest.enabled) {
      const msg = formatPlaytestRejection('claim', 'chest-disabled');
      this.pushLog('resource', 'rejected', msg);
      this.pushToast('error', msg);
      this.refreshAndEmit();
      return false;
    }
    if (!this.snapshotCache.villageChest.ready) {
      const msg = formatPlaytestRejection('claim', 'chest-not-ready');
      this.pushLog('resource', 'rejected', msg);
      this.pushToast('error', msg);
      this.refreshAndEmit();
      return false;
    }
    const raw = this.runtime.snapshot();
    if (this.pendingVillageChestClaimTick !== null && raw.tick < this.pendingVillageChestClaimTick) {
      return false;
    }
    const targetTick = raw.tick + 1;
    const res = this.runtime.enqueue({ type: 'claim-village-chest' }, targetTick);
    if (res.status === 'REJECTED') {
      const msg = formatPlaytestRejection('claim', res.reason);
      this.pushLog('resource', 'rejected', msg);
      this.pushToast('error', msg);
      this.refreshAndEmit();
      return false;
    }
    if (res.status === 'APPLIED') {
      this.pendingVillageChestClaimTick = targetTick;
      const chestAmount = this.preset.villageChest?.amount ?? 25;
      this.pushLog('resource', 'applied', `Claimed +${chestAmount} EM from Village Supply Chest`);
      this.pushToast('success', `+${chestAmount} EM from Village Supply Chest!`);
      return true;
    }
    return false;
  }

  /** Grant +500 Energy using the pre-registered sandbox_energy_grant reward hook. */
  grantEnergy(): boolean {
    const raw = this.runtime.snapshot();
    const res = this.runtime.enqueue(
      {
        type: 'enemy-reward',
        sourceId: ENERGY_GRANT_SOURCE_BASE + BigInt(this.energyGrantCounter++),
        definitionId: 'sandbox_energy_grant',
        lane: 0,
        position: 8,
      },
      raw.tick + 1,
    );
    if (res.status === 'REJECTED' || res.status === 'FAILED') {
      this.pushLog('resource', 'rejected', 'Cannot grant Emeralds after battle ended');
      this.refreshAndEmit();
      return false;
    }
    this.pushLog('resource', 'info', 'Queued +500 EM sandbox grant');
    this.refreshAndEmit();
    return true;
  }

  /** Grant +5 Power Crystals using pre-registered sandbox_crystals_1..50 wave rewards. */
  grantCrystals(): boolean {
    if (this.crystalGrantCounter >= MAX_SANDBOX_CRYSTAL_GRANTS) {
      this.pushLog(
        'resource',
        'rejected',
        `Sandbox crystal grant limit (${MAX_SANDBOX_CRYSTAL_GRANTS}) reached — Reset to refill`,
      );
      this.refreshAndEmit();
      return false;
    }
    const grantId = `sandbox_crystals_${++this.crystalGrantCounter}`;
    const raw = this.runtime.snapshot();
    const res = this.runtime.enqueue({ type: 'wave-reward', sourceId: grantId }, raw.tick + 1);
    if (res.status === 'REJECTED' || res.status === 'FAILED') {
      this.pushLog('resource', 'rejected', 'Cannot grant Crystals after battle ended');
      this.refreshAndEmit();
      return false;
    }
    this.pushLog('resource', 'info', 'Queued +5 Power Crystals sandbox grant');
    this.refreshAndEmit();
    return true;
  }

  /** Reset the battlefield with an optional updated preset, mode, or multi-lane wave setting. */
  reset(
    nextPreset?: PlaytestPresetConfig,
    nextMode?: PlaytestMode,
    allowMultiLaneWaves?: boolean,
  ): void {
    if (nextPreset) this.preset = clonePlaytestPreset(nextPreset);
    if (nextMode) this.mode = nextMode;
    if (allowMultiLaneWaves !== undefined) this.allowMultiLaneWaves = allowMultiLaneWaves;

    this.paused = false;
    this.selectedDefenderId = null;
    this.energyGrantCounter = 0;
    this.crystalGrantCounter = 0;
    this.claimCounter = 0;
    this.pendingCollectItemTicks.clear();
    this.pendingVillageChestClaimTick = null;
    this.pendingResourceVisual = null;
    this.lastToast = null;
    this.lastResourceOutcomeEventId = null;
    this.lastCombatOutcomeEventId = null;
    this.lastFusionOutcomeEventId = null;
    this.lastAbilityOutcomeEventId = null;
    this.lastWaveKey = null;
    this.lastTerminal = null;
    this.flashes = [];
    this.eventLog = [];

    this.runtime = this.createRuntime();
    this.pushLog('system', 'info', `Battlefield reset (${this.mode} mode)`);
    this.refreshAndEmit();
  }

  private ageFlashes(elapsedMs: number): boolean {
    if (this.flashes.length === 0) return false;
    const next: PlaytestFlashEffect[] = [];
    let changed = false;
    for (const flash of this.flashes) {
      const remaining = flash.ttlMs - elapsedMs;
      if (remaining > 0) {
        next.push({ ...flash, ttlMs: remaining });
      } else {
        changed = true;
      }
    }
    this.flashes = next;
    return changed;
  }

  private syncOutcomes(): void {
    const raw = this.runtime.snapshot();
    let fusionOutputId: string | null = null;

    for (const [itemId, targetTick] of this.pendingCollectItemTicks) {
      if (raw.tick >= targetTick) {
        this.pendingCollectItemTicks.delete(itemId);
      }
    }
    if (this.pendingVillageChestClaimTick !== null && raw.tick >= this.pendingVillageChestClaimTick) {
      this.pendingVillageChestClaimTick = null;
    }

    if (raw.resources?.outcome && raw.resources.outcome.eventId !== this.lastResourceOutcomeEventId) {
      this.lastResourceOutcomeEventId = raw.resources.outcome.eventId;
      if (raw.resources.outcome.status === 'REJECTED') {
        const msg = formatPlaytestRejection('summon', raw.resources.outcome.reason);
        this.pushLog(
          'resource',
          'rejected',
          `Resource action rejected: ${raw.resources.outcome.reason ?? 'unknown'}`,
        );
        this.pushToast('error', msg);
        this.pendingResourceVisual = null;
      } else if (this.pendingResourceVisual) {
        const vis = this.pendingResourceVisual;
        this.pendingResourceVisual = null;
        if (vis.kind === 'move') {
          this.pushToast('info', `Moved ${vis.label}!`);
          this.flashes.push({
            id: this.nextFlashId++,
            kind: 'summon',
            lane: vis.cell.row,
            cell: vis.cell,
            color: vis.color,
            label: 'MOVED',
            createdAtTick: raw.tick,
            ttlMs: 420,
          });
        } else {
          this.flashes.push({
            id: this.nextFlashId++,
            kind: 'summon',
            lane: vis.cell.row,
            cell: vis.cell,
            color: vis.color,
            label: vis.label,
            createdAtTick: raw.tick,
            ttlMs: 450,
          });
        }
      }
    } else if (this.pendingResourceVisual && this.pendingResourceVisual.kind === 'summon') {
      // Free sandbox placement uses internal `add` without updating resources.outcome.
      const vis = this.pendingResourceVisual;
      this.pendingResourceVisual = null;
      this.flashes.push({
        id: this.nextFlashId++,
        kind: 'summon',
        lane: vis.cell.row,
        cell: vis.cell,
        color: vis.color,
        label: vis.label,
        createdAtTick: raw.tick,
        ttlMs: 450,
      });
    }

    if (raw.combat?.outcome && raw.combat.outcome.eventId !== this.lastCombatOutcomeEventId) {
      this.lastCombatOutcomeEventId = raw.combat.outcome.eventId;
      if (raw.combat.outcome.status === 'REJECTED') {
        this.pushLog(
          'wave',
          'rejected',
          `Combat spawn rejected: ${raw.combat.outcome.reason ?? 'unknown'}`,
        );
      }
    }

    if (raw.fusion?.outcome && raw.fusion.outcome.eventId !== this.lastFusionOutcomeEventId) {
      this.lastFusionOutcomeEventId = raw.fusion.outcome.eventId;
      const outcome = raw.fusion.outcome;
      if (outcome.status === 'APPLIED') {
        fusionOutputId = String(outcome.outputEntityId);
        const outEntity = raw.entities.get(outcome.outputEntityId);
        const outMeta = outEntity ? DEFENDER_META_BY_ID.get(outEntity.definitionId) : undefined;
        this.pushLog(
          'fusion',
          'applied',
          `Fusion completed: ${outcome.recipeId} at (${outcome.targetCell.row}, ${outcome.targetCell.column})`,
        );
        this.pushToast('success', `Fused into ${outMeta?.name ?? outEntity?.definitionId ?? 'Defender'}!`);
        this.flashes.push({
          id: this.nextFlashId++,
          kind: 'fusion',
          cell: outcome.targetCell,
          color: outMeta?.accentColor ?? 0xfbbf24,
          label: outMeta?.name ?? 'FUSION!',
          createdAtTick: raw.tick,
          ttlMs: 800,
        });
      } else {
        this.pushLog('fusion', 'rejected', `Fusion rejected: ${outcome.reason}`);
        this.pushToast('error', formatPlaytestRejection('fuse', outcome.reason));
      }
    }

    if (raw.abilities?.outcome && raw.abilities.outcome.eventId !== this.lastAbilityOutcomeEventId) {
      this.lastAbilityOutcomeEventId = raw.abilities.outcome.eventId;
      const outcome = raw.abilities.outcome;
      if (outcome.status === 'APPLIED') {
        this.handleAppliedAbilityOutcome(raw, outcome);
      } else {
        this.pushLog(
          'ability',
          'rejected',
          `Ability rejected (${outcome.abilityId ?? 'unknown'}): ${outcome.reason ?? 'unknown'}`,
        );
        this.pushToast('error', formatPlaytestRejection('ability', outcome.reason));
      }
    }

    if (raw.waves) {
      const waveKey = `${raw.waves.currentWaveIndex ?? 'none'}:${raw.waves.status}`;
      if (waveKey !== this.lastWaveKey) {
        this.lastWaveKey = waveKey;
        const waveNum =
          raw.waves.currentWaveIndex !== null ? raw.waves.currentWaveIndex + 1 : null;
        if (raw.waves.status === 'spawning' && waveNum !== null) {
          this.pushLog('wave', 'info', `Wave ${waveNum}/${this.preset.waves.length} started`);
        } else if (raw.waves.status === 'between-waves' && waveNum !== null) {
          this.pushLog('wave', 'applied', `Wave ${waveNum} cleared!`);
        } else if (raw.waves.status === 'completed') {
          this.pushLog('wave', 'applied', 'All waves cleared!');
        }
      }
    }

    const terminal = raw.combat?.terminal ?? raw.resources?.terminal ?? raw.waves?.terminal ?? null;
    if (terminal !== this.lastTerminal) {
      this.lastTerminal = terminal;
      if (terminal === 'victory') {
        this.paused = true;
        this.pushLog('wave', 'applied', 'VICTORY — Grassland waves defeated!');
      } else if (terminal === 'defeat') {
        this.paused = true;
        this.pushLog('wave', 'rejected', 'DEFEAT — Enemy breached the base!');
      }
    }

    if (this.selectedDefenderId !== null) {
      const stillAlive = raw.entities.has(BigInt(this.selectedDefenderId));
      if (!stillAlive) {
        this.selectedDefenderId =
          fusionOutputId && raw.entities.has(BigInt(fusionOutputId)) ? fusionOutputId : null;
      }
    }
  }

  private handleAppliedAbilityOutcome(
    raw: ReturnType<BattleRuntime['snapshot']>,
    outcome: AbilityOutcome,
  ): void {
    const abilityId = outcome.abilityId ?? 'unknown';
    const caster = outcome.defenderId !== undefined ? raw.entities.get(outcome.defenderId) : undefined;
    const casterMeta =
      caster && caster.kind === 'defender' ? DEFENDER_META_BY_ID.get(caster.definitionId) : undefined;
    const abilityName = casterMeta?.abilityName ?? abilityId;

    this.pushLog('ability', 'applied', `Ability applied: ${abilityName} (${abilityId})`);
    this.pushToast('info', `${casterMeta?.name ?? 'Defender'} activated ${abilityName}!`);
    this.flashes.push({
      id: this.nextFlashId++,
      kind: 'ability',
      abilityId,
      ...(caster && caster.kind === 'defender'
        ? { lane: caster.cell.row, cell: caster.cell }
        : {}),
      color: casterMeta?.accentColor ?? 0x38bdf8,
      label: abilityName,
      createdAtTick: raw.tick,
      ttlMs: 650,
    });
  }

  private pushToast(kind: CampaignToast['kind'], message: string): void {
    this.lastToast = {
      id: this.nextToastId++,
      kind,
      message,
    };
  }

  private pushLog(
    category: PlaytestLogEntry['category'],
    status: PlaytestLogEntry['status'],
    message: string,
  ): void {
    const tick = this.runtime ? this.runtime.snapshot().tick : 0;
    this.eventLog.push({
      id: this.nextLogId++,
      tick,
      category,
      status,
      message,
    });
    if (this.eventLog.length > MAX_LOG_ENTRIES) {
      this.eventLog.splice(0, this.eventLog.length - MAX_LOG_ENTRIES);
    }
  }

  private refreshAndEmit(): void {
    this.snapshotCache = this.buildSnapshot();
    for (const listener of this.listeners) {
      listener(this.snapshotCache);
    }
  }

  private buildSnapshot(): PlaytestHudSnapshot {
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
          for (const shield of abilities.shields) {
            if (shield.ownerId === entity.id && shield.amount > 0) {
              shieldAmount += shield.amount;
              shieldMaxAmount += shield.maxAmount;
            }
          }
        }

        let isStunned = false;
        let isFrozen = false;
        let buffDamagePct = 0;
        let buffAttackSpeedPct = 0;
        if (abilities) {
          for (const status of abilities.statuses) {
            if (status.targetEntityId !== entity.id || status.remainingTicks <= 0) continue;
            if (status.kind === 'stun') isStunned = true;
            else if (status.kind === 'freeze') isFrozen = true;
            else if (status.kind === 'buff') {
              buffDamagePct += status.attackDamageBonusPct ?? 0;
              buffAttackSpeedPct += status.attackSpeedBonusPct ?? 0;
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
        if (buffDamagePct > 0 || buffAttackSpeedPct > 0) {
          badges.push({ kind: 'buff', label: 'BUFF' });
        }

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
          for (const status of abilities.statuses) {
            if (status.targetEntityId !== entity.id || status.remainingTicks <= 0) continue;
            if (status.kind === 'slow') {
              slowPct = Math.max(slowPct, status.slowPct ?? 0);
            } else if (status.kind === 'stun') {
              isStunned = true;
            } else if (status.kind === 'freeze') {
              isFrozen = true;
            } else if (status.kind === 'vulnerable') {
              isVulnerable = true;
            } else if (status.kind === 'burn') {
              burnCount += 1;
            }
          }
        }

        const badges: PlaytestStatusBadge[] = [];
        if (isFrozen) badges.push({ kind: 'freeze', label: 'FREEZE' });
        if (isStunned) badges.push({ kind: 'stun', label: 'STUN' });
        if (isVulnerable) badges.push({ kind: 'vulnerable', label: 'MARKED +40%' });
        if (slowPct > 0) badges.push({ kind: 'slow', label: `SLOW -${Math.round(slowPct * 100)}%` });
        if (burnCount > 0) {
          badges.push({ kind: 'burn', label: burnCount > 1 ? `BURN x${burnCount}` : 'BURN' });
        }

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
      const abilityDef = this.preset.abilities.find(a => a.id === proj.abilityId);
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
        impactCell: proj.impactCell,
        remainingTravelTicks: proj.remainingTravelTicks,
        totalTravelTicks,
        damageType: proj.damageType,
      };
    });

    const items: PlaytestItemView[] = resources
      ? Array.from(resources.items.values()).map(item => ({
          id: String(item.id),
          kind: item.kind,
          amount: item.amount,
          position: item.position,
          expiresAtTick: item.expiresAt,
        }))
      : [];

    const slowZones: PlaytestSlowZoneView[] = [];
    if (abilities) {
      for (const shield of abilities.shields) {
        if (shield.amount > 0 && shield.frontSlowZone) {
          slowZones.push({
            shieldId: String(shield.shieldId),
            ownerId: String(shield.ownerId),
            row: shield.frontSlowZone.row,
            column: shield.frontSlowZone.column,
            slowPct: shield.frontSlowZone.slowPct,
          });
        }
      }
    }

    const redirectAuras: PlaytestRedirectAuraView[] = [];
    if (abilities) {
      for (const aura of abilities.redirects) {
        if (aura.remainingTicks <= 0) continue;
        const owner = defenders.find(d => d.id === String(aura.ownerId));
        if (!owner) continue;
        const protectedAllyIds = defenders
          .filter(
            ally =>
              ally.id !== owner.id &&
              ally.hp > 0 &&
              Math.abs(ally.row - owner.row) <= aura.radius &&
              Math.abs(ally.column - owner.column) <= aura.radius,
          )
          .map(ally => ally.id);

        redirectAuras.push({
          redirectId: String(aura.redirectId),
          ownerId: owner.id,
          ownerRow: owner.row,
          ownerColumn: owner.column,
          radius: aura.radius,
          redirectSharePct: aura.redirectSharePct,
          remainingTicks: aura.remainingTicks,
          protectedAllyIds,
        });
      }
    }

    const energy = resources?.energy ?? 0;
    const presetDefById = new Map(this.preset.defenders.map(d => [d.id, d]));
    const allowedSet =
      this.mode !== 'sandbox' &&
      this.preset.allowedBaseDefenderIds &&
      this.preset.allowedBaseDefenderIds.length > 0
        ? new Set(this.preset.allowedBaseDefenderIds)
        : null;

    const baseDefenderCards: BaseDefenderCardView[] = BASE_DEFENDER_META.map(meta => {
      const cfg = presetDefById.get(meta.id);
      const cost = cfg?.summonEnergyCost ?? 0;
      const cooldownTotalSeconds = cfg?.summonCooldownSeconds ?? 0;
      const readyTick = resources?.summonCooldownUntilTick?.get(meta.id) ?? 0;
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
      const unlocked = !allowedSet || allowedSet.has(meta.id);
      return {
        id: meta.id,
        name: meta.name,
        spriteUrl: DEFENDER_SPRITE_ASSETS[meta.id]?.url ?? `/assets/sprites/defenders/${meta.id}.png`,
        cost,
        unlocked,
        canAfford: unlocked && energy >= cost,
        cooldownTotalSeconds,
        cooldownRemainingSeconds,
        cooldownProgressPct,
        onCooldown,
        role: meta.abilityName,
        abilityName: meta.abilityName,
        requirement: unlocked ? 'Unlocked' : 'Restricted in this stage',
      };
    });

    const gloveTotalSeconds = this.preset.fusionGloveCooldownSeconds ?? 0;
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

    const chestCfg = this.preset.villageChest;
    const chestEnabled = Boolean(chestCfg?.enabled);
    const chestReady = chestEnabled && Boolean(resources?.villageChestReady);
    const chestTotalSeconds = chestCfg?.intervalSeconds ?? 10;
    const chestAmount = chestCfg?.amount ?? 25;
    const chestRemainingTicks =
      chestEnabled && !chestReady && resources?.villageChestNextTick !== undefined && resources.villageChestNextTick !== null
        ? Math.max(0, resources.villageChestNextTick - raw.tick)
        : 0;
    const chestRemainingSeconds =
      chestEnabled && !chestReady ? Number((chestRemainingTicks / TICKS_PER_SECOND).toFixed(1)) : 0;

    return {
      tick: raw.tick,
      elapsedSeconds: raw.tick / TICKS_PER_SECOND,
      mode: this.mode,
      paused: this.paused,
      speedMultiplier: this.speedMultiplier,
      showAuxLanes: this.showAuxLanes,
      allowMultiLaneWaves: this.allowMultiLaneWaves,
      energy,
      crystals: resources?.crystals ?? 0,
      maxCrystals: MAX_CRYSTALS,
      pendingCrystals: resources?.pending ?? 0,
      enemiesKilled: this.runtime.getPersistenceMeta().matchKills,
      waveStatus: raw.waves ? raw.waves.status : 'sandbox',
      currentWaveIndex: raw.waves ? raw.waves.currentWaveIndex : null,
      totalWaves: this.preset.waves.length,
      terminal,
      selectedDefenderId: this.selectedDefenderId,
      defenders,
      enemies,
      projectiles,
      items,
      slowZones,
      redirectAuras,
      flashes: [...this.flashes],
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
      lastToast: this.lastToast,
      eventLog: [...this.eventLog],
    };
  }
}
