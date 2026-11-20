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

  it('defers an indivisible two-event transaction and retries first next tick', () => {
    const runtime = engine();
    runtime.enqueue({ scheduledTick: 1, causalDepth: 0, payload: { value: 1, children: 1 } }, 0);
    runtime.enqueue({ scheduledTick: 1, causalDepth: 0, payload: { value: 9 } }, 0);
    const before = runtime.snapshot();
    expect(runtime.execute(1, 1).status).toBe('DEFERRED');
    expect(runtime.snapshot()).toEqual(before);
    expect(new EventScheduler(runtime).runTick(2).map(result => result.status)).toEqual(['APPLIED', 'APPLIED']);
    expect(runtime.snapshot().state.seen).toEqual([1, 2, 9]);
  });

  it('fails a transaction over 250 executed events without committing', () => {
    const runtime = new TransactionEngine(initial(), ({ state, event, enqueue }) => {
      state.seen.push(event.payload.value);
      if (event.payload.value === 0) {
        for (let i = 1; i <= 250; i++) enqueue({ scheduledTick: 1, causalDepth: 1, payload: { value: i } });
      }
    });
    runtime.enqueue({ scheduledTick: 1, causalDepth: 0, payload: { value: 0 } }, 0);
    const before = runtime.snapshot();
    const result = runtime.execute(1, 250, { checkpointId: 'cp', recoveryAttempt: 1 });
    expect(result.status).toBe('FAILED');
    if (result.status === 'FAILED') expect(result.diagnostic).toMatchObject({ code: 'EXECUTION_LIMIT', tick: 1,
      queueSize: 1, checkpointId: 'cp', recoveryAttempt: 1 });
    expect(runtime.snapshot()).toEqual(before);
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
    expect(clock.advance(0, tick => seen.push(tick))).toBe(1);
    expect(seen).toEqual([1, 2, 3]);
  });
});
