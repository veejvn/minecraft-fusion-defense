import { describe, expect, it } from 'vitest';
import { cellIndex } from '../src/battlefield/grid';
import { validateCombatSession, type CombatSessionInput } from '../src/combat/combat-session';
import { createCombatState, registerCombatEntity } from '../src/combat/combat-state';
import { applyBattleCommand, createBattleState, type BattleState } from '../src/core/battle-state';
import type { ResourceSessionInput } from '../src/core/resource-session';
import { TransactionEngine } from '../src/core/transaction';
import { EventQueue } from '../src/events/event-queue';
import { applyFusionCommand, validateFusionAttempt } from '../src/fusion/fusion-engine';
import { normalizeFusionPair, validateFusionSession, type FusionSessionInput } from '../src/fusion/fusion-session';
import { createFusionState } from '../src/fusion/fusion-state';
import { BattleRuntime } from '../src/systems/battle-runtime';

// Test-only fixtures. Never treat these values as approved production balance.
function resourceFixture(overrides: Partial<ResourceSessionInput> = {}): ResourceSessionInput {
  return {
    seed: 1,
    defenders: [
      { id: 'skeleton', classification: 'base', summonEnergyCost: 25, unlocked: true },
      { id: 'iron_golem', classification: 'base', summonEnergyCost: 25, unlocked: true },
      { id: 'snow_golem', classification: 'base', summonEnergyCost: 25, unlocked: true },
      { id: 'wolf', classification: 'base', summonEnergyCost: 25, unlocked: true },
      { id: 'blaze', classification: 'base', summonEnergyCost: 25, unlocked: true },
      { id: 'skeleton_sniper', classification: 'fusion', summonEnergyCost: 0, unlocked: true },
      { id: 'steel_guardian', classification: 'fusion', summonEnergyCost: 0, unlocked: true },
      { id: 'ice_golem', classification: 'fusion', summonEnergyCost: 0, unlocked: true },
      { id: 'alpha_wolf', classification: 'fusion', summonEnergyCost: 0, unlocked: true },
      { id: 'frost_guardian', classification: 'fusion', summonEnergyCost: 0, unlocked: true },
      { id: 'flame_fang', classification: 'fusion', summonEnergyCost: 0, unlocked: true },
      { id: 'inferno_archer', classification: 'fusion', summonEnergyCost: 0, unlocked: true },
    ],
    enemies: [
      { id: 'enemy_stop', energy: 50, crystals: 1 },
      { id: 'enemy_fast', energy: 100, crystals: 1 },
      { id: 'enemy_pass', energy: 75, crystals: 0 },
    ],
    waves: [{ id: 'fixture_wave', crystals: 10 }],
    energyItems: {
      amount: 9,
      intervalSeconds: 100,
      region: { min: { x: 0, y: 0 }, max: { x: 1, y: 1 } },
      positions: [{ x: 0.5, y: 0.5 }],
    },
    ...overrides,
  };
}

// Test-only fixtures. Never treat these values as approved production balance.
function combatFixture(overrides: Partial<CombatSessionInput> = {}): CombatSessionInput {
  return {
    spawnX: 9,
    defenders: [
      { id: 'skeleton', maxHp: 80, damage: 20, attackSpeed: 1, attackRange: 4, targeting: 'CLOSEST_TO_BASE' },
      { id: 'iron_golem', maxHp: 200, damage: 10, attackSpeed: 0.25, attackRange: 9, targeting: 'CLOSEST_TO_BASE' },
      { id: 'snow_golem', maxHp: 90, damage: 15, attackSpeed: 1, attackRange: 4, targeting: 'CLOSEST_TO_BASE' },
      { id: 'wolf', maxHp: 110, damage: 25, attackSpeed: 1, attackRange: 2, targeting: 'CLOSEST_TO_BASE' },
      { id: 'blaze', maxHp: 95, damage: 30, attackSpeed: 1, attackRange: 4, targeting: 'CLOSEST_TO_BASE' },
      { id: 'skeleton_sniper', maxHp: 160, damage: 45, attackSpeed: 1, attackRange: 9, targeting: 'HIGHEST_HP' },
      { id: 'steel_guardian', maxHp: 500, damage: 40, attackSpeed: 1, attackRange: 3, targeting: 'CLOSEST_TO_BASE' },
      { id: 'ice_golem', maxHp: 180, damage: 30, attackSpeed: 1, attackRange: 5, targeting: 'CLOSEST_TO_BASE' },
      { id: 'alpha_wolf', maxHp: 240, damage: 50, attackSpeed: 1, attackRange: 2, targeting: 'CLOSEST_TO_BASE' },
      { id: 'frost_guardian', maxHp: 420, damage: 35, attackSpeed: 1, attackRange: 4, targeting: 'CLOSEST_TO_BASE' },
      { id: 'flame_fang', maxHp: 260, damage: 55, attackSpeed: 1, attackRange: 3, targeting: 'CLOSEST_TO_BASE' },
      { id: 'inferno_archer', maxHp: 200, damage: 60, attackSpeed: 1, attackRange: 7, targeting: 'CLOSEST_TO_BASE' },
    ],
    enemies: [
      { id: 'enemy_stop', maxHp: 500, moveSpeed: 1, behavior: 'STOP_AND_ATTACK', damage: 20, attackSpeed: 1, attackRange: 0 },
      { id: 'enemy_fast', maxHp: 120, moveSpeed: 2, behavior: 'STOP_AND_ATTACK', damage: 30, attackSpeed: 1, attackRange: 0 },
      { id: 'enemy_pass', maxHp: 100, moveSpeed: 1, behavior: 'IGNORE_DEFENDER' },
    ],
    ...overrides,
  };
}

// Test-only fixtures. Never treat these values as approved production balance.
function fusionFixture(overrides: Partial<FusionSessionInput> = {}): FusionSessionInput {
  return {
    defenders: [
      { id: 'skeleton', tier: 1 },
      { id: 'iron_golem', tier: 1 },
      { id: 'snow_golem', tier: 1 },
      { id: 'wolf', tier: 1 },
      { id: 'blaze', tier: 1 },
      { id: 'skeleton_sniper', tier: 2 },
      { id: 'steel_guardian', tier: 2 },
      { id: 'ice_golem', tier: 2 },
      { id: 'alpha_wolf', tier: 2 },
      { id: 'frost_guardian', tier: 2 },
      { id: 'flame_fang', tier: 2 },
      { id: 'inferno_archer', tier: 2 },
    ],
    recipes: [
      { id: 'fusion_skeleton_sniper', inputDefenderIds: ['skeleton', 'skeleton'], outputDefenderId: 'skeleton_sniper', unlocked: true, enabled: true },
      { id: 'fusion_steel_guardian', inputDefenderIds: ['iron_golem', 'iron_golem'], outputDefenderId: 'steel_guardian', unlocked: true, enabled: true },
      { id: 'fusion_ice_golem', inputDefenderIds: ['snow_golem', 'snow_golem'], outputDefenderId: 'ice_golem', unlocked: true, enabled: true },
      { id: 'fusion_alpha_wolf', inputDefenderIds: ['wolf', 'wolf'], outputDefenderId: 'alpha_wolf', unlocked: true, enabled: true },
      { id: 'fusion_frost_guardian', inputDefenderIds: ['iron_golem', 'snow_golem'], outputDefenderId: 'frost_guardian', unlocked: true, enabled: true },
      { id: 'fusion_flame_fang', inputDefenderIds: ['blaze', 'wolf'], outputDefenderId: 'flame_fang', unlocked: true, enabled: true },
      { id: 'fusion_inferno_archer', inputDefenderIds: ['blaze', 'skeleton'], outputDefenderId: 'inferno_archer', unlocked: true, enabled: true },
    ],
    ...overrides,
  };
}

const createBattle = (
  fusion: FusionSessionInput | undefined = fusionFixture(),
  resources: ResourceSessionInput | undefined = resourceFixture(),
  combat: CombatSessionInput | undefined = combatFixture(),
  ticksPerSecond = 1,
) => new BattleRuntime({ ticksPerSecond, maxCatchUpTicks: 250 }, resources, combat, fusion);

const step = (game: BattleRuntime, ticks = 1, ticksPerSecond = 1) =>
  game.advance((ticks * 1000) / ticksPerSecond);

describe('T-08.1 fusion session validation & snapshot detachment', () => {
  it('validates and detaches fusion session inputs and omits snapshot.fusion when fusionInput is omitted', () => {
    const withoutFusion = new BattleRuntime({ ticksPerSecond: 1, maxCatchUpTicks: 250 }, resourceFixture(), combatFixture());
    expect(withoutFusion.snapshot().fusion).toBeUndefined();

    const fusion = fusionFixture();
    const game = createBattle(fusion);
    // Mutating original input after construction must have zero effect on runtime fusion.
    Object.assign(fusion.recipes[0], { unlocked: false, enabled: false, outputDefenderId: 'alpha_wolf' });
    Object.assign(fusion.defenders[0], { tier: 99 });

    game.enqueue({ type: 'summon', definitionId: 'skeleton', cell: { row: 0, column: 0 } }, 1);
    game.enqueue({ type: 'summon', definitionId: 'skeleton', cell: { row: 0, column: 1 } }, 1);
    game.enqueue({ type: 'fuse', sourceId: 0n, targetId: 1n }, 1);
    step(game);

    const snap = game.snapshot();
    expect(snap.fusion?.outcome).toEqual({
      eventId: expect.any(String),
      status: 'APPLIED',
      recipeId: 'fusion_skeleton_sniper',
      outputEntityId: 2n,
      targetCell: { row: 0, column: 1 },
    });
    expect(snap.entities.get(2n)).toMatchObject({
      kind: 'defender',
      definitionId: 'skeleton_sniper',
      cell: { row: 0, column: 1 },
    });
  });

  it('normalizes unordered pairs deterministically', () => {
    expect(normalizeFusionPair('iron_golem', 'snow_golem')).toBe('iron_golem|snow_golem');
    expect(normalizeFusionPair('snow_golem', 'iron_golem')).toBe('iron_golem|snow_golem');
    expect(normalizeFusionPair('skeleton', 'skeleton')).toBe('skeleton|skeleton');
  });

  it('fails closed on missing/invalid inputs, duplicate IDs/pairs, unknown IDs, invalid tiers, non-boolean flags and cross-session mismatches', () => {
    const base = fusionFixture();

    expect(() => validateFusionSession(undefined as never)).toThrow(TypeError);
    expect(() => validateFusionSession(null as never)).toThrow(TypeError);
    expect(() => validateFusionSession([] as never)).toThrow(TypeError);
    expect(() => validateFusionSession({ ...base, defenders: undefined as never })).toThrow(TypeError);
    expect(() => validateFusionSession({ ...base, recipes: undefined as never })).toThrow(TypeError);
    expect(() => validateFusionSession({ ...base, defenders: [null as never] })).toThrow(TypeError);
    expect(() => validateFusionSession({ ...base, recipes: [null as never] })).toThrow(TypeError);

    // Duplicate defender ID and duplicate recipe ID.
    expect(() => createBattle({ ...base, defenders: [...base.defenders, base.defenders[0]] })).toThrow(TypeError);
    expect(() => createBattle({ ...base, recipes: [...base.recipes, base.recipes[0]] })).toThrow(TypeError);

    // Duplicate unordered input pair ([a, b] and [b, a]).
    expect(() => createBattle({
      ...base,
      recipes: [
        ...base.recipes,
        {
          id: 'fusion_duplicate_pair',
          inputDefenderIds: ['snow_golem', 'iron_golem'],
          outputDefenderId: 'frost_guardian',
          unlocked: true,
          enabled: true,
        },
      ],
    })).toThrow(TypeError);

    // Unknown defender ID in recipe input or output, or malformed tuple length.
    expect(() => createBattle({
      ...base,
      recipes: [{ ...base.recipes[0], inputDefenderIds: ['skeleton'] as never }],
    })).toThrow(TypeError);
    expect(() => createBattle({
      ...base,
      recipes: [{ ...base.recipes[0], inputDefenderIds: ['missing_def', 'skeleton'] }],
    })).toThrow(TypeError);
    expect(() => createBattle({
      ...base,
      recipes: [{ ...base.recipes[0], inputDefenderIds: ['skeleton', 'missing_def'] }],
    })).toThrow(TypeError);
    expect(() => createBattle({
      ...base,
      recipes: [{ ...base.recipes[0], outputDefenderId: 'missing_output' }],
    })).toThrow(TypeError);

    // Invalid tiers (0, -1, 1.5, NaN, non-number).
    for (const invalidTier of [0, -1, 1.5, Number.NaN, '1' as never]) {
      expect(() => createBattle({
        ...base,
        defenders: [{ ...base.defenders[0], tier: invalidTier }, ...base.defenders.slice(1)],
      })).toThrow(RangeError);
    }

    // Non-boolean unlocked / enabled flags.
    expect(() => createBattle({
      ...base,
      recipes: [{ ...base.recipes[0], unlocked: 1 as never }, ...base.recipes.slice(1)],
    })).toThrow(TypeError);
    expect(() => createBattle({
      ...base,
      recipes: [{ ...base.recipes[0], enabled: 'true' as never }, ...base.recipes.slice(1)],
    })).toThrow(TypeError);

    // Cross-session mismatch: resource defender missing from fusionInput.
    expect(() => createBattle({
      ...base,
      defenders: base.defenders.filter(d => d.id !== 'wolf'),
      recipes: base.recipes.filter(r => !r.inputDefenderIds.includes('wolf') && r.outputDefenderId !== 'wolf'),
    }, resourceFixture(), combatFixture())).toThrow(TypeError);

    // Cross-session mismatch: fusion defender missing from combatInput.
    const combatWithoutSteel = combatFixture({
      defenders: combatFixture().defenders.filter(d => d.id !== 'steel_guardian'),
    });
    const resourceWithoutSteel = resourceFixture({
      defenders: resourceFixture().defenders.filter(d => d.id !== 'steel_guardian'),
    });
    expect(() => createBattle(base, resourceWithoutSteel, combatWithoutSteel)).toThrow(TypeError);
  });
});

describe('T-08.2–T-08.3 recipes, placement, spatial freedom, rejections & tier-agnostic lookup', () => {
  it.each([
    ['fusion_skeleton_sniper', 'skeleton', 'skeleton', 'skeleton_sniper'],
    ['fusion_steel_guardian', 'iron_golem', 'iron_golem', 'steel_guardian'],
    ['fusion_ice_golem', 'snow_golem', 'snow_golem', 'ice_golem'],
    ['fusion_alpha_wolf', 'wolf', 'wolf', 'alpha_wolf'],
    ['fusion_frost_guardian', 'iron_golem', 'snow_golem', 'frost_guardian'],
    ['fusion_flame_fang', 'blaze', 'wolf', 'flame_fang'],
    ['fusion_inferno_archer', 'blaze', 'skeleton', 'inferno_archer'],
  ] as const)(
    'resolves approved MVP recipe %s (%s + %s -> %s), vacates Source cell and occupies Target cell',
    (recipeId, sourceDef, targetDef, expectedOutput) => {
      const game = createBattle();
      game.enqueue({ type: 'summon', definitionId: sourceDef, cell: { row: 0, column: 0 } }, 1);
      game.enqueue({ type: 'summon', definitionId: targetDef, cell: { row: 0, column: 1 } }, 1);
      game.enqueue({ type: 'fuse', sourceId: 0n, targetId: 1n }, 1);
      step(game);

      const snap = game.snapshot();
      expect(snap.failure).toBeNull();
      expect(snap.fusion?.outcome).toMatchObject({
        status: 'APPLIED',
        recipeId,
        outputEntityId: 2n,
        targetCell: { row: 0, column: 1 },
      });
      expect(snap.entities.has(0n)).toBe(false);
      expect(snap.entities.has(1n)).toBe(false);
      expect(snap.entities.get(2n)).toEqual({
        id: 2n,
        kind: 'defender',
        definitionId: expectedOutput,
        cell: { row: 0, column: 1 },
      });
      expect(snap.occupancy[cellIndex({ row: 0, column: 0 })]).toBeNull();
      expect(snap.occupancy[cellIndex({ row: 0, column: 1 })]).toBe(2n);
      expect(snap.nextEntityId).toBe(3n);

      // Vacated Source cell can be summoned onto afterward (at tick 3 when periodic +50 energy arrives).
      game.enqueue({ type: 'summon', definitionId: sourceDef, cell: { row: 0, column: 0 } }, 3);
      step(game, 2);
      expect(game.snapshot().occupancy[cellIndex({ row: 0, column: 0 })]).toBe(3n);
    },
  );

  it.each([
    ['fusion_frost_guardian', 'snow_golem', 'iron_golem', 'frost_guardian'],
    ['fusion_flame_fang', 'wolf', 'blaze', 'flame_fang'],
    ['fusion_inferno_archer', 'skeleton', 'blaze', 'inferno_archer'],
  ] as const)(
    'matches cross-type recipe %s in reverse order (%s + %s -> %s) and swaps placement when Source/Target swap',
    (recipeId, firstDef, secondDef, expectedOutput) => {
      const forward = createBattle();
      forward.enqueue({ type: 'summon', definitionId: firstDef, cell: { row: 1, column: 2 } }, 1);
      forward.enqueue({ type: 'summon', definitionId: secondDef, cell: { row: 3, column: 6 } }, 1);
      forward.enqueue({ type: 'fuse', sourceId: 0n, targetId: 1n }, 1);
      step(forward);

      const swapped = createBattle();
      swapped.enqueue({ type: 'summon', definitionId: firstDef, cell: { row: 1, column: 2 } }, 1);
      swapped.enqueue({ type: 'summon', definitionId: secondDef, cell: { row: 3, column: 6 } }, 1);
      swapped.enqueue({ type: 'fuse', sourceId: 1n, targetId: 0n }, 1);
      step(swapped);

      expect(forward.snapshot().fusion?.outcome).toMatchObject({
        status: 'APPLIED',
        recipeId,
        targetCell: { row: 3, column: 6 },
      });
      expect(forward.snapshot().occupancy[cellIndex({ row: 1, column: 2 })]).toBeNull();
      expect(forward.snapshot().occupancy[cellIndex({ row: 3, column: 6 })]).toBe(2n);
      expect(forward.snapshot().entities.get(2n)).toMatchObject({
        definitionId: expectedOutput,
        cell: { row: 3, column: 6 },
      });

      expect(swapped.snapshot().fusion?.outcome).toMatchObject({
        status: 'APPLIED',
        recipeId,
        targetCell: { row: 1, column: 2 },
      });
      expect(swapped.snapshot().occupancy[cellIndex({ row: 3, column: 6 })]).toBeNull();
      expect(swapped.snapshot().occupancy[cellIndex({ row: 1, column: 2 })]).toBe(2n);
      expect(swapped.snapshot().entities.get(2n)).toMatchObject({
        definitionId: expectedOutput,
        cell: { row: 1, column: 2 },
      });
    },
  );

  it('allows cross-lane and opposite-corner Fusion (0, 0) <-> (4, 8) without distance or adjacency limits', () => {
    const game = createBattle();
    game.enqueue({ type: 'summon', definitionId: 'iron_golem', cell: { row: 0, column: 0 } }, 1);
    game.enqueue({ type: 'summon', definitionId: 'snow_golem', cell: { row: 4, column: 8 } }, 1);
    game.enqueue({ type: 'fuse', sourceId: 0n, targetId: 1n }, 1);
    step(game);

    const snap = game.snapshot();
    expect(snap.fusion?.outcome).toMatchObject({
      status: 'APPLIED',
      recipeId: 'fusion_frost_guardian',
      outputEntityId: 2n,
      targetCell: { row: 4, column: 8 },
    });
    expect(snap.occupancy[cellIndex({ row: 0, column: 0 })]).toBeNull();
    expect(snap.occupancy[cellIndex({ row: 4, column: 8 })]).toBe(2n);
  });

  it('rejects same-instance, missing/removed IDs, Enemy IDs, unmatched pairs and locked/disabled recipes without mutating state or allocating IDs', () => {
    const setupBase = (fusion = fusionFixture(), withEnemy = false) => {
      const game = createBattle(fusion);
      game.enqueue({ type: 'summon', definitionId: 'skeleton', cell: { row: 0, column: 0 } }, 1); // 0n
      game.enqueue({ type: 'summon', definitionId: 'iron_golem', cell: { row: 0, column: 1 } }, 1); // 1n
      if (withEnemy) {
        game.enqueue({ type: 'add', entity: { kind: 'enemy', definitionId: 'enemy_pass', lane: 2, position: 8 } }, 1); // 2n
      }
      step(game);
      return game;
    };

    const assertRejectedWithoutMutation = (
      game: BattleRuntime,
      command: { readonly type: 'fuse'; readonly sourceId: bigint; readonly targetId: bigint },
      expectedReason: string,
      hasMovingEnemy = false,
    ) => {
      const before = game.snapshot();
      game.enqueue(command, before.tick + 1);
      step(game);
      const after = game.snapshot();
      expect(after.failure).toBeNull();
      expect(after.fusion?.outcome).toEqual({
        eventId: expect.any(String),
        status: 'REJECTED',
        reason: expectedReason,
      });
      if (!hasMovingEnemy) {
        expect(after.entities).toEqual(before.entities);
      } else {
        expect(after.entities.get(0n)).toEqual(before.entities.get(0n));
        expect(after.entities.get(1n)).toEqual(before.entities.get(1n));
        expect(after.entities.has(2n)).toBe(true);
      }
      expect(after.occupancy).toEqual(before.occupancy);
      expect(after.nextEntityId).toBe(before.nextEntityId);
    };

    // 1. same-instance
    assertRejectedWithoutMutation(setupBase(), { type: 'fuse', sourceId: 0n, targetId: 0n }, 'same-instance');

    // 2. source-not-found & target-not-found (never existed)
    assertRejectedWithoutMutation(setupBase(), { type: 'fuse', sourceId: 99n, targetId: 1n }, 'source-not-found');
    assertRejectedWithoutMutation(setupBase(), { type: 'fuse', sourceId: 0n, targetId: 99n }, 'target-not-found');

    // 3. already-removed source & target
    const removedSourceGame = setupBase();
    removedSourceGame.enqueue({ type: 'remove', id: 0n }, 2);
    step(removedSourceGame);
    assertRejectedWithoutMutation(removedSourceGame, { type: 'fuse', sourceId: 0n, targetId: 1n }, 'source-not-found');

    const removedTargetGame = setupBase();
    removedTargetGame.enqueue({ type: 'remove', id: 1n }, 2);
    step(removedTargetGame);
    assertRejectedWithoutMutation(removedTargetGame, { type: 'fuse', sourceId: 0n, targetId: 1n }, 'target-not-found');

    // 4. invalid-source & invalid-target (Enemy EntityId)
    assertRejectedWithoutMutation(setupBase(fusionFixture(), true), { type: 'fuse', sourceId: 2n, targetId: 1n }, 'invalid-source', true);
    assertRejectedWithoutMutation(setupBase(fusionFixture(), true), { type: 'fuse', sourceId: 0n, targetId: 2n }, 'invalid-target', true);

    // 5. no-recipe (Tier-1 unmatched pair & Tier-2 + Tier-2 with no approved recipe)
    assertRejectedWithoutMutation(setupBase(), { type: 'fuse', sourceId: 0n, targetId: 1n }, 'no-recipe');

    const tier2NoRecipe = createBattle();
    tier2NoRecipe.enqueue({ type: 'add', entity: { kind: 'defender', definitionId: 'steel_guardian', cell: { row: 1, column: 0 } } }, 1);
    tier2NoRecipe.enqueue({ type: 'add', entity: { kind: 'defender', definitionId: 'steel_guardian', cell: { row: 1, column: 1 } } }, 1);
    step(tier2NoRecipe);
    assertRejectedWithoutMutation(tier2NoRecipe, { type: 'fuse', sourceId: 0n, targetId: 1n }, 'no-recipe');

    // 6. recipe-unavailable (locked and disabled)
    const lockedFusion = fusionFixture({
      recipes: fusionFixture().recipes.map(r =>
        r.id === 'fusion_skeleton_sniper' ? { ...r, unlocked: false } : r),
    });
    const lockedGame = createBattle(lockedFusion);
    lockedGame.enqueue({ type: 'summon', definitionId: 'skeleton', cell: { row: 0, column: 0 } }, 1);
    lockedGame.enqueue({ type: 'summon', definitionId: 'skeleton', cell: { row: 0, column: 1 } }, 1);
    step(lockedGame);
    assertRejectedWithoutMutation(lockedGame, { type: 'fuse', sourceId: 0n, targetId: 1n }, 'recipe-unavailable');

    const disabledFusion = fusionFixture({
      recipes: fusionFixture().recipes.map(r =>
        r.id === 'fusion_skeleton_sniper' ? { ...r, enabled: false } : r),
    });
    const disabledGame = createBattle(disabledFusion);
    disabledGame.enqueue({ type: 'summon', definitionId: 'skeleton', cell: { row: 0, column: 0 } }, 1);
    disabledGame.enqueue({ type: 'summon', definitionId: 'skeleton', cell: { row: 0, column: 1 } }, 1);
    step(disabledGame);
    assertRejectedWithoutMutation(disabledGame, { type: 'fuse', sourceId: 0n, targetId: 1n }, 'recipe-unavailable');
  });

  it('rejects dead inputs with entity-dead in validateFusionAttempt and rejects combat-killed inputs cleanly in BattleRuntime', () => {
    // 1. Direct unit test of validateFusionAttempt on a BattleState fixture with hp <= 0.
    const combatInput = combatFixture();
    const combatSession = validateCombatSession(combatInput, 1);
    const fusionSession = validateFusionSession(fusionFixture(), undefined, combatSession);
    const state: BattleState = { ...createBattleState(), combat: createCombatState() };
    applyBattleCommand(state, { type: 'add', entity: { kind: 'defender', definitionId: 'skeleton', cell: { row: 0, column: 0 } } });
    applyBattleCommand(state, { type: 'add', entity: { kind: 'defender', definitionId: 'skeleton', cell: { row: 0, column: 1 } } });
    registerCombatEntity(state, combatSession, 0n);
    registerCombatEntity(state, combatSession, 1n);

    state.combat!.entities.get(0n)!.hp = 0;
    expect(validateFusionAttempt(state, fusionSession, 0n, 1n)).toEqual({ ok: false, reason: 'entity-dead' });

    state.combat!.entities.get(0n)!.hp = 80;
    state.combat!.entities.get(1n)!.hp = -5;
    expect(validateFusionAttempt(state, fusionSession, 0n, 1n)).toEqual({ ok: false, reason: 'entity-dead' });

    state.combat!.entities.delete(0n);
    expect(validateFusionAttempt(state, fusionSession, 0n, 1n)).toEqual({ ok: false, reason: 'entity-dead' });

    // 2. Integration test in BattleRuntime when combat kills Source before same-tick fuse runs.
    const runtime = createBattle(
      fusionFixture(),
      resourceFixture(),
      combatFixture({
        defenders: [
          ...combatFixture().defenders.filter(d => d.id !== 'skeleton'),
          { id: 'skeleton', maxHp: 20, damage: 0, attackSpeed: 1, attackRange: 1, targeting: 'CLOSEST_TO_BASE' },
        ],
      }),
    );
    runtime.enqueue({ type: 'summon', definitionId: 'skeleton', cell: { row: 0, column: 1 } }, 1); // 0n (killed on tick 2)
    runtime.enqueue({ type: 'summon', definitionId: 'skeleton', cell: { row: 1, column: 1 } }, 1); // 1n (survives)
    runtime.enqueue({ type: 'add', entity: { kind: 'enemy', definitionId: 'enemy_stop', lane: 0, position: 2.0 } }, 1); // 2n (dmg 20)
    runtime.enqueue({ type: 'fuse', sourceId: 0n, targetId: 1n }, 2);
    step(runtime, 2);

    const snap = runtime.snapshot();
    expect(snap.failure).toBeNull();
    expect(snap.fusion?.outcome).toMatchObject({ status: 'REJECTED', reason: 'source-not-found' });
    expect(snap.entities.has(0n)).toBe(false);
    expect(snap.entities.get(1n)).toMatchObject({ definitionId: 'skeleton', cell: { row: 1, column: 1 } });
    expect(snap.occupancy[cellIndex({ row: 1, column: 1 })]).toBe(1n);
    expect(snap.nextEntityId).toBe(3n);
  });

  it('has no hardcoded Tier-1 engine ceiling when a synthetic Tier-2 + Tier-2 -> Tier-3 test-only recipe is provided', () => {
    // Test-only synthetic Tier-3 fixture; not an approved production recipe or unit.
    const resources = resourceFixture({
      defenders: [
        ...resourceFixture().defenders,
        { id: 'tier3_fixture', classification: 'fusion', summonEnergyCost: 0, unlocked: true },
      ],
    });
    const combat = combatFixture({
      defenders: [
        ...combatFixture().defenders,
        { id: 'tier3_fixture', maxHp: 900, damage: 80, attackSpeed: 1, attackRange: 4, targeting: 'CLOSEST_TO_BASE' },
      ],
    });
    const fusion = fusionFixture({
      defenders: [
        ...fusionFixture().defenders,
        { id: 'tier3_fixture', tier: 3 },
      ],
      recipes: [
        ...fusionFixture().recipes,
        {
          id: 'fusion_tier3_fixture',
          inputDefenderIds: ['steel_guardian', 'steel_guardian'],
          outputDefenderId: 'tier3_fixture',
          unlocked: true,
          enabled: true,
        },
      ],
    });

    const game = createBattle(fusion, resources, combat);
    game.enqueue({ type: 'add', entity: { kind: 'defender', definitionId: 'steel_guardian', cell: { row: 2, column: 2 } } }, 1);
    game.enqueue({ type: 'add', entity: { kind: 'defender', definitionId: 'steel_guardian', cell: { row: 2, column: 5 } } }, 1);
    game.enqueue({ type: 'fuse', sourceId: 0n, targetId: 1n }, 1);
    step(game);

    const snap = game.snapshot();
    expect(snap.fusion?.outcome).toMatchObject({
      status: 'APPLIED',
      recipeId: 'fusion_tier3_fixture',
      outputEntityId: 2n,
      targetCell: { row: 2, column: 5 },
    });
    expect(snap.entities.get(2n)).toMatchObject({
      definitionId: 'tier3_fixture',
      cell: { row: 2, column: 5 },
    });
    expect(snap.combat?.entities.get(2n)?.hp).toBe(900);
  });
});

describe('T-08.4 resource & combat integration', () => {
  it('succeeds when energy === 0 and crystals === 0 and deducts 0 Energy and 0 Power Crystal', () => {
    const game = createBattle();
    // Initial energy is 50; two summons at cost 25 leave energy === 0 and crystals === 0.
    game.enqueue({ type: 'summon', definitionId: 'iron_golem', cell: { row: 0, column: 0 } }, 1);
    game.enqueue({ type: 'summon', definitionId: 'iron_golem', cell: { row: 0, column: 1 } }, 1);
    step(game);
    expect(game.snapshot().resources).toMatchObject({ energy: 0, crystals: 0 });

    game.enqueue({ type: 'fuse', sourceId: 0n, targetId: 1n }, 2);
    step(game); // Tick 2 (periodic energy only triggers at tick 3).
    const snap = game.snapshot();
    expect(snap.fusion?.outcome).toMatchObject({ status: 'APPLIED', recipeId: 'fusion_steel_guardian' });
    expect(snap.resources).toMatchObject({ energy: 0, crystals: 0 });
  });

  it('spawns Fusion Defender at 100% of its own maxHp and attack-ready immediately even when both inputs are damaged and on cooldown', () => {
    const game = createBattle();
    // iron_golem test fixture: maxHp=200, damage=10, attackSpeed=0.25 (cooldown 4 ticks), attackRange=9.
    // steel_guardian test fixture: maxHp=500, damage=40, attackSpeed=1, attackRange=3.
    game.enqueue({ type: 'summon', definitionId: 'iron_golem', cell: { row: 0, column: 1 } }, 1); // 0n
    game.enqueue({ type: 'summon', definitionId: 'iron_golem', cell: { row: 1, column: 1 } }, 1); // 1n
    game.enqueue({ type: 'add', entity: { kind: 'enemy', definitionId: 'enemy_stop', lane: 0, position: 2.0 } }, 1); // 2n
    game.enqueue({ type: 'add', entity: { kind: 'enemy', definitionId: 'enemy_stop', lane: 1, position: 2.0 } }, 1); // 3n
    step(game, 2);

    // After tick 2 combat phase: both inputs are damaged (200 -> 180) and on cooldown (nextAttackTick = 6 > 3).
    const midSnap = game.snapshot();
    expect(midSnap.combat?.entities.get(0n)).toMatchObject({ hp: 180, nextAttackTick: 6 });
    expect(midSnap.combat?.entities.get(1n)).toMatchObject({ hp: 180, nextAttackTick: 6 });

    game.enqueue({ type: 'fuse', sourceId: 0n, targetId: 1n }, 3);
    step(game); // Tick 3: combat phase runs first, then fuse replaces 0n & 1n with 4n (steel_guardian).

    const fusedSnap = game.snapshot();
    expect(fusedSnap.fusion?.outcome).toMatchObject({ status: 'APPLIED', outputEntityId: 4n });
    expect(fusedSnap.combat?.entities.has(0n)).toBe(false);
    expect(fusedSnap.combat?.entities.has(1n)).toBe(false);
    expect(fusedSnap.combat?.entities.get(4n)).toEqual({
      hp: 500,
      maxHp: 500,
      nextAttackTick: null,
      attackAnchorTick: null,
      attackCount: 0,
      targetId: null,
    });

    // Tick 4: new Fusion Defender attacks enemy 3n immediately (enemy 3n was 490 hp after tick 2 and skipped on tick 3 due to 1n cooldown -> 450 hp).
    step(game);
    expect(game.snapshot().combat?.entities.get(3n)?.hp).toBe(450);
  });

  it('preserves Energy and Crystal Items on both Source and Target cells untouched with original expiresAt deadlines', () => {
    const resources = resourceFixture({
      energyItems: {
        amount: 9,
        intervalSeconds: 1,
        region: { min: { x: 0, y: 0 }, max: { x: 1, y: 1 } },
        positions: [{ x: 0.16, y: 0.1 }],
      },
    });
    const game = createBattle(fusionFixture(), resources, combatFixture());
    game.enqueue({ type: 'summon', definitionId: 'iron_golem', cell: { row: 0, column: 1 } }, 1); // 0n
    game.enqueue({ type: 'summon', definitionId: 'iron_golem', cell: { row: 1, column: 3 } }, 1); // 1n
    step(game); // Tick 1 spawns Energy item 0n (expiresAt: 11).

    // Drop Crystal Items directly on Source (0, 1) and Target (1, 3) cells at tick 2.
    game.enqueue({ type: 'enemy-reward', sourceId: 80n, definitionId: 'enemy_stop', lane: 0, position: 1.5 }, 2);
    game.enqueue({ type: 'enemy-reward', sourceId: 81n, definitionId: 'enemy_stop', lane: 1, position: 3.5 }, 2);
    step(game);

    const beforeFusionItems = new Map(game.snapshot().resources!.items);
    const beforeCrystals = game.snapshot().resources!.crystals;
    const beforeEnergy = game.snapshot().resources!.energy;
    expect(beforeFusionItems.size).toBe(4); // 2 energy items (ticks 1,2) + 2 crystal drops.

    game.enqueue({ type: 'fuse', sourceId: 0n, targetId: 1n }, 3);
    step(game);

    const afterResources = game.snapshot().resources!;
    expect(afterResources.crystals).toBe(beforeCrystals);
    // Tick 3 adds periodic +50 energy and spawns energy item #3, while keeping all prior items untouched.
    expect(afterResources.energy).toBe(beforeEnergy + 50);
    for (const [id, item] of beforeFusionItems) {
      expect(afterResources.items.get(id)).toEqual(item);
    }
  });

  it('unblocks STOP_AND_ATTACK Enemy at vacated Source cell and blocks/interacts at Target cell', () => {
    const game = createBattle();
    game.enqueue({ type: 'summon', definitionId: 'iron_golem', cell: { row: 0, column: 2 } }, 1); // 0n Source
    game.enqueue({ type: 'summon', definitionId: 'iron_golem', cell: { row: 1, column: 2 } }, 1); // 1n Target
    game.enqueue({ type: 'add', entity: { kind: 'enemy', definitionId: 'enemy_stop', lane: 0, position: 3.5 } }, 1); // 2n
    game.enqueue({ type: 'add', entity: { kind: 'enemy', definitionId: 'enemy_stop', lane: 1, position: 3.5 } }, 1); // 3n
    step(game, 2); // Tick 2: both enemies clamp at stopX = 3.0.

    expect(game.snapshot().entities.get(2n)).toMatchObject({ position: 3.0 });
    expect(game.snapshot().entities.get(3n)).toMatchObject({ position: 3.0 });

    game.enqueue({ type: 'fuse', sourceId: 0n, targetId: 1n }, 3);
    step(game); // Tick 3: fuse vacates (0, 2) and places steel_guardian 4n at (1, 2).
    expect(game.snapshot().occupancy[cellIndex({ row: 0, column: 2 })]).toBeNull();
    expect(game.snapshot().occupancy[cellIndex({ row: 1, column: 2 })]).toBe(4n);

    step(game); // Tick 4: lane 0 enemy resumes left (3.0 -> 2.0); lane 1 enemy remains at 3.0 and hits 4n (500 -> 480).
    const snap = game.snapshot();
    expect(snap.entities.get(2n)).toMatchObject({ position: 2.0 });
    expect(snap.entities.get(3n)).toMatchObject({ position: 3.0 });
    expect(snap.combat?.entities.get(4n)?.hp).toBe(480);
  });
});

describe('T-08.5 concurrency, pause/terminal, rollback & deterministic replay', () => {
  it('resolves competing same-tick fuse commands in insertionSequence order', () => {
    const runCompetition = (secondCommand: (c: bigint, a: bigint, b: bigint) => { readonly type: 'fuse'; readonly sourceId: bigint; readonly targetId: bigint }, expectedReason: 'source-not-found' | 'target-not-found') => {
      const game = createBattle();
      game.enqueue({ type: 'summon', definitionId: 'iron_golem', cell: { row: 0, column: 0 } }, 1); // 0n (A)
      game.enqueue({ type: 'summon', definitionId: 'iron_golem', cell: { row: 0, column: 1 } }, 1); // 1n (B)
      game.enqueue({ type: 'add', entity: { kind: 'defender', definitionId: 'iron_golem', cell: { row: 0, column: 2 } } }, 1); // 2n (C)
      step(game);

      game.enqueue({ type: 'fuse', sourceId: 0n, targetId: 1n }, 2);
      game.enqueue(secondCommand(2n, 0n, 1n), 2);
      step(game);

      const snap = game.snapshot();
      expect(snap.failure).toBeNull();
      expect(snap.fusion?.outcome).toMatchObject({ status: 'REJECTED', reason: expectedReason });
      expect(snap.occupancy[cellIndex({ row: 0, column: 0 })]).toBeNull();
      expect(snap.occupancy[cellIndex({ row: 0, column: 1 })]).toBe(3n); // First fuse output
      expect(snap.occupancy[cellIndex({ row: 0, column: 2 })]).toBe(2n); // Surviving C untouched
      expect(snap.entities.get(3n)).toMatchObject({ definitionId: 'steel_guardian' });
      expect(snap.nextEntityId).toBe(4n);
    };

    runCompetition((c, a) => ({ type: 'fuse', sourceId: a, targetId: c }), 'source-not-found');
    runCompetition((c, a) => ({ type: 'fuse', sourceId: c, targetId: a }), 'target-not-found');
    runCompetition((c, _a, b) => ({ type: 'fuse', sourceId: c, targetId: b }), 'target-not-found');
  });

  it('rejects fuse while paused or after terminal without mutating state', () => {
    // 1. Pause guard
    const pausedGame = createBattle();
    pausedGame.enqueue({ type: 'summon', definitionId: 'skeleton', cell: { row: 0, column: 0 } }, 1);
    pausedGame.enqueue({ type: 'summon', definitionId: 'skeleton', cell: { row: 0, column: 1 } }, 1);
    step(pausedGame);
    const beforePause = pausedGame.snapshot();

    pausedGame.setPaused(true);
    expect(pausedGame.enqueue({ type: 'fuse', sourceId: 0n, targetId: 1n }, 2)).toEqual({
      status: 'REJECTED',
      reason: 'paused',
    });
    expect(step(pausedGame, 5)).toBe(0);
    expect(pausedGame.snapshot()).toEqual(beforePause);

    pausedGame.setPaused(false);
    expect(pausedGame.enqueue({ type: 'fuse', sourceId: 0n, targetId: 1n }, 2)).toMatchObject({ status: 'APPLIED' });
    step(pausedGame);
    expect(pausedGame.snapshot().fusion?.outcome).toMatchObject({ status: 'APPLIED', recipeId: 'fusion_skeleton_sniper' });

    // 2. Terminal guards (victory and defeat + pre-queued same-tick fuse after terminal)
    for (const result of ['victory', 'defeat'] as const) {
      const terminalGame = createBattle();
      terminalGame.enqueue({ type: 'summon', definitionId: 'skeleton', cell: { row: 0, column: 0 } }, 1);
      terminalGame.enqueue({ type: 'summon', definitionId: 'skeleton', cell: { row: 0, column: 1 } }, 1);
      step(terminalGame);

      terminalGame.enqueue({ type: 'terminal', result }, 2);
      terminalGame.enqueue({ type: 'fuse', sourceId: 0n, targetId: 1n }, 2);
      step(terminalGame);

      const afterTerminal = terminalGame.snapshot();
      expect(afterTerminal.resources?.terminal).toBe(result);
      expect(afterTerminal.combat?.terminal).toBe(result);
      expect(afterTerminal.fusion?.outcome).toBeNull();
      expect(afterTerminal.occupancy[cellIndex({ row: 0, column: 0 })]).toBe(0n);
      expect(afterTerminal.occupancy[cellIndex({ row: 0, column: 1 })]).toBe(1n);

      expect(terminalGame.enqueue({ type: 'fuse', sourceId: 0n, targetId: 1n }, 3)).toEqual({
        status: 'REJECTED',
        reason: 'terminal',
      });
      expect(terminalGame.snapshot()).toEqual(afterTerminal);
    }
  });

  it('rolls back state, occupancy, combat state, ID counters and staged events atomically on malformed fuse CONTRACT_ERROR', () => {
    for (const badSourceId of [-1n, '0' as unknown as bigint]) {
      const game = createBattle();
      game.enqueue({ type: 'summon', definitionId: 'iron_golem', cell: { row: 0, column: 0 } }, 1);
      game.enqueue({ type: 'summon', definitionId: 'iron_golem', cell: { row: 0, column: 1 } }, 1);
      step(game);

      game.enqueue({ type: 'fuse', sourceId: badSourceId, targetId: 1n }, 2);
      const before = game.snapshot();
      step(game);

      expect(game.snapshot()).toEqual({
        ...before,
        tick: 2,
        failure: expect.objectContaining({ code: 'CONTRACT_ERROR', tick: 2 }),
      });
    }

    // Also verify mid-transaction rollback when a staged mutation + staged enqueue precede an invalid applyFusionCommand.
    const combatSession = validateCombatSession(combatFixture(), 1);
    const fusionSession = validateFusionSession(fusionFixture(), undefined, combatSession);
    const initialState: BattleState = {
      ...createBattleState(),
      combat: createCombatState(),
      fusion: createFusionState(),
    };
    const engine = new TransactionEngine<BattleState, { type: 'corrupt-fuse' }, null>(
      { state: initialState, queue: new EventQueue<{ type: 'corrupt-fuse' }>().snapshot(), rng: null },
      ({ state, event, enqueue }) => {
        applyBattleCommand(state, { type: 'add', entity: { kind: 'defender', definitionId: 'skeleton', cell: { row: 0, column: 0 } } });
        registerCombatEntity(state, combatSession, 0n);
        applyBattleCommand(state, { type: 'add', entity: { kind: 'defender', definitionId: 'skeleton', cell: { row: 0, column: 1 } } });
        registerCombatEntity(state, combatSession, 1n);
        enqueue({ payload: { type: 'corrupt-fuse' }, scheduledTick: 2, causalDepth: 0 });
        // Corrupt occupancy to force applyFusionCommand contract error mid-transaction.
        state.occupancy[cellIndex({ row: 0, column: 0 })] = null;
        applyFusionCommand(state, fusionSession, combatSession, { type: 'fuse', sourceId: 0n, targetId: 1n }, event.id);
      },
    );

    engine.enqueue({ payload: { type: 'corrupt-fuse' }, scheduledTick: 1, causalDepth: 0 }, 0);
    const beforeEngine = engine.snapshot();
    const res = engine.execute(1, 10);
    expect(res).toMatchObject({ status: 'FAILED', diagnostic: { code: 'CONTRACT_ERROR', tick: 1 } });
    expect(engine.snapshot()).toEqual(beforeEngine);
  });

  it('replays deterministically with identical config, seed and inputs and isolates snapshot.fusion mutations', () => {
    function runScenario() {
      const game = createBattle();
      game.enqueue({ type: 'summon', definitionId: 'iron_golem', cell: { row: 0, column: 0 } }, 1); // 0n
      game.enqueue({ type: 'summon', definitionId: 'snow_golem', cell: { row: 2, column: 4 } }, 1); // 1n
      game.enqueue({ type: 'add', entity: { kind: 'defender', definitionId: 'blaze', cell: { row: 3, column: 1 } } }, 1); // 2n
      game.enqueue({ type: 'add', entity: { kind: 'defender', definitionId: 'wolf', cell: { row: 3, column: 5 } } }, 1); // 3n
      game.enqueue({ type: 'spawn-enemy', definitionId: 'enemy_stop', lane: 2 }, 1); // 4n
      game.enqueue({ type: 'fuse', sourceId: 0n, targetId: 1n }, 2); // frost_guardian 5n at (2, 4)
      game.enqueue({ type: 'fuse', sourceId: 2n, targetId: 3n }, 2); // flame_fang 6n at (3, 5)
      game.enqueue({ type: 'fuse', sourceId: 5n, targetId: 6n }, 3); // no-recipe rejection
      step(game, 6);
      return game.snapshot();
    }

    const first = runScenario();
    const second = runScenario();
    expect(first).toEqual(second);

    // Snapshot isolation check on live runtime.
    const live = createBattle();
    live.enqueue({ type: 'summon', definitionId: 'skeleton', cell: { row: 0, column: 0 } }, 1);
    live.enqueue({ type: 'summon', definitionId: 'skeleton', cell: { row: 0, column: 1 } }, 1);
    live.enqueue({ type: 'fuse', sourceId: 0n, targetId: 1n }, 1);
    step(live);

    const snap = live.snapshot();
    const mutated = live.snapshot();
    mutated.fusion!.outcome = null;
    expect(live.snapshot()).toEqual(snap);
    expect(live.snapshot().fusion?.outcome?.status).toBe('APPLIED');
  });
});
