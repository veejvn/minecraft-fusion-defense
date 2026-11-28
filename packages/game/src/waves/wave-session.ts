import { isLane } from '../battlefield/grid';
import type { CombatSession } from '../combat/combat-session';
import { count, type ResourceSession } from '../core/resource-session';

export const REQUIRED_GRASSLAND_WAVE_COUNT = 5;

export type LaneSelectionMode = 'fixed' | 'sequential' | 'random';

export interface SpawnGroupDefinition {
  readonly enemyId: string;
  readonly count: number;
  readonly allowedLanes: readonly number[];
  readonly laneMode: LaneSelectionMode;
  readonly startOffsetSeconds: number;
  readonly intervalSeconds: number;
}

export interface WaveConfigDefinition {
  readonly id: string;
  readonly initialDelaySeconds: number;
  readonly delayBeforeNextWaveSeconds: number;
  readonly spawnGroups: readonly SpawnGroupDefinition[];
}

export interface WaveSessionInput {
  readonly levelId: string;
  readonly waveCount: number;
  readonly waves: readonly WaveConfigDefinition[];
  readonly seed?: number;
}

export interface ValidatedWaveDefinition extends WaveConfigDefinition {
  readonly totalSpawns: number;
}

const STABLE_ID_PATTERN = /^[a-z][a-z0-9_]*$/;
const LANE_SELECTION_MODES = new Set<LaneSelectionMode>(['fixed', 'sequential', 'random']);

function freezeData<T extends object>(value: T): T {
  for (const field of Object.values(value)) {
    if (field && typeof field === 'object') freezeData(field);
  }
  return Object.freeze(value);
}

/** Convert a nonnegative wave delay in seconds into a deterministic target tick. */
export function waveDeadline(seconds: number, rate: number, origin = 0): number {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds < 0) {
    throw new RangeError('Expected nonnegative finite wave delay seconds');
  }
  if (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) {
    throw new RangeError('Expected positive finite tick rate');
  }
  const baseTick = count(origin);
  if (seconds === 0) return baseTick;
  const offset = count(Math.ceil(seconds * rate));
  return count(baseTick + offset);
}

function validateSpawnGroup(
  group: SpawnGroupDefinition,
  rate: number,
  combatSession: CombatSession,
): boolean {
  if (!group || typeof group !== 'object' || Array.isArray(group)) {
    throw new TypeError('Invalid spawn group definition');
  }
  if (typeof group.enemyId !== 'string' || !(group.enemyId in combatSession.enemiesById)) {
    throw new TypeError(`Unknown spawn group enemy: ${String(group.enemyId)}`);
  }
  if (typeof group.count !== 'number' || !Number.isSafeInteger(group.count) || group.count < 1) {
    throw new RangeError('Expected positive safe integer spawn count');
  }

  waveDeadline(group.startOffsetSeconds, rate);
  waveDeadline(group.intervalSeconds, rate);
  waveDeadline(group.startOffsetSeconds + (group.count - 1) * group.intervalSeconds, rate);

  if (typeof group.laneMode !== 'string' || !LANE_SELECTION_MODES.has(group.laneMode as LaneSelectionMode)) {
    throw new TypeError(`Unsupported lane selection mode: ${String(group.laneMode)}`);
  }
  if (!Array.isArray(group.allowedLanes)) {
    throw new TypeError('Expected allowedLanes array');
  }
  if (group.allowedLanes.length === 0) {
    throw new RangeError('allowedLanes must not be empty');
  }

  const seenLanes = new Set<number>();
  for (const lane of group.allowedLanes) {
    if (!isLane(lane) || seenLanes.has(lane)) {
      throw new RangeError('Invalid or duplicate allowed lane');
    }
    seenLanes.add(lane);
  }

  if (group.laneMode === 'fixed' && group.allowedLanes.length !== 1) {
    throw new RangeError('Fixed lane mode requires exactly one allowed lane');
  }

  return group.laneMode === 'random';
}

/** Validate and freeze level wave schedules, lane rules, and cross-session references before battle start. */
export function validateWaveSession(
  input: WaveSessionInput,
  rate: number,
  combatSession: CombatSession | undefined,
  resourceSession?: ResourceSession,
) {
  if (!combatSession) throw new TypeError('Wave session requires a combat session');
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError('Missing wave session input');
  }
  if (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) {
    throw new RangeError('Expected positive finite tick rate');
  }

  const config = structuredClone(input);
  if (typeof config.levelId !== 'string' || !STABLE_ID_PATTERN.test(config.levelId)) {
    throw new TypeError('Invalid level ID');
  }
  if (config.levelId === 'grassland') {
    if (
      config.waveCount !== REQUIRED_GRASSLAND_WAVE_COUNT ||
      !Array.isArray(config.waves) ||
      config.waves.length !== REQUIRED_GRASSLAND_WAVE_COUNT
    ) {
      throw new RangeError('Grassland level requires exactly 5 waves');
    }
  } else if (
    !Array.isArray(config.waves) ||
    config.waves.length < 1 ||
    config.waveCount !== config.waves.length
  ) {
    throw new RangeError('Level requires at least 1 wave matching waveCount');
  }

  const seenWaveIds = new Set<string>();
  const enrichedWaves: ValidatedWaveDefinition[] = [];
  let usesRandomLane = false;

  for (const wave of config.waves) {
    if (
      !wave ||
      typeof wave !== 'object' ||
      Array.isArray(wave) ||
      typeof wave.id !== 'string' ||
      !STABLE_ID_PATTERN.test(wave.id) ||
      seenWaveIds.has(wave.id)
    ) {
      throw new TypeError('Invalid or duplicate wave ID');
    }
    seenWaveIds.add(wave.id);

    waveDeadline(wave.initialDelaySeconds, rate);
    waveDeadline(wave.delayBeforeNextWaveSeconds, rate);

    if (!Array.isArray(wave.spawnGroups) || wave.spawnGroups.length === 0) {
      throw new RangeError(`Wave requires at least one spawn group: ${wave.id}`);
    }

    let totalSpawns = 0;
    for (const group of wave.spawnGroups) {
      if (validateSpawnGroup(group, rate, combatSession)) {
        usesRandomLane = true;
      }
      totalSpawns = count(totalSpawns + group.count);
    }

    enrichedWaves.push({
      id: wave.id,
      initialDelaySeconds: wave.initialDelaySeconds,
      delayBeforeNextWaveSeconds: wave.delayBeforeNextWaveSeconds,
      spawnGroups: wave.spawnGroups,
      totalSpawns,
    });
  }

  if (resourceSession) {
    const resourceWaveIds = new Set(resourceSession.waves.map(entry => entry.id));
    for (const wave of enrichedWaves) {
      if (!resourceWaveIds.has(wave.id)) {
        throw new TypeError(`Missing resource reward definition for wave: ${wave.id}`);
      }
    }
  }

  if (config.seed !== undefined) {
    if (count(config.seed) > 0xffffffff) throw new RangeError('Wave seed must be uint32');
    if (resourceSession && config.seed !== resourceSession.seed) {
      throw new RangeError('Wave seed conflicts with resource session seed');
    }
  }
  if (usesRandomLane && !resourceSession && config.seed === undefined) {
    throw new RangeError('Random lane selection requires a uint32 seed');
  }

  return freezeData({
    levelId: config.levelId,
    waveCount: config.waveCount,
    rate,
    seed: resourceSession ? resourceSession.seed : config.seed,
    waves: enrichedWaves as readonly ValidatedWaveDefinition[],
  });
}

export type WaveSession = ReturnType<typeof validateWaveSession>;
