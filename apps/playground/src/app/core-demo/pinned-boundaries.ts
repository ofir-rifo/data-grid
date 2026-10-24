import type { ColumnLayout, ColumnRegion, GridWindow } from '@org/grid-core';

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

/** Keep internal dividers; let a reserved one-pixel region band own seam paint. */
export function suppressTrailingBorder<T>(
  region: ColumnRegion,
  column: ColumnLayout<T>,
  window: GridWindow,
): boolean {
  const width = window.regions[region].width;
  if (width === 0) return false;
  const end =
    column.offset +
    column.width -
    (region === 'center' ? window.scrollLeft : 0);
  const start = end - 1;
  const touchesStart = end > 0 && start < Math.min(1, width);
  const touchesEnd = end > Math.max(0, width - 1) && start < width;
  if (region === 'left') return touchesEnd;
  if (region === 'right')
    return getPinnedBoundary(region, window) === 'start' && touchesStart;
  return (
    (window.regions.left.width > 0 && touchesStart) ||
    (window.regions.right.width > 0 && touchesEnd)
  );
}
