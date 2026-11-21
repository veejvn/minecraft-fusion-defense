import { applyBattleCommand, createBattleState, type BattleCommand, type BattleState } from '../core/battle-state';
import { applyResourceEvent, createResourceState, type ResourceCommand, type ResourceEvent } from '../core/battle-resources';
import type { ResourceRng } from '../core/resource-rng';
import { validateResourceSession, type ResourceSessionInput } from '../core/resource-session';
import { SimulationClock, type ClockConfig } from '../core/simulation-clock';
import { TransactionEngine } from '../core/transaction';
import type { RuntimeEntity, EntityId } from '../entities/runtime-entity';
import { EventQueue } from '../events/event-queue';
import { EventScheduler } from '../events/event-scheduler';

type BattleEvent = BattleCommand | ResourceEvent;

/** Internal headless runtime. Consumers query detached snapshots. */
export class BattleRuntime {
  private readonly clock: SimulationClock;
  private readonly engine: TransactionEngine<BattleState, BattleEvent, ResourceRng | null>;
  private readonly scheduler: EventScheduler<BattleState, BattleEvent, ResourceRng | null>;
  private paused = false;
  private terminal = false;

  constructor(config: ClockConfig, resourceInput?: ResourceSessionInput) {
    this.clock = new SimulationClock(config);
    const session = resourceInput === undefined ? undefined : validateResourceSession(resourceInput, config.ticksPerSecond);
    const initial = createBattleState();
    this.engine = new TransactionEngine<BattleState, BattleEvent, ResourceRng | null>({
      state: session ? { ...initial, resources: createResourceState() } : initial,
      queue: new EventQueue<BattleEvent>().snapshot(),
      rng: session ? { seed: session.seed } : null,
    }, ({ state, event, rng, enqueue }) => {
      if (state.resources?.terminal) return;
      const command = event.payload;
      if (command.type === 'add' || command.type === 'remove') {
        applyBattleCommand(state, command);
        return;
      }
      if (!state.resources || !session || !rng) throw new Error('Resource session unavailable');
      applyResourceEvent({
        battle: state, state: state.resources, config: session, rng, tick: this.clock.tick,
        // Timer renewals and expirations are independent future transactions.
        schedule: (timer, scheduledTick) => enqueue({ payload: timer, scheduledTick, causalDepth: 0 }),
      }, command, event.id);
      if (state.resources.terminal) this.terminal = true;
    });
    this.scheduler = new EventScheduler(this.engine);
    if (session) {
      this.engine.enqueue({ payload: { type: 'initialize' }, scheduledTick: 0, causalDepth: 0 }, 0);
      this.scheduler.runTick(0);
      if (this.engine.failed) throw new Error('Resource session initialization failed');
    }
  }

  enqueue(command: BattleCommand | ResourceCommand, scheduledTick: number) {
    if (this.terminal || (this.paused && (command.type === 'collect' || command.type === 'claim'))) {
      return { status: 'REJECTED', reason: this.terminal ? 'terminal' : 'paused' } as const;
    }
    return this.engine.enqueue({ payload: command, scheduledTick, causalDepth: 0 }, this.clock.tick);
  }

  setPaused(paused: boolean): void {
    this.paused = paused || this.engine.failed || this.terminal;
    this.clock.setPaused(this.paused);
  }

  advance(elapsedMs: number): number {
    if (this.engine.failed || this.terminal) return 0;
    return this.clock.advance(elapsedMs, tick => {
      this.scheduler.runTick(tick);
      if (this.engine.failed || this.terminal) this.setPaused(true);
    });
  }

  snapshot() {
    const { state, queue, rng } = this.engine.snapshot();
    return {
      tick: this.clock.tick,
      occupancy: state.occupancy as readonly (EntityId | null)[],
      entities: state.entities as ReadonlyMap<EntityId, RuntimeEntity>,
      nextEntityId: state.nextEntityId,
      queue,
      failure: this.engine.failureDiagnostic,
      ...(state.resources ? { resources: state.resources, rng } : {}),
    };
  }
}
