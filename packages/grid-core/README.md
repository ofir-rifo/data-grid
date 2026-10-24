# @org/grid-core

Private Nx source library. No browser, React, network or runtime dependencies.
See [the contract](../../specs/features/GRID-CORE-V1.md) and
[review/verification](../../docs/GRID-CORE-REVIEW.md).

```ts
import { createGridGeometry, calculateGridWindow, getRow } from '@org/grid-core';
import type { RowSource } from '@org/grid-core';

interface Order { id: string; amount: number }
const orders: readonly Order[] = [{ id: 'order-42', amount: 100 }];
const source: RowSource<Order> = {
  count: orders.length,
  getRow: (index) => orders[index],
  getRowId: (order) => order.id,
};
const geometry = createGridGeometry<Order>({
  rowCount: source.count,
  rowHeight: 32,
  columns: [{
    id: 'amount', header: 'Amount', width: 120,
    getValue: (order) => order.amount,
  }],
});
const window = calculateGridWindow(geometry, {
  width: 600, height: 300, scrollLeft: 0, scrollTop: 0,
  rowOverscan: 64, columnOverscan: 100,
});
for (let index = window.rows.start; index < window.rows.end; index++) {
  const { row, id } = getRow(source, index);
  // Adapter uses id for identity and formats row.amount outside Core.
}
```

Consumers maintain matching source/geometry counts and unique stable row keys.
Rebuild geometry after count/height/column changes; row value updates alone do
not require a rebuild. Accessors and row callback exceptions propagate.
Metadata is immutable; consumer rows are not copied or frozen.
Ranges are half-open; scroll offsets are logical center/row coordinates.
Region offsets are local. A renderer applies center scrolling only to center
columns and applies the shared row scroll to all regions. Pinned overflow uses
left-first clipping. Keyboard/focus/ARIA and browser measurement belong to adapters.

The inspection demo is at `/?demo=core`; launch instructions require separate
server/browser authorization under the current machine restrictions.
