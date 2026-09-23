import { describe, expect, it } from 'vitest';
import { createFixedGeometry } from './geometry';

describe('createFixedGeometry', () => {
  const geometry = createFixedGeometry({
    itemCount: 100,
    itemSize: 40,
  });

  it('returns the correct offset', () => {
    expect(geometry.getOffset(0)).toBe(0);
    expect(geometry.getOffset(1)).toBe(40);
    expect(geometry.getOffset(10)).toBe(400);
    expect(geometry.getOffset(99)).toBe(3960);
  });

  it('returns the fixed size', () => {
    expect(geometry.getSize(0)).toBe(40);
    expect(geometry.getSize(50)).toBe(40);
    expect(geometry.getSize(99)).toBe(40);
  });

  it('finds the item at an offset', () => {
    expect(geometry.findIndexAtOffset(0)).toBe(0);
    expect(geometry.findIndexAtOffset(39)).toBe(0);
    expect(geometry.findIndexAtOffset(40)).toBe(1);
    expect(geometry.findIndexAtOffset(399)).toBe(9);
    expect(geometry.findIndexAtOffset(400)).toBe(10);
  });

  it('clamps offsets beyond the end', () => {
    expect(geometry.findIndexAtOffset(10_000)).toBe(99);
  });

  it('clamps negative offsets to the first item', () => {
    expect(geometry.findIndexAtOffset(-100)).toBe(0);
  });

  it('handles empty geometry', () => {
    const emptyGeometry = createFixedGeometry({
      itemCount: 0,
      itemSize: 40,
    });

    expect(emptyGeometry.getOffset(0)).toBe(0);
    expect(emptyGeometry.getSize(0)).toBe(40);
    expect(emptyGeometry.findIndexAtOffset(0)).toBe(0);
  });

  it('returns the item count', () => {
    expect(geometry.getCount()).toBe(100);
  });

  it('returns zero for empty geometry', () => {
    const emptyGeometry = createFixedGeometry({
      itemCount: 0,
      itemSize: 40,
    });

    expect(emptyGeometry.getCount()).toBe(0);
  });
});
