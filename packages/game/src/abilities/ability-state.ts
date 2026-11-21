import type { Cell } from '../battlefield/grid';
import type { DamageModifier, SpeedModifier } from '../combat/combat-state';
import type { EntityId } from '../entities/runtime-entity';
import type { AbilityDamageType, AttachedStatusSpec } from './ability-session';

export type AbilityCommand = {
  readonly type: 'activate-ability';
  readonly defenderId: EntityId;
  readonly targetCell?: Cell;
};

export type AbilityValidationReason =
  | 'invalid-owner'
  | 'owner-dead'
  | 'owner-disabled'
  | 'ability-unavailable'
  | 'insufficient-crystals'
  | 'on-cooldown'
  | 'no-target'
  | 'invalid-target-cell';

export interface AbilityOutcome {
  readonly eventId: string;
  readonly status: 'APPLIED' | 'REJECTED';
  readonly reason?: AbilityValidationReason;
  readonly defenderId?: EntityId;
  readonly abilityId?: string;
  readonly activationId?: bigint;
}

export interface ActiveStatusInstance {
  statusId: bigint;
  version: number;
  targetEntityId: EntityId;
  sourceEntityId: EntityId;
  abilityId: string;
  kind: 'slow' | 'stun' | 'freeze' | 'burn' | 'buff';
  remainingTicks: number;
  slowPct?: number;
  isZoneDerived?: boolean;
  zoneShieldId?: bigint;
  burnDamagePerTick?: number;
  burnTickIntervalTicks?: number;
  burnNextTickRemaining?: number;
  attackSpeedBonusPct?: number;
  attackDamageBonusPct?: number;
}

export interface ActiveShieldInstance {
  shieldId: bigint;
  creationOrder: number;
  ownerId: EntityId;
  abilityId: string;
  amount: number;
  maxAmount: number;
  frontSlowZone?: {
    readonly row: number;
    readonly column: number;
    readonly slowPct: number;
    readonly residualDurationTicks: number;
  };
}

export interface ActiveRedirectAura {
  redirectId: bigint;
  ownerId: EntityId;
  abilityId: string;
  radius: number;
  redirectSharePct: number;
  remainingTicks: number;
}

export interface ActiveMultihitCadence {
  activationId: bigint;
  ownerId: EntityId;
  abilityId: string;
  effectIndex: number;
  status: 'ACTIVE' | 'PAUSED';
  remainingShots: number;
  shotIndex: number;
  intervalTicks: number;
  nextShotRemainingTicks: number;
  lockedCenterCell?: Cell;
}

export type ActiveProjectile =
  | {
      projectileId: bigint;
      kind: 'lane';
      sourceId: EntityId;
      abilityId: string;
      lane: number;
      x: number;
      speedPerTick: number;
      damage: number;
      damageType: AbilityDamageType;
      pierce: boolean;
      armorPiercing: boolean;
      shieldPiercing: boolean;
      hitEnemyIds: Set<EntityId>;
      applyStatus?: AttachedStatusSpec;
    }
  | {
      projectileId: bigint;
      kind: 'falling';
      sourceId: EntityId;
      abilityId: string;
      impactCell: Cell;
      remainingTravelTicks: number;
      damage: number;
      damageType: AbilityDamageType;
      armorPiercing: boolean;
      shieldPiercing: boolean;
      applyStatus?: AttachedStatusSpec;
    };

export interface AbilityState {
  readonly cooldowns: Map<EntityId, number>;
  readonly statuses: ActiveStatusInstance[];
  readonly shields: ActiveShieldInstance[];
  readonly redirects: ActiveRedirectAura[];
  readonly cadences: ActiveMultihitCadence[];
  readonly projectiles: ActiveProjectile[];
  nextEffectId: bigint;
  nextShieldOrder: number;
  outcome: AbilityOutcome | null;
}

/** Create initial structuredClone-safe runtime state for Special Abilities. */
export function createAbilityState(): AbilityState {
  return {
    cooldowns: new Map(),
    statuses: [],
    shields: [],
    redirects: [],
    cadences: [],
    projectiles: [],
    nextEffectId: 0n,
    nextShieldOrder: 0,
    outcome: null,
  };
}

/** Return true if the unit currently has an active Stun or Freeze status. */
export function isUnitDisabled(abilities: AbilityState | undefined, entityId: EntityId): boolean {
  if (!abilities) return false;
  for (const status of abilities.statuses) {
    if (
      status.targetEntityId === entityId &&
      status.remainingTicks > 0 &&
      (status.kind === 'stun' || status.kind === 'freeze')
    ) {
      return true;
    }
  }
  return false;
}

/** Build movement speed modifiers using the strongest active Slow on the Enemy. */
export function getEnemySpeedModifiers(abilities: AbilityState | undefined, entityId: EntityId): SpeedModifier[] {
  if (!abilities) return [];
  let maxSlowPct = 0;
  for (const status of abilities.statuses) {
    if (status.targetEntityId === entityId && status.kind === 'slow' && status.remainingTicks > 0) {
      const slowPct = status.slowPct ?? 0;
      if (slowPct > maxSlowPct) maxSlowPct = slowPct;
    }
  }
  if (maxSlowPct <= 0) return [];
  const scale = Math.max(0, 1 - maxSlowPct);
  return [speed => speed * scale];
}

/** Build additive damage modifiers across all active Buffs on the Defender. */
export function getDefenderDamageModifiers(abilities: AbilityState | undefined, entityId: EntityId): DamageModifier[] {
  if (!abilities) return [];
  let bonusSum = 0;
  for (const status of abilities.statuses) {
    if (status.targetEntityId === entityId && status.kind === 'buff' && status.remainingTicks > 0) {
      bonusSum += status.attackDamageBonusPct ?? 0;
    }
  }
  if (bonusSum <= 0) return [];
  return [damage => damage * (1 + bonusSum)];
}

/** Compute additive Attack Speed multiplier across all active Buffs on the Defender. */
export function getDefenderAttackSpeedMultiplier(abilities: AbilityState | undefined, entityId: EntityId): number {
  if (!abilities) return 1;
  let bonusSum = 0;
  for (const status of abilities.statuses) {
    if (status.targetEntityId === entityId && status.kind === 'buff' && status.remainingTicks > 0) {
      bonusSum += status.attackSpeedBonusPct ?? 0;
    }
  }
  return 1 + bonusSum;
}
