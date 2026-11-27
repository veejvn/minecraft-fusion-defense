import { MVP_GAME_DATA } from '@mfd/game-data';
import type { AbilityDefinition, AbilitySessionInput } from '../abilities/ability-session';
import {
  DEFENDER_SPRITE_ASSETS,
  ENEMY_SPRITE_ASSETS,
  ITEM_SPRITE_ASSETS,
} from '../assets/asset-manifest';
import type { CombatSessionInput } from '../combat/combat-session';
import type { ResourceSessionInput } from '../core/resource-session';
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

export const CAMPAIGN_GLOVE_COOLDOWN_SECONDS =
  MVP_GAME_DATA.grasslandLevel.fusionGloveCooldownSeconds;

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
    };
  });

export const CAMPAIGN_ITEM_URLS = {
  energyOrb: ITEM_SPRITE_ASSETS.energy_orb.url,
  powerCrystal: ITEM_SPRITE_ASSETS.power_crystal.url,
} as const;

export interface GrasslandCampaignRuntimeInputs {
  readonly resourceInput: ResourceSessionInput;
  readonly combatInput: CombatSessionInput;
  readonly fusionInput: FusionSessionInput;
  readonly waveInput: WaveSessionInput;
  readonly abilityInput: AbilitySessionInput;
  readonly defenderCosts: Readonly<Record<string, number>>;
  readonly abilities: readonly AbilityDefinition[];
}

export function createGrasslandCampaignInputs(
  profile: ProgressionProfile,
  options: { readonly unlockAll?: boolean; readonly seed?: number } = {},
): GrasslandCampaignRuntimeInputs {
  const preset = createDefaultPlaytestPreset();
  const seed = options.seed ?? MVP_GAME_DATA.grasslandLevel.seed;

  const baseDefenders = preset.defenders.map(d => ({
    ...d,
    summonEnergyCost: d.tier === 1 ? (CAMPAIGN_BASE_COSTS[d.id] ?? d.summonEnergyCost) : 0,
  }));

  const rawResourceInput: ResourceSessionInput = {
    seed,
    defenders: baseDefenders.map(d => ({
      id: d.id,
      classification: d.tier === 1 ? 'base' : 'fusion',
      summonEnergyCost: d.summonEnergyCost,
      summonCooldownSeconds: d.tier === 1 ? (CAMPAIGN_BASE_COOLDOWNS[d.id] ?? 0) : 0,
      unlocked: true,
    })),
    enemies: preset.enemies.map(e => ({
      id: e.id,
      energy: e.energyReward,
      crystals: e.crystalReward,
    })),
    waves: GRASSLAND_CAMPAIGN_WAVES.map((w, idx) => ({
      id: w.id,
      crystals: GRASSLAND_WAVE_CRYSTALS[idx] ?? 1,
    })),
    energyItems: structuredClone(MVP_GAME_DATA.grasslandLevel.energyItems),
    enableRandomEnergyItems: false,
    enableRandomCrystalItems: false,
    fusionGloveCooldownSeconds: CAMPAIGN_GLOVE_COOLDOWN_SECONDS,
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

  const synced = options.unlockAll
    ? { resourceInput: rawResourceInput, fusionInput: rawFusionInput }
    : applyProgressionUnlocks(profile, rawResourceInput, rawFusionInput);

  const combatInput: CombatSessionInput = {
    spawnX: 9,
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
    levelId: 'grassland',
    waveCount: GRASSLAND_CAMPAIGN_WAVES.length,
    seed,
    waves: structuredClone([...GRASSLAND_CAMPAIGN_WAVES]),
  };

  const abilityInput: AbilitySessionInput = {
    abilities: structuredClone(preset.abilities),
  };

  const defenderCosts: Record<string, number> = {};
  for (const d of baseDefenders) {
    defenderCosts[d.id] = d.summonEnergyCost;
  }

  return {
    resourceInput: synced.resourceInput,
    combatInput,
    fusionInput: synced.fusionInput,
    waveInput,
    abilityInput,
    defenderCosts,
    abilities: preset.abilities,
  };
}

/**
 * Create a mutable PlaytestPresetConfig matching exact main Grassland Campaign values
 * so Owner tuning in /playtest has 1-to-1 parity with /.
 */
export function createCampaignPlaytestPreset(): PlaytestPresetConfig {
  const base = createDefaultPlaytestPreset();
  return {
    ...base,
    seed: MVP_GAME_DATA.grasslandLevel.seed,
    fusionGloveCooldownSeconds: CAMPAIGN_GLOVE_COOLDOWN_SECONDS,
    defenders: base.defenders.map(d => ({
      ...d,
      summonEnergyCost: d.tier === 1 ? (CAMPAIGN_BASE_COSTS[d.id] ?? d.summonEnergyCost) : 0,
      summonCooldownSeconds: d.tier === 1 ? (CAMPAIGN_BASE_COOLDOWNS[d.id] ?? 0) : 0,
    })),
    waves: structuredClone([...GRASSLAND_CAMPAIGN_WAVES]),
    waveCrystals: [...GRASSLAND_WAVE_CRYSTALS],
  };
}
