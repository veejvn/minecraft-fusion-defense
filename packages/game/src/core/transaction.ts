import { EventQueue, type EventInput, type FailureDiagnostic, type SimulationEvent, SimulationFailure } from '../events/event-queue';

export const EVENTS_PER_TICK = 250;

export interface TransactionContext<S, P, R> {
  state: S;
  rng: R;
  event: SimulationEvent<P>;
  enqueue(input: EventInput<P>): SimulationEvent<P>;
}

export type EventHandler<S, P, R> = (context: TransactionContext<S, P, R>) => void;

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
    const stageState = structuredClone(this.state);
    const stageQueue = new EventQueue(this.queue.snapshot());
    const stageRng = structuredClone(this.rng);
    let executed = 0;
    let current: SimulationEvent<P> | undefined = first;
    this.executing = true;
    try {
      // A transaction consists of its triggering event and all newly generated due events.
      // Pre-existing later events stay in the queue for the scheduler's next transaction.
      const generated: SimulationEvent<P>[] = [];
      stageQueue.takeDue(tick);
      while (current) {
        executed++;
        if (executed > EVENTS_PER_TICK) {
          throw stageQueue.failure('EXECUTION_LIMIT', tick, current.id, current.causalDepth);
        }
        const event = current;
        let active = true;
        let enqueueFailure: { error: unknown } | undefined;
        try {
          this.handler({ state: stageState, rng: stageRng, event: structuredClone(event), enqueue: input => {
            if (!active) throw new Error('Transaction handler has already returned');
            if (enqueueFailure) throw enqueueFailure.error;
            try {
              const created = stageQueue.enqueue(input, tick);
              if (created.scheduledTick <= tick) generated.push(created);
              return structuredClone(created);
            } catch (error) {
              enqueueFailure = { error };
              throw error;
            }
          } });
        } finally {
          active = false;
        }
        if (enqueueFailure) throw enqueueFailure.error;
        // Execute newly generated due events in canonical order. Other queued events
        // remain deferred until this atomic transaction has committed.
        generated.sort((a, b) => a.scheduledTick - b.scheduledTick || a.insertionSequence - b.insertionSequence);
        current = generated.shift();
        if (current) {
          const snapshot = stageQueue.snapshot();
          stageQueue.restore({ ...snapshot, events: snapshot.events.filter(item => item.id !== current!.id) });
        }
      }
      if (executed > remainingBudget) return { status: 'DEFERRED', executed: 0 };
      const committed = structuredClone({ state: stageState, rng: stageRng });
      this.state = committed.state;
      this.queue = stageQueue;
      this.rng = committed.rng;
      return { status: 'APPLIED', executed };
    } catch (error) {
      return this.fail(error, tick, current?.id ?? first.id, current?.causalDepth ?? first.causalDepth, options);
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
