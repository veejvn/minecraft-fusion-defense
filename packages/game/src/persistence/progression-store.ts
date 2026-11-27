import type { ResourceSessionInput } from '../core/resource-session';
import type { FusionSessionInput } from '../fusion/fusion-session';
import { computeFnv1aHex } from './snapshot-codec';
import {
  backupKey,
  InMemoryStorageAdapter,
  writeWithBackup,
  type PersistenceStorageAdapter,
} from './storage-adapter';

export const PROGRESSION_STORAGE_KEY = 'mfd.progression.v1';
export const PROGRESSION_SCHEMA_VERSION = 1;
const MAX_RECORDED_BATTLE_IDS = 200;

export const STARTER_DEFENDER_IDS = ['villager', 'iron_golem', 'skeleton'] as const;
export const STARTER_RECIPE_IDS = [
  'fusion_skeleton_sniper',
  'fusion_steel_guardian',
  'fusion_iron_ranger',
  'fusion_master_trader',
] as const;

export interface ProgressionProfile {
  totalVictories: number;
  totalVictoryKills: number;
  unlockedDefenderIds: string[];
  unlockedRecipeIds: string[];
  recordedBattleIds: string[];
}

export interface ProgressionEnvelope {
  readonly schemaVersion: number;
  readonly checksum: string;
  readonly profile: ProgressionProfile;
}

export type ProgressionValidationErrorCode =
  | 'INVALID_JSON'
  | 'INVALID_ENVELOPE'
  | 'UNSUPPORTED_VERSION'
  | 'CHECKSUM_MISMATCH'
  | 'INVALID_PROFILE';

/** Typed fail-closed error thrown when progression loading, checksum, or migration fails. */
export class ProgressionValidationError extends Error {
  readonly code: ProgressionValidationErrorCode;

  constructor(code: ProgressionValidationErrorCode, message: string) {
    super(message);
    this.name = 'ProgressionValidationError';
    this.code = code;
  }
}

export type ProgressionMigrationFn = (raw: Record<string, unknown>) => Record<string, unknown>;

export interface BattleOutcomeInput {
  readonly battleId: string;
  readonly result: 'victory' | 'defeat';
  readonly enemiesKilled: number;
}

export interface RecordBattleOutcomeResult {
  readonly profile: ProgressionProfile;
  readonly updated: boolean;
  readonly duplicate: boolean;
  readonly newlyUnlocked: {
    readonly defenders: readonly string[];
    readonly recipes: readonly string[];
  };
}

export interface AchievementView {
  readonly id: 'first_grassland_victory' | 'victory_hunter_50_kills' | 'grassland_veteran_5_victories';
  readonly name: string;
  readonly description: string;
  readonly current: number;
  readonly target: number;
  readonly completed: boolean;
  readonly rewardDefenderId: string;
}

export interface DefenderCollectionEntry {
  readonly id: string;
  readonly name: string;
  readonly classification: 'base' | 'fusion';
  readonly tier: 1 | 2;
  readonly unlocked: boolean;
  readonly recipeId: string | null;
  readonly inputDefenderIds: readonly [string, string] | null;
  readonly requirement: string;
}

export interface ProgressionStoreOptions {
  readonly storage?: PersistenceStorageAdapter;
  readonly storageKey?: string;
}

interface BaseDefenderCatalogRule {
  readonly id: string;
  readonly name: string;
  readonly starter: boolean;
  readonly requirement: string;
  readonly isUnlocked: (profile: ProgressionProfile) => boolean;
}

interface FusionRecipeCatalogRule {
  readonly recipeId: string;
  readonly outputDefenderId: string;
  readonly outputName: string;
  readonly inputDefenderIds: readonly [string, string];
  readonly requiredBaseDefenders: readonly string[];
  readonly starter: boolean;
  readonly requirement: string;
}

const BASE_DEFENDER_RULES: readonly BaseDefenderCatalogRule[] = [
  {
    id: 'villager',
    name: 'Villager',
    starter: true,
    requirement: 'Unlocked at start',
    isUnlocked: () => true,
  },
  {
    id: 'iron_golem',
    name: 'Iron Golem',
    starter: true,
    requirement: 'Unlocked at start',
    isUnlocked: () => true,
  },
  {
    id: 'skeleton',
    name: 'Skeleton',
    starter: true,
    requirement: 'Unlocked at start',
    isUnlocked: () => true,
  },
  {
    id: 'snow_golem',
    name: 'Snow Golem',
    starter: false,
    requirement: 'Achieve 1 Grassland Victory',
    isUnlocked: profile => profile.totalVictories >= 1,
  },
  {
    id: 'wolf',
    name: 'Wolf',
    starter: false,
    requirement: 'Defeat 50 Enemies across Victory matches',
    isUnlocked: profile => profile.totalVictoryKills >= 50,
  },
  {
    id: 'blaze',
    name: 'Blaze',
    starter: false,
    requirement: 'Achieve 5 Grassland Victories',
    isUnlocked: profile => profile.totalVictories >= 5,
  },
];

const FUSION_RECIPE_RULES: readonly FusionRecipeCatalogRule[] = [
  {
    recipeId: 'fusion_master_trader',
    outputDefenderId: 'master_trader',
    outputName: 'Master Trader',
    inputDefenderIds: ['villager', 'villager'],
    requiredBaseDefenders: ['villager'],
    starter: true,
    requirement: 'Unlocked at start',
  },
  {
    recipeId: 'fusion_skeleton_sniper',
    outputDefenderId: 'skeleton_sniper',
    outputName: 'Skeleton Sniper',
    inputDefenderIds: ['skeleton', 'skeleton'],
    requiredBaseDefenders: ['skeleton'],
    starter: true,
    requirement: 'Unlocked at start',
  },
  {
    recipeId: 'fusion_steel_guardian',
    outputDefenderId: 'steel_guardian',
    outputName: 'Steel Guardian',
    inputDefenderIds: ['iron_golem', 'iron_golem'],
    requiredBaseDefenders: ['iron_golem'],
    starter: true,
    requirement: 'Unlocked at start',
  },
  {
    recipeId: 'fusion_iron_ranger',
    outputDefenderId: 'iron_ranger',
    outputName: 'Iron Ranger',
    inputDefenderIds: ['iron_golem', 'skeleton'],
    requiredBaseDefenders: ['iron_golem', 'skeleton'],
    starter: true,
    requirement: 'Unlocked at start',
  },
  {
    recipeId: 'fusion_ice_golem',
    outputDefenderId: 'ice_golem',
    outputName: 'Ice Golem',
    inputDefenderIds: ['snow_golem', 'snow_golem'],
    requiredBaseDefenders: ['snow_golem'],
    starter: false,
    requirement: 'Unlock Snow Golem',
  },
  {
    recipeId: 'fusion_frost_guardian',
    outputDefenderId: 'frost_guardian',
    outputName: 'Frost Guardian',
    inputDefenderIds: ['iron_golem', 'snow_golem'],
    requiredBaseDefenders: ['iron_golem', 'snow_golem'],
    starter: false,
    requirement: 'Unlock Iron Golem and Snow Golem',
  },
  {
    recipeId: 'fusion_frostbite_ranger',
    outputDefenderId: 'frostbite_ranger',
    outputName: 'Frostbite Ranger',
    inputDefenderIds: ['snow_golem', 'skeleton'],
    requiredBaseDefenders: ['snow_golem', 'skeleton'],
    starter: false,
    requirement: 'Unlock Snow Golem and Skeleton',
  },
  {
    recipeId: 'fusion_alpha_wolf',
    outputDefenderId: 'alpha_wolf',
    outputName: 'Alpha Wolf',
    inputDefenderIds: ['wolf', 'wolf'],
    requiredBaseDefenders: ['wolf'],
    starter: false,
    requirement: 'Unlock Wolf',
  },
  {
    recipeId: 'fusion_ironfang_guardian',
    outputDefenderId: 'ironfang_guardian',
    outputName: 'Ironfang Guardian',
    inputDefenderIds: ['iron_golem', 'wolf'],
    requiredBaseDefenders: ['iron_golem', 'wolf'],
    starter: false,
    requirement: 'Unlock Iron Golem and Wolf',
  },
  {
    recipeId: 'fusion_bonefang_hunter',
    outputDefenderId: 'bonefang_hunter',
    outputName: 'Bonefang Hunter',
    inputDefenderIds: ['skeleton', 'wolf'],
    requiredBaseDefenders: ['skeleton', 'wolf'],
    starter: false,
    requirement: 'Unlock Skeleton and Wolf',
  },
  {
    recipeId: 'fusion_frostfang',
    outputDefenderId: 'frostfang',
    outputName: 'Frostfang',
    inputDefenderIds: ['snow_golem', 'wolf'],
    requiredBaseDefenders: ['snow_golem', 'wolf'],
    starter: false,
    requirement: 'Unlock Snow Golem and Wolf',
  },
  {
    recipeId: 'fusion_infernal_archon',
    outputDefenderId: 'infernal_archon',
    outputName: 'Infernal Archon',
    inputDefenderIds: ['blaze', 'blaze'],
    requiredBaseDefenders: ['blaze'],
    starter: false,
    requirement: 'Unlock Blaze',
  },
  {
    recipeId: 'fusion_magma_colossus',
    outputDefenderId: 'magma_colossus',
    outputName: 'Magma Colossus',
    inputDefenderIds: ['iron_golem', 'blaze'],
    requiredBaseDefenders: ['iron_golem', 'blaze'],
    starter: false,
    requirement: 'Unlock Iron Golem and Blaze',
  },
  {
    recipeId: 'fusion_steam_warden',
    outputDefenderId: 'steam_warden',
    outputName: 'Steam Warden',
    inputDefenderIds: ['snow_golem', 'blaze'],
    requiredBaseDefenders: ['snow_golem', 'blaze'],
    starter: false,
    requirement: 'Unlock Snow Golem and Blaze',
  },
  {
    recipeId: 'fusion_inferno_archer',
    outputDefenderId: 'inferno_archer',
    outputName: 'Inferno Archer',
    inputDefenderIds: ['blaze', 'skeleton'],
    requiredBaseDefenders: ['blaze', 'skeleton'],
    starter: false,
    requirement: 'Unlock Blaze and Skeleton',
  },
  {
    recipeId: 'fusion_flame_fang',
    outputDefenderId: 'flame_fang',
    outputName: 'Flame Fang',
    inputDefenderIds: ['blaze', 'wolf'],
    requiredBaseDefenders: ['blaze', 'wolf'],
    starter: false,
    requirement: 'Unlock Blaze and Wolf',
  },
];

const DEFAULT_PROGRESSION_MIGRATIONS: Readonly<Record<number, ProgressionMigrationFn>> = {};
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function assertSafeKeys(obj: Record<string, unknown>): void {
  for (const key of Object.getOwnPropertyNames(obj)) {
    if (FORBIDDEN_KEYS.has(key)) {
      throw new ProgressionValidationError('INVALID_ENVELOPE', `Forbidden key "${key}"`);
    }
  }
}

/** Create a fresh starter ProgressionProfile with confirmed initial unlocks. */
export function createStarterProgressionProfile(): ProgressionProfile {
  return {
    totalVictories: 0,
    totalVictoryKills: 0,
    unlockedDefenderIds: [...STARTER_DEFENDER_IDS],
    unlockedRecipeIds: [...STARTER_RECIPE_IDS],
    recordedBattleIds: [],
  };
}

function cloneProfile(profile: ProgressionProfile): ProgressionProfile {
  return {
    totalVictories: profile.totalVictories,
    totalVictoryKills: profile.totalVictoryKills,
    unlockedDefenderIds: [...profile.unlockedDefenderIds],
    unlockedRecipeIds: [...profile.unlockedRecipeIds],
    recordedBattleIds: [...profile.recordedBattleIds],
  };
}

function computeProgressionChecksum(schemaVersion: number, profile: ProgressionProfile): string {
  return computeFnv1aHex(
    JSON.stringify({
      schemaVersion,
      profile: {
        recordedBattleIds: profile.recordedBattleIds,
        totalVictories: profile.totalVictories,
        totalVictoryKills: profile.totalVictoryKills,
        unlockedDefenderIds: profile.unlockedDefenderIds,
        unlockedRecipeIds: profile.unlockedRecipeIds,
      },
    }),
  );
}

function validateStringArray(value: unknown, label: string): string[] {
  if (!Array.isArray(value)) {
    throw new ProgressionValidationError('INVALID_PROFILE', `Expected string array for ${label}`);
  }
  const seen = new Set<string>();
  const out: string[] = [];
  for (const entry of value) {
    if (typeof entry !== 'string' || !entry.trim()) {
      throw new ProgressionValidationError('INVALID_PROFILE', `Invalid entry in ${label}`);
    }
    if (!seen.has(entry)) {
      seen.add(entry);
      out.push(entry);
    }
  }
  return out;
}

function validateProgressionProfile(rawProfile: unknown): ProgressionProfile {
  if (!isPlainRecord(rawProfile)) {
    throw new ProgressionValidationError('INVALID_PROFILE', 'Profile must be an object');
  }
  assertSafeKeys(rawProfile);
  const { totalVictories, totalVictoryKills, unlockedDefenderIds, unlockedRecipeIds, recordedBattleIds } =
    rawProfile;
  if (typeof totalVictories !== 'number' || !Number.isSafeInteger(totalVictories) || totalVictories < 0) {
    throw new ProgressionValidationError('INVALID_PROFILE', 'totalVictories must be a nonnegative safe integer');
  }
  if (
    typeof totalVictoryKills !== 'number' ||
    !Number.isSafeInteger(totalVictoryKills) ||
    totalVictoryKills < 0
  ) {
    throw new ProgressionValidationError(
      'INVALID_PROFILE',
      'totalVictoryKills must be a nonnegative safe integer',
    );
  }
  return {
    totalVictories,
    totalVictoryKills,
    unlockedDefenderIds: validateStringArray(unlockedDefenderIds, 'unlockedDefenderIds'),
    unlockedRecipeIds: validateStringArray(unlockedRecipeIds, 'unlockedRecipeIds'),
    recordedBattleIds: validateStringArray(recordedBattleIds, 'recordedBattleIds'),
  };
}

/**
 * Migrate a parsed progression envelope sequentially up to `targetVersion`.
 * Rejects future or invalid schema versions fail-closed with `UNSUPPORTED_VERSION`.
 */
export function migrateProgressionEnvelope(
  raw: Record<string, unknown>,
  options?: {
    readonly targetVersion?: number;
    readonly migrations?: Readonly<Record<number, ProgressionMigrationFn>>;
  },
): Record<string, unknown> {
  const targetVersion = options?.targetVersion ?? PROGRESSION_SCHEMA_VERSION;
  const migrations = options?.migrations ?? DEFAULT_PROGRESSION_MIGRATIONS;
  const version = raw.schemaVersion;
  if (typeof version !== 'number' || !Number.isSafeInteger(version) || version < 1) {
    throw new ProgressionValidationError('UNSUPPORTED_VERSION', `Invalid progression schemaVersion: ${String(version)}`);
  }
  if (version > targetVersion) {
    throw new ProgressionValidationError(
      'UNSUPPORTED_VERSION',
      `Progression schemaVersion ${version} is newer than supported version ${targetVersion}`,
    );
  }
  let current = raw;
  let currentVersion = version;
  while (currentVersion < targetVersion) {
    const migrate = migrations[currentVersion];
    if (!migrate) {
      throw new ProgressionValidationError(
        'UNSUPPORTED_VERSION',
        `Missing progression migration from ${currentVersion} to ${currentVersion + 1}`,
      );
    }
    current = migrate(current);
    currentVersion += 1;
    current = { ...current, schemaVersion: currentVersion };
  }
  return current;
}

/** Serialize a ProgressionProfile into a versioned, checksummed JSON string. */
export function serializeProgressionEnvelope(profile: ProgressionProfile): {
  readonly envelope: ProgressionEnvelope;
  readonly json: string;
} {
  const normalized = cloneProfile(profile);
  const checksum = computeProgressionChecksum(PROGRESSION_SCHEMA_VERSION, normalized);
  const envelope: ProgressionEnvelope = {
    schemaVersion: PROGRESSION_SCHEMA_VERSION,
    checksum,
    profile: normalized,
  };
  return {
    envelope,
    json: JSON.stringify(envelope),
  };
}

/** Parse, migrate, verify checksum, and validate a serialized progression envelope. */
export function parseAndValidateProgressionEnvelope(rawJson: string): ProgressionEnvelope {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new ProgressionValidationError('INVALID_JSON', `Failed to parse progression JSON: ${reason}`);
  }
  if (!isPlainRecord(parsed)) {
    throw new ProgressionValidationError('INVALID_ENVELOPE', 'Progression root must be a JSON object');
  }
  assertSafeKeys(parsed);
  if (
    !Object.prototype.hasOwnProperty.call(parsed, 'schemaVersion') ||
    !Object.prototype.hasOwnProperty.call(parsed, 'checksum') ||
    !Object.prototype.hasOwnProperty.call(parsed, 'profile')
  ) {
    throw new ProgressionValidationError('INVALID_ENVELOPE', 'Missing progression envelope fields');
  }
  if (typeof parsed.checksum !== 'string' || !/^[0-9a-f]{8}$/.test(parsed.checksum)) {
    throw new ProgressionValidationError('INVALID_ENVELOPE', 'Invalid progression checksum format');
  }

  const migrated = migrateProgressionEnvelope(parsed);
  const profile = validateProgressionProfile(migrated.profile);
  const expectedChecksum = computeProgressionChecksum(migrated.schemaVersion as number, profile);
  if (migrated.checksum !== expectedChecksum) {
    throw new ProgressionValidationError('CHECKSUM_MISMATCH', 'Progression checksum mismatch');
  }

  return {
    schemaVersion: migrated.schemaVersion as number,
    checksum: migrated.checksum as string,
    profile,
  };
}

function evaluateMonotonicUnlocks(profile: ProgressionProfile): {
  readonly defenders: string[];
  readonly recipes: string[];
} {
  const unlockedDefenders = new Set(profile.unlockedDefenderIds);
  const unlockedRecipes = new Set(profile.unlockedRecipeIds);
  const newlyUnlockedDefenders: string[] = [];
  const newlyUnlockedRecipes: string[] = [];

  for (const rule of BASE_DEFENDER_RULES) {
    if (!unlockedDefenders.has(rule.id) && rule.isUnlocked(profile)) {
      unlockedDefenders.add(rule.id);
      profile.unlockedDefenderIds.push(rule.id);
      newlyUnlockedDefenders.push(rule.id);
    }
  }

  for (const recipe of FUSION_RECIPE_RULES) {
    if (
      !unlockedRecipes.has(recipe.recipeId) &&
      recipe.requiredBaseDefenders.every(defenderId => unlockedDefenders.has(defenderId))
    ) {
      unlockedRecipes.add(recipe.recipeId);
      profile.unlockedRecipeIds.push(recipe.recipeId);
      newlyUnlockedRecipes.push(recipe.recipeId);
    }
  }

  return {
    defenders: newlyUnlockedDefenders,
    recipes: newlyUnlockedRecipes,
  };
}

/**
 * Manages persistent player unlocks across battles independently from active-battle saves.
 * Enforces Victory-only progression, idempotent battle accounting, and primary + `.bak` recovery.
 */
export class ProgressionStore {
  private readonly storage: PersistenceStorageAdapter;
  private readonly storageKey: string;
  private profile: ProgressionProfile;

  constructor(options: ProgressionStoreOptions = {}) {
    const key = options.storageKey ?? PROGRESSION_STORAGE_KEY;
    if (typeof key !== 'string' || !key.trim()) {
      throw new TypeError('storageKey must be a non-empty string');
    }
    this.storage = options.storage ?? new InMemoryStorageAdapter();
    this.storageKey = key;
    this.profile = this.loadInitialProfile();
  }

  private loadInitialProfile(): ProgressionProfile {
    const primary = this.storage.getItem(this.storageKey);
    const backup = this.storage.getItem(backupKey(this.storageKey));

    if (primary === null && backup === null) {
      return createStarterProgressionProfile();
    }

    if (primary !== null) {
      try {
        const envelope = parseAndValidateProgressionEnvelope(primary);
        evaluateMonotonicUnlocks(envelope.profile);
        return envelope.profile;
      } catch (error) {
        if (error instanceof ProgressionValidationError && error.code === 'UNSUPPORTED_VERSION') {
          throw error;
        }
        if (backup === null) {
          throw error;
        }
      }
    }

    const backupEnvelope = parseAndValidateProgressionEnvelope(backup!);
    evaluateMonotonicUnlocks(backupEnvelope.profile);
    return backupEnvelope.profile;
  }

  /** Return a detached clone of the current ProgressionProfile. */
  getProfile(): ProgressionProfile {
    return cloneProfile(this.profile);
  }

  /** Reset persistent progression back to the confirmed starter state and clear stored keys. */
  reset(): ProgressionProfile {
    this.storage.removeItem(this.storageKey);
    this.storage.removeItem(backupKey(this.storageKey));
    this.profile = createStarterProgressionProfile();
    return this.getProfile();
  }

  /**
   * Commit a completed battle outcome. Only `'victory'` results increment wins/kills and
   * evaluate unlocks; `'defeat'` and duplicate `battleId` commits grant zero progression.
   */
  recordBattleOutcome(input: BattleOutcomeInput): RecordBattleOutcomeResult {
    if (typeof input.battleId !== 'string' || !input.battleId.trim()) {
      throw new TypeError('battleId must be a non-empty string');
    }
    if (input.result !== 'victory' && input.result !== 'defeat') {
      throw new TypeError(`Invalid battle result: ${String(input.result)}`);
    }
    if (
      typeof input.enemiesKilled !== 'number' ||
      !Number.isSafeInteger(input.enemiesKilled) ||
      input.enemiesKilled < 0
    ) {
      throw new RangeError('enemiesKilled must be a nonnegative safe integer');
    }

    if (input.result === 'defeat') {
      return {
        profile: this.getProfile(),
        updated: false,
        duplicate: false,
        newlyUnlocked: { defenders: [], recipes: [] },
      };
    }

    if (this.profile.recordedBattleIds.includes(input.battleId)) {
      return {
        profile: this.getProfile(),
        updated: false,
        duplicate: true,
        newlyUnlocked: { defenders: [], recipes: [] },
      };
    }

    const nextProfile = cloneProfile(this.profile);
    nextProfile.totalVictories += 1;
    nextProfile.totalVictoryKills += input.enemiesKilled;
    nextProfile.recordedBattleIds.push(input.battleId);
    if (nextProfile.recordedBattleIds.length > MAX_RECORDED_BATTLE_IDS) {
      nextProfile.recordedBattleIds = nextProfile.recordedBattleIds.slice(-MAX_RECORDED_BATTLE_IDS);
    }

    const newlyUnlocked = evaluateMonotonicUnlocks(nextProfile);
    const { json } = serializeProgressionEnvelope(nextProfile);
    writeWithBackup(this.storage, this.storageKey, json, raw => {
      try {
        parseAndValidateProgressionEnvelope(raw);
        return true;
      } catch {
        return false;
      }
    });

    this.profile = nextProfile;
    return {
      profile: this.getProfile(),
      updated: true,
      duplicate: false,
      newlyUnlocked,
    };
  }
}

/** Build the read-only Achievements view model from a ProgressionProfile. */
export function getAchievementsView(profile: ProgressionProfile): readonly AchievementView[] {
  return [
    {
      id: 'first_grassland_victory',
      name: 'First Grassland Victory',
      description: 'Win your first battle on the Grassland map.',
      current: Math.min(profile.totalVictories, 1),
      target: 1,
      completed: profile.totalVictories >= 1,
      rewardDefenderId: 'snow_golem',
    },
    {
      id: 'victory_hunter_50_kills',
      name: 'Victory Hunter',
      description: 'Defeat 50 Enemies across Victory matches.',
      current: Math.min(profile.totalVictoryKills, 50),
      target: 50,
      completed: profile.totalVictoryKills >= 50,
      rewardDefenderId: 'wolf',
    },
    {
      id: 'grassland_veteran_5_victories',
      name: 'Grassland Veteran',
      description: 'Achieve 5 cumulative Grassland Victories.',
      current: Math.min(profile.totalVictories, 5),
      target: 5,
      completed: profile.totalVictories >= 5,
      rewardDefenderId: 'blaze',
    },
  ];
}

/** Build the read-only Defender Collection view covering all 6 Base and 16 Fusion Defenders. */
export function getDefenderCollectionView(
  profile: ProgressionProfile,
): readonly DefenderCollectionEntry[] {
  const unlockedDefenders = new Set(profile.unlockedDefenderIds);
  const unlockedRecipes = new Set(profile.unlockedRecipeIds);

  const baseEntries: DefenderCollectionEntry[] = BASE_DEFENDER_RULES.map(rule => ({
    id: rule.id,
    name: rule.name,
    classification: 'base',
    tier: 1,
    unlocked: unlockedDefenders.has(rule.id),
    recipeId: null,
    inputDefenderIds: null,
    requirement: rule.requirement,
  }));

  const fusionEntries: DefenderCollectionEntry[] = FUSION_RECIPE_RULES.map(rule => ({
    id: rule.outputDefenderId,
    name: rule.outputName,
    classification: 'fusion',
    tier: 2,
    unlocked: unlockedRecipes.has(rule.recipeId),
    recipeId: rule.recipeId,
    inputDefenderIds: rule.inputDefenderIds,
    requirement: rule.requirement,
  }));

  return [...baseEntries, ...fusionEntries];
}

/**
 * Synchronize `unlocked` flags on cloned ResourceSessionInput and FusionSessionInput
 * against the player's persistent ProgressionProfile without mutating input objects.
 */
export function applyProgressionUnlocks(
  profile: ProgressionProfile,
  resourceInput: ResourceSessionInput,
  fusionInput: FusionSessionInput,
): {
  readonly resourceInput: ResourceSessionInput;
  readonly fusionInput: FusionSessionInput;
} {
  const unlockedDefenders = new Set(profile.unlockedDefenderIds);
  const unlockedRecipes = new Set(profile.unlockedRecipeIds);
  const unlockedFusionOutputs = new Set<string>();
  for (const rule of FUSION_RECIPE_RULES) {
    if (unlockedRecipes.has(rule.recipeId)) {
      unlockedFusionOutputs.add(rule.outputDefenderId);
    }
  }

  const clonedResource = structuredClone(resourceInput) as {
    -readonly [K in keyof ResourceSessionInput]: ResourceSessionInput[K];
  } & {
    defenders: {
      id: string;
      classification: 'base' | 'fusion';
      summonEnergyCost: number;
      unlocked: boolean;
    }[];
  };
  clonedResource.defenders = clonedResource.defenders.map(defender => ({
    ...defender,
    unlocked:
      defender.classification === 'base'
        ? unlockedDefenders.has(defender.id)
        : unlockedFusionOutputs.has(defender.id) || unlockedDefenders.has(defender.id),
  }));

  const clonedFusion = structuredClone(fusionInput) as {
    defenders: { id: string; tier: number }[];
    recipes: {
      id: string;
      inputDefenderIds: readonly [string, string];
      outputDefenderId: string;
      unlocked: boolean;
      enabled: boolean;
    }[];
  };
  clonedFusion.recipes = clonedFusion.recipes.map(recipe => ({
    ...recipe,
    unlocked: unlockedRecipes.has(recipe.id),
  }));

  return {
    resourceInput: clonedResource,
    fusionInput: clonedFusion,
  };
}
