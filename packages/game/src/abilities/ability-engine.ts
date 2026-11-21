import { BATTLEFIELD_COLUMNS, isLane, type Cell } from '../battlefield/grid';
import { selectDefenderTarget } from '../combat/combat-engine';
import type { CombatSession, DefenderCombatDefinition } from '../combat/combat-session';
import {
  computeDamage,
  unregisterCombatEntity,
  type CombatState,
} from '../combat/combat-state';
import { applyBattleCommand, type BattleState } from '../core/battle-state';
import type { EntityId } from '../entities/runtime-entity';
import {
  ticksFromSeconds,
  type AbilityDamageType,
  type AbilityDefinition,
  type AbilityEffectDefinition,
  type AbilitySession,
  type AttachedStatusSpec,
} from './ability-session';
import {
  getDefenderDamageModifiers,
  isUnitDisabled,
  type AbilityCommand,
  type AbilityState,
  type AbilityValidationReason,
  type ActiveMultihitCadence,
  type ActiveProjectile,
  type ActiveRedirectAura,
  type ActiveShieldInstance,
} from './ability-state';

const SHIELD_BREAK_EPSILON = 1e-12;

export type BattleWithAbilities = BattleState & { abilities?: AbilityState };

type CombatMitigationFields = {
  readonly armor?: number;
  readonly fireResistancePct?: number;
  readonly freezeImmune?: boolean;
  readonly freezeResistancePct?: number;
};

export interface AbilityRewardEnemy {
  readonly id: EntityId;
  readonly definitionId: string;
  readonly lane: number;
  readonly position: number;
}

export type EnqueueReward = (enemy: AbilityRewardEnemy) => void;

export interface AbilityDamageContext {
  readonly battle: BattleWithAbilities;
  readonly combat: CombatState;
  readonly session: CombatSession;
}

export interface ProjectileCrossingContext extends AbilityDamageContext {
  readonly abilitySession?: AbilitySession;
}

export interface MovedEnemyStep {
  readonly id: EntityId;
  readonly lane: number;
  readonly oldX: number;
  readonly newX: number;
}

export interface AbilityEngineContext extends AbilityDamageContext {
  readonly abilitySession: AbilitySession;
}

export interface DamagePipelineOptions {
  readonly damageType: AbilityDamageType;
  readonly armorPiercing?: boolean;
  readonly shieldPiercing?: boolean;
  readonly isRedirected?: boolean;
}

function compareEntityIds(a: EntityId, b: EntityId): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function clampColumn(column: number): number {
  return Math.max(0, Math.min(BATTLEFIELD_COLUMNS - 1, column));
}

function isValidGridCell(cell: unknown): cell is Cell {
  if (!cell || typeof cell !== 'object') return false;
  const candidate = cell as Cell;
  return (
    isLane(candidate.row) &&
    Number.isInteger(candidate.column) &&
    candidate.column >= 0 &&
    candidate.column < BATTLEFIELD_COLUMNS
  );
}

function filterInPlace<T>(items: T[], keep: (item: T) => boolean): void {
  let write = 0;
  for (let read = 0; read < items.length; read++) {
    if (keep(items[read])) items[write++] = items[read];
  }
  items.length = write;
}

function convertZoneSlowsToResidual(
  abilities: AbilityState,
  shieldId: bigint,
  residualDurationTicks: number,
): void {
  for (const status of abilities.statuses) {
    if (status.isZoneDerived && status.zoneShieldId === shieldId) {
      status.isZoneDerived = false;
      status.zoneShieldId = undefined;
      status.remainingTicks = residualDurationTicks;
    }
  }
}

function absorbShieldsAndApplyHp(
  ctx: AbilityDamageContext,
  targetId: EntityId,
  amount: number,
  shieldPiercing: boolean,
): number {
  let remaining = amount;
  let absorbed = 0;
  const abilities = ctx.battle.abilities;

  if (!shieldPiercing && abilities && remaining > 0) {
    const targetShields = abilities.shields
      .filter(shield => shield.ownerId === targetId && shield.amount > 0)
      .sort((a, b) => a.creationOrder - b.creationOrder);
    const brokenIds = new Set<bigint>();
    const brokenWithZone: ActiveShieldInstance[] = [];

    for (const shield of targetShields) {
      if (remaining <= 0) break;
      const soak = Math.min(shield.amount, remaining);
      shield.amount -= soak;
      remaining -= soak;
      absorbed += soak;
      if (shield.amount <= SHIELD_BREAK_EPSILON) {
        shield.amount = 0;
        brokenIds.add(shield.shieldId);
        if (shield.frontSlowZone) brokenWithZone.push(shield);
      }
    }

    if (brokenIds.size > 0) {
      filterInPlace(abilities.shields, shield => !brokenIds.has(shield.shieldId));
      for (const shield of brokenWithZone) {
        convertZoneSlowsToResidual(
          abilities,
          shield.shieldId,
          shield.frontSlowZone!.residualDurationTicks,
        );
      }
    }
  }

  const targetCombat = ctx.combat.entities.get(targetId)!;
  const prevHp = targetCombat.hp;
  const nextHp = Math.max(0, prevHp - remaining);
  if (!Number.isFinite(nextHp)) throw new RangeError('Non-finite HP');
  targetCombat.hp = nextHp;
  return absorbed + (prevHp - nextHp);
}

function findNearestRedirectAura(
  ctx: AbilityDamageContext,
  targetId: EntityId,
  targetCell: Cell,
): ActiveRedirectAura | null {
  const abilities = ctx.battle.abilities;
  if (!abilities) return null;

  let bestAura: ActiveRedirectAura | null = null;
  let bestDistance = Infinity;

  for (const aura of abilities.redirects) {
    if (aura.remainingTicks <= 0 || aura.ownerId === targetId) continue;
    const ownerEntity = ctx.battle.entities.get(aura.ownerId);
    const ownerCombat = ctx.combat.entities.get(aura.ownerId);
    if (!ownerEntity || ownerEntity.kind !== 'defender' || !ownerCombat || ownerCombat.hp <= 0) continue;

    const dr = Math.abs(targetCell.row - ownerEntity.cell.row);
    const dc = Math.abs(targetCell.column - ownerEntity.cell.column);
    if (dr > aura.radius || dc > aura.radius) continue;

    const manhattan = dr + dc;
    if (
      bestAura === null ||
      manhattan < bestDistance ||
      (manhattan === bestDistance && aura.ownerId < bestAura.ownerId)
    ) {
      bestAura = aura;
      bestDistance = manhattan;
    }
  }

  return bestAura;
}

/**
 * Apply damage using the G09 pipeline: Armor/Resistance -> Redirect -> Shield -> HP.
 * Post-mitigation zero damage still confirms a hit so on-hit statuses can apply.
 */
export function applyDamagePipeline(
  ctx: AbilityDamageContext,
  targetId: EntityId,
  rawDamage: number,
  options: DamagePipelineOptions,
): { hitConfirmed: boolean; damageApplied: number } {
  if (!Number.isFinite(rawDamage) || rawDamage < 0) {
    throw new RangeError('Invalid raw damage');
  }
  const targetEntity = ctx.battle.entities.get(targetId);
  const targetCombat = ctx.combat.entities.get(targetId);
  if (!targetEntity || !targetCombat || targetCombat.hp <= 0) {
    return { hitConfirmed: false, damageApplied: 0 };
  }

  const targetDef = targetEntity.kind === 'defender'
    ? ctx.session.defendersById[targetEntity.definitionId]
    : ctx.session.enemiesById[targetEntity.definitionId];
  const mitigation = targetDef as CombatMitigationFields | undefined;

  let dmg = rawDamage;
  if (!options.armorPiercing) {
    dmg = Math.max(0, dmg - (mitigation?.armor ?? 0));
  }
  if (options.damageType === 'fire') {
    const fireRes = Math.max(0, Math.min(1, mitigation?.fireResistancePct ?? 0));
    dmg = Math.max(0, dmg * (1 - fireRes));
  }
  if (!Number.isFinite(dmg)) throw new RangeError('Non-finite mitigated damage');
  if (dmg === 0) return { hitConfirmed: true, damageApplied: 0 };

  if (targetEntity.kind === 'defender' && !options.isRedirected) {
    const redirect = findNearestRedirectAura(ctx, targetId, targetEntity.cell);
    if (redirect) {
      const redirectShare = dmg * redirect.redirectSharePct;
      dmg = Math.max(0, dmg - redirectShare);
      // Redirected damage skips Guardian Armor/Resistance and never chains again.
      absorbShieldsAndApplyHp(ctx, redirect.ownerId, redirectShare, Boolean(options.shieldPiercing));
    }
  }

  const damageApplied = absorbShieldsAndApplyHp(ctx, targetId, dmg, Boolean(options.shieldPiercing));
  return { hitConfirmed: true, damageApplied };
}

/** Remove all entity-owned transient state on death or Fusion while keeping remote statuses and fired projectiles. */
export function cleanupEntityAbilityState(
  battle: BattleWithAbilities,
  entityId: EntityId,
  _reason: 'death' | 'fusion',
): void {
  const abilities = battle.abilities;
  if (!abilities) return;

  abilities.cooldowns.delete(entityId);
  filterInPlace(abilities.statuses, status => status.targetEntityId !== entityId);

  filterInPlace(abilities.shields, shield => {
    if (shield.ownerId !== entityId) return true;
    if (shield.frontSlowZone) {
      convertZoneSlowsToResidual(
        abilities,
        shield.shieldId,
        shield.frontSlowZone.residualDurationTicks,
      );
    }
    return false;
  });

  filterInPlace(abilities.redirects, redirect => redirect.ownerId !== entityId);
  filterInPlace(abilities.cadences, cadence => cadence.ownerId !== entityId);
}

/** Remove all entities with HP <= 0 in ascending EntityId order, cleaning up ability state and queuing rewards. */
export function resolveCombatDeaths(
  battle: BattleWithAbilities,
  combat: CombatState,
  enqueueReward: EnqueueReward,
): void {
  const deadIds: EntityId[] = [];
  for (const [id, cState] of combat.entities) {
    if (cState.hp <= 0) deadIds.push(id);
  }
  deadIds.sort(compareEntityIds);

  for (const id of deadIds) {
    const entity = battle.entities.get(id);
    if (!entity) {
      unregisterCombatEntity(combat, id);
      cleanupEntityAbilityState(battle, id, 'death');
      continue;
    }
    if (entity.kind === 'enemy') {
      const rewardInfo: AbilityRewardEnemy = {
        id,
        definitionId: entity.definitionId,
        lane: entity.lane,
        position: entity.position,
      };
      applyBattleCommand(battle, { type: 'remove', id });
      unregisterCombatEntity(combat, id);
      cleanupEntityAbilityState(battle, id, 'death');
      enqueueReward(rewardInfo);
    } else {
      applyBattleCommand(battle, { type: 'remove', id });
      unregisterCombatEntity(combat, id);
      cleanupEntityAbilityState(battle, id, 'death');
    }
  }
}

function getDefenderAttackDamage(
  battle: BattleWithAbilities,
  session: CombatSession,
  defenderId: EntityId,
): number {
  const entity = battle.entities.get(defenderId);
  if (!entity || entity.kind !== 'defender') throw new Error('Unknown defender entity');
  const def = session.defendersById[entity.definitionId];
  if (!def) throw new TypeError(`Unknown defender combat definition: ${entity.definitionId}`);
  return computeDamage(def.damage, getDefenderDamageModifiers(battle.abilities, defenderId));
}

function listLivingEnemyIds(
  battle: BattleWithAbilities,
  combat: CombatState,
  laneFilter?: number,
): EntityId[] {
  const ids: EntityId[] = [];
  for (const [id, entity] of battle.entities) {
    if (entity.kind !== 'enemy') continue;
    if (laneFilter !== undefined && entity.lane !== laneFilter) continue;
    const cState = combat.entities.get(id);
    if (cState && cState.hp > 0) ids.push(id);
  }
  ids.sort(compareEntityIds);
  return ids;
}

function listLivingAllyIdsInRadius(
  battle: BattleWithAbilities,
  combat: CombatState,
  center: Cell,
  radius: number,
): EntityId[] {
  const ids: EntityId[] = [];
  for (const [id, entity] of battle.entities) {
    if (entity.kind !== 'defender') continue;
    const cState = combat.entities.get(id);
    if (!cState || cState.hp <= 0) continue;
    if (Math.abs(entity.cell.row - center.row) <= radius && Math.abs(entity.cell.column - center.column) <= radius) {
      ids.push(id);
    }
  }
  ids.sort(compareEntityIds);
  return ids;
}

function findClosestLivingEnemy(
  battle: BattleWithAbilities,
  combat: CombatState,
  areaFilter?: { readonly center: Cell; readonly radius: number },
): { id: EntityId; lane: number; position: number; column: number } | null {
  let best: { id: EntityId; lane: number; position: number; column: number } | null = null;
  for (const [id, entity] of battle.entities) {
    if (entity.kind !== 'enemy') continue;
    const cState = combat.entities.get(id);
    if (!cState || cState.hp <= 0) continue;
    const column = clampColumn(Math.floor(entity.position));
    if (areaFilter) {
      if (
        Math.abs(entity.lane - areaFilter.center.row) > areaFilter.radius ||
        Math.abs(column - areaFilter.center.column) > areaFilter.radius
      ) {
        continue;
      }
    }
    if (
      !best ||
      entity.position < best.position ||
      (entity.position === best.position &&
        (entity.lane < best.lane || (entity.lane === best.lane && id < best.id)))
    ) {
      best = { id, lane: entity.lane, position: entity.position, column };
    }
  }
  return best;
}

function applyStatusToTarget(
  ctx: ProjectileCrossingContext,
  targetId: EntityId,
  sourceId: EntityId,
  abilityId: string,
  spec: AttachedStatusSpec,
  sourceAttackDamage: number,
): void {
  const abilities = ctx.battle.abilities;
  if (!abilities) return;
  const targetEntity = ctx.battle.entities.get(targetId);
  const targetCombat = ctx.combat.entities.get(targetId);
  if (!targetEntity || !targetCombat || targetCombat.hp <= 0) return;

  const rate = ctx.abilitySession?.rate ?? ctx.session.rate;
  let durationTicks = 0;
  let slowPct: number | undefined;
  let burnDamagePerTick: number | undefined;
  let burnTickIntervalTicks: number | undefined;
  let attackSpeedBonusPct: number | undefined;
  let attackDamageBonusPct: number | undefined;

  switch (spec.kind) {
    case 'slow':
      durationTicks = ticksFromSeconds(spec.durationSeconds, rate);
      slowPct = spec.slowPct;
      break;
    case 'stun':
      durationTicks = ticksFromSeconds(spec.durationSeconds, rate);
      break;
    case 'freeze': {
      const targetDef = targetEntity.kind === 'defender'
        ? ctx.session.defendersById[targetEntity.definitionId]
        : ctx.session.enemiesById[targetEntity.definitionId];
      const mitigation = targetDef as CombatMitigationFields | undefined;
      if (mitigation?.freezeImmune) return;
      const resistance = Math.max(0, Math.min(1, mitigation?.freezeResistancePct ?? 0));
      durationTicks = ticksFromSeconds(
        spec.durationSeconds * (1 - resistance),
        rate,
      );
      if (durationTicks <= 0) return;
      break;
    }
    case 'burn':
      durationTicks = ticksFromSeconds(spec.durationSeconds, rate);
      burnTickIntervalTicks = Math.max(
        1,
        ticksFromSeconds(spec.tickIntervalSeconds, rate),
      );
      burnDamagePerTick =
        sourceAttackDamage * spec.damageMultiplierPerSecond * spec.tickIntervalSeconds;
      if (!Number.isFinite(burnDamagePerTick)) throw new RangeError('Non-finite burn damage');
      break;
    case 'buff':
      durationTicks = ticksFromSeconds(spec.durationSeconds, rate);
      attackSpeedBonusPct = spec.attackSpeedBonusPct;
      attackDamageBonusPct = spec.attackDamageBonusPct;
      break;
  }

  const existing = abilities.statuses.find(
    status =>
      status.targetEntityId === targetId &&
      status.sourceEntityId === sourceId &&
      status.abilityId === abilityId &&
      status.kind === spec.kind,
  );

  if (existing) {
    existing.version += 1;
    existing.remainingTicks = durationTicks;
    existing.isZoneDerived = false;
    existing.zoneShieldId = undefined;
    existing.slowPct = slowPct;
    existing.burnDamagePerTick = burnDamagePerTick;
    existing.burnTickIntervalTicks = burnTickIntervalTicks;
    existing.burnNextTickRemaining = burnTickIntervalTicks;
    existing.attackSpeedBonusPct = attackSpeedBonusPct;
    existing.attackDamageBonusPct = attackDamageBonusPct;
    return;
  }

  abilities.statuses.push({
    statusId: abilities.nextEffectId++,
    version: 1,
    targetEntityId: targetId,
    sourceEntityId: sourceId,
    abilityId,
    kind: spec.kind,
    remainingTicks: durationTicks,
    ...(slowPct !== undefined ? { slowPct } : {}),
    ...(burnDamagePerTick !== undefined ? { burnDamagePerTick } : {}),
    ...(burnTickIntervalTicks !== undefined
      ? { burnTickIntervalTicks, burnNextTickRemaining: burnTickIntervalTicks }
      : {}),
    ...(attackSpeedBonusPct !== undefined ? { attackSpeedBonusPct } : {}),
    ...(attackDamageBonusPct !== undefined ? { attackDamageBonusPct } : {}),
  });
}

function syncGlacialSlowZones(battle: BattleWithAbilities, combat: CombatState): void {
  const abilities = battle.abilities;
  if (!abilities) return;

  const activeZones = new Map<bigint, ActiveShieldInstance>();
  for (const shield of abilities.shields) {
    if (shield.amount > 0 && shield.frontSlowZone) {
      activeZones.set(shield.shieldId, shield);
    }
  }

  filterInPlace(abilities.statuses, status => {
    if (!status.isZoneDerived) return true;
    const shield = status.zoneShieldId !== undefined ? activeZones.get(status.zoneShieldId) : undefined;
    if (!shield || !shield.frontSlowZone) return false;
    const enemy = battle.entities.get(status.targetEntityId);
    const enemyCombat = combat.entities.get(status.targetEntityId);
    if (!enemy || enemy.kind !== 'enemy' || !enemyCombat || enemyCombat.hp <= 0) return false;
    const inZone =
      enemy.lane === shield.frontSlowZone.row &&
      Math.floor(enemy.position) === shield.frontSlowZone.column;
    if (!inZone) return false;
    status.slowPct = shield.frontSlowZone.slowPct;
    status.remainingTicks = shield.frontSlowZone.residualDurationTicks;
    return true;
  });

  for (const shield of activeZones.values()) {
    const zone = shield.frontSlowZone!;
    for (const [enemyId, entity] of battle.entities) {
      if (entity.kind !== 'enemy') continue;
      const enemyCombat = combat.entities.get(enemyId);
      if (!enemyCombat || enemyCombat.hp <= 0) continue;
      if (entity.lane !== zone.row || Math.floor(entity.position) !== zone.column) continue;

      const existing = abilities.statuses.find(
        status =>
          status.targetEntityId === enemyId &&
          status.sourceEntityId === shield.ownerId &&
          status.abilityId === shield.abilityId &&
          status.kind === 'slow',
      );
      if (existing) {
        existing.isZoneDerived = true;
        existing.zoneShieldId = shield.shieldId;
        existing.slowPct = zone.slowPct;
        existing.remainingTicks = zone.residualDurationTicks;
      } else {
        abilities.statuses.push({
          statusId: abilities.nextEffectId++,
          version: 1,
          targetEntityId: enemyId,
          sourceEntityId: shield.ownerId,
          abilityId: shield.abilityId,
          kind: 'slow',
          remainingTicks: zone.residualDurationTicks,
          slowPct: zone.slowPct,
          isZoneDerived: true,
          zoneShieldId: shield.shieldId,
        });
      }
    }
  }
}

function getMeleeScopeRange(ability: AbilityDefinition, ownerDef: DefenderCombatDefinition): number {
  const meleeEffect = ability.effects.find(effect => effect.kind === 'multihit-melee');
  return meleeEffect && meleeEffect.range !== undefined ? meleeEffect.range : ownerDef.attackRange;
}

function hasEligibleTarget(
  ctx: AbilityEngineContext,
  defenderId: EntityId,
  defenderCell: Cell,
  ownerDef: DefenderCombatDefinition,
  ability: AbilityDefinition,
): boolean {
  switch (ability.targetScope) {
    case 'self':
    case 'ally-3x3':
      return true;
    case 'same-lane-enemies':
      return listLivingEnemyIds(ctx.battle, ctx.combat, defenderCell.row).length > 0;
    case 'same-lane-enemy-in-range':
      return (
        selectDefenderTarget(
          ctx.battle,
          ctx.combat,
          ctx.session,
          defenderId,
          defenderCell,
          ownerDef,
        ) !== null
      );
    case 'all-enemies':
    case 'area-3x3-closest-enemy':
      return listLivingEnemyIds(ctx.battle, ctx.combat).length > 0;
    case 'melee-enemy': {
      const range = getMeleeScopeRange(ability, ownerDef);
      const effectiveDef = range === ownerDef.attackRange ? ownerDef : { ...ownerDef, attackRange: range };
      return (
        selectDefenderTarget(
          ctx.battle,
          ctx.combat,
          ctx.session,
          defenderId,
          defenderCell,
          effectiveDef,
        ) !== null
      );
    }
  }
}

function spawnLaneProjectile(
  ctx: AbilityEngineContext,
  sourceId: EntityId,
  abilityId: string,
  lane: number,
  x: number,
  attackDamage: number,
  effect: Extract<AbilityEffectDefinition, { kind: 'projectile' | 'multihit-projectile' }>,
): void {
  const abilities = ctx.battle.abilities!;
  abilities.projectiles.push({
    projectileId: abilities.nextEffectId++,
    kind: 'lane',
    sourceId,
    abilityId,
    lane,
    x,
    speedPerTick: effect.projectileSpeed / ctx.abilitySession.rate,
    damage: attackDamage * effect.damageMultiplier,
    damageType: effect.damageType,
    pierce: effect.pierce,
    armorPiercing: Boolean(effect.armorPiercing),
    shieldPiercing: Boolean(effect.shieldPiercing),
    hitEnemyIds: new Set(),
    ...(effect.applyStatus ? { applyStatus: { ...effect.applyStatus } } : {}),
  });
}

function resolveProjectileBurnSourceDamage(
  ctx: ProjectileCrossingContext,
  proj: ActiveProjectile,
): number {
  const ability = ctx.abilitySession?.abilitiesById[proj.abilityId];
  if (ability) {
    for (const effect of ability.effects) {
      if (
        (effect.kind === 'projectile' ||
          effect.kind === 'multihit-projectile' ||
          effect.kind === 'multihit-falling-area') &&
        effect.damageMultiplier > 0
      ) {
        return proj.damage / effect.damageMultiplier;
      }
    }
  }
  return ctx.battle.entities.has(proj.sourceId)
    ? getDefenderAttackDamage(ctx.battle, ctx.session, proj.sourceId)
    : 0;
}

function resolveFallingImpact(
  ctx: AbilityEngineContext,
  proj: Extract<ActiveProjectile, { kind: 'falling' }>,
): void {
  const targetIds: EntityId[] = [];
  for (const [id, entity] of ctx.battle.entities) {
    if (entity.kind !== 'enemy') continue;
    if (entity.lane !== proj.impactCell.row || Math.floor(entity.position) !== proj.impactCell.column) {
      continue;
    }
    const cState = ctx.combat.entities.get(id);
    if (cState && cState.hp > 0) targetIds.push(id);
  }
  targetIds.sort(compareEntityIds);
  if (targetIds.length === 0) return;

  const sourceAttackDamage = proj.applyStatus?.kind === 'burn'
    ? resolveProjectileBurnSourceDamage(ctx, proj)
    : 0;

  for (const enemyId of targetIds) {
    const res = applyDamagePipeline(ctx, enemyId, proj.damage, {
      damageType: proj.damageType,
      armorPiercing: proj.armorPiercing,
      shieldPiercing: proj.shieldPiercing,
    });
    if (res.hitConfirmed && proj.applyStatus) {
      applyStatusToTarget(
        ctx,
        enemyId,
        proj.sourceId,
        proj.abilityId,
        proj.applyStatus,
        sourceAttackDamage,
      );
    }
  }
}

function fireCadenceShot(
  ctx: AbilityEngineContext,
  ownerId: EntityId,
  abilityId: string,
  effectIndex: number,
  lockedCenterCell?: Cell,
): boolean {
  const ownerEntity = ctx.battle.entities.get(ownerId);
  const ownerCombat = ctx.combat.entities.get(ownerId);
  if (!ownerEntity || ownerEntity.kind !== 'defender' || !ownerCombat || ownerCombat.hp <= 0) {
    return false;
  }
  const ability = ctx.abilitySession.abilitiesById[abilityId];
  const effect = ability?.effects[effectIndex];
  const ownerDef = ctx.session.defendersById[ownerEntity.definitionId];
  if (!ability || !effect || !ownerDef) return false;

  switch (effect.kind) {
    case 'multihit-projectile': {
      const targetId = selectDefenderTarget(
        ctx.battle,
        ctx.combat,
        ctx.session,
        ownerId,
        ownerEntity.cell,
        ownerDef,
      );
      if (targetId === null) return false;
      const attackDamage = getDefenderAttackDamage(ctx.battle, ctx.session, ownerId);
      spawnLaneProjectile(
        ctx,
        ownerId,
        abilityId,
        ownerEntity.cell.row,
        ownerEntity.cell.column,
        attackDamage,
        effect,
      );
      return true;
    }
    case 'multihit-melee': {
      const effectiveDef = effect.range !== undefined ? { ...ownerDef, attackRange: effect.range } : ownerDef;
      const targetId = selectDefenderTarget(
        ctx.battle,
        ctx.combat,
        ctx.session,
        ownerId,
        ownerEntity.cell,
        effectiveDef,
      );
      if (targetId === null) return false;
      const attackDamage = getDefenderAttackDamage(ctx.battle, ctx.session, ownerId);
      const res = applyDamagePipeline(ctx, targetId, attackDamage * effect.damageMultiplier, {
        damageType: effect.damageType,
        armorPiercing: effect.armorPiercing,
        shieldPiercing: effect.shieldPiercing,
      });
      if (res.hitConfirmed && effect.applyStatus) {
        applyStatusToTarget(
          ctx,
          targetId,
          ownerId,
          abilityId,
          effect.applyStatus,
          attackDamage,
        );
      }
      return true;
    }
    case 'multihit-falling-area': {
      const anyEnemy = findClosestLivingEnemy(ctx.battle, ctx.combat);
      if (!anyEnemy) return false;
      const center = lockedCenterCell ?? { row: anyEnemy.lane, column: anyEnemy.column };
      const inAreaEnemy = findClosestLivingEnemy(ctx.battle, ctx.combat, {
        center,
        radius: effect.radius,
      });
      const impactCell: Cell = inAreaEnemy
        ? { row: inAreaEnemy.lane, column: inAreaEnemy.column }
        : { row: center.row, column: center.column };

      const attackDamage = getDefenderAttackDamage(ctx.battle, ctx.session, ownerId);
      const travelTicks = ticksFromSeconds(effect.travelSeconds, ctx.abilitySession.rate);
      const fallingProj: Extract<ActiveProjectile, { kind: 'falling' }> = {
        projectileId: ctx.battle.abilities!.nextEffectId++,
        kind: 'falling',
        sourceId: ownerId,
        abilityId,
        impactCell,
        remainingTravelTicks: travelTicks,
        damage: attackDamage * effect.damageMultiplier,
        damageType: effect.damageType,
        armorPiercing: Boolean(effect.armorPiercing),
        shieldPiercing: Boolean(effect.shieldPiercing),
        ...(effect.applyStatus ? { applyStatus: { ...effect.applyStatus } } : {}),
      };
      if (travelTicks === 0) {
        resolveFallingImpact(ctx, fallingProj);
      } else {
        ctx.battle.abilities!.projectiles.push(fallingProj);
      }
      return true;
    }
    default:
      return false;
  }
}

function executeImmediateEffect(
  ctx: AbilityEngineContext,
  ownerId: EntityId,
  ownerCell: Cell,
  ownerMaxHp: number,
  ability: AbilityDefinition,
  effect: AbilityEffectDefinition,
  effectIndex: number,
  activationId: bigint,
  attackDamage: number,
  targetCell?: Cell,
): void {
  const abilities = ctx.battle.abilities!;

  switch (effect.kind) {
    case 'instant-damage': {
      const targets = listLivingEnemyIds(
        ctx.battle,
        ctx.combat,
        effect.scope === 'same-lane-enemies' ? ownerCell.row : undefined,
      );
      const rawDamage = attackDamage * effect.damageMultiplier;
      for (const enemyId of targets) {
        const res = applyDamagePipeline(ctx, enemyId, rawDamage, {
          damageType: effect.damageType,
          armorPiercing: effect.armorPiercing,
          shieldPiercing: effect.shieldPiercing,
        });
        if (res.hitConfirmed && effect.applyStatus) {
          applyStatusToTarget(
            ctx,
            enemyId,
            ownerId,
            ability.id,
            effect.applyStatus,
            attackDamage,
          );
        }
      }
      return;
    }
    case 'status': {
      let targets: EntityId[];
      switch (effect.scope) {
        case 'self':
          targets = [ownerId];
          break;
        case 'same-lane-enemies':
          targets = listLivingEnemyIds(ctx.battle, ctx.combat, ownerCell.row);
          break;
        case 'all-enemies':
          targets = listLivingEnemyIds(ctx.battle, ctx.combat);
          break;
        case 'ally-3x3':
          targets = listLivingAllyIdsInRadius(ctx.battle, ctx.combat, ownerCell, effect.radius ?? 1);
          break;
      }
      for (const targetId of targets) {
        applyStatusToTarget(
          ctx,
          targetId,
          ownerId,
          ability.id,
          effect.status,
          attackDamage,
        );
      }
      return;
    }
    case 'shield': {
      const maxAmount = ownerMaxHp * effect.shieldMaxHpPct;
      if (!Number.isFinite(maxAmount) || maxAmount <= 0) throw new RangeError('Invalid shield amount');
      const frontSlowZone =
        effect.frontSlowZone && ownerCell.column + 1 < BATTLEFIELD_COLUMNS
          ? {
              row: ownerCell.row,
              column: ownerCell.column + 1,
              slowPct: effect.frontSlowZone.slowPct,
              residualDurationTicks: ticksFromSeconds(
                effect.frontSlowZone.residualDurationSeconds,
                ctx.abilitySession.rate,
              ),
            }
          : undefined;
      const existing = abilities.shields.find(
        shield => shield.ownerId === ownerId && shield.abilityId === ability.id,
      );
      if (existing) {
        existing.amount = maxAmount;
        existing.maxAmount = maxAmount;
        existing.frontSlowZone = frontSlowZone;
      } else {
        abilities.shields.push({
          shieldId: abilities.nextEffectId++,
          creationOrder: abilities.nextShieldOrder++,
          ownerId,
          abilityId: ability.id,
          amount: maxAmount,
          maxAmount,
          ...(frontSlowZone ? { frontSlowZone } : {}),
        });
      }
      if (frontSlowZone) syncGlacialSlowZones(ctx.battle, ctx.combat);
      return;
    }
    case 'redirect': {
      const durationTicks = ticksFromSeconds(effect.durationSeconds, ctx.abilitySession.rate);
      const existing = abilities.redirects.find(
        redirect => redirect.ownerId === ownerId && redirect.abilityId === ability.id,
      );
      if (existing) {
        existing.radius = effect.radius;
        existing.redirectSharePct = effect.redirectSharePct;
        existing.remainingTicks = durationTicks;
      } else {
        abilities.redirects.push({
          redirectId: abilities.nextEffectId++,
          ownerId,
          abilityId: ability.id,
          radius: effect.radius,
          redirectSharePct: effect.redirectSharePct,
          remainingTicks: durationTicks,
        });
      }
      return;
    }
    case 'projectile':
      spawnLaneProjectile(
        ctx,
        ownerId,
        ability.id,
        ownerCell.row,
        ownerCell.column,
        attackDamage,
        effect,
      );
      return;
    case 'multihit-projectile':
    case 'multihit-melee':
    case 'multihit-falling-area': {
      let lockedCenterCell: Cell | undefined;
      if (effect.kind === 'multihit-falling-area') {
        if (targetCell) {
          lockedCenterCell = { row: targetCell.row, column: targetCell.column };
        } else {
          const anchor = findClosestLivingEnemy(ctx.battle, ctx.combat);
          if (anchor) lockedCenterCell = { row: anchor.lane, column: anchor.column };
        }
      }
      const intervalTicks = Math.max(
        1,
        ticksFromSeconds(effect.intervalSeconds, ctx.abilitySession.rate),
      );
      const fired = fireCadenceShot(ctx, ownerId, ability.id, effectIndex, lockedCenterCell);
      if (fired && effect.count > 1) {
        const cadence: ActiveMultihitCadence = {
          activationId,
          ownerId,
          abilityId: ability.id,
          effectIndex,
          status: 'ACTIVE',
          remainingShots: effect.count - 1,
          shotIndex: 1,
          intervalTicks,
          nextShotRemainingTicks: intervalTicks,
          ...(lockedCenterCell ? { lockedCenterCell } : {}),
        };
        abilities.cadences.push(cadence);
      }
      return;
    }
  }
}

function rejectAbility(
  abilities: AbilityState,
  eventId: string,
  reason: AbilityValidationReason,
  defenderId?: EntityId,
  abilityId?: string,
): void {
  abilities.outcome = {
    eventId,
    status: 'REJECTED',
    reason,
    ...(defenderId !== undefined ? { defenderId } : {}),
    ...(abilityId !== undefined ? { abilityId } : {}),
  };
}

/** Validate and execute an `activate-ability` command atomically inside staged transaction state. */
export function applyAbilityCommand(
  ctx: AbilityEngineContext,
  command: AbilityCommand,
  eventId: string,
  enqueueReward: EnqueueReward,
): void {
  const { battle, combat, session, abilitySession } = ctx;
  if (battle.resources?.terminal || combat.terminal) return;

  const abilities = battle.abilities;
  if (!abilities) throw new Error('Ability state unavailable');
  if (!command || command.type !== 'activate-ability') throw new TypeError('Unknown ability command');

  if (typeof command.defenderId !== 'bigint' || command.defenderId < 0n) {
    rejectAbility(abilities, eventId, 'invalid-owner');
    return;
  }

  const ownerEntity = battle.entities.get(command.defenderId);
  if (!ownerEntity || ownerEntity.kind !== 'defender') {
    rejectAbility(abilities, eventId, 'invalid-owner', command.defenderId);
    return;
  }

  const ownerCombat = combat.entities.get(command.defenderId);
  if (!ownerCombat || ownerCombat.hp <= 0) {
    rejectAbility(abilities, eventId, 'owner-dead', command.defenderId);
    return;
  }

  const ability = abilitySession.abilitiesByDefenderId[ownerEntity.definitionId];
  if (!ability) {
    rejectAbility(abilities, eventId, 'ability-unavailable', command.defenderId);
    return;
  }

  if (!ability.allowWhileDisabled && isUnitDisabled(abilities, command.defenderId)) {
    rejectAbility(abilities, eventId, 'owner-disabled', command.defenderId, ability.id);
    return;
  }

  if ((abilities.cooldowns.get(command.defenderId) ?? 0) > 0) {
    rejectAbility(abilities, eventId, 'on-cooldown', command.defenderId, ability.id);
    return;
  }

  if (ability.powerCrystalCost > 0) {
    if (!battle.resources) throw new Error('Resource state unavailable');
    if (battle.resources.crystals < ability.powerCrystalCost) {
      rejectAbility(abilities, eventId, 'insufficient-crystals', command.defenderId, ability.id);
      return;
    }
  }

  if (command.targetCell !== undefined && !isValidGridCell(command.targetCell)) {
    rejectAbility(abilities, eventId, 'invalid-target-cell', command.defenderId, ability.id);
    return;
  }

  const ownerDef = session.defendersById[ownerEntity.definitionId];
  if (!ownerDef) throw new TypeError(`Unknown defender combat definition: ${ownerEntity.definitionId}`);

  if (
    ability.requiresTarget &&
    !hasEligibleTarget(ctx, command.defenderId, ownerEntity.cell, ownerDef, ability)
  ) {
    rejectAbility(abilities, eventId, 'no-target', command.defenderId, ability.id);
    return;
  }

  if (ability.powerCrystalCost > 0) {
    battle.resources!.crystals -= ability.powerCrystalCost;
  }

  const cooldownTicks = abilitySession.cooldownTicksById[ability.id];
  if (cooldownTicks > 0) {
    abilities.cooldowns.set(command.defenderId, cooldownTicks);
  }

  const activationId = abilities.nextEffectId++;
  const attackDamage = getDefenderAttackDamage(battle, session, command.defenderId);

  for (let i = 0; i < ability.effects.length; i++) {
    executeImmediateEffect(
      ctx,
      command.defenderId,
      ownerEntity.cell,
      ownerCombat.maxHp,
      ability,
      ability.effects[i],
      i,
      activationId,
      attackDamage,
      command.targetCell,
    );
  }

  resolveCombatDeaths(battle, combat, enqueueReward);
  abilities.outcome = {
    eventId,
    status: 'APPLIED',
    defenderId: command.defenderId,
    abilityId: ability.id,
    activationId,
  };
}

function advanceCadences(ctx: AbilityEngineContext): void {
  const abilities = ctx.battle.abilities!;
  filterInPlace(abilities.cadences, cadence => {
    const ownerEntity = ctx.battle.entities.get(cadence.ownerId);
    const ownerCombat = ctx.combat.entities.get(cadence.ownerId);
    if (!ownerEntity || ownerEntity.kind !== 'defender' || !ownerCombat || ownerCombat.hp <= 0) {
      return false;
    }
    if (isUnitDisabled(abilities, cadence.ownerId)) {
      cadence.status = 'PAUSED';
      return true;
    }
    cadence.status = 'ACTIVE';
    cadence.nextShotRemainingTicks -= 1;
    if (cadence.nextShotRemainingTicks > 0) return true;

    const fired = fireCadenceShot(
      ctx,
      cadence.ownerId,
      cadence.abilityId,
      cadence.effectIndex,
      cadence.lockedCenterCell,
    );
    if (!fired) return false;

    cadence.remainingShots -= 1;
    cadence.shotIndex += 1;
    if (cadence.remainingShots <= 0) return false;

    cadence.nextShotRemainingTicks = cadence.intervalTicks;
    return true;
  });
}

type LaneProjectile = Extract<ActiveProjectile, { kind: 'lane' }>;

function applyLaneProjectileHits(
  ctx: ProjectileCrossingContext,
  proj: LaneProjectile,
  candidates: readonly { readonly id: EntityId }[],
): boolean {
  if (candidates.length === 0) return true;
  const burnSourceDamage = proj.applyStatus?.kind === 'burn'
    ? resolveProjectileBurnSourceDamage(ctx, proj)
    : 0;

  for (const candidate of candidates) {
    proj.hitEnemyIds.add(candidate.id);
    const res = applyDamagePipeline(ctx, candidate.id, proj.damage, {
      damageType: proj.damageType,
      armorPiercing: proj.armorPiercing,
      shieldPiercing: proj.shieldPiercing,
    });
    if (res.hitConfirmed && proj.applyStatus) {
      applyStatusToTarget(
        ctx,
        candidate.id,
        proj.sourceId,
        proj.abilityId,
        proj.applyStatus,
        burnSourceDamage,
      );
    }
    if (!proj.pierce) return false;
  }
  return true;
}

/** Resolve swept crossings when moving Enemies step left across active lane projectiles. */
export function resolvePostMoveProjectileCrossings(
  ctx: ProjectileCrossingContext,
  movedEnemies: readonly MovedEnemyStep[],
): void {
  const abilities = ctx.battle.abilities;
  if (!abilities || abilities.projectiles.length === 0 || movedEnemies.length === 0) return;

  filterInPlace(abilities.projectiles, proj => {
    if (proj.kind !== 'lane') return true;

    const candidates: { id: EntityId; oldX: number }[] = [];
    for (const moved of movedEnemies) {
      if (moved.lane !== proj.lane || proj.hitEnemyIds.has(moved.id)) continue;
      if (!(moved.newX <= proj.x && proj.x < moved.oldX)) continue;
      const cState = ctx.combat.entities.get(moved.id);
      if (cState && cState.hp > 0) candidates.push({ id: moved.id, oldX: moved.oldX });
    }
    candidates.sort((a, b) => a.oldX - b.oldX || compareEntityIds(a.id, b.id));

    return applyLaneProjectileHits(ctx, proj, candidates);
  });
}

function advanceProjectiles(ctx: AbilityEngineContext): void {
  const abilities = ctx.battle.abilities!;
  filterInPlace(abilities.projectiles, proj => {
    if (proj.kind === 'falling') {
      proj.remainingTravelTicks -= 1;
      if (proj.remainingTravelTicks > 0) return true;
      resolveFallingImpact(ctx, proj);
      return false;
    }

    const prevX = proj.x;
    const nextX = prevX + proj.speedPerTick;
    proj.x = nextX;

    const candidates: { id: EntityId; position: number }[] = [];
    for (const [id, entity] of ctx.battle.entities) {
      if (entity.kind !== 'enemy' || entity.lane !== proj.lane || proj.hitEnemyIds.has(id)) continue;
      if (entity.position < prevX || entity.position > nextX) continue;
      const cState = ctx.combat.entities.get(id);
      if (cState && cState.hp > 0) candidates.push({ id, position: entity.position });
    }
    candidates.sort((a, b) => a.position - b.position || compareEntityIds(a.id, b.id));

    if (!applyLaneProjectileHits(ctx, proj, candidates)) return false;

    return nextX <= BATTLEFIELD_COLUMNS;
  });
}

function advanceStatuses(ctx: AbilityEngineContext): void {
  const abilities = ctx.battle.abilities!;
  filterInPlace(abilities.statuses, status => {
    if (status.isZoneDerived) return true;
    status.remainingTicks -= 1;

    if (status.kind === 'burn') {
      status.burnNextTickRemaining = (status.burnNextTickRemaining ?? 1) - 1;
      if (status.burnNextTickRemaining <= 0) {
        const targetCombat = ctx.combat.entities.get(status.targetEntityId);
        if (targetCombat && targetCombat.hp > 0) {
          applyDamagePipeline(
            ctx,
            status.targetEntityId,
            status.burnDamagePerTick ?? 0,
            { damageType: 'fire' },
          );
        }
        status.burnNextTickRemaining = status.burnTickIntervalTicks ?? 1;
      }
    }

    return status.remainingTicks > 0;
  });
}

/**
 * Advance all per-tick Special Ability timers, cadences, projectiles, slow zones,
 * status durations, Burn ticks, redirect auras, and combat deaths in G09 order.
 */
export function stepAbilityTickPhase(
  ctx: AbilityEngineContext,
  enqueueReward: EnqueueReward,
): void {
  const { battle, combat } = ctx;
  if (battle.resources?.terminal || combat.terminal) return;
  const abilities = battle.abilities;
  if (!abilities) return;

  for (const [defenderId, remaining] of abilities.cooldowns) {
    if (remaining <= 1) abilities.cooldowns.delete(defenderId);
    else abilities.cooldowns.set(defenderId, remaining - 1);
  }

  advanceCadences(ctx);
  advanceProjectiles(ctx);
  syncGlacialSlowZones(battle, combat);
  advanceStatuses(ctx);

  filterInPlace(abilities.redirects, redirect => {
    redirect.remainingTicks -= 1;
    return redirect.remainingTicks > 0;
  });

  resolveCombatDeaths(battle, combat, enqueueReward);
}
