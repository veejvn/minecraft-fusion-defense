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

const DEFENDER_ROLES_BY_ID: Readonly<Record<string, string>> = {
  iron_golem: 'Frontline Tank',
  snow_golem: 'Frost Control',
  skeleton: 'Ranged Marksman',
  wolf: 'Fast Melee',
  blaze: 'Lobbed Fire',
  steel_guardian: 'Crowd Control Guardian',
  frost_guardian: 'Tank / Ice Control',
  ice_golem: 'Map-Wide Cryo Control',
  skeleton_sniper: 'Long-Range Piercing Burst',
  iron_ranger: 'Heavy Marksman (Anti-Tank)',
  frostbite_ranger: 'Ranged Freeze Control',
  alpha_wolf: 'Melee Support (3x3 Aura)',
  ironfang_guardian: 'Armored Melee / Lane Charge',
  bonefang_hunter: 'Agile Hunter / Mark (+40% Dmg)',
  frostfang: 'Cryo Executioner (3-Cell Front)',
  infernal_archon: 'Map-Wide Fire Cataclysm',
  magma_colossus: 'Heavy Melee / Fire Bruiser',
  steam_warden: 'Elemental 3x3 Thermal Shock',
  inferno_archer: 'Ranged Meteor Burn (3x3)',
  flame_fang: '5-Lane Fire Wolf Summoner',
};

export const CAMPAIGN_BASE_COSTS: Readonly<Record<string, number>> = {
  skeleton: 50,
  snow_golem: 75,
  iron_golem: 100,
  wolf: 100,
  blaze: 125,
};

export const CAMPAIGN_BASE_COOLDOWNS: Readonly<Record<string, number>> = {
  skeleton: 4,
  snow_golem: 5,
  iron_golem: 7,
  wolf: 6,
  blaze: 8,
};

export const CAMPAIGN_GLOVE_COOLDOWN_SECONDS = 15;

export const GRASSLAND_WAVE_CRYSTALS: readonly number[] = [1, 1, 1, 1, 2];

export const GRASSLAND_CAMPAIGN_WAVES: readonly WaveConfigDefinition[] = [
  {
    id: 'wave_1',
    initialDelaySeconds: 3,
    delayBeforeNextWaveSeconds: 5,
    spawnGroups: [
      {
        enemyId: 'zombie',
        count: 4,
        allowedLanes: [0, 1, 2, 3, 4],
        laneMode: 'sequential',
        startOffsetSeconds: 0,
        intervalSeconds: 3.5,
      },
    ],
  },
  {
    id: 'wave_2',
    initialDelaySeconds: 0,
    delayBeforeNextWaveSeconds: 5,
    spawnGroups: [
      {
        enemyId: 'zombie',
        count: 4,
        allowedLanes: [0, 2, 4, 1],
        laneMode: 'sequential',
        startOffsetSeconds: 0,
        intervalSeconds: 2.5,
      },
      {
        enemyId: 'husk',
        count: 2,
        allowedLanes: [1, 3],
        laneMode: 'sequential',
        startOffsetSeconds: 3,
        intervalSeconds: 4,
      },
    ],
  },
  {
    id: 'wave_3',
    initialDelaySeconds: 0,
    delayBeforeNextWaveSeconds: 5,
    spawnGroups: [
      {
        enemyId: 'zombie',
        count: 3,
        allowedLanes: [0, 2, 4],
        laneMode: 'sequential',
        startOffsetSeconds: 0,
        intervalSeconds: 2.2,
      },
      {
        enemyId: 'husk',
        count: 2,
        allowedLanes: [1, 3],
        laneMode: 'sequential',
        startOffsetSeconds: 2,
        intervalSeconds: 3.5,
      },
      {
        enemyId: 'pillager',
        count: 2,
        allowedLanes: [0, 4],
        laneMode: 'sequential',
        startOffsetSeconds: 4,
        intervalSeconds: 4,
      },
    ],
  },
  {
    id: 'wave_4',
    initialDelaySeconds: 0,
    delayBeforeNextWaveSeconds: 5,
    spawnGroups: [
      {
        enemyId: 'husk',
        count: 3,
        allowedLanes: [0, 2, 4],
        laneMode: 'sequential',
        startOffsetSeconds: 0,
        intervalSeconds: 2.8,
      },
      {
        enemyId: 'vindicator',
        count: 2,
        allowedLanes: [1, 3],
        laneMode: 'sequential',
        startOffsetSeconds: 2.5,
        intervalSeconds: 3.5,
      },
      {
        enemyId: 'pillager',
        count: 2,
        allowedLanes: [0, 3],
        laneMode: 'sequential',
        startOffsetSeconds: 4.5,
        intervalSeconds: 3.5,
      },
    ],
  },
  {
    id: 'wave_5',
    initialDelaySeconds: 0,
    delayBeforeNextWaveSeconds: 4,
    spawnGroups: [
      {
        enemyId: 'zombie',
        count: 5,
        allowedLanes: [0, 1, 2, 3, 4],
        laneMode: 'sequential',
        startOffsetSeconds: 0,
        intervalSeconds: 1.5,
      },
      {
        enemyId: 'husk',
        count: 3,
        allowedLanes: [1, 2, 3],
        laneMode: 'sequential',
        startOffsetSeconds: 2,
        intervalSeconds: 3,
      },
      {
        enemyId: 'vindicator',
        count: 3,
        allowedLanes: [0, 2, 4],
        laneMode: 'sequential',
        startOffsetSeconds: 4,
        intervalSeconds: 3,
      },
      {
        enemyId: 'pillager',
        count: 2,
        allowedLanes: [1, 3],
        laneMode: 'sequential',
        startOffsetSeconds: 5,
        intervalSeconds: 3.5,
      },
    ],
  },
];

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
  const seed = options.seed ?? 20261123;

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
    energyItems: {
      amount: 25,
      intervalSeconds: 5,
      region: { min: { x: 0.12, y: 0.12 }, max: { x: 0.88, y: 0.88 } },
      positions: [
        { x: 0.25, y: 0.22 },
        { x: 0.5, y: 0.5 },
        { x: 0.72, y: 0.78 },
        { x: 0.35, y: 0.72 },
        { x: 0.65, y: 0.28 },
      ],
    },
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
    seed: 20261123,
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
