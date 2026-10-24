import { describe, expect, it } from 'vitest';
import {
  calculateGridWindow,
  createGridGeometry,
  getRow,
  getRowOffset,
} from '../index.js';
import type { ColumnDefinition, RowSource } from '../index.js';

function columns(widths: readonly number[]): ColumnDefinition<number>[] {
  return widths.map((width, i) => ({
    id: `c${i}`,
    header: `Column ${i}`,
    width,
    getValue: (row) => row + i,
  }));
}

const viewport = { width: 20, height: 20, scrollLeft: 0, scrollTop: 0 };

describe('Grid Core contracts', () => {
  it('separates stable column identity, source index and full visual position', () => {
    const defs = columns([10, 20, 30, 40, 50, 60]);
    defs[0] = { ...defs[0], pinned: 'right' };
    defs[2] = { ...defs[2], pinned: 'left' };
    const geometry = createGridGeometry({
      rowCount: 2,
      rowHeight: 10,
      columns: defs,
    });
    const ordered = [
      ...geometry.regions.left,
      ...geometry.regions.center,
      ...geometry.regions.right,
    ];
    expect(
      ordered.map(({ id, logicalIndex, visualIndex }) => ({
        id,
        logicalIndex,
        visualIndex,
      })),
    ).toEqual([
      { id: 'c2', logicalIndex: 2, visualIndex: 0 },
      { id: 'c1', logicalIndex: 1, visualIndex: 1 },
      { id: 'c3', logicalIndex: 3, visualIndex: 2 },
      { id: 'c4', logicalIndex: 4, visualIndex: 3 },
      { id: 'c5', logicalIndex: 5, visualIndex: 4 },
      { id: 'c0', logicalIndex: 0, visualIndex: 5 },
    ]);
    const repinned = createGridGeometry({
      rowCount: 2,
      rowHeight: 10,
      columns: defs.map((column) => ({ ...column, pinned: undefined })),
    });
    expect(repinned.regions.center.map(({ id }) => id)).toEqual(
      defs.map(({ id }) => id),
    );
    expect(repinned.regions.center[0]).toMatchObject({
      id: 'c0',
      logicalIndex: 0,
      visualIndex: 0,
    });
    expect(geometry.regions.right[0]).toMatchObject({
      id: 'c0',
      logicalIndex: 0,
      visualIndex: 5,
    });
    expect(Object.isFrozen(geometry.regions.right[0])).toBe(true);
  });

  it('rejects missing column definitions instead of silently dropping source positions', () => {
    const sparse = new Array<ColumnDefinition<number>>(2);
    sparse[1] = columns([10])[0];
    expect(() =>
      createGridGeometry({ rowCount: 0, rowHeight: 10, columns: sparse }),
    ).toThrow(/columns\[0\]/);
  });

  it('uses exact half-open edges and interior intersections', () => {
    const geometry = createGridGeometry({
      rowCount: 10,
      rowHeight: 10,
      columns: columns([10, 10, 30, 10]),
    });
    const exact = calculateGridWindow(geometry, {
      ...viewport,
      scrollTop: 20,
      scrollLeft: 20,
    });
    expect(exact.visibleRows).toEqual({ start: 2, end: 4 });
    expect(exact.visibleCenterColumns).toEqual({ start: 2, end: 3 });
    const interior = calculateGridWindow(geometry, {
      ...viewport,
      scrollTop: 21,
      scrollLeft: 9,
    });
    expect(interior.rows).toEqual({ start: 2, end: 5 });
    expect(interior.centerColumns).toEqual({ start: 0, end: 3 });
    expect(getRowOffset(geometry, 9)).toBe(90);
    expect(geometry.height).toBe(100);
    expect(geometry.width).toBe(60);
  });

  it('clamps both axes and applies pixel overscan independently', () => {
    const geometry = createGridGeometry({
      rowCount: 10,
      rowHeight: 10,
      columns: columns([10, 10, 10, 10, 10]),
    });
    const end = calculateGridWindow(geometry, {
      ...viewport,
      scrollTop: 999,
      scrollLeft: 999,
      rowOverscan: 15,
      columnOverscan: 5,
    });
    expect(end.scrollTop).toBe(80);
    expect(end.scrollLeft).toBe(30);
    expect(end.rows).toEqual({ start: 6, end: 10 });
    expect(end.visibleRows).toEqual({ start: 8, end: 10 });
    expect(end.centerColumns).toEqual({ start: 2, end: 5 });
    expect(end.visibleCenterColumns).toEqual({ start: 3, end: 5 });
    const start = calculateGridWindow(geometry, {
      ...viewport,
      scrollTop: -20,
      scrollLeft: -10,
    });
    expect(start.scrollTop).toBe(0);
    expect(start.scrollLeft).toBe(0);
  });

  it('handles no rows/columns, one cell and oversized viewports', () => {
    const empty = createGridGeometry({
      rowCount: 0,
      rowHeight: 10,
      columns: [],
    });
    expect(calculateGridWindow(empty, viewport).rows).toEqual({
      start: 0,
      end: 0,
    });
    expect(calculateGridWindow(empty, viewport).centerColumns).toEqual({
      start: 0,
      end: 0,
    });
    const one = createGridGeometry({
      rowCount: 1,
      rowHeight: 10,
      columns: columns([10]),
    });
    expect(calculateGridWindow(one, viewport).rows).toEqual({
      start: 0,
      end: 1,
    });
    expect(calculateGridWindow(one, viewport).centerColumns).toEqual({
      start: 0,
      end: 1,
    });
    expect(calculateGridWindow(one, viewport).maxScrollLeft).toBe(0);
    const zero = calculateGridWindow(one, {
      ...viewport,
      width: 0,
      height: 0,
      rowOverscan: 100,
      columnOverscan: 100,
    });
    expect(zero.rows).toEqual({ start: 0, end: 0 });
    expect(zero.centerColumns).toEqual({ start: 0, end: 0 });
  });

  it('partitions pins once, preserves logical identity and clips without overlap', () => {
    const defs = columns([30, 40, 50, 60]);
    defs[1] = { ...defs[1], pinned: 'right' };
    defs[2] = { ...defs[2], pinned: 'left' };
    const geometry = createGridGeometry({
      rowCount: 10,
      rowHeight: 10,
      columns: defs,
    });
    expect(geometry.regions.left[0]).toMatchObject({
      id: 'c2',
      logicalIndex: 2,
      offset: 0,
    });
    expect(geometry.regions.center[1]).toMatchObject({
      id: 'c3',
      logicalIndex: 3,
      offset: 30,
    });
    const window = calculateGridWindow(geometry, {
      ...viewport,
      width: 120,
      scrollLeft: 50,
    });
    expect(window.regions).toEqual({
      left: { x: 0, width: 50 },
      center: { x: 50, width: 30 },
      right: { x: 80, width: 40 },
    });
    expect(window.scrollLeft).toBe(50);
    expect(geometry.regions.left[0].offset).toBe(0);
    const clipped = calculateGridWindow(geometry, {
      ...viewport,
      width: 60,
      columnOverscan: 100,
    });
    expect(clipped.regions).toEqual({
      left: { x: 0, width: 50 },
      center: { x: 50, width: 0 },
      right: { x: 50, width: 10 },
    });
    expect(clipped.centerColumns).toEqual({ start: 0, end: 0 });
    expect(Object.isFrozen(geometry.regions.center[0])).toBe(true);
    defs[0] = { ...defs[0], width: 500 };
    expect(geometry.regions.center[0].width).toBe(30);
  });

  it('keeps stable keys across reorder/replacement and reads only requested rows', () => {
    const first = [
      { id: 'a', value: 1 },
      { id: 'b', value: 2 },
    ];
    const source: RowSource<{ id: string; value: number }> = {
      count: 2,
      getRow: (index) => first[index],
      getRowId: (row) => row.id,
    };
    expect(getRow(source, 0).id).toBe('a');
    const reordered = {
      ...source,
      getRow: (index: number) =>
        [
          { id: 'b', value: 9 },
          { id: 'a', value: 8 },
        ][index],
    };
    expect(getRow(reordered, 1).id).toBe('a');
    let reads = 0;
    const lazy: RowSource<number> = {
      count: 1_000_000,
      getRow: (index) => {
        reads++;
        return index;
      },
      getRowId: (row) => `r${row}`,
    };
    const geometry = createGridGeometry({
      rowCount: lazy.count,
      rowHeight: 40,
      columns: columns(Array.from({ length: 4096 }, () => 100)),
    });
    const window = calculateGridWindow(geometry, {
      width: 200,
      height: 80,
      scrollTop: 39_999_920,
      scrollLeft: 409_400,
    });
    expect(window.rows).toEqual({ start: 999_998, end: 1_000_000 });
    expect(window.centerColumns).toEqual({ start: 4094, end: 4096 });
    expect(reads).toBe(0);
    expect(getRow(lazy, 999_999).id).toBe('r999999');
    expect(reads).toBe(1);
  });

  it('matches an independent intersection oracle across fractional column windows', () => {
    const widths = [0.5, 1.25, 3, 2.5, 0.75];
    const geometry = createGridGeometry({
      rowCount: 20,
      rowHeight: 2.5,
      columns: columns(widths),
    });
    for (const width of [0.25, 1, 4, 20]) {
      for (const scrollLeft of [-1, 0, 0.5, 1.75, 3, 7, 50]) {
        for (const buffer of [0, 0.5, 10]) {
          const result = calculateGridWindow(geometry, {
            width,
            height: 3.75,
            scrollLeft,
            scrollTop: scrollLeft,
            columnOverscan: buffer,
            rowOverscan: buffer,
          });
          const left = Math.max(
            0,
            Math.min(scrollLeft, Math.max(0, 8 - width)),
          );
          let x = 0;
          const matches = widths.flatMap((itemWidth, index) => {
            const intersects =
              x + itemWidth > Math.max(0, left - buffer) &&
              x < Math.min(8, left + width + buffer);
            x += itemWidth;
            return intersects ? [index] : [];
          });
          expect(result.centerColumns).toEqual({
            start: matches[0],
            end: matches[matches.length - 1] + 1,
          });
          const top = Math.max(0, Math.min(scrollLeft, 46.25));
          const rowMatches = Array.from({ length: 20 }, (_, i) => i).filter(
            (i) =>
              (i + 1) * 2.5 > Math.max(0, top - buffer) &&
              i * 2.5 < Math.min(50, top + 3.75 + buffer),
          );
          expect(result.rows).toEqual({
            start: rowMatches[0],
            end: rowMatches[rowMatches.length - 1] + 1,
          });
        }
      }
    }
  });

  it('rejects invalid geometry, viewport, IDs, indices and unsafe extents', () => {
    for (const rowCount of [
      -1,
      0.5,
      NaN,
      Infinity,
      Number.MAX_SAFE_INTEGER + 1,
    ]) {
      expect(() =>
        createGridGeometry({ rowCount, rowHeight: 10, columns: [] }),
      ).toThrow(RangeError);
    }
    for (const rowHeight of [0, -1, NaN, Infinity]) {
      expect(() =>
        createGridGeometry({ rowCount: 1, rowHeight, columns: [] }),
      ).toThrow(RangeError);
    }
    for (const width of [0, -1, NaN, Infinity]) {
      expect(() =>
        createGridGeometry({
          rowCount: 0,
          rowHeight: 1,
          columns: columns([width]),
        }),
      ).toThrow(RangeError);
    }
    expect(() =>
      createGridGeometry({
        rowCount: Number.MAX_SAFE_INTEGER,
        rowHeight: 2,
        columns: [],
      }),
    ).toThrow(RangeError);
    expect(() =>
      createGridGeometry({
        rowCount: 0,
        rowHeight: 1,
        columns: columns([Number.MAX_SAFE_INTEGER, 1]),
      }),
    ).toThrow(RangeError);
    const duplicate = columns([1, 2]).map((column) => ({
      ...column,
      id: 'same',
    }));
    expect(() =>
      createGridGeometry({ rowCount: 0, rowHeight: 1, columns: duplicate }),
    ).toThrow(/duplicate/);
    expect(() =>
      createGridGeometry({
        rowCount: 0,
        rowHeight: 1,
        columns: [{ ...columns([1])[0], id: '' }],
      }),
    ).toThrow(/column.id/);
    const geometry = createGridGeometry({
      rowCount: 1,
      rowHeight: 1,
      columns: [],
    });
    for (const patch of [
      { width: -1 },
      { height: NaN },
      { scrollTop: Infinity },
      { scrollLeft: NaN },
      { rowOverscan: -1 },
      { columnOverscan: Infinity },
    ]) {
      expect(() =>
        calculateGridWindow(geometry, { ...viewport, ...patch }),
      ).toThrow(RangeError);
    }
    expect(() => getRowOffset(geometry, 1)).toThrow(RangeError);
    expect(() =>
      getRow({ count: 1, getRow: () => 1, getRowId: () => '' }, 0),
    ).toThrow(/row.id/);
    expect(() =>
      getRow({ count: 0, getRow: () => 1, getRowId: () => 'a' }, 0),
    ).toThrow(RangeError);
    const error = new Error('consumer failure');
    expect(() =>
      getRow(
        {
          count: 1,
          getRow: () => {
            throw error;
          },
          getRowId: () => 'a',
        },
        0,
      ),
    ).toThrow(error);
  });

  it('does not add phantom rows at non-binary fractional boundaries', () => {
    const geometry = createGridGeometry({
      rowCount: 100,
      rowHeight: 0.1,
      columns: [],
    });
    for (let index = 1; index < 99; index++) {
      const start = getRowOffset(geometry, index);
      const end = getRowOffset(geometry, index + 1);
      expect(
        calculateGridWindow(geometry, {
          ...viewport,
          scrollTop: start,
          height: end - start,
        }).visibleRows,
      ).toEqual({ start: index, end: index + 1 });
    }
  });

  it('handles all-pinned layouts, zero clipped left and invalid runtime pin values', () => {
    const defs = columns([10, 20]);
    const allPinned = defs.map((column) => ({
      ...column,
      pinned: 'right' as const,
    }));
    const geometry = createGridGeometry({
      rowCount: 2,
      rowHeight: 10,
      columns: allPinned,
    });
    const result = calculateGridWindow(geometry, {
      ...viewport,
      width: 15,
      scrollLeft: 100,
    });
    expect(result.centerColumns).toEqual({ start: 0, end: 0 });
    expect(result.regions.right).toEqual({ x: 0, width: 15 });
    expect(result.scrollLeft).toBe(0);
    Object.defineProperty(defs[0], 'pinned', { value: 'invalid' });
    expect(() =>
      createGridGeometry({ rowCount: 1, rowHeight: 10, columns: defs }),
    ).toThrow(/pinned/);
    expect(() =>
      createGridGeometry({
        rowCount: Number.MAX_SAFE_INTEGER,
        rowHeight: 0.1,
        columns: [],
      }),
    ).toThrow(/resolution/);
  });
});
