import { describe, expect, it } from 'vitest';
import type { CombatSessionInput } from '../src/combat/combat-session';
import { validateCombatSession } from '../src/combat/combat-session';
import { uniformIndex } from '../src/core/resource-rng';
import type { ResourceSessionInput } from '../src/core/resource-session';
import { validateResourceSession } from '../src/core/resource-session';
import type { FusionSessionInput } from '../src/fusion/fusion-session';
import { BattleRuntime } from '../src/systems/battle-runtime';
import { applyWaveEvent, checkWaveCompletion } from '../src/waves/wave-engine';
import {
  validateWaveSession,
  waveDeadline,
  type LaneSelectionMode,
  type WaveConfigDefinition,
  type WaveSessionInput,
} from '../src/waves/wave-session';
import { createWaveState } from '../src/waves/wave-state';
import { createBattleState } from '../src/core/battle-state';
import { createCombatState } from '../src/combat/combat-state';

// Test-only fixtures. Never treat these values as approved production balance.
function makeWaveConfig(
  id: string,
  overrides: Partial<WaveConfigDefinition> = {},
): WaveConfigDefinition {
  return {
    id,
    initialDelaySeconds: 0,
    delayBeforeNextWaveSeconds: 1,
    spawnGroups: [
      {
        enemyId: 'enemy_grunt',
        count: 1,
        allowedLanes: [0],
        laneMode: 'fixed',
        startOffsetSeconds: 0,
        intervalSeconds: 0,
      },
    ],
    ...overrides,
  };
}

// Test-only fixtures. Never treat these values as approved production balance.
function waveFixture(overrides: Partial<WaveSessionInput> = {}): WaveSessionInput {
  return {
    levelId: 'grassland_fixture',
    waveCount: 5,
    waves: [
      makeWaveConfig('wave_1'),
      makeWaveConfig('wave_2'),
      makeWaveConfig('wave_3'),
      makeWaveConfig('wave_4'),
      makeWaveConfig('wave_5'),
    ],
    ...overrides,
  };
}

// Test-only fixtures. Never treat these values as approved production balance.
function resourceFixture(overrides: Partial<ResourceSessionInput> = {}): ResourceSessionInput {
  return {
    seed: 1,
    defenders: [
      { id: 'def_base', classification: 'base', summonEnergyCost: 0, unlocked: true },
      { id: 'def_costly', classification: 'base', summonEnergyCost: 25, unlocked: true },
      { id: 'iron_golem', classification: 'base', summonEnergyCost: 25, unlocked: true },
      { id: 'snow_golem', classification: 'base', summonEnergyCost: 25, unlocked: true },
      { id: 'frost_guardian', classification: 'fusion', summonEnergyCost: 0, unlocked: true },
    ],
    enemies: [
      { id: 'enemy_grunt', energy: 50, crystals: 0 },
      { id: 'enemy_tank', energy: 75, crystals: 1 },
      { id: 'enemy_pass', energy: 50, crystals: 0 },
    ],
    waves: [
      { id: 'wave_1', crystals: 1 },
      { id: 'wave_2', crystals: 1 },
      { id: 'wave_3', crystals: 2 },
      { id: 'wave_4', crystals: 2 },
      { id: 'wave_5', crystals: 3 },
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
      { id: 'def_base', maxHp: 200, damage: 200, attackSpeed: 1, attackRange: 9, targeting: 'CLOSEST_TO_BASE' },
      { id: 'def_costly', maxHp: 200, damage: 100, attackSpeed: 1, attackRange: 9, targeting: 'CLOSEST_TO_BASE' },
      { id: 'iron_golem', maxHp: 300, damage: 25, attackSpeed: 1, attackRange: 9, targeting: 'CLOSEST_TO_BASE' },
      { id: 'snow_golem', maxHp: 150, damage: 25, attackSpeed: 1, attackRange: 9, targeting: 'CLOSEST_TO_BASE' },
      { id: 'frost_guardian', maxHp: 500, damage: 250, attackSpeed: 1, attackRange: 9, targeting: 'CLOSEST_TO_BASE' },
    ],
    enemies: [
      { id: 'enemy_grunt', maxHp: 100, moveSpeed: 1, behavior: 'STOP_AND_ATTACK', damage: 10, attackSpeed: 1, attackRange: 0 },
      { id: 'enemy_tank', maxHp: 200, moveSpeed: 1, behavior: 'STOP_AND_ATTACK', damage: 15, attackSpeed: 1, attackRange: 0 },
      { id: 'enemy_pass', maxHp: 100, moveSpeed: 1, behavior: 'IGNORE_DEFENDER' },
    ],
    ...overrides,
  };
}

// Test-only fixtures. Never treat these values as approved production balance.
function fusionFixture(overrides: Partial<FusionSessionInput> = {}): FusionSessionInput {
  return {
    defenders: [
      { id: 'def_base', tier: 1 },
      { id: 'def_costly', tier: 1 },
      { id: 'iron_golem', tier: 1 },
      { id: 'snow_golem', tier: 1 },
      { id: 'frost_guardian', tier: 2 },
    ],
    recipes: [
      {
        id: 'fusion_frost_guardian',
        inputDefenderIds: ['iron_golem', 'snow_golem'],
        outputDefenderId: 'frost_guardian',
        unlocked: true,
        enabled: true,
      },
    ],
    ...overrides,
  };
}

const createBattle = (
  waves: WaveSessionInput | undefined = waveFixture(),
  resources: ResourceSessionInput | undefined = resourceFixture(),
  combat: CombatSessionInput | undefined = combatFixture(),
  fusion: FusionSessionInput | undefined = undefined,
  ticksPerSecond = 1,
) => new BattleRuntime({ ticksPerSecond, maxCatchUpTicks: 250 }, resources, combat, fusion, waves);

const createStandaloneWaveBattle = (
  waves: WaveSessionInput,
  combat: CombatSessionInput = combatFixture(),
  ticksPerSecond = 1,
) => new BattleRuntime({ ticksPerSecond, maxCatchUpTicks: 250 }, undefined, combat, undefined, waves);

const step = (game: BattleRuntime, ticks = 1, ticksPerSecond = 1) =>
  game.advance((ticks * 1000) / ticksPerSecond);

describe('T-09.1 wave session validation & snapshot isolation (AC-01, AC-19)', () => {
  it('omits snapshot.waves when waveInput is omitted and detaches/freezes waveInput on construction', () => {
    const withoutWaves = new BattleRuntime(
      { ticksPerSecond: 1, maxCatchUpTicks: 250 },
      resourceFixture(),
      combatFixture(),
    );
    expect(withoutWaves.snapshot().waves).toBeUndefined();

    const combatSession = validateCombatSession(combatFixture(), 1);
    const resourceSession = validateResourceSession(resourceFixture(), 1);
    const validated = validateWaveSession(waveFixture(), 1, combatSession, resourceSession);
    expect(Object.isFrozen(validated)).toBe(true);
    expect(Object.isFrozen(validated.waves)).toBe(true);
    expect(Object.isFrozen(validated.waves[0])).toBe(true);
    expect(Object.isFrozen(validated.waves[0].spawnGroups)).toBe(true);
    expect(Object.isFrozen(validated.waves[0].spawnGroups[0])).toBe(true);
    expect(Object.isFrozen(validated.waves[0].spawnGroups[0].allowedLanes)).toBe(true);

    const input = waveFixture({
      waves: [
        makeWaveConfig('wave_1', {
          initialDelaySeconds: 2,
          spawnGroups: [
            {
              enemyId: 'enemy_grunt',
              count: 1,
              allowedLanes: [0],
              laneMode: 'fixed',
              startOffsetSeconds: 0,
              intervalSeconds: 0,
            },
          ],
        }),
        makeWaveConfig('wave_2'),
        makeWaveConfig('wave_3'),
        makeWaveConfig('wave_4'),
        makeWaveConfig('wave_5'),
      ],
    });
    const game = createBattle(input);

    // Mutate caller input after BattleRuntime construction.
    (input as { waveCount: number }).waveCount = 2;
    Object.assign(input.waves[0], { initialDelaySeconds: 99 });
    Object.assign(input.waves[0].spawnGroups[0], { count: 10, enemyId: 'enemy_tank' });
    (input.waves[0].spawnGroups[0].allowedLanes as number[])[0] = 4;

    step(game, 2);
    const snap = game.snapshot();
    expect(snap.entities.size).toBe(1);
    expect(snap.entities.get(0n)).toMatchObject({
      kind: 'enemy',
      definitionId: 'enemy_grunt',
      lane: 0,
      position: 9,
    });
  });

  it('fails closed on missing combatInput, invalid wave counts/IDs, spawn groups, lane modes, seeds and cross-session mismatches', () => {
    const base = waveFixture();
    const combatSession = validateCombatSession(combatFixture(), 1);
    const resourceSession = validateResourceSession(resourceFixture(), 1);

    // Missing combatInput in BattleRuntime & validateWaveSession.
    expect(() =>
      new BattleRuntime({ ticksPerSecond: 1, maxCatchUpTicks: 250 }, resourceFixture(), undefined, undefined, base),
    ).toThrow(TypeError);
    expect(() => validateWaveSession(base, 1, undefined)).toThrow(TypeError);

    // Missing/malformed waveInput.
    expect(() => validateWaveSession(undefined as never, 1, combatSession)).toThrow(TypeError);
    expect(() => validateWaveSession(null as never, 1, combatSession)).toThrow(TypeError);
    expect(() => validateWaveSession([] as never, 1, combatSession)).toThrow(TypeError);

    // waveCount !== 5 and waves.length !== 5.
    for (const badCount of [0, 4, 6, Number.NaN]) {
      expect(() => createBattle({ ...base, waveCount: badCount })).toThrow(RangeError);
    }
    expect(() => createBattle({ ...base, waves: base.waves.slice(0, 4) })).toThrow(RangeError);
    expect(() =>
      createBattle({ ...base, waves: [...base.waves, makeWaveConfig('wave_6')] }),
    ).toThrow(RangeError);

    // Non-stable levelId / wave.id and duplicate wave IDs.
    for (const badId of ['', 'Grassland', 'wave-1', '1_wave', null as never]) {
      expect(() => createBattle({ ...base, levelId: badId })).toThrow(TypeError);
      expect(() =>
        createBattle({ ...base, waves: [makeWaveConfig(badId), ...base.waves.slice(1)] }),
      ).toThrow(TypeError);
    }
    expect(() =>
      createBattle({ ...base, waves: [makeWaveConfig('wave_1'), makeWaveConfig('wave_1'), ...base.waves.slice(2)] }),
    ).toThrow(TypeError);

    // Empty or malformed spawnGroups.
    expect(() =>
      createBattle({ ...base, waves: [makeWaveConfig('wave_1', { spawnGroups: [] }), ...base.waves.slice(1)] }),
    ).toThrow(RangeError);
    expect(() =>
      createBattle({
        ...base,
        waves: [makeWaveConfig('wave_1', { spawnGroups: [null as never] }), ...base.waves.slice(1)],
      }),
    ).toThrow(TypeError);

    // Invalid count (<= 0 or non-integer).
    for (const badSpawnCount of [0, -1, 1.5, Number.NaN, '1' as never]) {
      expect(() =>
        createBattle({
          ...base,
          waves: [
            makeWaveConfig('wave_1', {
              spawnGroups: [{ ...base.waves[0].spawnGroups[0], count: badSpawnCount }],
            }),
            ...base.waves.slice(1),
          ],
        }),
      ).toThrow(RangeError);
    }

    // Negative / NaN / Infinity delays and intervals.
    for (const badTime of [-0.1, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() =>
        createBattle({
          ...base,
          waves: [makeWaveConfig('wave_1', { initialDelaySeconds: badTime }), ...base.waves.slice(1)],
        }),
      ).toThrow(RangeError);
      expect(() =>
        createBattle({
          ...base,
          waves: [makeWaveConfig('wave_1', { delayBeforeNextWaveSeconds: badTime }), ...base.waves.slice(1)],
        }),
      ).toThrow(RangeError);
      expect(() =>
        createBattle({
          ...base,
          waves: [
            makeWaveConfig('wave_1', {
              spawnGroups: [{ ...base.waves[0].spawnGroups[0], startOffsetSeconds: badTime }],
            }),
            ...base.waves.slice(1),
          ],
        }),
      ).toThrow(RangeError);
      expect(() =>
        createBattle({
          ...base,
          waves: [
            makeWaveConfig('wave_1', {
              spawnGroups: [{ ...base.waves[0].spawnGroups[0], intervalSeconds: badTime }],
            }),
            ...base.waves.slice(1),
          ],
        }),
      ).toThrow(RangeError);
    }

    // Empty / invalid / duplicate allowedLanes and 'fixed' with > 1 lane.
    expect(() =>
      createBattle({
        ...base,
        waves: [
          makeWaveConfig('wave_1', {
            spawnGroups: [{ ...base.waves[0].spawnGroups[0], allowedLanes: [], laneMode: 'sequential' }],
          }),
          ...base.waves.slice(1),
        ],
      }),
    ).toThrow(RangeError);
    for (const badLanes of [[-1], [5], [1.5], [0, 0]]) {
      expect(() =>
        createBattle({
          ...base,
          waves: [
            makeWaveConfig('wave_1', {
              spawnGroups: [{ ...base.waves[0].spawnGroups[0], allowedLanes: badLanes, laneMode: 'sequential' }],
            }),
            ...base.waves.slice(1),
          ],
        }),
      ).toThrow(RangeError);
    }
    expect(() =>
      createBattle({
        ...base,
        waves: [
          makeWaveConfig('wave_1', {
            spawnGroups: [{ ...base.waves[0].spawnGroups[0], allowedLanes: [0, 1], laneMode: 'fixed' }],
          }),
          ...base.waves.slice(1),
        ],
      }),
    ).toThrow(RangeError);

    // Invalid laneMode.
    expect(() =>
      createBattle({
        ...base,
        waves: [
          makeWaveConfig('wave_1', {
            spawnGroups: [
              { ...base.waves[0].spawnGroups[0], laneMode: 'nearest' as LaneSelectionMode },
            ],
          }),
          ...base.waves.slice(1),
        ],
      }),
    ).toThrow(TypeError);

    // 'random' without seed when resourceInput is omitted, and seed conflict with resourceInput.
    const randomWave = waveFixture({
      waves: [
        makeWaveConfig('wave_1', {
          spawnGroups: [
            {
              enemyId: 'enemy_grunt',
              count: 2,
              allowedLanes: [0, 1],
              laneMode: 'random',
              startOffsetSeconds: 0,
              intervalSeconds: 1,
            },
          ],
        }),
        ...base.waves.slice(1),
      ],
    });
    expect(() => createStandaloneWaveBattle(randomWave)).toThrow(RangeError);
    expect(() => createBattle({ ...base, seed: 2 }, resourceFixture({ seed: 1 }))).toThrow(RangeError);
    for (const badSeed of [-1, 0x100000000, 1.5]) {
      expect(() => createStandaloneWaveBattle({ ...base, seed: badSeed })).toThrow(RangeError);
    }

    // Unknown enemyId and missing wave ID in resourceInput.waves.
    expect(() =>
      createBattle({
        ...base,
        waves: [
          makeWaveConfig('wave_1', {
            spawnGroups: [{ ...base.waves[0].spawnGroups[0], enemyId: 'missing_enemy' }],
          }),
          ...base.waves.slice(1),
        ],
      }),
    ).toThrow(TypeError);
    expect(() =>
      validateWaveSession(
        base,
        1,
        combatSession,
        validateResourceSession(
          resourceFixture({ waves: resourceFixture().waves.slice(0, 4) }),
          1,
        ),
      ),
    ).toThrow(TypeError);
    expect(resourceSession.waves).toHaveLength(5);
  });
});

describe('T-09.2 wave timing, burst, exact spawn & lane modes (AC-02, AC-03, AC-04, AC-05)', () => {
  it('respects Wave 1 initialDelaySeconds + startOffsetSeconds including immediate t = 0 launch (AC-02)', () => {
    const delayed = createBattle(
      waveFixture({
        waves: [
          makeWaveConfig('wave_1', {
            initialDelaySeconds: 2,
            spawnGroups: [
              {
                enemyId: 'enemy_pass',
                count: 1,
                allowedLanes: [2],
                laneMode: 'fixed',
                startOffsetSeconds: 3,
                intervalSeconds: 0,
              },
            ],
          }),
          makeWaveConfig('wave_2'),
          makeWaveConfig('wave_3'),
          makeWaveConfig('wave_4'),
          makeWaveConfig('wave_5'),
        ],
      }),
    );

    expect(delayed.snapshot().waves).toMatchObject({
      currentWaveIndex: null,
      status: 'pending',
      spawnedInCurrentWave: 0,
    });
    expect(delayed.snapshot().entities.size).toBe(0);

    step(delayed); // tick 1
    expect(delayed.snapshot().waves?.status).toBe('pending');
    expect(delayed.snapshot().entities.size).toBe(0);

    step(delayed); // tick 2: initialDelaySeconds elapsed -> wave 1 starts, spawn scheduled at 2 + 3 = 5
    expect(delayed.snapshot().waves).toMatchObject({
      currentWaveIndex: 0,
      status: 'spawning',
      spawnedInCurrentWave: 0,
      plannedInCurrentWave: 1,
    });
    expect(delayed.snapshot().entities.size).toBe(0);

    step(delayed, 2); // ticks 3, 4
    expect(delayed.snapshot().entities.size).toBe(0);

    step(delayed); // tick 5: first enemy spawns at initialDelaySeconds + startOffsetSeconds
    expect(delayed.snapshot().entities.size).toBe(1);
    expect(delayed.snapshot().waves).toMatchObject({
      currentWaveIndex: 0,
      status: 'active',
      spawnedInCurrentWave: 1,
    });

    // initialDelaySeconds: 0 + startOffsetSeconds: 0 spawns at t = 0 during initialization.
    const immediate = createBattle(waveFixture());
    const initSnap = immediate.snapshot();
    expect(initSnap.tick).toBe(0);
    expect(initSnap.entities.size).toBe(1);
    expect(initSnap.waves).toMatchObject({
      currentWaveIndex: 0,
      status: 'active',
      spawnedInCurrentWave: 1,
      plannedInCurrentWave: 1,
    });
  });

  it('spawns multi-enemy groups drift-free at fractional tick rates across split frames and supports intervalSeconds: 0 burst (AC-03)', () => {
    expect(waveDeadline(0.2, 2.5, 0)).toBe(1);
    expect(waveDeadline(0.7, 2.5, 0)).toBe(2);
    expect(waveDeadline(1.2, 2.5, 0)).toBe(3);
    expect(waveDeadline(1.7, 2.5, 0)).toBe(5);

    const fractionalWaves = waveFixture({
      waves: [
        makeWaveConfig('wave_1', {
          initialDelaySeconds: 0,
          spawnGroups: [
            {
              enemyId: 'enemy_pass',
              count: 4,
              allowedLanes: [1],
              laneMode: 'fixed',
              startOffsetSeconds: 0.2,
              intervalSeconds: 0.5,
            },
          ],
        }),
        makeWaveConfig('wave_2'),
        makeWaveConfig('wave_3'),
        makeWaveConfig('wave_4'),
        makeWaveConfig('wave_5'),
      ],
    });

    const a = createBattle(fractionalWaves, resourceFixture(), combatFixture(), undefined, 2.5);
    const b = createBattle(fractionalWaves, resourceFixture(), combatFixture(), undefined, 2.5);

    const spawnTicks: number[] = [];
    let prevCount = 0;
    for (let tick = 1; tick <= 5; tick++) {
      step(a, 1, 2.5);
      const countNow = a.snapshot().waves!.spawnedInCurrentWave;
      if (countNow > prevCount) {
        spawnTicks.push(tick);
        prevCount = countNow;
      }
    }
    expect(spawnTicks).toEqual([1, 2, 3, 5]);

    // Split frames (20 x 100ms = 2000ms = 5 ticks at 2.5Hz) must match chunked ticks identically.
    for (let i = 0; i < 20; i++) b.advance(100);
    expect(a.snapshot()).toEqual(b.snapshot());

    // Burst spawn (intervalSeconds: 0) spawns all group enemies in the exact same tick.
    const burst = createBattle(
      waveFixture({
        waves: [
          makeWaveConfig('wave_1', {
            initialDelaySeconds: 0,
            spawnGroups: [
              {
                enemyId: 'enemy_grunt',
                count: 3,
                allowedLanes: [0, 2, 4],
                laneMode: 'sequential',
                startOffsetSeconds: 1,
                intervalSeconds: 0,
              },
            ],
          }),
          makeWaveConfig('wave_2'),
          makeWaveConfig('wave_3'),
          makeWaveConfig('wave_4'),
          makeWaveConfig('wave_5'),
        ],
      }),
    );
    expect(burst.snapshot().entities.size).toBe(0);
    step(burst); // tick 1
    const snap = burst.snapshot();
    expect(snap.entities.size).toBe(3);
    expect(snap.waves).toMatchObject({
      spawnedInCurrentWave: 3,
      plannedInCurrentWave: 3,
      status: 'active',
    });
    expect(snap.waves?.processedSpawns).toEqual(new Set(['0:0:0', '0:0:1', '0:0:2']));
  });

  it('spawns each Enemy exactly once at combatSession.spawnX with full maxHp and prevents duplicate event execution (AC-04)', () => {
    const game = createBattle(
      waveFixture({
        waves: [
          makeWaveConfig('wave_1', {
            initialDelaySeconds: 1,
            spawnGroups: [
              {
                enemyId: 'enemy_tank',
                count: 2,
                allowedLanes: [0, 3],
                laneMode: 'sequential',
                startOffsetSeconds: 0,
                intervalSeconds: 1,
              },
            ],
          }),
          makeWaveConfig('wave_2'),
          makeWaveConfig('wave_3'),
          makeWaveConfig('wave_4'),
          makeWaveConfig('wave_5'),
        ],
      }),
      resourceFixture(),
      combatFixture({ spawnX: 8.5 }),
    );

    step(game, 2); // tick 1 starts wave & spawns 0n; tick 2 moves 0n to 7.5 and spawns 1n at 8.5.
    const snap = game.snapshot();
    expect(snap.entities.get(1n)).toEqual({
      id: 1n,
      kind: 'enemy',
      definitionId: 'enemy_tank',
      lane: 3,
      position: 8.5,
    });
    expect(snap.combat?.entities.get(1n)).toEqual({
      hp: 200,
      maxHp: 200,
      moveAnchorX: 8.5,
      movedTicks: 0,
      nextAttackTick: null,
      attackAnchorTick: null,
      attackCount: 0,
      targetId: null,
    });

    // Direct applyWaveEvent idempotency guard against duplicate wave-start or wave-spawn.
    const combatSession = validateCombatSession(combatFixture({ spawnX: 8.5 }), 1);
    const waveSession = validateWaveSession(waveFixture(), 1, combatSession);
    const battle = { ...createBattleState(), combat: createCombatState() };
    const waves = createWaveState();
    const scheduled: unknown[] = [];
    const ctx = {
      battle,
      waves,
      session: waveSession,
      combatSession,
      rng: null,
      tick: 0,
      scheduleWave: (event: unknown, t: number) => scheduled.push({ event, t }),
      enqueueWaveReward: () => {},
      enqueueVictory: () => {},
    };
    applyWaveEvent(ctx, { type: 'wave-start', waveIndex: 0 });
    applyWaveEvent(ctx, { type: 'wave-start', waveIndex: 0 });
    expect(scheduled).toHaveLength(1);

    applyWaveEvent(ctx, { type: 'wave-spawn', waveIndex: 0, groupIndex: 0, spawnIndex: 0 });
    applyWaveEvent(ctx, { type: 'wave-spawn', waveIndex: 0, groupIndex: 0, spawnIndex: 0 });
    expect(battle.entities.size).toBe(1);
    expect(waves.spawnedInCurrentWave).toBe(1);
  });

  it('assigns valid deterministic lanes for fixed, sequential and seeded random (with and without resourceInput) (AC-05)', () => {
    const seqAndFixed = createBattle(
      waveFixture({
        waves: [
          makeWaveConfig('wave_1', {
            spawnGroups: [
              {
                enemyId: 'enemy_pass',
                count: 5,
                allowedLanes: [4, 1, 3],
                laneMode: 'sequential',
                startOffsetSeconds: 1,
                intervalSeconds: 0,
              },
              {
                enemyId: 'enemy_grunt',
                count: 2,
                allowedLanes: [2],
                laneMode: 'fixed',
                startOffsetSeconds: 1,
                intervalSeconds: 0,
              },
            ],
          }),
          makeWaveConfig('wave_2'),
          makeWaveConfig('wave_3'),
          makeWaveConfig('wave_4'),
          makeWaveConfig('wave_5'),
        ],
      }),
    );
    step(seqAndFixed); // tick 1 burst-spawns all 7
    const lanes = [...seqAndFixed.snapshot().entities.values()].map(e => (e.kind === 'enemy' ? e.lane : -1));
    expect(lanes).toEqual([4, 1, 3, 4, 1, 2, 2]);

    // Seeded 'random' with resourceInput shares ResourceRng deterministically.
    const randomConfig = waveFixture({
      waves: [
        makeWaveConfig('wave_1', {
          spawnGroups: [
            {
              enemyId: 'enemy_pass',
              count: 6,
              allowedLanes: [0, 2, 4],
              laneMode: 'random',
              startOffsetSeconds: 1,
              intervalSeconds: 0,
            },
          ],
        }),
        makeWaveConfig('wave_2'),
        makeWaveConfig('wave_3'),
        makeWaveConfig('wave_4'),
        makeWaveConfig('wave_5'),
      ],
    });
    const r1 = createBattle(randomConfig, resourceFixture({ seed: 42 }));
    const r2 = createBattle(randomConfig, resourceFixture({ seed: 42 }));
    const r3 = createBattle(randomConfig, resourceFixture({ seed: 7 }));
    step(r1);
    step(r2);
    step(r3);
    expect(r1.snapshot()).toEqual(r2.snapshot());
    const r1Lanes = [...r1.snapshot().entities.values()].map(e => (e.kind === 'enemy' ? e.lane : -1));
    const r3Lanes = [...r3.snapshot().entities.values()].map(e => (e.kind === 'enemy' ? e.lane : -1));
    expect(r1Lanes).toHaveLength(6);
    for (const lane of r1Lanes) expect([0, 2, 4]).toContain(lane);
    expect(r1Lanes).not.toEqual(r3Lanes);

    // Standalone waveInput with seed (no resourceInput) draws identically via Mulberry32.
    const standalone = (seed: number) => createStandaloneWaveBattle({ ...randomConfig, seed });
    const s1 = standalone(12345);
    const s2 = standalone(12345);
    step(s1);
    step(s2);
    expect(s1.snapshot().resources).toBeUndefined();
    expect(s1.snapshot()).toEqual(s2.snapshot());

    const expectedRng = { seed: 12345 };
    const expectedLanes = Array.from({ length: 6 }, () => [0, 2, 4][uniformIndex(expectedRng, 3)]);
    const standaloneLanes = [...s1.snapshot().entities.values()].map(e => (e.kind === 'enemy' ? e.lane : -1));
    expect(standaloneLanes).toEqual(expectedLanes);
  });
});

describe('T-09.3 wave completion guards, wave rewards & inter-wave transitions (AC-06, AC-07, AC-08, AC-09)', () => {
  it('does not complete a Wave early when active Enemies die before all Spawn Groups finish spawning (AC-06)', () => {
    const game = createBattle(
      waveFixture({
        waves: [
          makeWaveConfig('wave_1', {
            initialDelaySeconds: 1,
            delayBeforeNextWaveSeconds: 1,
            spawnGroups: [
              {
                enemyId: 'enemy_grunt',
                count: 2,
                allowedLanes: [0],
                laneMode: 'fixed',
                startOffsetSeconds: 0,
                intervalSeconds: 4,
              },
            ],
          }),
          makeWaveConfig('wave_2'),
          makeWaveConfig('wave_3'),
          makeWaveConfig('wave_4'),
          makeWaveConfig('wave_5'),
        ],
      }),
    );

    game.enqueue({ type: 'summon', definitionId: 'def_base', cell: { row: 0, column: 0 } }, 1);
    step(game); // tick 1: def_base summoned, wave 1 starts and spawns enemy #1; enemy #2 due at tick 5.
    expect(game.snapshot().waves?.spawnedInCurrentWave).toBe(1);

    step(game); // tick 2: def_base kills enemy #1 -> 0 living enemies, but spawned (1) < planned (2).
    const afterEarlyKill = game.snapshot();
    expect(afterEarlyKill.entities.size).toBe(1); // Only def_base remains.
    expect(afterEarlyKill.waves?.completedWaves.size).toBe(0);
    expect(afterEarlyKill.waves?.status).toBe('spawning');
    expect(afterEarlyKill.resources?.rewardedWaves.size).toBe(0);
    expect(afterEarlyKill.resources?.crystals).toBe(0);

    step(game, 2); // ticks 3, 4: still waiting for enemy #2
    expect(game.snapshot().waves?.completedWaves.size).toBe(0);

    step(game); // tick 5: enemy #2 spawns
    expect(game.snapshot().waves?.spawnedInCurrentWave).toBe(2);
    expect(game.snapshot().waves?.status).toBe('active');
    expect(game.snapshot().waves?.completedWaves.size).toBe(0);

    step(game); // tick 6: def_base kills enemy #2 -> Wave 1 completes now!
    const completed = game.snapshot();
    expect(completed.waves?.completedWaves).toEqual(new Set([0]));
    expect(completed.waves?.status).toBe('between-waves');
    expect(completed.resources?.rewardedWaves).toEqual(new Set(['wave_1']));
    expect(completed.resources?.crystals).toBe(1);
  });

  it('does not complete a Wave or grant wave-reward while any spawned Enemy remains alive (AC-07)', () => {
    const game = createBattle(
      waveFixture({
        waves: [
          makeWaveConfig('wave_1', {
            initialDelaySeconds: 0,
            delayBeforeNextWaveSeconds: 1,
            spawnGroups: [
              {
                enemyId: 'enemy_grunt',
                count: 1,
                allowedLanes: [0],
                laneMode: 'fixed',
                startOffsetSeconds: 1,
                intervalSeconds: 0,
              },
              {
                enemyId: 'enemy_tank',
                count: 1,
                allowedLanes: [1],
                laneMode: 'fixed',
                startOffsetSeconds: 1,
                intervalSeconds: 0,
              },
            ],
          }),
          makeWaveConfig('wave_2'),
          makeWaveConfig('wave_3'),
          makeWaveConfig('wave_4'),
          makeWaveConfig('wave_5'),
        ],
      }),
    );

    game.enqueue({ type: 'summon', definitionId: 'def_base', cell: { row: 0, column: 0 } }, 1);
    step(game, 2); // tick 1 spawns both; tick 2 kills lane 0 enemy, lane 1 tank moves 9 -> 8.

    step(game, 3); // ticks 3..5: lane 1 tank is still alive
    const mid = game.snapshot();
    expect(mid.waves).toMatchObject({
      currentWaveIndex: 0,
      status: 'active',
      spawnedInCurrentWave: 2,
      plannedInCurrentWave: 2,
    });
    expect(mid.waves?.completedWaves.size).toBe(0);
    expect(mid.resources?.rewardedWaves.size).toBe(0);
    expect(mid.resources?.crystals).toBe(0);

    // Summon def_base on lane 1 at tick 6; tick 7 kills the surviving tank -> Wave 1 completes!
    game.enqueue({ type: 'summon', definitionId: 'def_base', cell: { row: 1, column: 0 } }, 6);
    step(game, 2);
    const done = game.snapshot();
    expect(done.waves?.completedWaves).toEqual(new Set([0]));
    expect(done.waves?.status).toBe('between-waves');
    expect(done.resources?.rewardedWaves).toEqual(new Set(['wave_1']));
    expect(done.resources?.crystals).toBe(1);
  });

  it('caps Crystal storage at 5, overflows to Pending Wave Reward, deduplicates by wave.id, and transitions after delayBeforeNextWaveSeconds (AC-08, AC-09)', () => {
    const resources = resourceFixture({
      waves: [
        { id: 'wave_1', crystals: 3 },
        { id: 'wave_2', crystals: 4 },
        { id: 'wave_3', crystals: 6 },
        { id: 'wave_4', crystals: 2 },
        { id: 'wave_5', crystals: 1 },
      ],
    });
    const waves = waveFixture({
      waves: [
        makeWaveConfig('wave_1', { delayBeforeNextWaveSeconds: 3 }),
        makeWaveConfig('wave_2', { delayBeforeNextWaveSeconds: 2 }),
        makeWaveConfig('wave_3', { delayBeforeNextWaveSeconds: 2 }),
        makeWaveConfig('wave_4', { delayBeforeNextWaveSeconds: 2 }),
        makeWaveConfig('wave_5', { delayBeforeNextWaveSeconds: 0 }),
      ],
    });

    const game = createBattle(waves, resources);
    game.enqueue({ type: 'summon', definitionId: 'def_base', cell: { row: 0, column: 0 } }, 1);
    step(game, 2); // tick 1 summons def_base; tick 2 kills Wave 1 enemy -> Wave 1 completes!
    expect(game.snapshot().waves?.completedWaves).toEqual(new Set([0]));
    expect(game.snapshot().waves?.status).toBe('between-waves');
    expect(game.snapshot().resources).toMatchObject({
      crystals: 3,
      pending: 0,
      rewardedWaves: new Set(['wave_1']),
    });

    // Duplicate wave-reward for wave_1 is rejected without doubling crystals.
    game.enqueue({ type: 'wave-reward', sourceId: 'wave_1' }, 3);
    step(game); // tick 3: still between-waves (Wave 2 scheduled at 2 + 3 = 5)
    expect(game.snapshot().resources?.outcome).toMatchObject({ status: 'REJECTED', reason: 'duplicate-wave-reward' });
    expect(game.snapshot().resources?.crystals).toBe(3);
    expect(game.snapshot().waves?.currentWaveIndex).toBe(0);
    expect(game.snapshot().waves?.status).toBe('between-waves');

    step(game); // tick 4: still waiting for delayBeforeNextWaveSeconds = 3
    expect(game.snapshot().waves?.currentWaveIndex).toBe(0);
    expect(game.snapshot().waves?.status).toBe('between-waves');

    step(game); // tick 5: Wave 2 starts and spawns!
    expect(game.snapshot().waves?.currentWaveIndex).toBe(1);
    expect(game.snapshot().waves?.startedWaves).toEqual(new Set([0, 1]));

    step(game); // tick 6: Wave 2 enemy killed -> +4 crystals -> cap 5 + 2 pending!
    expect(game.snapshot().resources).toMatchObject({
      crystals: 5,
      pending: 2,
      rewardedWaves: new Set(['wave_1', 'wave_2']),
    });

    step(game, 3); // tick 7 wait, tick 8 Wave 3 starts, tick 9 killed -> +6 crystals -> pending 8!
    expect(game.snapshot().resources).toMatchObject({
      crystals: 5,
      pending: 8,
      rewardedWaves: new Set(['wave_1', 'wave_2', 'wave_3']),
    });

    // Direct checkWaveCompletion guard does not re-complete an already completed wave.
    const combatSession = validateCombatSession(combatFixture(), 1);
    const waveSession = validateWaveSession(waves, 1, combatSession);
    const battle = { ...createBattleState(), combat: createCombatState() };
    const waveState = createWaveState();
    waveState.currentWaveIndex = 0;
    waveState.completedWaves.add(0);
    expect(
      checkWaveCompletion({
        battle,
        waves: waveState,
        session: waveSession,
        tick: 10,
        scheduleWave: () => {},
        enqueueWaveReward: () => {},
        enqueueVictory: () => {},
      }),
    ).toBe(false);
  });
});

describe('T-09.4 full 5-wave victory, breach defeat & G07 arbitration (AC-10, AC-11, AC-12, AC-13, AC-15, AC-16)', () => {
  it('reaches Victory across all 5 Waves using Base Defenders only (Fusion optional) with enemy & wave rewards (AC-10, AC-15, AC-16)', () => {
    const waves = waveFixture({
      waves: [
        makeWaveConfig('wave_1', {
          initialDelaySeconds: 1,
          delayBeforeNextWaveSeconds: 1,
          spawnGroups: [
            { enemyId: 'enemy_grunt', count: 2, allowedLanes: [0, 1], laneMode: 'sequential', startOffsetSeconds: 0, intervalSeconds: 1 },
          ],
        }),
        makeWaveConfig('wave_2', {
          delayBeforeNextWaveSeconds: 1,
          spawnGroups: [
            { enemyId: 'enemy_tank', count: 2, allowedLanes: [2, 3], laneMode: 'sequential', startOffsetSeconds: 0, intervalSeconds: 1 },
          ],
        }),
        makeWaveConfig('wave_3', {
          delayBeforeNextWaveSeconds: 1,
          spawnGroups: [
            { enemyId: 'enemy_grunt', count: 3, allowedLanes: [0, 2, 4], laneMode: 'random', startOffsetSeconds: 0, intervalSeconds: 1 },
          ],
        }),
        makeWaveConfig('wave_4', {
          delayBeforeNextWaveSeconds: 1,
          spawnGroups: [
            { enemyId: 'enemy_pass', count: 2, allowedLanes: [1, 3], laneMode: 'sequential', startOffsetSeconds: 0, intervalSeconds: 1 },
            { enemyId: 'enemy_tank', count: 1, allowedLanes: [4], laneMode: 'fixed', startOffsetSeconds: 1, intervalSeconds: 0 },
          ],
        }),
        makeWaveConfig('wave_5', {
          delayBeforeNextWaveSeconds: 0,
          spawnGroups: [
            { enemyId: 'enemy_tank', count: 3, allowedLanes: [0, 1, 2, 3, 4], laneMode: 'random', startOffsetSeconds: 0, intervalSeconds: 1 },
          ],
        }),
      ],
    });
    const resources = resourceFixture({
      seed: 19,
      defenders: [
        { id: 'def_base', classification: 'base', summonEnergyCost: 10, unlocked: true },
        { id: 'def_costly', classification: 'base', summonEnergyCost: 25, unlocked: true },
        { id: 'iron_golem', classification: 'base', summonEnergyCost: 25, unlocked: true },
        { id: 'snow_golem', classification: 'base', summonEnergyCost: 25, unlocked: true },
        { id: 'frost_guardian', classification: 'fusion', summonEnergyCost: 0, unlocked: true },
      ],
    });

    const game = createBattle(waves, resources, combatFixture(), undefined);
    expect(game.snapshot().fusion).toBeUndefined();

    // Summon 5 Base Defenders across lanes 0..4 (5 * 10 = 50 starting energy).
    for (let row = 0; row < 5; row++) {
      game.enqueue({ type: 'summon', definitionId: 'def_base', cell: { row, column: 0 } }, 1);
    }

    for (let i = 0; i < 60 && !game.snapshot().waves?.terminal; i++) {
      step(game);
    }

    const final = game.snapshot();
    expect(final.failure).toBeNull();
    expect(final.waves).toMatchObject({
      status: 'completed',
      terminal: 'victory',
      completedWaves: new Set([0, 1, 2, 3, 4]),
      startedWaves: new Set([0, 1, 2, 3, 4]),
    });
    expect(final.resources?.terminal).toBe('victory');
    expect(final.combat?.terminal).toBe('victory');
    expect(final.resources?.pending).toBe(0);
    expect(final.resources?.crystals).toBe(5); // capped at 5, overflow cleared on terminal
    expect(final.resources?.rewardedWaves).toEqual(new Set(['wave_1', 'wave_2', 'wave_3', 'wave_4', 'wave_5']));
    // 2 + 2 + 3 + 3 + 3 = 13 enemies killed and rewarded across Waves 1..5.
    expect(final.resources?.rewardedEnemies.size).toBe(13);
    expect(game.advance(1000)).toBe(0);
    expect(
      game.enqueue({ type: 'summon', definitionId: 'def_base', cell: { row: 0, column: 1 } }, final.tick + 1),
    ).toEqual({ status: 'REJECTED', reason: 'terminal' });
  });

  it('reaches Victory across all 5 Waves using a T-08 Fusion Defender (AC-15, AC-16)', () => {
    const waves = waveFixture({
      waves: [
        makeWaveConfig('wave_1', {
          initialDelaySeconds: 1,
          delayBeforeNextWaveSeconds: 1,
          spawnGroups: [{ enemyId: 'enemy_grunt', count: 2, allowedLanes: [1], laneMode: 'fixed', startOffsetSeconds: 1, intervalSeconds: 1 }],
        }),
        makeWaveConfig('wave_2', {
          delayBeforeNextWaveSeconds: 1,
          spawnGroups: [{ enemyId: 'enemy_tank', count: 2, allowedLanes: [1], laneMode: 'fixed', startOffsetSeconds: 0, intervalSeconds: 1 }],
        }),
        makeWaveConfig('wave_3', {
          delayBeforeNextWaveSeconds: 1,
          spawnGroups: [{ enemyId: 'enemy_pass', count: 2, allowedLanes: [1], laneMode: 'fixed', startOffsetSeconds: 0, intervalSeconds: 1 }],
        }),
        makeWaveConfig('wave_4', {
          delayBeforeNextWaveSeconds: 1,
          spawnGroups: [{ enemyId: 'enemy_tank', count: 2, allowedLanes: [1], laneMode: 'fixed', startOffsetSeconds: 0, intervalSeconds: 1 }],
        }),
        makeWaveConfig('wave_5', {
          delayBeforeNextWaveSeconds: 0,
          spawnGroups: [{ enemyId: 'enemy_tank', count: 2, allowedLanes: [1], laneMode: 'fixed', startOffsetSeconds: 0, intervalSeconds: 1 }],
        }),
      ],
    });

    const game = createBattle(waves, resourceFixture(), combatFixture(), fusionFixture());
    // Summon iron_golem + snow_golem (25 + 25 = 50 energy) and fuse into frost_guardian on lane 1.
    game.enqueue({ type: 'summon', definitionId: 'iron_golem', cell: { row: 0, column: 0 } }, 1);
    game.enqueue({ type: 'summon', definitionId: 'snow_golem', cell: { row: 1, column: 0 } }, 1);
    game.enqueue({ type: 'fuse', sourceId: 0n, targetId: 1n }, 1);
    step(game); // tick 1
    expect(game.snapshot().fusion?.outcome).toMatchObject({
      status: 'APPLIED',
      recipeId: 'fusion_frost_guardian',
      targetCell: { row: 1, column: 0 },
    });
    expect(game.snapshot().entities.get(2n)).toMatchObject({ definitionId: 'frost_guardian' });

    for (let i = 0; i < 60 && !game.snapshot().waves?.terminal; i++) {
      step(game);
    }

    const final = game.snapshot();
    expect(final.failure).toBeNull();
    expect(final.waves?.terminal).toBe('victory');
    expect(final.resources?.terminal).toBe('victory');
    expect(final.combat?.terminal).toBe('victory');
    expect(final.waves?.completedWaves).toEqual(new Set([0, 1, 2, 3, 4]));
    expect(final.resources?.rewardedEnemies.size).toBe(10);
    expect(final.resources?.rewardedWaves).toEqual(new Set(['wave_1', 'wave_2', 'wave_3', 'wave_4', 'wave_5']));
  });

  it('resolves Defeat on enemy breach during Wave 2, clears Pending Wave Reward and cancels remaining Wave spawns (AC-11, AC-13)', () => {
    const resources = resourceFixture({
      waves: [
        { id: 'wave_1', crystals: 7 }, // 5 stored + 2 pending
        { id: 'wave_2', crystals: 3 },
        { id: 'wave_3', crystals: 3 },
        { id: 'wave_4', crystals: 3 },
        { id: 'wave_5', crystals: 3 },
      ],
    });
    const waves = waveFixture({
      waves: [
        makeWaveConfig('wave_1', {
          initialDelaySeconds: 0,
          delayBeforeNextWaveSeconds: 1,
          spawnGroups: [
            { enemyId: 'enemy_grunt', count: 1, allowedLanes: [0], laneMode: 'fixed', startOffsetSeconds: 0, intervalSeconds: 0 },
          ],
        }),
        makeWaveConfig('wave_2', {
          delayBeforeNextWaveSeconds: 1,
          spawnGroups: [
            { enemyId: 'enemy_pass', count: 1, allowedLanes: [2], laneMode: 'fixed', startOffsetSeconds: 0, intervalSeconds: 0 },
            { enemyId: 'enemy_grunt', count: 2, allowedLanes: [0], laneMode: 'fixed', startOffsetSeconds: 10, intervalSeconds: 2 },
          ],
        }),
        makeWaveConfig('wave_3'),
        makeWaveConfig('wave_4'),
        makeWaveConfig('wave_5'),
      ],
    });

    const game = createBattle(waves, resources, combatFixture({ spawnX: 2.5 }));
    game.enqueue({ type: 'summon', definitionId: 'def_base', cell: { row: 0, column: 0 } }, 1);
    step(game, 2); // tick 1 summons def_base; tick 2 kills Wave 1 enemy -> crystals: 5, pending: 2.
    expect(game.snapshot().resources).toMatchObject({ crystals: 5, pending: 2 });

    step(game); // tick 3: Wave 2 starts and spawns enemy_pass on undefended lane 2 at x = 2.5.
    expect(game.snapshot().waves?.currentWaveIndex).toBe(1);

    step(game, 3); // ticks 4, 5, 6: 2.5 -> 1.5 -> 0.5 -> -0.5 (< 0 breach!).
    const defeatSnap = game.snapshot();
    expect(defeatSnap.waves?.terminal).toBe('defeat');
    expect(defeatSnap.resources?.terminal).toBe('defeat');
    expect(defeatSnap.combat?.terminal).toBe('defeat');
    expect(defeatSnap.resources?.pending).toBe(0);
    expect(defeatSnap.waves?.completedWaves).toEqual(new Set([0]));
    expect(defeatSnap.waves?.startedWaves).toEqual(new Set([0, 1]));
    expect(defeatSnap.resources?.rewardedWaves).toEqual(new Set(['wave_1']));

    // Remaining Wave 2 delayed group and Waves 3..5 never run.
    expect(step(game, 50)).toBe(0);
    expect(game.snapshot()).toEqual(defeatSnap);
  });

  it('arbitrates simultaneous Victory and Defeat in the same tick by G07 insertionSequence in both directions (AC-12)', () => {
    // Direction 1: Pre-queued Defeat at the exact Wave-5 completion tick beats phase-enqueued Victory.
    const waves5 = waveFixture({
      waves: [
        makeWaveConfig('wave_1', { delayBeforeNextWaveSeconds: 1 }),
        makeWaveConfig('wave_2', { delayBeforeNextWaveSeconds: 1 }),
        makeWaveConfig('wave_3', { delayBeforeNextWaveSeconds: 1 }),
        makeWaveConfig('wave_4', { delayBeforeNextWaveSeconds: 1 }),
        makeWaveConfig('wave_5', { delayBeforeNextWaveSeconds: 0 }),
      ],
    });
    const dir1 = createBattle(waves5, resourceFixture(), combatFixture({ spawnX: 2 }));
    dir1.enqueue({ type: 'summon', definitionId: 'def_base', cell: { row: 0, column: 0 } }, 1);
    // Tick 1 summons def_base -> tick 2 kills wave_1 -> tick 3 wave_2 -> ... -> tick 9 wave_5 spawns -> tick 10 kills wave_5!
    step(dir1, 9);
    expect(dir1.snapshot().waves?.currentWaveIndex).toBe(4);
    expect(dir1.snapshot().waves?.terminal).toBeNull();

    // Enqueue defeat at tick 10 BEFORE runCombatPhase(10) runs and enqueues victory.
    dir1.enqueue({ type: 'terminal', result: 'defeat' }, 10);
    // Also enqueue a trailing victory at tick 10 to confirm a later terminal command cannot overwrite defeat.
    dir1.enqueue({ type: 'terminal', result: 'victory' }, 10);
    step(dir1);

    const dir1Snap = dir1.snapshot();
    expect(dir1Snap.waves?.terminal).toBe('defeat');
    expect(dir1Snap.resources?.terminal).toBe('defeat');
    expect(dir1Snap.combat?.terminal).toBe('defeat');
    expect(dir1Snap.resources?.pending).toBe(0);
    expect(dir1.enqueue({ type: 'terminal', result: 'victory' }, 11)).toEqual({
      status: 'REJECTED',
      reason: 'terminal',
    });

    // Direction 2: Pre-queued Victory at a breach tick beats phase-enqueued Defeat.
    const dir2 = createBattle(
      waveFixture({
        waves: [
          makeWaveConfig('wave_1', {
            initialDelaySeconds: 0,
            spawnGroups: [
              { enemyId: 'enemy_pass', count: 1, allowedLanes: [2], laneMode: 'fixed', startOffsetSeconds: 0, intervalSeconds: 0 },
            ],
          }),
          makeWaveConfig('wave_2'),
          makeWaveConfig('wave_3'),
          makeWaveConfig('wave_4'),
          makeWaveConfig('wave_5'),
        ],
      }),
      resourceFixture(),
      combatFixture({ spawnX: 1.5 }),
    );
    step(dir2); // tick 1: enemy_pass moves 1.5 -> 0.5; tick 2 will move 0.5 -> -0.5 (< 0 breach!).
    expect(dir2.snapshot().waves?.terminal).toBeNull();

    // Enqueue victory at tick 2 BEFORE runCombatPhase(2) runs and enqueues breach defeat.
    dir2.enqueue({ type: 'terminal', result: 'victory' }, 2);
    dir2.enqueue({ type: 'terminal', result: 'defeat' }, 2);
    step(dir2);

    const dir2Snap = dir2.snapshot();
    expect(dir2Snap.waves?.terminal).toBe('victory');
    expect(dir2Snap.resources?.terminal).toBe('victory');
    expect(dir2Snap.combat?.terminal).toBe('victory');
    expect(dir2Snap.resources?.pending).toBe(0);
    expect(dir2.enqueue({ type: 'terminal', result: 'defeat' }, 3)).toEqual({
      status: 'REJECTED',
      reason: 'terminal',
    });
  });
});

describe('T-09.5 pause/resume, atomic rollback & deterministic replay (AC-14, AC-17, AC-18)', () => {
  it('freezes initialDelaySeconds, Spawn Group intervals and inter-wave transitions during Pause and resumes with zero duplicates or skips (AC-14)', () => {
    // 0. Pause during Wave 1 initialDelaySeconds countdown.
    const initialDelayGame = createBattle(
      waveFixture({
        waves: [
          makeWaveConfig('wave_1', { initialDelaySeconds: 2 }),
          makeWaveConfig('wave_2'),
          makeWaveConfig('wave_3'),
          makeWaveConfig('wave_4'),
          makeWaveConfig('wave_5'),
        ],
      }),
    );
    const beforeInitialPause = initialDelayGame.snapshot();
    initialDelayGame.setPaused(true);
    expect(step(initialDelayGame, 10)).toBe(0);
    expect(initialDelayGame.snapshot()).toEqual(beforeInitialPause);
    initialDelayGame.setPaused(false);
    step(initialDelayGame); // tick 1: still waiting for initialDelaySeconds = 2
    expect(initialDelayGame.snapshot().waves?.currentWaveIndex).toBeNull();
    step(initialDelayGame); // tick 2: Wave 1 starts and spawns
    expect(initialDelayGame.snapshot().waves?.currentWaveIndex).toBe(0);
    expect(initialDelayGame.snapshot().waves?.spawnedInCurrentWave).toBe(1);

    // 1. Pause during active Spawn Group intervals.
    const activeSpawnGame = createBattle(
      waveFixture({
        waves: [
          makeWaveConfig('wave_1', {
            initialDelaySeconds: 1,
            spawnGroups: [
              { enemyId: 'enemy_pass', count: 3, allowedLanes: [1], laneMode: 'fixed', startOffsetSeconds: 0, intervalSeconds: 2 },
            ],
          }),
          makeWaveConfig('wave_2'),
          makeWaveConfig('wave_3'),
          makeWaveConfig('wave_4'),
          makeWaveConfig('wave_5'),
        ],
      }),
    );
    step(activeSpawnGame); // tick 1: spawn 0 fires; spawns 1 & 2 scheduled for ticks 3 & 5.
    expect(activeSpawnGame.snapshot().waves?.spawnedInCurrentWave).toBe(1);
    const beforePauseSpawn = activeSpawnGame.snapshot();

    activeSpawnGame.setPaused(true);
    expect(step(activeSpawnGame, 20)).toBe(0);
    expect(activeSpawnGame.snapshot()).toEqual(beforePauseSpawn);

    activeSpawnGame.setPaused(false);
    step(activeSpawnGame); // tick 2
    expect(activeSpawnGame.snapshot().waves?.spawnedInCurrentWave).toBe(1);
    step(activeSpawnGame); // tick 3: spawn 1
    expect(activeSpawnGame.snapshot().waves?.spawnedInCurrentWave).toBe(2);
    step(activeSpawnGame); // tick 4
    expect(activeSpawnGame.snapshot().waves?.spawnedInCurrentWave).toBe(2);
    step(activeSpawnGame); // tick 5: spawn 2
    expect(activeSpawnGame.snapshot().waves).toMatchObject({
      spawnedInCurrentWave: 3,
      plannedInCurrentWave: 3,
      status: 'active',
      processedSpawns: new Set(['0:0:0', '0:0:1', '0:0:2']),
    });

    // 2. Pause during inter-wave transition delay.
    const interWaveGame = createBattle(
      waveFixture({
        waves: [
          makeWaveConfig('wave_1', { delayBeforeNextWaveSeconds: 3 }),
          makeWaveConfig('wave_2'),
          makeWaveConfig('wave_3'),
          makeWaveConfig('wave_4'),
          makeWaveConfig('wave_5'),
        ],
      }),
    );
    interWaveGame.enqueue({ type: 'summon', definitionId: 'def_base', cell: { row: 0, column: 0 } }, 1);
    step(interWaveGame, 2); // tick 1 summons def_base; tick 2 kills Wave 1 enemy -> status 'between-waves', Wave 2 due at 2 + 3 = 5.
    expect(interWaveGame.snapshot().waves?.status).toBe('between-waves');
    const beforePauseTransition = interWaveGame.snapshot();

    interWaveGame.setPaused(true);
    expect(step(interWaveGame, 20)).toBe(0);
    expect(interWaveGame.snapshot()).toEqual(beforePauseTransition);

    interWaveGame.setPaused(false);
    step(interWaveGame, 2); // ticks 3, 4: still waiting
    expect(interWaveGame.snapshot().waves?.currentWaveIndex).toBe(0);
    expect(interWaveGame.snapshot().waves?.status).toBe('between-waves');

    step(interWaveGame); // tick 5: Wave 2 starts at exact scheduled tick
    expect(interWaveGame.snapshot().waves?.currentWaveIndex).toBe(1);
    expect(interWaveGame.snapshot().waves?.startedWaves).toEqual(new Set([0, 1]));
  });

  it('rolls back waves, entities, combat, resources, rng and queue atomically on QUEUE_OVERFLOW during Wave scheduling (AC-17)', () => {
    // 1. Overflow while wave-start schedules multiple wave-spawn events.
    const startOverflow = createBattle(
      waveFixture({
        waves: [
          makeWaveConfig('wave_1', {
            initialDelaySeconds: 2,
            spawnGroups: [
              { enemyId: 'enemy_grunt', count: 3, allowedLanes: [0], laneMode: 'fixed', startOffsetSeconds: 0, intervalSeconds: 1 },
            ],
          }),
          makeWaveConfig('wave_2'),
          makeWaveConfig('wave_3'),
          makeWaveConfig('wave_4'),
          makeWaveConfig('wave_5'),
        ],
      }),
    );
    step(startOverflow); // tick 1
    const fill1 = 4096 - startOverflow.snapshot().queue.events.length;
    for (let i = 0; i < fill1; i++) startOverflow.enqueue({ type: 'collect', id: 999n }, 500);
    const beforeStartOverflow = startOverflow.snapshot();

    step(startOverflow); // tick 2: wave-start pops 1 -> enqueues 3 spawns -> overflows!
    expect(startOverflow.snapshot()).toEqual({
      ...beforeStartOverflow,
      tick: 2,
      failure: expect.objectContaining({ code: 'QUEUE_OVERFLOW', tick: 2 }),
    });

    // 2. Overflow during checkWaveCompletion when killing the final enemy of a wave.
    const completeOverflow = createBattle(waveFixture());
    completeOverflow.enqueue({ type: 'summon', definitionId: 'def_base', cell: { row: 0, column: 0 } }, 1);
    step(completeOverflow); // tick 1: def_base summoned; enemy spawned at tick 0 is at x=9.
    const fill2 = 4096 - completeOverflow.snapshot().queue.events.length;
    for (let i = 0; i < fill2; i++) completeOverflow.enqueue({ type: 'collect', id: 999n }, 500);
    const beforeCompleteOverflow = completeOverflow.snapshot();

    step(completeOverflow); // tick 2: combat phase kills enemy and tries to enqueue wave-reward / wave-start -> overflows!
    expect(completeOverflow.snapshot()).toEqual({
      ...beforeCompleteOverflow,
      tick: 2,
      failure: expect.objectContaining({ code: 'QUEUE_OVERFLOW', tick: 2 }),
    });
  });

  it('replays a full 5-Wave battle deterministically and isolates snapshot.waves mutations (AC-18)', () => {
    const replayWaves = waveFixture({
      waves: [
        makeWaveConfig('wave_1', {
          initialDelaySeconds: 1,
          delayBeforeNextWaveSeconds: 1,
          spawnGroups: [
            { enemyId: 'enemy_grunt', count: 2, allowedLanes: [0, 2, 4], laneMode: 'random', startOffsetSeconds: 0, intervalSeconds: 1 },
          ],
        }),
        makeWaveConfig('wave_2', {
          delayBeforeNextWaveSeconds: 1,
          spawnGroups: [
            { enemyId: 'enemy_tank', count: 2, allowedLanes: [1, 3], laneMode: 'sequential', startOffsetSeconds: 0, intervalSeconds: 1 },
          ],
        }),
        makeWaveConfig('wave_3', {
          delayBeforeNextWaveSeconds: 1,
          spawnGroups: [
            { enemyId: 'enemy_pass', count: 2, allowedLanes: [0, 4], laneMode: 'random', startOffsetSeconds: 0, intervalSeconds: 1 },
          ],
        }),
        makeWaveConfig('wave_4', {
          delayBeforeNextWaveSeconds: 1,
          spawnGroups: [
            { enemyId: 'enemy_tank', count: 2, allowedLanes: [1, 2, 3], laneMode: 'random', startOffsetSeconds: 0, intervalSeconds: 1 },
          ],
        }),
        makeWaveConfig('wave_5', {
          delayBeforeNextWaveSeconds: 0,
          spawnGroups: [
            { enemyId: 'enemy_tank', count: 3, allowedLanes: [0, 1, 2, 3, 4], laneMode: 'random', startOffsetSeconds: 0, intervalSeconds: 1 },
          ],
        }),
      ],
    });
    const replayResources = resourceFixture({
      seed: 77,
      defenders: [
        { id: 'def_base', classification: 'base', summonEnergyCost: 10, unlocked: true },
        { id: 'def_costly', classification: 'base', summonEnergyCost: 25, unlocked: true },
        { id: 'iron_golem', classification: 'base', summonEnergyCost: 10, unlocked: true },
        { id: 'snow_golem', classification: 'base', summonEnergyCost: 10, unlocked: true },
        { id: 'frost_guardian', classification: 'fusion', summonEnergyCost: 0, unlocked: true },
      ],
    });

    function replay() {
      const game = createBattle(replayWaves, replayResources, combatFixture(), fusionFixture());
      game.enqueue({ type: 'summon', definitionId: 'iron_golem', cell: { row: 0, column: 0 } }, 1);
      game.enqueue({ type: 'summon', definitionId: 'snow_golem', cell: { row: 1, column: 0 } }, 1);
      game.enqueue({ type: 'fuse', sourceId: 0n, targetId: 1n }, 1);
      game.enqueue({ type: 'summon', definitionId: 'def_base', cell: { row: 0, column: 0 } }, 2);
      game.enqueue({ type: 'summon', definitionId: 'def_base', cell: { row: 2, column: 0 } }, 2);
      game.enqueue({ type: 'summon', definitionId: 'def_base', cell: { row: 3, column: 0 } }, 2);
      game.enqueue({ type: 'summon', definitionId: 'def_base', cell: { row: 4, column: 0 } }, 3);

      for (let i = 0; i < 60 && !game.snapshot().waves?.terminal; i++) {
        step(game);
      }
      return game.snapshot();
    }

    const first = replay();
    const second = replay();
    expect(first).toEqual(second);
    expect(first.waves?.terminal).toBe('victory');

    // Mutating snapshot().waves must not affect the live runtime.
    const live = createBattle(waveFixture());
    const baseline = live.snapshot();
    const mutated = live.snapshot();
    mutated.waves!.terminal = 'defeat';
    mutated.waves!.status = 'completed';
    mutated.waves!.completedWaves.add(4);
    mutated.waves!.startedWaves.clear();
    mutated.waves!.processedSpawns.clear();
    expect(live.snapshot()).toEqual(baseline);
  });
});
