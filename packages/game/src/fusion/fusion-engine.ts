import { cleanupEntityAbilityState } from '../abilities/ability-engine';
import { cellIndex, type Cell } from '../battlefield/grid';
import type { CombatSession } from '../combat/combat-session';
import { registerCombatEntity, unregisterCombatEntity } from '../combat/combat-state';
import { applyBattleCommand, type BattleState } from '../core/battle-state';
import { deadline, type ResourceSession } from '../core/resource-session';
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

/** Apply a fusion command (`fuse` or `summon-fuse`) inside TransactionEngine's staged state. */
export function applyFusionCommand(
  battle: BattleState,
  session: FusionSession,
  combatSession: CombatSession | undefined,
  command: FusionCommand,
  eventId: string,
  resourceSession?: ResourceSession,
  tick?: number,
): void {
  if (battle.resources?.terminal || battle.combat?.terminal) return;

  const fusion = battle.fusion;
  if (!fusion) throw new Error('Fusion state unavailable');
  if (battle.combat && !combatSession) throw new Error('Combat session unavailable');
  if (!command || (command.type !== 'fuse' && command.type !== 'summon-fuse')) {
    throw new TypeError('Unknown fusion command');
  }

  if (command.type === 'summon-fuse') {
    if (!battle.resources || !resourceSession || tick === undefined) {
      throw new Error('Resource session unavailable for summon-fuse');
    }
    const definition = resourceSession.defenders.find(d => d.id === command.definitionId);
    if (!definition?.unlocked || definition.classification !== 'base') {
      fusion.outcome = { eventId, status: 'REJECTED', reason: 'defender-unavailable' };
      return;
    }
    if (typeof command.targetId !== 'bigint' || command.targetId < 0n) {
      throw new TypeError('Invalid fusion entity ID');
    }
    const target = battle.entities.get(command.targetId);
    if (!target) {
      fusion.outcome = { eventId, status: 'REJECTED', reason: 'target-not-found' };
      return;
    }
    if (target.kind !== 'defender') {
      fusion.outcome = { eventId, status: 'REJECTED', reason: 'invalid-target' };
      return;
    }
    if (battle.occupancy[cellIndex(target.cell)] !== command.targetId) {
      throw new Error('Inconsistent defender occupancy');
    }
    if (battle.combat) {
      const targetCombat = battle.combat.entities.get(command.targetId);
      if (!targetCombat || targetCombat.hp <= 0) {
        fusion.outcome = { eventId, status: 'REJECTED', reason: 'entity-dead' };
        return;
      }
    }
    const recipe: FusionRecipeDefinition | undefined =
      session.recipesByPair[normalizeFusionPair(definition.id, target.definitionId)];
    if (!recipe) {
      fusion.outcome = { eventId, status: 'REJECTED', reason: 'no-recipe' };
      return;
    }
    if (!recipe.enabled || !recipe.unlocked) {
      fusion.outcome = { eventId, status: 'REJECTED', reason: 'recipe-unavailable' };
      return;
    }
    if ((definition.summonCooldownSeconds ?? 0) > 0) {
      const readyTick = battle.resources.summonCooldownUntilTick?.get(definition.id) ?? 0;
      if (tick < readyTick) {
        fusion.outcome = { eventId, status: 'REJECTED', reason: 'summon-on-cooldown' };
        return;
      }
    }
    if (battle.resources.energy < definition.summonEnergyCost) {
      fusion.outcome = { eventId, status: 'REJECTED', reason: 'insufficient-energy' };
      return;
    }

    battle.resources.energy -= definition.summonEnergyCost;
    if ((definition.summonCooldownSeconds ?? 0) > 0) {
      battle.resources.summonCooldownUntilTick ??= new Map();
      battle.resources.summonCooldownUntilTick.set(
        definition.id,
        tick + deadline(definition.summonCooldownSeconds!, resourceSession.rate),
      );
    }

    const targetCell: Cell = { row: target.cell.row, column: target.cell.column };
    applyBattleCommand(battle, { type: 'remove', id: command.targetId });
    if (battle.combat) {
      unregisterCombatEntity(battle.combat, command.targetId);
    }
    cleanupEntityAbilityState(battle, command.targetId, 'fusion');

    const outputEntityId = battle.nextEntityId;
    applyBattleCommand(battle, {
      type: 'add',
      entity: { kind: 'defender', definitionId: recipe.outputDefenderId, cell: targetCell },
    });
    if (battle.combat && combatSession) {
      registerCombatEntity(battle, combatSession, outputEntityId);
    }

    fusion.outcome = {
      eventId,
      status: 'APPLIED',
      recipeId: recipe.id,
      outputEntityId,
      targetCell,
    };
    return;
  }

  if (
    resourceSession &&
    resourceSession.fusionGloveCooldownSeconds > 0 &&
    battle.resources &&
    tick !== undefined
  ) {
    const readyTick = battle.resources.gloveCooldownUntilTick ?? 0;
    if (tick < readyTick) {
      fusion.outcome = { eventId, status: 'REJECTED', reason: 'glove-on-cooldown' };
      return;
    }
  }

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

  if (
    resourceSession &&
    resourceSession.fusionGloveCooldownSeconds > 0 &&
    battle.resources &&
    tick !== undefined
  ) {
    battle.resources.gloveCooldownUntilTick =
      tick + deadline(resourceSession.fusionGloveCooldownSeconds, resourceSession.rate);
  }

  fusion.outcome = {
    eventId,
    status: 'APPLIED',
    recipeId: check.recipe.id,
    outputEntityId,
    targetCell,
  };
}
