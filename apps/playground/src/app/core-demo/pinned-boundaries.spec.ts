import { calculateGridWindow, createGridGeometry } from '@org/grid-core';
import type { ColumnDefinition } from '@org/grid-core';
import { describe, expect, it } from 'vitest';
import { getPinnedBoundary } from './pinned-boundaries';

const columns: readonly ColumnDefinition<number>[] = Array.from(
  { length: 6 },
  (_, index) => ({
    id: `c${index}`,
    header: `Column ${index}`,
    width: 20,
    pinned: index === 0 ? 'left' : index === 5 ? 'right' : undefined,
    getValue: (row) => row,
  }),
);
const geometry = createGridGeometry({ rowCount: 1, rowHeight: 10, columns });

describe('pinned boundary paint ownership (pure renderer geometry)', () => {
  it('assigns both inner boundaries and only one owner when pins meet', () => {
    const roomy = calculateGridWindow(geometry, {
      width: 100,
      height: 10,
      scrollTop: 0,
      scrollLeft: 0,
    });
    expect(getPinnedBoundary('left', roomy)).toBe('end');
    expect(getPinnedBoundary('right', roomy)).toBe('start');
    expect(getPinnedBoundary('center', roomy)).toBeUndefined();
    const touching = calculateGridWindow(geometry, {
      width: 40,
      height: 10,
      scrollTop: 0,
      scrollLeft: 0,
    });
    expect(touching.regions.center.width).toBe(0);
    expect(getPinnedBoundary('left', touching)).toBeUndefined();
    expect(getPinnedBoundary('right', touching)).toBe('start');
  });

  it('omits separators for empty pins, zero viewport and a pin filling the viewport', () => {
    for (const width of [0, 10, 20]) {
      const window = calculateGridWindow(geometry, {
        width,
        height: 10,
        scrollTop: 0,
        scrollLeft: 0,
      });
      expect(getPinnedBoundary('left', window)).toBeUndefined();
      expect(getPinnedBoundary('right', window)).toBeUndefined();
    }
    const plain = createGridGeometry({
      rowCount: 1,
      rowHeight: 10,
      columns: columns.map((column) => ({ ...column, pinned: undefined })),
    });
    const window = calculateGridWindow(plain, {
      width: 100,
      height: 10,
      scrollTop: 0,
      scrollLeft: 0,
    });
    expect(getPinnedBoundary('left', window)).toBeUndefined();
    expect(getPinnedBoundary('right', window)).toBeUndefined();
    const rightOnly = createGridGeometry({
      rowCount: 1,
      rowHeight: 10,
      columns: [{ ...columns[0], pinned: 'right' }],
    });
    expect(
      getPinnedBoundary(
        'right',
        calculateGridWindow(rightOnly, {
          width: 10,
          height: 10,
          scrollTop: 0,
          scrollLeft: 0,
        }),
      ),
    ).toBeUndefined();
  });

  it.each([0, 0.25, 0.5, 1, 19, 19.5, 20])(
    'keeps region-owned separators stable at fractional scroll %s',
    (scrollLeft) => {
      const window = calculateGridWindow(geometry, {
        width: 100,
        height: 10,
        scrollTop: 0,
        scrollLeft,
      });
      expect(getPinnedBoundary('left', window)).toBe('end');
      expect(getPinnedBoundary('center', window)).toBeUndefined();
      expect(getPinnedBoundary('right', window)).toBe('start');
    },
  );
});
