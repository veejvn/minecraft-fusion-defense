import type { CombatSession } from '../combat/combat-session';
import { registerCombatEntity } from '../combat/combat-state';
import { applyBattleCommand, type BattleState } from '../core/battle-state';
import { uniformIndex, type ResourceRng } from '../core/resource-rng';
import { count } from '../core/resource-session';
import { waveDeadline, type SpawnGroupDefinition, type WaveSession } from './wave-session';
import type { WaveEvent, WaveState } from './wave-state';

type BattleStateWithWaves = BattleState & { readonly waves?: WaveState };

export interface WaveEventContext {
  readonly battle: BattleState;
  readonly waves: WaveState;
  readonly session: WaveSession;
  readonly combatSession: CombatSession;
  readonly rng: ResourceRng | null;
  readonly tick: number;
  readonly scheduleWave: (event: WaveEvent, scheduledTick: number) => void;
  readonly enqueueWaveReward: (waveId: string, scheduledTick: number) => void;
  readonly enqueueVictory: (scheduledTick: number) => void;
}

/** Return true once any battle subsystem has recorded a terminal victory or defeat. */
export function isBattleTerminal(battle: BattleState): boolean {
  return Boolean(
    battle.resources?.terminal ||
    battle.combat?.terminal ||
    (battle as BattleStateWithWaves).waves?.terminal,
  );
}

/** Count currently living enemy entities on the battlefield. */
export function countLivingEnemies(battle: BattleState): number {
  let living = 0;
  for (const entity of battle.entities.values()) {
    if (entity.kind === 'enemy') living++;
  }
  return living;
}

/** Complete the active wave if all planned enemies have spawned and none remain alive. */
export function checkWaveCompletion(
  ctx: Pick<
    WaveEventContext,
    'battle' | 'waves' | 'session' | 'tick' | 'scheduleWave' | 'enqueueWaveReward' | 'enqueueVictory'
  >,
): boolean {
  if (isBattleTerminal(ctx.battle) || ctx.waves.terminal !== null) return false;
  const w = ctx.waves.currentWaveIndex;
  if (w === null || ctx.waves.completedWaves.has(w)) return false;
  if (ctx.waves.spawnedInCurrentWave < ctx.waves.plannedInCurrentWave) return false;
  if (countLivingEnemies(ctx.battle) > 0) return false;

  ctx.waves.completedWaves.add(w);
  const wave = ctx.session.waves[w];
  if (ctx.battle.resources) {
    ctx.enqueueWaveReward(wave.id, ctx.tick);
  }

  if (w < ctx.session.waves.length - 1) {
    ctx.waves.status = 'between-waves';
    ctx.scheduleWave(
      { type: 'wave-start', waveIndex: w + 1 },
      waveDeadline(wave.delayBeforeNextWaveSeconds, ctx.session.rate, ctx.tick),
    );
  } else {
    ctx.waves.status = 'completed';
    ctx.enqueueVictory(ctx.tick);
  }
  return true;
}

function resolveSpawnLane(
  group: SpawnGroupDefinition,
  spawnIndex: number,
  rng: ResourceRng | null,
): number {
  switch (group.laneMode) {
    case 'fixed':
      return group.allowedLanes[0];
    case 'sequential':
      return group.allowedLanes[spawnIndex % group.allowedLanes.length];
    case 'random':
      if (!rng) throw new Error('RNG unavailable for random lane selection');
      return group.allowedLanes[uniformIndex(rng, group.allowedLanes.length)];
    default:
      throw new TypeError(`Unsupported lane selection mode: ${String(group.laneMode)}`);
  }
}

/** Apply a deterministic wave start or enemy spawn event inside staged battle state. */
export function applyWaveEvent(ctx: WaveEventContext, event: WaveEvent): void {
  if (isBattleTerminal(ctx.battle) || ctx.waves.terminal !== null) return;

  switch (event.type) {
    case 'wave-start': {
      if (
        !Number.isSafeInteger(event.waveIndex) ||
        event.waveIndex < 0 ||
        event.waveIndex >= ctx.session.waves.length
      ) {
        throw new RangeError('Wave index out of bounds');
      }
      if (ctx.waves.startedWaves.has(event.waveIndex)) return;

      const wave = ctx.session.waves[event.waveIndex];
      ctx.waves.startedWaves.add(event.waveIndex);
      ctx.waves.currentWaveIndex = event.waveIndex;
      ctx.waves.status = 'spawning';
      ctx.waves.spawnedInCurrentWave = 0;
      ctx.waves.plannedInCurrentWave = wave.totalSpawns;

      for (let groupIndex = 0; groupIndex < wave.spawnGroups.length; groupIndex++) {
        const group = wave.spawnGroups[groupIndex];
        for (let spawnIndex = 0; spawnIndex < group.count; spawnIndex++) {
          const offsetSeconds = group.startOffsetSeconds + spawnIndex * group.intervalSeconds;
          const scheduledTick = waveDeadline(offsetSeconds, ctx.session.rate, ctx.tick);
          ctx.scheduleWave(
            { type: 'wave-spawn', waveIndex: event.waveIndex, groupIndex, spawnIndex },
            scheduledTick,
          );
        }
      }
      return;
    }
    case 'wave-spawn': {
      if (
        !Number.isSafeInteger(event.waveIndex) ||
        event.waveIndex < 0 ||
        event.waveIndex >= ctx.session.waves.length
      ) {
        throw new RangeError('Wave index out of bounds');
      }
      const wave = ctx.session.waves[event.waveIndex];
      if (
        !Number.isSafeInteger(event.groupIndex) ||
        event.groupIndex < 0 ||
        event.groupIndex >= wave.spawnGroups.length
      ) {
        throw new RangeError('Spawn group index out of bounds');
      }
      const group = wave.spawnGroups[event.groupIndex];
      if (
        !Number.isSafeInteger(event.spawnIndex) ||
        event.spawnIndex < 0 ||
        event.spawnIndex >= group.count
      ) {
        throw new RangeError('Spawn index out of bounds');
      }

      const key = `${event.waveIndex}:${event.groupIndex}:${event.spawnIndex}`;
      if (ctx.waves.processedSpawns.has(key)) return;
      if (event.waveIndex !== ctx.waves.currentWaveIndex) {
        throw new RangeError('Wave spawn does not match active wave');
      }

      const lane = resolveSpawnLane(group, event.spawnIndex, ctx.rng);
      const id = ctx.battle.nextEntityId;
      applyBattleCommand(ctx.battle, {
        type: 'add',
        entity: {
          kind: 'enemy',
          definitionId: group.enemyId,
          lane,
          position: ctx.combatSession.spawnX,
        },
      });
      registerCombatEntity(ctx.battle, ctx.combatSession, id);

      ctx.waves.processedSpawns.add(key);
      ctx.waves.spawnedInCurrentWave = count(ctx.waves.spawnedInCurrentWave + 1);
      if (ctx.waves.spawnedInCurrentWave === ctx.waves.plannedInCurrentWave) {
        ctx.waves.status = 'active';
      }
      return;
    }
    default:
      throw new TypeError('Unknown wave event');
  }
}
