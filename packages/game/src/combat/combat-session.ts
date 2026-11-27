import {
  validateAttachedStatus,
  validateDamageType,
  type AbilityDamageType,
  type AttachedStatusSpec,
} from '../abilities/ability-session';
import { count, deadline, type ResourceSession } from '../core/resource-session';

const TARGETING_STRATEGIES = new Set([
  'CLOSEST_TO_BASE',
  'CLOSEST_TO_DEFENDER',
  'HIGHEST_HP',
  'LOWEST_HP',
  'FASTEST',
  'FIRST_VALID',
] as const);

const ENEMY_BEHAVIORS = new Set(['STOP_AND_ATTACK', 'IGNORE_DEFENDER'] as const);

export type TargetingStrategy =
  | 'CLOSEST_TO_BASE'
  | 'CLOSEST_TO_DEFENDER'
  | 'HIGHEST_HP'
  | 'LOWEST_HP'
  | 'FASTEST'
  | 'FIRST_VALID';

export type EnemyBehavior = 'STOP_AND_ATTACK' | 'IGNORE_DEFENDER';

export interface DefenderCombatDefinition {
  readonly id: string;
  readonly maxHp: number;
  readonly damage: number;
  readonly attackSpeed: number;
  readonly attackRange: number;
  readonly targeting: TargetingStrategy;
  readonly armor?: number;
  readonly fireResistancePct?: number;
  readonly freezeImmune?: boolean;
  readonly freezeResistancePct?: number;
  readonly attackDamageType?: AbilityDamageType;
  readonly basicAttackStatus?: AttachedStatusSpec;
}

export interface EnemyCombatDefinition {
  readonly id: string;
  readonly maxHp: number;
  readonly moveSpeed: number;
  readonly behavior: EnemyBehavior;
  readonly damage?: number;
  readonly attackSpeed?: number;
  readonly attackRange?: number;
  readonly armor?: number;
  readonly fireResistancePct?: number;
  readonly freezeImmune?: boolean;
  readonly freezeResistancePct?: number;
}

export interface CombatSessionInput {
  readonly spawnX: number;
  readonly defenders: readonly DefenderCombatDefinition[];
  readonly enemies: readonly EnemyCombatDefinition[];
}

function positiveFinite(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new RangeError(`Expected positive finite ${label}`);
  }
  return value;
}

function nonNegativeFinite(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new RangeError(`Expected nonnegative finite ${label}`);
  }
  return value;
}

function unitInterval(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) {
    throw new RangeError(`Expected finite percentage in [0, 1] for ${label}`);
  }
  return value;
}

function validateMitigationFields(
  entity: {
    readonly armor?: number;
    readonly fireResistancePct?: number;
    readonly freezeImmune?: boolean;
    readonly freezeResistancePct?: number;
  },
  label: string,
): void {
  if (entity.armor !== undefined) nonNegativeFinite(entity.armor, `${label} armor`);
  if (entity.fireResistancePct !== undefined) {
    unitInterval(entity.fireResistancePct, `${label} fireResistancePct`);
  }
  if (entity.freezeResistancePct !== undefined) {
    unitInterval(entity.freezeResistancePct, `${label} freezeResistancePct`);
  }
  if (entity.freezeImmune !== undefined && typeof entity.freezeImmune !== 'boolean') {
    throw new TypeError(`Expected boolean ${label} freezeImmune`);
  }
}

function indexUniqueIds<T extends { readonly id: string }>(entries: unknown, label: string): Record<string, T> {
  if (!Array.isArray(entries)) throw new TypeError(`Expected ${label} array`);
  const byId: Record<string, T> = Object.create(null);
  for (const entry of entries as T[]) {
    if (!entry || typeof entry !== 'object' || typeof entry.id !== 'string' ||
      !/^[a-z][a-z0-9_]*$/.test(entry.id) || entry.id in byId) {
      throw new TypeError(`Invalid or duplicate ${label} definition ID`);
    }
    byId[entry.id] = entry;
  }
  return byId;
}

function freezeData<T extends object>(value: T): T {
  for (const field of Object.values(value)) if (field && typeof field === 'object') freezeData(field);
  return Object.freeze(value);
}

/** Validate and freeze combat definitions before battle start; missing stats or behavior fail closed. */
export function validateCombatSession(
  input: CombatSessionInput,
  rate: number,
  resourceSession?: ResourceSession,
) {
  if (!input || typeof input !== 'object') throw new TypeError('Missing combat session input');
  positiveFinite(rate, 'tick rate');
  const config = structuredClone(input);
  nonNegativeFinite(config.spawnX, 'spawnX');
  count(Math.ceil(rate));

  const defendersById = indexUniqueIds<DefenderCombatDefinition>(config.defenders, 'defender');
  const enemiesById = indexUniqueIds<EnemyCombatDefinition>(config.enemies, 'enemy');

  for (const defender of config.defenders) {
    positiveFinite(defender.maxHp, 'defender maxHp');
    nonNegativeFinite(defender.damage, 'defender damage');
    positiveFinite(defender.attackSpeed, 'defender attackSpeed');
    nonNegativeFinite(defender.attackRange, 'defender attackRange');
    if (!TARGETING_STRATEGIES.has(defender.targeting)) {
      throw new TypeError(`Unsupported targeting strategy: ${String(defender.targeting)}`);
    }
    validateMitigationFields(defender, 'defender');
    if (defender.attackDamageType !== undefined) {
      validateDamageType(defender.attackDamageType);
    }
    if (defender.basicAttackStatus !== undefined) {
      validateAttachedStatus(defender.basicAttackStatus, rate);
    }
    deadline(1 / defender.attackSpeed, rate);
  }

  for (const enemy of config.enemies) {
    positiveFinite(enemy.maxHp, 'enemy maxHp');
    positiveFinite(enemy.moveSpeed, 'enemy moveSpeed');
    if (!ENEMY_BEHAVIORS.has(enemy.behavior)) {
      throw new TypeError(`Unsupported enemy behavior: ${String(enemy.behavior)}`);
    }
    validateMitigationFields(enemy, 'enemy');
    if (enemy.behavior === 'STOP_AND_ATTACK') {
      nonNegativeFinite(enemy.damage, 'enemy damage');
      positiveFinite(enemy.attackSpeed, 'enemy attackSpeed');
      nonNegativeFinite(enemy.attackRange, 'enemy attackRange');
      deadline(1 / enemy.attackSpeed!, rate);
    } else {
      if (enemy.damage !== undefined) nonNegativeFinite(enemy.damage, 'enemy damage');
      if (enemy.attackSpeed !== undefined) {
        positiveFinite(enemy.attackSpeed, 'enemy attackSpeed');
        deadline(1 / enemy.attackSpeed, rate);
      }
      if (enemy.attackRange !== undefined) nonNegativeFinite(enemy.attackRange, 'enemy attackRange');
    }
  }

  if (resourceSession) {
    for (const defender of resourceSession.defenders) {
      if (!(defender.id in defendersById)) {
        throw new TypeError(`Missing combat definition for defender: ${defender.id}`);
      }
    }
    for (const enemy of config.enemies) {
      if (!resourceSession.enemies.some(entry => entry.id === enemy.id)) {
        throw new TypeError(`Missing resource reward definition for enemy: ${enemy.id}`);
      }
    }
  }

  return freezeData({
    spawnX: config.spawnX,
    rate,
    defenders: config.defenders,
    enemies: config.enemies,
    defendersById,
    enemiesById,
  });
}

export type CombatSession = ReturnType<typeof validateCombatSession>;
