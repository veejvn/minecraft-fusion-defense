export const BATTLEFIELD_ROWS = 5;
export const BATTLEFIELD_COLUMNS = 9;

export interface Cell {
  readonly row: number;
  readonly column: number;
}

export function isLane(lane: number): boolean {
  return Number.isInteger(lane) && lane >= 0 && lane < BATTLEFIELD_ROWS;
}

// Row-major offset shared by the occupancy array and its readers.
export function cellIndex(cell: Cell): number {
  if (!isLane(cell.row) || !Number.isInteger(cell.column) ||
    cell.column < 0 || cell.column >= BATTLEFIELD_COLUMNS) {
    throw new RangeError('Invalid battlefield cell');
  }
  return cell.row * BATTLEFIELD_COLUMNS + cell.column;
}
