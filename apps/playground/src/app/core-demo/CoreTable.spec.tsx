/// <reference lib="dom" />
import { cleanup, render, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { calculateGridWindow, createGridGeometry } from '@org/grid-core';
import type { ColumnDefinition, RowSource } from '@org/grid-core';
import CoreTable from './CoreTable';

afterEach(cleanup);

const source: RowSource<string> = {
  count: 5,
  getRow: (index) => `record-${index}`,
  getRowId: (row) => row,
};
const columns: readonly ColumnDefinition<string>[] = Array.from(
  { length: 6 },
  (_, index) => ({
    id: `c${index}`,
    header: `Column ${index}`,
    width: 30,
    pinned: index === 0 ? 'right' : index === 2 ? 'left' : undefined,
    getValue: (row) => `${row}/c${index}`,
  }),
);
const geometry = createGridGeometry({
  rowCount: source.count,
  rowHeight: 10,
  columns,
});

describe('CoreTable semantics (jsdom only, no browser layout or AT claim)', () => {
  it('uses increasing full visual positions for interleaved pins in every row', () => {
    const viewport = { width: 180, height: 20 };
    const window = calculateGridWindow(geometry, {
      ...viewport,
      scrollTop: 0,
      scrollLeft: 0,
    });
    const view = render(
      <CoreTable
        geometry={geometry}
        window={window}
        viewport={viewport}
        source={source}
      />,
    );
    const table = view.getByRole('table');
    expect(table.getAttribute('aria-colcount')).toBe('6');
    expect(table.getAttribute('aria-rowcount')).toBe('6');
    const rows = within(table).getAllByRole('row');
    expect(rows.map((row) => row.getAttribute('aria-rowindex'))).toEqual([
      '1',
      '2',
      '3',
    ]);
    for (const row of rows) {
      const cells = row.querySelectorAll<HTMLElement>('[aria-colindex]');
      expect(Array.from(cells, (cell) => cell.dataset.columnId)).toEqual([
        'c2',
        'c1',
        'c3',
        'c4',
        'c5',
        'c0',
      ]);
      expect(
        Array.from(cells, (cell) => Number(cell.getAttribute('aria-colindex'))),
      ).toEqual([1, 2, 3, 4, 5, 6]);
    }
    expect(rows[1].getAttribute('data-row-id')).toBe('record-0');
    expect(within(rows[1]).getAllByRole('cell')[0].textContent).toBe(
      'record-0/c2',
    );
  });

  it('keeps full-table index gaps while horizontally virtualizing and repinning', () => {
    const viewport = { width: 90, height: 10 };
    const window = calculateGridWindow(geometry, {
      ...viewport,
      scrollTop: 20,
      scrollLeft: 60,
    });
    const view = render(
      <CoreTable
        geometry={geometry}
        window={window}
        viewport={viewport}
        source={source}
      />,
    );
    for (const row of view.getAllByRole('row')) {
      expect(
        Array.from(row.querySelectorAll('[aria-colindex]'), (cell) =>
          cell.getAttribute('aria-colindex'),
        ),
      ).toEqual(['1', '4', '6']);
      expect(
        Array.from(
          row.querySelectorAll<HTMLElement>('[aria-colindex]'),
          (cell) => cell.dataset.columnId,
        ),
      ).toEqual(['c2', 'c4', 'c0']);
    }
    expect(view.getAllByRole('row')[1].getAttribute('aria-rowindex')).toBe('4');
    expect(view.getAllByRole('row')[1].getAttribute('data-row-id')).toBe(
      'record-2',
    );
    const repinned = createGridGeometry({
      rowCount: source.count,
      rowHeight: 10,
      columns: columns.map((column) => ({ ...column, pinned: undefined })),
    });
    const next = calculateGridWindow(repinned, {
      ...viewport,
      scrollTop: 20,
      scrollLeft: 0,
    });
    view.rerender(
      <CoreTable
        geometry={repinned}
        window={next}
        viewport={viewport}
        source={source}
      />,
    );
    const row = view.getAllByRole('row')[1];
    expect(row.getAttribute('data-row-id')).toBe('record-2');
    expect(
      Array.from(within(row).getAllByRole('cell'), (cell) =>
        cell.getAttribute('aria-colindex'),
      ),
    ).toEqual(['1', '2', '3']);
    expect(
      within(row).getAllByRole('cell')[0].getAttribute('data-column-id'),
    ).toBe('c0');
    expect(within(row).getAllByRole('cell')[0].textContent).toBe('record-2/c0');
  });

  it('omits zero-width pinned headers and cells consistently', () => {
    const viewport = { width: 20, height: 10 };
    const window = calculateGridWindow(geometry, {
      ...viewport,
      scrollTop: 0,
      scrollLeft: 0,
      columnOverscan: 100,
    });
    const view = render(
      <CoreTable
        geometry={geometry}
        window={window}
        viewport={viewport}
        source={source}
      />,
    );
    expect(
      view
        .getAllByRole('columnheader')
        .map((cell) => cell.getAttribute('data-column-id')),
    ).toEqual(['c2']);
    expect(
      view
        .getAllByRole('cell')
        .map((cell) => cell.getAttribute('data-column-id')),
    ).toEqual(['c2']);
    expect(view.getByTestId('core-table').getAttribute('data-cell-count')).toBe(
      '1',
    );
  });

  it('does not expose empty rows for no columns or unmeasured width; height zero keeps only headers', () => {
    const viewport = { width: 0, height: 20 };
    const window = calculateGridWindow(geometry, {
      ...viewport,
      scrollTop: 0,
      scrollLeft: 0,
    });
    const view = render(
      <CoreTable
        geometry={geometry}
        window={window}
        viewport={viewport}
        source={source}
      />,
    );
    expect(view.queryByRole('table')).toBeNull();
    const empty = createGridGeometry<string>({
      rowCount: source.count,
      rowHeight: 10,
      columns: [],
    });
    const widthOnly = { width: 180, height: 0 };
    view.rerender(
      <CoreTable
        geometry={empty}
        window={calculateGridWindow(empty, {
          ...widthOnly,
          scrollTop: 0,
          scrollLeft: 0,
        })}
        viewport={widthOnly}
        source={source}
      />,
    );
    expect(view.queryByRole('row')).toBeNull();
    view.rerender(
      <CoreTable
        geometry={geometry}
        window={calculateGridWindow(geometry, {
          ...widthOnly,
          scrollTop: 0,
          scrollLeft: 0,
          rowOverscan: 100,
        })}
        viewport={widthOnly}
        source={source}
      />,
    );
    expect(view.getAllByRole('row')).toHaveLength(1);
    expect(view.getAllByRole('columnheader')).toHaveLength(6);
    expect(view.queryByRole('cell')).toBeNull();
  });
});
