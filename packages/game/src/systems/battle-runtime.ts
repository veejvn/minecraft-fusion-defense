import { applyBattleCommand, createBattleState, type BattleCommand, type BattleState } from '../core/battle-state';
import { SimulationClock, type ClockConfig } from '../core/simulation-clock';
import { TransactionEngine } from '../core/transaction';
import type { RuntimeEntity, EntityId } from '../entities/runtime-entity';
import { EventQueue } from '../events/event-queue';
import { EventScheduler } from '../events/event-scheduler';

/** Internal headless runtime. Consumers query detached snapshots. */
export class BattleRuntime {
  private readonly clock: SimulationClock;
  private readonly engine = new TransactionEngine<BattleState, BattleCommand, null>({
    state: createBattleState(),
    queue: new EventQueue<BattleCommand>().snapshot(),
    rng: null,
  }, ({ state, event }) => applyBattleCommand(state, event.payload));
  private readonly scheduler = new EventScheduler(this.engine);

  constructor(config: ClockConfig) {
    this.clock = new SimulationClock(config);
  }

  enqueue(command: BattleCommand, scheduledTick: number) {
    return this.engine.enqueue({ payload: command, scheduledTick, causalDepth: 0 }, this.clock.tick);
  }

  setPaused(paused: boolean): void {
    this.clock.setPaused(paused || this.engine.failed);
  }

  advance(elapsedMs: number): number {
    if (this.engine.failed) return 0;
    return this.clock.advance(elapsedMs, tick => {
      this.scheduler.runTick(tick);
      if (this.engine.failed) this.clock.setPaused(true);
    });
  }

  snapshot() {
    const { state, queue } = this.engine.snapshot();
    return {
      tick: this.clock.tick,
      occupancy: state.occupancy as readonly (EntityId | null)[],
      entities: state.entities as ReadonlyMap<EntityId, RuntimeEntity>,
      nextEntityId: state.nextEntityId,
      queue,
      failure: this.engine.failureDiagnostic,
    };
  }
}
