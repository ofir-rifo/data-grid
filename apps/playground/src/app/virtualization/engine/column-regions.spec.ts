import { describe, expect, it } from 'vitest';
import {
  createColumnRegions,
  getCenterColumn,
  type GridColumnState,
} from './column-regions';

describe('createColumnRegions', () => {
  it('splits columns by pin state', () => {
    const columns: GridColumnState[] = [
      { columnId: 'A', pinned: 'left' },
      { columnId: 'B', pinned: null },
      { columnId: 'C', pinned: null },
      { columnId: 'D', pinned: null },
      { columnId: 'E', pinned: 'left' },
      { columnId: 'F', pinned: null },
      { columnId: 'G', pinned: 'right' },
      { columnId: 'H', pinned: 'right' },
    ];

    expect(createColumnRegions({ columns })).toEqual({
      left: [
        { columnId: 'A', pinned: 'left' },
        { columnId: 'E', pinned: 'left' },
      ],
      center: [
        { columnId: 'B', pinned: null },
        { columnId: 'C', pinned: null },
        { columnId: 'D', pinned: null },
        { columnId: 'F', pinned: null },
      ],
      right: [
        { columnId: 'G', pinned: 'right' },
        { columnId: 'H', pinned: 'right' },
      ],
    });
  });

  it('puts all columns in the center when nothing is pinned', () => {
    const columns: GridColumnState[] = [
      { columnId: 'A', pinned: null },
      { columnId: 'B', pinned: null },
      { columnId: 'C', pinned: null },
    ];

    expect(createColumnRegions({ columns })).toEqual({
      left: [],
      center: [
        { columnId: 'A', pinned: null },
        { columnId: 'B', pinned: null },
        { columnId: 'C', pinned: null },
      ],
      right: [],
    });
  });

  it('preserves the original order within each region', () => {
    const columns: GridColumnState[] = [
      { columnId: 'A', pinned: 'left' },
      { columnId: 'B', pinned: null },
      { columnId: 'C', pinned: 'left' },
      { columnId: 'D', pinned: 'right' },
      { columnId: 'E', pinned: null },
      { columnId: 'F', pinned: 'right' },
    ];

    expect(createColumnRegions({ columns })).toEqual({
      left: [
        { columnId: 'A', pinned: 'left' },
        { columnId: 'C', pinned: 'left' },
      ],
      center: [
        { columnId: 'B', pinned: null },
        { columnId: 'E', pinned: null },
      ],
      right: [
        { columnId: 'D', pinned: 'right' },
        { columnId: 'F', pinned: 'right' },
      ],
    });
  });

  it('provides the center columns as a contiguous local sequence', () => {
    const columns: GridColumnState[] = [
      { columnId: 'A', pinned: 'left' },
      { columnId: 'B', pinned: null },
      { columnId: 'C', pinned: 'left' },
      { columnId: 'D', pinned: null },
      { columnId: 'E', pinned: null },
      { columnId: 'F', pinned: 'right' },
    ];

    const regions = createColumnRegions({ columns });

    expect(regions.center.map((column) => column.columnId)).toEqual([
      'B',
      'D',
      'E',
    ]);
  });

  it('keeps the center column count independent of pinned columns', () => {
    const columns: GridColumnState[] = [
      { columnId: 'A', pinned: 'left' },
      { columnId: 'B', pinned: null },
      { columnId: 'C', pinned: null },
      { columnId: 'D', pinned: 'right' },
      { columnId: 'E', pinned: null },
      { columnId: 'F', pinned: 'right' },
    ];

    const regions = createColumnRegions({ columns });

    expect(regions.center).toHaveLength(3);
  });

  it('maps a center-local index to the logical center column', () => {
    const columns: GridColumnState[] = [
      { columnId: 'A', pinned: 'left' },
      { columnId: 'B', pinned: null },
      { columnId: 'C', pinned: 'left' },
      { columnId: 'D', pinned: null },
      { columnId: 'E', pinned: null },
      { columnId: 'F', pinned: 'right' },
    ];

    const regions = createColumnRegions({ columns });

    expect(getCenterColumn(regions, 0)?.columnId).toBe('B');
    expect(getCenterColumn(regions, 1)?.columnId).toBe('D');
    expect(getCenterColumn(regions, 2)?.columnId).toBe('E');
    expect(getCenterColumn(regions, 3)).toBeUndefined();
  });
});
