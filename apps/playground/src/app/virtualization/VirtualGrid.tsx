import { useState } from 'react';
import { calculateRenderWindow } from './engine/calculate-render-window';
import { createFixedGeometry } from './engine/geometry';

const ROW_COUNT = 100_000;
const COLUMN_COUNT = 1_000;
const ROW_HEIGHT = 40;
const COLUMN_WIDTH = 120;

const rowGeometry = createFixedGeometry({
  itemCount: ROW_COUNT,
  itemSize: ROW_HEIGHT,
});

const columnGeometry = createFixedGeometry({
  itemCount: COLUMN_COUNT,
  itemSize: COLUMN_WIDTH,
});

export function VirtualGrid() {
  const [scrollPosition, setScrollPosition] = useState({
    scrollLeft: 0,
    scrollTop: 0,
  });

  const renderWindow = calculateRenderWindow({
    viewport: {
      width: 1_000,
      height: 600,
      scrollLeft: scrollPosition.scrollLeft,
      scrollTop: scrollPosition.scrollTop,
    },
    rowGeometry,
    columnGeometry,
    rowBuffer: 400,
    columnBuffer: 0,
  });

  const cells = [];

  for (let row = renderWindow.rowStart; row < renderWindow.rowEnd; row++) {
    for (
      let column = renderWindow.columnStart;
      column < renderWindow.columnEnd;
      column++
    ) {
      cells.push(
        <div
          key={`${row}-${column}`}
          style={{
            position: 'absolute',
            top: (row - renderWindow.rowStart) * ROW_HEIGHT,
            left: (column - renderWindow.columnStart) * COLUMN_WIDTH,
            width: COLUMN_WIDTH,
            height: ROW_HEIGHT,
            boxSizing: 'border-box',
            borderRight: '1px solid #ddd',
            borderBottom: '1px solid #ddd',
            padding: '8px',
            background: 'white',
          }}
        >
          R{row} C{column}
        </div>,
      );
    }
  }

  return (
    <div
      style={{
        position: 'relative',
        width: 1_000,
        height: 600,
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          overflow: 'auto',
        }}
        onScroll={(event) => {
          setScrollPosition({
            scrollLeft: event.currentTarget.scrollLeft,
            scrollTop: event.currentTarget.scrollTop,
          });
        }}
      >
        {/* Logical grid dimensions */}
        <div
          style={{
            position: 'relative',
            width: COLUMN_COUNT * COLUMN_WIDTH,
            height: ROW_COUNT * ROW_HEIGHT,
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: renderWindow.rowStart * ROW_HEIGHT,
              left: renderWindow.columnStart * COLUMN_WIDTH,
            }}
          >
            {cells}
          </div>
        </div>
      </div>
      Get-ChildItem -Force -Filter "_tmp_*" | Sort-Object LastWriteTime
      -Descending | Select-Object -First 5 Name, Length, LastWriteTime{' '}
      {/* Debug information */}
      <div
        style={{
          position: 'absolute',
          top: 10,
          left: 10,
          padding: 12,
          background: 'white',
          border: '1px solid #ccc',
          borderRadius: 4,
          pointerEvents: 'none',
        }}
      >
        <strong>Grid</strong>
        <pre style={{ margin: 0 }}>
          {JSON.stringify(
            {
              rows: ROW_COUNT,
              columns: COLUMN_COUNT,
              renderWindow,
            },
            null,
            2,
          )}
        </pre>

        <pre style={{ margin: 0 }}>{JSON.stringify(renderWindow, null, 2)}</pre>
      </div>
    </div>
  );
}

export default VirtualGrid;
