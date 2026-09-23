export interface Geometry {
  getOffset(index: number): number;
  getSize(index: number): number;
  findIndexAtOffset(offset: number): number;
  getCount(): number;
}

export interface FixedGeometryConfig {
  itemCount: number;
  itemSize: number;
}

export function createFixedGeometry(config: FixedGeometryConfig): Geometry {
  const { itemCount, itemSize } = config;

  return {
    getOffset(index: number): number {
      return index * itemSize;
    },

    getSize(_index: number): number {
      return itemSize;
    },

    getCount(): number {
      return itemCount;
    },

    findIndexAtOffset(offset: number): number {
      if (itemCount === 0) {
        return 0;
      }

      if (offset <= 0) {
        return 0;
      }

      const index = Math.floor(offset / itemSize);

      return Math.min(index, itemCount - 1);
    },
  };
}
