import { getRow } from '@org/grid-core';
import type {
  ColumnRegion,
  GridGeometry,
  GridWindow,
  RowSource,
} from '@org/grid-core';
import styles from './CoreDemo.module.scss';
import { getPinnedBoundary, getPinnedShadows } from './pinned-boundaries';

const REGIONS: readonly ColumnRegion[] = ['left', 'center', 'right'];

export function getRenderedCellCount<T>(
  geometry: GridGeometry<T>,
  window: GridWindow,
): number {
  const columns =
    (window.regions.left.width > 0 ? geometry.regions.left.length : 0) +
    (window.regions.center.width > 0
      ? window.centerColumns.end - window.centerColumns.start
      : 0) +
    (window.regions.right.width > 0 ? geometry.regions.right.length : 0);
  return (window.rows.end - window.rows.start) * columns;
}

/** Read-only inspection renderer; DOM tests do not establish browser/AT behavior. */
export default function CoreTable<T>({
  geometry,
  window,
  viewport,
  source,
}: {
  readonly geometry: GridGeometry<T>;
  readonly window: GridWindow;
  readonly viewport: { readonly width: number; readonly height: number };
  readonly source: RowSource<T>;
}) {
  const columnCount =
    geometry.regions.left.length +
    geometry.regions.center.length +
    geometry.regions.right.length;
  if (columnCount === 0 || viewport.width === 0) return null;
  const columns = {
    left: geometry.regions.left,
    center: geometry.regions.center.slice(
      window.centerColumns.start,
      window.centerColumns.end,
    ),
    right: geometry.regions.right,
  };
  const rows = Array.from(
    { length: window.rows.end - window.rows.start },
    (_, offset) => {
      const index = window.rows.start + offset;
      return { ...getRow(source, index), index };
    },
  );
  function regionClassName(region: ColumnRegion): string {
    const boundary = getPinnedBoundary(region, window);
    return [
      styles['region'],
      region !== 'center' ? styles['pinnedRegion'] : '',
      boundary === 'start'
        ? styles['rightBoundary']
        : boundary === 'end'
          ? styles['leftBoundary']
          : '',
    ]
      .filter(Boolean)
      .join(' ');
  }
  return (
    <div
      dir="ltr"
      role="table"
      aria-label="Core virtual table"
      aria-rowcount={geometry.rowCount + 1}
      aria-colcount={columnCount}
      className={styles['table']}
      style={{
        width: viewport.width,
        height: viewport.height + geometry.rowHeight,
      }}
      data-testid="core-table"
      data-row-start={window.rows.start}
      data-row-end={window.rows.end}
      data-column-start={window.centerColumns.start}
      data-column-end={window.centerColumns.end}
      data-cell-count={getRenderedCellCount(geometry, window)}
    >
      <div
        role="row"
        aria-rowindex={1}
        className={styles['row']}
        style={{ top: 0, height: geometry.rowHeight }}
      >
        {REGIONS.map((region) => (
          <div
            role="presentation"
            key={region}
            className={regionClassName(region)}
            data-column-region={region}
            data-pinned-shadow={
              region === 'center' ? getPinnedShadows(window) : undefined
            }
            style={{
              left: window.regions[region].x,
              width: window.regions[region].width,
              height: geometry.rowHeight,
            }}
          >
            {window.regions[region].width > 0 &&
              columns[region].map((column) => (
                <div
                  role="columnheader"
                  aria-colindex={column.visualIndex + 1}
                  key={column.id}
                  data-column-id={column.id}
                  data-region={region}
                  className={styles['header']}
                  style={{
                    left:
                      column.offset -
                      (region === 'center' ? window.scrollLeft : 0),
                    width: column.width,
                    height: geometry.rowHeight,
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
        style={{ top: geometry.rowHeight, height: viewport.height }}
      >
        {rows.map(({ row, id, index }) => (
          <div
            role="row"
            aria-rowindex={index + 2}
            key={id}
            data-row-id={id}
            className={styles['row']}
            style={{
              top: index * geometry.rowHeight - window.scrollTop,
              height: geometry.rowHeight,
            }}
          >
            {REGIONS.map((region) => (
              <div
                role="presentation"
                key={region}
                className={regionClassName(region)}
                data-column-region={region}
                data-pinned-shadow={
                  region === 'center' ? getPinnedShadows(window) : undefined
                }
                style={{
                  left: window.regions[region].x,
                  width: window.regions[region].width,
                  height: geometry.rowHeight,
                }}
              >
                {window.regions[region].width > 0 &&
                  columns[region].map((column) => (
                    <div
                      role="cell"
                      aria-colindex={column.visualIndex + 1}
                      key={column.id}
                      data-column-id={column.id}
                      data-region={region}
                      className={styles['cell']}
                      style={{
                        left:
                          column.offset -
                          (region === 'center' ? window.scrollLeft : 0),
                        width: column.width,
                        height: geometry.rowHeight,
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
  );
}
