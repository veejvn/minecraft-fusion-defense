import { EventQueue, type EventInput, type FailureDiagnostic, type SimulationEvent, SimulationFailure } from '../events/event-queue';

export const EVENTS_PER_TICK = 250;

export interface TransactionContext<S, P, R> {
  state: S;
  rng: R;
  event: SimulationEvent<P>;
  enqueue(input: EventInput<P>): SimulationEvent<P>;
}

export type EventHandler<S, P, R> = (context: TransactionContext<S, P, R>) => void;

export interface PhaseContext<S, P, R> {
  state: S;
  rng: R;
  tick: number;
  enqueue(input: EventInput<P>): SimulationEvent<P>;
}

export type PhaseHandler<S, P, R> = (context: PhaseContext<S, P, R>) => void;

export type TransactionResult =
  | { status: 'APPLIED'; executed: number }
  | { status: 'DEFERRED'; executed: 0 }
  | { status: 'SKIPPED'; executed: number }
  | { status: 'FAILED'; executed: 0; diagnostic: FailureDiagnostic };

export interface TransactionOptions {
  checkpointId?: string | null;
  recoveryAttempt?: number | null;
}

export interface SimulationSnapshot<S, P, R> {
  state: S;
  queue: ReturnType<EventQueue<P>['snapshot']>;
  rng: R;
}

export class TransactionEngine<S, P, R> {
  private state: S;
  private queue: EventQueue<P>;
  private rng: R;
  private stopped = false;
  private executing = false;
  private diagnostic: FailureDiagnostic | null = null;

  constructor(snapshot: SimulationSnapshot<S, P, R>, private readonly handler: EventHandler<S, P, R>) {
    this.state = structuredClone(snapshot.state);
    this.queue = new EventQueue(snapshot.queue);
    this.rng = structuredClone(snapshot.rng);
  }

  snapshot(): SimulationSnapshot<S, P, R> {
    return structuredClone({ state: this.state, queue: this.queue.snapshot(), rng: this.rng });
  }

  get failed(): boolean { return this.stopped; }
  get failureDiagnostic(): FailureDiagnostic | null { return this.diagnostic && structuredClone(this.diagnostic); }
  peekDue(tick: number): SimulationEvent<P> | undefined { return this.queue.peekDue(tick); }

  enqueue(input: EventInput<P>, tick: number): TransactionResult {
    if (this.executing) throw new Error('Use the staged enqueue inside a transaction');
    if (this.stopped) return { status: 'FAILED', executed: 0, diagnostic: this.failureDiagnostic! };
    try {
      this.queue.enqueue(input, tick);
      return { status: 'APPLIED', executed: 0 };
    } catch (error) {
      return this.fail(error, tick, null, input.causalDepth);
    }
  }

  execute(tick: number, remainingBudget: number, options: TransactionOptions = {}): TransactionResult {
    if (this.executing) throw new Error('Nested transaction execution is unsupported');
    if (this.stopped) return { status: 'FAILED', executed: 0, diagnostic: this.failureDiagnostic! };
    if (!Number.isSafeInteger(tick) || tick < 0 || !Number.isSafeInteger(remainingBudget) ||
      remainingBudget < 0 || remainingBudget > EVENTS_PER_TICK) {
      return this.fail(new RangeError('Invalid tick or budget'), tick, null, null, options);
    }
    const first = this.queue.peekDue(tick);
    if (!first) return { status: 'SKIPPED', executed: 0 };
    if (remainingBudget === 0) return { status: 'DEFERRED', executed: 0 };
    return this.runStaged(tick, first.id, first.causalDepth, options, 1, ({ state, rng, stageQueue, enqueue }) => {
      // Commit the handler and its enqueues together. The scheduler selects the
      // next event from the committed queue, including any newly due events.
      stageQueue.takeDue(tick);
      this.handler({ state, rng, event: structuredClone(first), enqueue });
    });
  }

  /** Run a per-tick simulation phase in the same atomic transaction boundary as event execution. */
  executePhase(tick: number, handler: PhaseHandler<S, P, R>, options: TransactionOptions = {}): TransactionResult {
    if (this.executing) throw new Error('Nested transaction execution is unsupported');
    if (this.stopped) return { status: 'FAILED', executed: 0, diagnostic: this.failureDiagnostic! };
    if (!Number.isSafeInteger(tick) || tick < 0) {
      return this.fail(new RangeError('Invalid tick'), tick, null, null, options);
    }
    return this.runStaged(tick, null, null, options, 0, ({ state, rng, enqueue }) => {
      handler({ state, rng, tick, enqueue });
    });
  }

  private runStaged(
    tick: number,
    eventId: string | null,
    depth: number | null,
    options: TransactionOptions,
    executed: number,
    work: (stage: {
      state: S;
      rng: R;
      stageQueue: EventQueue<P>;
      enqueue: (input: EventInput<P>) => SimulationEvent<P>;
    }) => void,
  ): TransactionResult {
    const stageState = structuredClone(this.state);
    const stageQueue = new EventQueue(this.queue.snapshot());
    const stageRng = structuredClone(this.rng);
    this.executing = true;
    try {
      let active = true;
      let enqueueFailure: { error: unknown } | undefined;
      try {
        work({
          state: stageState,
          rng: stageRng,
          stageQueue,
          enqueue: input => {
            if (!active) throw new Error('Transaction handler has already returned');
            if (enqueueFailure) throw enqueueFailure.error;
            try {
              return stageQueue.enqueue(input, tick);
            } catch (error) {
              enqueueFailure = { error };
              throw error;
            }
          },
        });
      } catch (error) {
        throw enqueueFailure ? enqueueFailure.error : error;
      } finally {
        active = false;
      }
      if (enqueueFailure) throw enqueueFailure.error;
      const committed = structuredClone({ state: stageState, rng: stageRng });
      this.state = committed.state;
      this.queue = stageQueue;
      this.rng = committed.rng;
      return { status: 'APPLIED', executed };
    } catch (error) {
      return this.fail(error, tick, eventId, depth, options);
    } finally {
      this.executing = false;
    }
  }

  private fail(error: unknown, tick: number, eventId: string | null, depth: number | null,
    options: TransactionOptions = {}): TransactionResult {
    const code = error instanceof SimulationFailure ? error.diagnostic.code : 'CONTRACT_ERROR';
    const diagnostic: FailureDiagnostic = { code, tick, eventId: error instanceof SimulationFailure ? error.diagnostic.eventId ?? eventId : eventId,
      causalDepth: error instanceof SimulationFailure ? error.diagnostic.causalDepth ?? depth : depth,
      queueSize: this.queue.size, checkpointId: options.checkpointId ?? null,
      recoveryAttempt: options.recoveryAttempt ?? null };
    this.stopped = true;
    this.diagnostic = diagnostic;
    return { status: 'FAILED', executed: 0, diagnostic: structuredClone(diagnostic) };
  }
}
