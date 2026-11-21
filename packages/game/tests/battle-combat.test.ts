import { describe, expect, it } from 'vitest';
import type { CombatSessionInput, TargetingStrategy } from '../src/combat/combat-session';
import type { ResourceSessionInput } from '../src/core/resource-session';
import { BattleRuntime } from '../src/systems/battle-runtime';

// Test-only fixtures. Never treat these values as approved production balance.
function resourceFixture(): ResourceSessionInput {
  return {
    seed: 1,
    defenders: [
      { id: 'def_base', classification: 'base', summonEnergyCost: 25, unlocked: true },
      { id: 'def_sniper', classification: 'base', summonEnergyCost: 0, unlocked: true },
    ],
    enemies: [
      { id: 'enemy_stop', energy: 50, crystals: 0 },
      { id: 'enemy_fast', energy: 150, crystals: 1 },
      { id: 'enemy_pass', energy: 100, crystals: 0 },
    ],
    waves: [{ id: 'fixture_wave', crystals: 10 }],
    energyItems: {
      amount: 10,
      intervalSeconds: 100,
      region: { min: { x: 0, y: 0 }, max: { x: 1, y: 1 } },
      positions: [{ x: 0.5, y: 0.5 }],
    },
  };
}

function combatFixture(overrides: Partial<CombatSessionInput> = {}): CombatSessionInput {
  return {
    spawnX: 9,
    defenders: [
      { id: 'def_base', maxHp: 100, damage: 25, attackSpeed: 1, attackRange: 3, targeting: 'CLOSEST_TO_BASE' },
      { id: 'def_sniper', maxHp: 50, damage: 10, attackSpeed: 1, attackRange: 9, targeting: 'HIGHEST_HP' },
    ],
    enemies: [
      { id: 'enemy_stop', maxHp: 100, moveSpeed: 1, behavior: 'STOP_AND_ATTACK', damage: 20, attackSpeed: 1, attackRange: 0 },
      { id: 'enemy_fast', maxHp: 60, moveSpeed: 2, behavior: 'STOP_AND_ATTACK', damage: 10, attackSpeed: 1, attackRange: 0 },
      { id: 'enemy_pass', maxHp: 80, moveSpeed: 1, behavior: 'IGNORE_DEFENDER' },
    ],
    ...overrides,
  };
}

const createBattle = (
  combat = combatFixture(),
  resources: ResourceSessionInput | undefined = resourceFixture(),
  ticksPerSecond = 1,
) => new BattleRuntime({ ticksPerSecond, maxCatchUpTicks: 250 }, resources, combat);

const step = (game: BattleRuntime, ticks = 1, ticksPerSecond = 1) =>
  game.advance((ticks * 1000) / ticksPerSecond);

describe('T-07.1 combat session validation & snapshot isolation', () => {
  it('validates and detaches combat session inputs and isolates snapshot combat state', () => {
    const combat = combatFixture();
    const game = createBattle(combat);
    Object.assign(combat.defenders[1], { damage: 9999 });
    game.enqueue({ type: 'summon', definitionId: 'def_sniper', cell: { row: 0, column: 0 } }, 1);
    game.enqueue({ type: 'spawn-enemy', definitionId: 'enemy_stop', lane: 0 }, 1);
    step(game); // Tick 1 spawns at x=9 via queue.
    expect(game.snapshot().entities.get(1n)).toMatchObject({ kind: 'enemy', position: 9 });
    step(game); // Tick 2 moves 9 -> 8 and deals 10 (not mutated 9999) damage!
    const snap = game.snapshot();
    const copy = game.snapshot();
    copy.combat!.entities.clear();
    copy.combat!.terminal = 'defeat';
    expect(game.snapshot()).toEqual(snap);
    expect(snap.combat?.entities.get(1n)?.hp).toBe(90);
    expect(snap.entities.get(1n)).toMatchObject({ kind: 'enemy', position: 8 });
  });

  it('fails closed on missing/invalid stats, unsupported targeting/behavior and cross-session mismatch', () => {
    const base = combatFixture();
    expect(() => createBattle({ ...base, spawnX: -0.1 })).toThrow(RangeError);
    expect(() => createBattle({ ...base, spawnX: Number.NaN })).toThrow(RangeError);
    expect(() => createBattle({
      ...base,
      defenders: [base.defenders[0], base.defenders[0]],
    })).toThrow(TypeError);
    expect(() => createBattle({
      ...base,
      defenders: [{ ...base.defenders[0], maxHp: 0 }],
    })).toThrow(RangeError);
    expect(() => createBattle({
      ...base,
      defenders: [{ ...base.defenders[0], targeting: 'HIGHEST_THREAT' as TargetingStrategy }],
    })).toThrow(TypeError);
    expect(() => createBattle({
      ...base,
      enemies: [{ ...base.enemies[0], behavior: 'SPECIAL' as never }],
    })).toThrow(TypeError);
    expect(() => createBattle({
      ...base,
      enemies: [{ id: 'enemy_stop', maxHp: 50, moveSpeed: 1, behavior: 'STOP_AND_ATTACK' }],
    })).toThrow(RangeError);
    expect(() => createBattle({
      ...base,
      defenders: [base.defenders[0]],
    })).toThrow(TypeError);
    expect(() => createBattle({
      ...base,
      enemies: [...base.enemies, { id: 'unrewarded_enemy', maxHp: 10, moveSpeed: 1, behavior: 'IGNORE_DEFENDER' }],
    })).toThrow(TypeError);
  });
});

describe('T-07.2–T-07.3 phase, spawn, movement, pause & breach', () => {
  it('rejects invalid lane or unknown enemy definition without consuming an ID or failing', () => {
    const game = createBattle();
    game.enqueue({ type: 'spawn-enemy', definitionId: 'missing_enemy', lane: 0 }, 1);
    game.enqueue({ type: 'spawn-enemy', definitionId: 'enemy_stop', lane: 5 }, 1);
    game.enqueue({ type: 'spawn-enemy', definitionId: 'enemy_stop', lane: 1.5 }, 1);
    step(game);
    const snap = game.snapshot();
    expect(snap.failure).toBeNull();
    expect(snap.nextEntityId).toBe(0n);
    expect(snap.entities.size).toBe(0);
    expect(snap.combat?.outcome).toMatchObject({ status: 'REJECTED', reason: 'invalid-lane' });
  });

  it('moves enemies right to left in their lane consistently across split frames at fractional tick rates', () => {
    const a = createBattle(combatFixture({ spawnX: 5 }), resourceFixture(), 2.5);
    const b = createBattle(combatFixture({ spawnX: 5 }), resourceFixture(), 2.5);
    for (const game of [a, b]) {
      game.enqueue({ type: 'spawn-enemy', definitionId: 'enemy_fast', lane: 2 }, 1);
    }
    a.advance(400);
    a.advance(1200);
    for (let i = 0; i < 16; i++) b.advance(100);
    expect(a.snapshot()).toEqual(b.snapshot());
    // Tick 1 spawns at x=5 via queue; ticks 2..4 move 3 ticks at speed 2 / 2.5 = 0.8 per tick -> 5 - 2.4 = 2.6.
    const enemy = a.snapshot().entities.get(0n);
    expect(enemy).toMatchObject({ kind: 'enemy', lane: 2 });
    expect(enemy?.kind === 'enemy' && enemy.position).toBeCloseTo(2.6, 10);
  });

  it('computes start-of-tick intents simultaneously so mutual kills happen and newly entering enemies wait a tick', () => {
    const combat = combatFixture({
      spawnX: 2.5,
      defenders: [
        { id: 'def_base', maxHp: 20, damage: 100, attackSpeed: 1, attackRange: 1.5, targeting: 'CLOSEST_TO_BASE' },
        { id: 'def_sniper', maxHp: 50, damage: 10, attackSpeed: 1, attackRange: 9, targeting: 'HIGHEST_HP' },
      ],
      enemies: [
        { id: 'enemy_stop', maxHp: 100, moveSpeed: 1, behavior: 'STOP_AND_ATTACK', damage: 20, attackSpeed: 1, attackRange: 0 },
        { id: 'enemy_fast', maxHp: 60, moveSpeed: 2, behavior: 'STOP_AND_ATTACK', damage: 10, attackSpeed: 1, attackRange: 0 },
        { id: 'enemy_pass', maxHp: 80, moveSpeed: 1, behavior: 'IGNORE_DEFENDER' },
      ],
    });
    const game = createBattle(combat);
    // Tick 1 adds Defender at col 1 (center 1.5, range 1.5 -> reaches 3.0) and Enemy at 2.0 (right edge of col 1).
    game.enqueue({ type: 'summon', definitionId: 'def_base', cell: { row: 0, column: 1 } }, 1);
    game.enqueue({ type: 'add', entity: { kind: 'enemy', definitionId: 'enemy_stop', lane: 0, position: 2.0 } }, 1);
    step(game);
    expect(game.snapshot().entities.size).toBe(2);
    // Tick 2: mutual lethal hit in the same phase -> both removed, reward granted once, cell freed.
    step(game);
    expect(game.snapshot().entities.size).toBe(0);
    expect(game.snapshot().occupancy[1]).toBeNull();
    expect(game.snapshot().resources?.energy).toBe(75); // 50 + 50 - 25 + 50 enemy reward

    // Verify an enemy moving into range on tick t is not hit in tick t's phase.
    const rangeCheck = createBattle(combat);
    rangeCheck.enqueue({ type: 'summon', definitionId: 'def_base', cell: { row: 0, column: 1 } }, 1);
    rangeCheck.enqueue({ type: 'add', entity: { kind: 'enemy', definitionId: 'enemy_fast', lane: 0, position: 4.0 } }, 1);
    step(rangeCheck);
    // Tick 2: enemy starts at 4.0 (distance 2.5 > 1.5), moves to 2.0 (inside range 1.5). Not hit yet.
    step(rangeCheck);
    expect(rangeCheck.snapshot().combat?.entities.get(1n)?.hp).toBe(60);
    // Tick 3: enemy starts inside range -> Defender kills it.
    step(rangeCheck);
    expect(rangeCheck.snapshot().entities.has(1n)).toBe(false);
  });

  it('freezes movement, attacks and cooldowns during Pause and preserves remaining cooldown on Resume', () => {
    const game = createBattle(combatFixture({
      defenders: [
        { id: 'def_base', maxHp: 100, damage: 25, attackSpeed: 0.5, attackRange: 5, targeting: 'CLOSEST_TO_BASE' },
        { id: 'def_sniper', maxHp: 50, damage: 10, attackSpeed: 1, attackRange: 9, targeting: 'HIGHEST_HP' },
      ],
    }));
    game.enqueue({ type: 'summon', definitionId: 'def_base', cell: { row: 0, column: 0 } }, 1);
    game.enqueue({ type: 'add', entity: { kind: 'enemy', definitionId: 'enemy_pass', lane: 0, position: 5 } }, 1);
    step(game);
    step(game); // Tick 2: Defender hits (80 -> 55), nextAttackTick = 4; Enemy moves 5 -> 4.
    const pausedSnap = game.snapshot();
    expect(pausedSnap.combat?.entities.get(1n)?.hp).toBe(55);
    game.setPaused(true);
    expect(step(game, 10)).toBe(0);
    expect(game.snapshot()).toEqual(pausedSnap);
    game.setPaused(false);
    step(game); // Tick 3: Defender still on cooldown, Enemy moves 4 -> 3.
    expect(game.snapshot().combat?.entities.get(1n)?.hp).toBe(55);
    step(game); // Tick 4: Defender fires again (55 -> 30).
    expect(game.snapshot().combat?.entities.get(1n)?.hp).toBe(30);
  });

  it('triggers Defeat on breach, clears Pending, honors G07 terminal priority and prevents breach if killed that tick', () => {
    // 1. Breach triggers defeat and clears Pending Wave Rewards.
    const breachGame = createBattle();
    breachGame.enqueue({ type: 'wave-reward', sourceId: 'fixture_wave' }, 1);
    breachGame.enqueue({ type: 'add', entity: { kind: 'enemy', definitionId: 'enemy_pass', lane: 0, position: 0.5 } }, 1);
    step(breachGame);
    expect(breachGame.snapshot().resources?.pending).toBe(5);
    step(breachGame); // Tick 2: enemy moves 0.5 -> -0.5 (< 0), enqueues defeat and executes it.
    expect(breachGame.snapshot().resources?.terminal).toBe('defeat');
    expect(breachGame.snapshot().combat?.terminal).toBe('defeat');
    expect(breachGame.snapshot().resources?.pending).toBe(0);
    expect(step(breachGame, 5)).toBe(0);

    // 2. Pre-queued Victory at tick 2 beats phase-enqueued breach Defeat at tick 2 (G07).
    const g07Victory = createBattle();
    g07Victory.enqueue({ type: 'add', entity: { kind: 'enemy', definitionId: 'enemy_pass', lane: 0, position: 0.5 } }, 1);
    g07Victory.enqueue({ type: 'terminal', result: 'victory' }, 2);
    step(g07Victory, 2);
    expect(g07Victory.snapshot().resources?.terminal).toBe('victory');
    expect(g07Victory.snapshot().combat?.terminal).toBe('victory');

    // 3. Enemy killed on the same tick it would move < 0 does NOT cause breach.
    const saved = createBattle(combatFixture({
      defenders: [
        { id: 'def_base', maxHp: 100, damage: 100, attackSpeed: 1, attackRange: 1, targeting: 'CLOSEST_TO_BASE' },
        { id: 'def_sniper', maxHp: 50, damage: 10, attackSpeed: 1, attackRange: 9, targeting: 'HIGHEST_HP' },
      ],
    }));
    saved.enqueue({ type: 'summon', definitionId: 'def_base', cell: { row: 0, column: 0 } }, 1);
    saved.enqueue({ type: 'add', entity: { kind: 'enemy', definitionId: 'enemy_pass', lane: 0, position: 0.5 } }, 1);
    step(saved, 2);
    expect(saved.snapshot().entities.size).toBe(1); // Defender still alive, Enemy killed.
    expect(saved.snapshot().combat?.terminal).toBeNull();
  });

  it('rolls back combat positions, HP, cooldowns and resources atomically on phase QUEUE_OVERFLOW', () => {
    const game = createBattle();
    game.enqueue({ type: 'summon', definitionId: 'def_base', cell: { row: 0, column: 0 } }, 1);
    game.enqueue({ type: 'add', entity: { kind: 'enemy', definitionId: 'enemy_pass', lane: 0, position: 0.5 } }, 1);
    step(game);
    const fill = 4096 - game.snapshot().queue.events.length;
    for (let i = 0; i < fill; i++) game.enqueue({ type: 'collect', id: 999n }, 200);
    const before = game.snapshot();
    step(game);
    expect(game.snapshot()).toEqual({
      ...before,
      tick: 2,
      failure: expect.objectContaining({ code: 'QUEUE_OVERFLOW', tick: 2 }),
    });
  });
});

describe('T-07.4–T-07.5 interaction, targeting, cooldowns, overkill & rewards', () => {
  it('handles STOP_AND_ATTACK anti-tunneling, lane isolation, IGNORE_DEFENDER pass-through and item preservation on Defender death', () => {
    const game = createBattle(combatFixture({
      defenders: [
        { id: 'def_base', maxHp: 30, damage: 0, attackSpeed: 1, attackRange: 1, targeting: 'CLOSEST_TO_BASE' },
        { id: 'def_sniper', maxHp: 50, damage: 0, attackSpeed: 1, attackRange: 1, targeting: 'HIGHEST_HP' },
      ],
    }));
    // Spawn a Crystal Item on lane 0 col 2 via an enemy death drop at x=2.5, then summon def_base with only 4 crystals.
    game.enqueue({ type: 'add', entity: { kind: 'defender', definitionId: 'def_base', cell: { row: 0, column: 2 } } }, 1);
    game.enqueue({ type: 'enemy-reward', sourceId: 99n, definitionId: 'enemy_fast', lane: 0, position: 2.5 }, 1);
    game.enqueue({ type: 'add', entity: { kind: 'defender', definitionId: 'def_sniper', cell: { row: 1, column: 2 } } }, 1);
    // Fast STOP_AND_ATTACK enemy on lane 0 starts at 4.5 (moves 2/tick -> clamps at stopX=3.0).
    game.enqueue({ type: 'add', entity: { kind: 'enemy', definitionId: 'enemy_fast', lane: 0, position: 4.5 } }, 1);
    // IGNORE_DEFENDER enemy on lane 1 starts at 4.5 -> passes through col 2 without stopping or attacking.
    game.enqueue({ type: 'add', entity: { kind: 'enemy', definitionId: 'enemy_pass', lane: 1, position: 4.5 } }, 1);
    step(game);
    step(game); // Tick 2: fast enemy clamps at x=3.0; pass enemy moves to 3.5.
    expect(game.snapshot().entities.get(2n)).toMatchObject({ kind: 'enemy', position: 3.0 });
    expect(game.snapshot().entities.get(3n)).toMatchObject({ kind: 'enemy', position: 3.5 });
    // Ticks 3..5: fast enemy (damage 10, hp 30) kills lane 0 defender on tick 5. Lane 1 pass enemy reaches x=0.5 without touching lane 1 defender.
    step(game, 3);
    expect(game.snapshot().occupancy[2]).toBeNull();
    expect(game.snapshot().resources?.items.size).toBe(1); // Item at lane 0 col 2 preserved!
    expect(game.snapshot().combat?.entities.get(1n)?.hp).toBe(50); // Lane 1 Defender untouched.
    // Tick 6: fast enemy resumes moving left from 3.0 -> 1.0!
    step(game);
    expect(game.snapshot().entities.get(2n)).toMatchObject({ kind: 'enemy', position: 1.0 });
  });

  it('implements all 6 targeting strategies with lower-EntityId tie-break and target re-evaluation', () => {
    const strategies: readonly {
      strategy: TargetingStrategy;
      expectedWinnerOffset: number;
    }[] = [
      { strategy: 'CLOSEST_TO_BASE', expectedWinnerOffset: 1 }, // x=2.0
      { strategy: 'CLOSEST_TO_DEFENDER', expectedWinnerOffset: 1 }, // |2.0 - 1.5| = 0.5 vs |3.0 - 1.5| = 1.5
      { strategy: 'HIGHEST_HP', expectedWinnerOffset: 2 }, // enemy_stop hp=100
      { strategy: 'LOWEST_HP', expectedWinnerOffset: 3 }, // enemy_fast hp=60
      { strategy: 'FASTEST', expectedWinnerOffset: 3 }, // enemy_fast speed=2
      { strategy: 'FIRST_VALID', expectedWinnerOffset: 1 }, // lowest ID among in-range enemies
    ];

    for (const { strategy, expectedWinnerOffset } of strategies) {
      const game = createBattle(combatFixture({
        defenders: [
          { id: 'def_base', maxHp: 500, damage: 10, attackSpeed: 1, attackRange: 4, targeting: strategy },
          { id: 'def_sniper', maxHp: 50, damage: 10, attackSpeed: 1, attackRange: 9, targeting: 'HIGHEST_HP' },
        ],
      }));
      game.enqueue({ type: 'summon', definitionId: 'def_base', cell: { row: 0, column: 1 } }, 1); // id 0n
      game.enqueue({ type: 'add', entity: { kind: 'enemy', definitionId: 'enemy_pass', lane: 0, position: 2.0 } }, 1); // id 1n, hp 80, spd 1
      game.enqueue({ type: 'add', entity: { kind: 'enemy', definitionId: 'enemy_stop', lane: 0, position: 3.0 } }, 1); // id 2n, hp 100, spd 1
      game.enqueue({ type: 'add', entity: { kind: 'enemy', definitionId: 'enemy_fast', lane: 0, position: 4.0 } }, 1); // id 3n, hp 60, spd 2
      // Also an out-of-lane enemy & behind-defender enemy that must never be targeted:
      game.enqueue({ type: 'add', entity: { kind: 'enemy', definitionId: 'enemy_fast', lane: 1, position: 1.5 } }, 1); // id 4n
      game.enqueue({ type: 'add', entity: { kind: 'enemy', definitionId: 'enemy_fast', lane: 0, position: 0.8 } }, 1); // id 5n (behind col 1)
      step(game);
      step(game);
      expect(game.snapshot().combat?.entities.get(0n)?.targetId).toBe(BigInt(expectedWinnerOffset));
    }

    // Re-evaluation when tracked IGNORE_DEFENDER moves behind defender & tie-break picks lower ID:
    const reEval = createBattle(combatFixture({
      defenders: [
        { id: 'def_base', maxHp: 500, damage: 10, attackSpeed: 1, attackRange: 3, targeting: 'CLOSEST_TO_BASE' },
        { id: 'def_sniper', maxHp: 50, damage: 10, attackSpeed: 1, attackRange: 9, targeting: 'HIGHEST_HP' },
      ],
    }));
    reEval.enqueue({ type: 'summon', definitionId: 'def_base', cell: { row: 0, column: 2 } }, 1); // id 0n, x >= 2
    reEval.enqueue({ type: 'add', entity: { kind: 'enemy', definitionId: 'enemy_pass', lane: 0, position: 2.5 } }, 1); // id 1n
    reEval.enqueue({ type: 'add', entity: { kind: 'enemy', definitionId: 'enemy_pass', lane: 0, position: 4.5 } }, 1); // id 2n
    reEval.enqueue({ type: 'add', entity: { kind: 'enemy', definitionId: 'enemy_pass', lane: 0, position: 4.5 } }, 1); // id 3n (tie at 4.5)
    step(reEval);
    step(reEval); // Tick 2: targets 1n (2.5); 1n moves to 1.5 (now behind col 2!).
    expect(reEval.snapshot().combat?.entities.get(0n)?.targetId).toBe(1n);
    step(reEval); // Tick 3: 1n is behind col 2, so re-evaluates to 2n (lower ID of tied 2n/3n at 3.5)!
    expect(reEval.snapshot().combat?.entities.get(0n)?.targetId).toBe(2n);
  });

  it('uses drift-free attack cooldowns and grants single reward on simultaneous multi-defender overkill', () => {
    // attackSpeed = 3 attacks/s at 10 ticks/s -> first hit tick 2 (after spawn tick 1), then 6, 9, 12, 16!
    const cadence = createBattle(combatFixture({
      defenders: [
        { id: 'def_base', maxHp: 500, damage: 10, attackSpeed: 3, attackRange: 9, targeting: 'FIRST_VALID' },
        { id: 'def_sniper', maxHp: 50, damage: 10, attackSpeed: 1, attackRange: 9, targeting: 'HIGHEST_HP' },
      ],
      enemies: [
        { id: 'enemy_stop', maxHp: 100, moveSpeed: 0.01, behavior: 'STOP_AND_ATTACK', damage: 0, attackSpeed: 1, attackRange: 0 },
        { id: 'enemy_fast', maxHp: 60, moveSpeed: 2, behavior: 'STOP_AND_ATTACK', damage: 10, attackSpeed: 1, attackRange: 0 },
        { id: 'enemy_pass', maxHp: 80, moveSpeed: 1, behavior: 'IGNORE_DEFENDER' },
      ],
    }), resourceFixture(), 10);
    cadence.enqueue({ type: 'summon', definitionId: 'def_base', cell: { row: 0, column: 0 } }, 1);
    cadence.enqueue({ type: 'add', entity: { kind: 'enemy', definitionId: 'enemy_stop', lane: 0, position: 5 } }, 1);
    step(cadence, 1, 10);
    const hitTicks: number[] = [];
    let prevHp = 100;
    for (let t = 2; t <= 16; t++) {
      step(cadence, 1, 10);
      const hp = cadence.snapshot().combat!.entities.get(1n)!.hp;
      if (hp < prevHp) {
        hitTicks.push(t);
        prevHp = hp;
      }
    }
    expect(hitTicks).toEqual([2, 6, 9, 12, 16]);

    // Multi-defender simultaneous overkill grants reward exactly once at death position.
    const overkill = createBattle(combatFixture({
      defenders: [
        { id: 'def_base', maxHp: 100, damage: 60, attackSpeed: 1, attackRange: 9, targeting: 'FIRST_VALID' },
        { id: 'def_sniper', maxHp: 50, damage: 60, attackSpeed: 1, attackRange: 9, targeting: 'FIRST_VALID' },
      ],
    }));
    overkill.enqueue({ type: 'summon', definitionId: 'def_base', cell: { row: 0, column: 0 } }, 1);
    overkill.enqueue({ type: 'summon', definitionId: 'def_sniper', cell: { row: 0, column: 1 } }, 1);
    overkill.enqueue({ type: 'add', entity: { kind: 'enemy', definitionId: 'enemy_fast', lane: 0, position: 4.25 } }, 1);
    step(overkill, 2);
    const snap = overkill.snapshot();
    expect(snap.entities.has(2n)).toBe(false);
    expect(snap.resources?.energy).toBe(175); // 50 - 25 + 150 enemy_fast reward (once!)
    const drops = [...snap.resources!.items.values()].filter(item => item.kind === 'crystal');
    expect(drops).toHaveLength(1);
    expect(drops[0]).toMatchObject({ source: 2n, position: { kind: 'lane', lane: 0, position: 2.25 } });
  });
});

describe('T-07.6 deterministic replay', () => {
  it('replays identical config, seed and inputs identically', () => {
    function runScenario() {
      const game = createBattle();
      game.enqueue({ type: 'summon', definitionId: 'def_base', cell: { row: 0, column: 1 } }, 1);
      game.enqueue({ type: 'spawn-enemy', definitionId: 'enemy_stop', lane: 0 }, 1);
      game.enqueue({ type: 'spawn-enemy', definitionId: 'enemy_fast', lane: 2 }, 2);
      step(game, 10);
      return game.snapshot();
    }
    expect(runScenario()).toEqual(runScenario());
  });
});
