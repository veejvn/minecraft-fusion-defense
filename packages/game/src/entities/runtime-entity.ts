import type { Cell } from '../battlefield/grid';

// This counter value is an internal identity, without a serialized ID format.
export type EntityId = bigint;

export type EntityDefinition =
  | { readonly kind: 'defender'; readonly definitionId: string; readonly cell: Cell }
  | { readonly kind: 'enemy'; readonly definitionId: string; readonly lane: number; readonly position: number };

export type RuntimeEntity = EntityDefinition & { readonly id: EntityId };
