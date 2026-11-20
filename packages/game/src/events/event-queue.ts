export const QUEUE_CAPACITY = 4096;
export const MAX_CAUSAL_DEPTH = 32;

export interface SimulationEvent<P> {
  id: string;
  scheduledTick: number;
  insertionSequence: number;
  causalDepth: number;
  payload: P;
}

export type EventInput<P> = Pick<SimulationEvent<P>, 'scheduledTick' | 'causalDepth' | 'payload'>;

export type FailureCode = 'QUEUE_OVERFLOW' | 'CAUSAL_DEPTH' | 'EXECUTION_LIMIT' | 'CONTRACT_ERROR';

export interface FailureDiagnostic {
  code: FailureCode;
  tick: number;
  eventId: string | null;
  causalDepth: number | null;
  queueSize: number;
  checkpointId: string | null;
  recoveryAttempt: number | null;
}

export class SimulationFailure extends Error {
  constructor(readonly diagnostic: FailureDiagnostic) {
    super(diagnostic.code);
  }
}

export interface QueueSnapshot<P> {
  events: SimulationEvent<P>[];
  nextSequence: number;
  nextId: number;
}

const clone = <T>(value: T): T => structuredClone(value);

export class EventQueue<P> {
  private events: SimulationEvent<P>[] = [];
  private nextSequence = 0;
  private nextId = 0;

  constructor(snapshot?: QueueSnapshot<P>) {
    if (snapshot) this.restore(snapshot);
  }

  get size(): number { return this.events.length; }
  snapshot(): QueueSnapshot<P> {
    return clone({ events: this.events, nextSequence: this.nextSequence, nextId: this.nextId });
  }

  restore(snapshot: QueueSnapshot<P>): void {
    if (!Number.isSafeInteger(snapshot.nextSequence) || snapshot.nextSequence < 0 ||
      !Number.isSafeInteger(snapshot.nextId) || snapshot.nextId < 0 ||
      !Array.isArray(snapshot.events) || snapshot.events.length > QUEUE_CAPACITY) {
      throw new RangeError('Invalid queue snapshot');
    }
    const ids = new Set<string>();
    const sequences = new Set<number>();
    for (const event of snapshot.events) {
      this.validate(event.scheduledTick, event.causalDepth);
      const idNumber = typeof event.id === 'string' ? Number(event.id.slice(6)) : NaN;
      if (event.causalDepth > MAX_CAUSAL_DEPTH ||
        !Number.isSafeInteger(idNumber) || idNumber < 0 || idNumber >= snapshot.nextId ||
        event.id !== `event_${idNumber}` || ids.has(event.id) ||
        !Number.isSafeInteger(event.insertionSequence) || event.insertionSequence < 0 ||
        event.insertionSequence >= snapshot.nextSequence || sequences.has(event.insertionSequence)) {
        throw new RangeError('Invalid event identity or sequence');
      }
      ids.add(event.id);
      sequences.add(event.insertionSequence);
      clone(event.payload);
    }
    this.events = clone(snapshot.events);
    this.events.sort((a, b) => a.scheduledTick - b.scheduledTick || a.insertionSequence - b.insertionSequence);
    this.nextSequence = snapshot.nextSequence;
    this.nextId = snapshot.nextId;
  }

  private validate(tick: number, depth: number): void {
    if (!Number.isSafeInteger(tick) || tick < 0 || !Number.isSafeInteger(depth) || depth < 0) {
      throw new RangeError('Invalid scheduled tick or causal depth');
    }
  }

  enqueue(input: EventInput<P>, tick: number): SimulationEvent<P> {
    if (!Number.isSafeInteger(tick) || tick < 0) throw new RangeError('Invalid current tick');
    this.validate(input.scheduledTick, input.causalDepth);
    if (input.causalDepth > MAX_CAUSAL_DEPTH) throw this.failure('CAUSAL_DEPTH', tick, null, input.causalDepth);
    if (this.size >= QUEUE_CAPACITY) throw this.failure('QUEUE_OVERFLOW', tick, null, input.causalDepth);
    if (!Number.isSafeInteger(this.nextId + 1) || !Number.isSafeInteger(this.nextSequence + 1)) {
      throw this.failure('CONTRACT_ERROR', tick, null, input.causalDepth);
    }
    const event = { id: `event_${this.nextId}`, scheduledTick: input.scheduledTick,
      insertionSequence: this.nextSequence, causalDepth: input.causalDepth, payload: clone(input.payload) };
    this.nextId++;
    this.nextSequence++;
    this.events.push(event);
    this.events.sort((a, b) => a.scheduledTick - b.scheduledTick || a.insertionSequence - b.insertionSequence);
    return clone(event);
  }

  peekDue(tick: number): SimulationEvent<P> | undefined {
    const event = this.events[0];
    return event && event.scheduledTick <= tick ? clone(event) : undefined;
  }

  takeDue(tick: number): SimulationEvent<P> | undefined {
    return this.events[0]?.scheduledTick <= tick ? clone(this.events.shift()!) : undefined;
  }

  failure(code: FailureCode, tick: number, eventId: string | null, causalDepth: number | null,
    checkpointId: string | null = null, recoveryAttempt: number | null = null): SimulationFailure {
    return new SimulationFailure({ code, tick, eventId, causalDepth, queueSize: this.size,
      checkpointId, recoveryAttempt });
  }
}
