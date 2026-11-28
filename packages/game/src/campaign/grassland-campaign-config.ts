import {
  MVP_GAME_DATA,
  type MvpCampaignLevelData,
  type MvpLevelDifficulty,
  type MvpLevelTheme,
} from '@mfd/game-data';
import { BATTLEFIELD_COLUMNS } from '../battlefield/grid';
import type { AbilityDefinition, AbilitySessionInput } from '../abilities/ability-session';
import {
  DEFENDER_SPRITE_ASSETS,
  ENEMY_SPRITE_ASSETS,
  ITEM_SPRITE_ASSETS,
} from '../assets/asset-manifest';
import type { CombatSessionInput } from '../combat/combat-session';
import type { ResourceSessionInput, VillageChestConfig } from '../core/resource-session';
import type { FusionSessionInput } from '../fusion/fusion-session';
import {
  applyProgressionUnlocks,
  type ProgressionProfile,
} from '../persistence/progression-store';
import {
  PLAYTEST_DEFENDER_META,
  PLAYTEST_ENEMY_META,
  PLAYTEST_FUSION_RECIPES_META,
  createDefaultPlaytestPreset,
  createPlaytestPresetFromLevel,
  type PlaytestDefenderConfig,
  type PlaytestPresetConfig,
} from '../playtest/playtest-presets';
import type { WaveConfigDefinition, WaveSessionInput } from '../waves/wave-session';

export interface CampaignDefenderCatalogItem {
  readonly id: string;
  readonly name: string;
  readonly shortLabel: string;
  readonly tier: 1 | 2;
  readonly role: string;
  readonly summonEnergyCost: number;
  readonly summonCooldownSeconds: number;
  readonly maxHp: number;
  readonly damage: number;
  readonly attackSpeed: number;
  readonly attackRange: number;
  readonly abilityId: string;
  readonly abilityName: string;
  readonly abilitySummary: string;
  readonly requiresTarget: boolean;
  readonly spriteUrl: string;
  readonly inputs: readonly [string, string] | null;
  readonly recipeId: string | null;
}

export interface CampaignRecipeCatalogItem {
  readonly id: string;
  readonly inputs: readonly [string, string];
  readonly outputId: string;
  readonly outputName: string;
  readonly outputSpriteUrl: string;
  readonly inputASpriteUrl: string;
  readonly inputBSpriteUrl: string;
  readonly label: string;
}

export interface CampaignEnemyCatalogItem {
  readonly id: string;
  readonly name: string;
  readonly role: string;
  readonly spriteUrl: string;
  readonly energyReward: number;
  readonly crystalReward: number;
  readonly crystalDropChance: number;
}

const DEFENDER_ROLES_BY_ID: Readonly<Record<string, string>> = Object.fromEntries(
  MVP_GAME_DATA.defenders.map(d => [d.id, d.role]),
);

export const CAMPAIGN_BASE_COSTS: Readonly<Record<string, number>> = Object.fromEntries(
  MVP_GAME_DATA.defenders.filter(d => d.tier === 1).map(d => [d.id, d.summonEnergyCost]),
);

export const CAMPAIGN_BASE_COOLDOWNS: Readonly<Record<string, number>> = Object.fromEntries(
  MVP_GAME_DATA.defenders.filter(d => d.tier === 1).map(d => [d.id, d.summonCooldownSeconds]),
);

export const CAMPAIGN_LEVELS: readonly MvpCampaignLevelData[] =
  [...MVP_GAME_DATA.campaignLevels].sort((a, b) => a.order - b.order);

export function tryGetCampaignLevelById(levelId: string): MvpCampaignLevelData | undefined {
  return CAMPAIGN_LEVELS.find(level => level.id === levelId);
}

export function getCampaignLevelById(levelId: string): MvpCampaignLevelData {
  const found = tryGetCampaignLevelById(levelId);
  if (!found) {
    throw new RangeError(`Unknown campaign level: ${levelId}`);
  }
  return found;
}

export const CAMPAIGN_GLOVE_COOLDOWN_SECONDS =
  MVP_GAME_DATA.grasslandLevel.fusionGloveCooldownSeconds;

export const GRASSLAND_VILLAGE_CHEST = MVP_GAME_DATA.grasslandLevel.villageChest;

export const GRASSLAND_WAVE_CRYSTALS: readonly number[] =
  MVP_GAME_DATA.grasslandLevel.waveCrystals;

export const GRASSLAND_CAMPAIGN_WAVES: readonly WaveConfigDefinition[] =
  MVP_GAME_DATA.grasslandLevel.waves;

const DEFAULT_PRESET_REF = createDefaultPlaytestPreset();
const PRESET_DEFENDER_BY_ID = new Map<string, PlaytestDefenderConfig>(
  DEFAULT_PRESET_REF.defenders.map(d => [d.id, d]),
);
const RECIPE_BY_OUTPUT_ID = new Map(
  PLAYTEST_FUSION_RECIPES_META.map(r => [r.output, r]),
);

export const CAMPAIGN_DEFENDER_CATALOG: readonly CampaignDefenderCatalogItem[] =
  PLAYTEST_DEFENDER_META.map(meta => {
    const stats = PRESET_DEFENDER_BY_ID.get(meta.id);
    const recipe = RECIPE_BY_OUTPUT_ID.get(meta.id);
    return {
      id: meta.id,
      name: meta.name,
      shortLabel: meta.shortLabel,
      tier: meta.tier,
      role: DEFENDER_ROLES_BY_ID[meta.id] ?? (meta.tier === 1 ? 'Base Defender' : 'Fusion Defender'),
      summonEnergyCost: CAMPAIGN_BASE_COSTS[meta.id] ?? stats?.summonEnergyCost ?? 0,
      summonCooldownSeconds: meta.tier === 1 ? (CAMPAIGN_BASE_COOLDOWNS[meta.id] ?? 0) : 0,
      maxHp: stats?.maxHp ?? 200,
      damage: stats?.damage ?? 25,
      attackSpeed: stats?.attackSpeed ?? 1,
      attackRange: stats?.attackRange ?? 1,
      abilityId: meta.abilityId,
      abilityName: meta.abilityName,
      abilitySummary: meta.abilitySummary,
      requiresTarget: meta.requiresTarget,
      spriteUrl: DEFENDER_SPRITE_ASSETS[meta.id]?.url ?? `/assets/sprites/defenders/${meta.id}.png`,
      inputs: recipe ? recipe.inputs : null,
      recipeId: recipe ? recipe.id : null,
    };
  });

export const CAMPAIGN_RECIPE_CATALOG: readonly CampaignRecipeCatalogItem[] =
  PLAYTEST_FUSION_RECIPES_META.map(recipe => {
    const outMeta = PLAYTEST_DEFENDER_META.find(d => d.id === recipe.output);
    return {
      id: recipe.id,
      inputs: recipe.inputs,
      outputId: recipe.output,
      outputName: outMeta?.name ?? recipe.output,
      outputSpriteUrl: DEFENDER_SPRITE_ASSETS[recipe.output]?.url ?? `/assets/sprites/defenders/${recipe.output}.png`,
      inputASpriteUrl: DEFENDER_SPRITE_ASSETS[recipe.inputs[0]]?.url ?? `/assets/sprites/defenders/${recipe.inputs[0]}.png`,
      inputBSpriteUrl: DEFENDER_SPRITE_ASSETS[recipe.inputs[1]]?.url ?? `/assets/sprites/defenders/${recipe.inputs[1]}.png`,
      label: recipe.label,
    };
  });

export const CAMPAIGN_ENEMY_CATALOG: readonly CampaignEnemyCatalogItem[] =
  PLAYTEST_ENEMY_META.map(meta => {
    const enemyStats = DEFAULT_PRESET_REF.enemies.find(e => e.id === meta.id);
    return {
      id: meta.id,
      name: meta.name,
      role: meta.role,
      spriteUrl: ENEMY_SPRITE_ASSETS[meta.id]?.url ?? `/assets/sprites/enemies/${meta.id}.png`,
      energyReward: enemyStats?.energyReward ?? 50,
      crystalReward: enemyStats?.crystalReward ?? 0,
      crystalDropChance: enemyStats?.crystalDropChance ?? 0,
    };
  });

export const CAMPAIGN_ITEM_URLS = {
  emerald: ITEM_SPRITE_ASSETS.emerald.url,
  villageChestClosed: ITEM_SPRITE_ASSETS.village_chest_closed.url,
  villageChestOpen: ITEM_SPRITE_ASSETS.village_chest_open.url,
  powerCrystal: ITEM_SPRITE_ASSETS.power_crystal.url,
} as const;

export interface CampaignLevelCardView {
  readonly id: string;
  readonly order: number;
  readonly name: string;
  readonly description: string;
  readonly difficulty: MvpLevelDifficulty;
  readonly theme: MvpLevelTheme;
  readonly waveCount: number;
  readonly initialEmeralds: number;
  readonly startingDefenderCount: number;
  readonly allowedBaseDefenderIds: readonly string[] | null;
  readonly unlocked: boolean;
  readonly cleared: boolean;
  readonly requirementText: string;
}

export function evaluateCampaignLevelUnlock(
  level: MvpCampaignLevelData,
  profile: ProgressionProfile,
  unlockAll = false,
): { readonly unlocked: boolean; readonly cleared: boolean; readonly requirementText: string } {
  const clearedSet = new Set(profile.clearedLevelIds ?? []);
  const cleared = clearedSet.has(level.id);
  if (unlockAll || level.ignoreUnlockRestrictions || level.unlockRequirement.kind === 'always') {
    return { unlocked: true, cleared, requirementText: 'Unlocked' };
  }
  const reqId = level.unlockRequirement.levelId;
  const reqLevel = tryGetCampaignLevelById(reqId);
  const reqLabel = reqLevel?.name ?? reqId;
  const ok = clearedSet.has(reqId);
  return {
    unlocked: ok,
    cleared,
    requirementText: ok ? `Cleared ${reqLabel}` : `Clear "${reqLabel}" to unlock`,
  };
}

export interface GrasslandCampaignRuntimeInputs {
  readonly levelId: string;
  readonly levelName: string;
  readonly totalWaves: number;
  readonly fusionGloveCooldownSeconds: number;
  readonly villageChest: VillageChestConfig;
  readonly allowedBaseDefenderIds: readonly string[] | null;
  readonly ignoreUnlockRestrictions: boolean;
  readonly resourceInput: ResourceSessionInput;
  readonly combatInput: CombatSessionInput;
  readonly fusionInput: FusionSessionInput;
  readonly waveInput: WaveSessionInput;
  readonly abilityInput: AbilitySessionInput;
  readonly defenderCosts: Readonly<Record<string, number>>;
  readonly abilities: readonly AbilityDefinition[];
}

export function createCampaignInputs(
  levelId: string,
  profile: ProgressionProfile,
  options: { readonly unlockAll?: boolean; readonly seed?: number } = {},
): GrasslandCampaignRuntimeInputs {
  const level = getCampaignLevelById(levelId);
  const preset = createDefaultPlaytestPreset();
  const seed = options.seed ?? level.seed;
  const effectiveUnlockAll = Boolean(options.unlockAll || level.ignoreUnlockRestrictions);
  const allowedBaseDefenderIds =
    level.allowedBaseDefenderIds && level.allowedBaseDefenderIds.length > 0
      ? [...level.allowedBaseDefenderIds]
      : null;
  const allowedSet = allowedBaseDefenderIds ? new Set(allowedBaseDefenderIds) : null;

  const baseDefenders = preset.defenders.map(d => ({
    ...d,
    summonEnergyCost: d.tier === 1 ? (CAMPAIGN_BASE_COSTS[d.id] ?? d.summonEnergyCost) : 0,
  }));

  const rawResourceInput: ResourceSessionInput = {
    seed,
    initialEnergy: level.initialEmeralds,
    enablePassiveEnergy: level.enablePassiveEnergy,
    villageChest: structuredClone(level.villageChest),
    startingDefenders: structuredClone(level.startingDefenders ?? []),
    defenders: baseDefenders.map(d => ({
      id: d.id,
      classification: d.tier === 1 ? 'base' : 'fusion',
      summonEnergyCost: d.summonEnergyCost,
      summonCooldownSeconds: d.tier === 1 ? (CAMPAIGN_BASE_COOLDOWNS[d.id] ?? 0) : 0,
      unlocked: true,
      ...(d.economyProduction ? { economyProduction: structuredClone(d.economyProduction) } : {}),
    })),
    enemies: preset.enemies.map(e => ({
      id: e.id,
      energy: e.energyReward,
      crystals: e.crystalReward,
      crystalDropChance: e.crystalDropChance,
    })),
    waves: level.waves.map((w, idx) => ({
      id: w.id,
      crystals: level.waveCrystals[idx] ?? 1,
    })),
    energyItems: structuredClone(level.energyItems),
    enableRandomEnergyItems: false,
    enableRandomCrystalItems: false,
    fusionGloveCooldownSeconds: level.fusionGloveCooldownSeconds,
  };

  const rawFusionInput: FusionSessionInput = {
    defenders: baseDefenders.map(d => ({
      id: d.id,
      tier: d.tier,
    })),
    recipes: PLAYTEST_FUSION_RECIPES_META.map(recipe => ({
      id: recipe.id,
      inputDefenderIds: recipe.inputs,
      outputDefenderId: recipe.output,
      unlocked: true,
      enabled: true,
    })),
  };

  const synced = effectiveUnlockAll
    ? { resourceInput: rawResourceInput, fusionInput: rawFusionInput }
    : applyProgressionUnlocks(profile, rawResourceInput, rawFusionInput);

  const resourceInputWithRestrictions: ResourceSessionInput = allowedSet
    ? {
        ...synced.resourceInput,
        defenders: synced.resourceInput.defenders.map(d =>
          d.classification === 'base' && !allowedSet.has(d.id)
            ? { ...d, unlocked: false }
            : d,
        ),
      }
    : synced.resourceInput;

  const combatInput: CombatSessionInput = {
    spawnX: BATTLEFIELD_COLUMNS,
    defenders: baseDefenders.map(d => ({
      id: d.id,
      maxHp: d.maxHp,
      damage: d.damage,
      attackSpeed: d.attackSpeed,
      attackRange: d.attackRange,
      targeting: d.targeting,
      armor: d.armor,
      ...(d.attackDamageType ? { attackDamageType: d.attackDamageType } : {}),
      ...(d.basicAttackStatus ? { basicAttackStatus: d.basicAttackStatus } : {}),
    })),
    enemies: preset.enemies.map(e => ({
      id: e.id,
      maxHp: e.maxHp,
      moveSpeed: e.moveSpeed,
      behavior: e.behavior,
      damage: e.damage,
      attackSpeed: e.attackSpeed,
      attackRange: e.attackRange,
      armor: e.armor,
      fireResistancePct: e.fireResistancePct,
      freezeResistancePct: e.freezeResistancePct,
      freezeImmune: e.freezeImmune,
    })),
  };

  const waveInput: WaveSessionInput = {
    levelId: level.id,
    waveCount: level.waves.length,
    seed,
    waves: structuredClone([...level.waves]),
  };

  const abilityInput: AbilitySessionInput = {
    abilities: structuredClone(preset.abilities),
  };

  const defenderCosts: Record<string, number> = {};
  for (const d of baseDefenders) {
    defenderCosts[d.id] = d.summonEnergyCost;
  }

  return {
    levelId: level.id,
    levelName: level.name,
    totalWaves: level.waves.length,
    fusionGloveCooldownSeconds: level.fusionGloveCooldownSeconds,
    villageChest: structuredClone(level.villageChest),
    allowedBaseDefenderIds,
    ignoreUnlockRestrictions: Boolean(level.ignoreUnlockRestrictions),
    resourceInput: resourceInputWithRestrictions,
    combatInput,
    fusionInput: synced.fusionInput,
    waveInput,
    abilityInput,
    defenderCosts,
    abilities: preset.abilities,
  };
}

export function createGrasslandCampaignInputs(
  profile: ProgressionProfile,
  options: { readonly unlockAll?: boolean; readonly seed?: number } = {},
): GrasslandCampaignRuntimeInputs {
  return createCampaignInputs('grassland', profile, options);
}

/**
 * Create a mutable PlaytestPresetConfig matching exact main Grassland Campaign values
 * so Owner tuning in /playtest has 1-to-1 parity with /.
 */
export function createCampaignPlaytestPreset(): PlaytestPresetConfig {
  return createPlaytestPresetFromLevel(getCampaignLevelById('grassland'));
}
