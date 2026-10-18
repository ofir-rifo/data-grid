import type { Geometry } from './geometry';
import type { RenderWindow } from './render-window';
import type { Viewport } from './viewport';

export interface RenderWindowConfig {
  viewport: Viewport;
  rowGeometry: Geometry;
  columnGeometry: Geometry;
  rowBuffer: number;
  columnBuffer: number;
}

function getVisibleRange(
  scrollOffset: number,
  viewportSize: number,
): { start: number; end: number } {
  return {
    start: scrollOffset,
    end: scrollOffset + viewportSize,
  };
}

function getEndIndex(geometry: Geometry, endOffset: number): number {
  if (geometry.getCount() === 0) {
    return 0;
  }

  const index = geometry.findIndexAtOffset(endOffset);

  if (geometry.getOffset(index) === endOffset) {
    return index;
  }

  return index + 1;
}

export function calculateRenderWindow(
  config: RenderWindowConfig,
): RenderWindow {
  const { viewport, rowGeometry, columnGeometry, rowBuffer, columnBuffer } =
    config;

  const rowVisibleRange = getVisibleRange(viewport.scrollTop, viewport.height);

  const columnVisibleRange = getVisibleRange(
    viewport.scrollLeft,
    viewport.width,
  );

  const rowStartOffset = Math.max(0, rowVisibleRange.start - rowBuffer);

  const rowEndOffset = rowVisibleRange.end + rowBuffer;

  const columnStartOffset = Math.max(
    0,
    columnVisibleRange.start - columnBuffer,
  );

  const columnEndOffset = columnVisibleRange.end + columnBuffer;

  return {
    rowStart: rowGeometry.findIndexAtOffset(rowStartOffset),
    rowEnd: getEndIndex(rowGeometry, rowEndOffset),
    columnStart: columnGeometry.findIndexAtOffset(columnStartOffset),
    columnEnd: getEndIndex(columnGeometry, columnEndOffset),
  };
}
