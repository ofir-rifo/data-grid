import { useLayoutEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
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

const ROW_BUFFER_OPTIONS = [400, 800, 1_200] as const;
const COLUMN_BUFFER_OPTIONS = [0, 240, 600, 1_200] as const;

function getBufferFromQuery<T extends readonly number[]>(
  name: string,
  options: T,
  fallback: T[number],
): T[number] {
  const requested = Number(
    new URLSearchParams(window.location.search).get(name),
  );

  return options.find((option) => option === requested) ?? fallback;
}

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
  const [flushSyncEnabled] = useState(
    () =>
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).get('flushSync') === '1',
  );
  const renderStartedAt = performance.now();
  const rowBuffer = getBufferFromQuery(
    'rowBuffer',
    ROW_BUFFER_OPTIONS,
    ROW_BUFFER_OPTIONS[0],
  );
  const columnBuffer = getBufferFromQuery(
    'columnBuffer',
    COLUMN_BUFFER_OPTIONS,
    COLUMN_BUFFER_OPTIONS[0],
  );
  const [scrollPosition, setScrollPosition] = useState<
    ScrollPosition & {
      eventId: number;
      eventAt: number;
    }
  >({
    scrollLeft: 0,
    scrollTop: 0,
    eventId: 0,
    eventAt: 0,
  });
  const [viewport, setViewport] = useState({
    width: VIEWPORT_WIDTH,
    height: VIEWPORT_HEIGHT,
  });
  const scrollEventId = useRef(0);
  const scrollMetricsRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (scrollPosition.eventId === 0 || scrollMetricsRef.current === null) {
      return;
    }

    const reactCommitAt = performance.now();
    scrollMetricsRef.current.dataset.scrollEventId = String(
      scrollPosition.eventId,
    );
    scrollMetricsRef.current.dataset.lastScrollEventAt = String(
      scrollPosition.eventAt,
    );
    scrollMetricsRef.current.dataset.reactCommitAt = String(reactCommitAt);
    scrollMetricsRef.current.dataset.scrollToRenderMs = (
      reactCommitAt - scrollPosition.eventAt
    ).toFixed(2);
    scrollMetricsRef.current.dataset.renderedScrollTop = String(
      scrollPosition.scrollTop,
    );
    scrollMetricsRef.current.dataset.renderedScrollLeft = String(
      scrollPosition.scrollLeft,
    );
    scrollMetricsRef.current.dataset.renderedViewportWidth = String(
      viewport.width,
    );
    scrollMetricsRef.current.dataset.renderedViewportHeight = String(
      viewport.height,
    );
    scrollMetricsRef.current.dataset.renderStartedAt = String(renderStartedAt);
    scrollMetricsRef.current.dataset.windowCalculationMs =
      String(windowCalculationMs);
    scrollMetricsRef.current.dataset.eventToRenderStartMs = String(
      renderStartedAt - scrollPosition.eventAt,
    );
    scrollMetricsRef.current.dataset.renderStartToCommitMs = String(
      reactCommitAt - renderStartedAt,
    );
  });

  const pinnedLeftWidth = columnRegions.left.length * COLUMN_WIDTH;
  const pinnedRightWidth = columnRegions.right.length * COLUMN_WIDTH;
  const centerViewportWidth = Math.max(
    0,
    viewport.width - pinnedLeftWidth - pinnedRightWidth,
  );

  const windowCalculationStartedAt = performance.now();
  const renderWindow = calculateRenderWindow({
    viewport: {
      width: centerViewportWidth,
      height: viewport.height,
      scrollLeft: scrollPosition.scrollLeft,
      scrollTop: scrollPosition.scrollTop,
    },
    rowGeometry,
    columnGeometry,
    rowBuffer,
    columnBuffer,
  });
  const windowCalculationMs = performance.now() - windowCalculationStartedAt;

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
          scrollEventId.current++;
          const eventAt = performance.now();
          const updateScrollState = () => {
            setScrollPosition({
              scrollLeft: scrollport.scrollLeft,
              scrollTop: scrollport.scrollTop,
              eventId: scrollEventId.current,
              eventAt,
            });
            setViewport({
              width: scrollport.clientWidth,
              height: scrollport.clientHeight,
            });
          };

          if (flushSyncEnabled) {
            flushSync(updateScrollState);
          } else {
            updateScrollState();
          }
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
          data-flush-sync-enabled={flushSyncEnabled}
          ref={scrollMetricsRef}
          data-row-buffer={rowBuffer}
          data-column-buffer={columnBuffer}
          data-rendered-row-count={renderWindow.rowEnd - renderWindow.rowStart}
          data-row-start={renderWindow.rowStart}
          data-row-end={renderWindow.rowEnd}
          data-rendered-center-column-count={
            renderWindow.columnEnd - renderWindow.columnStart
          }
          data-column-start={renderWindow.columnStart}
          data-column-end={renderWindow.columnEnd}
          data-rendered-cell-count={
            (renderWindow.rowEnd - renderWindow.rowStart) *
            (columnRegions.left.length +
              columnRegions.right.length +
              renderWindow.columnEnd -
              renderWindow.columnStart)
          }
          data-scroll-to-render-ms="0"
          data-scroll-event-id="0"
          data-last-scroll-event-at="0"
          data-react-commit-at="0"
          data-rendered-scroll-top="0"
          data-rendered-scroll-left="0"
          data-rendered-viewport-width={VIEWPORT_WIDTH}
          data-rendered-viewport-height={VIEWPORT_HEIGHT}
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
              rowBuffer,
              columnBuffer,
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
