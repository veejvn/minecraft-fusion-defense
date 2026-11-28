import {
  applyAbilityCommand,
  cleanupEntityAbilityState,
  stepAbilityTickPhase,
  type AbilityRewardEnemy,
} from '../abilities/ability-engine';
import { validateAbilitySession, type AbilitySessionInput } from '../abilities/ability-session';
import { createAbilityState, type AbilityCommand } from '../abilities/ability-state';
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
import {
  applyResourceEvent,
  createResourceState,
  registerDefenderProducer,
  spawnEmeraldBurst,
  unregisterDefenderProducer,
  type ResourceCommand,
  type ResourceEvent,
} from '../core/battle-resources';
import type { ResourceRng } from '../core/resource-rng';
import { validateResourceSession, type ResourceSessionInput } from '../core/resource-session';
import { SimulationClock, type ClockConfig } from '../core/simulation-clock';
import { TransactionEngine } from '../core/transaction';
import type { RuntimeEntity, EntityId } from '../entities/runtime-entity';
import { EventQueue, type QueueSnapshot } from '../events/event-queue';
import { EventScheduler } from '../events/event-scheduler';
import { applyFusionCommand } from '../fusion/fusion-engine';
import { validateFusionSession, type FusionSessionInput } from '../fusion/fusion-session';
import { createFusionState, type FusionCommand } from '../fusion/fusion-state';
import { CheckpointManager, type CheckpointRecord } from '../persistence/checkpoint-manager';
import { ProgressionStore } from '../persistence/progression-store';
import {
  deserializeBattleCheckpoint,
  serializeBattleCheckpoint,
  type CheckpointSemanticContext,
  type CheckpointTriggerReason,
  type DecodedBattleCheckpoint,
} from '../persistence/snapshot-codec';
import type { PersistenceStorageAdapter } from '../persistence/storage-adapter';
import { applyWaveEvent, checkWaveCompletion, isBattleTerminal, type WaveEventContext } from '../waves/wave-engine';
import { validateWaveSession, waveDeadline, type WaveSessionInput } from '../waves/wave-session';
import { createWaveState, type WaveEvent } from '../waves/wave-state';

type BattleEvent = BattleCommand | ResourceEvent | CombatCommand | FusionCommand | WaveEvent | AbilityCommand;

export interface BattlePersistenceOptions {
  readonly battleId?: string;
  readonly levelId?: string;
  readonly storage?: PersistenceStorageAdapter;
  readonly storageKey?: string;
  readonly progressionStore?: ProgressionStore;
  readonly autoCheckpoint?: boolean;
  readonly checkpointManager?: CheckpointManager;
}

export interface CheckpointRestoreResult {
  readonly status: 'RESTORED';
  readonly checkpointId: string;
  readonly tick: number;
  readonly battleGeneration: number;
}

export type BattleRecoveryResult =
  | {
      readonly status: 'RECOVERED';
      readonly checkpointId: string;
      readonly tick: number;
      readonly battleGeneration: number;
      readonly source: 'ram' | 'storage-primary' | 'storage-backup';
    }
  | {
      readonly status: 'FAILED';
      readonly reason: 'no-valid-checkpoint';
    };

export interface BattlePersistenceMeta {
  readonly battleId: string;
  readonly battleGeneration: number;
  readonly matchKills: number;
  readonly recovering: boolean;
  readonly checkpointCount: number;
}

function validateBattleSessions(
  ticksPerSecond: number,
  resourceInput?: ResourceSessionInput,
  combatInput?: CombatSessionInput,
  fusionInput?: FusionSessionInput,
  waveInput?: WaveSessionInput,
  abilityInput?: AbilitySessionInput,
) {
  const resourceSession = resourceInput === undefined
    ? undefined
    : validateResourceSession(resourceInput, ticksPerSecond);
  const combatSession = combatInput === undefined
    ? undefined
    : validateCombatSession(combatInput, ticksPerSecond, resourceSession);
  const fusionSession = fusionInput === undefined
    ? undefined
    : validateFusionSession(fusionInput, resourceSession, combatSession);
  const waveSession = waveInput === undefined
    ? undefined
    : validateWaveSession(waveInput, ticksPerSecond, combatSession, resourceSession);
  const abilitySession = abilityInput === undefined
    ? undefined
    : validateAbilitySession(abilityInput, ticksPerSecond, combatSession, resourceSession);
  return { resourceSession, combatSession, fusionSession, waveSession, abilitySession };
}

function enqueueEnemyReward(
  state: BattleState,
  enqueue: (input: { payload: BattleEvent; scheduledTick: number; causalDepth: number }) => unknown,
  tick: number,
  enemy: AbilityRewardEnemy,
): void {
  if (!state.resources) return;
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
  private readonly hasAbilities: boolean;
  private readonly battleId: string;
  private readonly levelId?: string;
  private battleGeneration = 1;
  private recovering = false;
  private checkpointCounter = 0;
  private readonly checkpointManager?: CheckpointManager;
  private readonly autoCheckpoint: boolean;
  private readonly progressionStore?: ProgressionStore;
  private terminalRecorded = false;
  private pendingCheckpointReason: CheckpointTriggerReason | null = null;
  private readonly resourceSession: ReturnType<typeof validateResourceSession> | undefined;
  private readonly combatSession: ReturnType<typeof validateCombatSession> | undefined;
  private readonly fusionSession: ReturnType<typeof validateFusionSession> | undefined;
  private readonly waveSession: ReturnType<typeof validateWaveSession> | undefined;
  private readonly abilitySession: ReturnType<typeof validateAbilitySession> | undefined;

  /** Restore a BattleRuntime from a serialized checkpoint JSON without running tick-0 setup. */
  static fromCheckpoint(
    rawJson: string,
    config: ClockConfig,
    resourceInput?: ResourceSessionInput,
    combatInput?: CombatSessionInput,
    fusionInput?: FusionSessionInput,
    waveInput?: WaveSessionInput,
    abilityInput?: AbilitySessionInput,
    persistenceOptions?: BattlePersistenceOptions,
  ): BattleRuntime {
    const sessions = validateBattleSessions(
      config.ticksPerSecond,
      resourceInput,
      combatInput,
      fusionInput,
      waveInput,
      abilityInput,
    );
    const probeClock = new SimulationClock(config);
    const decoded = deserializeBattleCheckpoint(rawJson, {
      tickDurationMs: probeClock.tickDurationMs,
      ...(sessions.resourceSession ? { resourceSession: sessions.resourceSession } : {}),
      ...(sessions.combatSession ? { combatSession: sessions.combatSession } : {}),
      ...(sessions.fusionSession ? { fusionSession: sessions.fusionSession } : {}),
      ...(sessions.waveSession ? { waveSession: sessions.waveSession } : {}),
      ...(sessions.abilitySession ? { abilitySession: sessions.abilitySession } : {}),
    });
    return new BattleRuntime(
      config,
      resourceInput,
      combatInput,
      fusionInput,
      waveInput,
      abilityInput,
      persistenceOptions,
      decoded,
    );
  }

  constructor(
    config: ClockConfig,
    resourceInput?: ResourceSessionInput,
    combatInput?: CombatSessionInput,
    fusionInput?: FusionSessionInput,
    waveInput?: WaveSessionInput,
    abilityInput?: AbilitySessionInput,
    persistenceOptions?: BattlePersistenceOptions,
    _initialCheckpoint?: DecodedBattleCheckpoint,
  ) {
    if (
      persistenceOptions?.battleId !== undefined &&
      (typeof persistenceOptions.battleId !== 'string' || !persistenceOptions.battleId.trim())
    ) {
      throw new TypeError('battleId must be a non-empty string');
    }

    this.clock = new SimulationClock(config);
    const {
      resourceSession: session,
      combatSession,
      fusionSession,
      waveSession,
      abilitySession,
    } = validateBattleSessions(
      config.ticksPerSecond,
      resourceInput,
      combatInput,
      fusionInput,
      waveInput,
      abilityInput,
    );
    this.hasCombat = combatSession !== undefined;
    this.hasFusion = fusionSession !== undefined;
    this.hasWaves = waveSession !== undefined;
    this.hasAbilities = abilitySession !== undefined;
    this.resourceSession = session;
    this.combatSession = combatSession;
    this.fusionSession = fusionSession;
    this.waveSession = waveSession;
    this.abilitySession = abilitySession;

    this.battleId = _initialCheckpoint
      ? _initialCheckpoint.battleId
      : (persistenceOptions?.battleId ?? 'battle_default');
    this.levelId = _initialCheckpoint?.levelId ?? persistenceOptions?.levelId;
    this.battleGeneration = _initialCheckpoint ? _initialCheckpoint.battleGeneration : 1;
    this.progressionStore = persistenceOptions?.progressionStore;
    if (persistenceOptions !== undefined) {
      this.checkpointManager =
        persistenceOptions.checkpointManager ??
        new CheckpointManager({
          storage: persistenceOptions.storage,
          storageKey: persistenceOptions.storageKey,
        });
      this.autoCheckpoint = persistenceOptions.autoCheckpoint ?? true;
    } else {
      this.checkpointManager = undefined;
      this.autoCheckpoint = false;
    }

    const initial = createBattleState();
    const initialState: BattleState = {
      ...initial,
      ...(session ? { resources: createResourceState() } : {}),
      ...(combatSession ? { combat: createCombatState() } : {}),
      ...(fusionSession ? { fusion: createFusionState() } : {}),
      ...(waveSession ? { waves: createWaveState() } : {}),
      ...(abilitySession ? { abilities: createAbilityState() } : {}),
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
        if (command.entity.kind === 'defender' && state.resources && session && rng) {
          registerDefenderProducer(
            {
              battle: state,
              state: state.resources,
              config: session,
              rng,
              tick: this.clock.tick,
              schedule: (timer, scheduledTick) => enqueue({ payload: timer, scheduledTick, causalDepth: 0 }),
            },
            id,
            command.entity.definitionId,
          );
        }
        return;
      }
      if (command.type === 'remove') {
        applyBattleCommand(state, command);
        if (state.combat) unregisterCombatEntity(state.combat, command.id);
        if (state.abilities) cleanupEntityAbilityState(state, command.id, 'death');
        if (state.resources) unregisterDefenderProducer(state.resources, command.id);
        if (state.waves && waveSession) checkWaveCompletion(this.waveContext(state, rng, this.clock.tick, enqueue));
        return;
      }
      if (command.type === 'spawn-enemy') {
        if (!state.combat || !combatSession) throw new Error('Combat session unavailable');
        applyCombatCommand(state, combatSession, command, event.id);
        return;
      }
      if (command.type === 'fuse' || command.type === 'summon-fuse') {
        if (!state.fusion || !fusionSession) throw new Error('Fusion session unavailable');
        applyFusionCommand(
          state,
          fusionSession,
          combatSession,
          command,
          event.id,
          session,
          this.clock.tick,
        );
        if (state.fusion.outcome?.eventId === event.id && state.fusion.outcome.status === 'APPLIED') {
          if (state.resources && session && rng) {
            if (command.type === 'fuse') {
              unregisterDefenderProducer(state.resources, command.sourceId);
            }
            unregisterDefenderProducer(state.resources, command.targetId);
            const outputId = state.fusion.outcome.outputEntityId;
            const outputEntity = state.entities.get(outputId);
            if (outputEntity && outputEntity.kind === 'defender') {
              registerDefenderProducer(
                {
                  battle: state,
                  state: state.resources,
                  config: session,
                  rng,
                  tick: this.clock.tick,
                  schedule: (timer, scheduledTick) => enqueue({ payload: timer, scheduledTick, causalDepth: 0 }),
                },
                outputId,
                outputEntity.definitionId,
              );
            }
          }
          this.pendingCheckpointReason = 'fuse';
        }
        return;
      }
      if (command.type === 'activate-ability') {
        if (!state.abilities || !abilitySession || !state.combat || !combatSession) {
          throw new Error('Ability session unavailable');
        }
        applyAbilityCommand(
          {
            battle: state,
            combat: state.combat,
            session: combatSession,
            abilitySession,
            spawnResourceBurst: (cell, ownerId, amount, itemCount, spawnAsItems) => {
              if (!state.resources || !session || !rng) return;
              spawnEmeraldBurst(
                {
                  battle: state,
                  state: state.resources,
                  config: session,
                  rng,
                  tick: this.clock.tick,
                  schedule: (timer, scheduledTick) => enqueue({ payload: timer, scheduledTick, causalDepth: 0 }),
                },
                cell,
                ownerId,
                amount,
                itemCount,
                spawnAsItems,
              );
            },
          },
          command,
          event.id,
          enemy => enqueueEnemyReward(state, enqueue, this.clock.tick, enemy),
        );
        if (state.abilities.outcome?.eventId === event.id && state.abilities.outcome.status === 'APPLIED') {
          this.pendingCheckpointReason = 'activate-ability';
        }
        if (state.waves && waveSession && !isBattleTerminal(state)) {
          checkWaveCompletion(this.waveContext(state, rng, this.clock.tick, enqueue));
        }
        return;
      }
      if (command.type === 'wave-start' || command.type === 'wave-spawn') {
        if (!state.waves || !waveSession || !combatSession) throw new Error('Wave session unavailable');
        const wasStarted = command.type === 'wave-start' && state.waves.startedWaves.has(command.waveIndex);
        applyWaveEvent(this.waveContext(state, rng, this.clock.tick, enqueue), command);
        if (command.type === 'wave-start' && !wasStarted && state.waves.startedWaves.has(command.waveIndex)) {
          this.pendingCheckpointReason = 'wave-start';
        }
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
      if (
        command.type === 'summon' &&
        state.resources.outcome?.eventId === event.id &&
        state.resources.outcome.status === 'APPLIED'
      ) {
        if (state.combat && combatSession) {
          registerCombatEntity(state, combatSession, state.nextEntityId - 1n);
        }
        this.pendingCheckpointReason = 'summon';
      }
      if (
        command.type === 'move-defender' &&
        state.resources.outcome?.eventId === event.id &&
        state.resources.outcome.status === 'APPLIED'
      ) {
        this.pendingCheckpointReason = 'manual';
      }
      if (
        command.type === 'wave-reward' &&
        state.resources.outcome?.eventId === event.id &&
        state.resources.outcome.status === 'APPLIED'
      ) {
        this.pendingCheckpointReason = 'wave-reward';
      }
      if (state.resources.terminal) {
        this.markTerminal(state, state.resources.terminal);
      }
    });
    this.scheduler = new EventScheduler(this.engine);

    if (_initialCheckpoint) {
      this.engine.restore({
        state: _initialCheckpoint.state,
        queue: _initialCheckpoint.queue as QueueSnapshot<BattleEvent>,
        rng: _initialCheckpoint.rng,
      });
      this.clock.restore({
        tick: _initialCheckpoint.tick,
        paused: _initialCheckpoint.paused,
        accumulatorMs: _initialCheckpoint.accumulatorMs,
      });
      this.scheduler.restore(_initialCheckpoint.tick);
      this.paused = _initialCheckpoint.paused;
      this.terminal = isBattleTerminal(_initialCheckpoint.state);
      this.terminalRecorded = this.terminal;
      this.pendingCheckpointReason = null;
      return;
    }

    if (session || waveSession) {
      if (session) {
        this.engine.enqueue({ payload: { type: 'initialize' }, scheduledTick: 0, causalDepth: 0 }, 0);
        for (const starter of session.startingDefenders) {
          this.engine.enqueue({
            payload: {
              type: 'add',
              entity: {
                kind: 'defender',
                definitionId: starter.definitionId,
                cell: { row: starter.row, column: starter.column },
              },
            },
            scheduledTick: 0,
            causalDepth: 0,
          }, 0);
        }
      }
      if (waveSession) {
        this.engine.enqueue({
          payload: { type: 'wave-start', waveIndex: 0 },
          scheduledTick: waveDeadline(waveSession.waves[0].initialDelaySeconds, config.ticksPerSecond, 0),
          causalDepth: 0,
        }, 0);
      }
      this.scheduler.runTick(0);
      this.pendingCheckpointReason = null;
      if (this.engine.failed) {
        throw new Error(session ? 'Resource session initialization failed' : 'Wave session initialization failed');
      }
    }

    if (!this.engine.failed && !this.terminal && this.checkpointManager && this.autoCheckpoint) {
      this.captureCheckpointInternal('tick-0');
    } else if (this.terminal) {
      this.handleTerminalCommitted();
    }
  }

  private semanticContext(): CheckpointSemanticContext {
    return {
      tickDurationMs: this.clock.tickDurationMs,
      ...(this.resourceSession ? { resourceSession: this.resourceSession } : {}),
      ...(this.combatSession ? { combatSession: this.combatSession } : {}),
      ...(this.fusionSession ? { fusionSession: this.fusionSession } : {}),
      ...(this.waveSession ? { waveSession: this.waveSession } : {}),
      ...(this.abilitySession ? { abilitySession: this.abilitySession } : {}),
    };
  }

  private captureCheckpointInternal(reason: CheckpointTriggerReason): CheckpointRecord {
    const checkpointId = `cp_${this.battleGeneration}_${++this.checkpointCounter}`;
    const { state, queue, rng } = this.engine.snapshot();
    const input = {
      checkpointId,
      battleId: this.battleId,
      battleGeneration: this.battleGeneration,
      tick: this.clock.tick,
      paused: this.paused,
      accumulatorMs: this.clock.accumulator,
      reason,
      ...(this.levelId !== undefined ? { levelId: this.levelId } : {}),
      state,
      queue,
      rng,
    };
    const ctx = this.semanticContext();
    if (this.checkpointManager) {
      return this.checkpointManager.acceptCheckpoint(input, ctx);
    }
    const { envelope, json } = serializeBattleCheckpoint(input);
    deserializeBattleCheckpoint(json, ctx);
    return {
      checkpointId: envelope.checkpointId,
      tick: envelope.tick,
      battleGeneration: envelope.battleGeneration,
      paused: envelope.paused,
      queueNextSequence: queue.nextSequence,
      reason: envelope.reason,
      checksum: envelope.checksum,
      json,
    };
  }

  private applyDecodedCheckpoint(decoded: DecodedBattleCheckpoint): void {
    const nextGeneration = Math.max(decoded.battleGeneration + 1, this.battleGeneration + 1);
    this.engine.restore({
      state: decoded.state,
      queue: decoded.queue as QueueSnapshot<BattleEvent>,
      rng: decoded.rng,
    });
    this.clock.restore({
      tick: decoded.tick,
      paused: decoded.paused,
      accumulatorMs: decoded.accumulatorMs,
    });
    this.scheduler.restore(decoded.tick);
    this.battleGeneration = nextGeneration;
    this.paused = decoded.paused;
    this.terminal = isBattleTerminal(decoded.state);
    this.terminalRecorded = this.terminal;
    this.pendingCheckpointReason = null;
  }

  private handleTerminalCommitted(): void {
    if (!this.terminal || this.terminalRecorded || this.engine.failed) return;
    this.terminalRecorded = true;
    this.checkpointManager?.clearPersistentSave();
    if (!this.progressionStore) return;
    const { state } = this.engine.snapshot();
    const result = state.resources?.terminal ?? state.combat?.terminal ?? state.waves?.terminal;
    if (result !== 'victory' && result !== 'defeat') return;
    this.progressionStore.recordBattleOutcome({
      battleId: this.battleId,
      result,
      enemiesKilled: state.matchKills ?? 0,
      ...(this.levelId !== undefined ? { levelId: this.levelId } : {}),
    });
  }

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

  enqueue(
    command: BattleCommand | ResourceCommand | CombatCommand | FusionCommand | WaveEvent | AbilityCommand,
    scheduledTick: number,
    options?: { readonly generation?: number },
  ) {
    if (this.recovering) {
      return { status: 'REJECTED', reason: 'recovering' } as const;
    }
    if (options?.generation !== undefined && options.generation !== this.battleGeneration) {
      return { status: 'REJECTED', reason: 'stale-generation' } as const;
    }
    if (
      this.terminal ||
      (this.paused &&
        (command.type === 'collect' ||
          command.type === 'claim' ||
          command.type === 'claim-village-chest' ||
          command.type === 'fuse' ||
          command.type === 'summon-fuse' ||
          command.type === 'move-defender' ||
          command.type === 'activate-ability'))
    ) {
      return { status: 'REJECTED', reason: this.terminal ? 'terminal' : 'paused' } as const;
    }
    return this.engine.enqueue({ payload: command, scheduledTick, causalDepth: 0 }, this.clock.tick);
  }

  setPaused(paused: boolean): void {
    if (this.recovering) return;
    const wasPaused = this.paused;
    this.paused = paused || this.engine.failed || this.terminal;
    this.clock.setPaused(this.paused);
    if (
      !wasPaused &&
      this.paused &&
      !this.engine.failed &&
      !this.terminal &&
      this.checkpointManager &&
      this.autoCheckpoint
    ) {
      this.captureCheckpointInternal('pause');
    }
  }

  /** Capture and validate an immutable checkpoint at the current committed boundary. */
  createCheckpoint(reason: CheckpointTriggerReason = 'manual'): CheckpointRecord {
    if (this.engine.failed) {
      throw new Error('Cannot create checkpoint from a failed battle state');
    }
    if (this.recovering) {
      throw new Error('Cannot create checkpoint while recovering');
    }
    return this.captureCheckpointInternal(reason);
  }

  /** Atomically validate and restore a checkpoint JSON string, incrementing battleGeneration. */
  restoreCheckpoint(rawJson: string): CheckpointRestoreResult {
    if (this.recovering) {
      throw new Error('Recovery is already in progress');
    }
    this.recovering = true;
    try {
      const decoded = deserializeBattleCheckpoint(rawJson, this.semanticContext());
      this.applyDecodedCheckpoint(decoded);
      return {
        status: 'RESTORED',
        checkpointId: decoded.checkpointId,
        tick: decoded.tick,
        battleGeneration: this.battleGeneration,
      };
    } finally {
      this.recovering = false;
    }
  }

  /** Recover newest-first from the 3-slot RAM buffer or primary/.bak storage, discarding uncommitted work. */
  recover(): BattleRecoveryResult {
    if (this.recovering) {
      throw new Error('Recovery is already in progress');
    }
    this.recovering = true;
    try {
      const match = this.checkpointManager?.findNewestValidCheckpoint(this.semanticContext());
      if (!match) {
        return { status: 'FAILED', reason: 'no-valid-checkpoint' };
      }
      this.applyDecodedCheckpoint(match.decoded);
      return {
        status: 'RECOVERED',
        checkpointId: match.decoded.checkpointId,
        tick: match.decoded.tick,
        battleGeneration: this.battleGeneration,
        source: match.source,
      };
    } finally {
      this.recovering = false;
    }
  }

  /** Return shallow copies of buffered RAM checkpoints ordered newest-first. */
  getCheckpoints(): CheckpointRecord[] {
    return this.checkpointManager?.getCheckpoints() ?? [];
  }

  /** Return persistence metadata without altering snapshot() backward compatibility. */
  getPersistenceMeta(): BattlePersistenceMeta {
    const { state } = this.engine.snapshot();
    return {
      battleId: this.battleId,
      battleGeneration: this.battleGeneration,
      matchKills: state.matchKills ?? 0,
      recovering: this.recovering,
      checkpointCount: this.checkpointManager?.getCheckpoints().length ?? 0,
    };
  }

  advance(elapsedMs: number): number {
    if (this.recovering || this.engine.failed || this.terminal) return 0;
    return this.clock.advance(elapsedMs, tick => {
      this.pendingCheckpointReason = null;
      if (this.combatSession && !this.terminal && !this.engine.failed) {
        this.engine.executePhase(tick, ({ state, rng, enqueue }) => {
          if (!state.combat) return;
          const enqueueReward = (enemy: AbilityRewardEnemy) => enqueueEnemyReward(state, enqueue, tick, enemy);
          if (state.abilities && this.abilitySession) {
            stepAbilityTickPhase(
              {
                battle: state,
                combat: state.combat,
                session: this.combatSession!,
                abilitySession: this.abilitySession,
              },
              enqueueReward,
            );
          }
          runCombatPhase({
            battle: state,
            combat: state.combat,
            session: this.combatSession!,
            abilitySession: this.abilitySession,
            tick,
            enqueueReward,
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
          this.handleTerminalCommitted();
          this.pendingCheckpointReason = null;
          return;
        }
      }
      this.scheduler.runTick(tick);
      if (this.engine.failed || this.terminal) {
        this.setPaused(true);
        this.handleTerminalCommitted();
        this.pendingCheckpointReason = null;
        return;
      }
      if (this.checkpointManager && this.autoCheckpoint && !this.recovering) {
        if (this.pendingCheckpointReason) {
          this.captureCheckpointInternal(this.pendingCheckpointReason);
        } else if (tick > 0 && tick % 60 === 0) {
          this.captureCheckpointInternal('periodic-60');
        }
      }
      this.pendingCheckpointReason = null;
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
      ...(this.hasAbilities && state.abilities ? { abilities: state.abilities } : {}),
    };
  }
}
