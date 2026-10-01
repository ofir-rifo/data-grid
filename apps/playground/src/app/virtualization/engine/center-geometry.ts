import type { Geometry } from './geometry';
import type { GridColumnState } from './column-regions';

export interface CenterGeometryConfig {
  columns: GridColumnState[];
  columnWidth: number;
}

export function createCenterGeometry(config: CenterGeometryConfig): Geometry {
  return {
    getOffset(index: number): number {
      return index * config.columnWidth;
    },

    getSize(_index: number): number {
      return config.columnWidth;
    },

    findIndexAtOffset(offset: number): number {
      if (config.columns.length === 0) {
        return 0;
      }

      if (offset <= 0) {
        return 0;
      }

      const index = Math.floor(offset / config.columnWidth);

      return Math.min(index, config.columns.length - 1);
    },

    getCount(): number {
      return config.columns.length;
    },
  };
}
