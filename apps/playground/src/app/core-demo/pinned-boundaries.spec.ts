import { calculateGridWindow, createGridGeometry } from '@org/grid-core';
import type { ColumnDefinition } from '@org/grid-core';
import { describe, expect, it } from 'vitest';
import { getPinnedBoundary, getPinnedShadows } from './pinned-boundaries';

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
  it.each([
    { scrollLeft: -1, shadow: 'right' },
    { scrollLeft: 0, shadow: 'right' },
    { scrollLeft: 0.25, shadow: 'left right' },
    { scrollLeft: 10, shadow: 'left right' },
    { scrollLeft: 19.75, shadow: 'left right' },
    { scrollLeft: 20, shadow: 'left' },
    { scrollLeft: 100, shadow: 'left' },
  ])(
    'shows only sides with hidden center content at $scrollLeft',
    ({ scrollLeft, shadow }) => {
      const window = calculateGridWindow(geometry, {
        width: 100,
        height: 10,
        scrollTop: 0,
        scrollLeft,
      });
      expect(getPinnedShadows(window)).toBe(shadow);
    },
  );

  it.each(['left', 'right', 'both', 'none'])(
    'requires visible %s pins as well as hidden content',
    (pin) => {
      const model = createGridGeometry({
        rowCount: 1,
        rowHeight: 10,
        columns: columns.map((column) => ({
          ...column,
          pinned:
            pin === 'both' || column.pinned === pin ? column.pinned : undefined,
        })),
      });
      const window = calculateGridWindow(model, {
        width: 60,
        height: 10,
        scrollTop: 0,
        scrollLeft: 5,
      });
      expect(getPinnedShadows(window)).toBe(
        pin === 'both' ? 'left right' : pin === 'none' ? undefined : pin,
      );
    },
  );

  it('omits shadows for no overflow, zero viewport and collapsed center even when pins have a separator', () => {
    for (const width of [0, 20, 40, 120, 200]) {
      const window = calculateGridWindow(geometry, {
        width,
        height: 10,
        scrollTop: 0,
        scrollLeft: 10,
      });
      expect(getPinnedShadows(window)).toBeUndefined();
    }
  });

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
