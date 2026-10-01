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

The initial implementation may begin