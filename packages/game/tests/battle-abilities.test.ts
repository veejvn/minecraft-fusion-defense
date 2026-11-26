import { describe, expect, it } from 'vitest';
import {
  applyAbilityCommand,
  applyDamagePipeline,
  stepAbilityTickPhase,
} from '../src/abilities/ability-engine';
import {
  validateAbilitySession,
  type AbilityDefinition,
  type AbilitySessionInput,
} from '../src/abilities/ability-session';
import { createAbilityState } from '../src/abilities/ability-state';
import { cellIndex } from '../src/battlefield/grid';
import { validateCombatSession, type CombatSessionInput } from '../src/combat/combat-session';
import { createCombatState, registerCombatEntity } from '../src/combat/combat-state';
import { applyBattleCommand, createBattleState, type BattleState } from '../src/core/battle-state';
import type { ResourceSessionInput } from '../src/core/resource-session';
import { validateResourceSession } from '../src/core/resource-session';
import { TransactionEngine } from '../src/core/transaction';
import { EventQueue } from '../src/events/event-queue';
import type { FusionSessionInput } from '../src/fusion/fusion-session';
import { BattleRuntime } from '../src/systems/battle-runtime';
import type { WaveConfigDefinition, WaveSessionInput } from '../src/waves/wave-session';

// Test-only fixtures. Never treat these values as approved production balance.
function resourceFixture(overrides: Partial<ResourceSessionInput> = {}): ResourceSessionInput {
  return {
    seed: 1,
    defenders: [
      { id: 'snow_golem', classification: 'base', summonEnergyCost: 0, unlocked: true },
      { id: 'iron_golem', classification: 'base', summonEnergyCost: 0, unlocked: true },
      { id: 'skeleton', classification: 'base', summonEnergyCost: 0, unlocked: true },
      { id: 'wolf', classification: 'base', summonEnergyCost: 0, unlocked: true },
      { id: 'blaze', classification: 'base', summonEnergyCost: 0, unlocked: true },
      { id: 'skeleton_sniper', classification: 'fusion', summonEnergyCost: 0, unlocked: true },
      { id: 'ice_golem', classification: 'fusion', summonEnergyCost: 0, unlocked: true },
      { id: 'frost_guardian', classification: 'fusion', summonEnergyCost: 0, unlocked: true },
      { id: 'flame_fang', classification: 'fusion', summonEnergyCost: 0, unlocked: true },
      { id: 'inferno_archer', classification: 'fusion', summonEnergyCost: 0, unlocked: true },
      { id: 'alpha_wolf', classification: 'fusion', summonEnergyCost: 0, unlocked: true },
      { id: 'steel_guardian', classification: 'fusion', summonEnergyCost: 0, unlocked: true },
      { id: 'stun_totem', classification: 'base', summonEnergyCost: 0, unlocked: true },
      { id: 'slow_totem', classification: 'base', summonEnergyCost: 0, unlocked: true },
      { id: 'plain_unit', classification: 'base', summonEnergyCost: 0, unlocked: true },
    ],
    enemies: [
      { id: 'enemy_grunt', energy: 50, crystals: 1 },
      { id: 'enemy_armored', energy: 75, crystals: 1 },
      { id: 'enemy_fire_res', energy: 75, crystals: 0 },
      { id: 'enemy_freeze_immune', energy: 100, crystals: 1 },
      { id: 'enemy_freeze_res', energy: 100, crystals: 0 },
      { id: 'enemy_pass', energy: 50, crystals: 0 },
    ],
    waves: [
      { id: 'wave_1', crystals: 5 },
      { id: 'wave_2', crystals: 5 },
      { id: 'wave_3', crystals: 5 },
      { id: 'wave_4', crystals: 5 },
      { id: 'wave_5', crystals: 5 },
    ],
    energyItems: {
      amount: 10,
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
      { id: 'snow_golem', maxHp: 100, damage: 0, attackSpeed: 1, attackRange: 4, targeting: 'CLOSEST_TO_BASE' },
      { id: 'iron_golem', maxHp: 200, damage: 20, attackSpeed: 1, attackRange: 4, targeting: 'CLOSEST_TO_BASE' },
      { id: 'skeleton', maxHp: 100, damage: 15, attackSpeed: 1, attackRange: 5, targeting: 'CLOSEST_TO_BASE' },
      { id: 'wolf', maxHp: 100, damage: 20, attackSpeed: 1, attackRange: 2, targeting: 'CLOSEST_TO_BASE' },
      { id: 'blaze', maxHp: 100, damage: 20, attackSpeed: 1, attackRange: 4, targeting: 'CLOSEST_TO_BASE' },
      { id: 'skeleton_sniper', maxHp: 150, damage: 30, attackSpeed: 1, attackRange: 9, targeting: 'CLOSEST_TO_BASE' },
      { id: 'ice_golem', maxHp: 180, damage: 0, attackSpeed: 1, attackRange: 5, targeting: 'CLOSEST_TO_BASE' },
      { id: 'frost_guardian', maxHp: 400, damage: 0, attackSpeed: 1, attackRange: 4, targeting: 'CLOSEST_TO_BASE' },
      { id: 'flame_fang', maxHp: 250, damage: 25, attackSpeed: 1, attackRange: 2, targeting: 'CLOSEST_TO_BASE' },
      { id: 'inferno_archer', maxHp: 200, damage: 30, attackSpeed: 1, attackRange: 9, targeting: 'CLOSEST_TO_BASE' },
      { id: 'alpha_wolf', maxHp: 200, damage: 40, attackSpeed: 1, attackRange: 2, targeting: 'CLOSEST_TO_BASE' },
      { id: 'steel_guardian', maxHp: 300, damage: 0, attackSpeed: 1, attackRange: 2, targeting: 'CLOSEST_TO_BASE', armor: 100 },
      { id: 'stun_totem', maxHp: 100, damage: 0, attackSpeed: 1, attackRange: 0, targeting: 'CLOSEST_TO_BASE' },
      { id: 'slow_totem', maxHp: 100, damage: 0, attackSpeed: 1, attackRange: 0, targeting: 'CLOSEST_TO_BASE' },
      { id: 'plain_unit', maxHp: 100, damage: 10, attackSpeed: 1, attackRange: 4, targeting: 'CLOSEST_TO_BASE', armor: 10 },
    ],
    enemies: [
      { id: 'enemy_grunt', maxHp: 1000, moveSpeed: 1, behavior: 'STOP_AND_ATTACK', damage: 20, attackSpeed: 1, attackRange: 0 },
      { id: 'enemy_armored', maxHp: 1000, moveSpeed: 1, behavior: 'STOP_AND_ATTACK', damage: 20, attackSpeed: 1, attackRange: 0, armor: 50 },
      { id: 'enemy_fire_res', maxHp: 1000, moveSpeed: 1, behavior: 'STOP_AND_ATTACK', damage: 20, attackSpeed: 1, attackRange: 0, armor: 0, fireResistancePct: 0.5 },
      { id: 'enemy_freeze_immune', maxHp: 1000, moveSpeed: 1, behavior: 'IGNORE_DEFENDER', freezeImmune: true },
      { id: 'enemy_freeze_res', maxHp: 1000, moveSpeed: 1, behavior: 'IGNORE_DEFENDER', freezeResistancePct: 0.5 },
      { id: 'enemy_pass', maxHp: 1000, moveSpeed: 1, behavior: 'IGNORE_DEFENDER' },
    ],
    ...overrides,
  };
}

// Test-only fixtures. Never treat these values as approved production balance.
function fusionFixture(overrides: Partial<FusionSessionInput> = {}): FusionSessionInput {
  return {
    defenders: [
      { id: 'snow_golem', tier: 1 },
      { id: 'iron_golem', tier: 1 },
      { id: 'skeleton', tier: 1 },
      { id: 'wolf', tier: 1 },
      { id: 'blaze', tier: 1 },
      { id: 'skeleton_sniper', tier: 2 },
      { id: 'ice_golem', tier: 2 },
      { id: 'frost_guardian', tier: 2 },
      { id: 'flame_fang', tier: 2 },
      { id: 'inferno_archer', tier: 2 },
      { id: 'alpha_wolf', tier: 2 },
      { id: 'steel_guardian', tier: 2 },
      { id: 'stun_totem', tier: 1 },
      { id: 'slow_totem', tier: 1 },
      { id: 'plain_unit', tier: 1 },
    ],
    recipes: [
      { id: 'fusion_frost_guardian', inputDefenderIds: ['iron_golem', 'snow_golem'], outputDefenderId: 'frost_guardian', unlocked: true, enabled: true },
      { id: 'fusion_alpha_wolf', inputDefenderIds: ['wolf', 'wolf'], outputDefenderId: 'alpha_wolf', unlocked: true, enabled: true },
      { id: 'fusion_steel_guardian', inputDefenderIds: ['iron_golem', 'iron_golem'], outputDefenderId: 'steel_guardian', unlocked: true, enabled: true },
      { id: 'fusion_skeleton_sniper', inputDefenderIds: ['skeleton', 'skeleton'], outputDefenderId: 'skeleton_sniper', unlocked: true, enabled: true },
      { id: 'fusion_flame_fang', inputDefenderIds: ['blaze', 'wolf'], outputDefenderId: 'flame_fang', unlocked: true, enabled: true },
    ],
    ...overrides,
  };
}

// Test-only fixtures. Never treat these values as approved production balance.
function abilityFixture(overrides: Partial<AbilitySessionInput> = {}): AbilitySessionInput {
  const abilities: AbilityDefinition[] = [
    {
      id: 'blizzard',
      ownerDefenderId: 'snow_golem',
      powerCrystalCost: 1,
      cooldownSeconds: 0,
      requiresTarget: true,
      targetScope: 'same-lane-enemies',
      effects: [
        { kind: 'status', scope: 'same-lane-enemies', status: { kind: 'slow', slowPct: 0.5, durationSeconds: 5 } },
      ],
    },
    {
      id: 'earthquake',
      ownerDefenderId: 'iron_golem',
      powerCrystalCost: 1,
      cooldownSeconds: 0,
      requiresTarget: true,
      targetScope: 'same-lane-enemies',
      effects: [
        {
          kind: 'instant-damage',
          scope: 'same-lane-enemies',
          damageMultiplier: 3,
          damageType: 'physical',
          applyStatus: { kind: 'stun', durationSeconds: 2 },
        },
      ],
    },
    {
      id: 'arrow_storm',
      ownerDefenderId: 'skeleton',
      powerCrystalCost: 1,
      cooldownSeconds: 0,
      requiresTarget: true,
      targetScope: 'same-lane-enemy-in-range',
      effects: [
        {
          kind: 'multihit-projectile',
          count: 8,
          intervalSeconds: 0.2,
          damageMultiplier: 1,
          damageType: 'physical',
          projectileSpeed: 10,
          pierce: false,
        },
      ],
    },
    {
      id: 'pack_frenzy',
      ownerDefenderId: 'wolf',
      powerCrystalCost: 1,
      cooldownSeconds: 0,
      requiresTarget: false,
      targetScope: 'self',
      effects: [
        {
          kind: 'status',
          scope: 'self',
          status: { kind: 'buff', attackSpeedBonusPct: 0.5, attackDamageBonusPct: 0.5, durationSeconds: 5 },
        },
      ],
    },
    {
      id: 'inferno',
      ownerDefenderId: 'blaze',
      powerCrystalCost: 1,
      cooldownSeconds: 0,
      requiresTarget: true,
      targetScope: 'same-lane-enemies',
      effects: [
        {
          kind: 'instant-damage',
          scope: 'same-lane-enemies',
          damageMultiplier: 3,
          damageType: 'fire',
          armorPiercing: true,
          applyStatus: {
            kind: 'burn',
            damageMultiplierPerSecond: 0.5,
            durationSeconds: 5,
            tickIntervalSeconds: 1,
            damageType: 'fire',
          },
        },
      ],
    },
    {
      id: 'piercing_barrage',
      ownerDefenderId: 'skeleton_sniper',
      powerCrystalCost: 1,
      cooldownSeconds: 0,
      requiresTarget: false,
      targetScope: 'self',
      effects: [
        {
          kind: 'projectile',
          damageMultiplier: 6,
          damageType: 'physical',
          projectileSpeed: 20,
          pierce: true,
        },
      ],
    },
    {
      id: 'absolute_zero',
      ownerDefenderId: 'ice_golem',
      powerCrystalCost: 1,
      cooldownSeconds: 0,
      requiresTarget: true,
      targetScope: 'all-enemies',
      effects: [
        { kind: 'status', scope: 'all-enemies', status: { kind: 'freeze', durationSeconds: 4 } },
      ],
    },
    {
      id: 'glacial_fortress',
      ownerDefenderId: 'frost_guardian',
      powerCrystalCost: 1,
      cooldownSeconds: 0,
      requiresTarget: false,
      targetScope: 'self',
      effects: [
        {
          kind: 'shield',
          shieldMaxHpPct: 0.5,
          frontSlowZone: { slowPct: 0.5, residualDurationSeconds: 5 },
        },
      ],
    },
    {
      id: 'wildfire_rush',
      ownerDefenderId: 'flame_fang',
      powerCrystalCost: 1,
      cooldownSeconds: 0,
      requiresTarget: true,
      targetScope: 'melee-enemy',
      effects: [
        {
          kind: 'multihit-melee',
          count: 5,
          intervalSeconds: 0.2,
          damageMultiplier: 1,
          damageType: 'fire',
          range: 1.5,
          applyStatus: {
            kind: 'burn',
            damageMultiplierPerSecond: 0.4,
            durationSeconds: 5,
            tickIntervalSeconds: 1,
            damageType: 'fire',
          },
        },
      ],
    },
    {
      id: 'meteor_arrow_rain',
      ownerDefenderId: 'inferno_archer',
      powerCrystalCost: 1,
      cooldownSeconds: 0,
      requiresTarget: true,
      targetScope: 'area-3x3-closest-enemy',
      effects: [
        {
          kind: 'multihit-falling-area',
          count: 8,
          intervalSeconds: 0.2,
          travelSeconds: 0.1,
          radius: 1,
          damageMultiplier: 1,
          damageType: 'fire',
          applyStatus: {
            kind: 'burn',
            damageMultiplierPerSecond: 0.5,
            durationSeconds: 5,
            tickIntervalSeconds: 1,
            damageType: 'fire',
          },
        },
      ],
    },
    {
      id: 'alpha_howl',
      ownerDefenderId: 'alpha_wolf',
      powerCrystalCost: 1,
      cooldownSeconds: 0,
      requiresTarget: false,
      targetScope: 'ally-3x3',
      effects: [
        {
          kind: 'status',
          scope: 'ally-3x3',
          radius: 1,
          status: { kind: 'buff', attackSpeedBonusPct: 0.25, attackDamageBonusPct: 0.25, durationSeconds: 5 },
        },
      ],
    },
    {
      id: 'iron_bastion',
      ownerDefenderId: 'steel_guardian',
      powerCrystalCost: 1,
      cooldownSeconds: 0,
      requiresTarget: false,
      targetScope: 'ally-3x3',
      effects: [
        { kind: 'shield', shieldMaxHpPct: 1 },
        { kind: 'redirect', radius: 1, redirectSharePct: 0.5, durationSeconds: 8 },
      ],
    },
    {
      id: 'test_ally_stun',
      ownerDefenderId: 'stun_totem',
      powerCrystalCost: 0,
      cooldownSeconds: 0,
      requiresTarget: false,
      targetScope: 'ally-3x3',
      effects: [
        { kind: 'status', scope: 'ally-3x3', radius: 1, status: { kind: 'stun', durationSeconds: 0.4 } },
      ],
    },
    {
      id: 'test_strong_slow',
      ownerDefenderId: 'slow_totem',
      powerCrystalCost: 0,
      cooldownSeconds: 0,
      requiresTarget: true,
      targetScope: 'same-lane-enemies',
      effects: [
        { kind: 'status', scope: 'same-lane-enemies', status: { kind: 'slow', slowPct: 0.25, durationSeconds: 5 } },
      ],
    },
  ];
  return { abilities, ...overrides };
}

function makeWave(id: string, enemyId: string, lane = 0): WaveConfigDefinition {
  return {
    id,
    initialDelaySeconds: 0,
    delayBeforeNextWaveSeconds: 1,
    spawnGroups: [
      {
        enemyId,
        count: 1,
        allowedLanes: [lane],
        laneMode: 'fixed',
        startOffsetSeconds: 0,
        intervalSeconds: 0,
      },
    ],
  };
}

function createBattle(options: {
  ticksPerSecond?: number;
  resources?: ResourceSessionInput;
  combat?: CombatSessionInput;
  fusion?: FusionSessionInput;
  waves?: WaveSessionInput;
  abilities?: AbilitySessionInput;
} = {}) {
  const ticksPerSecond = options.ticksPerSecond ?? 10;
  return new BattleRuntime(
    { ticksPerSecond, maxCatchUpTicks: 250 },
    options.resources ?? resourceFixture(),
    options.combat ?? combatFixture(),
    options.fusion,
    options.waves,
    options.abilities ?? abilityFixture(),
  );
}

const step = (game: BattleRuntime, ticks = 1, ticksPerSecond = 10) =>
  game.advance((ticks * 1000) / ticksPerSecond);

describe('AC-01 AbilitySessionInput fail-closed validation & deep freeze', () => {
  it('rejects malformed, duplicate, unknown, negative-cost/cooldown, unresourced, or invalid effect inputs and deeply freezes validated session', () => {
    const combat = validateCombatSession(combatFixture(), 10);
    const resources = validateResourceSession(resourceFixture(), 10);
    const valid = abilityFixture();

    const session = validateAbilitySession(valid, 10, combat, resources);
    expect(Object.isFrozen(session)).toBe(true);
    expect(Object.isFrozen(session.abilities)).toBe(true);
    expect(Object.isFrozen(session.abilities[0])).toBe(true);
    expect(Object.isFrozen(session.abilities[0].effects)).toBe(true);
    expect(Object.isFrozen(session.abilities[0].effects[0])).toBe(true);
    expect(Object.isFrozen(session.abilitiesById)).toBe(true);
    expect(Object.isFrozen(session.abilitiesByDefenderId)).toBe(true);
    expect(Object.isFrozen(session.cooldownTicksById)).toBe(true);

    // Mutating caller input after construction does not affect runtime.
    const mutable = abilityFixture();
    const game = createBattle({ abilities: mutable });
    (mutable.abilities[0] as { powerCrystalCost: number }).powerCrystalCost = 99;
    game.enqueue({ type: 'wave-reward', sourceId: 'wave_1' }, 1);
    game.enqueue({ type: 'summon', definitionId: 'snow_golem', cell: { row: 0, column: 0 } }, 1);
    game.enqueue({ type: 'add', entity: { kind: 'enemy', definitionId: 'enemy_pass', lane: 0, position: 5 } }, 1);
    game.enqueue({ type: 'activate-ability', defenderId: 0n }, 1);
    step(game);
    expect(game.snapshot().abilities?.outcome?.status).toBe('APPLIED');
    expect(game.snapshot().resources?.crystals).toBe(4);

    // Missing input / combatSession / non-empty array.
    expect(() => validateAbilitySession(undefined as never, 10, combat, resources)).toThrow(TypeError);
    expect(() => validateAbilitySession(null as never, 10, combat, resources)).toThrow(TypeError);
    expect(() => validateAbilitySession(valid, 10, undefined, resources)).toThrow(TypeError);
    expect(() => validateAbilitySession({ abilities: [] }, 10, combat, resources)).toThrow(TypeError);

    // Invalid / duplicate ability IDs.
    expect(() => validateAbilitySession({ abilities: [{ ...valid.abilities[0], id: 'BadId' }] }, 10, combat, resources)).toThrow(TypeError);
    expect(() => validateAbilitySession({
      abilities: [valid.abilities[0], { ...valid.abilities[1], id: valid.abilities[0].id }],
    }, 10, combat, resources)).toThrow(TypeError);

    // Duplicate & unknown ownerDefenderId.
    expect(() => validateAbilitySession({
      abilities: [valid.abilities[0], { ...valid.abilities[1], ownerDefenderId: valid.abilities[0].ownerDefenderId }],
    }, 10, combat, resources)).toThrow(TypeError);
    expect(() => validateAbilitySession({
      abilities: [{ ...valid.abilities[0], ownerDefenderId: 'unknown_defender' }],
    }, 10, combat, resources)).toThrow(TypeError);

    // Negative cost / cooldown & cost > 0 without resourceSession.
    expect(() => validateAbilitySession({
      abilities: [{ ...valid.abilities[0], powerCrystalCost: -1 }],
    }, 10, combat, resources)).toThrow(RangeError);
    expect(() => validateAbilitySession({
      abilities: [{ ...valid.abilities[0], cooldownSeconds: -0.1 }],
    }, 10, combat, resources)).toThrow(RangeError);
    expect(() => validateAbilitySession(valid, 10, combat, undefined)).toThrow(TypeError);

    // Invalid percentages, counts, intervals, radii, shields.
    expect(() => validateAbilitySession({
      abilities: [{
        ...valid.abilities[0],
        effects: [{ kind: 'status', scope: 'same-lane-enemies', status: { kind: 'slow', slowPct: 1.5, durationSeconds: 2 } }],
      }],
    }, 10, combat, resources)).toThrow(RangeError);
    expect(() => validateAbilitySession({
      abilities: [{
        ...valid.abilities[11],
        effects: [{ kind: 'redirect', radius: -1, redirectSharePct: 0.5, durationSeconds: 2 }],
      }],
    }, 10, combat, resources)).toThrow(RangeError);
    expect(() => validateAbilitySession({
      abilities: [{
        ...valid.abilities[11],
        effects: [{ kind: 'redirect', radius: 1, redirectSharePct: 0, durationSeconds: 2 }],
      }],
    }, 10, combat, resources)).toThrow(RangeError);
    expect(() => validateAbilitySession({
      abilities: [{
        ...valid.abilities[2],
        effects: [{
          kind: 'multihit-projectile',
          count: 0,
          intervalSeconds: 0.2,
          damageMultiplier: 1,
          damageType: 'physical',
          projectileSpeed: 10,
          pierce: false,
        }],
      }],
    }, 10, combat, resources)).toThrow(RangeError);
    expect(() => validateAbilitySession({
      abilities: [{
        ...valid.abilities[2],
        effects: [{
          kind: 'multihit-projectile',
          count: 2,
          intervalSeconds: 0,
          damageMultiplier: 1,
          damageType: 'physical',
          projectileSpeed: 10,
          pierce: false,
        }],
      }],
    }, 10, combat, resources)).toThrow(RangeError);
    expect(() => validateAbilitySession({
      abilities: [{
        ...valid.abilities[7],
        effects: [{ kind: 'shield', shieldMaxHpPct: 0 }],
      }],
    }, 10, combat, resources)).toThrow(RangeError);
  });
});

describe('AC-02 Power Crystal consumption, insufficient crystals & per-unit cooldowns', () => {
  it('deducts Power Crystals without touching Energy, rejects insufficient crystals cleanly, and enforces per-unit cooldowns', () => {
    const abilities = abilityFixture({
      abilities: abilityFixture().abilities.map(a =>
        a.id === 'pack_frenzy' ? { ...a, powerCrystalCost: 2, cooldownSeconds: 1.0 } : a,
      ),
    });
    const game = createBattle({ abilities, fusion: fusionFixture() });
    game.enqueue({ type: 'summon', definitionId: 'wolf', cell: { row: 0, column: 0 } }, 1); // 0n
    game.enqueue({ type: 'summon', definitionId: 'wolf', cell: { row: 1, column: 0 } }, 1); // 1n
    game.enqueue({ type: 'wave-reward', sourceId: 'wave_1' }, 1); // +5 crystals (energy = 50)
    step(game);

    const beforeCast = game.snapshot();
    expect(beforeCast.resources?.energy).toBe(50);
    expect(beforeCast.resources?.crystals).toBe(5);

    // Cast #1 on 0n -> costs 2 crystals (5 -> 3), Energy remains 50, cooldown = 10 ticks.
    game.enqueue({ type: 'activate-ability', defenderId: 0n }, 2);
    step(game);
    const afterCast1 = game.snapshot();
    expect(afterCast1.abilities?.outcome).toMatchObject({ status: 'APPLIED', defenderId: 0n, abilityId: 'pack_frenzy' });
    expect(afterCast1.resources?.crystals).toBe(3);
    expect(afterCast1.resources?.energy).toBe(50);
    expect(afterCast1.abilities?.cooldowns.get(0n)).toBe(10);

    // Re-activating 0n immediately rejects with 'on-cooldown' without spending crystals or mutating Energy/Grid.
    game.enqueue({ type: 'activate-ability', defenderId: 0n }, 3);
    step(game);
    const afterCooldownReject = game.snapshot();
    expect(afterCooldownReject.abilities?.outcome).toMatchObject({ status: 'REJECTED', reason: 'on-cooldown' });
    expect(afterCooldownReject.resources?.crystals).toBe(3);
    expect(afterCooldownReject.resources?.energy).toBe(50);

    // Second unit (1n) has independent cooldown -> succeeds (crystals 3 -> 1).
    game.enqueue({ type: 'activate-ability', defenderId: 1n }, 4);
    step(game);
    expect(game.snapshot().abilities?.outcome?.status).toBe('APPLIED');
    expect(game.snapshot().resources?.crystals).toBe(1);

    // Advance until 0n's cooldown expires (tick 2 + 10 = tick 12), now crystals = 1 < 2 -> 'insufficient-crystals'.
    step(game, 8); // tick 12
    expect(game.snapshot().abilities?.cooldowns.has(0n)).toBe(false);
    const beforeInsufficient = game.snapshot();
    game.enqueue({ type: 'activate-ability', defenderId: 0n }, 13);
    step(game);
    const afterInsufficient = game.snapshot();
    expect(afterInsufficient.abilities?.outcome).toMatchObject({ status: 'REJECTED', reason: 'insufficient-crystals' });
    expect(afterInsufficient.resources?.crystals).toBe(beforeInsufficient.resources?.crystals);
    expect(afterInsufficient.resources?.energy).toBe(beforeInsufficient.resources?.energy);
    expect(afterInsufficient.occupancy).toEqual(beforeInsufficient.occupancy);
    expect(afterInsufficient.abilities?.cooldowns.has(0n)).toBe(false);

    // Structured rejections for invalid-owner, owner-dead, owner-disabled, ability-unavailable, and invalid-target-cell.
    const rejectGame = createBattle();
    rejectGame.enqueue({ type: 'wave-reward', sourceId: 'wave_1' }, 1);
    rejectGame.enqueue({ type: 'add', entity: { kind: 'defender', definitionId: 'plain_unit', cell: { row: 0, column: 0 } } }, 1); // 0n (no ability)
    rejectGame.enqueue({ type: 'add', entity: { kind: 'defender', definitionId: 'wolf', cell: { row: 0, column: 1 } } }, 1); // 1n
    rejectGame.enqueue({ type: 'add', entity: { kind: 'defender', definitionId: 'stun_totem', cell: { row: 0, column: 2 } } }, 1); // 2n
    rejectGame.enqueue({ type: 'add', entity: { kind: 'enemy', definitionId: 'enemy_pass', lane: 0, position: 8 } }, 1); // 3n (not defender)
    step(rejectGame);

    rejectGame.enqueue({ type: 'activate-ability', defenderId: 99n }, 2);
    step(rejectGame);
    expect(rejectGame.snapshot().abilities?.outcome).toMatchObject({ status: 'REJECTED', reason: 'invalid-owner' });

    rejectGame.enqueue({ type: 'activate-ability', defenderId: 3n }, 3);
    step(rejectGame);
    expect(rejectGame.snapshot().abilities?.outcome).toMatchObject({ status: 'REJECTED', reason: 'invalid-owner' });

    rejectGame.enqueue({ type: 'activate-ability', defenderId: 0n }, 4);
    step(rejectGame);
    expect(rejectGame.snapshot().abilities?.outcome).toMatchObject({ status: 'REJECTED', reason: 'ability-unavailable' });

    rejectGame.enqueue({ type: 'activate-ability', defenderId: 1n, targetCell: { row: 5, column: 0 } }, 5);
    step(rejectGame);
    expect(rejectGame.snapshot().abilities?.outcome).toMatchObject({ status: 'REJECTED', reason: 'invalid-target-cell' });

    rejectGame.enqueue({ type: 'activate-ability', defenderId: 2n }, 6); // stun 1n
    rejectGame.enqueue({ type: 'activate-ability', defenderId: 1n }, 6);
    step(rejectGame);
    expect(rejectGame.snapshot().abilities?.outcome).toMatchObject({ status: 'REJECTED', reason: 'owner-disabled' });
    expect(rejectGame.snapshot().resources?.crystals).toBe(5);

    const deadCombatSession = validateCombatSession(combatFixture(), 10, validateResourceSession(resourceFixture(), 10));
    const deadAbilitySession = validateAbilitySession(abilityFixture(), 10, deadCombatSession, validateResourceSession(resourceFixture(), 10));
    const deadBattle: BattleState = { ...createBattleState(), combat: createCombatState(), abilities: createAbilityState() };
    applyBattleCommand(deadBattle, { type: 'add', entity: { kind: 'defender', definitionId: 'wolf', cell: { row: 0, column: 0 } } });
    registerCombatEntity(deadBattle, deadCombatSession, 0n);
    deadBattle.combat!.entities.get(0n)!.hp = 0;
    applyAbilityCommand(
      { battle: deadBattle, combat: deadBattle.combat!, session: deadCombatSession, abilitySession: deadAbilitySession },
      { type: 'activate-ability', defenderId: 0n },
      'ev-owner-dead',
      () => {},
    );
    expect(deadBattle.abilities?.outcome).toMatchObject({ status: 'REJECTED', reason: 'owner-dead' });
  });
});

describe('AC-03 Activation eligibility (target-dependent vs self/proactive)', () => {
  it('rejects all 7 target-dependent abilities with no-target without spending crystals when no eligible enemy exists', () => {
    const cases: readonly { defenderDef: string; abilityId: string }[] = [
      { defenderDef: 'snow_golem', abilityId: 'blizzard' },
      { defenderDef: 'iron_golem', abilityId: 'earthquake' },
      { defenderDef: 'skeleton', abilityId: 'arrow_storm' },
      { defenderDef: 'blaze', abilityId: 'inferno' },
      { defenderDef: 'ice_golem', abilityId: 'absolute_zero' },
      { defenderDef: 'flame_fang', abilityId: 'wildfire_rush' },
      { defenderDef: 'inferno_archer', abilityId: 'meteor_arrow_rain' },
    ];

    for (const { defenderDef, abilityId } of cases) {
      const game = createBattle();
      game.enqueue({ type: 'wave-reward', sourceId: 'wave_1' }, 1);
      game.enqueue({ type: 'add', entity: { kind: 'defender', definitionId: defenderDef, cell: { row: 0, column: 1 } } }, 1);
      // Place an enemy in lane 2 for lane-only abilities? Wait: absolute_zero and meteor_arrow_rain are board-wide, so test with 0 enemies!
      game.enqueue({ type: 'activate-ability', defenderId: 0n }, 1);
      step(game);
      const snap = game.snapshot();
      expect(snap.abilities?.outcome, abilityId).toMatchObject({
        status: 'REJECTED',
        reason: 'no-target',
        abilityId,
      });
      expect(snap.resources?.crystals).toBe(5);
    }

    // Same-lane abilities also reject when enemy is only in another lane; arrow_storm rejects when enemy is out of range.
    const laneScopeGame = createBattle();
    laneScopeGame.enqueue({ type: 'wave-reward', sourceId: 'wave_1' }, 1);
    laneScopeGame.enqueue({ type: 'add', entity: { kind: 'defender', definitionId: 'snow_golem', cell: { row: 0, column: 0 } } }, 1);
    laneScopeGame.enqueue({ type: 'add', entity: { kind: 'defender', definitionId: 'skeleton', cell: { row: 0, column: 1 } } }, 1);
    laneScopeGame.enqueue({ type: 'add', entity: { kind: 'enemy', definitionId: 'enemy_pass', lane: 2, position: 3 } }, 1);
    laneScopeGame.enqueue({ type: 'activate-ability', defenderId: 0n }, 1);
    step(laneScopeGame);
    expect(laneScopeGame.snapshot().abilities?.outcome).toMatchObject({ status: 'REJECTED', reason: 'no-target' });
    laneScopeGame.enqueue({ type: 'activate-ability', defenderId: 1n }, 2);
    step(laneScopeGame);
    expect(laneScopeGame.snapshot().abilities?.outcome).toMatchObject({ status: 'REJECTED', reason: 'no-target' });
    expect(laneScopeGame.snapshot().resources?.crystals).toBe(5);
  });

  it('allows all 5 self/proactive abilities to activate with 0 enemies on the battlefield', () => {
    const proactive: readonly { defenderDef: string; abilityId: string }[] = [
      { defenderDef: 'wolf', abilityId: 'pack_frenzy' },
      { defenderDef: 'skeleton_sniper', abilityId: 'piercing_barrage' },
      { defenderDef: 'frost_guardian', abilityId: 'glacial_fortress' },
      { defenderDef: 'alpha_wolf', abilityId: 'alpha_howl' },
      { defenderDef: 'steel_guardian', abilityId: 'iron_bastion' },
    ];

    for (const { defenderDef, abilityId } of proactive) {
      const game = createBattle();
      game.enqueue({ type: 'wave-reward', sourceId: 'wave_1' }, 1);
      game.enqueue({ type: 'add', entity: { kind: 'defender', definitionId: defenderDef, cell: { row: 2, column: 2 } } }, 1);
      game.enqueue({ type: 'activate-ability', defenderId: 0n }, 1);
      step(game);
      expect(game.snapshot().abilities?.outcome, abilityId).toMatchObject({
        status: 'APPLIED',
        abilityId,
      });
      expect(game.snapshot().resources?.crystals).toBe(4);
    }
  });
});

describe('AC-04 Instant lane & 5-lane abilities (blizzard, earthquake, inferno, absolute_zero)', () => {
  it('applies blizzard 5s -50% slow to same-lane enemies only while other lanes move at full speed', () => {
    const game = createBattle();
    game.enqueue({ type: 'wave-reward', sourceId: 'wave_1' }, 1);
    game.enqueue({ type: 'summon', definitionId: 'snow_golem', cell: { row: 0, column: 0 } }, 1); // 0n
    game.enqueue({ type: 'add', entity: { kind: 'enemy', definitionId: 'enemy_pass', lane: 0, position: 8 } }, 1); // 1n
    game.enqueue({ type: 'add', entity: { kind: 'enemy', definitionId: 'enemy_pass', lane: 1, position: 8 } }, 1); // 2n
    game.enqueue({ type: 'activate-ability', defenderId: 0n }, 1);
    step(game);

    // Move for 10 ticks (1s): lane 0 slowed by 50% (0.5 cells/s -> 7.5); lane 1 full speed (1.0 cells/s -> 7.0).
    step(game, 10);
    expect(game.snapshot().entities.get(1n)).toMatchObject({ position: 7.5 });
    expect(game.snapshot().entities.get(2n)).toMatchObject({ position: 7.0 });

    // Advance remaining 40 ticks (total 50 ticks: 49 slowed ticks + 1 full-speed tick at tick 51 when slow expires).
    step(game, 40);
    expect(game.snapshot().abilities?.statuses.filter(s => s.kind === 'slow')).toHaveLength(0);
    expect(game.snapshot().entities.get(1n)?.kind === 'enemy' && (game.snapshot().entities.get(1n) as { position: number }).position).toBeCloseTo(5.45, 10);
    step(game, 10);
    expect(game.snapshot().entities.get(1n)?.kind === 'enemy' && (game.snapshot().entities.get(1n) as { position: number }).position).toBeCloseTo(4.45, 10);
  });

  it('applies earthquake 3x physical damage (with armor mitigation) and 2s stun stopping movement & attacks', () => {
    const game = createBattle();
    game.enqueue({ type: 'wave-reward', sourceId: 'wave_1' }, 1);
    game.enqueue({ type: 'summon', definitionId: 'iron_golem', cell: { row: 0, column: 1 } }, 1); // 0n (dmg 20)
    // Enemy at stop position 2.0 (right next to iron_golem at col 1) with armor 50: 3*20 = 60 - 50 = 10 dmg.
    game.enqueue({ type: 'add', entity: { kind: 'enemy', definitionId: 'enemy_armored', lane: 0, position: 2.0 } }, 1); // 1n
    game.enqueue({ type: 'add', entity: { kind: 'enemy', definitionId: 'enemy_pass', lane: 0, position: 8.0 } }, 1); // 2n
    game.enqueue({ type: 'activate-ability', defenderId: 0n }, 1);
    step(game);

    expect(game.snapshot().combat?.entities.get(1n)?.hp).toBe(990); // 1000 - (60 - 50)
    expect(game.snapshot().combat?.entities.get(2n)?.hp).toBe(940); // 1000 - 60

    // For ticks 2..20 (19 combat ticks while 2s stun is active), 1n cannot attack and 2n cannot move from x=8.0.
    step(game, 19);
    expect(game.snapshot().combat?.entities.get(0n)?.hp).toBe(200); // iron_golem took 0 enemy damage while stunned!
    expect(game.snapshot().entities.get(2n)).toMatchObject({ position: 8.0 });

    // Tick 21: 2s stun expires in stepAbilityTickPhase, so enemy 2n resumes moving and 1n attacks iron_golem.
    step(game, 1);
    expect(game.snapshot().entities.get(2n)).toMatchObject({ position: 7.9 });
    expect(game.snapshot().combat?.entities.get(0n)?.hp).toBe(180);
  });

  it('applies inferno 3x armor-piercing fire damage reduced by fireResistancePct + burn', () => {
    const game = createBattle();
    game.enqueue({ type: 'wave-reward', sourceId: 'wave_1' }, 1);
    game.enqueue({ type: 'summon', definitionId: 'blaze', cell: { row: 0, column: 0 } }, 1); // 0n (dmg 20)
    // Out of basic attack range (x=8 > 4.5) so only inferno + burn hit.
    game.enqueue({ type: 'add', entity: { kind: 'enemy', definitionId: 'enemy_grunt', lane: 0, position: 8 } }, 1); // 1n (armor 0, fireRes 0)
    game.enqueue({ type: 'add', entity: { kind: 'enemy', definitionId: 'enemy_armored', lane: 0, position: 8 } }, 1); // 2n (armor 50, fireRes 0)
    game.enqueue({ type: 'add', entity: { kind: 'enemy', definitionId: 'enemy_fire_res', lane: 0, position: 8 } }, 1); // 3n (armor 0, fireRes 0.5)
    game.enqueue({ type: 'activate-ability', defenderId: 0n }, 1);
    step(game);

    // armorPiercing bypasses armor 50 on 2n (60 dmg); 3n fireResistancePct 0.5 reduces 60 -> 30.
    expect(game.snapshot().combat?.entities.get(1n)?.hp).toBe(940);
    expect(game.snapshot().combat?.entities.get(2n)?.hp).toBe(940);
    expect(game.snapshot().combat?.entities.get(3n)?.hp).toBe(970);

    // After 1s (10 ticks), burn ticks once: 20 * 0.5 = 10 raw fire -> 1n takes 10 (930), 3n takes 5 (965).
    step(game, 10);
    expect(game.snapshot().combat?.entities.get(1n)?.hp).toBe(930);
    expect(game.snapshot().combat?.entities.get(3n)?.hp).toBe(965);
  });

  it('applies absolute_zero freeze across all 5 lanes for 4s blocking movement and attacks', () => {
    const game = createBattle();
    game.enqueue({ type: 'wave-reward', sourceId: 'wave_1' }, 1);
    game.enqueue({ type: 'add', entity: { kind: 'defender', definitionId: 'ice_golem', cell: { row: 2, column: 0 } } }, 1); // 0n
    // Place enemies on all 5 lanes, plus a defender on lane 4 next to a STOP_AND_ATTACK enemy.
    game.enqueue({ type: 'add', entity: { kind: 'defender', definitionId: 'plain_unit', cell: { row: 4, column: 1 } } }, 1); // 1n
    game.enqueue({ type: 'add', entity: { kind: 'enemy', definitionId: 'enemy_pass', lane: 0, position: 8 } }, 1); // 2n
    game.enqueue({ type: 'add', entity: { kind: 'enemy', definitionId: 'enemy_pass', lane: 1, position: 8 } }, 1); // 3n
    game.enqueue({ type: 'add', entity: { kind: 'enemy', definitionId: 'enemy_pass', lane: 2, position: 8 } }, 1); // 4n
    game.enqueue({ type: 'add', entity: { kind: 'enemy', definitionId: 'enemy_pass', lane: 3, position: 8 } }, 1); // 5n
    game.enqueue({ type: 'add', entity: { kind: 'enemy', definitionId: 'enemy_grunt', lane: 4, position: 2.0 } }, 1); // 6n
    game.enqueue({ type: 'activate-ability', defenderId: 0n }, 1);
    step(game);

    // For ticks 2..40 (39 combat ticks while 4s freeze is active): all 5 lanes frozen -> no movement, 6n does not attack 1n.
    step(game, 39);
    for (const id of [2n, 3n, 4n, 5n]) {
      expect(game.snapshot().entities.get(id)).toMatchObject({ position: 8 });
    }
    expect(game.snapshot().combat?.entities.get(1n)?.hp).toBe(100);

    // Tick 41 (4s freeze expires in stepAbilityTickPhase): enemies move & 6n attacks 1n.
    step(game, 1);
    expect(game.snapshot().entities.get(2n)).toMatchObject({ position: 7.9 });
    expect(game.snapshot().combat?.entities.get(1n)?.hp).toBe(90); // 20 - 10 armor = 10
  });
});

describe('AC-05 Status stacking, refresh (FR1), strongest slow & freeze immunities', () => {
  it('refreshes same-source status preserving statusId and incrementing version, applies strongest slow, and enforces freeze immunity/resistance & coexistence', () => {
    const game = createBattle();
    game.enqueue({ type: 'wave-reward', sourceId: 'wave_1' }, 1);
    game.enqueue({ type: 'wave-reward', sourceId: 'wave_2' }, 1);
    game.enqueue({ type: 'add', entity: { kind: 'defender', definitionId: 'snow_golem', cell: { row: 0, column: 0 } } }, 1); // 0n (50% slow)
    game.enqueue({ type: 'add', entity: { kind: 'defender', definitionId: 'slow_totem', cell: { row: 0, column: 1 } } }, 1); // 1n (25% slow)
    game.enqueue({ type: 'add', entity: { kind: 'defender', definitionId: 'ice_golem', cell: { row: 1, column: 0 } } }, 1); // 2n (4s freeze)
    game.enqueue({ type: 'add', entity: { kind: 'defender', definitionId: 'iron_golem', cell: { row: 0, column: 2 } } }, 1); // 3n (2s stun)
    game.enqueue({ type: 'add', entity: { kind: 'enemy', definitionId: 'enemy_pass', lane: 0, position: 8 } }, 1); // 4n
    game.enqueue({ type: 'add', entity: { kind: 'enemy', definitionId: 'enemy_freeze_immune', lane: 0, position: 8 } }, 1); // 5n
    game.enqueue({ type: 'add', entity: { kind: 'enemy', definitionId: 'enemy_freeze_res', lane: 0, position: 8 } }, 1); // 6n (50% freeze res)

    // Tick 1: snow_golem casts blizzard (50% slow) + slow_totem casts 25% slow.
    game.enqueue({ type: 'activate-ability', defenderId: 0n }, 1);
    game.enqueue({ type: 'activate-ability', defenderId: 1n }, 1);
    step(game);

    const firstStatus = game.snapshot().abilities?.statuses.find(
      s => s.targetEntityId === 4n && s.sourceEntityId === 0n && s.kind === 'slow',
    );
    expect(firstStatus).toMatchObject({ version: 1, remainingTicks: 50, slowPct: 0.5 });

    // Advance 20 ticks (2s): strongest slow (50%) applies -> moved 1.0 cell (8 -> 7), NOT stacked to 75% or 62.5%.
    step(game, 20);
    expect(game.snapshot().entities.get(4n)).toMatchObject({ position: 7.0 });

    // Tick 22: snow_golem recasts blizzard -> refreshes remainingTicks to 50, preserves statusId, increments version to 2 without duplicate.
    game.enqueue({ type: 'activate-ability', defenderId: 0n }, 22);
    step(game);
    const sameSourceSlows = game.snapshot().abilities!.statuses.filter(
      s => s.targetEntityId === 4n && s.sourceEntityId === 0n && s.kind === 'slow',
    );
    expect(sameSourceSlows).toHaveLength(1);
    expect(sameSourceSlows[0]).toMatchObject({
      statusId: firstStatus!.statusId,
      version: 2,
      remainingTicks: 50,
    });

    // Tick 23: ice_golem casts absolute_zero (4s freeze) and iron_golem casts earthquake (2s stun).
    game.enqueue({ type: 'activate-ability', defenderId: 2n }, 23);
    game.enqueue({ type: 'activate-ability', defenderId: 3n }, 23);
    step(game);

    const statuses = game.snapshot().abilities!.statuses;
    // Freeze skipped on freezeImmune (5n), halved to 20 ticks (2s) on 50% freezeResistancePct (6n), 40 ticks on 4n.
    expect(statuses.some(s => s.targetEntityId === 5n && s.kind === 'freeze')).toBe(false);
    expect(statuses.find(s => s.targetEntityId === 6n && s.kind === 'freeze')?.remainingTicks).toBe(20);
    expect(statuses.find(s => s.targetEntityId === 4n && s.kind === 'freeze')?.remainingTicks).toBe(40);
    // Freeze coexists independently with slow and stun on 4n.
    expect(statuses.some(s => s.targetEntityId === 4n && s.kind === 'slow')).toBe(true);
    expect(statuses.some(s => s.targetEntityId === 4n && s.kind === 'stun')).toBe(true);
  });
});

describe('AC-06 Burn periodic damage, snapshots, multi-source & zero-damage hit confirmation', () => {
  it('ticks every 1.0s using snapshotted Attack Damage, ticks distinct sources independently, persists after caster death/Fusion, and applies on zero post-mitigation hit', () => {
    // 1. Snapshot AD + persistence after caster death/Fusion + independent multi-source ticks.
    const abilities = abilityFixture({
      abilities: abilityFixture().abilities.map(a =>
        a.id === 'inferno'
          ? {
              ...a,
              effects: [
                {
                  kind: 'instant-damage',
                  scope: 'same-lane-enemies',
                  damageMultiplier: 0, // isolate burn ticks cleanly
                  damageType: 'fire',
                  applyStatus: {
                    kind: 'burn',
                    damageMultiplierPerSecond: 1,
                    durationSeconds: 5,
                    tickIntervalSeconds: 1,
                    damageType: 'fire',
                  },
                },
              ],
            }
          : a,
      ),
    });
    const game = createBattle({ abilities, fusion: fusionFixture() });
    game.enqueue({ type: 'wave-reward', sourceId: 'wave_1' }, 1);
    game.enqueue({ type: 'add', entity: { kind: 'defender', definitionId: 'blaze', cell: { row: 0, column: 0 } } }, 1); // 0n (base dmg 20, inside alpha_howl 3x3 -> 25)
    game.enqueue({ type: 'add', entity: { kind: 'defender', definitionId: 'wolf', cell: { row: 2, column: 0 } } }, 1); // 1n (target cell on lane 2 for fusion)
    game.enqueue({ type: 'add', entity: { kind: 'defender', definitionId: 'alpha_wolf', cell: { row: 1, column: 0 } } }, 1); // 2n (+25% buff -> 0n dmg 25)
    game.enqueue({ type: 'add', entity: { kind: 'defender', definitionId: 'blaze', cell: { row: 0, column: 2 } } }, 1); // 3n (outside 3x3 -> base dmg 20)
    game.enqueue({ type: 'add', entity: { kind: 'enemy', definitionId: 'enemy_pass', lane: 0, position: 9 } }, 1); // 4n

    // Buff both blazes with alpha_howl (+25% AD => 25), then cast inferno from 0n at tick 1.
    game.enqueue({ type: 'activate-ability', defenderId: 2n }, 1);
    game.enqueue({ type: 'activate-ability', defenderId: 0n }, 1);
    step(game);

    // Fuse 0n into flame_fang at tick 2 and cast inferno from 3n at tick 4 (distinct sourceEntityId).
    game.enqueue({ type: 'fuse', sourceId: 0n, targetId: 1n }, 2);
    game.enqueue({ type: 'activate-ability', defenderId: 3n }, 4);
    // Kill 3n at tick 5 so both burn sources outlive their casters.
    game.enqueue({ type: 'remove', id: 3n }, 5);
    step(game, 6); // now at tick 7 (elapsed 0.6s after tick 1; burn from 0n due at tick 11).

    expect(game.snapshot().combat?.entities.get(4n)?.hp).toBe(1000);
    // At tick 11 (1.0s after tick 1): 0n's burn ticks once for 25 (1000 -> 975).
    step(game, 4);
    expect(game.snapshot().combat?.entities.get(4n)?.hp).toBe(975);
    // At tick 14 (1.0s after tick 4): 3n's burn (outside alpha_howl 3x3 -> base dmg 20) ticks independently (975 -> 955).
    step(game, 3);
    expect(game.snapshot().combat?.entities.get(4n)?.hp).toBe(955);
    // Advance to tick 55 (5.0s after tick 4 -> 5*25 + 5*20 = 225 total burn damage -> 775 hp).
    step(game, 41);
    expect(game.snapshot().combat?.entities.get(4n)?.hp).toBe(775);
    expect(game.snapshot().abilities?.statuses.filter(s => s.kind === 'burn')).toHaveLength(0);

    // 2. Zero post-mitigation direct damage still confirms hit and applies burn.
    const zeroHitAbilities = abilityFixture({
      abilities: abilityFixture().abilities.map(a =>
        a.id === 'inferno'
          ? {
              ...a,
              effects: [
                {
                  kind: 'instant-damage',
                  scope: 'same-lane-enemies',
                  damageMultiplier: 1, // 20 < enemy_armored armor (50) => 0 post-mitigation direct dmg!
                  damageType: 'fire',
                  armorPiercing: false,
                  applyStatus: {
                    kind: 'burn',
                    damageMultiplierPerSecond: 1,
                    durationSeconds: 5,
                    tickIntervalSeconds: 1,
                    damageType: 'fire',
                  },
                },
              ],
            }
          : a,
      ),
    });
    const zeroGame = createBattle({ abilities: zeroHitAbilities });
    zeroGame.enqueue({ type: 'wave-reward', sourceId: 'wave_1' }, 1);
    zeroGame.enqueue({ type: 'add', entity: { kind: 'defender', definitionId: 'blaze', cell: { row: 0, column: 0 } } }, 1);
    zeroGame.enqueue({ type: 'add', entity: { kind: 'enemy', definitionId: 'enemy_armored', lane: 0, position: 8 } }, 1);
    zeroGame.enqueue({ type: 'activate-ability', defenderId: 0n }, 1);
    step(zeroGame);
    expect(zeroGame.snapshot().combat?.entities.get(1n)?.hp).toBe(1000);
    expect(zeroGame.snapshot().abilities?.statuses.some(s => s.targetEntityId === 1n && s.kind === 'burn')).toBe(true);
  });
});

describe('AC-07 Buff stacking (pack_frenzy & alpha_howl)', () => {
  it('refreshes same-source buff, stacks distinct sources additively against base stats, and keeps 3x3 ally buffs when Alpha Wolf dies or fuses', () => {
    const game = createBattle({ ticksPerSecond: 1 });
    game.enqueue({ type: 'wave-reward', sourceId: 'wave_1' }, 1);
    // Wolf 0n at (1, 1): base damage 20, attackSpeed 1, attackRange 2.
    game.enqueue({ type: 'add', entity: { kind: 'defender', definitionId: 'wolf', cell: { row: 1, column: 1 } } }, 1); // 0n
    // Alpha Wolf #1 (1n) at (0, 0) (in 3x3 of (1,1)); Alpha Wolf #2 (2n) at (2, 2) (in 3x3 of (1,1)); plain_unit (3n) at (1, 4) (outside 3x3 of both).
    game.enqueue({ type: 'add', entity: { kind: 'defender', definitionId: 'alpha_wolf', cell: { row: 0, column: 0 } } }, 1); // 1n
    game.enqueue({ type: 'add', entity: { kind: 'defender', definitionId: 'alpha_wolf', cell: { row: 2, column: 2 } } }, 1); // 2n
    game.enqueue({ type: 'add', entity: { kind: 'defender', definitionId: 'plain_unit', cell: { row: 1, column: 4 } } }, 1); // 3n
    // High-HP enemy in lane 1 at position 2.5 (in range of 0n only; 1n and 2n are on lanes 0 and 2).
    game.enqueue({ type: 'add', entity: { kind: 'enemy', definitionId: 'enemy_pass', lane: 1, position: 2.5 } }, 1); // 4n

    // Cast pack_frenzy on 0n (+50% dmg/spd), alpha_howl on 1n (+25% dmg/spd), alpha_howl on 2n (+25% dmg/spd).
    game.enqueue({ type: 'activate-ability', defenderId: 0n }, 1);
    game.enqueue({ type: 'activate-ability', defenderId: 1n }, 1);
    game.enqueue({ type: 'activate-ability', defenderId: 2n }, 1);
    step(game, 1, 1); // Tick 1

    // Same-source recast of pack_frenzy on 0n at tick 2 refreshes version without stacking.
    game.enqueue({ type: 'activate-ability', defenderId: 0n }, 2);
    // Kill Alpha Wolf #1 (1n) and remove Alpha Wolf #2 (2n) at tick 2!
    game.enqueue({ type: 'remove', id: 1n }, 2);
    game.enqueue({ type: 'remove', id: 2n }, 2);
    step(game, 1, 1); // Tick 2: 0n has 1 + (0.5 + 0.25 + 0.25) = 2.0x dmg (40) & 2.0x spd!
    expect(game.snapshot().combat?.entities.get(4n)?.hp).toBe(960);
    // 1n & 2n removed, their own buffs removed, while 0n retains all 3 buffs (+100% -> 40 dmg), and 3n outside 3x3 got 0 buffs.
    const buffsOn0 = game.snapshot().abilities!.statuses.filter(s => s.targetEntityId === 0n && s.kind === 'buff');
    expect(buffsOn0).toHaveLength(3);
    expect(buffsOn0.find(b => b.sourceEntityId === 0n)?.version).toBe(2);
    expect(game.snapshot().abilities!.statuses.some(s => s.targetEntityId === 1n || s.targetEntityId === 2n)).toBe(false);
    expect(game.snapshot().abilities!.statuses.some(s => s.targetEntityId === 3n)).toBe(false);

    // Tick 3: 0n still hits 4n for 40 (surviving buffs persisted after casters died).
    step(game, 1, 1);
    expect(game.snapshot().combat?.entities.get(4n)?.hp).toBe(920);
  });
});

describe('AC-08 glacial_fortress Shield & front-tile slow zone (TC38, FR2)', () => {
  it('applies front-tile slow only while inside zone, converts to 5s residual slow on shield break, and preserves shieldId/creationOrder on recast', () => {
    const game = createBattle({ ticksPerSecond: 10 });
    game.enqueue({ type: 'wave-reward', sourceId: 'wave_1' }, 1);
    game.enqueue({ type: 'add', entity: { kind: 'defender', definitionId: 'frost_guardian', cell: { row: 0, column: 1 } } }, 1); // 0n (maxHp 400 -> shield 200, zone at (0, 2))
    game.enqueue({ type: 'add', entity: { kind: 'enemy', definitionId: 'enemy_pass', lane: 0, position: 3.05 } }, 1); // 1n (walks through (0,2))
    game.enqueue({ type: 'activate-ability', defenderId: 0n }, 1);
    step(game); // Tick 1

    const initialShield = game.snapshot().abilities!.shields[0];
    expect(initialShield).toMatchObject({ amount: 200, maxAmount: 200 });

    // Tick 2: 1n moves 3.05 -> 2.95 (enters tile col 2!). Not zone-slowed until tick 3's syncGlacialSlowZones.
    step(game);
    // Tick 3: syncGlacialSlowZones adds zone-derived slow (-50%); 1n moves 2.95 -> 2.90!
    step(game);
    expect(game.snapshot().entities.get(1n)).toMatchObject({ position: 2.9 });
    expect(game.snapshot().abilities!.statuses.some(s => s.targetEntityId === 1n && s.isZoneDerived)).toBe(true);

    // Advance 18 ticks (tick 21): 2.95 - 19 * 0.05 = 1.9999999999999998 (just exited tile col 2!).
    step(game, 18);
    expect(game.snapshot().entities.get(1n)?.kind === 'enemy' && (game.snapshot().entities.get(1n) as { position: number }).position).toBeCloseTo(2.0, 8);
    // Tick 22: syncGlacialSlowZones removes zone-derived slow immediately while Shield is still intact, so 1n moves full 0.1!
    step(game);
    expect(game.snapshot().abilities!.statuses.some(s => s.targetEntityId === 1n && s.kind === 'slow')).toBe(false);
    expect(game.snapshot().entities.get(1n)?.kind === 'enemy' && (game.snapshot().entities.get(1n) as { position: number }).position).toBeCloseTo(1.9, 8);

    // Now test Shield recast (FR2) after partial damage, then Shield break residual slow (TC38).
    const recastGame = createBattle({ ticksPerSecond: 10 });
    recastGame.enqueue({ type: 'wave-reward', sourceId: 'wave_1' }, 1);
    recastGame.enqueue({ type: 'add', entity: { kind: 'defender', definitionId: 'frost_guardian', cell: { row: 0, column: 1 } } }, 1); // 0n (shield 200)
    // Enemy with 150 damage/hit at x=2.0 (inside zone (0, 2) and in melee range of col 1).
    recastGame.enqueue({
      type: 'add',
      entity: { kind: 'enemy', definitionId: 'enemy_grunt', lane: 0, position: 2.5 },
    }, 1); // 1n (moves toward stopX=2.0; dmg 20)
    recastGame.enqueue({ type: 'activate-ability', defenderId: 0n }, 1);
    step(recastGame);
    const shieldBefore = recastGame.snapshot().abilities!.shields[0];

    // Enemy walks to 2.0 and hits shield for 20 (shield 200 -> 180).
    step(recastGame, 12);
    expect(recastGame.snapshot().abilities!.shields[0].amount).toBeLessThan(200);

    // Recast glacial_fortress -> resets amount to 200 while preserving shieldId and creationOrder!
    recastGame.enqueue({ type: 'activate-ability', defenderId: 0n }, 14);
    step(recastGame);
    const shieldAfterRecast = recastGame.snapshot().abilities!.shields;
    expect(shieldAfterRecast).toHaveLength(1);
    expect(shieldAfterRecast[0].shieldId).toBe(shieldBefore.shieldId);
    expect(shieldAfterRecast[0].creationOrder).toBe(shieldBefore.creationOrder);
    expect(shieldAfterRecast[0].amount).toBe(200);

    // Let enemy break the 200 shield (10 hits at 1 hit/s = 100 ticks -> shield reaches 0).
    step(recastGame, 100);
    expect(recastGame.snapshot().abilities!.shields).toHaveLength(0);
    // Residual slow (5s = 50 ticks) converted on the enemy inside the zone!
    const residual = recastGame.snapshot().abilities!.statuses.find(
      s => s.targetEntityId === 1n && s.kind === 'slow',
    );
    expect(residual).toBeDefined();
    expect(residual?.isZoneDerived).toBe(false);
    expect(residual?.remainingTicks).toBeGreaterThan(0);
    expect(residual?.remainingTicks).toBeLessThanOrEqual(50);

    // Verify oldest-first absorption across two shields via applyDamagePipeline.
    const combatSession = validateCombatSession(combatFixture(), 10);
    const battle = { ...createBattleState(), combat: createCombatState(), abilities: createAbilityState() };
    applyBattleCommand(battle, { type: 'add', entity: { kind: 'defender', definitionId: 'frost_guardian', cell: { row: 0, column: 0 } } });
    registerCombatEntity(battle, combatSession, 0n);
    battle.abilities.shields.push(
      { shieldId: 10n, creationOrder: 0, ownerId: 0n, abilityId: 'older', amount: 30, maxAmount: 30 },
      { shieldId: 11n, creationOrder: 1, ownerId: 0n, abilityId: 'newer', amount: 50, maxAmount: 50 },
    );
    applyDamagePipeline({ battle, combat: battle.combat, session: combatSession }, 0n, 45, { damageType: 'physical' });
    expect(battle.abilities.shields).toHaveLength(1);
    expect(battle.abilities.shields[0]).toMatchObject({ shieldId: 11n, amount: 35 });
    expect(battle.combat.entities.get(0n)?.hp).toBe(400);
  });
});

describe('AC-09 iron_bastion Shield & 3x3 ally damage Redirect', () => {
  it('maintains 100% Max HP Shield past 8s, redirects 50% post-mitigation damage to nearest Guardian (tie-break lowest ID) without re-applying Guardian armor, preserves shieldPiercing, and kills Guardian without overflow', () => {
    // 1. Tie-break, armor order, 8s redirect expiry vs Shield persistence.
    const game = createBattle({ ticksPerSecond: 1 });
    game.enqueue({ type: 'wave-reward', sourceId: 'wave_1' }, 1);
    game.enqueue({ type: 'add', entity: { kind: 'defender', definitionId: 'steel_guardian', cell: { row: 0, column: 1 } } }, 1); // 0n (armor 100, shield 300)
    game.enqueue({ type: 'add', entity: { kind: 'defender', definitionId: 'steel_guardian', cell: { row: 2, column: 1 } } }, 1); // 1n (tied distance 1 from (1,1))
    game.enqueue({ type: 'add', entity: { kind: 'defender', definitionId: 'plain_unit', cell: { row: 1, column: 1 } } }, 1); // 2n (hp 100, armor 10)
    // Enemy with 50 damage in lane 1 at x=2.0 hitting 2n (40 post-mitigation -> 20 to 2n, 20 to 0n).
    game.enqueue({
      type: 'add',
      entity: { kind: 'enemy', definitionId: 'enemy_grunt', lane: 1, position: 2.0 },
    }, 1); // 3n (note combatFixture enemy_grunt dmg=20 -> 20-10=10 -> 5 each!)

    game.enqueue({ type: 'activate-ability', defenderId: 0n }, 1);
    game.enqueue({ type: 'activate-ability', defenderId: 1n }, 1);
    step(game, 1, 1); // Tick 1

    // Tick 2: enemy 3n hits 2n (dmg 20 - armor 10 = 10 -> 5 to 2n, 5 redirected to 0n's shield ignoring 0n's armor 100!).
    step(game, 1, 1);
    expect(game.snapshot().combat?.entities.get(2n)?.hp).toBe(95);
    expect(game.snapshot().abilities?.shields.find(s => s.ownerId === 0n)?.amount).toBe(295);
    expect(game.snapshot().abilities?.shields.find(s => s.ownerId === 1n)?.amount).toBe(300);

    // Advance 7 more ticks (total 8 ticks after tick 1 -> redirect aura expires at tick 9, shield persists!).
    step(game, 7, 1);
    expect(game.snapshot().abilities?.redirects).toHaveLength(0);
    expect(game.snapshot().abilities?.shields.find(s => s.ownerId === 0n)).toBeDefined();

    // Tick 10: enemy hits 2n with NO redirect left -> full 10 post-mitigation damage hits 2n.
    const hpBeforeNoRedirect = game.snapshot().combat!.entities.get(2n)!.hp;
    step(game, 1, 1);
    expect(game.snapshot().combat!.entities.get(2n)!.hp).toBe(hpBeforeNoRedirect - 10);

    // 2. shieldPiercing bypass + fatal redirect without overflowing excess back onto protected ally.
    const combatSession = validateCombatSession(combatFixture(), 10);
    const battle = { ...createBattleState(), combat: createCombatState(), abilities: createAbilityState() };
    applyBattleCommand(battle, { type: 'add', entity: { kind: 'defender', definitionId: 'steel_guardian', cell: { row: 0, column: 0 } } }); // 0n
    registerCombatEntity(battle, combatSession, 0n);
    applyBattleCommand(battle, { type: 'add', entity: { kind: 'defender', definitionId: 'plain_unit', cell: { row: 0, column: 1 } } }); // 1n (armor 10, hp 100)
    registerCombatEntity(battle, combatSession, 1n);

    battle.abilities.shields.push(
      { shieldId: 1n, creationOrder: 0, ownerId: 0n, abilityId: 'iron_bastion', amount: 300, maxAmount: 300 },
      { shieldId: 2n, creationOrder: 1, ownerId: 1n, abilityId: 'ally_shield', amount: 50, maxAmount: 50 },
    );
    battle.abilities.redirects.push({
      redirectId: 3n,
      ownerId: 0n,
      abilityId: 'iron_bastion',
      radius: 1,
      redirectSharePct: 0.5,
      remainingTicks: 80,
    });

    // shieldPiercing bypasses BOTH ally shield and Guardian shield!
    applyDamagePipeline({ battle, combat: battle.combat, session: combatSession }, 1n, 50, {
      damageType: 'physical',
      shieldPiercing: true,
    });
    // 50 - 10 armor = 40 -> 20 to 0n HP (300->280), 20 to 1n HP (100->80), shields untouched!
    expect(battle.combat.entities.get(0n)?.hp).toBe(280);
    expect(battle.combat.entities.get(1n)?.hp).toBe(80);
    expect(battle.abilities.shields[0].amount).toBe(300);
    expect(battle.abilities.shields[1].amount).toBe(50);

    // Fatal redirect kills Guardian (hp=10, shield removed) without overflowing excess damage onto ally!
    battle.abilities.shields.length = 0;
    battle.combat.entities.get(0n)!.hp = 10;
    battle.combat.entities.get(1n)!.hp = 100;
    applyDamagePipeline({ battle, combat: battle.combat, session: combatSession }, 1n, 90, {
      damageType: 'physical',
    });
    // 90 - 10 armor = 80 -> 40 redirected (kills Guardian 10->0, excess 30 does NOT bounce back), ally only loses 40 (100->60)!
    expect(battle.combat.entities.get(0n)?.hp).toBe(0);
    expect(battle.combat.entities.get(1n)?.hp).toBe(60);
  });
});

describe('AC-10 arrow_storm & wildfire_rush multihit cadences (FR3 pause, cancel & fired arrow persistence)', () => {
  it('fires shot #1 at activation, pauses cadence during Stun preserving delay without burst, and cancels unfired shots on target loss/death/Fusion while fired arrows persist', () => {
    // 1. arrow_storm 8 shots @ 0.2s + Stun pause (FR3) + Fusion cleanup with in-flight arrow persistence.
    const game = createBattle({ ticksPerSecond: 10, fusion: fusionFixture() });
    game.enqueue({ type: 'wave-reward', sourceId: 'wave_1' }, 1);
    game.enqueue({ type: 'add', entity: { kind: 'defender', definitionId: 'skeleton', cell: { row: 0, column: 0 } } }, 1); // 0n (dmg 15)
    game.enqueue({ type: 'add', entity: { kind: 'defender', definitionId: 'skeleton', cell: { row: 1, column: 0 } } }, 1); // 1n (for fusion)
    game.enqueue({ type: 'add', entity: { kind: 'defender', definitionId: 'stun_totem', cell: { row: 0, column: 1 } } }, 1); // 2n (0.4s stun)
    game.enqueue({ type: 'add', entity: { kind: 'enemy', definitionId: 'enemy_pass', lane: 0, position: 5.5 } }, 1); // 3n

    // Activate arrow_storm at tick 1 -> Shot #1 spawned immediately; remainingShots = 7, nextShotRemainingTicks = 2.
    game.enqueue({ type: 'activate-ability', defenderId: 0n }, 1);
    step(game); // Tick 1
    expect(game.snapshot().abilities?.cadences[0]).toMatchObject({ remainingShots: 7, nextShotRemainingTicks: 2 });
    expect(game.snapshot().abilities?.projectiles).toHaveLength(1);

    // Tick 2 -> remaining 1; Tick 3 -> Shot #2 fires (remainingShots = 6, nextShotRemainingTicks = 2).
    // Also stun 0n at tick 3 runTick for 4 ticks!
    game.enqueue({ type: 'activate-ability', defenderId: 2n }, 3);
    step(game, 2); // now at tick 3
    expect(game.snapshot().abilities?.cadences[0]).toMatchObject({ remainingShots: 6, nextShotRemainingTicks: 2 });
    expect(game.snapshot().abilities?.projectiles).toHaveLength(2);

    // Ticks 4..7 (4 ticks): cadence is PAUSED, nextShotRemainingTicks stays 2!
    step(game, 3); // tick 6
    expect(game.snapshot().abilities?.cadences[0]).toMatchObject({
      status: 'PAUSED',
      remainingShots: 6,
      nextShotRemainingTicks: 2,
    });
    step(game, 1); // tick 7: still paused during phase, stun expires at end of tick 7.
    expect(game.snapshot().abilities?.cadences[0].remainingShots).toBe(6);

    // Tick 8: resumes (ACTIVE), nextShotRemainingTicks decrements 2 -> 1 (zero burst!).
    step(game);
    expect(game.snapshot().abilities?.cadences[0]).toMatchObject({
      status: 'ACTIVE',
      remainingShots: 6,
      nextShotRemainingTicks: 1,
    });
    // Tick 9: Shot #3 fires!
    step(game);
    expect(game.snapshot().abilities?.cadences[0].remainingShots).toBe(5);

    // Fuse 0n into skeleton_sniper at tick 9: unfired cadence shots (5) are cancelled, while already-fired in-flight arrows persist!
    const activeProjCountBeforeFuse = game.snapshot().abilities!.projectiles.length;
    expect(activeProjCountBeforeFuse).toBeGreaterThan(0);
    game.enqueue({ type: 'fuse', sourceId: 0n, targetId: 1n }, 10);
    step(game); // Tick 10
    expect(game.snapshot().abilities?.cadences).toHaveLength(0);
    // Fired arrow(s) persist and hit enemy 3n!
    step(game, 5);
    expect(game.snapshot().combat!.entities.get(3n)!.hp).toBeLessThan(1000);

    // 2. wildfire_rush 5 melee hits @ 0.2s + Burn, plus early cancellation when target dies.
    const meleeGame = createBattle({ ticksPerSecond: 10 });
    meleeGame.enqueue({ type: 'wave-reward', sourceId: 'wave_1' }, 1);
    meleeGame.enqueue({ type: 'add', entity: { kind: 'defender', definitionId: 'flame_fang', cell: { row: 0, column: 1 } } }, 1); // 0n (dmg 25)
    meleeGame.enqueue({ type: 'add', entity: { kind: 'enemy', definitionId: 'enemy_pass', lane: 0, position: 2.0 } }, 1); // 1n
    meleeGame.enqueue({ type: 'activate-ability', defenderId: 0n }, 1);
    step(meleeGame); // Tick 1: Hit #1 (25 dmg -> 975) + Burn v1
    expect(meleeGame.snapshot().combat?.entities.get(1n)?.hp).toBe(975);
    // Advance 8 ticks (ticks 2..9): 4 more hits at ticks 3, 5, 7, 9 (Wait: 1n also moves 0.1/tick -> at tick 7 it's at 1.4, still >= col 1 and distance <= 1.5; plus basic attack at tick 1!).
    step(meleeGame, 8);
    expect(meleeGame.snapshot().abilities?.cadences).toHaveLength(0);
    const burnStatus = meleeGame.snapshot().abilities?.statuses.find(s => s.targetEntityId === 1n && s.kind === 'burn');
    expect(burnStatus?.version).toBe(5);

    // Target loss cancels remaining unfired melee cadence shots cleanly.
    const cancelGame = createBattle({ ticksPerSecond: 10 });
    cancelGame.enqueue({ type: 'wave-reward', sourceId: 'wave_1' }, 1);
    cancelGame.enqueue({ type: 'add', entity: { kind: 'defender', definitionId: 'flame_fang', cell: { row: 0, column: 1 } } }, 1); // 0n
    cancelGame.enqueue({ type: 'add', entity: { kind: 'enemy', definitionId: 'enemy_pass', lane: 0, position: 2.0 } }, 1); // 1n
    cancelGame.enqueue({ type: 'activate-ability', defenderId: 0n }, 1);
    cancelGame.enqueue({ type: 'remove', id: 1n }, 2); // target removed at tick 2
    step(cancelGame, 3); // tick 3 attempts shot #2 -> finds no target -> cancels cadence
    expect(cancelGame.snapshot().abilities?.cadences).toHaveLength(0);
  });
});

describe('AC-11 piercing_barrage projectile', () => {
  it('fires 1 merged 600% AD arrow at 2x speed with unlimited same-lane pierce, hits each enemy at most once, persists after shooter death, and despawns at column 9', () => {
    const game = createBattle({ ticksPerSecond: 10 });
    game.enqueue({ type: 'wave-reward', sourceId: 'wave_1' }, 1);
    // Use skeleton_sniper with attackRange 0? No, just check exact damage math: 30 * 6 = 180!
    // Place shooter at (0, 0), enemies at x=3.5 (1n), x=5.5 (2n), x=8.5 (3n), and lane 1 at x=3.5 (4n).
    game.enqueue({ type: 'add', entity: { kind: 'defender', definitionId: 'skeleton_sniper', cell: { row: 0, column: 0 } } }, 1); // 0n (dmg 30)
    game.enqueue({ type: 'add', entity: { kind: 'enemy', definitionId: 'enemy_pass', lane: 0, position: 3.5 } }, 1); // 1n
    game.enqueue({ type: 'add', entity: { kind: 'enemy', definitionId: 'enemy_pass', lane: 0, position: 5.5 } }, 1); // 2n
    game.enqueue({ type: 'add', entity: { kind: 'enemy', definitionId: 'enemy_pass', lane: 0, position: 8.5 } }, 1); // 3n
    game.enqueue({ type: 'add', entity: { kind: 'enemy', definitionId: 'enemy_pass', lane: 1, position: 3.5 } }, 1); // 4n
    game.enqueue({ type: 'activate-ability', defenderId: 0n }, 1);
    // Kill shooter immediately at tick 2 -> arrow must persist!
    game.enqueue({ type: 'remove', id: 0n }, 2);
    step(game); // Tick 1 (0n shoots 1 basic attack of 30 at 3n? Wait: CLOSEST_TO_BASE targets 1n -> 1n hp=970!).

    expect(game.snapshot().abilities?.projectiles).toHaveLength(1);
    expect(game.snapshot().abilities?.projectiles[0]).toMatchObject({
      kind: 'lane',
      pierce: true,
      damage: 180,
      speedPerTick: 2,
    });

    // Advance 4 ticks (ticks 2..5: arrow travels 0->2->4->6->8, hitting 1n and 2n once each).
    step(game, 4);
    expect(game.snapshot().combat?.entities.get(1n)?.hp).toBe(970 - 180);
    expect(game.snapshot().combat?.entities.get(2n)?.hp).toBe(1000 - 180);
    expect(game.snapshot().combat?.entities.get(4n)?.hp).toBe(1000); // different lane untouched

    // Tick 6: arrow moves 8 -> 10, hits 3n (now at ~8.0) once and despawns after crossing column 9!
    step(game);
    expect(game.snapshot().combat?.entities.get(3n)?.hp).toBe(1000 - 180);
    expect(game.snapshot().abilities?.projectiles).toHaveLength(0);
  });
});

describe('AC-12 meteor_arrow_rain 3x3 area lock & falling flaming arrows', () => {
  it('locks 3x3 area centered on closest enemy, fires 8 falling arrows 0.2s apart hitting/burning enemies even after anchor dies, and cancels if 0 enemies remain', () => {
    const game = createBattle({ ticksPerSecond: 10 });
    game.enqueue({ type: 'wave-reward', sourceId: 'wave_1' }, 1);
    game.enqueue({ type: 'add', entity: { kind: 'defender', definitionId: 'inferno_archer', cell: { row: 4, column: 0 } } }, 1); // 0n (dmg 30)
    // Anchor enemy 1n (hp 30 -> killed by 1st arrow!) at (1, 5); companion 2n at (1, 5) survives; distant 3n at (0, 8) outside 3x3.
    game.enqueue({
      type: 'add',
      entity: { kind: 'enemy', definitionId: 'enemy_pass', lane: 1, position: 5.5 },
    }, 1); // 1n
    game.enqueue({
      type: 'add',
      entity: { kind: 'enemy', definitionId: 'enemy_pass', lane: 1, position: 5.5 },
    }, 1); // 2n
    game.enqueue({
      type: 'add',
      entity: { kind: 'enemy', definitionId: 'enemy_pass', lane: 0, position: 8.5 },
    }, 1); // 3n
    game.enqueue({ type: 'activate-ability', defenderId: 0n }, 1);
    step(game); // Tick 1: locks center (1, 5), spawns falling arrow #1 (travel 1 tick).
    expect(game.snapshot().abilities?.cadences[0]).toMatchObject({
      lockedCenterCell: { row: 1, column: 5 },
      remainingShots: 7,
    });

    // Remove anchor 1n at tick 2 -> subsequent arrows continue targeting locked 3x3 area (and hit 2n)!
    game.enqueue({ type: 'remove', id: 1n }, 2);
    step(game, 15); // Arrow #1..#8 all fire by tick 15 (1,3,5,7,9,11,13,15) and resolve within 1 tick.
    step(game, 2);
    expect(game.snapshot().abilities?.cadences).toHaveLength(0);
    expect(game.snapshot().combat!.entities.get(2n)!.hp).toBeLessThan(1000 - 200);
    expect(game.snapshot().abilities?.statuses.some(s => s.targetEntityId === 2n && s.kind === 'burn')).toBe(true);
    expect(game.snapshot().combat?.entities.get(3n)?.hp).toBe(1000);

    // If zero enemies remain on board, unfired cadence shots cancel cleanly.
    const emptyCancel = createBattle({ ticksPerSecond: 10 });
    emptyCancel.enqueue({ type: 'wave-reward', sourceId: 'wave_1' }, 1);
    emptyCancel.enqueue({ type: 'add', entity: { kind: 'defender', definitionId: 'inferno_archer', cell: { row: 4, column: 0 } } }, 1); // 0n
    emptyCancel.enqueue({ type: 'add', entity: { kind: 'enemy', definitionId: 'enemy_pass', lane: 1, position: 5.5 } }, 1); // 1n
    emptyCancel.enqueue({ type: 'activate-ability', defenderId: 0n }, 1);
    emptyCancel.enqueue({ type: 'remove', id: 1n }, 2);
    step(emptyCancel, 3); // tick 3 attempts arrow #2 with 0 enemies on board -> cancels cadence.
    expect(emptyCancel.snapshot().abilities?.cadences).toHaveLength(0);
  });
});

describe('AC-13 Fusion & death cleanup', () => {
  it('clears buffs, shields, redirects, slow zones, cooldowns, and unfired cadences on Fusion or death without transferring to output Defender', () => {
    const abilities = abilityFixture({
      abilities: abilityFixture().abilities.map(a =>
        a.id === 'glacial_fortress' ? { ...a, cooldownSeconds: 10 } : a,
      ),
    });
    const game = createBattle({ ticksPerSecond: 10, fusion: fusionFixture(), abilities });
    game.enqueue({ type: 'wave-reward', sourceId: 'wave_1' }, 1);
    game.enqueue({ type: 'add', entity: { kind: 'defender', definitionId: 'iron_golem', cell: { row: 0, column: 0 } } }, 1); // 0n
    game.enqueue({ type: 'add', entity: { kind: 'defender', definitionId: 'snow_golem', cell: { row: 0, column: 1 } } }, 1); // 1n
    game.enqueue({ type: 'add', entity: { kind: 'defender', definitionId: 'alpha_wolf', cell: { row: 1, column: 0 } } }, 1); // 2n
    game.enqueue({ type: 'add', entity: { kind: 'defender', definitionId: 'steel_guardian', cell: { row: 1, column: 1 } } }, 1); // 3n
    game.enqueue({ type: 'add', entity: { kind: 'defender', definitionId: 'iron_golem', cell: { row: 1, column: 2 } } }, 1); // 4n
    game.enqueue({ type: 'add', entity: { kind: 'defender', definitionId: 'skeleton', cell: { row: 2, column: 0 } } }, 1); // 5n
    game.enqueue({ type: 'add', entity: { kind: 'enemy', definitionId: 'enemy_pass', lane: 2, position: 4 } }, 1); // 6n

    // Apply alpha_howl buff to 0n/1n, iron_bastion shield+redirect on 3n, arrow_storm cadence on 5n.
    game.enqueue({ type: 'activate-ability', defenderId: 2n }, 1); // alpha_howl
    game.enqueue({ type: 'activate-ability', defenderId: 3n }, 1); // iron_bastion
    game.enqueue({ type: 'activate-ability', defenderId: 5n }, 1); // arrow_storm
    step(game);

    expect(game.snapshot().abilities?.shields.some(s => s.ownerId === 3n)).toBe(true);
    expect(game.snapshot().abilities?.redirects.some(r => r.ownerId === 3n)).toBe(true);
    expect(game.snapshot().abilities?.cadences.some(c => c.ownerId === 5n)).toBe(true);
    expect(game.snapshot().abilities?.statuses.some(s => s.targetEntityId === 0n && s.kind === 'buff')).toBe(true);

    // Fuse 0n + 1n -> frost_guardian (7n): zero buffs/shields/cooldowns inherited onto 7n!
    game.enqueue({ type: 'fuse', sourceId: 0n, targetId: 1n }, 2);
    // Remove 3n (steel_guardian) and 5n (skeleton) -> removes shield, redirect, and unfired cadence.
    game.enqueue({ type: 'remove', id: 3n }, 2);
    game.enqueue({ type: 'remove', id: 5n }, 2);
    step(game);

    const snap = game.snapshot();
    expect(snap.entities.get(7n)).toMatchObject({ kind: 'defender', definitionId: 'frost_guardian' });
    expect(snap.abilities?.statuses.some(s => s.targetEntityId === 0n || s.targetEntityId === 1n || s.targetEntityId === 7n)).toBe(false);
    expect(snap.abilities?.shields).toHaveLength(0);
    expect(snap.abilities?.redirects).toHaveLength(0);
    expect(snap.abilities?.cadences).toHaveLength(0);
    expect(snap.abilities?.cooldowns.has(7n)).toBe(false);

    // Also verify frost_guardian's front slow zone converts/cleans up on frost_guardian death.
    game.enqueue({ type: 'add', entity: { kind: 'enemy', definitionId: 'enemy_pass', lane: 0, position: 2.5 } }, 3); // 8n in (0, 2)
    game.enqueue({ type: 'activate-ability', defenderId: 7n }, 3);
    step(game);
    expect(game.snapshot().abilities?.cooldowns.has(7n)).toBe(true);
    expect(game.snapshot().abilities?.shields.some(s => s.ownerId === 7n)).toBe(true);
    expect(game.snapshot().abilities?.statuses.some(s => s.targetEntityId === 8n && s.isZoneDerived)).toBe(true);

    game.enqueue({ type: 'remove', id: 7n }, 4);
    step(game);
    expect(game.snapshot().abilities?.cooldowns.has(7n)).toBe(false);
    expect(game.snapshot().abilities?.shields).toHaveLength(0);
  });
});

describe('AC-14 Integration with T-06 rewards & T-09 wave completion / Victory', () => {
  it('awards T-06 enemy rewards and triggers T-09 Wave completion / Victory on instant, Burn, and projectile kills', () => {
    const waves: WaveSessionInput = {
      levelId: 'ability_waves',
      waveCount: 5,
      waves: [
        makeWave('wave_1', 'enemy_grunt', 0),
        makeWave('wave_2', 'enemy_grunt', 1),
        makeWave('wave_3', 'enemy_grunt', 2),
        makeWave('wave_4', 'enemy_grunt', 3),
        makeWave('wave_5', 'enemy_grunt', 4),
      ],
    };
    const combat = combatFixture({
      spawnX: 5,
      enemies: [
        { id: 'enemy_grunt', maxHp: 50, moveSpeed: 0.01, behavior: 'IGNORE_DEFENDER' },
        { id: 'enemy_armored', maxHp: 100, moveSpeed: 0.01, behavior: 'IGNORE_DEFENDER' },
        { id: 'enemy_fire_res', maxHp: 100, moveSpeed: 0.01, behavior: 'IGNORE_DEFENDER' },
        { id: 'enemy_freeze_immune', maxHp: 100, moveSpeed: 0.01, behavior: 'IGNORE_DEFENDER' },
        { id: 'enemy_freeze_res', maxHp: 100, moveSpeed: 0.01, behavior: 'IGNORE_DEFENDER' },
        { id: 'enemy_pass', maxHp: 100, moveSpeed: 0.01, behavior: 'IGNORE_DEFENDER' },
      ],
    });
    const abilities = abilityFixture({
      abilities: abilityFixture().abilities.map(a =>
        a.id === 'inferno'
          ? {
              ...a,
              effects: [
                {
                  kind: 'instant-damage',
                  scope: 'same-lane-enemies',
                  damageMultiplier: 0, // force Burn tick to kill Wave 2 enemy!
                  damageType: 'fire',
                  applyStatus: {
                    kind: 'burn',
                    damageMultiplierPerSecond: 2.5, // 20 * 2.5 = 50 burn dmg at 1.0s
                    durationSeconds: 2,
                    tickIntervalSeconds: 1,
                    damageType: 'fire',
                  },
                },
              ],
            }
          : a,
      ),
    });

    const game = createBattle({ ticksPerSecond: 10, combat, waves, abilities });
    // Grant initial crystals via claim-free setup? Wait: wave_1 spawns enemy at tick 0 -> at tick 1 enemy is at x=5.
    // Give crystal via summon onto an enemy-reward drop, OR set cost=0? Better: let's test crystal cap 5 via wave_reward + enemy drop!
    // Spawn 1 iron_golem on lane 0 (instant earthquake kill -> 3*20=60 >= 50), 1 blaze on lane 1 (Burn tick kill),
    // and skeleton_sniper on lanes 2, 3, 4 (piercing_barrage projectile kills, 180 >= 50)!
    game.enqueue({ type: 'add', entity: { kind: 'defender', definitionId: 'iron_golem', cell: { row: 0, column: 0 } } }, 1); // 1n (0n was wave_1 enemy!)
    game.enqueue({ type: 'add', entity: { kind: 'defender', definitionId: 'blaze', cell: { row: 1, column: 0 } } }, 1); // 2n
    game.enqueue({ type: 'add', entity: { kind: 'defender', definitionId: 'skeleton_sniper', cell: { row: 2, column: 0 } } }, 1); // 3n
    game.enqueue({ type: 'add', entity: { kind: 'defender', definitionId: 'skeleton_sniper', cell: { row: 3, column: 0 } } }, 1); // 4n
    game.enqueue({ type: 'add', entity: { kind: 'defender', definitionId: 'skeleton_sniper', cell: { row: 4, column: 0 } } }, 1); // 5n
    // Use enemy-reward to drop 5 crystals on (0, 1) and summon plain_unit onto (0, 1) to collect up to cap 5!
    game.enqueue({ type: 'enemy-reward', sourceId: 999n, definitionId: 'enemy_grunt', lane: 0, position: 1.5 }, 1);
    game.enqueue({ type: 'enemy-reward', sourceId: 998n, definitionId: 'enemy_grunt', lane: 0, position: 1.5 }, 1);
    game.enqueue({ type: 'enemy-reward', sourceId: 997n, definitionId: 'enemy_grunt', lane: 0, position: 1.5 }, 1);
    game.enqueue({ type: 'enemy-reward', sourceId: 996n, definitionId: 'enemy_grunt', lane: 0, position: 1.5 }, 1);
    game.enqueue({ type: 'enemy-reward', sourceId: 995n, definitionId: 'enemy_grunt', lane: 0, position: 1.5 }, 1);
    game.enqueue({ type: 'summon', definitionId: 'plain_unit', cell: { row: 0, column: 1 } }, 1);
    step(game); // Tick 1: crystals = 5, energy = 50 + 5*50 = 300.

    // Wave 1: instant ability kill (earthquake on 1n).
    game.enqueue({ type: 'activate-ability', defenderId: 1n }, 2);
    step(game);
    expect(game.snapshot().entities.has(0n)).toBe(false);
    expect(game.snapshot().waves?.completedWaves.has(0)).toBe(true);
    expect(game.snapshot().resources?.energy).toBe(350); // +50 T-06 enemy reward
    expect(game.snapshot().resources?.crystals).toBe(5); // capped at 5 (4 of 5 wave_1 crystals overflowed to pending after spending 1)
    expect(game.snapshot().resources?.pending).toBe(4);
    expect([...game.snapshot().resources!.items.values()].some(i => i.kind === 'crystal' && i.source === 0n)).toBe(true);

    // Wait for Wave 2 spawn (delayBeforeNextWaveSeconds = 1s = 10 ticks -> tick 12).
    step(game, 10);
    // Kill Wave 2 enemy with Burn tick (blaze 2n).
    game.enqueue({ type: 'activate-ability', defenderId: 2n }, 13);
    step(game, 11); // tick 23: Burn ticks at 1.0s and kills Wave 2 enemy!
    expect(game.snapshot().waves?.completedWaves.has(1)).toBe(true);
    expect(game.snapshot().resources?.energy).toBe(400);

    // Waves 3, 4, 5: kill with piercing_barrage projectiles!
    for (const [waveIdx, defenderId] of [[2, 3n], [3, 4n], [4, 5n]] as const) {
      for (let guard = 0; guard < 30; guard++) {
        if ([...game.snapshot().entities.values()].some(e => e.kind === 'enemy')) break;
        step(game);
      }
      const nextTick = game.snapshot().tick + 1;
      game.enqueue({ type: 'activate-ability', defenderId }, nextTick);
      step(game, 4);
      expect(game.snapshot().waves?.completedWaves.has(waveIdx)).toBe(true);
    }

    expect(game.snapshot().waves?.terminal).toBe('victory');
    expect(game.snapshot().resources?.terminal).toBe('victory');
  });
});

describe('AC-15 Pause & Terminal guards', () => {
  it('rejects activate-ability at enqueue time when Paused or Terminal and freezes all ability timers while Paused', () => {
    const abilities = abilityFixture({
      abilities: abilityFixture().abilities.map(a =>
        a.id === 'arrow_storm' ? { ...a, cooldownSeconds: 5 } : a,
      ),
    });
    const game = createBattle({ ticksPerSecond: 10, abilities });
    game.enqueue({ type: 'wave-reward', sourceId: 'wave_1' }, 1);
    game.enqueue({ type: 'add', entity: { kind: 'defender', definitionId: 'skeleton', cell: { row: 0, column: 0 } } }, 1); // 0n
    game.enqueue({ type: 'add', entity: { kind: 'defender', definitionId: 'blaze', cell: { row: 0, column: 1 } } }, 1); // 1n
    game.enqueue({ type: 'add', entity: { kind: 'defender', definitionId: 'steel_guardian', cell: { row: 1, column: 0 } } }, 1); // 2n
    game.enqueue({ type: 'add', entity: { kind: 'enemy', definitionId: 'enemy_pass', lane: 0, position: 4 } }, 1); // 3n
    game.enqueue({ type: 'activate-ability', defenderId: 0n }, 1); // cadence + projectile + cooldown
    game.enqueue({ type: 'activate-ability', defenderId: 1n }, 1); // burn status
    game.enqueue({ type: 'activate-ability', defenderId: 2n }, 1); // redirect timer
    step(game); // Tick 1

    const pausedSnap = game.snapshot();
    game.setPaused(true);
    expect(game.enqueue({ type: 'activate-ability', defenderId: 0n }, 2)).toEqual({
      status: 'REJECTED',
      reason: 'paused',
    });
    expect(step(game, 20)).toBe(0);
    expect(game.snapshot()).toEqual(pausedSnap);

    // Resume and verify timers advance accurately from exact paused values.
    game.setPaused(false);
    step(game, 1); // Tick 2: cooldown 50->49, cadence nextShot 2->1, burn remaining 50->49, redirect 80->79, projectile x 0->1.
    const resumed = game.snapshot();
    expect(resumed.abilities?.cooldowns.get(0n)).toBe(49);
    expect(resumed.abilities?.cadences[0].nextShotRemainingTicks).toBe(1);
    expect(resumed.abilities?.statuses.find(s => s.kind === 'burn')?.remainingTicks).toBe(49);
    expect(resumed.abilities?.redirects[0].remainingTicks).toBe(79);
    expect(resumed.abilities?.projectiles[0]).toMatchObject({ kind: 'lane', x: 1 });

    // Terminal guard.
    game.enqueue({ type: 'terminal', result: 'victory' }, 3);
    step(game);
    const terminalSnap = game.snapshot();
    expect(game.enqueue({ type: 'activate-ability', defenderId: 0n }, 4)).toEqual({
      status: 'REJECTED',
      reason: 'terminal',
    });
    expect(game.snapshot()).toEqual(terminalSnap);
  });
});

describe('AC-16 Transaction rollback safety (T-04)', () => {
  it('rolls back crystals, entities, combat, abilities, waves, and queue atomically on QUEUE_OVERFLOW and invariant failure', () => {
    // 1. Runtime QUEUE_OVERFLOW when an ability kills 2 enemies and tries to enqueue 2 enemy-rewards beyond 4096.
    const lethalGame = createBattle({
      ticksPerSecond: 10,
      combat: combatFixture({
        enemies: combatFixture().enemies.map(e => (e.id === 'enemy_grunt' ? { ...e, maxHp: 50 } : e)),
      }),
    });
    lethalGame.enqueue({ type: 'wave-reward', sourceId: 'wave_1' }, 1);
    lethalGame.enqueue({ type: 'add', entity: { kind: 'defender', definitionId: 'iron_golem', cell: { row: 0, column: 0 } } }, 1);
    lethalGame.enqueue({ type: 'add', entity: { kind: 'enemy', definitionId: 'enemy_grunt', lane: 0, position: 8 } }, 1);
    lethalGame.enqueue({ type: 'add', entity: { kind: 'enemy', definitionId: 'enemy_grunt', lane: 0, position: 8.5 } }, 1);
    step(lethalGame);

    lethalGame.enqueue({ type: 'activate-ability', defenderId: 0n }, 2);
    const fill = 4096 - lethalGame.snapshot().queue.events.length;
    for (let i = 0; i < fill; i++) lethalGame.enqueue({ type: 'collect', id: 999n }, 500);
    step(lethalGame);
    expect(lethalGame.snapshot().failure).toMatchObject({ code: 'QUEUE_OVERFLOW', tick: 2 });
    expect(lethalGame.snapshot().resources?.crystals).toBe(5); // crystal cost rolled back atomically!
    expect(lethalGame.snapshot().abilities?.outcome).toBeNull();
    expect(lethalGame.snapshot().entities.has(1n)).toBe(true);
    expect(lethalGame.snapshot().entities.has(2n)).toBe(true);

    // 2. Runtime QUEUE_OVERFLOW inside executePhase(2) when a projectile kills an enemy and enqueues enemy-reward.
    const projOverflow = createBattle({
      ticksPerSecond: 10,
      combat: combatFixture({
        enemies: combatFixture().enemies.map(e => (e.id === 'enemy_grunt' ? { ...e, maxHp: 50 } : e)),
      }),
    });
    projOverflow.enqueue({ type: 'wave-reward', sourceId: 'wave_1' }, 1);
    projOverflow.enqueue({ type: 'add', entity: { kind: 'defender', definitionId: 'skeleton_sniper', cell: { row: 0, column: 0 } } }, 1); // 0n
    projOverflow.enqueue({ type: 'add', entity: { kind: 'enemy', definitionId: 'enemy_grunt', lane: 0, position: 1.5 } }, 1); // 1n
    projOverflow.enqueue({ type: 'activate-ability', defenderId: 0n }, 1);
    step(projOverflow); // Tick 1: projectile spawned at x=0, crystals=4.
    const fill2 = 4096 - projOverflow.snapshot().queue.events.length;
    for (let i = 0; i < fill2; i++) projOverflow.enqueue({ type: 'collect', id: 999n }, 500);
    const beforeProjOverflow = projOverflow.snapshot();
    step(projOverflow); // Tick 2: stepAbilityTickPhase projectile kills 1n -> enqueues enemy-reward -> QUEUE_OVERFLOW!
    expect(projOverflow.snapshot()).toEqual({
      ...beforeProjOverflow,
      tick: 2,
      failure: expect.objectContaining({ code: 'QUEUE_OVERFLOW', tick: 2 }),
    });
  });

  it('rolls back mid-transaction ability activation & tick mutations atomically when an invariant fails', () => {
    const combatSession = validateCombatSession(combatFixture(), 10);
    const zeroCostAbilities = abilityFixture({
      abilities: abilityFixture().abilities.map(a => ({ ...a, powerCrystalCost: 0 })),
    });
    const abilitySession = validateAbilitySession(zeroCostAbilities, 10, combatSession);
    const initialState: BattleState = {
      ...createBattleState(),
      combat: createCombatState(),
      abilities: createAbilityState(),
    };

    const engine = new TransactionEngine<BattleState, { type: 'corrupt-ability' }, null>(
      { state: initialState, queue: new EventQueue<{ type: 'corrupt-ability' }>().snapshot(), rng: null },
      ({ state, event, enqueue }) => {
        applyBattleCommand(state, { type: 'add', entity: { kind: 'defender', definitionId: 'iron_golem', cell: { row: 0, column: 0 } } });
        registerCombatEntity(state, combatSession, 0n);
        applyBattleCommand(state, { type: 'add', entity: { kind: 'enemy', definitionId: 'enemy_pass', lane: 0, position: 8 } });
        registerCombatEntity(state, combatSession, 1n);
        enqueue({ payload: { type: 'corrupt-ability' }, scheduledTick: 2, causalDepth: 0 });
        applyAbilityCommand(
          { battle: state as BattleState & { abilities?: ReturnType<typeof createAbilityState> }, combat: state.combat!, session: combatSession, abilitySession },
          { type: 'activate-ability', defenderId: 0n },
          event.id,
          () => {},
        );
        // Trigger invariant failure mid-transaction after ability mutated statuses/hp.
        applyDamagePipeline(
          { battle: state as BattleState & { abilities?: ReturnType<typeof createAbilityState> }, combat: state.combat!, session: combatSession },
          1n,
          Number.NaN,
          { damageType: 'physical' },
        );
      },
    );

    engine.enqueue({ payload: { type: 'corrupt-ability' }, scheduledTick: 1, causalDepth: 0 }, 0);
    const before = engine.snapshot();
    const res = engine.execute(1, 10);
    expect(res).toMatchObject({ status: 'FAILED', diagnostic: { code: 'CONTRACT_ERROR', tick: 1 } });
    expect(engine.snapshot()).toEqual(before);

    // Also verify stepAbilityTickPhase rolls back atomically on corrupted NaN burn damage.
    const tickEngine = new TransactionEngine<BattleState, { type: 'corrupt-tick' }, null>(
      { state: initialState, queue: new EventQueue<{ type: 'corrupt-tick' }>().snapshot(), rng: null },
      ({ state }) => {
        applyBattleCommand(state, { type: 'add', entity: { kind: 'enemy', definitionId: 'enemy_pass', lane: 0, position: 8 } });
        registerCombatEntity(state, combatSession, 0n);
        (state as BattleState & { abilities: ReturnType<typeof createAbilityState> }).abilities.statuses.push({
          statusId: 0n,
          version: 1,
          targetEntityId: 0n,
          sourceEntityId: 0n,
          abilityId: 'inferno',
          kind: 'burn',
          remainingTicks: 10,
          burnDamagePerTick: Number.NaN,
          burnTickIntervalTicks: 1,
          burnNextTickRemaining: 1,
        });
        stepAbilityTickPhase(
          {
            battle: state as BattleState & { abilities: ReturnType<typeof createAbilityState> },
            combat: state.combat!,
            session: combatSession,
            abilitySession,
          },
          () => {},
        );
      },
    );
    tickEngine.enqueue({ payload: { type: 'corrupt-tick' }, scheduledTick: 1, causalDepth: 0 }, 0);
    const beforeTick = tickEngine.snapshot();
    const tickRes = tickEngine.execute(1, 10);
    expect(tickRes).toMatchObject({ status: 'FAILED', diagnostic: { code: 'CONTRACT_ERROR', tick: 1 } });
    expect(tickEngine.snapshot()).toEqual(beforeTick);
  });
});

describe('AC-17 Deterministic replay, snapshot isolation & backward compatibility', () => {
  it('replays deterministically, isolates snapshot().abilities mutations, and omits snapshot().abilities when abilityInput is omitted', () => {
    const withoutAbilities = new BattleRuntime(
      { ticksPerSecond: 10, maxCatchUpTicks: 250 },
      resourceFixture(),
      combatFixture(),
    );
    expect(withoutAbilities.snapshot().abilities).toBeUndefined();

    function runScenario() {
      const game = createBattle({ ticksPerSecond: 10, fusion: fusionFixture() });
      game.enqueue({ type: 'wave-reward', sourceId: 'wave_1' }, 1);
      game.enqueue({ type: 'add', entity: { kind: 'defender', definitionId: 'frost_guardian', cell: { row: 0, column: 1 } } }, 1); // 0n
      game.enqueue({ type: 'add', entity: { kind: 'defender', definitionId: 'skeleton', cell: { row: 1, column: 0 } } }, 1); // 1n
      game.enqueue({ type: 'add', entity: { kind: 'defender', definitionId: 'alpha_wolf', cell: { row: 1, column: 1 } } }, 1); // 2n
      game.enqueue({ type: 'add', entity: { kind: 'enemy', definitionId: 'enemy_pass', lane: 0, position: 3 } }, 1); // 3n
      game.enqueue({ type: 'add', entity: { kind: 'enemy', definitionId: 'enemy_pass', lane: 1, position: 5 } }, 1); // 4n
      game.enqueue({ type: 'activate-ability', defenderId: 0n }, 1);
      game.enqueue({ type: 'activate-ability', defenderId: 1n }, 1);
      game.enqueue({ type: 'activate-ability', defenderId: 2n }, 2);
      step(game, 25);
      return game.snapshot();
    }

    const first = runScenario();
    const second = runScenario();
    expect(first).toEqual(second);

    // Snapshot isolation check on live runtime.
    const live = createBattle({ ticksPerSecond: 10 });
    live.enqueue({ type: 'wave-reward', sourceId: 'wave_1' }, 1);
    live.enqueue({ type: 'add', entity: { kind: 'defender', definitionId: 'frost_guardian', cell: { row: 0, column: 1 } } }, 1);
    live.enqueue({ type: 'add', entity: { kind: 'defender', definitionId: 'skeleton', cell: { row: 1, column: 0 } } }, 1);
    live.enqueue({ type: 'add', entity: { kind: 'enemy', definitionId: 'enemy_pass', lane: 1, position: 5 } }, 1);
    live.enqueue({ type: 'activate-ability', defenderId: 0n }, 1);
    live.enqueue({ type: 'activate-ability', defenderId: 1n }, 1);
    step(live);

    const baseline = live.snapshot();
    const mutated = live.snapshot();
    mutated.abilities!.cooldowns.set(0n, 999);
    mutated.abilities!.shields.length = 0;
    mutated.abilities!.cadences.length = 0;
    mutated.abilities!.projectiles.length = 0;
    mutated.abilities!.statuses.length = 0;
    mutated.abilities!.outcome = null;
    expect(live.snapshot()).toEqual(baseline);
  });
});

describe('Abilities v2.2 scopes, bonuses, vulnerable marks, and same-lane lobbed fireballs', () => {
  it('supports front-3-cells chilled bonus (winter_pounce), area-3x3-self thermal shock (thermal_collapse), and vulnerable +40% (predator_mark)', () => {
    const resource = resourceFixture({
      defenders: [
        ...resourceFixture().defenders,
        { id: 'frostfang', classification: 'fusion', summonEnergyCost: 0, unlocked: true },
        { id: 'steam_warden', classification: 'fusion', summonEnergyCost: 0, unlocked: true },
        { id: 'bonefang_hunter', classification: 'fusion', summonEnergyCost: 0, unlocked: true },
      ],
    });
    const combat = combatFixture({
      defenders: [
        ...combatFixture().defenders,
        { id: 'frostfang', maxHp: 200, damage: 20, attackSpeed: 1, attackRange: 1, targeting: 'CLOSEST_TO_BASE' },
        { id: 'steam_warden', maxHp: 300, damage: 20, attackSpeed: 1, attackRange: 3, targeting: 'CLOSEST_TO_BASE' },
        { id: 'bonefang_hunter', maxHp: 200, damage: 20, attackSpeed: 1, attackRange: 1, targeting: 'CLOSEST_TO_BASE' },
      ],
    });
    const abilities: AbilityDefinition[] = [
      ...abilityFixture().abilities,
      {
        id: 'winter_pounce',
        ownerDefenderId: 'frostfang',
        powerCrystalCost: 1,
        cooldownSeconds: 0,
        requiresTarget: true,
        targetScope: 'front-3-cells',
        effects: [
          {
            kind: 'instant-damage',
            scope: 'front-3-cells',
            frontCells: 3,
            damageMultiplier: 2.5,
            bonusDamageMultiplierIfChilled: 1.5,
            damageType: 'ice',
            applyStatus: { kind: 'slow', slowPct: 0.5, durationSeconds: 4 },
          },
        ],
      },
      {
        id: 'thermal_collapse',
        ownerDefenderId: 'steam_warden',
        powerCrystalCost: 1,
        cooldownSeconds: 0,
        requiresTarget: true,
        targetScope: 'area-3x3-self',
        effects: [
          {
            kind: 'instant-damage',
            scope: 'area-3x3-self',
            radius: 1,
            damageMultiplier: 2.5,
            bonusDamageMultiplierIfBurnOrFreeze: 1.5,
            damageType: 'fire',
            armorPiercing: true,
            applyStatus: { kind: 'slow', slowPct: 0.5, durationSeconds: 5 },
          },
        ],
      },
      {
        id: 'predator_mark',
        ownerDefenderId: 'bonefang_hunter',
        powerCrystalCost: 1,
        cooldownSeconds: 0,
        requiresTarget: true,
        targetScope: 'highest-hp-same-lane',
        effects: [
          { kind: 'status', scope: 'self', status: { kind: 'buff', attackSpeedBonusPct: 0.5, attackDamageBonusPct: 0, durationSeconds: 6 } },
          { kind: 'status', scope: 'highest-hp-same-lane', status: { kind: 'vulnerable', damageTakenBonusPct: 0.4, durationSeconds: 6 } },
          { kind: 'instant-damage', scope: 'highest-hp-same-lane', damageMultiplier: 2.5, damageType: 'physical', armorPiercing: true },
        ],
      },
    ];

    const game = new BattleRuntime(
      { ticksPerSecond: 10, maxCatchUpTicks: 250 },
      resource,
      combat,
      undefined,
      undefined,
      { abilities },
    );

    game.enqueue({ type: 'wave-reward', sourceId: 'wave_1' }, 1);
    game.enqueue({ type: 'wave-reward', sourceId: 'wave_2' }, 1);
    game.enqueue({ type: 'add', entity: { kind: 'defender', definitionId: 'snow_golem', cell: { row: 0, column: 0 } } }, 1); // 0n
    game.enqueue({ type: 'add', entity: { kind: 'defender', definitionId: 'frostfang', cell: { row: 0, column: 1 } } }, 1); // 1n
    game.enqueue({ type: 'add', entity: { kind: 'defender', definitionId: 'steam_warden', cell: { row: 2, column: 3 } } }, 1); // 2n
    game.enqueue({ type: 'add', entity: { kind: 'defender', definitionId: 'bonefang_hunter', cell: { row: 4, column: 0 } } }, 1); // 3n
    // 4n: in front-3-cells of frostfang (x=3.5) and will be chilled by snow_golem first.
    game.enqueue({ type: 'add', entity: { kind: 'enemy', definitionId: 'enemy_pass', lane: 0, position: 3.5 } }, 1); // 4n
    // 5n: out of front-3-cells range of frostfang (x=6.5).
    game.enqueue({ type: 'add', entity: { kind: 'enemy', definitionId: 'enemy_pass', lane: 0, position: 6.5 } }, 1); // 5n
    // 6n: in 3x3 around steam_warden (lane 1, pos 4.2 -> col 4, within |r-2|<=1,|c-3|<=1).
    game.enqueue({ type: 'add', entity: { kind: 'enemy', definitionId: 'enemy_pass', lane: 1, position: 4.2 } }, 1); // 6n
    // 7n: in lane 4 for bonefang_hunter (predator_mark: +40% dmg taken -> 20 * 2.5 * 1.4 = 70 dmg!).
    game.enqueue({ type: 'add', entity: { kind: 'enemy', definitionId: 'enemy_armored', lane: 4, position: 5.5 } }, 1); // 7n

    step(game); // tick 1
    // Slow 4n & 5n via Snow Golem blizzard, then strike with Frostfang -> 4n gets 4.0x AD = 80 dmg, 5n untouched!
    game.enqueue({ type: 'activate-ability', defenderId: 0n }, 2);
    game.enqueue({ type: 'activate-ability', defenderId: 1n }, 2);
    // Freeze 6n artificially via status push after tick 2? Wait: first test Thermal Collapse baseline (2.5x = 50 dmg), then test Burn/Freeze (+1.5x).
    game.enqueue({ type: 'activate-ability', defenderId: 2n }, 2);
    // Bonefang Hunter marks 7n (+40% vulnerable) and strikes 2.5x armorPiercing -> 50 * 1.4 = 70 dmg!
    game.enqueue({ type: 'activate-ability', defenderId: 3n }, 2);
    step(game); // tick 2

    const s2 = game.snapshot();
    expect(s2.combat?.entities.get(4n)?.hp).toBe(920); // 1000 - 80
    expect(s2.combat?.entities.get(5n)?.hp).toBe(1000); // outside front-3-cells
    expect(s2.combat?.entities.get(6n)?.hp).toBe(950); // 1000 - 50 (no burn/freeze yet)
    expect(s2.combat?.entities.get(7n)?.hp).toBe(930); // 1000 - 70 (+40% vulnerable applied!)
    expect(s2.abilities?.statuses.some(st => st.targetEntityId === 7n && st.kind === 'vulnerable')).toBe(true);
    expect(s2.abilities?.statuses.some(st => st.targetEntityId === 3n && st.kind === 'buff')).toBe(true);
  });

  it('supports first-enemy-per-lane (wildfire_rush), % max HP projectile (siege_volley), multi-status projectile (glacier_barrage), and sameLaneOnly lobbed fireballs (inferno)', () => {
    const resource = resourceFixture({
      defenders: [
        ...resourceFixture().defenders,
        { id: 'iron_ranger', classification: 'fusion', summonEnergyCost: 0, unlocked: true },
        { id: 'frostbite_ranger', classification: 'fusion', summonEnergyCost: 0, unlocked: true },
      ],
    });
    const combat = combatFixture({
      defenders: [
        ...combatFixture().defenders,
        { id: 'iron_ranger', maxHp: 200, damage: 20, attackSpeed: 0.5, attackRange: 9, targeting: 'CLOSEST_TO_BASE' },
        { id: 'frostbite_ranger', maxHp: 180, damage: 20, attackSpeed: 1, attackRange: 9, targeting: 'CLOSEST_TO_BASE' },
      ],
    });
    const abilities: AbilityDefinition[] = [
      ...abilityFixture().abilities.filter(a => a.id !== 'wildfire_rush' && a.id !== 'inferno'),
      {
        id: 'inferno',
        ownerDefenderId: 'blaze',
        powerCrystalCost: 1,
        cooldownSeconds: 0,
        requiresTarget: true,
        targetScope: 'same-lane-enemies',
        effects: [
          {
            kind: 'multihit-falling-area',
            count: 4,
            intervalSeconds: 0.2,
            travelSeconds: 0.1,
            radius: 0,
            sameLaneOnly: true,
            damageMultiplier: 1.25,
            damageType: 'fire',
            armorPiercing: true,
            applyStatus: {
              kind: 'burn',
              damageMultiplierPerSecond: 0.25,
              durationSeconds: 5,
              tickIntervalSeconds: 1,
              damageType: 'fire',
            },
          },
        ],
      },
      {
        id: 'wildfire_rush',
        ownerDefenderId: 'flame_fang',
        powerCrystalCost: 1,
        cooldownSeconds: 0,
        requiresTarget: true,
        targetScope: 'first-enemy-per-lane',
        effects: [
          {
            kind: 'instant-damage',
            scope: 'first-enemy-per-lane',
            damageMultiplier: 2.5,
            damageType: 'fire',
            armorPiercing: true,
            applyStatus: {
              kind: 'burn',
              damageMultiplierPerSecond: 0.5,
              durationSeconds: 6,
              tickIntervalSeconds: 1,
              damageType: 'fire',
            },
          },
        ],
      },
      {
        id: 'siege_volley',
        ownerDefenderId: 'iron_ranger',
        powerCrystalCost: 1,
        cooldownSeconds: 0,
        requiresTarget: true,
        targetScope: 'same-lane-enemy-in-range',
        effects: [
          {
            kind: 'projectile',
            damageMultiplier: 4.5,
            targetMaxHpBonusPct: 0.2,
            damageType: 'physical',
            projectileSpeed: 20,
            pierce: false,
            armorPiercing: true,
            applyStatus: { kind: 'stun', durationSeconds: 1 },
          },
        ],
      },
      {
        id: 'glacier_barrage',
        ownerDefenderId: 'frostbite_ranger',
        powerCrystalCost: 1,
        cooldownSeconds: 0,
        requiresTarget: false,
        targetScope: 'self',
        effects: [
          {
            kind: 'projectile',
            damageMultiplier: 3,
            damageType: 'ice',
            projectileSpeed: 20,
            pierce: true,
            applyStatuses: [
              { kind: 'freeze', durationSeconds: 2.5 },
              { kind: 'slow', slowPct: 0.5, durationSeconds: 5 },
            ],
          },
        ],
      },
    ];

    const game = new BattleRuntime(
      { ticksPerSecond: 10, maxCatchUpTicks: 250 },
      resource,
      combat,
      undefined,
      undefined,
      { abilities },
    );

    game.enqueue({ type: 'wave-reward', sourceId: 'wave_1' }, 1);
    game.enqueue({ type: 'wave-reward', sourceId: 'wave_2' }, 1);
    game.enqueue({ type: 'add', entity: { kind: 'defender', definitionId: 'flame_fang', cell: { row: 0, column: 0 } } }, 1); // 0n (dmg 25 -> 62.5 fire)
    game.enqueue({ type: 'add', entity: { kind: 'defender', definitionId: 'iron_ranger', cell: { row: 1, column: 0 } } }, 1); // 1n (dmg 20 -> 90 + 200 = 290)
    game.enqueue({ type: 'add', entity: { kind: 'defender', definitionId: 'frostbite_ranger', cell: { row: 2, column: 0 } } }, 1); // 2n (dmg 20 -> 60 + freeze + slow)
    game.enqueue({ type: 'add', entity: { kind: 'defender', definitionId: 'blaze', cell: { row: 3, column: 0 } } }, 1); // 3n (dmg 20 -> 25 fire lob)

    // Lane 0: two enemies (only frontmost 4n hit by wildfire_rush!)
    game.enqueue({ type: 'add', entity: { kind: 'enemy', definitionId: 'enemy_pass', lane: 0, position: 4.5 } }, 1); // 4n
    game.enqueue({ type: 'add', entity: { kind: 'enemy', definitionId: 'enemy_pass', lane: 0, position: 7.5 } }, 1); // 5n
    // Lane 1: armored enemy for iron_ranger
    game.enqueue({ type: 'add', entity: { kind: 'enemy', definitionId: 'enemy_armored', lane: 1, position: 3.5 } }, 1); // 6n
    // Lane 2: enemy for frostbite_ranger
    game.enqueue({ type: 'add', entity: { kind: 'enemy', definitionId: 'enemy_pass', lane: 2, position: 3.5 } }, 1); // 7n
    // Lane 3: enemy for blaze sameLaneOnly lobbed arc
    game.enqueue({ type: 'add', entity: { kind: 'enemy', definitionId: 'enemy_pass', lane: 3, position: 5.5 } }, 1); // 8n

    step(game); // tick 1
    game.enqueue({ type: 'activate-ability', defenderId: 0n }, 2);
    game.enqueue({ type: 'activate-ability', defenderId: 1n }, 2);
    game.enqueue({ type: 'activate-ability', defenderId: 2n }, 2);
    game.enqueue({ type: 'activate-ability', defenderId: 3n }, 2);
    step(game, 6); // advance through projectile crossing & lobbed fireballs

    const s = game.snapshot();
    expect(s.combat?.entities.get(4n)?.hp).toBe(937.5); // wildfire_rush hits first enemy on lane 0 (1000 - 62.5)
    expect(s.combat?.entities.get(5n)?.hp).toBe(1000); // second enemy in lane 0 untouched by wildfire_rush
    expect(s.combat?.entities.get(6n)?.hp).toBe(647.5); // 1000 - 62.5 (wildfire_rush) - 290 (siege_volley) = 647.5
    expect(s.abilities?.statuses.some(st => st.targetEntityId === 6n && st.kind === 'stun')).toBe(true);
    expect(s.combat?.entities.get(7n)?.hp).toBe(857.5); // 1000 - 20 (normal attack) - 62.5 (wildfire_rush) - 60 (glacier_barrage) = 857.5
    expect(s.abilities?.statuses.some(st => st.targetEntityId === 7n && st.kind === 'freeze')).toBe(true);
    expect(s.abilities?.statuses.some(st => st.targetEntityId === 7n && st.kind === 'slow')).toBe(true);
    expect(s.combat?.entities.get(8n)?.hp).toBeLessThan(937.5); // blaze same-lane lobbed fireballs + wildfire_rush landed on lane 3
  });

  it('allows targetless proactive casting (requiresTarget: false) for arrow_storm, inferno, meteor_arrow_rain, and siege_volley on empty lanes', () => {
    const resource: ResourceSessionInput = {
      seed: 10,
      defenders: [
        { id: 'skeleton', classification: 'base', summonEnergyCost: 0, unlocked: true },
        { id: 'blaze', classification: 'base', summonEnergyCost: 0, unlocked: true },
        { id: 'inferno_archer', classification: 'fusion', summonEnergyCost: 0, unlocked: true },
        { id: 'iron_ranger', classification: 'fusion', summonEnergyCost: 0, unlocked: true },
      ],
      enemies: [{ id: 'enemy_pass', energy: 0, crystals: 0 }],
      waves: [{ id: 'wave_1', crystals: 5 }],
      energyItems: {
        amount: 25,
        intervalSeconds: 999,
        region: { min: { x: 0.2, y: 0.2 }, max: { x: 0.8, y: 0.8 } },
        positions: [{ x: 0.5, y: 0.5 }],
      },
    };
    const combat: CombatSessionInput = {
      spawnX: 9,
      defenders: [
        { id: 'skeleton', maxHp: 200, damage: 25, attackSpeed: 1, attackRange: 7, targeting: 'CLOSEST_TO_DEFENDER' },
        { id: 'blaze', maxHp: 200, damage: 30, attackSpeed: 1, attackRange: 5, targeting: 'CLOSEST_TO_DEFENDER' },
        { id: 'inferno_archer', maxHp: 200, damage: 30, attackSpeed: 1, attackRange: 7, targeting: 'CLOSEST_TO_DEFENDER' },
        { id: 'iron_ranger', maxHp: 300, damage: 40, attackSpeed: 1, attackRange: 7, targeting: 'CLOSEST_TO_DEFENDER' },
      ],
      enemies: [{ id: 'enemy_pass', maxHp: 1000, moveSpeed: 1, behavior: 'IGNORE_DEFENDER' }],
    };
    const abilities: AbilityDefinition[] = [
      {
        id: 'arrow_storm',
        ownerDefenderId: 'skeleton',
        powerCrystalCost: 1,
        cooldownSeconds: 0,
        requiresTarget: false,
        targetScope: 'same-lane-enemy-in-range',
        effects: [
          {
            kind: 'multihit-projectile',
            count: 3,
            intervalSeconds: 0.2,
            damageMultiplier: 1,
            damageType: 'physical',
            projectileSpeed: 6,
            pierce: false,
          },
        ],
      },
      {
        id: 'inferno',
        ownerDefenderId: 'blaze',
        powerCrystalCost: 1,
        cooldownSeconds: 0,
        requiresTarget: false,
        targetScope: 'same-lane-enemies',
        effects: [
          {
            kind: 'multihit-falling-area',
            count: 2,
            intervalSeconds: 0.2,
            travelSeconds: 0.2,
            radius: 0,
            sameLaneOnly: true,
            damageMultiplier: 1.25,
            damageType: 'fire',
            armorPiercing: true,
          },
        ],
      },
      {
        id: 'meteor_arrow_rain',
        ownerDefenderId: 'inferno_archer',
        powerCrystalCost: 1,
        cooldownSeconds: 0,
        requiresTarget: false,
        targetScope: 'area-3x3-closest-enemy',
        effects: [
          {
            kind: 'multihit-falling-area',
            count: 2,
            intervalSeconds: 0.2,
            travelSeconds: 0.2,
            radius: 1,
            damageMultiplier: 1,
            damageType: 'fire',
          },
        ],
      },
      {
        id: 'siege_volley',
        ownerDefenderId: 'iron_ranger',
        powerCrystalCost: 1,
        cooldownSeconds: 0,
        requiresTarget: false,
        targetScope: 'same-lane-enemy-in-range',
        effects: [
          {
            kind: 'projectile',
            damageMultiplier: 4.5,
            damageType: 'physical',
            projectileSpeed: 8.5,
            pierce: false,
          },
        ],
      },
    ];

    const game = new BattleRuntime(
      { ticksPerSecond: 10, maxCatchUpTicks: 250 },
      resource,
      combat,
      undefined,
      undefined,
      { abilities },
    );

    game.enqueue({ type: 'wave-reward', sourceId: 'wave_1' }, 1);
    game.enqueue({ type: 'add', entity: { kind: 'defender', definitionId: 'skeleton', cell: { row: 0, column: 0 } } }, 1); // 0n
    game.enqueue({ type: 'add', entity: { kind: 'defender', definitionId: 'blaze', cell: { row: 1, column: 0 } } }, 1); // 1n
    game.enqueue({ type: 'add', entity: { kind: 'defender', definitionId: 'inferno_archer', cell: { row: 2, column: 0 } } }, 1); // 2n
    game.enqueue({ type: 'add', entity: { kind: 'defender', definitionId: 'iron_ranger', cell: { row: 3, column: 0 } } }, 1); // 3n
    step(game); // tick 1

    // Activate all 4 abilities with ZERO Enemies on the battlefield.
    game.enqueue({ type: 'activate-ability', defenderId: 0n }, 2);
    game.enqueue({ type: 'activate-ability', defenderId: 1n }, 2);
    game.enqueue({ type: 'activate-ability', defenderId: 2n }, 2);
    game.enqueue({ type: 'activate-ability', defenderId: 3n }, 2);
    step(game, 2); // ticks 2..3

    const afterCast = game.snapshot();
    expect(afterCast.resources?.crystals).toBe(1); // 5 - 4 crystals spent cleanly
    expect(afterCast.abilities?.projectiles.some(p => p.abilityId === 'arrow_storm')).toBe(true);
    expect(afterCast.abilities?.projectiles.some(p => p.abilityId === 'inferno')).toBe(true);
    expect(afterCast.abilities?.projectiles.some(p => p.abilityId === 'meteor_arrow_rain')).toBe(true);
    expect(afterCast.abilities?.projectiles.some(p => p.abilityId === 'siege_volley')).toBe(true);

    // Advance 4 more ticks -> remaining multihit cadence shots still fire even though battlefield is empty!
    step(game, 4);
    const afterCadence = game.snapshot();
    expect(afterCadence.abilities?.projectiles.filter(p => p.abilityId === 'arrow_storm').length).toBeGreaterThanOrEqual(2);
  });
});
