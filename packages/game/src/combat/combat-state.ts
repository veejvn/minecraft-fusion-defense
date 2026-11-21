import { isLane } from '../battlefield/grid';
import { applyBattleCommand, type BattleState } from '../core/battle-state';
import type { EntityId } from '../entities/runtime-entity';
import type { CombatSession } from './combat-session';

export type DamageModifier = (damage: number) => number;
export type SpeedModifier = (speed: number) => number;

export interface CombatEntityState {
  hp: number;
  maxHp: number;
  nextAttackTick: number | null;
  attackAnchorTick: number | null;
  attackCount: number;
  targetId: EntityId | null;
  moveAnchorX?: number;
  movedTicks?: number;
  lastMoveSpeed?: number;
  lastAttackSpeed?: number;
}

export interface CombatState {
  readonly entities: Map<EntityId, CombatEntityState>;
  terminal: 'victory' | 'defeat' | null;
  outcome: { eventId: string; status: 'APPLIED' | 'REJECTED'; reason?: string } | null;
}

export type CombatCommand = {
  readonly type: 'spawn-enemy';
  readonly definitionId: string;
  readonly lane: number;
};

/** Modifier hook preserved for future status effects (D-34). */
export function computeDamage(baseDamage: number, modifiers: readonly DamageModifier[] = []): number {
  let value = baseDamage;
  for (const modify of modifiers) value = modify(value);
  if (!Number.isFinite(value) || value < 0) throw new RangeError('Invalid modified damage');
  return value;
}

/** Modifier hook preserved for future status effects (D-34). */
export function computeMoveSpeed(baseSpeed: number, modifiers: readonly SpeedModifier[] = []): number {
  let value = baseSpeed;
  for (const modify of modifiers) value = modify(value);
  if (!Number.isFinite(value) || value < 0) throw new RangeError('Invalid modified move speed');
  return value;
}

export function createCombatState(): CombatState {
  return { entities: new Map(), terminal: null, outcome: null };
}

/** Initialize HP, cooldown, and movement anchor state for a newly created runtime entity. */
export function registerCombatEntity(battle: BattleState, session: CombatSession, id: EntityId): void {
  if (!battle.combat) throw new Error('Combat state unavailable');
  const entity = battle.entities.get(id);
  if (!entity) throw new Error('Unknown runtime entity ID');
  if (entity.kind === 'defender') {
    const def = session.defendersById[entity.definitionId];
    if (!def) throw new TypeError(`Unknown defender combat definition: ${entity.definitionId}`);
    battle.combat.entities.set(id, {
      hp: def.maxHp,
      maxHp: def.maxHp,
      nextAttackTick: null,
      attackAnchorTick: null,
      attackCount: 0,
      targetId: null,
    });
    return;
  }
  const def = session.enemiesById[entity.definitionId];
  if (!def) throw new TypeError(`Unknown enemy combat definition: ${entity.definitionId}`);
  battle.combat.entities.set(id, {
    hp: def.maxHp,
    maxHp: def.maxHp,
    nextAttackTick: null,
    attackAnchorTick: null,
    attackCount: 0,
    targetId: null,
    moveAnchorX: entity.position,
    movedTicks: 0,
  });
}

export function unregisterCombatEntity(combat: CombatState, id: EntityId): void {
  combat.entities.delete(id);
}

/** Apply internal combat commands inside TransactionEngine staged state. */
export function applyCombatCommand(
  battle: BattleState,
  session: CombatSession,
  command: CombatCommand,
  eventId: string,
): void {
  if (battle.combat?.terminal || battle.resources?.terminal) return;
  if (!battle.combat) throw new Error('Combat state unavailable');
  switch (command.type) {
    case 'spawn-enemy': {
      if (typeof command.definitionId !== 'string' || !(command.definitionId in session.enemiesById)) {
        battle.combat.outcome = { eventId, status: 'REJECTED', reason: 'unknown-enemy-definition' };
        return;
      }
      if (!isLane(command.lane)) {
        battle.combat.outcome = { eventId, status: 'REJECTED', reason: 'invalid-lane' };
        return;
      }
      const id = battle.nextEntityId;
      applyBattleCommand(battle, {
        type: 'add',
        entity: { kind: 'enemy', definitionId: command.definitionId, lane: command.lane, position: session.spawnX },
      });
      registerCombatEntity(battle, session, id);
      battle.combat.outcome = { eventId, status: 'APPLIED' };
      return;
    }
    default:
      throw new TypeError('Unknown combat command');
  }
}
