import { EVENTS_PER_TICK, type TransactionEngine, type TransactionOptions, type TransactionResult } from '../core/transaction';

export class EventScheduler<S, P, R> {
  constructor(private readonly engine: TransactionEngine<S, P, R>) {}

  runTick(tick: number, options: TransactionOptions = {}): TransactionResult[] {
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
