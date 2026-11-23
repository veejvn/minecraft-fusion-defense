import { EVENTS_PER_TICK, type TransactionEngine, type TransactionOptions, type TransactionResult } from '../core/transaction';

export class EventScheduler<S, P, R> {
  private lastTick = -1;

  constructor(private readonly engine: TransactionEngine<S, P, R>) {}

  /** Synchronize the scheduler's high-water tick after restoring a checkpoint. */
  restore(lastTick: number): void {
    if (!Number.isSafeInteger(lastTick) || lastTick < -1) {
      throw new RangeError('Invalid scheduler tick');
    }
    this.lastTick = lastTick;
  }

  runTick(tick: number, options: TransactionOptions = {}): TransactionResult[] {
    if (!Number.isSafeInteger(tick) || tick < 0) throw new RangeError('Invalid scheduler tick');
    if (tick <= this.lastTick) return [];
    this.lastTick = tick;
    const results: TransactionResult[] = [];
    let remaining = EVENTS_PER_TICK;
    while (remaining > 0 && this.engine.peekDue(tick)) {
      const result = this.engine.execute(tick, remaining, options);
      results.push(result);
      if (result.status === 'APPLIED') remaining -= result.executed;
      else break;
    }
    return results;
  }
}
