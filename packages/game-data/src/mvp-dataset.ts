import { z } from 'zod';
import abilitiesJson from '../abilities/abilities.json';
import defendersJson from '../entities/defenders.json';
import enemiesJson from '../entities/enemies.json';
import grasslandJson from '../levels/grassland.json';
import playtestSandboxJson from '../levels/playtest-sandbox.json';
import fusionRecipesJson from '../recipes/fusion-recipes.json';
import {
  nonNegativeIntegerSchema,
  nonNegativeNumberSchema,
  positiveIntegerSchema,
  positiveNumberSchema,
  stableIdSchema,
} from './schemas/shared';

const hexColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Expected a 6-digit hex color string (#rrggbb)');
const unitIntervalSchema = z.number().finite().min(0).max(1);
const positiveUnitIntervalSchema = z.number().finite().gt(0).max(1);

export const targetingStrategySchema = z.enum([
  'CLOSEST_TO_BASE',
  'CLOSEST_TO_DEFENDER',
  'HIGHEST_HP',
  'LOWEST_HP',
  'FASTEST',
  'FIRST_VALID',
]);

export const enemyBehaviorSchema = z.enum(['STOP_AND_ATTACK', 'IGNORE_DEFENDER']);
export const abilityDamageTypeSchema = z.enum(['physical', 'fire', 'ice']);
export const abilityTargetScopeSchema = z.enum([
  'self',
  'same-lane-enemies',
  'same-lane-enemies-ahead',
  'same-lane-enemy-in-range',
  'all-enemies',
  'melee-enemy',
  'area-3x3-closest-enemy',
  'area-3x3-self',
  'front-3-cells',
  'first-enemy-per-lane',
  'highest-hp-same-lane',
  'ally-3x3',
]);

const instantDamageScopeSchema = z.enum([
  'same-lane-enemies',
  'same-lane-enemies-ahead',
  'all-enemies',
  'area-3x3-self',
  'front-3-cells',
  'first-enemy-per-lane',
  'highest-hp-same-lane',
]);

const statusEffectScopeSchema = z.enum([
  'self',
  'same-lane-enemies',
  'same-lane-enemies-ahead',
  'all-enemies',
  'area-3x3-self',
  'front-3-cells',
  'first-enemy-per-lane',
  'highest-hp-same-lane',
  'ally-3x3',
]);

export const attachedStatusSpecSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('slow'),
    slowPct: unitIntervalSchema,
    durationSeconds: positiveNumberSchema,
  }),
  z.strictObject({
    kind: z.literal('stun'),
    durationSeconds: positiveNumberSchema,
  }),
  z.strictObject({
    kind: z.literal('freeze'),
    durationSeconds: positiveNumberSchema,
  }),
  z.strictObject({
    kind: z.literal('vulnerable'),
    damageTakenBonusPct: nonNegativeNumberSchema,
    durationSeconds: positiveNumberSchema,
  }),
  z.strictObject({
    kind: z.literal('burn'),
    damageMultiplierPerSecond: positiveNumberSchema,
    durationSeconds: positiveNumberSchema,
    tickIntervalSeconds: positiveNumberSchema,
    damageType: z.literal('fire').optional(),
  }),
  z.strictObject({
    kind: z.literal('buff'),
    attackSpeedBonusPct: nonNegativeNumberSchema,
    attackDamageBonusPct: nonNegativeNumberSchema,
    durationSeconds: positiveNumberSchema,
  }),
]);

export const abilityEffectSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('instant-damage'),
    scope: instantDamageScopeSchema,
    radius: nonNegativeIntegerSchema.optional(),
    frontCells: positiveIntegerSchema.optional(),
    damageMultiplier: positiveNumberSchema,
    bonusDamageMultiplierIfChilled: nonNegativeNumberSchema.optional(),
    bonusDamageMultiplierIfBurnOrFreeze: nonNegativeNumberSchema.optional(),
    damageType: abilityDamageTypeSchema,
    armorPiercing: z.boolean().optional(),
    shieldPiercing: z.boolean().optional(),
    applyStatus: attachedStatusSpecSchema.optional(),
    applyStatuses: z.array(attachedStatusSpecSchema).optional(),
  }),
  z.strictObject({
    kind: z.literal('status'),
    scope: statusEffectScopeSchema,
    radius: nonNegativeIntegerSchema.optional(),
    frontCells: positiveIntegerSchema.optional(),
    status: attachedStatusSpecSchema,
  }),
  z.strictObject({
    kind: z.literal('shield'),
    shieldMaxHpPct: positiveNumberSchema,
    frontSlowZone: z.strictObject({
      slowPct: unitIntervalSchema,
      residualDurationSeconds: positiveNumberSchema,
    }).optional(),
  }),
  z.strictObject({
    kind: z.literal('redirect'),
    radius: nonNegativeIntegerSchema,
    redirectSharePct: positiveUnitIntervalSchema,
    durationSeconds: positiveNumberSchema,
  }),
  z.strictObject({
    kind: z.literal('multihit-projectile'),
    count: positiveIntegerSchema,
    intervalSeconds: nonNegativeNumberSchema,
    damageMultiplier: positiveNumberSchema,
    targetMaxHpBonusPct: nonNegativeNumberSchema.optional(),
    damageType: abilityDamageTypeSchema,
    projectileSpeed: positiveNumberSchema,
    pierce: z.boolean(),
    armorPiercing: z.boolean().optional(),
    shieldPiercing: z.boolean().optional(),
    applyStatus: attachedStatusSpecSchema.optional(),
    applyStatuses: z.array(attachedStatusSpecSchema).optional(),
  }),
  z.strictObject({
    kind: z.literal('projectile'),
    damageMultiplier: positiveNumberSchema,
    targetMaxHpBonusPct: nonNegativeNumberSchema.optional(),
    damageType: abilityDamageTypeSchema,
    projectileSpeed: positiveNumberSchema,
    pierce: z.boolean(),
    armorPiercing: z.boolean().optional(),
    shieldPiercing: z.boolean().optional(),
    applyStatus: attachedStatusSpecSchema.optional(),
    applyStatuses: z.array(attachedStatusSpecSchema).optional(),
  }),
  z.strictObject({
    kind: z.literal('multihit-melee'),
    count: positiveIntegerSchema,
    intervalSeconds: nonNegativeNumberSchema,
    damageMultiplier: positiveNumberSchema,
    damageType: abilityDamageTypeSchema,
    range: positiveNumberSchema.optional(),
    armorPiercing: z.boolean().optional(),
    shieldPiercing: z.boolean().optional(),
    applyStatus: attachedStatusSpecSchema.optional(),
  }),
  z.strictObject({
    kind: z.literal('multihit-falling-area'),
    count: positiveIntegerSchema,
    intervalSeconds: nonNegativeNumberSchema,
    travelSeconds: positiveNumberSchema,
    radius: nonNegativeIntegerSchema,
    sameLaneOnly: z.boolean().optional(),
    damageMultiplier: positiveNumberSchema,
    damageType: abilityDamageTypeSchema,
    armorPiercing: z.boolean().optional(),
    shieldPiercing: z.boolean().optional(),
    applyStatus: attachedStatusSpecSchema.optional(),
  }),
  z.strictObject({
    kind: z.literal('resource-burst'),
    amount: positiveIntegerSchema,
    itemCount: positiveIntegerSchema,
    spawnAsItems: z.boolean(),
  }),
]);

export const economyProductionSchema = z.strictObject({
  itemCount: positiveIntegerSchema,
  amountPerItem: positiveIntegerSchema,
  initialDelaySeconds: positiveNumberSchema,
  intervalSeconds: positiveNumberSchema,
});

export const villageChestSchema = z.strictObject({
  enabled: z.boolean(),
  amount: positiveIntegerSchema,
  intervalSeconds: positiveNumberSchema,
});

export const mvpAbilitySchema = z.strictObject({
  id: stableIdSchema,
  ownerDefenderId: stableIdSchema,
  powerCrystalCost: nonNegativeIntegerSchema,
  cooldownSeconds: nonNegativeNumberSchema,
  requiresTarget: z.boolean(),
  targetScope: abilityTargetScopeSchema,
  allowWhileDisabled: z.boolean().optional(),
  effects: z.array(abilityEffectSchema).min(1),
});

export const mvpDefenderSchema = z.strictObject({
  id: stableIdSchema,
  name: z.string().min(1),
  shortLabel: z.string().min(1).max(6),
  tier: z.union([z.literal(1), z.literal(2)]),
  role: z.string().min(1),
  color: hexColorSchema,
  accentColor: hexColorSchema,
  summonEnergyCost: nonNegativeIntegerSchema,
  summonCooldownSeconds: nonNegativeNumberSchema,
  maxHp: positiveNumberSchema,
  damage: nonNegativeNumberSchema,
  attackSpeed: positiveNumberSchema,
  attackRange: nonNegativeNumberSchema,
  targeting: targetingStrategySchema,
  armor: nonNegativeNumberSchema,
  attackDamageType: abilityDamageTypeSchema.optional(),
  basicAttackStatus: attachedStatusSpecSchema.optional(),
  economyProduction: economyProductionSchema.optional(),
  abilityId: stableIdSchema,
  abilityName: z.string().min(1),
  abilitySummary: z.string().min(1),
  requiresTarget: z.boolean(),
});

export const mvpEnemySchema = z.strictObject({
  id: stableIdSchema,
  name: z.string().min(1),
  shortLabel: z.string().min(1).max(6),
  color: hexColorSchema,
  role: z.string().min(1),
  maxHp: positiveNumberSchema,
  moveSpeed: positiveNumberSchema,
  behavior: enemyBehaviorSchema,
  damage: nonNegativeNumberSchema,
  attackSpeed: positiveNumberSchema,
  attackRange: nonNegativeNumberSchema,
  armor: nonNegativeNumberSchema,
  fireResistancePct: unitIntervalSchema,
  freezeResistancePct: unitIntervalSchema,
  freezeImmune: z.boolean(),
  energyReward: nonNegativeIntegerSchema,
  crystalReward: nonNegativeIntegerSchema,
  crystalDropChance: unitIntervalSchema,
});

export const mvpFusionRecipeSchema = z.strictObject({
  id: stableIdSchema,
  inputs: z.tuple([stableIdSchema, stableIdSchema]),
  output: stableIdSchema,
  label: z.string().min(1),
});

export const mvpSpawnGroupSchema = z.strictObject({
  enemyId: stableIdSchema,
  count: positiveIntegerSchema,
  allowedLanes: z.array(nonNegativeIntegerSchema).min(1),
  laneMode: z.enum(['fixed', 'sequential', 'random']),
  startOffsetSeconds: nonNegativeNumberSchema,
  intervalSeconds: nonNegativeNumberSchema,
});

export const mvpWaveSchema = z.strictObject({
  id: stableIdSchema,
  initialDelaySeconds: nonNegativeNumberSchema,
  delayBeforeNextWaveSeconds: nonNegativeNumberSchema,
  spawnGroups: z.array(mvpSpawnGroupSchema).min(1),
});

const energyItemsSchema = z.strictObject({
  amount: positiveIntegerSchema,
  intervalSeconds: positiveNumberSchema,
  region: z.strictObject({
    min: z.strictObject({ x: unitIntervalSchema, y: unitIntervalSchema }),
    max: z.strictObject({ x: unitIntervalSchema, y: unitIntervalSchema }),
  }),
  positions: z.array(z.strictObject({ x: unitIntervalSchema, y: unitIntervalSchema })).min(1),
});

export const mvpGrasslandLevelSchema = z.strictObject({
  id: stableIdSchema,
  seed: z.number().int(),
  rows: positiveIntegerSchema,
  columns: positiveIntegerSchema,
  fusionGloveCooldownSeconds: nonNegativeNumberSchema,
  initialEmeralds: nonNegativeIntegerSchema,
  enablePassiveEnergy: z.boolean(),
  villageChest: villageChestSchema,
  waveCrystals: z.array(nonNegativeIntegerSchema).min(1),
  energyItems: energyItemsSchema,
  waves: z.array(mvpWaveSchema).min(1),
});

export const mvpSandboxLevelSchema = z.strictObject({
  id: stableIdSchema,
  seed: z.number().int(),
  rows: positiveIntegerSchema,
  columns: positiveIntegerSchema,
  initialEmeralds: nonNegativeIntegerSchema,
  enablePassiveEnergy: z.boolean(),
  villageChest: villageChestSchema,
  waveCrystals: z.array(nonNegativeIntegerSchema).min(1),
  waves: z.array(mvpWaveSchema).min(1),
});

function checkUniqueIds(items: readonly { id: string }[], path: string[], label: string, ctx: z.RefinementCtx): void {
  const seen = new Set<string>();
  items.forEach((item, index) => {
    if (seen.has(item.id)) {
      ctx.addIssue({ code: 'custom', path: [...path, index, 'id'], message: `Duplicate ${label} ID: ${item.id}` });
    }
    seen.add(item.id);
  });
}

function validateLevelWaves(
  waves: readonly z.infer<typeof mvpWaveSchema>[],
  waveCrystals: readonly number[],
  rows: number,
  enemyIds: ReadonlySet<string>,
  pathPrefix: string[],
  ctx: z.RefinementCtx,
): void {
  checkUniqueIds(waves, [...pathPrefix, 'waves'], `${pathPrefix[0]} wave`, ctx);
  if (waveCrystals.length !== waves.length) {
    ctx.addIssue({
      code: 'custom',
      path: [...pathPrefix, 'waveCrystals'],
      message: `Expected waveCrystals length (${waveCrystals.length}) to match waves length (${waves.length})`,
    });
  }
  waves.forEach((wave, waveIndex) => {
    wave.spawnGroups.forEach((group, groupIndex) => {
      if (!enemyIds.has(group.enemyId)) {
        ctx.addIssue({
          code: 'custom',
          path: [...pathPrefix, 'waves', waveIndex, 'spawnGroups', groupIndex, 'enemyId'],
          message: `Unknown enemyId in wave: ${group.enemyId}`,
        });
      }
      group.allowedLanes.forEach((lane, laneIndex) => {
        if (lane < 0 || lane >= rows) {
          ctx.addIssue({
            code: 'custom',
            path: [...pathPrefix, 'waves', waveIndex, 'spawnGroups', groupIndex, 'allowedLanes', laneIndex],
            message: `Lane index ${lane} is outside [0, ${rows - 1}]`,
          });
        }
      });
    });
  });
}

export const mvpDatasetSchema = z.strictObject({
  defenders: z.array(mvpDefenderSchema),
  enemies: z.array(mvpEnemySchema),
  fusionRecipes: z.array(mvpFusionRecipeSchema),
  abilities: z.array(mvpAbilitySchema),
  grasslandLevel: mvpGrasslandLevelSchema,
  sandboxLevel: mvpSandboxLevelSchema,
}).superRefine((dataset, ctx) => {
  checkUniqueIds(dataset.defenders, ['defenders'], 'defender', ctx);
  checkUniqueIds(dataset.enemies, ['enemies'], 'enemy', ctx);
  checkUniqueIds(dataset.fusionRecipes, ['fusionRecipes'], 'fusion recipe', ctx);
  checkUniqueIds(dataset.abilities, ['abilities'], 'ability', ctx);

  const baseCount = dataset.defenders.filter(d => d.tier === 1).length;
  const fusionCount = dataset.defenders.filter(d => d.tier === 2).length;
  if (baseCount !== 6 || fusionCount !== 16) {
    ctx.addIssue({
      code: 'custom',
      path: ['defenders'],
      message: `Expected 6 Tier-1 and 16 Tier-2 Defenders; found ${baseCount} Tier-1 and ${fusionCount} Tier-2`,
    });
  }
  if (dataset.enemies.length !== 4) {
    ctx.addIssue({ code: 'custom', path: ['enemies'], message: `Expected 4 Enemies; found ${dataset.enemies.length}` });
  }
  if (dataset.fusionRecipes.length !== 16) {
    ctx.addIssue({ code: 'custom', path: ['fusionRecipes'], message: `Expected 16 Fusion Recipes; found ${dataset.fusionRecipes.length}` });
  }
  if (dataset.abilities.length !== 22) {
    ctx.addIssue({ code: 'custom', path: ['abilities'], message: `Expected 22 Abilities; found ${dataset.abilities.length}` });
  }

  const defendersById = new Map(dataset.defenders.map(d => [d.id, d]));
  const abilitiesById = new Map(dataset.abilities.map(a => [a.id, a]));
  const enemyIds = new Set(dataset.enemies.map(e => e.id));

  dataset.defenders.forEach((defender, index) => {
    const ability = abilitiesById.get(defender.abilityId);
    if (!ability) {
      ctx.addIssue({
        code: 'custom',
        path: ['defenders', index, 'abilityId'],
        message: `Unknown abilityId: ${defender.abilityId}`,
      });
    } else if (ability.ownerDefenderId !== defender.id) {
      ctx.addIssue({
        code: 'custom',
        path: ['defenders', index, 'abilityId'],
        message: `Ability ${ability.id} belongs to ${ability.ownerDefenderId}, not ${defender.id}`,
      });
    }
  });

  dataset.abilities.forEach((ability, index) => {
    const owner = defendersById.get(ability.ownerDefenderId);
    if (!owner) {
      ctx.addIssue({
        code: 'custom',
        path: ['abilities', index, 'ownerDefenderId'],
        message: `Unknown ownerDefenderId: ${ability.ownerDefenderId}`,
      });
    } else if (owner.abilityId !== ability.id) {
      ctx.addIssue({
        code: 'custom',
        path: ['abilities', index, 'ownerDefenderId'],
        message: `Defender ${owner.id} references ${owner.abilityId}, not ${ability.id}`,
      });
    }
  });

  const seenPairs = new Set<string>();
  dataset.fusionRecipes.forEach((recipe, index) => {
    recipe.inputs.forEach((inputId, inputIdx) => {
      if (!defendersById.has(inputId)) {
        ctx.addIssue({
          code: 'custom',
          path: ['fusionRecipes', index, 'inputs', inputIdx],
          message: `Unknown recipe input Defender: ${inputId}`,
        });
      }
    });
    if (!defendersById.has(recipe.output)) {
      ctx.addIssue({
        code: 'custom',
        path: ['fusionRecipes', index, 'output'],
        message: `Unknown recipe output Defender: ${recipe.output}`,
      });
    }
    const unorderedKey = [...recipe.inputs].sort().join('|');
    if (seenPairs.has(unorderedKey)) {
      ctx.addIssue({
        code: 'custom',
        path: ['fusionRecipes', index, 'inputs'],
        message: `Duplicate unordered Fusion input pair: ${unorderedKey}`,
      });
    }
    seenPairs.add(unorderedKey);
  });

  if (dataset.grasslandLevel.rows !== 5 || dataset.grasslandLevel.columns !== 9) {
    ctx.addIssue({
      code: 'custom',
      path: ['grasslandLevel'],
      message: 'Grassland level must be 5 rows x 9 columns',
    });
  }
  if (dataset.grasslandLevel.waves.length !== 5) {
    ctx.addIssue({
      code: 'custom',
      path: ['grasslandLevel', 'waves'],
      message: `Grassland level must have 5 waves; found ${dataset.grasslandLevel.waves.length}`,
    });
  }

  validateLevelWaves(
    dataset.grasslandLevel.waves,
    dataset.grasslandLevel.waveCrystals,
    dataset.grasslandLevel.rows,
    enemyIds,
    ['grasslandLevel'],
    ctx,
  );
  validateLevelWaves(
    dataset.sandboxLevel.waves,
    dataset.sandboxLevel.waveCrystals,
    dataset.sandboxLevel.rows,
    enemyIds,
    ['sandboxLevel'],
    ctx,
  );
});

export type MvpDefenderData = z.infer<typeof mvpDefenderSchema>;
export type MvpEnemyData = z.infer<typeof mvpEnemySchema>;
export type MvpFusionRecipeData = z.infer<typeof mvpFusionRecipeSchema>;
export type MvpAbilityData = z.infer<typeof mvpAbilitySchema>;
export type MvpWaveData = z.infer<typeof mvpWaveSchema>;
export type MvpEconomyProductionData = z.infer<typeof economyProductionSchema>;
export type MvpVillageChestData = z.infer<typeof villageChestSchema>;
export type MvpGrasslandLevelData = z.infer<typeof mvpGrasslandLevelSchema>;
export type MvpSandboxLevelData = z.infer<typeof mvpSandboxLevelSchema>;
export type MvpDataset = z.infer<typeof mvpDatasetSchema>;

export const playtestDefenderSyncSchema = z.strictObject({
  id: stableIdSchema,
  tier: z.union([z.literal(1), z.literal(2)]),
  summonEnergyCost: nonNegativeIntegerSchema,
  summonCooldownSeconds: nonNegativeNumberSchema.optional(),
  maxHp: positiveNumberSchema,
  damage: nonNegativeNumberSchema,
  attackSpeed: positiveNumberSchema,
  attackRange: nonNegativeNumberSchema,
  targeting: targetingStrategySchema,
  armor: nonNegativeNumberSchema,
  attackDamageType: abilityDamageTypeSchema.optional(),
  basicAttackStatus: attachedStatusSpecSchema.optional(),
  economyProduction: economyProductionSchema.optional(),
});

export const playtestEnemySyncSchema = z.strictObject({
  id: stableIdSchema,
  maxHp: positiveNumberSchema,
  moveSpeed: positiveNumberSchema,
  behavior: enemyBehaviorSchema,
  damage: nonNegativeNumberSchema,
  attackSpeed: positiveNumberSchema,
  attackRange: nonNegativeNumberSchema,
  armor: nonNegativeNumberSchema,
  fireResistancePct: unitIntervalSchema,
  freezeResistancePct: unitIntervalSchema,
  freezeImmune: z.boolean(),
  energyReward: nonNegativeIntegerSchema,
  crystalReward: nonNegativeIntegerSchema,
  crystalDropChance: unitIntervalSchema.optional(),
});

export const playtestPresetSyncSchema = z.strictObject({
  seed: z.number().int(),
  fusionGloveCooldownSeconds: nonNegativeNumberSchema.optional(),
  initialEmeralds: nonNegativeIntegerSchema.optional(),
  enablePassiveEnergy: z.boolean().optional(),
  villageChest: villageChestSchema.optional(),
  defenders: z.array(playtestDefenderSyncSchema),
  enemies: z.array(playtestEnemySyncSchema),
  abilities: z.array(mvpAbilitySchema),
  waves: z.array(mvpWaveSchema),
  waveCrystals: z.array(nonNegativeIntegerSchema),
});

export type PlaytestPresetSyncInput = z.infer<typeof playtestPresetSyncSchema>;

/** Parse a #rrggbb hex color string into a 24-bit numeric color value for Phaser. */
export function parseHexColor(hex: string): number {
  const parsed = hexColorSchema.parse(hex);
  return Number.parseInt(parsed.slice(1), 16);
}

/** Parse and validate an assembled MVP game dataset against strict schemas and referential checks. */
export function validateMvpDataset(candidate: unknown): MvpDataset {
  return mvpDatasetSchema.parse(candidate);
}

/**
 * Validate a Playtest balance preset and merge its gameplay values into a deep clone
 * of `baseDataset`, preserving UI metadata, fusion recipes, energy items, and sandbox waves.
 */
export function mergePlaytestPresetIntoDataset(
  baseDataset: MvpDataset,
  rawPreset: unknown,
): MvpDataset {
  const preset = playtestPresetSyncSchema.parse(rawPreset);

  const baseDefIds = new Set(baseDataset.defenders.map(d => d.id));
  const presetDefMap = new Map<string, z.infer<typeof playtestDefenderSyncSchema>>();
  for (const def of preset.defenders) {
    if (!baseDefIds.has(def.id)) {
      throw new Error(`Unknown defender ID in balance preset: ${def.id}`);
    }
    if (presetDefMap.has(def.id)) {
      throw new Error(`Duplicate defender ID in balance preset: ${def.id}`);
    }
    presetDefMap.set(def.id, def);
  }
  for (const baseDef of baseDataset.defenders) {
    if (!presetDefMap.has(baseDef.id)) {
      throw new Error(`Missing defender in balance preset: ${baseDef.id}`);
    }
  }

  const baseEnemyIds = new Set(baseDataset.enemies.map(e => e.id));
  const presetEnemyMap = new Map<string, z.infer<typeof playtestEnemySyncSchema>>();
  for (const enemy of preset.enemies) {
    if (!baseEnemyIds.has(enemy.id)) {
      throw new Error(`Unknown enemy ID in balance preset: ${enemy.id}`);
    }
    if (presetEnemyMap.has(enemy.id)) {
      throw new Error(`Duplicate enemy ID in balance preset: ${enemy.id}`);
    }
    presetEnemyMap.set(enemy.id, enemy);
  }
  for (const baseEnemy of baseDataset.enemies) {
    if (!presetEnemyMap.has(baseEnemy.id)) {
      throw new Error(`Missing enemy in balance preset: ${baseEnemy.id}`);
    }
  }

  const abilityByDefenderId = new Map(preset.abilities.map(a => [a.ownerDefenderId, a]));

  const mergedDefenders: MvpDefenderData[] = baseDataset.defenders.map(baseDef => {
    const tuned = presetDefMap.get(baseDef.id)!;
    const ability = abilityByDefenderId.get(baseDef.id);
    const next: MvpDefenderData = {
      id: baseDef.id,
      name: baseDef.name,
      shortLabel: baseDef.shortLabel,
      tier: tuned.tier,
      role: baseDef.role,
      color: baseDef.color,
      accentColor: baseDef.accentColor,
      summonEnergyCost: tuned.summonEnergyCost,
      summonCooldownSeconds: tuned.summonCooldownSeconds ?? baseDef.summonCooldownSeconds,
      maxHp: tuned.maxHp,
      damage: tuned.damage,
      attackSpeed: tuned.attackSpeed,
      attackRange: tuned.attackRange,
      targeting: tuned.targeting,
      armor: tuned.armor,
      ...(tuned.attackDamageType ? { attackDamageType: tuned.attackDamageType } : {}),
      ...(tuned.basicAttackStatus ? { basicAttackStatus: structuredClone(tuned.basicAttackStatus) } : {}),
      ...(tuned.economyProduction
        ? { economyProduction: structuredClone(tuned.economyProduction) }
        : baseDef.economyProduction
          ? { economyProduction: structuredClone(baseDef.economyProduction) }
          : {}),
      abilityId: baseDef.abilityId,
      abilityName: baseDef.abilityName,
      abilitySummary: baseDef.abilitySummary,
      requiresTarget: ability ? ability.requiresTarget : baseDef.requiresTarget,
    };
    return next;
  });

  const mergedEnemies: MvpEnemyData[] = baseDataset.enemies.map(baseEnemy => {
    const tuned = presetEnemyMap.get(baseEnemy.id)!;
    return {
      id: baseEnemy.id,
      name: baseEnemy.name,
      shortLabel: baseEnemy.shortLabel,
      color: baseEnemy.color,
      role: baseEnemy.role,
      maxHp: tuned.maxHp,
      moveSpeed: tuned.moveSpeed,
      behavior: tuned.behavior,
      damage: tuned.damage,
      attackSpeed: tuned.attackSpeed,
      attackRange: tuned.attackRange,
      armor: tuned.armor,
      fireResistancePct: tuned.fireResistancePct,
      freezeResistancePct: tuned.freezeResistancePct,
      freezeImmune: tuned.freezeImmune,
      energyReward: tuned.energyReward,
      crystalReward: tuned.crystalReward,
      crystalDropChance: tuned.crystalDropChance ?? baseEnemy.crystalDropChance,
    };
  });

  const merged: MvpDataset = {
    defenders: mergedDefenders,
    enemies: mergedEnemies,
    fusionRecipes: structuredClone(baseDataset.fusionRecipes),
    abilities: structuredClone(preset.abilities),
    grasslandLevel: {
      ...structuredClone(baseDataset.grasslandLevel),
      seed: preset.seed,
      fusionGloveCooldownSeconds:
        preset.fusionGloveCooldownSeconds ?? baseDataset.grasslandLevel.fusionGloveCooldownSeconds,
      initialEmeralds: preset.initialEmeralds ?? baseDataset.grasslandLevel.initialEmeralds,
      enablePassiveEnergy:
        preset.enablePassiveEnergy ?? baseDataset.grasslandLevel.enablePassiveEnergy,
      villageChest: preset.villageChest
        ? structuredClone(preset.villageChest)
        : structuredClone(baseDataset.grasslandLevel.villageChest),
      waveCrystals: [...preset.waveCrystals],
      waves: structuredClone(preset.waves),
    },
    sandboxLevel: structuredClone(baseDataset.sandboxLevel),
  };

  return validateMvpDataset(merged);
}

/** Validated singleton JSON dataset powering both Campaign (/) and Playtest (/playtest). */
export const MVP_GAME_DATA: MvpDataset = validateMvpDataset({
  defenders: defendersJson,
  enemies: enemiesJson,
  fusionRecipes: fusionRecipesJson,
  abilities: abilitiesJson,
  grasslandLevel: grasslandJson,
  sandboxLevel: playtestSandboxJson,
});
