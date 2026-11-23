import type { Cell } from '../battlefield/grid';
import type { EntityId } from '../entities/runtime-entity';

export type FusionFailureReason =
  | 'same-instance'
  | 'source-not-found'
  | 'target-not-found'
  | 'invalid-source'
  | 'invalid-target'
  | 'entity-dead'
  | 'no-recipe'
  | 'recipe-unavailable'
  | 'glove-on-cooldown'
  | 'defender-unavailable'
  | 'summon-on-cooldown'
  | 'insufficient-energy';

export type FusionOutcome =
  | {
      readonly eventId: string;
      readonly status: 'APPLIED';
      readonly recipeId: string;
      readonly outputEntityId: EntityId;
      readonly targetCell: Cell;
    }
  | {
      readonly eventId: string;
      readonly status: 'REJECTED';
      readonly reason: FusionFailureReason;
    };

export type FusionState = {
  outcome: FusionOutcome | null;
};

export type FusionCommand =
  | {
      readonly type: 'fuse';
      readonly sourceId: EntityId;
      readonly targetId: EntityId;
    }
  | {
      readonly type: 'summon-fuse';
      readonly definitionId: string;
      readonly targetId: EntityId;
    };

/** Create initial per-battle fusion outcome tracking state. */
export function createFusionState(): FusionState {
  return { outcome: null };
}
