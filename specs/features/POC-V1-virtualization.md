# POC-V1 — 2D Virtualization

**Status:** Proposed
**Purpose:** Validate the fundamental 2D virtualization architecture before implementing the production grid.

---

## 1. Goal

Determine whether our React implementation can efficiently render a very large logical grid while keeping the actual DOM limited to the visible region.

The POC validates:

* vertical virtualization
* horizontal virtualization
* 2D render-window calculation
* row overscan
* column virtualization
* pinned-left region
* pinned-right region
* fast scrolling
* DOM node stability
* render performance

The POC is not production grid code.

---

# 2. Dataset

The POC uses:

```text
Rows:    100,000
Columns: 1,000
```

Total logical cells:

```text
100,000 × 1,000 = 100,000,000
```

The grid must never attempt to render all logical cells.

---

# 3. Initial Geometry

The first POC intentionally uses fixed geometry.

### Rows

```text
rowHeight = 40px
```

### Columns

```text
columnWidth = 120px
```

Variable row heights and variable column widths are explicitly outside the scope of this POC.

---

# 4. Viewport

The POC uses a fixed test viewport.

Example:

```text
width: 1000px
height: 600px
```

The exact dimensions may be changed for testing, but must remain deterministic within a test.

---

# 5. Render Window

The virtualization engine receives:

```ts
interface Viewport {
  width: number;
  height: number;
}

interface ScrollPosition {
  top: number;
  left: number;
}
```

It produces:

```ts
interface RenderWindow {
  rowStart: number;
  rowEnd: number;
  columnStart: number;
  columnEnd: number;
}
```

---

# 6. Row Virtualization

The row virtualizer must calculate the visible row range from:

```text
scrollTop
+
viewport height
+
row height
```

The POC uses row overscan.

Initial target:

```text
10 rows before viewport
10 rows after viewport
```

This follows the documented AG Grid default behavior.

The overscan implementation must be configurable rather than hard-coded into the rendering layer.

---

# 7. Column Virtualization

The column virtualizer must calculate the visible column range from:

```text
scrollLeft
+
viewport width
+
column width
```

No additional column overscan is required for the initial POC.

This follows the documented AG Grid behavior.

---

# 8. Pinned Columns

The POC must support:

```text
┌────────┬──────────────────────────────┬────────┐
│ Pinned │          Center              │ Pinned │
│ Left   │       horizontally scrolls   │ Right  │
└────────┴──────────────────────────────┴────────┘
```

Example:

```text
Pinned left:  2 columns
Pinned right: 2 columns
Center:       remaining columns
```

All three regions must use the same logical row range.

---

# 9. Logical Identity

Rows and columns have stable logical identities.

Example:

```ts
type RowId = string;
type ColumnId = string;
```

The POC must not use DOM position as logical identity.

---

# 10. Rendering

The POC renderer must render only cells inside the calculated render window.

For example, if the viewport displays approximately:

```text
15 rows × 8 columns
```

the DOM should contain approximately that visible area plus the configured row overscan.

It must not approach:

```text
100,000 × 1,000
```

DOM cells.

---

# 11. Scrolling

The POC must support:

### Vertical

```text
top
↓
middle
↓
bottom
```

### Horizontal

```text
left
→
middle
→
right
```

### Combined

Both scroll axes must work simultaneously.

---

# 12. Fast Scrolling

The POC must test large scroll jumps.

Examples:

```text
row 0
  ↓
row 10,000
  ↓
row 50,000
  ↓
row 99,900
```

and:

```text
column 0
  →
column 100
  →
column 500
  →
column 990
```

The render window must always correspond to the current scroll position.

---

# 13. Correctness Requirements

At every tested scroll position:

1. All visible rows are rendered.
2. All visible center columns are rendered.
3. Pinned columns remain rendered.
4. No visible cell is missing.
5. No cell outside the calculated render window is rendered.
6. Row indices remain correct.
7. Column indices remain correct.
8. Pinned regions display the same logical rows as the center.
9. Horizontal scrolling does not move pinned columns.
10. Vertical scrolling keeps all three regions synchronized.

---

# 14. Performance Measurements

The POC must record:

### DOM

* total rendered cell count
* rendered row count
* rendered column count

### Rendering

* initial render time
* render-window update time
* React render count where measurable

### Scrolling

* response during normal scrolling
* response during fast scrolling
* large scroll-jump latency

### Memory

* approximate memory behavior
* whether DOM size remains bounded

---

# 15. Success Criteria

The POC succeeds if:

### Correctness

The rendered cells always correspond to the calculated logical render window.

### DOM scalability

DOM size is approximately proportional to:

```text
viewport size
+
overscan
```

and does not grow with total row/column count.

### 2D scalability

Increasing:

```text
100,000 rows
→
1,000,000 rows
```

does not cause a proportional increase in DOM nodes.

Increasing:

```text
1,000 columns
→
10,000 columns
```

does not cause a proportional increase in DOM nodes.

### Scroll behavior

Large scroll jumps correctly update the rendered region without stale rows or columns.

### Pinned behavior

Pinned regions remain synchronized with the center region.

---

# 16. Explicit Non-Goals

The POC does NOT implement:

* sorting
* filtering
* grouping
* selection
* editing
* keyboard navigation
* accessibility
* variable row heights
* variable column widths
* auto-sizing
* column resizing
* server-side data
* AI
* plugins
* Web Workers
* massive-row stretching

These features belong to later specifications.

---

# 17. Massive Row Count

The POC intentionally does not solve browser maximum DOM height limitations.

AG Grid uses a technique called "Stretching" for datasets whose logical height exceeds the browser's maximum usable element height.

This will be investigated separately.

---

# 18. POC Architecture

The POC should follow the production architectural direction:

```text
              Viewport
                 │
                 ↓
          Scroll Position
                 │
        ┌────────┴────────┐
        ↓                 ↓
 Row Virtualizer    Column Virtualizer
        │                 │
        └────────┬────────┘
                 ↓
           Render Window
                 │
        ┌────────┼────────┐
        ↓        ↓        ↓
     Pinned    Center   Pinned
      Left                Right
        │        │        │
        └────────┼────────┘
                 ↓
              Cells
```

---

# 19. POC Exit Criteria

After implementation, we must answer:

1. Is the render-window model correct?
2. Is fixed-size geometry fast enough?
3. Is the DOM count bounded as expected?
4. Does 2D virtualization remain responsive during fast scrolling?
5. Does the pinned architecture remain synchronized?
6. Does the React component structure introduce unexpected rendering costs?
7. What architectural changes are required before production implementation?

The POC must result in one of:

```text
VALIDATED
```

or:

```text
ARCHITECTURE CHANGE REQUIRED
```

The result must be documented before production virtualization implementation begins.

---

# 20. Fixed-Cell Content Containment — POC Correction

Authorized POC correction, 2026-10-17: cell content must not extend the native scrollable area beyond the fixed logical canvas. All left, center, and right cell boxes use `overflow: clip`. Row/column dimensions, buffers, borders, padding, wrapping, logical identity, and default-off flushSync remain unchanged.

This resolves measured final-row text overflow that increased scrollHeight from 4,000,000 to 4,000,004. It clips visually overflowing text rather than resizing rows, forcing nowrap, adding ellipsis, or changing the virtualizer. Full text remains in the DOM; no `aria-hidden` or focusability changes are introduced. Text Range bounds/internal cell scrollHeight may still exceed the cell box; containment concerns propagation to the grid scroll extent and clipped paint, not removal of text layout.

Trade-off: content beyond the fixed cell box is no longer visible. The POC has no interactive cell controls or cell focus ring; a production renderer must separately specify accessible full-value presentation and unclipped focus indicators. This POC correction does not adopt the proposed production single-line default or claim screen-reader verification.

Regression evidence must cover default and enabled modes, unchanged logical scroll extents before/after final-row mounting, cell dimensions/styles/text preservation, and existing scrolling/pinned-alignment behavior. See the dated containment milestone in `docs/PROJECT-STATUS.md` for actual commands/results. Passing those checks does not satisfy the remaining memory/performance/scalability and native-paint exit requirements.
