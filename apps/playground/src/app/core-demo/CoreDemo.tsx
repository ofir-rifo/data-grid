import { useEffect, useRef, useState } from 'react';
import {
  calculateGridWindow,
  createGridGeometry,
  getRow,
} from '@org/grid-core';
import type { ColumnDefinition, ColumnRegion, RowSource } from '@org/grid-core';
import styles from './CoreDemo.module.scss';

const ROW_HEIGHT = 32;
const CANVAS_CAP = 1_000_000;
const REGIONS: readonly ColumnRegion[] = ['left', 'center', 'right'];

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
  const rows = Array.from(
    { length: window.rows.end - window.rows.start },
    (_, i) => getRow(source, window.rows.start + i),
  );
  const centerColumns = geometry.regions.center.slice(
    window.centerColumns.start,
    window.centerColumns.end,
  );
  const columns = {
    left: geometry.regions.left,
    center: centerColumns,
    right: geometry.regions.right,
  };
  const cellCount =
    rows.length *
    REGIONS.reduce(
      (sum, region) =>
        sum + (window.regions[region].width > 0 ? columns[region].length : 0),
      0,
    );

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
      <div className={styles['stage']}>
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
        <div
          role="table"
          aria-label="Core virtual table"
          aria-rowcount={model.rowCount + 1}
          aria-colcount={model.columnCount}
          className={styles['table']}
          style={{
            width: viewport.width,
            height: viewport.height + ROW_HEIGHT,
          }}
          data-testid="core-table"
          data-row-start={window.rows.start}
          data-row-end={window.rows.end}
          data-column-start={window.centerColumns.start}
          data-column-end={window.centerColumns.end}
          data-cell-count={cellCount}
        >
          <div
            role="row"
            aria-rowindex={1}
            className={styles['row']}
            style={{ top: 0, height: ROW_HEIGHT }}
          >
            {REGIONS.map((region) => (
              <div
                role="presentation"
                key={region}
                className={styles['region']}
                style={{
                  left: window.regions[region].x,
                  width: window.regions[region].width,
                  height: ROW_HEIGHT,
                }}
              >
                {columns[region].map((column) => (
                  <div
                    role="columnheader"
                    aria-colindex={column.logicalIndex + 1}
                    key={column.id}
                    className={styles['header']}
                    style={{
                      left:
                        column.offset -
                        (region === 'center' ? window.scrollLeft : 0),
                      width: column.width,
                      height: ROW_HEIGHT,
                    }}
                  >
                    {column.header}
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div
            role="rowgroup"
            className={styles['body']}
            style={{ top: ROW_HEIGHT, height: viewport.height }}
          >
            {rows.map(({ row, id }) => (
              <div
                role="row"
                aria-rowindex={row + 2}
                key={id}
                data-row-id={id}
                className={styles['row']}
                style={{
                  top: row * ROW_HEIGHT - window.scrollTop,
                  height: ROW_HEIGHT,
                }}
              >
                {REGIONS.map((region) => (
                  <div
                    role="presentation"
                    key={region}
                    className={styles['region']}
                    style={{
                      left: window.regions[region].x,
                      width: window.regions[region].width,
                      height: ROW_HEIGHT,
                    }}
                  >
                    {window.regions[region].width > 0 &&
                      columns[region].map((column) => (
                        <div
                          role="cell"
                          aria-colindex={column.logicalIndex + 1}
                          key={column.id}
                          data-column-id={column.id}
                          data-region={region}
                          className={styles['cell']}
                          style={{
                            left:
                              column.offset -
                              (region === 'center' ? window.scrollLeft : 0),
                            width: column.width,
                            height: ROW_HEIGHT,
                          }}
                        >
                          {String(column.getValue(row))}
                        </div>
                      ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      <output className={styles['debug']} data-testid="core-debug">
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
      </output>
      {model.rowCount === 0 || model.columnCount === 0 ? (
        <p>No cells: select nonzero rows and columns.</p>
      ) : null}
      <a href="?">Open original POC</a>
    </main>
  );
}
