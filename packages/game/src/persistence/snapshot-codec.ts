import type { AbilitySession } from '../abilities/ability-session';
import type {
  AbilityState,
  ActiveMultihitCadence,
  ActiveProjectile,
  ActiveRedirectAura,
  ActiveShieldInstance,
  ActiveStatusInstance,
} from '../abilities/ability-state';
import { BATTLEFIELD_COLUMNS, BATTLEFIELD_ROWS, cellIndex, isLane, type Cell } from '../battlefield/grid';
import type { CombatSession } from '../combat/combat-session';
import type { CombatEntityState, CombatState } from '../combat/combat-state';
import type { ResourceState } from '../core/battle-resources';
import type { BattleState } from '../core/battle-state';
import type { ResourceRng } from '../core/resource-rng';
import type { ResourceSession } from '../core/resource-session';
import { EventQueue, type QueueSnapshot } from '../events/event-queue';
import type { FusionSession } from '../fusion/fusion-session';
import type { FusionState } from '../fusion/fusion-state';
import type { WaveSession } from '../waves/wave-session';
import type { WavePhaseStatus, WaveState } from '../waves/wave-state';

export const SAVE_SCHEMA_VERSION = 1;

export type SnapshotValidationErrorCode =
  | 'INVALID_JSON'
  | 'INVALID_ENVELOPE'
  | 'UNSUPPORTED_VERSION'
  | 'CHECKSUM_MISMATCH'
  | 'INVALID_PAYLOAD'
  | 'SEMANTIC_VIOLATION';

/** Typed fail-closed error thrown when checkpoint decoding, checksum, or semantic checks fail. */
export class SnapshotValidationError extends Error {
  readonly code: SnapshotValidationErrorCode;

  constructor(code: SnapshotValidationErrorCode, message: string) {
    super(message);
    this.name = 'SnapshotValidationError';
    this.code = code;
  }
}

export type CheckpointTriggerReason =
  | 'tick-0'
  | 'periodic-60'
  | 'summon'
  | 'fuse'
  | 'activate-ability'
  | 'wave-start'
  | 'wave-reward'
  | 'pause'
  | 'manual';

export type BattleStateWithMatchKills = BattleState & { matchKills?: number };

export interface BattleCheckpointPayload {
  readonly state: BattleStateWithMatchKills;
  readonly queue: QueueSnapshot<unknown>;
  readonly rng: ResourceRng | null;
}

export interface BattleCheckpointEnvelope {
  readonly schemaVersion: number;
  readonly checkpointId: string;
  readonly battleId: string;
  readonly battleGeneration: number;
  readonly tick: number;
  readonly paused: boolean;
  readonly accumulatorMs: number;
  readonly reason: CheckpointTriggerReason;
  readonly levelId?: string;
  readonly checksum: string;
  readonly payload: unknown;
}

export interface SerializeBattleCheckpointInput {
  readonly checkpointId: string;
  readonly battleId: string;
  readonly battleGeneration: number;
  readonly tick: number;
  readonly paused: boolean;
  readonly accumulatorMs: number;
  readonly reason: CheckpointTriggerReason;
  readonly levelId?: string;
  readonly state: BattleStateWithMatchKills;
  readonly queue: QueueSnapshot<unknown>;
  readonly rng: ResourceRng | null;
}

export interface SerializedBattleCheckpoint {
  readonly envelope: BattleCheckpointEnvelope;
  readonly json: string;
}

export interface CheckpointSemanticContext {
  readonly tickDurationMs?: number;
  readonly resourceSession?: ResourceSession;
  readonly combatSession?: CombatSession;
  readonly fusionSession?: FusionSession;
  readonly waveSession?: WaveSession;
  readonly abilitySession?: AbilitySession;
}

export interface DecodedBattleCheckpoint {
  readonly schemaVersion: number;
  readonly checkpointId: string;
  readonly battleId: string;
  readonly battleGeneration: number;
  readonly tick: number;
  readonly paused: boolean;
  readonly accumulatorMs: number;
  readonly reason: CheckpointTriggerReason;
  readonly levelId?: string;
  readonly state: BattleStateWithMatchKills;
  readonly queue: QueueSnapshot<unknown>;
  readonly rng: ResourceRng | null;
}

export type CheckpointMigrationFn = (raw: Record<string, unknown>) => Record<string, unknown>;

const VALID_TRIGGER_REASONS = new Set<CheckpointTriggerReason>([
  'tick-0',
  'periodic-60',
  'summon',
  'fuse',
  'activate-ability',
  'wave-start',
  'wave-reward',
  'pause',
  'manual',
]);

const FORBIDDEN_OBJECT_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const VALID_TERMINAL_RESULTS = new Set(['victory', 'defeat']);
const VALID_WAVE_STATUSES = new Set<WavePhaseStatus>([
  'pending',
  'spawning',
  'active',
  'between-waves',
  'completed',
]);
const VALID_STATUS_KINDS = new Set<ActiveStatusInstance['kind']>([
  'slow',
  'stun',
  'freeze',
  'burn',
  'buff',
  'vulnerable',
]);
const VALID_DAMAGE_TYPES = new Set(['physical', 'fire', 'ice']);
const EXPECTED_OCCUPANCY_LENGTH = BATTLEFIELD_ROWS * BATTLEFIELD_COLUMNS;
const FNV1A_OFFSET_BASIS = 0x811c9dc5;
const FNV1A_PRIME = 0x01000193;

const DEFAULT_CHECKPOINT_MIGRATIONS: Readonly<Record<number, CheckpointMigrationFn>> = {};

/** Compute a deterministic 8-character lowercase FNV-1a 32-bit hex digest without Node-only crypto. */
export function computeFnv1aHex(input: string): string {
  let hash = FNV1A_OFFSET_BASIS;
  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i);
    hash ^= code & 0xff;
    hash = Math.imul(hash, FNV1A_PRIME);
    if (code > 0xff) {
      hash ^= code >>> 8;
      hash = Math.imul(hash, FNV1A_PRIME);
    }
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function assertSafeObjectKeys(obj: Record<string, unknown>): string[] {
  const keys = Object.getOwnPropertyNames(obj);
  for (const key of keys) {
    if (FORBIDDEN_OBJECT_KEYS.has(key)) {
      throw new SnapshotValidationError('INVALID_PAYLOAD', `Forbidden object key "${key}"`);
    }
  }
  return keys;
}

/** Encode arbitrary deterministic runtime state into canonical tagged JSON-safe structures. */
export function encodeCanonicalValue(value: unknown, seen = new WeakSet<object>()): unknown {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new SnapshotValidationError('INVALID_PAYLOAD', 'Non-finite number cannot be serialized');
    }
    return Object.is(value, -0) ? 0 : value;
  }
  if (typeof value === 'bigint') {
    return { __t: 'bi', v: value.toString(10) };
  }
  if (typeof value !== 'object') {
    throw new SnapshotValidationError('INVALID_PAYLOAD', `Unsupported value type "${typeof value}"`);
  }
  if (seen.has(value)) {
    throw new SnapshotValidationError('INVALID_PAYLOAD', 'Circular reference in snapshot payload');
  }
  seen.add(value);
  try {
    if (Array.isArray(value)) {
      const encoded: unknown[] = [];
      for (let i = 0; i < value.length; i++) {
        if (!(i in value) || value[i] === undefined) {
          throw new SnapshotValidationError('INVALID_PAYLOAD', `Sparse or undefined array slot at index ${i}`);
        }
        encoded.push(encodeCanonicalValue(value[i], seen));
      }
      return encoded;
    }
    if (value instanceof Map) {
      const entries: [unknown, unknown][] = [];
      for (const [k, v] of value.entries()) {
        if (k === undefined || v === undefined) {
          throw new SnapshotValidationError('INVALID_PAYLOAD', 'Undefined Map key or value in snapshot');
        }
        entries.push([encodeCanonicalValue(k, seen), encodeCanonicalValue(v, seen)]);
      }
      return { __t: 'map', entries };
    }
    if (value instanceof Set) {
      const values: unknown[] = [];
      for (const item of value.values()) {
        if (item === undefined) {
          throw new SnapshotValidationError('INVALID_PAYLOAD', 'Undefined Set element in snapshot');
        }
        values.push(encodeCanonicalValue(item, seen));
      }
      return { __t: 'set', values };
    }
    if (!isPlainRecord(value)) {
      throw new SnapshotValidationError('INVALID_PAYLOAD', 'Unsupported non-plain object in snapshot');
    }
    const keys = assertSafeObjectKeys(value).sort();
    const out: Record<string, unknown> = {};
    for (const key of keys) {
      if (key === '__t') {
        throw new SnapshotValidationError('INVALID_PAYLOAD', 'Reserved "__t" key in plain object');
      }
      const field = value[key];
      if (field !== undefined) {
        out[key] = encodeCanonicalValue(field, seen);
      }
    }
    return out;
  } finally {
    seen.delete(value);
  }
}

/** Decode canonical tagged JSON back into runtime structures with strict tagged validation. */
export function decodeCanonicalValue(value: unknown): unknown {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new SnapshotValidationError('INVALID_PAYLOAD', 'Non-finite number in snapshot payload');
    }
    return value;
  }
  if (typeof value !== 'object') {
    throw new SnapshotValidationError('INVALID_PAYLOAD', `Invalid value type "${typeof value}" in payload`);
  }
  if (Array.isArray(value)) {
    const out: unknown[] = [];
    for (let i = 0; i < value.length; i++) {
      if (!(i in value) || value[i] === undefined) {
        throw new SnapshotValidationError('INVALID_PAYLOAD', `Invalid array element at index ${i}`);
      }
      out.push(decodeCanonicalValue(value[i]));
    }
    return out;
  }
  if (!isPlainRecord(value)) {
    throw new SnapshotValidationError('INVALID_PAYLOAD', 'Invalid object prototype in payload');
  }
  const keys = assertSafeObjectKeys(value);
  if (Object.prototype.hasOwnProperty.call(value, '__t')) {
    const tag = value.__t;
    if (tag === 'bi') {
      if (keys.length !== 2 || typeof value.v !== 'string' || !/^-?\d+$/.test(value.v)) {
        throw new SnapshotValidationError('INVALID_PAYLOAD', 'Malformed bigint tag in payload');
      }
      return BigInt(value.v);
    }
    if (tag === 'map') {
      if (keys.length !== 2 || !Array.isArray(value.entries)) {
        throw new SnapshotValidationError('INVALID_PAYLOAD', 'Malformed map tag in payload');
      }
      const map = new Map<unknown, unknown>();
      for (const entry of value.entries) {
        if (!Array.isArray(entry) || entry.length !== 2) {
          throw new SnapshotValidationError('INVALID_PAYLOAD', 'Malformed map entry in payload');
        }
        map.set(decodeCanonicalValue(entry[0]), decodeCanonicalValue(entry[1]));
      }
      return map;
    }
    if (tag === 'set') {
      if (keys.length !== 2 || !Array.isArray(value.values)) {
        throw new SnapshotValidationError('INVALID_PAYLOAD', 'Malformed set tag in payload');
      }
      const set = new Set<unknown>();
      for (const item of value.values) {
        set.add(decodeCanonicalValue(item));
      }
      return set;
    }
    throw new SnapshotValidationError('INVALID_PAYLOAD', `Unknown type tag "${String(tag)}"`);
  }

  const out: Record<string, unknown> = {};
  for (const key of keys) {
    out[key] = decodeCanonicalValue(value[key]);
  }
  return out;
}

function buildChecksumInput(
  header: Omit<BattleCheckpointEnvelope, 'checksum' | 'payload'>,
  payload: unknown,
): string {
  return JSON.stringify({
    schemaVersion: header.schemaVersion,
    checkpointId: header.checkpointId,
    battleId: header.battleId,
    battleGeneration: header.battleGeneration,
    tick: header.tick,
    paused: header.paused,
    accumulatorMs: header.accumulatorMs,
    reason: header.reason,
    ...(header.levelId !== undefined ? { levelId: header.levelId } : {}),
    payload,
  });
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isNonNegativeSafeInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function isPositiveSafeInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 1;
}

function isNonNegativeBigInt(value: unknown): value is bigint {
  return typeof value === 'bigint' && value >= 0n;
}

function assertSemantic(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new SnapshotValidationError('SEMANTIC_VIOLATION', message);
  }
}

function validateHeaderFields(
  header: {
    readonly checkpointId: unknown;
    readonly battleId: unknown;
    readonly battleGeneration: unknown;
    readonly tick: unknown;
    readonly paused: unknown;
    readonly accumulatorMs: unknown;
    readonly reason: unknown;
    readonly levelId?: unknown;
  },
  tickDurationMs?: number,
  errorCode: SnapshotValidationErrorCode = 'SEMANTIC_VIOLATION',
): void {
  const fail = (message: string): never => {
    throw new SnapshotValidationError(errorCode, message);
  };
  if (!isNonEmptyString(header.checkpointId)) fail('Invalid checkpointId');
  if (!isNonEmptyString(header.battleId)) fail('Invalid battleId');
  if (!isPositiveSafeInt(header.battleGeneration)) fail('battleGeneration must be a safe integer >= 1');
  if (!isNonNegativeSafeInt(header.tick)) fail('tick must be a nonnegative safe integer');
  if (typeof header.paused !== 'boolean') fail('paused must be a boolean');
  if (
    typeof header.accumulatorMs !== 'number' ||
    !Number.isFinite(header.accumulatorMs) ||
    header.accumulatorMs < 0
  ) {
    throw new SnapshotValidationError(errorCode, 'accumulatorMs must be a nonnegative finite number');
  }
  if (tickDurationMs !== undefined && header.accumulatorMs >= tickDurationMs) {
    throw new SnapshotValidationError(errorCode, 'accumulatorMs must be strictly less than tickDurationMs');
  }
  if (
    typeof header.reason !== 'string' ||
    !VALID_TRIGGER_REASONS.has(header.reason as CheckpointTriggerReason)
  ) {
    fail(`Invalid checkpoint reason: ${String(header.reason)}`);
  }
  if (header.levelId !== undefined && !isNonEmptyString(header.levelId)) {
    fail('Invalid levelId');
  }
}

/** Serialize deterministic BattleRuntime state into a versioned, checksummed JSON envelope. */
export function serializeBattleCheckpoint(
  input: SerializeBattleCheckpointInput,
): SerializedBattleCheckpoint {
  validateHeaderFields(input, undefined, 'INVALID_PAYLOAD');
  const normalizedState: BattleStateWithMatchKills = {
    ...input.state,
    matchKills: input.state.matchKills ?? 0,
  };
  const encodedPayload = encodeCanonicalValue({
    state: normalizedState,
    queue: input.queue,
    rng: input.rng,
  });
  const header = {
    schemaVersion: SAVE_SCHEMA_VERSION,
    checkpointId: input.checkpointId,
    battleId: input.battleId,
    battleGeneration: input.battleGeneration,
    tick: input.tick,
    paused: input.paused,
    accumulatorMs: Object.is(input.accumulatorMs, -0) ? 0 : input.accumulatorMs,
    reason: input.reason,
    ...(input.levelId !== undefined ? { levelId: input.levelId } : {}),
  };
  const checksum = computeFnv1aHex(buildChecksumInput(header, encodedPayload));
  const envelope: BattleCheckpointEnvelope = {
    ...header,
    checksum,
    payload: encodedPayload,
  };
  return {
    envelope,
    json: JSON.stringify(envelope),
  };
}

/**
 * Migrate a parsed checkpoint envelope up to `targetVersion`.
 * Rejects future or invalid schema versions fail-closed with `UNSUPPORTED_VERSION`.
 */
export function migrateBattleCheckpoint(
  raw: Record<string, unknown>,
  options?: {
    readonly targetVersion?: number;
    readonly migrations?: Readonly<Record<number, CheckpointMigrationFn>>;
  },
): Record<string, unknown> {
  const targetVersion = options?.targetVersion ?? SAVE_SCHEMA_VERSION;
  const migrations = options?.migrations ?? DEFAULT_CHECKPOINT_MIGRATIONS;
  const version = raw.schemaVersion;
  if (typeof version !== 'number' || !Number.isSafeInteger(version) || version < 1) {
    throw new SnapshotValidationError('UNSUPPORTED_VERSION', `Invalid schemaVersion: ${String(version)}`);
  }
  if (version > targetVersion) {
    throw new SnapshotValidationError(
      'UNSUPPORTED_VERSION',
      `Checkpoint schemaVersion ${version} is newer than supported version ${targetVersion}`,
    );
  }
  let current: Record<string, unknown> = raw;
  let currentVersion = version;
  while (currentVersion < targetVersion) {
    const migrate = migrations[currentVersion];
    if (!migrate) {
      throw new SnapshotValidationError(
        'UNSUPPORTED_VERSION',
        `Missing migration from schemaVersion ${currentVersion} to ${currentVersion + 1}`,
      );
    }
    current = migrate(current);
    currentVersion += 1;
    current = { ...current, schemaVersion: currentVersion };
  }
  return current;
}

function validateCellObject(cell: unknown, label: string): Cell {
  assertSemantic(isPlainRecord(cell), `${label} must be a cell object`);
  let index: number;
  try {
    index = cellIndex(cell as unknown as Cell);
  } catch {
    throw new SnapshotValidationError('SEMANTIC_VIOLATION', `${label} is outside the 5x9 battlefield`);
  }
  assertSemantic(index >= 0 && index < EXPECTED_OCCUPANCY_LENGTH, `${label} cell index out of range`);
  return cell as unknown as Cell;
}

function validateCoreBattleState(state: BattleStateWithMatchKills, ctx?: CheckpointSemanticContext): void {
  assertSemantic(isPlainRecord(state), 'state must be a plain object');
  assertSemantic(
    Array.isArray(state.occupancy) && state.occupancy.length === EXPECTED_OCCUPANCY_LENGTH,
    `state.occupancy must have length ${EXPECTED_OCCUPANCY_LENGTH}`,
  );
  assertSemantic(state.entities instanceof Map, 'state.entities must be a Map');
  assertSemantic(isNonNegativeBigInt(state.nextEntityId), 'state.nextEntityId must be a nonnegative bigint');

  if (state.matchKills === undefined) {
    state.matchKills = 0;
  } else {
    assertSemantic(isNonNegativeSafeInt(state.matchKills), 'state.matchKills must be a nonnegative safe integer');
  }

  for (let i = 0; i < state.occupancy.length; i++) {
    const slot = state.occupancy[i];
    assertSemantic(slot === null || isNonNegativeBigInt(slot), `occupancy[${i}] must be null or nonnegative bigint`);
  }

  for (const [id, entity] of state.entities.entries()) {
    assertSemantic(isNonNegativeBigInt(id) && id < state.nextEntityId, 'Entity ID out of bounds');
    assertSemantic(isPlainRecord(entity), 'Entity entry must be an object');
    assertSemantic(entity.id === id, 'Entity.id must match Map key');
    assertSemantic(isNonEmptyString(entity.definitionId), 'Entity definitionId must be a non-empty string');

    if (entity.kind === 'defender') {
      const cell = validateCellObject(entity.cell, `Defender ${id.toString()} cell`);
      const index = cellIndex(cell);
      assertSemantic(
        state.occupancy[index] === id,
        `Defender ${id.toString()} occupancy mismatch at cell (${cell.row}, ${cell.column})`,
      );
      if (ctx?.combatSession) {
        assertSemantic(
          entity.definitionId in ctx.combatSession.defendersById,
          `Unknown defender definitionId "${entity.definitionId}"`,
        );
      }
      if (ctx?.resourceSession) {
        assertSemantic(
          ctx.resourceSession.defenders.some(d => d.id === entity.definitionId),
          `Defender "${entity.definitionId}" missing from resourceSession`,
        );
      }
      if (ctx?.fusionSession) {
        assertSemantic(
          entity.definitionId in ctx.fusionSession.defendersById,
          `Defender "${entity.definitionId}" missing from fusionSession`,
        );
      }
    } else if (entity.kind === 'enemy') {
      assertSemantic(isLane(entity.lane), `Enemy ${id.toString()} has invalid lane`);
      assertSemantic(
        typeof entity.position === 'number' && Number.isFinite(entity.position),
        `Enemy ${id.toString()} has non-finite position`,
      );
      if (ctx?.combatSession) {
        assertSemantic(
          entity.definitionId in ctx.combatSession.enemiesById,
          `Unknown enemy definitionId "${entity.definitionId}"`,
        );
      }
      if (ctx?.resourceSession) {
        assertSemantic(
          ctx.resourceSession.enemies.some(e => e.id === entity.definitionId),
          `Enemy "${entity.definitionId}" missing from resourceSession`,
        );
      }
    } else {
      throw new SnapshotValidationError('SEMANTIC_VIOLATION', `Unknown entity kind: ${String((entity as { kind?: unknown }).kind)}`);
    }
  }

  for (let i = 0; i < state.occupancy.length; i++) {
    const id = state.occupancy[i];
    if (id === null) continue;
    const entity = state.entities.get(id);
    assertSemantic(entity !== undefined && entity.kind === 'defender', `Occupancy[${i}] does not point to a living defender`);
    assertSemantic(cellIndex(entity.cell) === i, `Occupancy[${i}] does not match defender cell`);
  }
}

function validateOutcome(outcome: unknown, label: string): void {
  if (outcome === null) return;
  assertSemantic(isPlainRecord(outcome), `${label} outcome must be null or object`);
  assertSemantic(isNonEmptyString(outcome.eventId), `${label} outcome.eventId must be non-empty string`);
  assertSemantic(outcome.status === 'APPLIED' || outcome.status === 'REJECTED', `${label} outcome.status invalid`);
  if (outcome.reason !== undefined) {
    assertSemantic(typeof outcome.reason === 'string', `${label} outcome.reason must be string`);
  }
}

function validateResourcesState(resources: ResourceState | undefined, ctx?: CheckpointSemanticContext): void {
  if (ctx?.resourceSession !== undefined) {
    assertSemantic(resources !== undefined, 'Missing state.resources required by resourceSession');
  }
  if (resources === undefined) return;
  assertSemantic(isPlainRecord(resources), 'state.resources must be an object');
  assertSemantic(isNonNegativeSafeInt(resources.energy), 'resources.energy must be nonnegative safe int');
  assertSemantic(
    isNonNegativeSafeInt(resources.crystals) && resources.crystals <= 5,
    'resources.crystals must be in 0..5',
  );
  assertSemantic(isNonNegativeSafeInt(resources.pending), 'resources.pending must be nonnegative safe int');
  assertSemantic(isNonNegativeBigInt(resources.nextItemId), 'resources.nextItemId must be nonnegative bigint');
  assertSemantic(typeof resources.initialized === 'boolean', 'resources.initialized must be boolean');
  assertSemantic(
    resources.terminal === null || VALID_TERMINAL_RESULTS.has(resources.terminal),
    'resources.terminal invalid',
  );
  assertSemantic(resources.items instanceof Map, 'resources.items must be a Map');
  for (const [id, item] of resources.items.entries()) {
    assertSemantic(isNonNegativeBigInt(id) && id < resources.nextItemId, 'Resource item ID out of bounds');
    assertSemantic(isPlainRecord(item) && item.id === id, 'Resource item must match key ID');
    assertSemantic(item.kind === 'energy' || item.kind === 'crystal', 'Invalid resource item kind');
    assertSemantic(isPositiveSafeInt(item.amount), 'Resource item amount must be positive safe int');
    assertSemantic(isNonNegativeSafeInt(item.expiresAt), 'Resource item expiresAt invalid');
    assertSemantic(
      isNonEmptyString(item.source) || isNonNegativeBigInt(item.source),
      'Resource item source invalid',
    );
    assertSemantic(isPlainRecord(item.position), 'Resource item position invalid');
    if (item.position.kind === 'normalized') {
      const pt = item.position.point;
      assertSemantic(
        isPlainRecord(pt) &&
          typeof pt.x === 'number' &&
          Number.isFinite(pt.x) &&
          pt.x >= 0 &&
          pt.x <= 1 &&
          typeof pt.y === 'number' &&
          Number.isFinite(pt.y) &&
          pt.y >= 0 &&
          pt.y <= 1,
        'Normalized item position out of range',
      );
    } else if (item.position.kind === 'cell') {
      validateCellObject(item.position.cell, 'Item cell position');
    } else if (item.position.kind === 'lane') {
      assertSemantic(
        isLane(item.position.lane) &&
          typeof item.position.position === 'number' &&
          Number.isFinite(item.position.position),
        'Lane item position invalid',
      );
    } else {
      throw new SnapshotValidationError('SEMANTIC_VIOLATION', 'Unknown resource item position kind');
    }
  }
  assertSemantic(resources.rewardedEnemies instanceof Set, 'resources.rewardedEnemies must be a Set');
  for (const enemyId of resources.rewardedEnemies) {
    assertSemantic(isNonNegativeBigInt(enemyId), 'rewardedEnemies must contain nonnegative bigints');
  }
  assertSemantic(resources.rewardedWaves instanceof Set, 'resources.rewardedWaves must be a Set');
  for (const waveId of resources.rewardedWaves) {
    assertSemantic(isNonEmptyString(waveId), 'rewardedWaves must contain non-empty strings');
  }
  assertSemantic(resources.processedClaims instanceof Set, 'resources.processedClaims must be a Set');
  for (const claimId of resources.processedClaims) {
    assertSemantic(isNonEmptyString(claimId), 'processedClaims must contain non-empty strings');
  }
  if (resources.summonCooldownUntilTick !== undefined) {
    assertSemantic(
      resources.summonCooldownUntilTick instanceof Map,
      'resources.summonCooldownUntilTick must be a Map',
    );
    for (const [defenderId, readyTick] of resources.summonCooldownUntilTick.entries()) {
      assertSemantic(isNonEmptyString(defenderId), 'summonCooldownUntilTick key must be non-empty string');
      assertSemantic(isPositiveSafeInt(readyTick), 'summonCooldownUntilTick value must be positive safe int');
    }
  }
  if (resources.gloveCooldownUntilTick !== undefined) {
    assertSemantic(
      isPositiveSafeInt(resources.gloveCooldownUntilTick),
      'resources.gloveCooldownUntilTick must be positive safe int',
    );
  }
  if (resources.villageChestReady !== undefined) {
    assertSemantic(typeof resources.villageChestReady === 'boolean', 'resources.villageChestReady must be boolean');
  }
  if (resources.villageChestNextTick !== undefined && resources.villageChestNextTick !== null) {
    assertSemantic(
      isNonNegativeSafeInt(resources.villageChestNextTick),
      'resources.villageChestNextTick invalid',
    );
  }
  if (resources.producerNextTickByEntityId !== undefined) {
    assertSemantic(
      resources.producerNextTickByEntityId instanceof Map,
      'resources.producerNextTickByEntityId must be a Map',
    );
    for (const [entityId, nextTick] of resources.producerNextTickByEntityId.entries()) {
      assertSemantic(isNonNegativeBigInt(entityId), 'producerNextTickByEntityId key must be nonnegative bigint');
      assertSemantic(isPositiveSafeInt(nextTick), 'producerNextTickByEntityId value must be positive safe int');
    }
  }
  validateOutcome(resources.outcome, 'resources');
}

function validateCombatEntity(entry: CombatEntityState, entityId: bigint): void {
  assertSemantic(isPlainRecord(entry), `Combat entity ${entityId.toString()} must be an object`);
  assertSemantic(typeof entry.maxHp === 'number' && Number.isFinite(entry.maxHp) && entry.maxHp > 0, 'Combat maxHp must be > 0');
  assertSemantic(
    typeof entry.hp === 'number' && Number.isFinite(entry.hp) && entry.hp > 0 && entry.hp <= entry.maxHp,
    'Combat hp must satisfy 0 < hp <= maxHp',
  );
  assertSemantic(
    entry.nextAttackTick === null || isNonNegativeSafeInt(entry.nextAttackTick),
    'Combat nextAttackTick invalid',
  );
  assertSemantic(
    entry.attackAnchorTick === null || isNonNegativeSafeInt(entry.attackAnchorTick),
    'Combat attackAnchorTick invalid',
  );
  assertSemantic(isNonNegativeSafeInt(entry.attackCount), 'Combat attackCount must be nonnegative safe int');
  assertSemantic(entry.targetId === null || isNonNegativeBigInt(entry.targetId), 'Combat targetId invalid');
  if (entry.moveAnchorX !== undefined) {
    assertSemantic(typeof entry.moveAnchorX === 'number' && Number.isFinite(entry.moveAnchorX), 'Combat moveAnchorX invalid');
  }
  if (entry.movedTicks !== undefined) {
    assertSemantic(isNonNegativeSafeInt(entry.movedTicks), 'Combat movedTicks invalid');
  }
  if (entry.lastMoveSpeed !== undefined) {
    assertSemantic(
      typeof entry.lastMoveSpeed === 'number' && Number.isFinite(entry.lastMoveSpeed) && entry.lastMoveSpeed >= 0,
      'Combat lastMoveSpeed invalid',
    );
  }
  if (entry.lastAttackSpeed !== undefined) {
    assertSemantic(
      typeof entry.lastAttackSpeed === 'number' && Number.isFinite(entry.lastAttackSpeed) && entry.lastAttackSpeed > 0,
      'Combat lastAttackSpeed invalid',
    );
  }
}

function validateCombatState(
  state: BattleStateWithMatchKills,
  combat: CombatState | undefined,
  ctx?: CheckpointSemanticContext,
): void {
  if (ctx?.combatSession !== undefined) {
    assertSemantic(combat !== undefined, 'Missing state.combat required by combatSession');
  }
  if (combat === undefined) return;
  assertSemantic(isPlainRecord(combat), 'state.combat must be an object');
  assertSemantic(combat.entities instanceof Map, 'combat.entities must be a Map');
  assertSemantic(
    combat.terminal === null || VALID_TERMINAL_RESULTS.has(combat.terminal),
    'combat.terminal invalid',
  );
  validateOutcome(combat.outcome, 'combat');
  assertSemantic(combat.entities.size === state.entities.size, 'combat.entities must match state.entities 1-to-1');
  for (const [id, entry] of combat.entities.entries()) {
    assertSemantic(isNonNegativeBigInt(id) && state.entities.has(id), 'combat.entities contains unknown entity ID');
    validateCombatEntity(entry, id);
  }
}

function validateFusionState(fusion: FusionState | undefined, ctx?: CheckpointSemanticContext): void {
  if (ctx?.fusionSession !== undefined) {
    assertSemantic(fusion !== undefined, 'Missing state.fusion required by fusionSession');
  }
  if (fusion === undefined) return;
  assertSemantic(isPlainRecord(fusion), 'state.fusion must be an object');
  if (fusion.outcome === null) return;
  assertSemantic(isPlainRecord(fusion.outcome), 'fusion.outcome must be null or object');
  assertSemantic(isNonEmptyString(fusion.outcome.eventId), 'fusion.outcome.eventId invalid');
  if (fusion.outcome.status === 'APPLIED') {
    assertSemantic(isNonEmptyString(fusion.outcome.recipeId), 'fusion.outcome.recipeId invalid');
    assertSemantic(isNonNegativeBigInt(fusion.outcome.outputEntityId), 'fusion.outcome.outputEntityId invalid');
    validateCellObject(fusion.outcome.targetCell, 'fusion.outcome.targetCell');
  } else if (fusion.outcome.status === 'REJECTED') {
    assertSemantic(isNonEmptyString(fusion.outcome.reason), 'fusion.outcome.reason invalid');
  } else {
    throw new SnapshotValidationError('SEMANTIC_VIOLATION', 'Invalid fusion.outcome.status');
  }
}

function validateWaveState(waves: WaveState | undefined, ctx?: CheckpointSemanticContext): void {
  if (ctx?.waveSession !== undefined) {
    assertSemantic(waves !== undefined, 'Missing state.waves required by waveSession');
  }
  if (waves === undefined) return;
  assertSemantic(isPlainRecord(waves), 'state.waves must be an object');
  if (waves.currentWaveIndex !== null) {
    assertSemantic(isNonNegativeSafeInt(waves.currentWaveIndex), 'waves.currentWaveIndex invalid');
    if (ctx?.waveSession) {
      assertSemantic(
        waves.currentWaveIndex < ctx.waveSession.waves.length,
        'waves.currentWaveIndex out of range',
      );
    }
  }
  assertSemantic(VALID_WAVE_STATUSES.has(waves.status), 'waves.status invalid');
  assertSemantic(isNonNegativeSafeInt(waves.spawnedInCurrentWave), 'waves.spawnedInCurrentWave invalid');
  assertSemantic(isNonNegativeSafeInt(waves.plannedInCurrentWave), 'waves.plannedInCurrentWave invalid');
  assertSemantic(
    waves.spawnedInCurrentWave <= waves.plannedInCurrentWave,
    'waves.spawnedInCurrentWave cannot exceed plannedInCurrentWave',
  );
  assertSemantic(waves.startedWaves instanceof Set, 'waves.startedWaves must be a Set');
  for (const idx of waves.startedWaves) {
    assertSemantic(isNonNegativeSafeInt(idx), 'waves.startedWaves entry invalid');
    if (ctx?.waveSession) assertSemantic(idx < ctx.waveSession.waves.length, 'startedWaves index out of range');
  }
  assertSemantic(waves.completedWaves instanceof Set, 'waves.completedWaves must be a Set');
  for (const idx of waves.completedWaves) {
    assertSemantic(isNonNegativeSafeInt(idx), 'waves.completedWaves entry invalid');
    if (ctx?.waveSession) assertSemantic(idx < ctx.waveSession.waves.length, 'completedWaves index out of range');
  }
  assertSemantic(waves.processedSpawns instanceof Set, 'waves.processedSpawns must be a Set');
  for (const key of waves.processedSpawns) {
    assertSemantic(isNonEmptyString(key), 'waves.processedSpawns must contain non-empty strings');
  }
  assertSemantic(waves.terminal === null || VALID_TERMINAL_RESULTS.has(waves.terminal), 'waves.terminal invalid');
}

function assertKnownAbilityId(abilityId: unknown, ctx?: CheckpointSemanticContext): asserts abilityId is string {
  assertSemantic(isNonEmptyString(abilityId), 'abilityId must be a non-empty string');
  if (ctx?.abilitySession) {
    assertSemantic(abilityId in ctx.abilitySession.abilitiesById, `Unknown abilityId "${abilityId}"`);
  }
}

function assertLivingDefender(state: BattleStateWithMatchKills, id: unknown, label: string): void {
  assertSemantic(isNonNegativeBigInt(id), `${label} must be a nonnegative bigint`);
  const entity = state.entities.get(id);
  assertSemantic(entity !== undefined && entity.kind === 'defender', `${label} must reference a living defender`);
}

function validateAbilityStatus(
  status: ActiveStatusInstance,
  state: BattleStateWithMatchKills,
  abilities: AbilityState,
  ctx?: CheckpointSemanticContext,
): void {
  assertSemantic(isPlainRecord(status), 'ActiveStatusInstance must be an object');
  assertSemantic(isNonNegativeBigInt(status.statusId) && status.statusId < abilities.nextEffectId, 'statusId out of bounds');
  assertSemantic(isPositiveSafeInt(status.version), 'status.version must be >= 1');
  assertSemantic(isNonNegativeBigInt(status.targetEntityId) && state.entities.has(status.targetEntityId), 'status.targetEntityId missing');
  assertSemantic(isNonNegativeBigInt(status.sourceEntityId) && status.sourceEntityId < state.nextEntityId, 'status.sourceEntityId out of bounds');
  if (status.abilityId !== 'basic_attack') {
    assertKnownAbilityId(status.abilityId, ctx);
  }
  assertSemantic(VALID_STATUS_KINDS.has(status.kind), `Invalid status kind "${String(status.kind)}"`);
  assertSemantic(isPositiveSafeInt(status.remainingTicks), 'status.remainingTicks must be >= 1');
  if (status.isZoneDerived) {
    assertSemantic(
      isNonNegativeBigInt(status.zoneShieldId) && abilities.shields.some(s => s.shieldId === status.zoneShieldId),
      'Zone-derived status must reference an active shield',
    );
  }
}

function validateAbilityShield(
  shield: ActiveShieldInstance,
  state: BattleStateWithMatchKills,
  abilities: AbilityState,
  ctx?: CheckpointSemanticContext,
): void {
  assertSemantic(isPlainRecord(shield), 'ActiveShieldInstance must be an object');
  assertSemantic(isNonNegativeBigInt(shield.shieldId) && shield.shieldId < abilities.nextEffectId, 'shieldId out of bounds');
  assertSemantic(
    isNonNegativeSafeInt(shield.creationOrder) && shield.creationOrder < abilities.nextShieldOrder,
    'shield.creationOrder out of bounds',
  );
  assertLivingDefender(state, shield.ownerId, 'shield.ownerId');
  assertKnownAbilityId(shield.abilityId, ctx);
  assertSemantic(typeof shield.amount === 'number' && Number.isFinite(shield.amount) && shield.amount > 0, 'shield.amount must be > 0');
  assertSemantic(
    typeof shield.maxAmount === 'number' && Number.isFinite(shield.maxAmount) && shield.maxAmount >= shield.amount,
    'shield.maxAmount must be >= shield.amount',
  );
  if (shield.frontSlowZone !== undefined) {
    assertSemantic(isPlainRecord(shield.frontSlowZone), 'shield.frontSlowZone invalid');
    validateCellObject(
      { row: shield.frontSlowZone.row, column: shield.frontSlowZone.column },
      'shield.frontSlowZone cell',
    );
    assertSemantic(
      typeof shield.frontSlowZone.slowPct === 'number' &&
        Number.isFinite(shield.frontSlowZone.slowPct) &&
        shield.frontSlowZone.slowPct >= 0 &&
        shield.frontSlowZone.slowPct <= 1,
      'shield.frontSlowZone.slowPct invalid',
    );
    assertSemantic(
      isPositiveSafeInt(shield.frontSlowZone.residualDurationTicks),
      'shield.frontSlowZone.residualDurationTicks invalid',
    );
  }
}

function validateAbilityRedirect(
  redirect: ActiveRedirectAura,
  state: BattleStateWithMatchKills,
  abilities: AbilityState,
  ctx?: CheckpointSemanticContext,
): void {
  assertSemantic(isPlainRecord(redirect), 'ActiveRedirectAura must be an object');
  assertSemantic(isNonNegativeBigInt(redirect.redirectId) && redirect.redirectId < abilities.nextEffectId, 'redirectId out of bounds');
  assertLivingDefender(state, redirect.ownerId, 'redirect.ownerId');
  assertKnownAbilityId(redirect.abilityId, ctx);
  assertSemantic(typeof redirect.radius === 'number' && Number.isFinite(redirect.radius) && redirect.radius >= 0, 'redirect.radius invalid');
  assertSemantic(
    typeof redirect.redirectSharePct === 'number' &&
      Number.isFinite(redirect.redirectSharePct) &&
      redirect.redirectSharePct > 0 &&
      redirect.redirectSharePct <= 1,
    'redirect.redirectSharePct invalid',
  );
  assertSemantic(isPositiveSafeInt(redirect.remainingTicks), 'redirect.remainingTicks must be >= 1');
}

function validateAbilityCadence(
  cadence: ActiveMultihitCadence,
  state: BattleStateWithMatchKills,
  abilities: AbilityState,
  ctx?: CheckpointSemanticContext,
): void {
  assertSemantic(isPlainRecord(cadence), 'ActiveMultihitCadence must be an object');
  assertSemantic(isNonNegativeBigInt(cadence.activationId) && cadence.activationId < abilities.nextEffectId, 'cadence.activationId out of bounds');
  assertLivingDefender(state, cadence.ownerId, 'cadence.ownerId');
  assertKnownAbilityId(cadence.abilityId, ctx);
  assertSemantic(isNonNegativeSafeInt(cadence.effectIndex), 'cadence.effectIndex invalid');
  assertSemantic(cadence.status === 'ACTIVE' || cadence.status === 'PAUSED', 'cadence.status invalid');
  assertSemantic(isPositiveSafeInt(cadence.remainingShots), 'cadence.remainingShots must be >= 1');
  assertSemantic(isNonNegativeSafeInt(cadence.shotIndex), 'cadence.shotIndex invalid');
  assertSemantic(isPositiveSafeInt(cadence.intervalTicks), 'cadence.intervalTicks must be >= 1');
  assertSemantic(isPositiveSafeInt(cadence.nextShotRemainingTicks), 'cadence.nextShotRemainingTicks must be >= 1');
  if (cadence.lockedCenterCell !== undefined) {
    validateCellObject(cadence.lockedCenterCell, 'cadence.lockedCenterCell');
  }
}

function validateAbilityProjectile(
  proj: ActiveProjectile,
  state: BattleStateWithMatchKills,
  abilities: AbilityState,
  ctx?: CheckpointSemanticContext,
): void {
  assertSemantic(isPlainRecord(proj), 'ActiveProjectile must be an object');
  assertSemantic(isNonNegativeBigInt(proj.projectileId) && proj.projectileId < abilities.nextEffectId, 'projectileId out of bounds');
  assertSemantic(isNonNegativeBigInt(proj.sourceId) && proj.sourceId < state.nextEntityId, 'projectile.sourceId out of bounds');
  assertKnownAbilityId(proj.abilityId, ctx);
  assertSemantic(typeof proj.damage === 'number' && Number.isFinite(proj.damage) && proj.damage >= 0, 'projectile.damage invalid');
  assertSemantic(VALID_DAMAGE_TYPES.has(proj.damageType), 'projectile.damageType invalid');
  assertSemantic(typeof proj.armorPiercing === 'boolean', 'projectile.armorPiercing must be boolean');
  assertSemantic(typeof proj.shieldPiercing === 'boolean', 'projectile.shieldPiercing must be boolean');

  if (proj.kind === 'lane') {
    assertSemantic(isLane(proj.lane), 'Lane projectile lane invalid');
    assertSemantic(typeof proj.x === 'number' && Number.isFinite(proj.x), 'Lane projectile x invalid');
    assertSemantic(
      typeof proj.speedPerTick === 'number' && Number.isFinite(proj.speedPerTick) && proj.speedPerTick > 0,
      'Lane projectile speedPerTick invalid',
    );
    assertSemantic(typeof proj.pierce === 'boolean', 'Lane projectile pierce must be boolean');
    assertSemantic(proj.hitEnemyIds instanceof Set, 'Lane projectile hitEnemyIds must be a Set');
    for (const enemyId of proj.hitEnemyIds) {
      assertSemantic(isNonNegativeBigInt(enemyId), 'hitEnemyIds must contain nonnegative bigints');
    }
  } else if (proj.kind === 'falling') {
    validateCellObject(proj.impactCell, 'Falling projectile impactCell');
    assertSemantic(isPositiveSafeInt(proj.remainingTravelTicks), 'Falling projectile remainingTravelTicks must be >= 1');
  } else {
    throw new SnapshotValidationError('SEMANTIC_VIOLATION', `Unknown projectile kind: ${String((proj as { kind?: unknown }).kind)}`);
  }
}

function validateAbilityState(
  state: BattleStateWithMatchKills,
  abilities: AbilityState | undefined,
  ctx?: CheckpointSemanticContext,
): void {
  if (ctx?.abilitySession !== undefined) {
    assertSemantic(abilities !== undefined, 'Missing state.abilities required by abilitySession');
  }
  if (abilities === undefined) return;
  assertSemantic(isPlainRecord(abilities), 'state.abilities must be an object');
  assertSemantic(isNonNegativeBigInt(abilities.nextEffectId), 'abilities.nextEffectId invalid');
  assertSemantic(isNonNegativeSafeInt(abilities.nextShieldOrder), 'abilities.nextShieldOrder invalid');
  assertSemantic(abilities.cooldowns instanceof Map, 'abilities.cooldowns must be a Map');
  for (const [defenderId, ticks] of abilities.cooldowns.entries()) {
    assertLivingDefender(state, defenderId, 'abilities.cooldowns key');
    assertSemantic(isPositiveSafeInt(ticks), 'abilities.cooldowns value must be >= 1');
  }
  assertSemantic(Array.isArray(abilities.statuses), 'abilities.statuses must be an array');
  assertSemantic(Array.isArray(abilities.shields), 'abilities.shields must be an array');
  assertSemantic(Array.isArray(abilities.redirects), 'abilities.redirects must be an array');
  assertSemantic(Array.isArray(abilities.cadences), 'abilities.cadences must be an array');
  assertSemantic(Array.isArray(abilities.projectiles), 'abilities.projectiles must be an array');

  for (const shield of abilities.shields) validateAbilityShield(shield, state, abilities, ctx);
  for (const status of abilities.statuses) validateAbilityStatus(status, state, abilities, ctx);
  for (const redirect of abilities.redirects) validateAbilityRedirect(redirect, state, abilities, ctx);
  for (const cadence of abilities.cadences) validateAbilityCadence(cadence, state, abilities, ctx);
  for (const proj of abilities.projectiles) validateAbilityProjectile(proj, state, abilities, ctx);

  if (abilities.outcome !== null) {
    assertSemantic(isPlainRecord(abilities.outcome), 'abilities.outcome must be null or object');
    assertSemantic(isNonEmptyString(abilities.outcome.eventId), 'abilities.outcome.eventId invalid');
    assertSemantic(
      abilities.outcome.status === 'APPLIED' || abilities.outcome.status === 'REJECTED',
      'abilities.outcome.status invalid',
    );
  }
}

function validateQueueSnapshot(queue: QueueSnapshot<unknown>): void {
  assertSemantic(isPlainRecord(queue), 'queue must be a plain object');
  assertSemantic(Array.isArray(queue.events), 'queue.events must be an array');
  // Enforce strict pre-sorted (scheduledTick, insertionSequence) order before EventQueue.restore sorts a clone.
  for (let i = 1; i < queue.events.length; i++) {
    const prev = queue.events[i - 1];
    const curr = queue.events[i];
    assertSemantic(isPlainRecord(prev) && isPlainRecord(curr), 'Queue event must be an object');
    assertSemantic(
      isNonNegativeSafeInt(prev.scheduledTick) &&
        isNonNegativeSafeInt(curr.scheduledTick) &&
        isNonNegativeSafeInt(prev.insertionSequence) &&
        isNonNegativeSafeInt(curr.insertionSequence),
      'Queue event ordering fields invalid',
    );
    const inOrder =
      prev.scheduledTick < curr.scheduledTick ||
      (prev.scheduledTick === curr.scheduledTick && prev.insertionSequence < curr.insertionSequence);
    assertSemantic(inOrder, 'Queue events are not strictly sorted by (scheduledTick, insertionSequence)');
  }
  try {
    new EventQueue(queue);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new SnapshotValidationError('SEMANTIC_VIOLATION', `Invalid EventQueue snapshot: ${reason}`);
  }
}

function validateRng(rng: ResourceRng | null): void {
  if (rng === null) return;
  assertSemantic(isPlainRecord(rng), 'rng must be null or object');
  assertSemantic(
    isNonNegativeSafeInt(rng.seed) && rng.seed <= 0xffffffff,
    'rng.seed must be a uint32 safe integer',
  );
}

/** Validate all structural and cross-subsystem semantic invariants on a decoded checkpoint. */
export function validateBattleCheckpointSemantics(
  decoded: DecodedBattleCheckpoint,
  ctx?: CheckpointSemanticContext,
): void {
  validateHeaderFields(decoded, ctx?.tickDurationMs, 'SEMANTIC_VIOLATION');
  validateCoreBattleState(decoded.state, ctx);
  validateResourcesState(decoded.state.resources, ctx);
  validateCombatState(decoded.state, decoded.state.combat, ctx);
  validateFusionState(decoded.state.fusion, ctx);
  validateWaveState(decoded.state.waves, ctx);
  validateAbilityState(decoded.state, decoded.state.abilities, ctx);
  validateQueueSnapshot(decoded.queue);
  validateRng(decoded.rng);
}

/** Parse, migrate, verify checksum, decode, and semantically validate a checkpoint JSON string. */
export function deserializeBattleCheckpoint(
  rawJson: string,
  ctx?: CheckpointSemanticContext,
): DecodedBattleCheckpoint {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new SnapshotValidationError('INVALID_JSON', `Failed to parse checkpoint JSON: ${reason}`);
  }

  if (!isPlainRecord(parsed)) {
    throw new SnapshotValidationError('INVALID_ENVELOPE', 'Checkpoint root must be a JSON object');
  }
  assertSafeObjectKeys(parsed);

  const requiredFields = [
    'schemaVersion',
    'checkpointId',
    'battleId',
    'battleGeneration',
    'tick',
    'paused',
    'accumulatorMs',
    'reason',
    'checksum',
    'payload',
  ];
  for (const field of requiredFields) {
    if (!Object.prototype.hasOwnProperty.call(parsed, field)) {
      throw new SnapshotValidationError('INVALID_ENVELOPE', `Missing envelope field "${field}"`);
    }
  }
  if (!isNonEmptyString(parsed.checksum) || !/^[0-9a-f]{8}$/.test(parsed.checksum)) {
    throw new SnapshotValidationError('INVALID_ENVELOPE', 'Invalid checkpoint checksum format');
  }

  const migrated = migrateBattleCheckpoint(parsed);
  const levelId = migrated.levelId;
  validateHeaderFields(
    {
      checkpointId: migrated.checkpointId,
      battleId: migrated.battleId,
      battleGeneration: migrated.battleGeneration,
      tick: migrated.tick,
      paused: migrated.paused,
      accumulatorMs: migrated.accumulatorMs,
      reason: migrated.reason,
      ...(levelId !== undefined ? { levelId } : {}),
    },
    undefined,
    'INVALID_ENVELOPE',
  );

  const expectedChecksum = computeFnv1aHex(
    buildChecksumInput(
      {
        schemaVersion: migrated.schemaVersion as number,
        checkpointId: migrated.checkpointId as string,
        battleId: migrated.battleId as string,
        battleGeneration: migrated.battleGeneration as number,
        tick: migrated.tick as number,
        paused: migrated.paused as boolean,
        accumulatorMs: migrated.accumulatorMs as number,
        reason: migrated.reason as CheckpointTriggerReason,
        ...(typeof levelId === 'string' ? { levelId } : {}),
      },
      migrated.payload,
    ),
  );
  if (migrated.checksum !== expectedChecksum) {
    throw new SnapshotValidationError('CHECKSUM_MISMATCH', 'Checkpoint checksum mismatch');
  }

  const decodedPayload = decodeCanonicalValue(migrated.payload);
  if (
    !isPlainRecord(decodedPayload) ||
    !Object.prototype.hasOwnProperty.call(decodedPayload, 'state') ||
    !Object.prototype.hasOwnProperty.call(decodedPayload, 'queue') ||
    !Object.prototype.hasOwnProperty.call(decodedPayload, 'rng')
  ) {
    throw new SnapshotValidationError('INVALID_PAYLOAD', 'Checkpoint payload must contain state, queue, and rng');
  }

  const decoded: DecodedBattleCheckpoint = {
    schemaVersion: migrated.schemaVersion as number,
    checkpointId: migrated.checkpointId as string,
    battleId: migrated.battleId as string,
    battleGeneration: migrated.battleGeneration as number,
    tick: migrated.tick as number,
    paused: migrated.paused as boolean,
    accumulatorMs: migrated.accumulatorMs as number,
    reason: migrated.reason as CheckpointTriggerReason,
    ...(typeof levelId === 'string' ? { levelId } : {}),
    state: decodedPayload.state as BattleStateWithMatchKills,
    queue: decodedPayload.queue as QueueSnapshot<unknown>,
    rng: decodedPayload.rng as ResourceRng | null,
  };

  validateBattleCheckpointSemantics(decoded, ctx);
  return decoded;
}

/** Peek the target campaign levelId from a serialized checkpoint envelope without full validation. */
export function peekCheckpointLevelId(rawJson: string): string {
  try {
    const parsed = JSON.parse(rawJson);
    if (isPlainRecord(parsed) && isNonEmptyString(parsed.levelId)) {
      return parsed.levelId;
    }
  } catch {
    // Ignore malformed JSON; full deserialization handles validation errors.
  }
  return 'grassland';
}
