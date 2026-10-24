import type { ColumnRegion, GridWindow } from '@org/grid-core';

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
