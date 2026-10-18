import { describe, expect, it } from 'vitest';
import { createFixedGeometry } from './geometry';
import { calculateRenderWindow } from './calculate-render-window';

describe('calculateRenderWindow', () => {
  it.each([
    {
      rows: 0,
      columns: 0,
      expected: { rowStart: 0, rowEnd: 0, columnStart: 0, columnEnd: 0 },
    },
    {
      rows: 0,
      columns: 10,
      expected: { rowStart: 0, rowEnd: 0, columnStart: 0, columnEnd: 5 },
    },
    {
      rows: 10,
      columns: 0,
      expected: { rowStart: 0, rowEnd: 10, columnStart: 0, columnEnd: 0 },
    },
  ])(
    'does not invent items for empty axes ($rows rows, $columns columns)',
    ({ rows, columns, expected }) => {
      expect(
        calculateRenderWindow({
          viewport: { width: 520, height: 600, scrollTop: 0, scrollLeft: 0 },
          rowGeometry: createFixedGeometry({ itemCount: rows, itemSize: 40 }),
          columnGeometry: createFixedGeometry({
            itemCount: columns,
            itemSize: 120,
          }),
          rowBuffer: 400,
          columnBuffer: 0,
        }),
      ).toEqual(expected);
    },
  );

  it.each([
    {
      name: 'aligned exclusive edges',
      top: 40,
      left: 120,
      height: 40,
      width: 120,
      rowBuffer: 0,
      columnBuffer: 0,
      expected: { rowStart: 1, rowEnd: 2, columnStart: 1, columnEnd: 2 },
    },
    {
      name: 'fractional first and last cells',
      top: 39.5,
      left: 119.5,
      height: 40,
      width: 120,
      rowBuffer: 0,
      columnBuffer: 0,
      expected: { rowStart: 0, rowEnd: 2, columnStart: 0, columnEnd: 2 },
    },
    {
      name: 'independent pixel buffers',
      top: 200,
      left: 600,
      height: 40,
      width: 120,
      rowBuffer: 80,
      columnBuffer: 240,
      expected: { rowStart: 3, rowEnd: 8, columnStart: 3, columnEnd: 8 },
    },
    {
      name: 'last row and center column',
      top: 399.5,
      left: 1199.5,
      height: 600,
      width: 520,
      rowBuffer: 400,
      columnBuffer: 240,
      expected: { rowStart: 0, rowEnd: 10, columnStart: 7, columnEnd: 10 },
    },
    {
      name: 'viewport larger than dataset',
      top: 0,
      left: 0,
      height: 600,
      width: 2000,
      rowBuffer: 0,
      columnBuffer: 0,
      expected: { rowStart: 0, rowEnd: 10, columnStart: 0, columnEnd: 10 },
    },
  ])(
    'respects $name',
    ({ top, left, height, width, rowBuffer, columnBuffer, expected }) => {
      expect(
        calculateRenderWindow({
          viewport: { width, height, scrollTop: top, scrollLeft: left },
          rowGeometry: createFixedGeometry({ itemCount: 10, itemSize: 40 }),
          columnGeometry: createFixedGeometry({ itemCount: 10, itemSize: 120 }),
          rowBuffer,
          columnBuffer,
        }),
      ).toEqual(expected);
    },
  );

  it.each([
    { rows: 100_000, centerColumns: 996 },
    { rows: 1_000_000, centerColumns: 996 },
    { rows: 100_000, centerColumns: 9_996 },
  ])(
    'keeps an interior window independent of logical counts ($rows × $centerColumns)',
    ({ rows, centerColumns }) => {
      // Three constant-space pure calculations; no large arrays, DOM or benchmark.
      expect(
        calculateRenderWindow({
          viewport: {
            width: 518,
            height: 598,
            scrollTop: 2_000_003,
            scrollLeft: 60_001,
          },
          rowGeometry: createFixedGeometry({ itemCount: rows, itemSize: 40 }),
          columnGeometry: createFixedGeometry({
            itemCount: centerColumns,
            itemSize: 120,
          }),
          rowBuffer: 400,
          columnBuffer: 0,
        }),
      ).toEqual({
        rowStart: 49_990,
        rowEnd: 50_026,
        columnStart: 500,
        columnEnd: 505,
      });
    },
  );

  it('calculates the initial render window', () => {
    const rowGeometry = createFixedGeometry({
      itemCount: 100_000,
      itemSize: 40,
    });

    const columnGeometry = createFixedGeometry({
      itemCount: 1_000,
      itemSize: 120,
    });

    const renderWindow = calculateRenderWindow({
      viewport: {
        width: 1_000,
        height: 600,
        scrollLeft: 0,
        scrollTop: 0,
      },
      rowGeometry,
      columnGeometry,
      rowBuffer: 400,
      columnBuffer: 0,
    });

    expect(renderWindow).toEqual({
      rowStart: 0,
      rowEnd: 25,
      columnStart: 0,
      columnEnd: 9,
    });
  });

  it('uses an exclusive end when the range ends exactly on a row boundary', () => {
    const rowGeometry = createFixedGeometry({
      itemCount: 100,
      itemSize: 40,
    });

    const columnGeometry = createFixedGeometry({
      itemCount: 100,
      itemSize: 120,
    });

    const renderWindow = calculateRenderWindow({
      viewport: {
        width: 1_000,
        height: 600,
        scrollLeft: 0,
        scrollTop: 0,
      },
      rowGeometry,
      columnGeometry,
      rowBuffer: 0,
      columnBuffer: 0,
    });

    expect(renderWindow.rowEnd).toBe(15);
  });

  it('includes the item when the range ends inside it', () => {
    const rowGeometry = createFixedGeometry({
      itemCount: 100,
      itemSize: 40,
    });

    const columnGeometry = createFixedGeometry({
      itemCount: 100,
      itemSize: 120,
    });

    const renderWindow = calculateRenderWindow({
      viewport: {
        width: 1_000,
        height: 600,
        scrollLeft: 0,
        scrollTop: 0,
      },
      rowGeometry,
      columnGeometry,
      rowBuffer: 0,
      columnBuffer: 0,
    });

    expect(renderWindow.columnEnd).toBe(9);
  });

  it('calculates the render window after vertical scrolling', () => {
    const rowGeometry = createFixedGeometry({
      itemCount: 100_000,
      itemSize: 40,
    });

    const columnGeometry = createFixedGeometry({
      itemCount: 1_000,
      itemSize: 120,
    });

    const renderWindow = calculateRenderWindow({
      viewport: {
        width: 1_000,
        height: 600,
        scrollLeft: 0,
        scrollTop: 400,
      },
      rowGeometry,
      columnGeometry,
      rowBuffer: 400,
      columnBuffer: 0,
    });

    expect(renderWindow).toEqual({
      rowStart: 0,
      rowEnd: 35,
      columnStart: 0,
      columnEnd: 9,
    });
  });

  it('clamps the render window at the bottom', () => {
    const rowGeometry = createFixedGeometry({
      itemCount: 100_000,
      itemSize: 40,
    });

    const columnGeometry = createFixedGeometry({
      itemCount: 1_000,
      itemSize: 120,
    });

    const renderWindow = calculateRenderWindow({
      viewport: {
        width: 1_000,
        height: 600,
        scrollLeft: 0,
        scrollTop: 3_999_400,
      },
      rowGeometry,
      columnGeometry,
      rowBuffer: 400,
      columnBuffer: 0,
    });

    expect(renderWindow).toEqual({
      rowStart: 99_975,
      rowEnd: 100_000,
      columnStart: 0,
      columnEnd: 9,
    });
  });

  it('calculates the render window after horizontal scrolling', () => {
    const rowGeometry = createFixedGeometry({
      itemCount: 100_000,
      itemSize: 40,
    });

    const columnGeometry = createFixedGeometry({
      itemCount: 1_000,
      itemSize: 120,
    });

    const renderWindow = calculateRenderWindow({
      viewport: {
        width: 1_000,
        height: 600,
        scrollLeft: 600,
        scrollTop: 0,
      },
      rowGeometry,
      columnGeometry,
      rowBuffer: 400,
      columnBuffer: 0,
    });

    expect(renderWindow).toEqual({
      rowStart: 0,
      rowEnd: 25,
      columnStart: 5,
      columnEnd: 14,
    });
  });

  it('calculates the render window after scrolling in both directions', () => {
    const rowGeometry = createFixedGeometry({
      itemCount: 100_000,
      itemSize: 40,
    });

    const columnGeometry = createFixedGeometry({
      itemCount: 1_000,
      itemSize: 120,
    });

    const renderWindow = calculateRenderWindow({
      viewport: {
        width: 1_000,
        height: 600,
        scrollLeft: 600,
        scrollTop: 400,
      },
      rowGeometry,
      columnGeometry,
      rowBuffer: 400,
      columnBuffer: 0,
    });

    expect(renderWindow).toEqual({
      rowStart: 0,
      rowEnd: 35,
      columnStart: 5,
      columnEnd: 14,
    });
  });

  it('handles a large vertical scroll jump', () => {
    const rowGeometry = createFixedGeometry({
      itemCount: 100_000,
      itemSize: 40,
    });

    const columnGeometry = createFixedGeometry({
      itemCount: 1_000,
      itemSize: 120,
    });

    const renderWindow = calculateRenderWindow({
      viewport: {
        width: 1_000,
        height: 600,
        scrollLeft: 0,
        scrollTop: 2_000_000,
      },
      rowGeometry,
      columnGeometry,
      rowBuffer: 400,
      columnBuffer: 0,
    });

    expect(renderWindow).toEqual({
      rowStart: 49_990,
      rowEnd: 50_025,
      columnStart: 0,
      columnEnd: 9,
    });
  });
});
