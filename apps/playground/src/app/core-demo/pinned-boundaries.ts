import type { ColumnRegion, GridWindow } from '@org/grid-core';

/** Decoration follows hidden center content, independent of solid separators. */
export function getPinnedShadows(
  window: GridWindow,
): 'left' | 'right' | 'left right' | undefined {
  if (window.regions.center.width === 0 || window.maxScrollLeft === 0)
    return undefined;
  const left = window.regions.left.width > 0 && window.scrollLeft > 0;
  const right =
    window.regions.right.width > 0 && window.scrollLeft < window.maxScrollLeft;
  return left && right
    ? 'left right'
    : left
      ? 'left'
      : right
        ? 'right'
        : undefined;
}

/** Region-local edges in the renderer's explicit LTR coordinate canvas. */
export function getPinnedBoundary(
  region: ColumnRegion,
  window: GridWindow,
): 'start' | 'end' | undefined {
  if (
    region === 'left' &&
    window.regions.left.width > 0 &&
    window.regions.center.width > 0
  )
    return 'end';
  if (
    region === 'right' &&
    window.regions.right.width > 0 &&
    window.regions.right.x > 0
  )
    return 'start';
  return undefined;
}
