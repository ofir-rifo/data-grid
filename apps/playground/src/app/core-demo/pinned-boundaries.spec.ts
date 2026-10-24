import { calculateGridWindow, createGridGeometry } from '@org/grid-core';
import type { ColumnDefinition } from '@org/grid-core';
import { describe, expect, it } from 'vitest';
import { getPinnedBoundary, suppressTrailingBorder } from './pinned-boundaries';

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
    expect(
      suppressTrailingBorder('left', geometry.regions.left[0], touching),
    ).toBe(true);
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
    expect(
      plain.regions.center.every(
        (column) => !suppressTrailingBorder('center', column, window),
      ),
    ).toBe(true);
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

  it.each([
    { scrollLeft: 0, suppressed: ['c3'] },
    { scrollLeft: 0.25, suppressed: ['c3'] },
    { scrollLeft: 0.5, suppressed: ['c3'] },
    { scrollLeft: 1, suppressed: [] },
    { scrollLeft: 19, suppressed: ['c1'] },
    { scrollLeft: 19.5, suppressed: ['c1', 'c4'] },
    { scrollLeft: 20, suppressed: ['c4'] },
  ])(
    'suppresses only reserved-band borders at scroll $scrollLeft',
    ({ scrollLeft, suppressed }) => {
      const window = calculateGridWindow(geometry, {
        width: 100,
        height: 10,
        scrollTop: 0,
        scrollLeft,
      });
      expect(
        geometry.regions.center
          .filter((column) => suppressTrailingBorder('center', column, window))
          .map((column) => column.id),
      ).toEqual(suppressed);
    },
  );

  it('retains internal borders within multi-column pinned regions', () => {
    const multi = createGridGeometry({
      rowCount: 1,
      rowHeight: 10,
      columns: columns.map((column, index) => ({
        ...column,
        pinned: index < 2 ? 'left' : index === 5 ? 'right' : undefined,
      })),
    });
    const window = calculateGridWindow(multi, {
      width: 100,
      height: 10,
      scrollTop: 0,
      scrollLeft: 0,
    });
    expect(suppressTrailingBorder('left', multi.regions.left[0], window)).toBe(
      false,
    );
    expect(suppressTrailingBorder('left', multi.regions.left[1], window)).toBe(
      true,
    );
    expect(
      suppressTrailingBorder('right', multi.regions.right[0], window),
    ).toBe(false);
  });
});
