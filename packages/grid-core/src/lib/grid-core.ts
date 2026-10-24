export interface RowSource<T> {
  readonly count: number;
  readonly getRow: (index: number) => T;
  readonly getRowId: (row: T) => string;
}

export type ColumnRegion = 'left' | 'center' | 'right';

export interface ColumnDefinition<T> {
  readonly id: string;
  readonly header: string;
  readonly width: number;
  readonly pinned?: 'left' | 'right';
  readonly getValue: (row: T) => unknown;
}

export interface ColumnLayout<T> {
  readonly id: string;
  readonly header: string;
  readonly width: number;
  readonly offset: number;
  /** Original caller-supplied array position; not an ARIA column index. */
  readonly logicalIndex: number;
  /** Position in the complete left/center/right sequence, independent of identity. */
  readonly visualIndex: number;
  readonly region: ColumnRegion;
  readonly getValue: (row: T) => unknown;
}

export interface GridGeometry<T> {
  readonly rowCount: number;
  readonly rowHeight: number;
  readonly height: number;
  readonly width: number;
  readonly regions: Readonly<Record<ColumnRegion, readonly ColumnLayout<T>[]>>;
  readonly widths: Readonly<Record<ColumnRegion, number>>;
}

export interface IndexRange {
  readonly start: number;
  readonly end: number;
}

export interface ViewportInput {
  readonly width: number;
  readonly height: number;
  readonly scrollLeft: number;
  readonly scrollTop: number;
  readonly rowOverscan?: number;
  readonly columnOverscan?: number;
}

export interface RegionViewport {
  readonly x: number;
  readonly width: number;
}

export interface GridWindow {
  readonly scrollLeft: number;
  readonly scrollTop: number;
  readonly maxScrollLeft: number;
  readonly maxScrollTop: number;
  readonly rows: IndexRange;
  readonly visibleRows: IndexRange;
  readonly centerColumns: IndexRange;
  readonly visibleCenterColumns: IndexRange;
  readonly regions: Readonly<Record<ColumnRegion, RegionViewport>>;
}

function finite(value: number, name: string): void {
  if (!Number.isFinite(value)) throw new RangeError(`${name} must be finite`);
}

function nonnegative(value: number, name: string): void {
  finite(value, name);
  if (value < 0) throw new RangeError(`${name} must be nonnegative`);
}

function count(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${name} must be a nonnegative safe integer`);
  }
}

function extent(value: number, name: string): number {
  nonnegative(value, name);
  if (value > Number.MAX_SAFE_INTEGER)
    throw new RangeError(`${name} exceeds safe extent`);
  return value;
}

function positive(value: number, name: string): void {
  finite(value, name);
  if (value <= 0) throw new RangeError(`${name} must be positive`);
}

function key(value: string, name: string): void {
  if (typeof value !== 'string' || value.length === 0) {
    throw new RangeError(`${name} must be a nonempty string`);
  }
}

/** O(columns) setup; no row access. Rebuild when geometry inputs change. */
export function createGridGeometry<T>(config: {
  readonly rowCount: number;
  readonly rowHeight: number;
  readonly columns: readonly ColumnDefinition<T>[];
}): GridGeometry<T> {
  count(config.rowCount, 'rowCount');
  positive(config.rowHeight, 'rowHeight');
  const height = extent(config.rowCount * config.rowHeight, 'height');
  if (config.rowCount > 1 && config.rowHeight < height * Number.EPSILON) {
    throw new RangeError(
      'rowHeight below representable resolution at content extent',
    );
  }
  const regions: Record<ColumnRegion, Omit<ColumnLayout<T>, 'visualIndex'>[]> =
    {
      left: [],
      center: [],
      right: [],
    };
  const widths = { left: 0, center: 0, right: 0 };
  const ids = new Set<string>();
  for (
    let logicalIndex = 0;
    logicalIndex < config.columns.length;
    logicalIndex++
  ) {
    const column = config.columns[logicalIndex];
    if (column === undefined) {
      throw new RangeError(
        `columns[${logicalIndex}] must contain a definition`,
      );
    }
    key(column.id, 'column.id');
    if (ids.has(column.id))
      throw new RangeError(`duplicate column.id: ${column.id}`);
    ids.add(column.id);
    positive(column.width, 'column.width');
    if (
      column.pinned !== undefined &&
      column.pinned !== 'left' &&
      column.pinned !== 'right'
    ) {
      throw new RangeError('column.pinned must be left, right or undefined');
    }
    const region = column.pinned ?? 'center';
    const offset = widths[region];
    const end = extent(offset + column.width, 'region.width');
    if (end <= offset)
      throw new RangeError('column.width must advance region extent');
    regions[region].push({
      id: column.id,
      header: column.header,
      width: column.width,
      offset,
      logicalIndex,
      region,
      getValue: column.getValue,
    });
    widths[region] = end;
  }
  const width = extent(widths.left + widths.center + widths.right, 'width');
  let visualIndex = 0;
  function finalize(region: ColumnRegion): readonly ColumnLayout<T>[] {
    return Object.freeze(
      regions[region].map((column) =>
        Object.freeze({ ...column, visualIndex: visualIndex++ }),
      ),
    );
  }
  return Object.freeze({
    rowCount: config.rowCount,
    rowHeight: config.rowHeight,
    height,
    width,
    widths: Object.freeze(widths),
    regions: Object.freeze({
      left: finalize('left'),
      center: finalize('center'),
      right: finalize('right'),
    }),
  });
}

function clamp(value: number, max: number): number {
  return Math.min(Math.max(0, value), max);
}

function rowRange(
  rowCount: number,
  height: number,
  start: number,
  end: number,
): IndexRange {
  if (start >= end || rowCount === 0) return { start: 0, end: 0 };
  let first = Math.min(rowCount, Math.floor(start / height));
  let exclusive = Math.min(rowCount, Math.ceil(end / height));
  // Correct division rounding against the authoritative index*height boundaries.
  if (first > 0 && first * height > start) first--;
  else if (first < rowCount && (first + 1) * height <= start) first++;
  if (exclusive > 0 && (exclusive - 1) * height >= end) exclusive--;
  else if (exclusive < rowCount && exclusive * height < end) exclusive++;
  return { start: first, end: exclusive };
}

/** First intersecting column and first column whose start is outside [start,end). */
function columnRange<T>(
  columns: readonly ColumnLayout<T>[],
  start: number,
  end: number,
): IndexRange {
  if (start >= end || columns.length === 0) return { start: 0, end: 0 };
  let low = 0;
  let high = columns.length;
  while (low < high) {
    const mid = low + Math.floor((high - low) / 2);
    const column = columns[mid];
    if (column.offset + column.width <= start) low = mid + 1;
    else high = mid;
  }
  const first = low;
  high = columns.length;
  while (low < high) {
    const mid = low + Math.floor((high - low) / 2);
    if (columns[mid].offset < end) low = mid + 1;
    else high = mid;
  }
  return { start: first, end: low };
}

/** O(log centerColumns), O(1) result records, independent of logical row count. */
export function calculateGridWindow<T>(
  geometry: GridGeometry<T>,
  input: ViewportInput,
): GridWindow {
  nonnegative(input.width, 'viewport.width');
  nonnegative(input.height, 'viewport.height');
  finite(input.scrollLeft, 'scrollLeft');
  finite(input.scrollTop, 'scrollTop');
  const rowOverscan = input.rowOverscan ?? 0;
  const columnOverscan = input.columnOverscan ?? 0;
  nonnegative(rowOverscan, 'rowOverscan');
  nonnegative(columnOverscan, 'columnOverscan');
  const leftWidth = Math.min(input.width, geometry.widths.left);
  const rightWidth = Math.min(input.width - leftWidth, geometry.widths.right);
  const centerWidth = input.width - leftWidth - rightWidth;
  const maxScrollLeft = Math.max(0, geometry.widths.center - centerWidth);
  const maxScrollTop = Math.max(0, geometry.height - input.height);
  const scrollLeft = clamp(input.scrollLeft, maxScrollLeft);
  const scrollTop = clamp(input.scrollTop, maxScrollTop);
  const rowEnd = Math.min(geometry.height, scrollTop + input.height);
  const columnEnd = Math.min(geometry.widths.center, scrollLeft + centerWidth);
  return {
    scrollLeft,
    scrollTop,
    maxScrollLeft,
    maxScrollTop,
    regions: {
      left: { x: 0, width: leftWidth },
      center: { x: leftWidth, width: centerWidth },
      right: { x: input.width - rightWidth, width: rightWidth },
    },
    visibleRows: rowRange(
      geometry.rowCount,
      geometry.rowHeight,
      scrollTop,
      rowEnd,
    ),
    rows: rowRange(
      geometry.rowCount,
      geometry.rowHeight,
      input.height === 0 ? 0 : Math.max(0, scrollTop - rowOverscan),
      input.height === 0 ? 0 : Math.min(geometry.height, rowEnd + rowOverscan),
    ),
    visibleCenterColumns: columnRange(
      geometry.regions.center,
      scrollLeft,
      columnEnd,
    ),
    centerColumns: columnRange(
      geometry.regions.center,
      centerWidth === 0 ? 0 : Math.max(0, scrollLeft - columnOverscan),
      centerWidth === 0
        ? 0
        : Math.min(geometry.widths.center, columnEnd + columnOverscan),
    ),
  };
}

function rowIndex(index: number, rowCount: number): void {
  if (!Number.isSafeInteger(index) || index < 0 || index >= rowCount) {
    throw new RangeError('row index outside source');
  }
}

export function getRowOffset<T>(
  geometry: GridGeometry<T>,
  index: number,
): number {
  rowIndex(index, geometry.rowCount);
  return index * geometry.rowHeight;
}

/** Only reads the requested row. Global key uniqueness is the consumer's contract. */
export function getRow<T>(
  source: RowSource<T>,
  index: number,
): { readonly row: T; readonly id: string } {
  count(source.count, 'source.count');
  rowIndex(index, source.count);
  const row = source.getRow(index);
  const id = source.getRowId(row);
  key(id, 'row.id');
  return { row, id };
}
