import type { CombatSession } from '../combat/combat-session';
import { count, type ResourceSession } from '../core/resource-session';

const ABILITY_ID_PATTERN = /^[a-z][a-z0-9_]*$/;

const DAMAGE_TYPES = new Set<AbilityDamageType>(['physical', 'fire', 'ice']);

const TARGET_SCOPES = new Set<AbilityTargetScope>([
  'self',
  'same-lane-enemies',
  'same-lane-enemy-in-range',
  'all-enemies',
  'melee-enemy',
  'area-3x3-closest-enemy',
  'area-3x3-self',
  'front-3-cells',
  'first-enemy-per-lane',
  'highest-hp-same-lane',
  'ally-3x3',
]);

const INSTANT_DAMAGE_SCOPES = new Set([
  'same-lane-enemies',
  'all-enemies',
  'area-3x3-self',
  'front-3-cells',
  'first-enemy-per-lane',
  'highest-hp-same-lane',
] as const);
const STATUS_EFFECT_SCOPES = new Set([
  'self',
  'same-lane-enemies',
  'all-enemies',
  'area-3x3-self',
  'front-3-cells',
  'first-enemy-per-lane',
  'highest-hp-same-lane',
  'ally-3x3',
] as const);

export type AbilityDamageType = 'physical' | 'fire' | 'ice';

export type AbilityTargetScope =
  | 'self'
  | 'same-lane-enemies'
  | 'same-lane-enemy-in-range'
  | 'all-enemies'
  | 'melee-enemy'
  | 'area-3x3-closest-enemy'
  | 'area-3x3-self'
  | 'front-3-cells'
  | 'first-enemy-per-lane'
  | 'highest-hp-same-lane'
  | 'ally-3x3';

export type AttachedStatusSpec =
  | { readonly kind: 'slow'; readonly slowPct: number; readonly durationSeconds: number }
  | { readonly kind: 'stun'; readonly durationSeconds: number }
  | { readonly kind: 'freeze'; readonly durationSeconds: number }
  | { readonly kind: 'vulnerable'; readonly damageTakenBonusPct: number; readonly durationSeconds: number }
  | {
      readonly kind: 'burn';
      readonly damageMultiplierPerSecond: number;
      readonly durationSeconds: number;
      readonly tickIntervalSeconds: number;
      readonly damageType?: 'fire';
    }
  | {
      readonly kind: 'buff';
      readonly attackSpeedBonusPct: number;
      readonly attackDamageBonusPct: number;
      readonly durationSeconds: number;
    };

export type AbilityEffectDefinition =
  | {
      readonly kind: 'instant-damage';
      readonly scope:
        | 'same-lane-enemies'
        | 'all-enemies'
        | 'area-3x3-self'
        | 'front-3-cells'
        | 'first-enemy-per-lane'
        | 'highest-hp-same-lane';
      readonly radius?: number;
      readonly frontCells?: number;
      readonly damageMultiplier: number;
      readonly bonusDamageMultiplierIfChilled?: number;
      readonly bonusDamageMultiplierIfBurnOrFreeze?: number;
      readonly damageType: AbilityDamageType;
      readonly armorPiercing?: boolean;
      readonly shieldPiercing?: boolean;
      readonly applyStatus?: AttachedStatusSpec;
      readonly applyStatuses?: readonly AttachedStatusSpec[];
    }
  | {
      readonly kind: 'status';
      readonly scope:
        | 'self'
        | 'same-lane-enemies'
        | 'all-enemies'
        | 'area-3x3-self'
        | 'front-3-cells'
        | 'first-enemy-per-lane'
        | 'highest-hp-same-lane'
        | 'ally-3x3';
      readonly radius?: number;
      readonly frontCells?: number;
      readonly status: AttachedStatusSpec;
    }
  | {
      readonly kind: 'shield';
      readonly shieldMaxHpPct: number;
      readonly frontSlowZone?: {
        readonly slowPct: number;
        readonly residualDurationSeconds: number;
      };
    }
  | {
      readonly kind: 'redirect';
      readonly radius: number;
      readonly redirectSharePct: number;
      readonly durationSeconds: number;
    }
  | {
      readonly kind: 'multihit-projectile';
      readonly count: number;
      readonly intervalSeconds: number;
      readonly damageMultiplier: number;
      readonly targetMaxHpBonusPct?: number;
      readonly damageType: AbilityDamageType;
      readonly projectileSpeed: number;
      readonly pierce: boolean;
      readonly armorPiercing?: boolean;
      readonly shieldPiercing?: boolean;
      readonly applyStatus?: AttachedStatusSpec;
      readonly applyStatuses?: readonly AttachedStatusSpec[];
    }
  | {
      readonly kind: 'projectile';
      readonly damageMultiplier: number;
      readonly targetMaxHpBonusPct?: number;
      readonly damageType: AbilityDamageType;
      readonly projectileSpeed: number;
      readonly pierce: boolean;
      readonly armorPiercing?: boolean;
      readonly shieldPiercing?: boolean;
      readonly applyStatus?: AttachedStatusSpec;
      readonly applyStatuses?: readonly AttachedStatusSpec[];
    }
  | {
      readonly kind: 'multihit-melee';
      readonly count: number;
      readonly intervalSeconds: number;
      readonly damageMultiplier: number;
      readonly damageType: AbilityDamageType;
      readonly range?: number;
      readonly armorPiercing?: boolean;
      readonly shieldPiercing?: boolean;
      readonly applyStatus?: AttachedStatusSpec;
    }
  | {
      readonly kind: 'multihit-falling-area';
      readonly count: number;
      readonly intervalSeconds: number;
      readonly travelSeconds: number;
      readonly radius: number;
      readonly sameLaneOnly?: boolean;
      readonly damageMultiplier: number;
      readonly damageType: AbilityDamageType;
      readonly armorPiercing?: boolean;
      readonly shieldPiercing?: boolean;
      readonly applyStatus?: AttachedStatusSpec;
    };

export interface AbilityDefinition {
  readonly id: string;
  readonly ownerDefenderId: string;
  readonly powerCrystalCost: number;
  readonly cooldownSeconds: number;
  readonly requiresTarget: boolean;
  readonly targetScope: AbilityTargetScope;
  readonly allowWhileDisabled?: boolean;
  readonly effects: readonly AbilityEffectDefinition[];
}

export interface AbilitySessionInput {
  readonly abilities: readonly AbilityDefinition[];
}

/** Convert a nonnegative duration in seconds into simulation ticks, preserving zero. */
export function ticksFromSeconds(seconds: number, rate: number): number {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds < 0) {
    throw new RangeError('Expected nonnegative finite seconds');
  }
  if (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) {
    throw new RangeError('Expected positive finite tick rate');
  }
  if (seconds === 0) return 0;
  return count(Math.max(1, Math.ceil(seconds * rate - 1e-9)));
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

function safeIntAtLeast(value: unknown, min: number, label: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min) {
    throw new RangeError(`Expected safe integer >= ${min} for ${label}`);
  }
  return value;
}

function unitIntervalPct(value: unknown, allowZero: boolean, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value > 1 || (allowZero ? value < 0 : value <= 0)) {
    throw new RangeError(`Expected valid percentage for ${label}`);
  }
  return value;
}

function requiredBoolean(value: unknown, label: string): boolean {
  if (typeof value !== 'boolean') throw new TypeError(`Expected boolean ${label}`);
  return value;
}

function optionalBoolean(value: unknown, label: string): void {
  if (value !== undefined && typeof value !== 'boolean') {
    throw new TypeError(`Expected optional boolean ${label}`);
  }
}

function validateDamageType(value: unknown): void {
  if (!DAMAGE_TYPES.has(value as AbilityDamageType)) {
    throw new TypeError(`Unsupported ability damage type: ${String(value)}`);
  }
}

function validateAttachedStatus(status: unknown, rate: number): void {
  if (!status || typeof status !== 'object') throw new TypeError('Invalid attached status definition');
  const spec = status as AttachedStatusSpec;
  switch (spec.kind) {
    case 'slow':
      unitIntervalPct(spec.slowPct, true, 'slowPct');
      ticksFromSeconds(positiveFinite(spec.durationSeconds, 'slow durationSeconds'), rate);
      return;
    case 'stun':
      ticksFromSeconds(positiveFinite(spec.durationSeconds, 'stun durationSeconds'), rate);
      return;
    case 'freeze':
      ticksFromSeconds(positiveFinite(spec.durationSeconds, 'freeze durationSeconds'), rate);
      return;
    case 'vulnerable':
      nonNegativeFinite(spec.damageTakenBonusPct, 'vulnerable damageTakenBonusPct');
      ticksFromSeconds(positiveFinite(spec.durationSeconds, 'vulnerable durationSeconds'), rate);
      return;
    case 'burn':
      nonNegativeFinite(spec.damageMultiplierPerSecond, 'burn damageMultiplierPerSecond');
      ticksFromSeconds(positiveFinite(spec.durationSeconds, 'burn durationSeconds'), rate);
      ticksFromSeconds(positiveFinite(spec.tickIntervalSeconds, 'burn tickIntervalSeconds'), rate);
      if (spec.damageType !== undefined && spec.damageType !== 'fire') {
        throw new TypeError(`Invalid burn damageType: ${String(spec.damageType)}`);
      }
      return;
    case 'buff':
      nonNegativeFinite(spec.attackSpeedBonusPct, 'buff attackSpeedBonusPct');
      nonNegativeFinite(spec.attackDamageBonusPct, 'buff attackDamageBonusPct');
      ticksFromSeconds(positiveFinite(spec.durationSeconds, 'buff durationSeconds'), rate);
      return;
    default:
      throw new TypeError(`Unsupported status kind: ${String((spec as { kind?: unknown }).kind)}`);
  }
}

function validateDamageOptions(
  effect: {
    readonly damageMultiplier: number;
    readonly bonusDamageMultiplierIfChilled?: number;
    readonly bonusDamageMultiplierIfBurnOrFreeze?: number;
    readonly targetMaxHpBonusPct?: number;
    readonly damageType: AbilityDamageType;
    readonly armorPiercing?: boolean;
    readonly shieldPiercing?: boolean;
    readonly applyStatus?: AttachedStatusSpec;
    readonly applyStatuses?: readonly AttachedStatusSpec[];
  },
  rate: number,
): void {
  nonNegativeFinite(effect.damageMultiplier, 'effect damageMultiplier');
  if (effect.bonusDamageMultiplierIfChilled !== undefined) {
    nonNegativeFinite(effect.bonusDamageMultiplierIfChilled, 'effect bonusDamageMultiplierIfChilled');
  }
  if (effect.bonusDamageMultiplierIfBurnOrFreeze !== undefined) {
    nonNegativeFinite(
      effect.bonusDamageMultiplierIfBurnOrFreeze,
      'effect bonusDamageMultiplierIfBurnOrFreeze',
    );
  }
  if (effect.targetMaxHpBonusPct !== undefined) {
    nonNegativeFinite(effect.targetMaxHpBonusPct, 'effect targetMaxHpBonusPct');
  }
  validateDamageType(effect.damageType);
  optionalBoolean(effect.armorPiercing, 'armorPiercing');
  optionalBoolean(effect.shieldPiercing, 'shieldPiercing');
  if (effect.applyStatus !== undefined) validateAttachedStatus(effect.applyStatus, rate);
  if (effect.applyStatuses !== undefined) {
    if (!Array.isArray(effect.applyStatuses)) {
      throw new TypeError('Expected array for applyStatuses');
    }
    for (const status of effect.applyStatuses) validateAttachedStatus(status, rate);
  }
}

function validateEffect(effect: unknown, rate: number): void {
  if (!effect || typeof effect !== 'object') throw new TypeError('Invalid ability effect definition');
  const def = effect as AbilityEffectDefinition;
  switch (def.kind) {
    case 'instant-damage':
      if (!INSTANT_DAMAGE_SCOPES.has(def.scope)) {
        throw new TypeError(`Invalid instant-damage scope: ${String(def.scope)}`);
      }
      if (def.radius !== undefined) safeIntAtLeast(def.radius, 0, 'instant-damage radius');
      if (def.frontCells !== undefined) safeIntAtLeast(def.frontCells, 1, 'instant-damage frontCells');
      validateDamageOptions(def, rate);
      return;
    case 'status':
      if (!STATUS_EFFECT_SCOPES.has(def.scope)) {
        throw new TypeError(`Invalid status scope: ${String(def.scope)}`);
      }
      if (def.radius !== undefined) safeIntAtLeast(def.radius, 0, 'status radius');
      if (def.frontCells !== undefined) safeIntAtLeast(def.frontCells, 1, 'status frontCells');
      validateAttachedStatus(def.status, rate);
      return;
    case 'shield':
      positiveFinite(def.shieldMaxHpPct, 'shieldMaxHpPct');
      if (def.frontSlowZone !== undefined) {
        if (!def.frontSlowZone || typeof def.frontSlowZone !== 'object') {
          throw new TypeError('Invalid frontSlowZone definition');
        }
        unitIntervalPct(def.frontSlowZone.slowPct, true, 'frontSlowZone.slowPct');
        ticksFromSeconds(
          positiveFinite(def.frontSlowZone.residualDurationSeconds, 'frontSlowZone.residualDurationSeconds'),
          rate,
        );
      }
      return;
    case 'redirect':
      safeIntAtLeast(def.radius, 0, 'redirect radius');
      unitIntervalPct(def.redirectSharePct, false, 'redirectSharePct');
      ticksFromSeconds(positiveFinite(def.durationSeconds, 'redirect durationSeconds'), rate);
      return;
    case 'multihit-projectile':
      safeIntAtLeast(def.count, 1, 'multihit-projectile count');
      ticksFromSeconds(positiveFinite(def.intervalSeconds, 'multihit-projectile intervalSeconds'), rate);
      positiveFinite(def.projectileSpeed, 'multihit-projectile projectileSpeed');
      requiredBoolean(def.pierce, 'multihit-projectile pierce');
      validateDamageOptions(def, rate);
      return;
    case 'projectile':
      positiveFinite(def.projectileSpeed, 'projectile projectileSpeed');
      requiredBoolean(def.pierce, 'projectile pierce');
      validateDamageOptions(def, rate);
      return;
    case 'multihit-melee':
      safeIntAtLeast(def.count, 1, 'multihit-melee count');
      ticksFromSeconds(positiveFinite(def.intervalSeconds, 'multihit-melee intervalSeconds'), rate);
      if (def.range !== undefined) nonNegativeFinite(def.range, 'multihit-melee range');
      validateDamageOptions(def, rate);
      return;
    case 'multihit-falling-area':
      safeIntAtLeast(def.count, 1, 'multihit-falling-area count');
      ticksFromSeconds(positiveFinite(def.intervalSeconds, 'multihit-falling-area intervalSeconds'), rate);
      ticksFromSeconds(nonNegativeFinite(def.travelSeconds, 'multihit-falling-area travelSeconds'), rate);
      safeIntAtLeast(def.radius, 0, 'multihit-falling-area radius');
      optionalBoolean(def.sameLaneOnly, 'multihit-falling-area sameLaneOnly');
      validateDamageOptions(def, rate);
      return;
    default:
      throw new TypeError(`Unsupported ability effect kind: ${String((def as { kind?: unknown }).kind)}`);
  }
}

function freezeData<T extends object>(value: T): T {
  for (const field of Object.values(value)) if (field && typeof field === 'object') freezeData(field);
  return Object.freeze(value);
}

/** Validate and freeze Special Ability definitions before battle start; invalid configurations fail closed. */
export function validateAbilitySession(
  input: AbilitySessionInput,
  rate: number,
  combatSession?: CombatSession,
  resourceSession?: ResourceSession,
) {
  if (!input || typeof input !== 'object') throw new TypeError('Missing ability session input');
  positiveFinite(rate, 'tick rate');
  count(Math.ceil(rate));
  if (!combatSession) throw new TypeError('Missing combat session for ability validation');

  const config = structuredClone(input);
  if (!Array.isArray(config.abilities) || config.abilities.length === 0) {
    throw new TypeError('Expected non-empty abilities array');
  }

  const abilitiesById: Record<string, AbilityDefinition> = Object.create(null);
  const abilitiesByDefenderId: Record<string, AbilityDefinition> = Object.create(null);
  const cooldownTicksById: Record<string, number> = Object.create(null);

  for (const ability of config.abilities) {
    if (!ability || typeof ability !== 'object') throw new TypeError('Invalid ability definition');
    if (typeof ability.id !== 'string' || !ABILITY_ID_PATTERN.test(ability.id) || ability.id in abilitiesById) {
      throw new TypeError(`Invalid or duplicate ability ID: ${String(ability.id)}`);
    }
    if (
      typeof ability.ownerDefenderId !== 'string' ||
      !(ability.ownerDefenderId in combatSession.defendersById) ||
      ability.ownerDefenderId in abilitiesByDefenderId
    ) {
      throw new TypeError(`Invalid, unknown, or duplicate ability ownerDefenderId: ${String(ability.ownerDefenderId)}`);
    }
    const cost = count(ability.powerCrystalCost);
    if (cost > 0 && !resourceSession) {
      throw new TypeError('Resource session required when powerCrystalCost > 0');
    }
    const cooldownTicks = ticksFromSeconds(
      nonNegativeFinite(ability.cooldownSeconds, `cooldownSeconds for ${ability.id}`),
      rate,
    );
    requiredBoolean(ability.requiresTarget, `requiresTarget for ${ability.id}`);
    if (!TARGET_SCOPES.has(ability.targetScope)) {
      throw new TypeError(`Unsupported targetScope for ${ability.id}: ${String(ability.targetScope)}`);
    }
    optionalBoolean(ability.allowWhileDisabled, `allowWhileDisabled for ${ability.id}`);
    if (!Array.isArray(ability.effects) || ability.effects.length === 0) {
      throw new TypeError(`Expected non-empty effects array for ${ability.id}`);
    }
    for (const effect of ability.effects) validateEffect(effect, rate);

    abilitiesById[ability.id] = ability;
    abilitiesByDefenderId[ability.ownerDefenderId] = ability;
    cooldownTicksById[ability.id] = cooldownTicks;
  }

  return freezeData({
    rate,
    abilities: config.abilities,
    abilitiesById,
    abilitiesByDefenderId,
    cooldownTicksById,
  });
}

export type AbilitySession = ReturnType<typeof validateAbilitySession>;
