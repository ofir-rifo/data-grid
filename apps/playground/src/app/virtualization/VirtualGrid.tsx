import { useState } from 'react';
import { calculateRenderWindow } from './engine/calculate-render-window';
import { createFixedGeometry } from './engine/geometry';
import { createColumnRegions } from './engine/column-regions';
import type { ScrollPosition } from './engine/scroll-position';

const ROW_COUNT = 100_000;
const COLUMN_COUNT = 1_000;
const ROW_HEIGHT = 40;
const COLUMN_WIDTH = 120;

const VIEWPORT_WIDTH = 1_000;
const VIEWPORT_HEIGHT = 600;

const PINNED_LEFT_COUNT = 2;
const PINNED_RIGHT_COUNT = 2;

const columns = Array.from({ length: COLUMN_COUNT }, (_, index) => ({
  columnId: `column-${index}`,
  pinned:
    index < PINNED_LEFT_COUNT
      ? ('left' as const)
      : index >= COLUMN_COUNT - PINNED_RIGHT_COUNT
        ? ('right' as const)
        : null,
}));

const columnRegions = createColumnRegions({ columns });

const rowGeometry = createFixedGeometry({
  itemCount: ROW_COUNT,
  itemSize: ROW_HEIGHT,
});

const columnGeometry = createFixedGeometry({
  itemCount: columnRegions.center.length,
  itemSize: COLUMN_WIDTH,
});

export function VirtualGrid() {
  const [scrollPosition, setScrollPosition] = useState<ScrollPosition>({
    scrollLeft: 0,
    scrollTop: 0,
  });
  const [viewport, setViewport] = useState({
    width: VIEWPORT_WIDTH,
    height: VIEWPORT_HEIGHT,
  });

  const pinnedLeftWidth = columnRegions.left.length * COLUMN_WIDTH;
  const pinnedRightWidth = columnRegions.right.length * COLUMN_WIDTH;
  const centerViewportWidth = Math.max(
    0,
    viewport.width - pinnedLeftWidth - pinnedRightWidth,
  );

  const renderWindow = calculateRenderWindow({
    viewport: {
      width: centerViewportWidth,
      height: viewport.height,
      scrollLeft: scrollPosition.scrollLeft,
      scrollTop: scrollPosition.scrollTop,
    },
    rowGeometry,
    columnGeometry,
    rowBuffer: 400,
    columnBuffer: 0,
  });

  const logicalGridHeight = ROW_COUNT * ROW_HEIGHT;
  const centerContentWidth = columnRegions.center.length * COLUMN_WIDTH;
  const logicalGridWidth =
    pinnedLeftWidth + centerContentWidth + pinnedRightWidth;

  const rows = Array.from(
    { length: renderWindow.rowEnd - renderWindow.rowStart },
    (_, offset) => {
      const row = renderWindow.rowStart + offset;

      return (
        <div
          key={`row-${row}`}
          data-testid="grid-row"
          data-row={row}
          style={{
            position: 'absolute',
            top: row * ROW_HEIGHT,
            left: 0,
            display: 'flex',
            width: logicalGridWidth,
            height: ROW_HEIGHT,
          }}
        >
          {columnRegions.left.map((column, index) => (
            <div
              key={`left-${row}-${column.columnId}`}
              data-testid="grid-cell"
              data-region="left"
              data-row={row}
              data-column={column.columnId}
              style={{
                position: 'sticky',
                left: index * COLUMN_WIDTH,
                zIndex: 2,
                flex: `0 0 ${COLUMN_WIDTH}px`,
                width: COLUMN_WIDTH,
                height: ROW_HEIGHT,
                boxSizing: 'border-box',
                borderRight: '1px solid #ddd',
                borderBottom: '1px solid #ddd',
                padding: '8px',
                background: 'white',
              }}
            >
              R{row} C{column.columnId}
            </div>
          ))}

          <div
            data-region="center"
            style={{
              position: 'relative',
              flex: `0 0 ${centerContentWidth}px`,
              width: centerContentWidth,
              height: ROW_HEIGHT,
            }}
          >
            {Array.from(
              {
                length: renderWindow.columnEnd - renderWindow.columnStart,
              },
              (_, columnOffset) => {
                const columnIndex = renderWindow.columnStart + columnOffset;
                const column = columnRegions.center[columnIndex];

                return (
                  <div
                    key={`center-${row}-${column.columnId}`}
                    data-testid="grid-cell"
                    data-region="center"
                    data-row={row}
                    data-column={column.columnId}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: columnIndex * COLUMN_WIDTH,
                      width: COLUMN_WIDTH,
                      height: ROW_HEIGHT,
                      boxSizing: 'border-box',
                      borderRight: '1px solid #ddd',
                      borderBottom: '1px solid #ddd',
                      padding: '8px',
                      background: 'white',
                    }}
                  >
                    R{row} C{column.columnId}
                  </div>
                );
              },
            )}
          </div>

          {columnRegions.right.map((column, index) => (
            <div
              key={`right-${row}-${column.columnId}`}
              data-testid="grid-cell"
              data-region="right"
              data-row={row}
              data-column={column.columnId}
              style={{
                position: 'sticky',
                right: (columnRegions.right.length - index - 1) * COLUMN_WIDTH,
                zIndex: 2,
                flex: `0 0 ${COLUMN_WIDTH}px`,
                width: COLUMN_WIDTH,
                height: ROW_HEIGHT,
                boxSizing: 'border-box',
                borderRight: '1px solid #ddd',
                borderBottom: '1px solid #ddd',
                padding: '8px',
                background: 'white',
              }}
            >
              R{row} C{column.columnId}
            </div>
          ))}
        </div>
      );
    },
  );

  return (
    <div
      style={{
        position: 'relative',
        width: VIEWPORT_WIDTH,
        height: VIEWPORT_HEIGHT,
        border: '1px solid #ccc',
        boxSizing: 'border-box',
      }}
    >
      <div
        data-testid="grid-scrollport"
        onScroll={(event) => {
          const scrollport = event.currentTarget;
          setScrollPosition({
            scrollLeft: scrollport.scrollLeft,
            scrollTop: scrollport.scrollTop,
          });
          setViewport({
            width: scrollport.clientWidth,
            height: scrollport.clientHeight,
          });
        }}
        style={{
          width: '100%',
          height: '100%',
          overflow: 'auto',
          position: 'relative',
        }}
      >
        <div
          data-testid="grid-canvas"
          style={{
            position: 'relative',
            width: logicalGridWidth,
            height: logicalGridHeight,
          }}
        >
          {rows}
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          top: 10,
          left: pinnedLeftWidth + 10,
          padding: 12,
          background: 'white',
          border: '1px solid #ccc',
          borderRadius: 4,
          pointerEvents: 'none',
          zIndex: 20,
        }}
      >
        <strong>Grid</strong>
        <pre style={{ margin: 0 }}>
          {JSON.stringify(
            {
              rows: ROW_COUNT,
              columns: COLUMN_COUNT,
              centerColumns: columnRegions.center.length,
              renderWindow,
              centerViewportWidth,
              scrollPosition,
            },
            null,
            2,
          )}
        </pre>
      </div>
    </div>
  );
}

export default VirtualGrid;
