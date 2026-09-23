import { describe, expect, it } from 'vitest';
import { createFixedGeometry } from './geometry';
import { calculateRenderWindow } from './calculate-render-window';

describe('calculateRenderWindow', () => {
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
