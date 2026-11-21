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
import { applyFusionCommand } from '../fusion/fusion-engine';
import { validateFusionSession, type FusionSessionInput } from '../fusion/fusion-session';
import { createFusionState, type FusionCommand } from '../fusion/fusion-state';
import { applyWaveEvent, checkWaveCompletion, isBattleTerminal, type WaveEventContext } from '../waves/wave-engine';
import { validateWaveSession, waveDeadline, type WaveSessionInput } from '../waves/wave-session';
import { createWaveState, type WaveEvent } from '../waves/wave-state';

type BattleEvent = BattleCommand | ResourceEvent | CombatCommand | FusionCommand | WaveEvent;

/** Internal headless runtime. Consumers query detached snapshots. */
export class BattleRuntime {
  private readonly clock: SimulationClock;
  private readonly engine: TransactionEngine<BattleState, BattleEvent, ResourceRng | null>;
  private readonly scheduler: EventScheduler<BattleState, BattleEvent, ResourceRng | null>;
  private paused = false;
  private terminal = false;
  private readonly hasCombat: boolean;
  private readonly hasFusion: boolean;
  private readonly hasWaves: boolean;

  constructor(
    config: ClockConfig,
    resourceInput?: ResourceSessionInput,
    combatInput?: CombatSessionInput,
    fusionInput?: FusionSessionInput,
    waveInput?: WaveSessionInput,
  ) {
    this.clock = new SimulationClock(config);
    const session = resourceInput === undefined ? undefined : validateResourceSession(resourceInput, config.ticksPerSecond);
    const combatSession = combatInput === undefined
      ? undefined
      : validateCombatSession(combatInput, config.ticksPerSecond, session);
    const fusionSession = fusionInput === undefined
      ? undefined
      : validateFusionSession(fusionInput, session, combatSession);
    const waveSession = waveInput === undefined
      ? undefined
      : validateWaveSession(waveInput, config.ticksPerSecond, combatSession, session);
    this.hasCombat = combatSession !== undefined;
    this.hasFusion = fusionSession !== undefined;
    this.hasWaves = waveSession !== undefined;
    this.combatSession = combatSession;
    this.fusionSession = fusionSession;
    this.waveSession = waveSession;
    const initial = createBattleState();
    const initialState: BattleState = {
      ...initial,
      ...(session ? { resources: createResourceState() } : {}),
      ...(combatSession ? { combat: createCombatState() } : {}),
      ...(fusionSession ? { fusion: createFusionState() } : {}),
      ...(waveSession ? { waves: createWaveState() } : {}),
    };
    this.engine = new TransactionEngine<BattleState, BattleEvent, ResourceRng | null>({
      state: initialState,
      queue: new EventQueue<BattleEvent>().snapshot(),
      rng: session ? { seed: session.seed } : waveSession?.seed !== undefined ? { seed: waveSession.seed } : null,
    }, ({ state, event, rng, enqueue }) => {
      if (isBattleTerminal(state)) return;
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
        if (state.waves && waveSession) checkWaveCompletion(this.waveContext(state, rng, this.clock.tick, enqueue));
        return;
      }
      if (command.type === 'spawn-enemy') {
        if (!state.combat || !combatSession) throw new Error('Combat session unavailable');
        applyCombatCommand(state, combatSession, command, event.id);
        return;
      }
      if (command.type === 'fuse') {
        if (!state.fusion || !fusionSession) throw new Error('Fusion session unavailable');
        applyFusionCommand(state, fusionSession, combatSession, command, event.id);
        return;
      }
      if (command.type === 'wave-start' || command.type === 'wave-spawn') {
        if (!state.waves || !waveSession || !combatSession) throw new Error('Wave session unavailable');
        applyWaveEvent(this.waveContext(state, rng, this.clock.tick, enqueue), command);
        return;
      }
      if (command.type === 'terminal' && !state.resources) {
        if (command.result !== 'victory' && command.result !== 'defeat') throw new TypeError('Invalid terminal result');
        this.markTerminal(state, command.result);
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
        this.markTerminal(state, state.resources.terminal);
      }
    });
    this.scheduler = new EventScheduler(this.engine);
    if (session || waveSession) {
      if (session) {
        this.engine.enqueue({ payload: { type: 'initialize' }, scheduledTick: 0, causalDepth: 0 }, 0);
      }
      if (waveSession) {
        this.engine.enqueue({
          payload: { type: 'wave-start', waveIndex: 0 },
          scheduledTick: waveDeadline(waveSession.waves[0].initialDelaySeconds, config.ticksPerSecond, 0),
          causalDepth: 0,
        }, 0);
      }
      this.scheduler.runTick(0);
      if (this.engine.failed) {
        throw new Error(session ? 'Resource session initialization failed' : 'Wave session initialization failed');
      }
    }
  }

  private readonly combatSession: ReturnType<typeof validateCombatSession> | undefined;
  private readonly fusionSession: ReturnType<typeof validateFusionSession> | undefined;
  private readonly waveSession: ReturnType<typeof validateWaveSession> | undefined;

  private waveContext(
    state: BattleState,
    rng: ResourceRng | null,
    tick: number,
    enqueue: (input: { payload: BattleEvent; scheduledTick: number; causalDepth: number }) => unknown,
  ): WaveEventContext {
    return {
      battle: state,
      waves: state.waves!,
      session: this.waveSession!,
      combatSession: this.combatSession!,
      rng,
      tick,
      scheduleWave: (waveEvent, scheduledTick) => enqueue({ payload: waveEvent, scheduledTick, causalDepth: 0 }),
      enqueueWaveReward: (waveId, scheduledTick) => enqueue({
        payload: { type: 'wave-reward', sourceId: waveId },
        scheduledTick,
        causalDepth: 0,
      }),
      enqueueVictory: scheduledTick => enqueue({
        payload: { type: 'terminal', result: 'victory' },
        scheduledTick,
        causalDepth: 0,
      }),
    };
  }

  private markTerminal(state: BattleState, result: 'victory' | 'defeat'): void {
    if (state.combat) state.combat.terminal = result;
    if (state.waves) state.waves.terminal = result;
    this.terminal = true;
  }

  enqueue(command: BattleCommand | ResourceCommand | CombatCommand | FusionCommand | WaveEvent, scheduledTick: number) {
    if (this.terminal || (this.paused && (command.type === 'collect' || command.type === 'claim' || command.type === 'fuse'))) {
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
        this.engine.executePhase(tick, ({ state, rng, enqueue }) => {
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
          if (state.waves && this.waveSession && this.combatSession && !isBattleTerminal(state)) {
            checkWaveCompletion(this.waveContext(state, rng, tick, enqueue));
          }
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
      ...(!state.resources && this.hasWaves && rng !== null ? { rng } : {}),
      ...(this.hasCombat && state.combat ? { combat: state.combat } : {}),
      ...(this.hasFusion && state.fusion ? { fusion: state.fusion } : {}),
      ...(this.hasWaves && state.waves ? { waves: state.waves } : {}),
    };
  }
}
