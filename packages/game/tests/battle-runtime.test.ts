import { describe, expect, it } from 'vitest';
import { cellIndex } from '../src/battlefield/grid';
import type { BattleCommand } from '../src/core/battle-state';
import { BattleRuntime } from '../src/systems/battle-runtime';

const runtime = () => new BattleRuntime({ ticksPerSecond: 10, maxCatchUpTicks: 3 });
const defender = (row = 0, column = 0): BattleCommand => ({
  type: 'add', entity: { kind: 'defender', definitionId: 'fixture_defender', cell: { row, column } },
});
const enemy = (position = 0.5, lane = 0): BattleCommand => ({
  type: 'add', entity: { kind: 'enemy', definitionId: 'fixture_enemy', lane, position },
});

describe('T-05 headless battlefield', () => {
  it('maps every one of the 50 cells and rejects invalid coordinates', () => {
    const valid = Array.from({ length: 50 }, (_, i) => cellIndex({ row: Math.floor(i / 10), column: i % 10 }));
    expect(valid).toEqual(Array.from({ length: 50 }, (_, i) => i));
    expect(runtime().snapshot().occupancy).toEqual(Array(50).fill(null));
    for (const [row, column] of [[-1, 0], [5, 0], [0, -1], [0, 10], [0.5, 0], [0, NaN], [0, Infinity]]) {
      expect(() => cellIndex({ row, column })).toThrow(RangeError);
    }
  });

  it('uses separate runtime IDs across both entity kinds and keeps Enemy positions off the grid', () => {
    const battle = runtime();
    battle.enqueue(defender(), 1);
    battle.enqueue(enemy(), 1);
    battle.enqueue(enemy(), 1);
    battle.advance(100);
    const snapshot = battle.snapshot();
    const [first, second, third] = [...snapshot.entities.values()];
    expect(new Set([first.id, second.id, third.id]).size).toBe(3);
    expect(second).toMatchObject({ kind: 'enemy', lane: 0, position: 0.5, definitionId: 'fixture_enemy' });
    expect(third.definitionId).toBe(second.definitionId);
    expect(snapshot.occupancy.filter(id => id !== null)).toEqual([first.id]);
  });

  it('removes both kinds and frees a Defender cell for reuse without reusing an ID', () => {
    const battle = runtime();
    battle.enqueue(defender(4, 9), 1);
    battle.enqueue(enemy(), 1);
    battle.advance(100);
    const [defenderId, enemyId] = [...battle.snapshot().entities.keys()];
    battle.enqueue({ type: 'remove', id: defenderId }, 2);
    battle.enqueue({ type: 'remove', id: enemyId }, 2);
    battle.advance(100);
    expect(battle.snapshot().entities.size).toBe(0);
    expect(battle.snapshot().occupancy.every(id => id === null)).toBe(true);
    battle.enqueue(defender(4, 9), 3);
    battle.advance(100);
    const snapshot = battle.snapshot();
    expect(snapshot.entities.size).toBe(1);
    expect(snapshot.occupancy[49]).not.toBe(defenderId);
    expect(snapshot.entities.get(snapshot.occupancy[49]!)).toMatchObject({ kind: 'defender', cell: { row: 4, column: 9 } });
  });

  it.each([
    ['occupied cell', defender()],
    ['invalid cell', defender(0, 10)],
    ['invalid lane', enemy(0.5, 5)],
    ['invalid position', enemy(Infinity)],
    ['unknown removal', { type: 'remove', id: 999n } as const],
  ] as const)('rolls back %s and stops before later commands or ticks', (_, command) => {
    const battle = runtime();
    battle.enqueue(defender(), 1);
    battle.advance(100);
    battle.enqueue(command, 2);
    battle.enqueue(enemy(), 2);
    const before = battle.snapshot();
    expect(battle.advance(300)).toBe(1);
    expect(battle.snapshot()).toEqual({
      ...before, tick: 2, failure: {
        code: 'CONTRACT_ERROR', tick: 2, eventId: before.queue.events[0].id,
        causalDepth: 0, queueSize: 2, checkpointId: null, recoveryAttempt: null,
      },
    });
    battle.setPaused(false);
    expect(battle.advance(100)).toBe(0);
    expect(battle.enqueue(enemy(), 3).status).toBe('FAILED');
  });

  it('freezes pending commands and ignores elapsed time while paused', () => {
    const battle = runtime();
    battle.enqueue(defender(), 1);
    battle.advance(50);
    battle.setPaused(true);
    const before = battle.snapshot();
    expect(battle.advance(1000)).toBe(0);
    expect(battle.snapshot()).toEqual(before);
    battle.setPaused(false);
    expect(battle.advance(49)).toBe(0);
    expect(battle.advance(1)).toBe(1);
    expect(battle.snapshot().entities.size).toBe(1);
  });

  it('preserves global tick and sequence order across the 250-event budget', () => {
    const battle = runtime();
    battle.enqueue(enemy(999), 2);
    for (let i = 0; i < 251; i++) battle.enqueue(enemy(i + 0.5), 1);
    const deferred = battle.snapshot().queue.events[250];
    battle.advance(100);
    expect(battle.snapshot().entities.size).toBe(250);
    expect(battle.snapshot().queue.events[0]).toEqual(deferred);
    battle.advance(100);
    expect([...battle.snapshot().entities.values()].map(entity => entity.kind === 'enemy' && entity.position))
      .toEqual([...Array.from({ length: 251 }, (_, i) => i + 0.5), 999]);
  });

  it('isolates nested entity data, occupancy, registry and queued commands in snapshots', () => {
    const battle = runtime();
    battle.enqueue(defender(), 1);
    battle.enqueue(enemy(), 2);
    battle.advance(100);
    const before = battle.snapshot();
    const detached = battle.snapshot();
    const entity = detached.entities.values().next().value;
    if (entity?.kind !== 'defender') throw new Error('Expected Defender fixture');
    Object.assign(entity.cell, { row: 4 });
    Object.assign(detached.occupancy, { 0: null });
    Map.prototype.clear.call(detached.entities);
    detached.queue.events.length = 0;
    expect(battle.snapshot()).toEqual(before);
  });

  it('replays identical inputs to equal snapshots across ticks, including IDs and queued events', () => {
    const battles = [runtime(), runtime()];
    const histories = battles.map(battle => {
      battle.enqueue(enemy(), 2);
      battle.enqueue(defender(), 1);
      battle.enqueue(enemy(7.5), 4);
      battle.advance(100);
      const first = battle.snapshot();
      const [id] = first.entities.keys();
      battle.enqueue({ type: 'remove', id }, 2);
      battle.advance(100);
      return [first, battle.snapshot()];
    });
    expect(histories[0]).toEqual(histories[1]);
  });
});
