# DataGrid Architecture Specification

**Status:** Draft
**Version:** 0.1
**Date:** 2026-09-21

---

## 1. Purpose

This document defines the initial architecture of the DataGrid.

The architecture is informed by the documented behavior and capabilities of AG Grid, which is the behavioral reference (North Star) for this project.

We reproduce relevant behavior and constraints, but the implementation must remain our own React + TypeScript architecture.

---

# 2. Architectural Principles

The grid must follow these principles:

1. `grid-core` is framework-independent.
2. `grid-react` owns React and DOM concerns.
3. Data is supplied from outside the grid.
4. The grid must not contain HTTP, database, authentication, or AI-provider logic.
5. No third-party runtime grid or virtualization dependencies.
6. SOLID and KISS are required.
7. Accessibility is part of the architecture, not an afterthought.
8. Specifications are the source of truth.
9. Behavior should follow AG Grid where AG Grid already defines the expected behavior.
10. POCs are used only when documentation and reasoning cannot sufficiently resolve an architectural question.

---

# 3. Package Boundaries

## 3.1 grid-core

`grid-core` contains framework-independent grid logic.

Responsibilities include:

* Grid state
* Row model
* Column model
* Sorting
* Filtering
* Grouping
* Selection
* Navigation model
* Focus model
* Column state
* Row geometry
* Column geometry
* Data-source contracts
* Query model
* Plugin contracts

`grid-core` must not depend on:

* React
* JSX
* DOM APIs
* CSS/SCSS
* `window`
* `document`
* HTTP clients
* AI providers

---

## 3.2 grid-react

`grid-react` is responsible for rendering and browser interaction.

Responsibilities include:

* React components
* DOM rendering
* Headers
* Rows
* Cells
* Virtualization
* Scroll handling
* Pointer events
* Keyboard event translation
* DOM focus
* React slots
* Custom renderers
* ARIA attributes
* Accessibility behavior
* CSS/data attributes

Dependency direction:

```text
grid-core
    ↑
grid-react
```

`grid-core` must never import `grid-react`.

---

# 4. Grid Is Data-Agnostic

The grid does not own the application's data source.

Consumers provide data through a data-source contract.

Conceptually:

```ts
interface GridDataSource<T> {
  getRows(request: GridDataRequest): Promise<GridDataResponse<T>>;
}
```

The grid must be capable of working with:

* local data
* remote/server data
* future worker-backed processing

without knowing how the data is obtained.

---

# 5. Logical Model vs DOM

The logical grid model must be independent from the DOM.

A logical row or column continues to exist even when its DOM representation is not currently rendered.

Therefore:

```text
Logical entity lifetime
        ≠
DOM lifetime
```

Virtualization may mount, unmount, and remount DOM elements without destroying the corresponding logical row or column state.

This distinction is fundamental to the architecture.

---

# 6. Geometry

Geometry is a first-class concept.

The grid must maintain logical geometry independently from rendering.

Conceptual models:

```ts
interface RowGeometry {
  top: number;
  height: number;
}

interface ColumnGeometry {
  left: number;
  width: number;
}
```

Geometry is used to determine which rows and columns should be rendered.

Column width and row height may be dynamic.

---

# 7. Virtualization

The grid will implement its own virtualization.

No third-party runtime virtualization library will be used.

Virtualization operates on both axes:

```text
                    Grid
                     │
          ┌──────────┴──────────┐
          │                     │
    Row Virtualizer       Column Virtualizer
        (Y axis)              (X axis)
          │                     │
          └──────────┬──────────┘
                     ↓
              Visible cells
```

The virtualization system produces a logical render window:

```ts
interface RenderWindow {
  rowStart: number;
  rowEnd: number;
  columnStart: number;
  columnEnd: number;
}
```

The render window is derived from:

* scroll position
* viewport size
* row geometry
* column geometry
* virtualization buffer/overscan policy

---

# 8. Row Virtualization

Only rows required for the current viewport and configured render buffer should be rendered into the DOM.

The implementation must support:

* fixed row heights
* variable row heights

The initial implementation may begin with fixed-height rows where this significantly reduces implementation complexity.

Variable-height virtualization must be designed so that it can be introduced without replacing the entire virtualization architecture.

---

# 9. Column Virtualization

Only columns required for the current horizontal viewport should be rendered.

The architecture must support:

* variable column widths
* column resizing
* future flex sizing
* future auto-sizing
* pinned columns

Column geometry must remain independent from React rendering.

---

# 10. Two-Dimensional Virtualization

Row and column virtualization must operate together.

For a large grid:

```text
Rows:
100,000+

Columns:
1,000+

        ↓

Only the visible 2D region
is rendered.
```

The renderer must not create a DOM element for every logical cell.

The number of rendered cells should primarily depend on viewport dimensions and overscan, not total dataset size.

---

# 11. Pinned Columns

Pinned columns are represented using three physical rendering regions:

```text
Grid
├── pinned-left
├── center
└── pinned-right
```

The regions represent one logical grid.

They must not behave as three independent grids.

The center region scrolls horizontally.

Pinned regions remain visible while the center region scrolls.

All regions must remain synchronized with:

* row virtualization
* row identity
* selection
* focus
* keyboard navigation
* scrolling
* column state
* accessibility state

---

# 12. Row Identity

Rows require stable logical identity.

Conceptually:

```ts
type RowId = string;

interface RowRenderContext<T> {
  rowId: RowId;
  rowIndex: number;
  data: T;
}
```

The logical row identity must not depend on whether the row currently has a DOM representation.

---

# 13. Rendering Pipeline

The rendering architecture follows:

```text
Grid State
    ↓
Row Geometry
    ↓
Column Geometry
    ↓
Scroll Position
    ↓
Render Window
    ↓
Pinned / Center Regions
    ↓
Rows
    ↓
Cells
    ↓
React DOM
```

Rendering must remain separate from data processing and grid state management.

---

# 14. React Rendering

React is responsible for translating the logical render model into DOM.

React component identity must not be treated as equivalent to logical row/cell identity.

Virtualization may cause a component to:

* mount
* update
* unmount
* mount again

without the logical row or column being recreated.

The renderer must therefore avoid putting essential logical grid state exclusively inside transient cell components.

---

# 15. Cell Lifecycle

The grid must have an explicit model for cell rendering lifecycle.

A cell renderer may be:

```text
created
    ↓
updated/refreshed
    ↓
removed
```

The implementation should minimize unnecessary DOM and component work.

Future performance work may introduce deferred rendering for expensive cell renderers.

---

# 16. Focus Architecture

The logical grid owns focus state.

Conceptually:

```ts
interface GridFocusState {
  position: GridPosition;
  area: 'header' | 'body';
}
```

`grid-react` owns the actual DOM focus.

The initial accessibility/navigation strategy is:

**logical focus state + roving DOM focus**

`aria-activedescendant` is not the primary focus mechanism.

Focus must work correctly with virtualization.

If the focused logical cell is outside the current render window:

```text
logical focus
     ↓
scroll into view
     ↓
render required region
     ↓
focus DOM element
```

---

# 17. Keyboard Navigation

Keyboard navigation is a first-class grid capability.

The architecture must support:

* Arrow keys
* Home
* End
* Ctrl/Cmd + Home
* Ctrl/Cmd + End
* Page Up
* Page Down
* Enter
* Escape
* Space
* Tab
* Shift + Tab

Navigation must operate on logical rows and columns rather than DOM position.

Pinned columns must participate in the same logical column navigation model.

---

# 18. Accessibility

Accessibility is tightly coupled to rendering, focus, keyboard navigation, and virtualization.

Therefore accessibility behavior initially lives primarily in `grid-react`.

`grid-core` provides logical navigation/state information.

`grid-react` provides:

* DOM focus
* keyboard handling
* ARIA
* screen-reader-facing structure
* accessible relationships

The goal is one logical grid from the user's perspective even though virtualization and pinned columns may produce multiple physical DOM regions.

---

# 19. Selection

Selection state belongs to the grid model.

Presentation belongs to React.

Consumers must be able to provide custom presentation components while preserving the grid's accessibility and interaction contract.

Example direction:

```tsx
<DataGrid
  selection={{
    enabled: true,
    checkbox: CustomCheckbox,
    headerCheckbox: CustomHeaderCheckbox,
  }}
/>
```

---

# 20. Slots and Custom Components

The grid should expose controlled extension points rather than requiring consumers to replace internal architecture.

Conceptual API:

```tsx
<DataGrid
  slots={{
    checkbox: CustomCheckbox,
    loadingOverlay: CustomLoading,
    emptyState: CustomEmptyState,
    headerCell: CustomHeaderCell,
    row: CustomRow,
  }}
/>
```

Custom components must preserve the required grid behavior and accessibility contract.

---

# 21. Icons

Icons are presentation concerns and should be replaceable.

Conceptual API:

```tsx
<DataGrid
  icons={{
    sortAscending: MySortUpIcon,
    sortDescending: MySortDownIcon,
    filter: MyFilterIcon,
    menu: MyMenuIcon,
    expand: MyExpandIcon,
    collapse: MyCollapseIcon,
  }}
/>
```

The grid owns the semantics and behavior.

Consumers own the visual implementation.

---

# 22. AI Query

AI is not part of the core grid.

AI functionality will be implemented as an extension/plugin.

AI must produce a structured query rather than executable code.

Conceptually:

```ts
interface GridAiQueryProvider {
  parse(
    prompt: string,
    context: GridAiContext
  ): Promise<QueryIntent>;
}
```

Pipeline:

```text
Natural language
      ↓
AI Provider
      ↓
GridQuery
      ↓
Validator
      ↓
Grid State
      ↓
Client engine / Server data source
      ↓
Rows
```

AI receives grid schema/context rather than unrestricted access to application data.

The AI must not invent unknown fields or unsupported operators.

---

# 23. Plugin Architecture

Plugins are extension points rather than a second application architecture.

Conceptual API:

```ts
interface GridPlugin {
  name: string;
  initialize(context: GridPluginContext): void;
  destroy?(): void;
}
```

Example:

```tsx
<DataGrid
  plugins={[
    aiQueryPlugin(),
    excelExportPlugin(),
    clipboardPlugin(),
  ]}
/>
```

Plugin APIs must remain small until a real use case requires additional capabilities.

---

# 24. Performance Principles

Performance must be measured rather than assumed.

The project will optimize based on:

* DOM node count
* rendering cost
* scrolling performance
* memory usage
* React component lifecycle
* geometry calculations
* data processing cost

We will not introduce optimization mechanisms merely because they are theoretically faster.

React memoization (`useMemo`, `useCallback`, etc.) should only be introduced when:

* identity stability is required by a contract
* profiling demonstrates a meaningful benefit
* an external imperative system requires stable identity

---

# 25. Web Workers

Web Workers are not required for the initial implementation.

If profiling demonstrates that data processing becomes a bottleneck, the architecture should allow processing to move between:

```text
Main thread
     OR
Web Worker
```

without changing the public grid API.

Worker usage must be driven by measured performance requirements.

---

# 26. POC Policy

POCs are required only when documentation, existing behavior, or architectural reasoning cannot sufficiently answer a question.

POCs must be:

* small
* disposable
* isolated
* measurable
* focused on one uncertainty

A POC result must become an explicit architecture decision before production implementation.

Potential future POCs include:

1. Massive-row-count virtualization and browser DOM height limits.
2. Variable-height virtualization.
3. React renderer lifecycle and DOM reuse.
4. Expensive cell renderer performance.
5. Worker vs main-thread data processing.

---

# 27. AG Grid as Behavioral Reference

AG Grid is the project's behavioral North Star.

When a question arises:

```text
Question
   ↓
Does AG Grid already define this behavior?
   │
   ├── Yes → investigate documented behavior
   │          ↓
   │       reproduce compatible behavior
   │
   └── No → design our own behavior
```

We match behavior and constraints, not AG Grid's internal implementation.

Our architecture and source code must remain independently designed.

---

# 28. Architecture Evolution

This document is a living specification.

If implementation or testing reveals an architectural flaw:

```text
Problem discovered
       ↓
Investigate
       ↓
Update specification
       ↓
Update ADR if required
       ↓
Update implementation
       ↓
Update tests
```

Code must not silently redefine the architecture.

---

# 29. Current Architecture Summary

```text
                    grid-core
                       │
        ┌──────────────┼──────────────┐
        │              │              │
     Grid State      Geometry      Navigation
        │              │              │
        └──────────────┼──────────────┘
                       ↓
                   grid-react
                       │
                Scroll / DOM
                       │
          ┌────────────┴────────────┐
          │                         │
   Row Virtualization       Column Virtualization
          │                         │
          └────────────┬────────────┘
                       ↓
                 Render Window
                       ↓
          ┌────────────┼────────────┐
          │            │            │
     Pinned Left     Center    Pinned Right
          │            │            │
          └────────────┼────────────┘
                       ↓
                  Cell Renderer
                       ↓
                    React
                       ↓
                      DOM
```

This architecture is the baseline for subsequent feature specifications and implementation work.
