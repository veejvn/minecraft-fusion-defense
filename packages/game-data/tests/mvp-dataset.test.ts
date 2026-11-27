import { describe, expect, it } from 'vitest';
import {
  MVP_GAME_DATA,
  mergePlaytestPresetIntoDataset,
  parseHexColor,
  validateMvpDataset,
} from '../src';

describe('MVP JSON Game Dataset (@mfd/game-data)', () => {
  it('validates the checked-in JSON dataset cleanly with expected entity, recipe, ability, and wave counts', () => {
    const validated = validateMvpDataset(MVP_GAME_DATA);
    expect(validated.defenders).toHaveLength(20);
    expect(validated.defenders.filter(d => d.tier === 1)).toHaveLength(5);
    expect(validated.defenders.filter(d => d.tier === 2)).toHaveLength(15);
    expect(validated.enemies).toHaveLength(4);
    expect(validated.fusionRecipes).toHaveLength(15);
    expect(validated.abilities).toHaveLength(20);
    expect(validated.grasslandLevel.waves).toHaveLength(5);
    expect(validated.grasslandLevel.waveCrystals).toEqual([1, 1, 1, 1, 2]);
    expect(validated.sandboxLevel.waves).toHaveLength(5);
    expect(validated.sandboxLevel.waveCrystals).toEqual([1, 1, 1, 2, 2]);
  });

  it('matches Owner 2026-11-27 balance values and 2026-11-26 skill mechanics', () => {
    const byDef = new Map(MVP_GAME_DATA.defenders.map(d => [d.id, d]));
    const byEnemy = new Map(MVP_GAME_DATA.enemies.map(e => [e.id, e]));
    const byAbility = new Map(MVP_GAME_DATA.abilities.map(a => [a.id, a]));

    expect(MVP_GAME_DATA.grasslandLevel.seed).toBe(20261123);
    expect(MVP_GAME_DATA.grasslandLevel.fusionGloveCooldownSeconds).toBe(15);

    expect(byDef.get('iron_golem')).toMatchObject({
      summonEnergyCost: 50,
      summonCooldownSeconds: 10,
      maxHp: 450,
      damage: 25,
      attackSpeed: 0.6,
      attackRange: 1.1,
      armor: 5,
    });
    expect(byDef.get('snow_golem')).toMatchObject({
      summonEnergyCost: 75,
      summonCooldownSeconds: 5,
      maxHp: 250,
      damage: 20,
      attackSpeed: 0.8,
      attackRange: 3,
      attackDamageType: 'ice',
      basicAttackStatus: { kind: 'slow', slowPct: 0.35, durationSeconds: 2.5 },
    });
    expect(byDef.get('skeleton')).toMatchObject({
      summonEnergyCost: 100,
      summonCooldownSeconds: 5,
      maxHp: 100,
      damage: 25,
      attackSpeed: 1,
      attackRange: 9,
    });
    expect(byDef.get('blaze')).toMatchObject({
      summonEnergyCost: 200,
      summonCooldownSeconds: 8,
      maxHp: 180,
      damage: 50,
      attackSpeed: 0.8,
      attackRange: 9,
      attackDamageType: 'fire',
      basicAttackStatus: { kind: 'burn', damageMultiplierPerSecond: 0.2, durationSeconds: 3 },
    });
    expect(byDef.get('skeleton_sniper')?.damage).toBe(50);

    expect(byEnemy.get('zombie')).toMatchObject({ maxHp: 200, attackSpeed: 1, energyReward: 50 });
    expect(byEnemy.get('vindicator')).toMatchObject({ energyReward: 125, crystalReward: 1 });
    expect(byEnemy.get('pillager')).toMatchObject({ energyReward: 125, crystalReward: 1 });

    expect(byAbility.get('earthquake')?.targetScope).toBe('same-lane-enemies-ahead');
    expect(byAbility.get('arrow_storm')?.effects[0]).toMatchObject({
      kind: 'multihit-projectile',
      count: 16,
      intervalSeconds: 0.15,
    });
    expect(byAbility.get('inferno')?.effects[0]).toMatchObject({
      kind: 'multihit-falling-area',
      count: 8,
      intervalSeconds: 0.18,
      travelSeconds: 0.45,
    });
    expect(MVP_GAME_DATA.abilities.every(a => a.requiresTarget === false)).toBe(true);
    expect(parseHexColor('#94a3b8')).toBe(0x94a3b8);
  });

  it('rejects duplicate unordered recipes, unknown enemies, invalid hex colors, mismatched ability owners, out-of-range lanes, and invalid waveCrystals lengths', () => {
    const dupRecipe = structuredClone(MVP_GAME_DATA);
    dupRecipe.fusionRecipes[1].inputs = [...dupRecipe.fusionRecipes[0].inputs].reverse() as [string, string];
    expect(() => validateMvpDataset(dupRecipe)).toThrow(/Duplicate unordered Fusion input pair/);

    const badEnemy = structuredClone(MVP_GAME_DATA);
    badEnemy.grasslandLevel.waves[0].spawnGroups[0].enemyId = 'creeper';
    expect(() => validateMvpDataset(badEnemy)).toThrow(/Unknown enemyId/);

    const badAbilityOwner = structuredClone(MVP_GAME_DATA);
    badAbilityOwner.abilities[0].ownerDefenderId = badAbilityOwner.defenders[0].id;
    expect(() => validateMvpDataset(badAbilityOwner)).toThrow(/belongs to/);

    const badColor = structuredClone(MVP_GAME_DATA);
    badColor.defenders[0].color = '0x94a3b8';
    expect(() => validateMvpDataset(badColor)).toThrow();

    const badLane = structuredClone(MVP_GAME_DATA);
    badLane.grasslandLevel.waves[0].spawnGroups[0].allowedLanes = [5];
    expect(() => validateMvpDataset(badLane)).toThrow(/outside \[0, 4\]/);

    const badWaveCrystals = structuredClone(MVP_GAME_DATA);
    badWaveCrystals.grasslandLevel.waveCrystals.pop();
    expect(() => validateMvpDataset(badWaveCrystals)).toThrow(/waveCrystals length/);
  });

  it('merges a valid tuned Playtest preset into the JSON dataset while preserving UI metadata, recipes, energy items, and sandbox waves', () => {
    const before = structuredClone(MVP_GAME_DATA);
    const preset = {
      seed: 99999,
      fusionGloveCooldownSeconds: 12,
      defenders: MVP_GAME_DATA.defenders.map(d => ({
        id: d.id,
        tier: d.tier,
        summonEnergyCost: d.id === 'iron_golem' ? 60 : d.summonEnergyCost,
        summonCooldownSeconds: d.id === 'iron_golem' ? 9 : d.summonCooldownSeconds,
        maxHp: d.id === 'iron_golem' ? 500 : d.maxHp,
        damage: d.damage,
        attackSpeed: d.attackSpeed,
        attackRange: d.attackRange,
        targeting: d.targeting,
        armor: d.armor,
        ...(d.attackDamageType ? { attackDamageType: d.attackDamageType } : {}),
        ...(d.basicAttackStatus ? { basicAttackStatus: structuredClone(d.basicAttackStatus) } : {}),
      })),
      enemies: MVP_GAME_DATA.enemies.map(e => ({
        id: e.id,
        maxHp: e.id === 'zombie' ? 240 : e.maxHp,
        moveSpeed: e.moveSpeed,
        behavior: e.behavior,
        damage: e.damage,
        attackSpeed: e.attackSpeed,
        attackRange: e.attackRange,
        armor: e.armor,
        fireResistancePct: e.fireResistancePct,
        freezeResistancePct: e.freezeResistancePct,
        freezeImmune: e.freezeImmune,
        energyReward: e.id === 'vindicator' ? 140 : e.energyReward,
        crystalReward: e.crystalReward,
      })),
      abilities: structuredClone(MVP_GAME_DATA.abilities),
      waves: structuredClone(MVP_GAME_DATA.grasslandLevel.waves),
      waveCrystals: [1, 2, 1, 2, 2],
    };

    const merged = mergePlaytestPresetIntoDataset(MVP_GAME_DATA, preset);

    // Original dataset remains completely unmutated
    expect(MVP_GAME_DATA).toEqual(before);

    // Gameplay balance values & seed updated
    const mergedGolem = merged.defenders.find(d => d.id === 'iron_golem')!;
    expect(mergedGolem).toMatchObject({
      maxHp: 500,
      summonEnergyCost: 60,
      summonCooldownSeconds: 9,
      name: 'Iron Golem',
      color: '#94a3b8',
      role: 'Frontline Tank',
    });
    expect(merged.enemies.find(e => e.id === 'zombie')?.maxHp).toBe(240);
    expect(merged.enemies.find(e => e.id === 'vindicator')).toMatchObject({
      energyReward: 140,
      name: 'Vindicator',
      color: '#2563eb',
    });
    expect(merged.grasslandLevel.seed).toBe(99999);
    expect(merged.grasslandLevel.fusionGloveCooldownSeconds).toBe(12);
    expect(merged.grasslandLevel.waveCrystals).toEqual([1, 2, 1, 2, 2]);

    // Preserved structural sections
    expect(merged.grasslandLevel.energyItems).toEqual(MVP_GAME_DATA.grasslandLevel.energyItems);
    expect(merged.fusionRecipes).toEqual(MVP_GAME_DATA.fusionRecipes);
    expect(merged.sandboxLevel).toEqual(MVP_GAME_DATA.sandboxLevel);

    // Rejects unknown defender, negative stats, or mismatched waveCrystals
    const unknownDef = structuredClone(preset);
    unknownDef.defenders[0].id = 'unknown_golem';
    expect(() => mergePlaytestPresetIntoDataset(MVP_GAME_DATA, unknownDef)).toThrow(/Unknown defender ID/);

    const missingEnemy = structuredClone(preset);
    missingEnemy.enemies.pop();
    expect(() => mergePlaytestPresetIntoDataset(MVP_GAME_DATA, missingEnemy)).toThrow(/Missing enemy/);

    const badWaveCount = structuredClone(preset);
    badWaveCount.waveCrystals.pop();
    expect(() => mergePlaytestPresetIntoDataset(MVP_GAME_DATA, badWaveCount)).toThrow(/waveCrystals length/);
  });
});
