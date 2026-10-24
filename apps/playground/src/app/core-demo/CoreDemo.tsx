import { useEffect, useRef, useState } from 'react';
import { calculateGridWindow, createGridGeometry } from '@org/grid-core';
import type { ColumnDefinition, RowSource } from '@org/grid-core';
import styles from './CoreDemo.module.scss';
import CoreTable, { getRenderedCellCount } from './CoreTable';

const ROW_HEIGHT = 32;
const CANVAS_CAP = 1_000_000;

function createModel(rowCount: number, columnCount: number, pinned: boolean) {
  const columns: ColumnDefinition<number>[] = Array.from(
    { length: columnCount },
    (_, index) => ({
      id: `c${index}`,
      header: `Column ${index + 1}`,
      width: index % 3 === 0 ? 140 : 100,
      pinned:
        pinned && index === 0
          ? 'left'
          : pinned && index === columnCount - 1
            ? 'right'
            : undefined,
      getValue: (row) => `R${row + 1} · C${index + 1}`,
    }),
  );
  return {
    rowCount,
    columnCount,
    pinned,
    geometry: createGridGeometry({ rowCount, rowHeight: ROW_HEIGHT, columns }),
  };
}

function logicalOffset(
  physical: number,
  physicalMax: number,
  logicalMax: number,
): number {
  return physicalMax > 0
    ? Math.min(1, Math.max(0, physical / physicalMax)) * logicalMax
    : 0;
}

export default function CoreDemo() {
  // Layout is built only on configuration changes, never on scroll.
  const [model, setModel] = useState(() => createModel(1000, 30, true));
  const [viewport, setViewport] = useState({
    width: 0,
    height: 0,
    left: 0,
    top: 0,
  });
  const scrollport = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = scrollport.current;
    if (!element) return;
    const measure = () =>
      setViewport({
        width: element.clientWidth,
        height: Math.max(0, element.clientHeight - ROW_HEIGHT),
        left: element.scrollLeft,
        top: element.scrollTop,
      });
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    measure();
    return () => observer.disconnect();
  }, []);

  const { geometry } = model;
  const initial = calculateGridWindow(geometry, {
    width: viewport.width,
    height: viewport.height,
    scrollLeft: 0,
    scrollTop: 0,
  });
  const physicalHeight = Math.max(
    viewport.height,
    Math.min(CANVAS_CAP, geometry.height),
  );
  const physicalCenterWidth = Math.max(
    initial.regions.center.width,
    Math.min(CANVAS_CAP, geometry.widths.center),
  );
  const physicalWidth =
    initial.regions.left.width +
    physicalCenterWidth +
    initial.regions.right.width;
  const window = calculateGridWindow(geometry, {
    width: viewport.width,
    height: viewport.height,
    scrollLeft: logicalOffset(
      viewport.left,
      physicalCenterWidth - initial.regions.center.width,
      initial.maxScrollLeft,
    ),
    scrollTop: logicalOffset(
      viewport.top,
      physicalHeight - viewport.height,
      initial.maxScrollTop,
    ),
    rowOverscan: 64,
    columnOverscan: 100,
  });
  const source: RowSource<number> = {
    count: model.rowCount,
    getRow: (index) => index,
    getRowId: (row) => `r${row}`,
  };
  const cellCount = getRenderedCellCount(geometry, window);

  function configure(rowCount: number, columnCount: number, pinned: boolean) {
    setModel(createModel(rowCount, columnCount, pinned));
    if (scrollport.current) {
      scrollport.current.scrollTop = 0;
      scrollport.current.scrollLeft = 0;
    }
    setViewport((previous) => ({ ...previous, left: 0, top: 0 }));
  }

  return (
    <main className={styles['demo']}>
      <h1>Grid Core inspection</h1>
      <p>
        Pure geometry with a React renderer. Performance HOLD · production POC
        NO-GO.
      </p>
      <div className={styles['controls']}>
        <label>
          Logical rows{' '}
          <select
            value={model.rowCount}
            onChange={(event) =>
              configure(
                Number(event.target.value),
                model.columnCount,
                model.pinned,
              )
            }
          >
            {[0, 1, 1000, 100_000, 1_000_000].map((value) => (
              <option key={value} value={value}>
                {value.toLocaleString()}
              </option>
            ))}
          </select>
        </label>
        <label>
          Columns{' '}
          <select
            value={model.columnCount}
            onChange={(event) =>
              configure(
                model.rowCount,
                Number(event.target.value),
                model.pinned,
              )
            }
          >
            {[0, 1, 30, 1000].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={model.pinned}
            onChange={(event) =>
              configure(model.rowCount, model.columnCount, event.target.checked)
            }
          />{' '}
          Pin first / last
        </label>
        <button type="button" onClick={() => configure(1_000_000, 1000, true)}>
          Million logical rows
        </button>
      </div>
      <p id="core-scroll-help">
        Focus the scroll area and use native arrow/Page keys. This read-only
        table has no cell navigation or editing.
      </p>
      <div className={styles['stage']} dir="ltr">
        <div
          className={styles['scrollport']}
          ref={scrollport}
          tabIndex={0}
          role="region"
          aria-label="Grid Core scroll area"
          aria-describedby="core-scroll-help"
          data-testid="core-scrollport"
          onScroll={(event) => {
            const element = event.currentTarget;
            setViewport({
              width: element.clientWidth,
              height: Math.max(0, element.clientHeight - ROW_HEIGHT),
              left: element.scrollLeft,
              top: element.scrollTop,
            });
          }}
        >
          <div
            aria-hidden="true"
            style={{
              width: physicalWidth,
              height: physicalHeight + ROW_HEIGHT,
            }}
          />
        </div>
        <CoreTable
          geometry={geometry}
          window={window}
          viewport={viewport}
          source={source}
        />
      </div>
      <div className={styles['debug']} data-testid="core-debug">
        Visible rows [{window.visibleRows.start}, {window.visibleRows.end});
        render rows [{window.rows.start}, {window.rows.end}); center columns [
        {window.visibleCenterColumns.start}, {window.visibleCenterColumns.end});
        render center [{window.centerColumns.start}, {window.centerColumns.end}
        ).
        <br />
        Logical scroll: {window.scrollLeft.toFixed(1)},{' '}
        {window.scrollTop.toFixed(1)}; cells: {cellCount}; logical size:{' '}
        {geometry.width} × {geometry.height}px.
        <br />
        Physical canvas capped at {CANVAS_CAP}px per scrolling axis.
        Proportional mapping loses native pixel precision at large extents.
        Runtime performance and browser behavior unverified.
      </div>
      {model.rowCount === 0 || model.columnCount === 0 ? (
        <p>No cells: select nonzero rows and columns.</p>
      ) : null}
      <a href="?">Open original POC</a>
    </main>
  );
}
