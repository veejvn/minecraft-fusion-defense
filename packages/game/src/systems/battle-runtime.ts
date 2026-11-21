import { runCombatPhase } from '../combat/combat-engine';
import { validateCombatSession, type CombatSessionInput } from '../combat/combat-session';
import {
  applyCombatCommand,
  createCombatState,
  registerCombatEntity,
  unregisterCombatEntity,
  type CombatCommand,
} from '../combat/combat-state';
import { applyBattleCommand, createBattleState, type BattleCommand, type BattleState } from '../core/battle-state';
import { applyResourceEvent, createResourceState, type ResourceCommand, type ResourceEvent } from '../core/battle-resources';
import type { ResourceRng } from '../core/resource-rng';
import { validateResourceSession, type ResourceSessionInput } from '../core/resource-session';
import { SimulationClock, type ClockConfig } from '../core/simulation-clock';
import { TransactionEngine } from '../core/transaction';
import type { RuntimeEntity, EntityId } from '../entities/runtime-entity';
import { EventQueue } from '../events/event-queue';
import { EventScheduler } from '../events/event-scheduler';

type BattleEvent = BattleCommand | ResourceEvent | CombatCommand;

/** Internal headless runtime. Consumers query detached snapshots. */
export class BattleRuntime {
  private readonly clock: SimulationClock;
  private readonly engine: TransactionEngine<BattleState, BattleEvent, ResourceRng | null>;
  private readonly scheduler: EventScheduler<BattleState, BattleEvent, ResourceRng | null>;
  private paused = false;
  private terminal = false;
  private readonly hasCombat: boolean;

  constructor(config: ClockConfig, resourceInput?: ResourceSessionInput, combatInput?: CombatSessionInput) {
    this.clock = new SimulationClock(config);
    const session = resourceInput === undefined ? undefined : validateResourceSession(resourceInput, config.ticksPerSecond);
    const combatSession = combatInput === undefined
      ? undefined
      : validateCombatSession(combatInput, config.ticksPerSecond, session);
    this.hasCombat = combatSession !== undefined;
    const initial = createBattleState();
    const initialState: BattleState = {
      ...initial,
      ...(session ? { resources: createResourceState() } : {}),
      ...(combatSession ? { combat: createCombatState() } : {}),
    };
    this.engine = new TransactionEngine<BattleState, BattleEvent, ResourceRng | null>({
      state: initialState,
      queue: new EventQueue<BattleEvent>().snapshot(),
      rng: session ? { seed: session.seed } : null,
    }, ({ state, event, rng, enqueue }) => {
      if (state.resources?.terminal || state.combat?.terminal) return;
      const command = event.payload;
      if (command.type === 'add') {
        const id = state.nextEntityId;
        applyBattleCommand(state, command);
        if (state.combat && combatSession) registerCombatEntity(state, combatSession, id);
        return;
      }
      if (command.type === 'remove') {
        applyBattleCommand(state, command);
        if (state.combat) unregisterCombatEntity(state.combat, command.id);
        return;
      }
      if (command.type === 'spawn-enemy') {
        if (!state.combat || !combatSession) throw new Error('Combat session unavailable');
        applyCombatCommand(state, combatSession, command, event.id);
        return;
      }
      if (command.type === 'terminal' && !state.resources) {
        if (command.result !== 'victory' && command.result !== 'defeat') throw new TypeError('Invalid terminal result');
        if (!state.combat) throw new Error('Combat state unavailable');
        state.combat.terminal = command.result;
        this.terminal = true;
        return;
      }
      if (!state.resources || !session || !rng) throw new Error('Resource session unavailable');
      applyResourceEvent({
        battle: state, state: state.resources, config: session, rng, tick: this.clock.tick,
        // Timer renewals and expirations are independent future transactions.
        schedule: (timer, scheduledTick) => enqueue({ payload: timer, scheduledTick, causalDepth: 0 }),
      }, command, event.id);
      if (command.type === 'summon' && state.combat && combatSession &&
        state.resources.outcome?.eventId === event.id && state.resources.outcome.status === 'APPLIED') {
        registerCombatEntity(state, combatSession, state.nextEntityId - 1n);
      }
      if (state.resources.terminal) {
        if (state.combat) state.combat.terminal = state.resources.terminal;
        this.terminal = true;
      }
    });
    this.scheduler = new EventScheduler(this.engine);
    if (session) {
      this.engine.enqueue({ payload: { type: 'initialize' }, scheduledTick: 0, causalDepth: 0 }, 0);
      this.scheduler.runTick(0);
      if (this.engine.failed) throw new Error('Resource session initialization failed');
    }
    this.combatSession = combatSession;
  }

  private readonly combatSession: ReturnType<typeof validateCombatSession> | undefined;

  enqueue(command: BattleCommand | ResourceCommand | CombatCommand, scheduledTick: number) {
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
      if (this.combatSession && !this.terminal && !this.engine.failed) {
        this.engine.executePhase(tick, ({ state, enqueue }) => {
          if (!state.combat) return;
          runCombatPhase({
            battle: state,
            combat: state.combat,
            session: this.combatSession!,
            tick,
            enqueueReward: enemy => {
              if (state.resources) {
                enqueue({
                  payload: {
                    type: 'enemy-reward',
                    sourceId: enemy.id,
                    definitionId: enemy.definitionId,
                    lane: enemy.lane,
                    position: enemy.position,
                  },
                  scheduledTick: tick,
                  causalDepth: 0,
                });
              }
            },
            enqueueDefeat: () => {
              enqueue({ payload: { type: 'terminal', result: 'defeat' }, scheduledTick: tick, causalDepth: 0 });
            },
          });
        });
        if (this.engine.failed || this.terminal) {
          this.setPaused(true);
          return;
        }
      }
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
      ...(this.hasCombat && state.combat ? { combat: state.combat } : {}),
    };
  }
}
