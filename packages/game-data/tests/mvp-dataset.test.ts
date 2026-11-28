import { describe, expect, it } from 'vitest';
import {
  MVP_GAME_DATA,
  mergeCampaignLevelsIntoDataset,
  mergePlaytestPresetIntoDataset,
  parseHexColor,
  validateMvpDataset,
} from '../src';

describe('MVP JSON Game Dataset (@mfd/game-data)', () => {
  it('validates the checked-in JSON dataset cleanly with expected entity, recipe, ability, and wave counts', () => {
    const validated = validateMvpDataset(MVP_GAME_DATA);
    expect(validated.defenders).toHaveLength(22);
    expect(validated.defenders.filter(d => d.tier === 1)).toHaveLength(6);
    expect(validated.defenders.filter(d => d.tier === 2)).toHaveLength(16);
    expect(validated.enemies).toHaveLength(4);
    expect(validated.fusionRecipes).toHaveLength(16);
    expect(validated.abilities).toHaveLength(22);
    expect(validated.grasslandLevel.waves).toHaveLength(5);
    expect(validated.grasslandLevel.waveCrystals).toHaveLength(5);
    expect(validated.grasslandLevel.waveCrystals.every(c => Number.isInteger(c) && c >= 0)).toBe(true);
    expect(validated.grasslandLevel.initialEmeralds).toBeGreaterThanOrEqual(50);
    expect(validated.grasslandLevel.enablePassiveEnergy).toBe(false);
    expect(validated.grasslandLevel.villageChest.enabled).toBe(true);
    expect(validated.grasslandLevel.villageChest.amount).toBeGreaterThan(0);
    expect(validated.grasslandLevel.villageChest.intervalSeconds).toBeGreaterThan(0);
    expect(validated.sandboxLevel.waves).toHaveLength(5);
    expect(validated.sandboxLevel.waveCrystals).toEqual([1, 1, 1, 2, 2]);
  });

  it('matches Owner Emerald/Villager economy invariants, Defender roles, and skill mechanics', () => {
    const byDef = new Map(MVP_GAME_DATA.defenders.map(d => [d.id, d]));
    const byEnemy = new Map(MVP_GAME_DATA.enemies.map(e => [e.id, e]));
    const byAbility = new Map(MVP_GAME_DATA.abilities.map(a => [a.id, a]));

    expect(MVP_GAME_DATA.grasslandLevel.seed).toBe(20261123);
    expect(MVP_GAME_DATA.grasslandLevel.fusionGloveCooldownSeconds).toBeGreaterThanOrEqual(0);
    expect(MVP_GAME_DATA.grasslandLevel.waves[0].initialDelaySeconds).toBeGreaterThanOrEqual(5);

    expect(byDef.get('villager')).toMatchObject({
      tier: 1,
      damage: 0,
      economyProduction: {
        itemCount: expect.any(Number),
        amountPerItem: expect.any(Number),
        initialDelaySeconds: expect.any(Number),
        intervalSeconds: expect.any(Number),
      },
    });
    expect(byDef.get('villager')?.summonEnergyCost).toBeGreaterThan(0);
    expect(byDef.get('villager')?.economyProduction?.amountPerItem).toBeGreaterThan(0);
    expect(byDef.get('master_trader')).toMatchObject({
      tier: 2,
      damage: 0,
      economyProduction: {
        itemCount: expect.any(Number),
        amountPerItem: expect.any(Number),
        initialDelaySeconds: expect.any(Number),
        intervalSeconds: expect.any(Number),
      },
    });
    expect(byDef.get('master_trader')?.economyProduction?.amountPerItem).toBeGreaterThan(0);

    expect(byDef.get('iron_golem')).toMatchObject({
      tier: 1,
      targeting: 'CLOSEST_TO_DEFENDER',
    });
    expect(byDef.get('iron_golem')?.maxHp).toBeGreaterThan(0);
    expect(byDef.get('iron_golem')?.armor).toBeGreaterThan(0);
    expect(byDef.get('snow_golem')).toMatchObject({
      tier: 1,
      attackDamageType: 'ice',
      basicAttackStatus: { kind: 'slow' },
    });
    expect(byDef.get('skeleton')).toMatchObject({
      tier: 1,
      attackRange: expect.any(Number),
    });
    expect(byDef.get('skeleton')?.damage).toBeGreaterThan(0);
    expect(byDef.get('blaze')).toMatchObject({
      tier: 1,
      attackDamageType: 'fire',
      basicAttackStatus: { kind: 'burn' },
    });
    expect(byDef.get('skeleton_sniper')?.damage).toBeGreaterThan(0);

    expect(byEnemy.get('zombie')).toMatchObject({
      maxHp: expect.any(Number),
      attackSpeed: expect.any(Number),
      energyReward: expect.any(Number),
      crystalReward: expect.any(Number),
      crystalDropChance: expect.any(Number),
    });
    expect(byEnemy.get('husk')).toBeDefined();
    expect(byEnemy.get('vindicator')).toBeDefined();
    expect(byEnemy.get('pillager')).toBeDefined();

    expect(byAbility.get('emerald_harvest')?.effects[0]).toMatchObject({
      kind: 'resource-burst',
      spawnAsItems: true,
    });
    expect(byAbility.get('grand_caravan')?.effects[0]).toMatchObject({
      kind: 'resource-burst',
      spawnAsItems: true,
    });

    expect(byAbility.get('earthquake')?.targetScope).toBe('same-lane-enemies-ahead');
    expect(byAbility.get('arrow_storm')?.effects[0]).toMatchObject({
      kind: 'multihit-projectile',
    });
    expect(byAbility.get('inferno')?.effects[0]).toMatchObject({
      kind: 'multihit-falling-area',
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
      initialEmeralds: 150,
      enablePassiveEnergy: false,
      fusionGloveCooldownSeconds: 12,
      villageChest: { enabled: true, amount: 30, intervalSeconds: 8 },
      startingDefenders: [],
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
        ...(d.id === 'snow_golem'
          ? {
              attackDamageType: 'ice' as const,
              basicAttackStatus: { kind: 'slow' as const, slowPct: 0.5, durationSeconds: 4 },
            }
          : {
              ...(d.attackDamageType ? { attackDamageType: d.attackDamageType } : {}),
              ...(d.basicAttackStatus ? { basicAttackStatus: structuredClone(d.basicAttackStatus) } : {}),
            }),
        ...(d.id === 'villager' && d.economyProduction
          ? {
              economyProduction: {
                ...d.economyProduction,
                amountPerItem: 30,
              },
            }
          : d.economyProduction
            ? { economyProduction: structuredClone(d.economyProduction) }
            : {}),
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
        crystalDropChance: e.id === 'husk' ? 0.25 : e.crystalDropChance,
      })),
      abilities: MVP_GAME_DATA.abilities.map(a =>
        a.id === 'arrow_storm' && a.effects[0]?.kind === 'multihit-projectile'
          ? {
              ...structuredClone(a),
              effects: [{ ...structuredClone(a.effects[0]), count: 20, damageMultiplier: 1.5 }],
            }
          : structuredClone(a),
      ),
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
    expect(merged.enemies.find(e => e.id === 'husk')?.crystalDropChance).toBe(0.25);
    expect(merged.enemies.find(e => e.id === 'vindicator')).toMatchObject({
      energyReward: 140,
      name: 'Vindicator',
      color: '#2563eb',
    });
    expect(merged.grasslandLevel.seed).toBe(99999);
    expect(merged.grasslandLevel.initialEmeralds).toBe(150);
    expect(merged.grasslandLevel.villageChest).toEqual({
      enabled: true,
      amount: 30,
      intervalSeconds: 8,
    });
    expect(merged.defenders.find(d => d.id === 'villager')?.economyProduction?.amountPerItem).toBe(30);
    expect(merged.defenders.find(d => d.id === 'snow_golem')?.basicAttackStatus).toEqual({
      kind: 'slow',
      slowPct: 0.5,
      durationSeconds: 4,
    });
    expect(merged.abilities.find(a => a.id === 'arrow_storm')?.effects[0]).toMatchObject({
      kind: 'multihit-projectile',
      count: 20,
      damageMultiplier: 1.5,
    });
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

    const badDropChance = structuredClone(preset);
    badDropChance.enemies[0].crystalDropChance = 1.5;
    expect(() => mergePlaytestPresetIntoDataset(MVP_GAME_DATA, badDropChance)).toThrow();
  });

  it('validates multi-level campaignLevels, startingDefenders, roster restrictions, and unlock cycles (T-15)', () => {
    expect(MVP_GAME_DATA.campaignLevels.length).toBeGreaterThanOrEqual(1);
    const grassland = MVP_GAME_DATA.campaignLevels.find(l => l.id === 'grassland')!;
    expect(grassland).toBeDefined();
    expect(grassland.waves).toEqual(MVP_GAME_DATA.grasslandLevel.waves);
    expect(grassland.initialEmeralds).toBe(MVP_GAME_DATA.grasslandLevel.initialEmeralds);

    const customStage = structuredClone(grassland);
    customStage.id = 'stage_2';
    customStage.order = 2;
    customStage.name = 'Custom Horde Trial';
    customStage.unlockRequirement = { kind: 'clear-level', levelId: 'grassland' };
    customStage.waves = customStage.waves.slice(0, 3).map((w, idx) => ({ ...w, id: `wave_${idx + 1}` }));
    customStage.waveCrystals = [1, 1, 2];
    customStage.startingDefenders = [
      { definitionId: 'villager', row: 2, column: 0 },
      { definitionId: 'steel_guardian', row: 2, column: 9 },
    ];
    customStage.allowedBaseDefenderIds = ['villager', 'iron_golem', 'skeleton'];
    customStage.ignoreUnlockRestrictions = true;

    const merged = mergeCampaignLevelsIntoDataset(MVP_GAME_DATA, [grassland, customStage]);
    expect(merged.campaignLevels).toHaveLength(2);
    expect(merged.campaignLevels[1]?.startingDefenders).toHaveLength(2);
    expect(merged.campaignLevels[1]?.startingDefenders?.[1]?.column).toBe(9);
    expect(merged.campaignLevels[1]?.allowedBaseDefenderIds).toEqual(['villager', 'iron_golem', 'skeleton']);

    // Reject duplicate stage IDs
    expect(() => mergeCampaignLevelsIntoDataset(MVP_GAME_DATA, [grassland, { ...customStage, id: 'grassland' }])).toThrow();

    // Reject removing mandatory grassland stage
    expect(() => mergeCampaignLevelsIntoDataset(MVP_GAME_DATA, [customStage])).toThrow();

    // Reject duplicate cell in startingDefenders
    const dupCell = structuredClone(customStage);
    dupCell.startingDefenders = [
      { definitionId: 'villager', row: 1, column: 2 },
      { definitionId: 'skeleton', row: 1, column: 2 },
    ];
    expect(() => mergeCampaignLevelsIntoDataset(MVP_GAME_DATA, [grassland, dupCell])).toThrow(/Duplicate startingDefender cell/);

    // Reject out-of-bounds cell (row >= 5 or column >= 10)
    const oobCell = structuredClone(customStage);
    oobCell.startingDefenders = [{ definitionId: 'villager', row: 5, column: 0 }];
    expect(() => mergeCampaignLevelsIntoDataset(MVP_GAME_DATA, [grassland, oobCell])).toThrow();
    const oobColCell = structuredClone(customStage);
    oobColCell.startingDefenders = [{ definitionId: 'villager', row: 0, column: 10 }];
    expect(() => mergeCampaignLevelsIntoDataset(MVP_GAME_DATA, [grassland, oobColCell])).toThrow();

    // Reject Tier-2 Defender in allowedBaseDefenderIds
    const badAllowed = structuredClone(customStage);
    badAllowed.allowedBaseDefenderIds = ['iron_golem', 'steel_guardian'];
    expect(() => mergeCampaignLevelsIntoDataset(MVP_GAME_DATA, [grassland, badAllowed])).toThrow(/valid Tier-1 Base Defenders/);

    // Reject circular unlockRequirement graph
    const stageA = structuredClone(customStage);
    stageA.id = 'stage_a';
    stageA.order = 2;
    stageA.unlockRequirement = { kind: 'clear-level', levelId: 'stage_b' };
    const stageB = structuredClone(customStage);
    stageB.id = 'stage_b';
    stageB.order = 3;
    stageB.unlockRequirement = { kind: 'clear-level', levelId: 'stage_a' };
    expect(() => mergeCampaignLevelsIntoDataset(MVP_GAME_DATA, [grassland, stageA, stageB])).toThrow(/Circular unlockRequirement/);
  });
});
