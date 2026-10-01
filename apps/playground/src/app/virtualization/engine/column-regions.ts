export type ColumnPinState = 'left' | 'right' | null;

export interface GridColumnState {
  columnId: string;
  pinned: ColumnPinState;
}

export interface ColumnRegions {
  left: GridColumnState[];
  center: GridColumnState[];
  right: GridColumnState[];
}

export interface ColumnRegionsConfig {
  columns: GridColumnState[];
}

export function createColumnRegions(
  config: ColumnRegionsConfig,
): ColumnRegions {
  const left: GridColumnState[] = [];
  const center: GridColumnState[] = [];
  const right: GridColumnState[] = [];

  for (const column of config.columns) {
    if (column.pinned === 'left') {
      left.push(column);
      continue;
    }

    if (column.pinned === 'right') {
      right.push(column);
      continue;
    }

    center.push(column);
  }

  return {
    left,
    center,
    right,
  };
}

export function getCenterColumn(
  regions: ColumnRegions,
  centerIndex: number,
): GridColumnState | undefined {
  return regions.center[centerIndex];
}