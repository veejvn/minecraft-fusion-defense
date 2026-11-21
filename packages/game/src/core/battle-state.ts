import { BATTLEFIELD_COLUMNS, BATTLEFIELD_ROWS, cellIndex, isLane } from '../battlefield/grid';
import type { EntityDefinition, EntityId, RuntimeEntity } from '../entities/runtime-entity';

export interface BattleState {
  readonly occupancy: (EntityId | null)[];
  readonly entities: Map<EntityId, RuntimeEntity>;
  nextEntityId: EntityId;
}

export type BattleCommand =
  | { readonly type: 'add'; readonly entity: EntityDefinition }
  | { readonly type: 'remove'; readonly id: EntityId };

export function createBattleState(): BattleState {
  return {
    occupancy: Array<EntityId | null>(BATTLEFIELD_ROWS * BATTLEFIELD_COLUMNS).fill(null),
    entities: new Map(),
    nextEntityId: 0n,
  };
}

// The runtime invokes this reducer only with TransactionEngine's staged state.
export function applyBattleCommand(state: BattleState, command: BattleCommand): void {
  switch (command.type) {
    case 'add': {
      const entity = command.entity;
      if (typeof entity.definitionId !== 'string' || !entity.definitionId.trim()) {
        throw new TypeError('Missing entity definition ID');
      }
      const id = state.nextEntityId;
      if (state.entities.has(id)) throw new Error('Duplicate runtime entity ID');
      state.nextEntityId++;
      switch (entity.kind) {
        case 'defender': {
          const index = cellIndex(entity.cell);
          if (state.occupancy[index] !== null) throw new Error('Defender cell is occupied');
          state.occupancy[index] = id;
          break;
        }
        case 'enemy':
          if (!isLane(entity.lane) || !Number.isFinite(entity.position)) {
            throw new RangeError('Invalid enemy lane or position');
          }
          break;
        default:
          throw new TypeError('Unknown entity kind');
      }
      state.entities.set(id, { ...entity, id });
      return;
    }
    case 'remove': {
      const entity = state.entities.get(command.id);
      if (!entity) throw new Error('Unknown runtime entity ID');
      if (entity.kind === 'defender') {
        const index = cellIndex(entity.cell);
        if (state.occupancy[index] !== entity.id) throw new Error('Inconsistent defender occupancy');
        state.occupancy[index] = null;
      }
      state.entities.delete(command.id);
      return;
    }
    default:
      throw new TypeError('Unknown battle command');
  }
}
