import { describe, expect, it } from 'vitest';
import { createCenterGeometry } from './center-geometry';
import type { GridColumnState } from './column-regions';

describe('createCenterGeometry', () => {
  it('uses only center columns for geometry', () => {
    const columns: GridColumnState[] = [
      { columnId: 'B', pinned: null },
      { columnId: 'D', pinned: null },
      { columnId: 'E', pinned: null },
    ];

    const geometry = createCenterGeometry({
      columns,
      columnWidth: 120,
    });

    expect(geometry.getCount()).toBe(3);
    expect(geometry.getOffset(0)).toBe(0);
    expect(geometry.getOffset(1)).toBe(120);
    expect(geometry.getOffset(2)).toBe(240);
  });

  it('keeps the logical column identity at each center index', () => {
    const columns: GridColumnState[] = [
      { columnId: 'B', pinned: null },
      { columnId: 'D', pinned: null },
      { columnId: 'E', pinned: null },
    ];

    expect(columns[0].columnId).toBe('B');
    expect(columns[1].columnId).toBe('D');
    expect(columns[2].columnId).toBe('E');
  });
});
