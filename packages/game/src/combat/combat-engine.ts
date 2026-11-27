import {
  BASIC_ATTACK_STATUS_ABILITY_ID,
  applyDamagePipeline,
  applyStatusToTarget,
  resolveCombatDeaths,
  resolvePostMoveProjectileCrossings,
  type MovedEnemyStep,
} from '../abilities/ability-engine';
import type {
  AbilityDamageType,
  AbilitySession,
  AttachedStatusSpec,
} from '../abilities/ability-session';
import {
  getDefenderAttackSpeedMultiplier,
  getDefenderDamageModifiers,
  getEnemySpeedModifiers,
  isUnitDisabled,
} from '../abilities/ability-state';
import { BATTLEFIELD_COLUMNS, cellIndex, type Cell } from '../battlefield/grid';
import type { BattleState } from '../core/battle-state';
import { count } from '../core/resource-session';
import type { EntityId } from '../entities/runtime-entity';
import type { CombatSession, DefenderCombatDefinition } from './combat-session';
import {
  computeDamage,
  computeMoveSpeed,
  type CombatEntityState,
  type CombatState,
} from './combat-state';

export interface BlockingDefender {
  readonly id: EntityId;
  readonly column: number;
  readonly stopX: number;
  readonly inRange: boolean;
}

export interface CombatPhaseContext {
  readonly battle: BattleState;
  readonly combat: CombatState;
  readonly session: CombatSession;
  readonly abilitySession?: AbilitySession;
  readonly tick: number;
  readonly enqueueReward: (enemy: {
    readonly id: EntityId;
    readonly definitionId: string;
    readonly lane: number;
    readonly position: number;
  }) => void;
  readonly enqueueDefeat: () => void;
}

/** Advance attack cooldown using an absolute anchor tick to prevent fractional rounding drift. */
export function nextAttackDeadline(
  tick: number,
  attackSpeed: number,
  rate: number,
  state: CombatEntityState,
): number {
  const speedChanged = state.lastAttackSpeed !== undefined && state.lastAttackSpeed !== attackSpeed;
  if (state.nextAttackTick === null || tick > state.nextAttackTick || speedChanged) {
    state.attackAnchorTick = tick;
    state.attackCount = 1;
  } else {
    state.attackCount = count(state.attackCount + 1);
  }
  state.lastAttackSpeed = attackSpeed;
  const rawOffset = (state.attackCount * rate) / attackSpeed;
  if (!Number.isFinite(rawOffset) || rawOffset <= 0) throw new RangeError('Invalid attack deadline');
  const offset = count(Math.max(1, Math.ceil(rawOffset)));
  const next = Math.max(count(tick + 1), count(state.attackAnchorTick! + offset));
  state.nextAttackTick = next;
  return next;
}

/** Find the rightmost living same-lane Defender ahead of or aligned with the Enemy. */
export function findBlockingDefender(
  battle: BattleState,
  combat: CombatState,
  lane: number,
  enemyX: number,
  attackRange: number,
): BlockingDefender | null {
  for (let column = BATTLEFIELD_COLUMNS - 1; column >= 0; column--) {
    if (column > enemyX) continue;
    const id = battle.occupancy[cellIndex({ row: lane, column })];
    if (id === null) continue;
    const state = combat.entities.get(id);
    if (!state || state.hp <= 0) continue;
    const rightEdge = column + 1;
    const distance = Math.max(0, enemyX - rightEdge);
    return { id, column, stopX: rightEdge + attackRange, inRange: distance <= attackRange };
  }
  return null;
}

/** Select a Defender's target in the same lane forward of its cell using its configured strategy. */
export function selectDefenderTarget(
  battle: BattleState,
  combat: CombatState,
  session: CombatSession,
  _defenderId: EntityId,
  defenderCell: Cell,
  def: DefenderCombatDefinition,
): EntityId | null {
  const centerX = defenderCell.column + 0.5;
  interface Candidate {
    id: EntityId;
    position: number;
    distance: number;
    hp: number;
    moveSpeed: number;
  }
  let best: Candidate | null = null;

  for (const [id, entity] of battle.entities) {
    if (entity.kind !== 'enemy' || entity.lane !== defenderCell.row) continue;
    const state = combat.entities.get(id);
    if (!state || state.hp <= 0) continue;
    if (entity.position < defenderCell.column) continue;
    const distance = Math.abs(entity.position - centerX);
    if (distance > def.attackRange) continue;
    const enemyDef = session.enemiesById[entity.definitionId];
    const candidate: Candidate = {
      id,
      position: entity.position,
      distance,
      hp: state.hp,
      moveSpeed: enemyDef.moveSpeed,
    };
    if (!best || isBetterTarget(def.targeting, candidate, best)) best = candidate;
  }

  return best ? best.id : null;
}

function isBetterTarget(
  strategy: DefenderCombatDefinition['targeting'],
  a: { id: EntityId; position: number; distance: number; hp: number; moveSpeed: number },
  b: { id: EntityId; position: number; distance: number; hp: number; moveSpeed: number },
): boolean {
  let diff = 0;
  switch (strategy) {
    case 'CLOSEST_TO_BASE': diff = b.position - a.position; break;
    case 'CLOSEST_TO_DEFENDER': diff = b.distance - a.distance; break;
    case 'HIGHEST_HP': diff = a.hp - b.hp; break;
    case 'LOWEST_HP': diff = b.hp - a.hp; break;
    case 'FASTEST': diff = a.moveSpeed - b.moveSpeed; break;
    case 'FIRST_VALID': return a.id < b.id;
  }
  if (diff !== 0) return diff > 0;
  return a.id < b.id;
}

/**
 * Compute start-of-tick movement and attack intents simultaneously, apply together,
 * then resolve deaths and base breaches in ascending EntityId order.
 */
export function runCombatPhase(ctx: CombatPhaseContext): void {
  const { battle, combat, session, tick } = ctx;
  if (combat.terminal || battle.resources?.terminal) return;

  const livingIds = [...battle.entities.keys()]
    .filter(id => {
      const cState = combat.entities.get(id);
      return cState !== undefined && cState.hp > 0;
    })
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

  const damageIntents: Array<{
    targetId: EntityId;
    amount: number;
    sourceId?: EntityId;
    damageType?: AbilityDamageType;
    onHitStatus?: AttachedStatusSpec;
    sourceAttackDamage?: number;
  }> = [];
  const movementIntents = new Map<
    EntityId,
    { x: number; movedTicks: number; moveAnchorX: number; speed: number }
  >();
  const attackUpdates = new Map<EntityId, { attackSpeed: number }>();
  const targetUpdates = new Map<EntityId, EntityId | null>();

  for (const id of livingIds) {
    const entity = battle.entities.get(id)!;
    const cState = combat.entities.get(id)!;
    if (isUnitDisabled(battle.abilities, id)) {
      targetUpdates.set(id, null);
      if (entity.kind === 'enemy') {
        cState.moveAnchorX = entity.position;
        cState.movedTicks = 0;
      }
      continue;
    }

    if (entity.kind === 'defender') {
      const def = session.defendersById[entity.definitionId];
      const targetId = selectDefenderTarget(battle, combat, session, id, entity.cell, def);
      targetUpdates.set(id, targetId);
      if (targetId !== null && (cState.nextAttackTick === null || tick >= cState.nextAttackTick)) {
        const effectiveDamage = computeDamage(
          def.damage,
          getDefenderDamageModifiers(battle.abilities, id),
        );
        const effectiveAttackSpeed =
          def.attackSpeed * getDefenderAttackSpeedMultiplier(battle.abilities, id);
        if (!Number.isFinite(effectiveAttackSpeed) || effectiveAttackSpeed <= 0) {
          throw new RangeError('Invalid effective attack speed');
        }
        damageIntents.push({
          targetId,
          amount: effectiveDamage,
          sourceId: id,
          damageType: def.attackDamageType ?? 'physical',
          onHitStatus: def.basicAttackStatus,
          sourceAttackDamage: effectiveDamage,
        });
        attackUpdates.set(id, { attackSpeed: effectiveAttackSpeed });
      }
      continue;
    }

    const def = session.enemiesById[entity.definitionId];
    const blocker = def.behavior === 'STOP_AND_ATTACK'
      ? findBlockingDefender(battle, combat, entity.lane, entity.position, def.attackRange!)
      : null;

    if (blocker && blocker.inRange) {
      targetUpdates.set(id, blocker.id);
      if (cState.nextAttackTick === null || tick >= cState.nextAttackTick) {
        damageIntents.push({ targetId: blocker.id, amount: computeDamage(def.damage!) });
        attackUpdates.set(id, { attackSpeed: def.attackSpeed! });
      }
      continue;
    }

    targetUpdates.set(id, null);
    const speed = computeMoveSpeed(def.moveSpeed, getEnemySpeedModifiers(battle.abilities, id));
    const speedChanged = cState.lastMoveSpeed !== undefined && cState.lastMoveSpeed !== speed;
    const anchor = speedChanged ? entity.position : (cState.moveAnchorX ?? entity.position);
    const prevMovedTicks = speedChanged ? 0 : (cState.movedTicks ?? 0);
    if (speed === 0) {
      movementIntents.set(id, {
        x: entity.position,
        moveAnchorX: entity.position,
        movedTicks: 0,
        speed,
      });
      continue;
    }
    const nextMovedTicks = count(prevMovedTicks + 1);
    const rawX = anchor - (nextMovedTicks * speed) / session.rate;
    if (!Number.isFinite(rawX)) throw new RangeError('Non-finite enemy position');

    if (blocker && rawX < blocker.stopX) {
      movementIntents.set(id, { x: blocker.stopX, moveAnchorX: blocker.stopX, movedTicks: 0, speed });
    } else {
      movementIntents.set(id, { x: rawX, moveAnchorX: anchor, movedTicks: nextMovedTicks, speed });
    }
  }

  for (const [id, targetId] of targetUpdates) combat.entities.get(id)!.targetId = targetId;
  for (const [id, { attackSpeed }] of attackUpdates) {
    nextAttackDeadline(tick, attackSpeed, session.rate, combat.entities.get(id)!);
  }
  const movedEnemies: MovedEnemyStep[] = [];
  for (const [id, move] of movementIntents) {
    const enemy = battle.entities.get(id)!;
    if (enemy.kind !== 'enemy') continue;
    const oldX = enemy.position;
    const cState = combat.entities.get(id)!;
    cState.moveAnchorX = move.moveAnchorX;
    cState.movedTicks = move.movedTicks;
    cState.lastMoveSpeed = move.speed;
    battle.entities.set(id, { ...enemy, position: move.x });
    if (move.x < oldX) {
      movedEnemies.push({ id, lane: enemy.lane, oldX, newX: move.x });
    }
  }
  if (battle.abilities && movedEnemies.length > 0) {
    resolvePostMoveProjectileCrossings(
      { battle, combat, session, abilitySession: ctx.abilitySession },
      movedEnemies,
    );
  }
  for (const intent of damageIntents) {
    const res = applyDamagePipeline(
      { battle, combat, session },
      intent.targetId,
      intent.amount,
      { damageType: intent.damageType ?? 'physical' },
    );
    if (
      res.hitConfirmed &&
      intent.onHitStatus &&
      intent.sourceId !== undefined &&
      battle.abilities
    ) {
      applyStatusToTarget(
        { battle, combat, session, abilitySession: ctx.abilitySession },
        intent.targetId,
        intent.sourceId,
        BASIC_ATTACK_STATUS_ABILITY_ID,
        intent.onHitStatus,
        intent.sourceAttackDamage ?? intent.amount,
      );
    }
  }

  resolveCombatDeaths(battle, combat, ctx.enqueueReward);

  for (const id of livingIds) {
    const entity = battle.entities.get(id);
    if (!entity || entity.kind !== 'enemy') continue;
    if (entity.position < 0) ctx.enqueueDefeat();
  }
}
