import { cleanupEntityAbilityState } from '../abilities/ability-engine';
import { cellIndex, type Cell } from '../battlefield/grid';
import type { CombatSession } from '../combat/combat-session';
import { registerCombatEntity, unregisterCombatEntity } from '../combat/combat-state';
import { applyBattleCommand, type BattleState } from '../core/battle-state';
import type { EntityId } from '../entities/runtime-entity';
import {
  normalizeFusionPair,
  type FusionRecipeDefinition,
  type FusionSession,
} from './fusion-session';
import type { FusionCommand } from './fusion-state';

/** Validate whether two runtime entities can be fused without mutating battle state. */
export function validateFusionAttempt(
  battle: BattleState,
  session: FusionSession,
  sourceId: EntityId,
  targetId: EntityId,
) {
  if (typeof sourceId !== 'bigint' || sourceId < 0n || typeof targetId !== 'bigint' || targetId < 0n) {
    throw new TypeError('Invalid fusion entity ID');
  }
  if (sourceId === targetId) return { ok: false, reason: 'same-instance' } as const;

  const source = battle.entities.get(sourceId);
  if (!source) return { ok: false, reason: 'source-not-found' } as const;

  const target = battle.entities.get(targetId);
  if (!target) return { ok: false, reason: 'target-not-found' } as const;

  if (source.kind !== 'defender') return { ok: false, reason: 'invalid-source' } as const;
  if (target.kind !== 'defender') return { ok: false, reason: 'invalid-target' } as const;

  if (
    battle.occupancy[cellIndex(source.cell)] !== sourceId ||
    battle.occupancy[cellIndex(target.cell)] !== targetId
  ) {
    throw new Error('Inconsistent defender occupancy');
  }

  if (battle.combat) {
    const sourceCombat = battle.combat.entities.get(sourceId);
    const targetCombat = battle.combat.entities.get(targetId);
    if (!sourceCombat || sourceCombat.hp <= 0 || !targetCombat || targetCombat.hp <= 0) {
      return { ok: false, reason: 'entity-dead' } as const;
    }
  }

  const recipe: FusionRecipeDefinition | undefined =
    session.recipesByPair[normalizeFusionPair(source.definitionId, target.definitionId)];
  if (!recipe) return { ok: false, reason: 'no-recipe' } as const;
  if (!recipe.enabled || !recipe.unlocked) return { ok: false, reason: 'recipe-unavailable' } as const;

  return { ok: true, recipe, sourceCell: source.cell, targetCell: target.cell } as const;
}

/** Apply a fusion command inside TransactionEngine's staged state. */
export function applyFusionCommand(
  battle: BattleState,
  session: FusionSession,
  combatSession: CombatSession | undefined,
  command: FusionCommand,
  eventId: string,
): void {
  if (battle.resources?.terminal || battle.combat?.terminal) return;

  const fusion = battle.fusion;
  if (!fusion) throw new Error('Fusion state unavailable');
  if (battle.combat && !combatSession) throw new Error('Combat session unavailable');
  if (!command || command.type !== 'fuse') throw new TypeError('Unknown fusion command');

  const check = validateFusionAttempt(battle, session, command.sourceId, command.targetId);
  if (!check.ok) {
    fusion.outcome = { eventId, status: 'REJECTED', reason: check.reason };
    return;
  }

  const targetCell: Cell = { row: check.targetCell.row, column: check.targetCell.column };
  applyBattleCommand(battle, { type: 'remove', id: command.sourceId });
  applyBattleCommand(battle, { type: 'remove', id: command.targetId });

  if (battle.combat) {
    unregisterCombatEntity(battle.combat, command.sourceId);
    unregisterCombatEntity(battle.combat, command.targetId);
  }
  cleanupEntityAbilityState(battle, command.sourceId, 'fusion');
  cleanupEntityAbilityState(battle, command.targetId, 'fusion');

  const outputEntityId = battle.nextEntityId;
  applyBattleCommand(battle, {
    type: 'add',
    entity: { kind: 'defender', definitionId: check.recipe.outputDefenderId, cell: targetCell },
  });

  if (battle.combat && combatSession) {
    registerCombatEntity(battle, combatSession, outputEntityId);
  }

  fusion.outcome = {
    eventId,
    status: 'APPLIED',
    recipeId: check.recipe.id,
    outputEntityId,
    targetCell,
  };
}
