import { describe, expect, it } from 'vitest';
import { SimulationClock } from '../src/core/simulation-clock';
import { TransactionEngine, type SimulationSnapshot } from '../src/core/transaction';
import { EventQueue } from '../src/events/event-queue';
import { EventScheduler } from '../src/events/event-scheduler';

type State = { seen: number[] };
type Payload = { value: number; children?: number };
type Rng = { cursor: number };

function initial(): SimulationSnapshot<State, Payload, Rng> {
  return { state: { seen: [] }, queue: new EventQueue<Payload>().snapshot(), rng: { cursor: 0 } };
}

function engine() {
  return new TransactionEngine(initial(), ({ state, rng, event, enqueue }) => {
    state.seen.push(event.payload.value);
    rng.cursor++;
    if (event.payload.children) enqueue({ scheduledTick: event.scheduledTick,
      causalDepth: event.causalDepth + 1,
      payload: { value: event.payload.value + 1, children: event.payload.children - 1 } });
  });
}

describe('T-04 deterministic foundation', () => {
  it.each([
    { childTick: 0, existingTick: 2, order: [1, 3, 2] },
    { childTick: 1, existingTick: 2, order: [1, 3, 2] },
    { childTick: 1, existingTick: 1, order: [1, 2, 3] },
    { childTick: 3, existingTick: 2, order: [1, 2, 3] },
  ])('orders a generated tick-$childTick event against an existing tick-$existingTick event', ({ childTick, existingTick, order }) => {
    const runtime = new TransactionEngine(initial(), ({ state, event, enqueue }) => {
      state.seen.push(event.payload.value);
      if (event.payload.value === 1) enqueue({ scheduledTick: childTick, causalDepth: 1, payload: { value: 3 } });
    });
    runtime.enqueue({ scheduledTick: 1, causalDepth: 0, payload: { value: 1 } }, 0);
    runtime.enqueue({ scheduledTick: existingTick, causalDepth: 0, payload: { value: 2 } }, 0);
    new EventScheduler(runtime).runTick(3);
    expect(runtime.snapshot().state.seen).toEqual(order);
  });

  it('discards excess whole ticks during sustained lag', () => {
    const clock = new SimulationClock({ ticksPerSecond: 10, maxCatchUpTicks: 2 });
    for (let i = 0; i < 5; i++) expect(clock.advance(1000, () => {})).toBe(2);
    for (const elapsed of [0, 1, 0]) expect(clock.advance(elapsed, () => {})).toBe(0);
    expect(clock.tick).toBe(10);
  });

  it('keeps advancing after the largest finite elapsed time', () => {
    const clock = new SimulationClock({ ticksPerSecond: 10, maxCatchUpTicks: 2 });
    expect(clock.advance(Number.MAX_VALUE, () => {})).toBe(2);
    expect(clock.advance(0, () => {})).toBe(0);
    expect(clock.advance(100, () => {})).toBe(1);
  });

  it('validates invalid clock, scheduler and transaction inputs', () => {
    const clock = new SimulationClock({ ticksPerSecond: 10, maxCatchUpTicks: 2 });
    expect(() => clock.advance(NaN, () => {})).toThrow(RangeError);
    const runtime = engine();
    const before = runtime.snapshot();
    expect(() => new EventScheduler(runtime).runTick(-1)).toThrow(RangeError);
    expect(runtime.execute(0, 251)).toMatchObject({ status: 'FAILED', diagnostic: { code: 'CONTRACT_ERROR' } });
    expect(runtime.snapshot()).toEqual(before);
  });

  it('replays seed, future events, deferral and rollback across ticks', () => {
    function replay() {
      const runtime = new TransactionEngine({ ...initial(), rng: { cursor: 7 } }, ({ state, rng, event, enqueue }) => {
        rng.cursor = (rng.cursor * 17 + 13) % 257; // test-only generator
        state.seen.push(event.payload.value, rng.cursor);
        if (event.payload.value === 1) {
          enqueue({ scheduledTick: 1, causalDepth: 1, payload: { value: 2 } });
          enqueue({ scheduledTick: 3, causalDepth: 1, payload: { value: 3 } });
        }
        if (event.payload.value === 3) throw new Error('rollback fixture');
      });
      runtime.enqueue({ scheduledTick: 1, causalDepth: 0, payload: { value: 1 } }, 0);
      const before = runtime.snapshot();
      expect(runtime.execute(1, 0).status).toBe('DEFERRED');
      expect(runtime.snapshot()).toEqual(before);
      const scheduler = new EventScheduler(runtime);
      expect(scheduler.runTick(1)).toEqual([
        { status: 'APPLIED', executed: 1 }, { status: 'APPLIED', executed: 1 },
      ]);
      const committed = runtime.snapshot();
      expect(committed.state.seen).toEqual([1, 132, 2, 201]);
      expect(scheduler.runTick(2)).toEqual([]);
      expect(scheduler.runTick(3).map(result => result.status)).toEqual(['FAILED']);
      expect(runtime.snapshot()).toEqual(committed);
      expect(scheduler.runTick(4).map(result => result.status)).toEqual(['FAILED']);
      return committed;
    }
    expect(replay()).toEqual(replay());
  });
  it.each(['depth', 'identity', 'sequence', 'counter'] as const)('rejects malformed snapshot %s atomically', field => {
    const queue = new EventQueue<number>();
    queue.enqueue({ scheduledTick: 1, causalDepth: 32, payload: 1 }, 0);
    const before = queue.snapshot();
    const forged = queue.snapshot();
    if (field === 'depth') forged.events[0].causalDepth = 33;
    if (field === 'identity') forged.events[0].id = 'event_1';
    if (field === 'sequence') forged.events[0].insertionSequence = forged.nextSequence;
    if (field === 'counter') forged.nextId = -1;
    expect(() => queue.restore(forged)).toThrow();
    expect(queue.snapshot()).toEqual(before);
    expect(queue.enqueue({ scheduledTick: 1, causalDepth: 0, payload: 2 }, 0))
      .toMatchObject({ id: 'event_1', insertionSequence: 1 });
  });

  it('isolates committed data from retained handler references', () => {
    let mutate = () => {};
    const runtime = new TransactionEngine(initial(), ({ state, rng, enqueue }) => {
      state.seen.push(1);
      mutate = () => {
        state.seen.push(2);
        rng.cursor++;
        enqueue({ scheduledTick: 2, causalDepth: 0, payload: { value: 2 } });
      };
    });
    runtime.enqueue({ scheduledTick: 1, causalDepth: 0, payload: { value: 1 } }, 0);
    runtime.execute(1, 250);
    const committed = runtime.snapshot();
    expect(mutate).toThrow();
    expect(runtime.snapshot()).toEqual(committed);
  });

  it('does not reopen the budget when the scheduler is called twice for one tick', () => {
    const runtime = engine();
    const scheduler = new EventScheduler(runtime);
    for (let i = 0; i < 251; i++) runtime.enqueue({
      scheduledTick: 1, causalDepth: 0, payload: { value: i },
    }, 0);
    scheduler.runTick(1);
    expect(scheduler.runTick(1)).toEqual([]);
    expect(runtime.snapshot().state.seen).toHaveLength(250);
  });

  it('stops advancing immediately when paused from a tick callback', () => {
    const clock = new SimulationClock({ ticksPerSecond: 10, maxCatchUpTicks: 3 });
    expect(clock.advance(300, () => clock.setPaused(true))).toBe(1);
    expect(clock.tick).toBe(1);
    expect(clock.advance(1000, () => {})).toBe(0);
    clock.setPaused(false);
    expect(clock.advance(0, () => {})).toBe(0);
  });

  it.each(['CONTRACT_ERROR', 'CAUSAL_DEPTH', 'QUEUE_OVERFLOW'] as const)('rolls back %s with complete diagnostics', code => {
    const runtime = new TransactionEngine(initial(), ({ state, rng, event, enqueue }) => {
      state.seen.push(1);
      rng.cursor++;
      enqueue({ scheduledTick: 2, causalDepth: 1, payload: { value: 2 } });
      enqueue({ scheduledTick: 2, causalDepth: code === 'CAUSAL_DEPTH' ? 33 : 1, payload: { value: 3 } });
      if (code === 'CONTRACT_ERROR') {
        event.id = 'changed_by_handler';
        throw new Error('fixture error');
      }
    });
    runtime.enqueue({ scheduledTick: 1, causalDepth: 0, payload: { value: 1 } }, 0);
    if (code === 'QUEUE_OVERFLOW') {
      for (let i = 1; i < 4096; i++) runtime.enqueue({ scheduledTick: 3, causalDepth: 0, payload: { value: i } }, 0);
    }
    const before = runtime.snapshot();
    expect(runtime.execute(1, 250)).toEqual({ status: 'FAILED', executed: 0, diagnostic: {
      code, tick: 1, eventId: 'event_0', causalDepth: code === 'CAUSAL_DEPTH' ? 33 : code === 'QUEUE_OVERFLOW' ? 1 : 0,
      queueSize: before.queue.events.length, checkpointId: null, recoveryAttempt: null,
    } });
    expect(runtime.snapshot()).toEqual(before);
    expect(runtime.failed).toBe(true);
  });
  it('orders scheduled, tied and overdue events without mutation', () => {
    const queue = new EventQueue<Payload>();
    queue.enqueue({ scheduledTick: 2, causalDepth: 0, payload: { value: 2 } }, 0);
    queue.enqueue({ scheduledTick: 1, causalDepth: 0, payload: { value: 1 } }, 0);
    queue.enqueue({ scheduledTick: 2, causalDepth: 0, payload: { value: 3 } }, 0);
    expect([queue.takeDue(3)?.payload.value, queue.takeDue(3)?.payload.value,
      queue.takeDue(3)?.payload.value]).toEqual([1, 2, 3]);
  });

  it('accepts 4096 entries and fails on the 4097th without allocation', () => {
    const queue = new EventQueue<Payload>();
    for (let i = 0; i < 4096; i++) queue.enqueue({ scheduledTick: 1, causalDepth: 0, payload: { value: i } }, 0);
    const before = queue.snapshot();
    expect(() => queue.enqueue({ scheduledTick: 1, causalDepth: 0, payload: { value: 9 } }, 0)).toThrow('QUEUE_OVERFLOW');
    expect(queue.snapshot()).toEqual(before);
  });

  it('accepts depth 32 and rejects 33 without mutation', () => {
    const queue = new EventQueue<Payload>();
    queue.enqueue({ scheduledTick: 1, causalDepth: 32, payload: { value: 1 } }, 0);
    const before = queue.snapshot();
    expect(() => queue.enqueue({ scheduledTick: 1, causalDepth: 33, payload: { value: 1 } }, 0)).toThrow('CAUSAL_DEPTH');
    expect(queue.snapshot()).toEqual(before);
  });

  it('commits the parent with one slot and leaves the child in the queue', () => {
    const runtime = engine();
    runtime.enqueue({ scheduledTick: 1, causalDepth: 0, payload: { value: 1, children: 1 } }, 0);
    runtime.enqueue({ scheduledTick: 1, causalDepth: 0, payload: { value: 9 } }, 0);
    expect(runtime.execute(1, 1)).toEqual({ status: 'APPLIED', executed: 1 });
    expect(runtime.snapshot().state.seen).toEqual([1]);
    expect(new EventScheduler(runtime).runTick(2).map(result => result.status)).toEqual(['APPLIED', 'APPLIED']);
    expect(runtime.snapshot().state.seen).toEqual([1, 9, 2]);
  });

  it('defers the generated 251st event with its metadata intact', () => {
    const runtime = engine();
    const scheduler = new EventScheduler(runtime);
    for (let i = 0; i < 249; i++) runtime.enqueue({
      scheduledTick: 1, causalDepth: 0, payload: { value: i },
    }, 0);
    runtime.enqueue({ scheduledTick: 1, causalDepth: 0, payload: { value: 500, children: 1 } }, 0);
    runtime.enqueue({ scheduledTick: 2, causalDepth: 0, payload: { value: 600 } }, 0);
    expect(scheduler.runTick(1)).toHaveLength(250);
    expect(runtime.snapshot().queue.events[0]).toEqual({
      id: 'event_251', insertionSequence: 251, scheduledTick: 1, causalDepth: 1,
      payload: { value: 501, children: 0 },
    });
    expect(scheduler.runTick(1)).toEqual([]);
    scheduler.runTick(2);
    expect(runtime.snapshot().state.seen.slice(249)).toEqual([500, 501, 600]);
  });

  it('spreads 251 causally related events across two ticks', () => {
    const runtime = new TransactionEngine(initial(), ({ state, event, enqueue }) => {
      state.seen.push(event.payload.value);
      if (event.payload.value === 0) {
        for (let i = 1; i <= 250; i++) enqueue({ scheduledTick: 1, causalDepth: 1, payload: { value: i } });
      }
    });
    runtime.enqueue({ scheduledTick: 1, causalDepth: 0, payload: { value: 0 } }, 0);
    const scheduler = new EventScheduler(runtime);
    expect(scheduler.runTick(1)).toHaveLength(250);
    expect(scheduler.runTick(2)).toEqual([{ status: 'APPLIED', executed: 1 }]);
    expect(runtime.snapshot().state.seen).toEqual(Array.from({ length: 251 }, (_, i) => i));
  });

  it('executes exactly 250 events and defers the 251st in original order', () => {
    const runtime = engine();
    for (let i = 0; i < 251; i++) runtime.enqueue({ scheduledTick: 1, causalDepth: 0,
      payload: { value: i } }, 0);
    expect(new EventScheduler(runtime).runTick(1)).toHaveLength(250);
    expect(runtime.snapshot().state.seen).toEqual(Array.from({ length: 250 }, (_, i) => i));
    expect(runtime.peekDue(2)?.payload.value).toBe(250);
    expect(new EventScheduler(runtime).runTick(2)).toHaveLength(1);
    expect(runtime.snapshot().state.seen[250]).toBe(250);
  });

  it('replays identical input and RNG state deterministically', () => {
    const a = engine();
    const b = engine();
    for (const runtime of [a, b]) {
      runtime.enqueue({ scheduledTick: 1, causalDepth: 0, payload: { value: 4, children: 2 } }, 0);
      new EventScheduler(runtime).runTick(1);
    }
    expect(a.snapshot()).toEqual(b.snapshot());
  });

  it('pauses and bounds catch-up with explicit tick configuration', () => {
    const clock = new SimulationClock({ ticksPerSecond: 10, maxCatchUpTicks: 2 });
    const seen: number[] = [];
    clock.setPaused(true);
    expect(clock.advance(1000, tick => seen.push(tick))).toBe(0);
    clock.setPaused(false);
    expect(clock.advance(350, tick => seen.push(tick))).toBe(2);
    expect(clock.advance(0, tick => seen.push(tick))).toBe(0);
    expect(clock.advance(25, tick => seen.push(tick))).toBe(0);
    expect(clock.advance(25, tick => seen.push(tick))).toBe(1);
    expect(seen).toEqual([1, 2, 3]);
  });
});
