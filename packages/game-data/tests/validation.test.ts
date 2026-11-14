import { describe, expect, it } from 'vitest';
import { ZodError } from 'zod';
import {
  abilityDefinitionSchema,
  defenderDefinitionSchema,
  enemyDefinitionSchema,
  fusionRecipeSchema,
  levelDefinitionSchema,
  loadRuntimeData,
  resourceConfigurationSchema,
  validateGameData,
  waveDefinitionSchema,
} from '../src';

// Synthetic test-only numbers and IDs. Never import this fixture as approved gameplay content.
function syntheticBundle() {
  const defenders = Array.from({ length: 12 }, (_, index) => ({
    id: index < 5 ? `base_${index + 1}` : `fusion_${index - 4}`,
    classification: index < 5 ? 'base' as const : 'fusion' as const,
    tier: index < 5 ? 1 : 2,
    abilityId: `ability_${index + 1}`,
    stats: { maxHp: 10, damage: 2, attackSpeed: 1, attackRange: 3 },
    ...(index < 5 ? { summonEnergyCost: 1 } : {}),
  }));
  return {
    schemaVersion: 1,
    contentStatus: 'approved' as const, // Simulates a future approved fixture; no production dataset is exported.
    defenders,
    enemies: Array.from({ length: 4 }, (_, index) => ({
      id: `enemy_${index + 1}`, classification: 'enemy' as const,
      stats: { maxHp: 10, moveSpeed: 1 }, rewards: { energy: 0, powerCrystals: 0 },
    })),
    fusionRecipes: Array.from({ length: 7 }, (_, index) => ({
      id: `recipe_${index + 1}`,
      inputDefenderIds: index < 5
        ? [defenders[index].id, defenders[index].id] as [string, string]
        : [defenders[0].id, defenders[index - 3].id] as [string, string],
      outputDefenderId: defenders[index + 5].id,
    })),
    abilities: defenders.map((defender, index) => ({
      id: `ability_${index + 1}`, ownerDefenderId: defender.id,
      powerCrystalCost: 1, cooldownSeconds: 1,
    })),
    levels: [{ id: 'test_grassland', rows: 5, columns: 9, waveIds: Array.from({ length: 5 }, (_, index) => `wave_${index + 1}`) }],
    waves: Array.from({ length: 5 }, (_, index) => ({ id: `wave_${index + 1}`, spawns: [{ enemyId: 'enemy_1', count: 1, atSeconds: 1 }] })),
    resources: {
      initialEnergy: 0, passiveEnergyAmount: 1, passiveEnergyIntervalSeconds: 1,
      maxEnergy: 'unlimited' as const, initialPowerCrystals: 0, maxPowerCrystals: 5,
      energyItemLifetimeSeconds: 1, powerCrystalItemLifetimeSeconds: 1,
    },
  };
}

function runtimeIssues(candidate: unknown) {
  try {
    loadRuntimeData(candidate);
    throw new Error('Expected runtime validation to reject the candidate');
  } catch (error) {
    expect(error).toBeInstanceOf(ZodError);
    return (error as ZodError).issues;
  }
}

describe('independent category schemas', () => {
  it('accepts each valid category independently', () => {
    const data = syntheticBundle();
    expect(defenderDefinitionSchema.safeParse(data.defenders[0]).success).toBe(true);
    expect(enemyDefinitionSchema.safeParse(data.enemies[0]).success).toBe(true);
    expect(fusionRecipeSchema.safeParse(data.fusionRecipes[0]).success).toBe(true);
    expect(abilityDefinitionSchema.safeParse(data.abilities[0]).success).toBe(true);
    expect(levelDefinitionSchema.safeParse(data.levels[0]).success).toBe(true);
    expect(waveDefinitionSchema.safeParse(data.waves[0]).success).toBe(true);
    expect(resourceConfigurationSchema.safeParse(data.resources).success).toBe(true);
  });
  it('rejects an invalid field type', () => {
    expect(defenderDefinitionSchema.safeParse({ id: 'x', classification: 'base', tier: '1' }).success).toBe(false);
  });
  it('rejects a missing required field', () => {
    expect(fusionRecipeSchema.safeParse({ id: 'r', inputDefenderIds: ['a', 'b'] }).success).toBe(false);
  });
  it('rejects empty and malformed IDs', () => {
    expect(enemyDefinitionSchema.safeParse({ id: '', classification: 'enemy' }).success).toBe(false);
    expect(enemyDefinitionSchema.safeParse({ id: 'TBD', classification: 'enemy' }).success).toBe(false);
  });
  it('rejects negative resources and invalid caps', () => {
    expect(resourceConfigurationSchema.safeParse({ initialEnergy: -1 }).success).toBe(false);
    expect(resourceConfigurationSchema.safeParse({ maxPowerCrystals: -1 }).success).toBe(false);
  });
  it('keeps an effect-incomplete Ability structurally valid', () => {
    const ability = { id: 'test_ability', ownerDefenderId: 'test_defender' };
    expect(abilityDefinitionSchema.safeParse(ability).success).toBe(true);
  });
  it('accepts an optional valid cooldown and rejects an invalid supplied cooldown', () => {
    const ability = { id: 'test_ability', ownerDefenderId: 'test_defender' };
    expect(abilityDefinitionSchema.safeParse({ ...ability, cooldownSeconds: 1 }).success).toBe(true);
    const result = abilityDefinitionSchema.safeParse({ ...ability, cooldownSeconds: -1 });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues.some(issue => issue.path.join('.') === 'cooldownSeconds')).toBe(true);
  });
});

describe('bundle version and referential integrity', () => {
  it('accepts a structurally complete synthetic bundle', () => {
    expect(validateGameData(syntheticBundle()).schemaVersion).toBe(1);
  });
  it('rejects duplicate IDs in a namespace', () => {
    const data = syntheticBundle();
    data.enemies.push(data.enemies[0]);
    expect(() => validateGameData(data)).toThrow(/Duplicate enemies ID/);
  });
  it('rejects a broken Defender reference', () => {
    const data = syntheticBundle();
    data.fusionRecipes[0].outputDefenderId = 'missing_defender';
    expect(() => validateGameData(data)).toThrow(/Unknown Defender output/);
  });
  it('reports a wrong reference category', () => {
    const data = syntheticBundle();
    data.fusionRecipes[0].outputDefenderId = 'enemy_1';
    expect(() => validateGameData(data)).toThrow(/found an Enemy/);
  });
  it('accepts a Fusion recipe regardless of input order', () => {
    const data = syntheticBundle();
    data.fusionRecipes[0].inputDefenderIds.reverse();
    expect(validateGameData(data).fusionRecipes).toHaveLength(7);
  });
  it('rejects a duplicate Fusion recipe with reversed inputs', () => {
    const data = syntheticBundle();
    data.fusionRecipes.push({ ...data.fusionRecipes[0], id: 'extra_recipe', inputDefenderIds: [...data.fusionRecipes[0].inputDefenderIds].reverse() as [string, string] });
    expect(() => validateGameData(data)).toThrow(/Duplicate unordered Fusion input pair/);
  });
  it('rejects unsupported and missing schema versions', () => {
    const data = syntheticBundle();
    expect(() => validateGameData({ ...data, schemaVersion: 2 })).toThrow(/Unsupported Game Data schema version/);
    const { schemaVersion: _removed, ...missing } = data;
    expect(() => validateGameData(missing)).toThrow(/schemaVersion/);
  });
  it('rejects an Ability with an unknown owner or mismatched Defender reference', () => {
    const data = syntheticBundle();
    data.abilities[0].ownerDefenderId = 'enemy_1';
    expect(() => validateGameData(data)).toThrow(/Unknown Defender owner/);
    data.abilities[0].ownerDefenderId = data.defenders[1].id;
    expect(() => validateGameData(data)).toThrow(/belongs to/);
  });
  it('rejects an unknown Enemy in a Wave', () => {
    const data = syntheticBundle();
    data.waves[0].spawns[0].enemyId = 'base_1';
    expect(() => validateGameData(data)).toThrow(/found a Defender/);
  });
  it('rejects a resource balance above its configured cap', () => {
    const data = syntheticBundle();
    data.resources.initialPowerCrystals = 6;
    expect(() => validateGameData(data)).toThrow(/exceed the storage cap/);
  });
  it('does not mutate source definitions', () => {
    const data = syntheticBundle();
    const before = structuredClone(data);
    const parsed = validateGameData(data);
    expect(data).toEqual(before);
    expect(parsed).not.toBe(data);
    expect(data.fusionRecipes[0].inputDefenderIds).toEqual(before.fusionRecipes[0].inputDefenderIds);
  });
  it('allows future Fusion tiers without a universal ceiling', () => {
    const data = syntheticBundle();
    data.defenders[0].tier = 9;
    data.defenders[5].tier = 10;
    expect(validateGameData(data).defenders[5].tier).toBe(10);
  });
});

describe('runtime boundary', () => {
  it('rejects effect-incomplete Abilities even when the bundle says approved', () => {
    const issues = runtimeIssues(syntheticBundle());
    expect(issues.some(issue => issue.path.join('.') === 'abilities.0.effects' && issue.message.includes('effect contract'))).toBe(true);
  });
  it('rejects structurally valid but explicitly incomplete content', () => {
    const data = { ...syntheticBundle(), contentStatus: 'incomplete' };
    expect(validateGameData(data).contentStatus).toBe('incomplete');
    const issues = runtimeIssues(data);
    expect(issues.some(issue => issue.path.join('.') === 'contentStatus' && issue.message.includes('requires approved content'))).toBe(true);
    expect(issues.some(issue => issue.path.join('.') === 'abilities.0.effects')).toBe(true);
  });
  it('keeps cooldown absence unresolved without inserting a default', () => {
    const data = syntheticBundle();
    delete (data.abilities[0] as Partial<typeof data.abilities[0]>).cooldownSeconds;
    expect(abilityDefinitionSchema.safeParse(data.abilities[0]).success).toBe(true);
    expect(validateGameData(data).abilities[0].cooldownSeconds).toBeUndefined();
    const issues = runtimeIssues(data);
    expect(issues.some(issue => issue.path.join('.') === 'abilities.0.effects')).toBe(true);
    expect(issues.some(issue => issue.path.join('.') === 'abilities.0.cooldownSeconds')).toBe(false);
  });
  it('rejects missing combat balance independently of the effect blocker', () => {
    const data = syntheticBundle();
    delete (data.defenders[0] as Partial<typeof data.defenders[0]>).stats;
    const issues = runtimeIssues(data);
    expect(issues.some(issue => issue.path.join('.') === 'defenders.0.stats' && issue.message.includes('stats are missing'))).toBe(true);
  });
  it('enforces confirmed Grassland dimensions and five Waves', () => {
    const data = syntheticBundle();
    data.levels[0].rows = 6;
    data.levels[0].waveIds.pop();
    expect(runtimeIssues(data).some(issue => issue.path.join('.') === 'levels.0' && issue.message.includes('5 rows'))).toBe(true);
    data.levels[0].rows = 5;
    expect(runtimeIssues(data).some(issue => issue.path.join('.') === 'levels.0.waveIds' && issue.message.includes('5 Waves'))).toBe(true);
  });
  it('rejects absent Wave composition and timing', () => {
    const data = syntheticBundle();
    data.waves[0].spawns = [];
    expect(runtimeIssues(data).some(issue => issue.path.join('.') === 'waves.0.spawns' && issue.message.includes('composition/timing'))).toBe(true);
  });
});
