import { describe, expect, it } from 'vitest';
import { claimPending, createResourceState } from '../src/core/battle-resources';
import { uniformIndex } from '../src/core/resource-rng';
import type { ResourceSessionInput } from '../src/core/resource-session';
import { BattleRuntime } from '../src/systems/battle-runtime';

// Test-only inputs. No fixture value is a production default.
function fixture(): ResourceSessionInput {
  return {
    seed: 0,
    defenders: [
      { id: 'base', classification: 'base', summonEnergyCost: 30, unlocked: true },
      { id: 'locked', classification: 'base', summonEnergyCost: 0, unlocked: false },
      { id: 'fusion', classification: 'fusion', summonEnergyCost: 0, unlocked: true },
      { id: 'free_fixture', classification: 'base', summonEnergyCost: 0, unlocked: true },
    ],
    enemies: [{ id: 'fixture_enemy', energy: 20, crystals: 6 },
      { id: 'overflow_fixture', energy: Number.MAX_SAFE_INTEGER, crystals: 0 }],
    waves: [{ id: 'fixture_wave', crystals: 12 }],
    energyItems: {
      amount: 9, intervalSeconds: 1,
      region: { min: { x: 0, y: 0 }, max: { x: 1, y: 1 } },
      positions: [{ x: 0.04, y: 0.05 }],
    },
  };
}

const battle = (input = fixture(), ticksPerSecond = 1) => new BattleRuntime({ ticksPerSecond, maxCatchUpTicks: 250 }, input);
const resources = (game: BattleRuntime) => game.snapshot().resources!;
const step = (game: BattleRuntime, ticks = 1) => game.advance(ticks * 1000);
const summon = (game: BattleRuntime, tick: number, definitionId = 'base', row = 0, column = 0) =>
  game.enqueue({ type: 'summon', definitionId, cell: { row, column } }, tick);
const reward = (game: BattleRuntime, tick: number, sourceId = 8n) =>
  game.enqueue({ type: 'enemy-reward', sourceId, definitionId: 'fixture_enemy', lane: 0, position: 0.25 }, tick);

describe('T-06.1 session and resources', () => {
  it('credits exactly 50 at tick zero and detaches validated session inputs', () => {
    const input = fixture();
    const game = battle(input);
    expect(createResourceState()).toMatchObject({ energy: 0, crystals: 0, pending: 0 });
    expect(game.snapshot().tick).toBe(0);
    expect(resources(game)).toMatchObject({ energy: 50, crystals: 0, pending: 0 });
    game.advance(0);
    Object.assign(input.defenders[0], { summonEnergyCost: 0, unlocked: false });
    summon(game, 1);
    step(game);
    expect(resources(game).energy).toBe(20);
  });

  it('fails closed for missing costs/config, duplicate IDs, invalid seed and invalid position', () => {
    const input = fixture();
    const broken = (patch: Partial<ResourceSessionInput>) => battle({ ...input, ...patch });
    expect(() => broken({ energyItems: undefined })).toThrow();
    expect(() => broken({ defenders: [{ ...input.defenders[0], summonEnergyCost: undefined! }] })).toThrow();
    expect(() => broken({ defenders: [input.defenders[0], input.defenders[0]] })).toThrow();
    expect(() => broken({ seed: 0x100000000 })).toThrow();
    expect(() => broken({ energyItems: { ...input.energyItems, positions: [{ x: 1.1, y: 0 }] } })).toThrow();
    expect(() => battle(input, 0.01)).toThrow('No eligible Crystal interval');
  });
});

describe('T-06.2 summon', () => {
  it('spends exactly once and rejects invalid, unavailable, occupied and unaffordable commands', () => {
    const game = battle();
    const attempts = [
      ['locked', 0, 0, 'defender-unavailable'],
      ['fusion', 0, 0, 'defender-unavailable'],
      ['missing', 0, 0, 'defender-unavailable'],
      ['base', 0.5, 0, 'invalid-cell'],
      ['base', 0, 9, 'invalid-cell'],
      ['base', -1, 0, 'invalid-cell'],
    ] as const;
    summon(game, 1);
    summon(game, 1, 'base', 0, 0);
    summon(game, 1, 'base', 4, 8);
    step(game);
    const snapshot = game.snapshot();
    expect(snapshot.failure).toBeNull();
    expect(snapshot.resources).toMatchObject({ energy: 20, outcome: { status: 'REJECTED', reason: 'insufficient-energy' } });
    expect(snapshot.entities.size).toBe(1);
    expect(snapshot.nextEntityId).toBe(1n);
    expect(snapshot.occupancy[0]).toBe(0n);
    expect(snapshot.occupancy[44]).toBeNull();
    for (const [id, row, column, reason] of [...attempts, ['base', 0, 0, 'occupied-cell']] as const) {
      const rejected = battle();
      summon(rejected, 1);
      summon(rejected, 1, id, row, column);
      step(rejected);
      expect(resources(rejected).outcome).toMatchObject({ status: 'REJECTED', reason });
      expect(rejected.snapshot().failure).toBeNull();
      expect(rejected.snapshot().nextEntityId).toBe(1n);
      expect(resources(rejected).energy).toBe(20);
    }
  });
});

describe('T-06.3 game time', () => {
  it('uses absolute passive phase at a fractional rate across different frame splits', () => {
    const a = battle(fixture(), 2.5);
    const b = battle(fixture(), 2.5);
    a.advance(2800);
    expect(resources(a).energy).toBe(50);
    a.advance(400);
    expect(resources(a).energy).toBe(100); // tick 8 is the first at/after 3s
    a.advance(2800);
    expect(resources(a).energy).toBe(150); // tick 15, not 16
    for (let i = 0; i < 60; i++) b.advance(100);
    expect(a.snapshot()).toEqual(b.snapshot());
  });

  it('keeps lifetime and blocks collect and claim while paused', () => {
    const game = battle();
    step(game);
    const before = game.snapshot();
    game.setPaused(true);
    expect(game.enqueue({ type: 'collect', id: 0n }, 2)).toMatchObject({ status: 'REJECTED', reason: 'paused' });
    expect(game.enqueue({ type: 'claim', requestId: 'claim_1' }, 2)).toMatchObject({ status: 'REJECTED', reason: 'paused' });
    expect(step(game, 100)).toBe(0);
    expect(game.snapshot()).toEqual(before);
    game.setPaused(false);
    step(game);
    expect(resources(game).items.get(0n)?.expiresAt).toBe(11);
  });
});

describe('T-06.4 collectible lifecycle', () => {
  it('credits a clicked Crystal Item once and leaves overlapping items available', () => {
    const game = battle();
    reward(game, 1);
    step(game);
    const [target, overlapping] = [...resources(game).items.values()].filter(item => item.kind === 'crystal');
    game.enqueue({ type: 'collect', id: target.id }, 2);
    game.enqueue({ type: 'collect', id: target.id }, 2);
    step(game);
    expect(resources(game)).toMatchObject({ crystals: 1, outcome: { reason: 'item-unavailable' } });
    expect(resources(game).items.has(target.id)).toBe(false);
    expect(resources(game).items.get(overlapping.id)).toEqual(overlapping);
  });

  it.each([true, false])('orders same-tick Collect and Expire (collect queued first: %s)', early => {
    const game = battle();
    const collect = { type: 'collect', id: 0n } as const;
    if (early) game.enqueue(collect, 11);
    step(game);
    expect(resources(game).items.get(0n)).toMatchObject({
      kind: 'energy', amount: 9, position: { kind: 'normalized', point: { x: 0.04, y: 0.05 } }, expiresAt: 11,
    });
    if (!early) game.enqueue(collect, 11);
    game.enqueue(collect, 11);
    step(game, 10);
    expect(resources(game).energy).toBe(200 + (early ? 9 : 0));
    expect(resources(game).items.has(0n)).toBe(false);
    expect(resources(game).outcome).toMatchObject({ reason: 'item-unavailable' });
  });

  it.each([true, false])('keeps an item alive until its deferred Expire or prior Collect executes (prior Collect: %s)', early => {
    const game = battle();
    for (let i = 0; i < 250; i++) game.enqueue({ type: 'collect', id: 900n }, 11);
    if (early) game.enqueue({ type: 'collect', id: 0n }, 11);
    step(game, 11);
    expect(resources(game).items.has(0n)).toBe(true);
    expect(game.snapshot().queue.events[0]).toMatchObject({
      scheduledTick: 11, payload: { type: early ? 'collect' : 'expire', id: 0n },
    });
    if (!early) game.enqueue({ type: 'collect', id: 0n }, 11);
    step(game);
    expect(resources(game).items.has(0n)).toBe(false);
    expect(resources(game).energy).toBe(250 + (early ? 9 : 0));
  });

  it('auto-collects the oldest Crystal items only and preserves the remainder on removal', () => {
    const game = battle();
    reward(game, 1);
    step(game);
    const before = resources(game);
    expect([...before.items.values()].filter(item => item.kind === 'crystal')).toHaveLength(6);
    summon(game, 2);
    step(game);
    expect(resources(game).crystals).toBe(5);
    expect(resources(game).items.get(0n)?.kind).toBe('energy');
    const remaining = [...resources(game).items.values()].filter(item => item.kind === 'crystal');
    expect(remaining.map(item => item.id)).toEqual([6n]);
    const [remainingCrystal] = remaining;
    game.enqueue({ type: 'collect', id: remainingCrystal.id }, 3);
    game.enqueue({ type: 'remove', id: 0n }, 3);
    step(game);
    expect(resources(game).items.get(remainingCrystal.id)).toEqual(remainingCrystal);
    expect(game.snapshot().occupancy[0]).toBeNull();
  });
});

describe('T-06.5 random and reward hooks', () => {
  it('makes a previously queued renewal obsolete when terminal sorts ahead of it', () => {
    const game = battle();
    game.enqueue({ type: 'terminal', result: 'defeat' }, 6);
    step(game, 5);
    const before = resources(game);
    expect(before.energy).toBe(100);
    step(game, 4);
    expect(game.snapshot().tick).toBe(6);
    expect(resources(game)).toMatchObject({
      terminal: 'defeat', energy: before.energy, nextItemId: before.nextItemId,
    });
    expect(step(game)).toBe(0);
  });

  it('uses the Mulberry32 seed-zero vector', () => {
    const rng = { seed: 0 };
    expect(uniformIndex(rng, 0x100000000)).toBe(1144304738);
    expect(rng.seed).toBe(0x6d2b79f5);
  });

  it.each([true, false])('selects independent interval ticks and draws a cell only when eligible (full: %s)', full => {
    const input = fixture();
    const game = battle({ ...input, energyItems: { ...input.energyItems, intervalSeconds: 1000 } });
    const first = game.snapshot().queue.events.find(e => e.payload.type === 'crystal-attempt')!.scheduledTick;
    expect(first).toBeGreaterThanOrEqual(30);
    expect(first).toBeLessThanOrEqual(60);
    const cells = full ? 45 : 44;
    for (let i = 0; i < cells; i++) summon(game, 1, 'free_fixture', Math.floor(i / 9), i % 9);
    step(game, first - 1);
    const seed = game.snapshot().rng!.seed;
    const rng = { seed };
    if (!full) uniformIndex(rng, 1);
    const next = 30 + uniformIndex(rng, 31);
    step(game);
    expect(game.snapshot().rng?.seed).toBe(rng.seed);
    expect(game.snapshot().queue.events.find(e => e.payload.type === 'crystal-attempt')?.scheduledTick).toBe(first + next);
    expect([...resources(game).items.values()]).toEqual(full ? [] : [
      { id: 0n, kind: 'crystal', amount: 1, source: 'crystal-timer',
        position: { kind: 'cell', cell: { row: 4, column: 8 } }, expiresAt: first + 10 },
    ]);
  });

  it('grants enemy and Wave rewards once, honors full storage and clears Pending at terminal', () => {
    const game = battle();
    const wave = { type: 'wave-reward', sourceId: 'fixture_wave' } as const;
    game.enqueue(wave, 1);
    game.enqueue(wave, 1);
    reward(game, 1);
    reward(game, 1);
    step(game);
    expect(resources(game)).toMatchObject({ energy: 70, crystals: 5, pending: 7 });
    expect(resources(game).rewardedEnemies.size).toBe(1);
    expect(resources(game).rewardedWaves.size).toBe(1);
    const drops = [...resources(game).items.values()].filter(item => item.kind === 'crystal');
    expect(drops).toHaveLength(6);
    for (const item of drops) expect(item).toMatchObject({
      amount: 1, source: 8n, position: { kind: 'lane', lane: 0, position: 0.25 }, expiresAt: 11,
    });
    game.enqueue({ type: 'collect', id: drops[0].id }, 2);
    game.enqueue({ type: 'claim', requestId: 'claim_when_full' }, 2);
    step(game);
    expect(resources(game).items.get(drops[0].id)).toEqual(drops[0]);
    expect(resources(game).pending).toBe(7);
    game.enqueue({ type: 'terminal', result: 'victory' }, 3);
    game.enqueue({ type: 'terminal', result: 'defeat' }, 3);
    reward(game, 3, 9n);
    expect(step(game, 30)).toBe(1);
    expect(resources(game)).toMatchObject({ terminal: 'victory', pending: 0, energy: 120 });
    expect(step(game, 30)).toBe(0);
  });

  it('rejects empty BattleRuntime claim commands without burning the request', () => {
    const game = battle();
    game.enqueue({ type: 'claim', requestId: 'empty_claim' }, 1);
    step(game);
    expect(resources(game)).toMatchObject({
      crystals: 0, pending: 0, outcome: { status: 'REJECTED', reason: 'nothing-to-claim' },
    });
    expect(resources(game).processedClaims.has('empty_claim')).toBe(false);
  });

  it('claims partially and rejects repeating a successful claim even after storage frees', () => {
    const state = createResourceState();
    Object.assign(state, { crystals: 3, pending: 7 });
    expect(claimPending(state, 'claim_1')).toBeUndefined();
    expect(state).toMatchObject({ crystals: 5, pending: 5 });
    state.crystals = 4; // fixture modeling a future consumer
    expect(claimPending(state, 'claim_1')).toBe('duplicate-claim');
    expect(state).toMatchObject({ crystals: 4, pending: 5 });
    expect(claimPending(state, 'claim_2')).toBeUndefined();
    expect(state).toMatchObject({ crystals: 5, pending: 4 });
  });

  it('rolls back RNG, Item ID and item creation if timer renewal saturates the queue', () => {
    const game = battle();
    for (let i = 0; i < 4093; i++) game.enqueue({ type: 'collect', id: 900n }, 200);
    const before = game.snapshot();
    step(game);
    expect(game.snapshot()).toEqual({ ...before, tick: 1, failure: expect.objectContaining({ code: 'QUEUE_OVERFLOW' }) });
  });

  it('rolls back unsafe Energy arithmetic and does not mark its source processed', () => {
    const input = fixture();
    const game = battle({ ...input, energyItems: { ...input.energyItems, intervalSeconds: 100 } });
    game.enqueue({ type: 'enemy-reward', sourceId: 7n, definitionId: 'overflow_fixture', lane: 0, position: 0.25 }, 1);
    const before = game.snapshot();
    step(game);
    expect(game.snapshot()).toEqual({ ...before, tick: 1, failure: expect.objectContaining({ code: 'CONTRACT_ERROR' }) });
  });

  it('replays the same configuration and input and detaches resources, queue and RNG', () => {
    function replay() {
      const game = battle();
      reward(game, 1);
      summon(game, 2);
      game.enqueue({ type: 'collect', id: 0n }, 3);
      step(game, 65);
      const snapshot = game.snapshot();
      const detached = game.snapshot();
      detached.resources!.items.clear();
      detached.resources!.rewardedEnemies.clear();
      detached.resources!.energy = 0;
      detached.queue.events.length = 0;
      detached.rng!.seed = 123;
      expect(game.snapshot()).toEqual(snapshot);
      return snapshot;
    }
    expect(replay()).toEqual(replay());
  });

  it('supports deterministic percentage-based Enemy crystalDropChance (0, 1, fractional, and bounds validation)', () => {
    const base = fixture();
    expect(() =>
      battle({
        ...base,
        enemies: [{ id: 'bad_neg', energy: 10, crystals: 1, crystalDropChance: -0.01 }],
      }),
    ).toThrow(RangeError);
    expect(() =>
      battle({
        ...base,
        enemies: [{ id: 'bad_over', energy: 10, crystals: 1, crystalDropChance: 1.01 }],
      }),
    ).toThrow(RangeError);
    expect(() =>
      battle({
        ...base,
        enemies: [{ id: 'bad_nan', energy: 10, crystals: 1, crystalDropChance: Number.NaN }],
      }),
    ).toThrow(RangeError);

    const chanceInput: ResourceSessionInput = {
      ...base,
      seed: 42,
      enemies: [
        { id: 'zero_drop', energy: 25, crystals: 1, crystalDropChance: 0 },
        { id: 'always_drop', energy: 30, crystals: 1, crystalDropChance: 1 },
        { id: 'half_drop', energy: 40, crystals: 1, crystalDropChance: 0.5 },
      ],
    };

    // 0% drop chance grants Energy without creating Crystal items; 100% always spawns.
    const gEdge = battle(chanceInput);
    gEdge.enqueue({ type: 'enemy-reward', sourceId: 1n, definitionId: 'zero_drop', lane: 0, position: 2 }, 1);
    gEdge.enqueue({ type: 'enemy-reward', sourceId: 2n, definitionId: 'always_drop', lane: 0, position: 3 }, 1);
    step(gEdge, 1);
    expect(resources(gEdge).energy).toBe(50 + 25 + 30);
    const edgeCrystals = [...resources(gEdge).items.values()].filter(i => i.kind === 'crystal');
    expect(edgeCrystals).toHaveLength(1);
    expect(edgeCrystals[0]?.source).toBe(2n);

    // 50% drop chance is deterministic across identically seeded runs
    const runHalfSeries = () => {
      const g = battle(chanceInput);
      const droppedIds: bigint[] = [];
      for (let i = 1n; i <= 20n; i++) {
        g.enqueue({ type: 'enemy-reward', sourceId: i, definitionId: 'half_drop', lane: 0, position: 2 }, 1);
      }
      step(g, 1);
      for (const item of resources(g).items.values()) {
        if (item.kind === 'crystal' && typeof item.source === 'bigint') {
          droppedIds.push(item.source);
        }
      }
      return droppedIds;
    };
    const runA = runHalfSeries();
    const runB = runHalfSeries();
    expect(runA).toEqual(runB);
    expect(runA.length).toBeGreaterThan(0);
    expect(runA.length).toBeLessThan(20);
  });

  it('supports Villager/Master Trader Emerald production, disabled passive income, and interactive Village Supply Chest', () => {
    const econInput: ResourceSessionInput = {
      seed: 123,
      initialEnergy: 100,
      enablePassiveEnergy: false,
      villageChest: { enabled: true, amount: 25, intervalSeconds: 10 },
      defenders: [
        {
          id: 'villager',
          classification: 'base',
          summonEnergyCost: 50,
          unlocked: true,
          economyProduction: { itemCount: 1, amountPerItem: 25, initialDelaySeconds: 4, intervalSeconds: 8 },
        },
        {
          id: 'master_trader',
          classification: 'fusion',
          summonEnergyCost: 0,
          unlocked: true,
          economyProduction: { itemCount: 2, amountPerItem: 25, initialDelaySeconds: 4, intervalSeconds: 8 },
        },
      ],
      enemies: [{ id: 'zombie', energy: 0, crystals: 0 }],
      waves: [],
      energyItems: {
        amount: 25,
        intervalSeconds: 6,
        region: { min: { x: 0.1, y: 0.15 }, max: { x: 0.9, y: 0.85 } },
        positions: [{ x: 0.5, y: 0.5 }],
      },
      enableRandomEnergyItems: false,
      enableRandomCrystalItems: false,
    };

    const g = battle(econInput);
    expect(resources(g).energy).toBe(100);
    expect(resources(g).villageChestReady).toBe(false);

    // No passive +50/3s, and chest rejects before 10s
    g.enqueue({ type: 'claim-village-chest' }, 1);
    step(g, 30); // 3s
    expect(resources(g).energy).toBe(100);
    expect(resources(g).outcome).toMatchObject({ status: 'REJECTED', reason: 'chest-not-ready' });

    // Summon Villager at tick 31 -> 1st drop at 31 + 40 = tick 71
    g.enqueue({ type: 'summon', definitionId: 'villager', cell: { row: 0, column: 0 } }, 31);
    step(g, 41); // advance to tick 71 (total 71 ticks = 7.1s)
    expect(resources(g).energy).toBe(50);
    const villagerItems = [...resources(g).items.values()].filter(i => i.kind === 'energy');
    expect(villagerItems).toHaveLength(1);
    expect(villagerItems[0]).toMatchObject({ amount: 25 });

    // Advance past t=10s (tick 100): Village Supply Chest becomes ready and does not stack past 1
    step(g, 50); // tick 121
    expect(resources(g).villageChestReady).toBe(true);
    g.enqueue({ type: 'claim-village-chest' }, 122);
    step(g, 1);
    expect(resources(g).outcome).toMatchObject({ status: 'APPLIED' });
    expect(resources(g).energy).toBe(75);
    expect(resources(g).villageChestReady).toBe(false);

    // Restocks again 10s later (tick 122 + 100 = 222)
    step(g, 100);
    expect(resources(g).villageChestReady).toBe(true);
  });
});
