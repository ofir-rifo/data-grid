# DataGrid Architecture Specification

PR #5 foundation addendum (2026-10-24): pure row/column geometry, pinned-region
layout and logical render-window computation belong to `grid-core`.
`grid-react` owns application of windows, browser scrolling, measurement,
scheduling and DOM rendering. See [Grid Core V1](features/GRID-CORE-V1.md) and
the [architecture decision](../docs/GRID-CORE-ARCHITECTURE.md). The isolated
inspection demo is not production `grid-react`. POC validation remains pending;
Performance HOLD and production POC NO-GO remain.

**Status:** Draft  
**Version:** 0.3
**Date:** 2026-10-18

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

- Grid state
- Row model
- Column model
- Sorting
- Filtering
- Grouping
- Selection
- Navigation model
- Focus model
- Column state
- Row geometry
- Column geometry
- Data-source contracts
- Query model
- Plugin contracts

`grid-core` must not depend on:

- React
- JSX
- DOM APIs
- CSS/SCSS
- `window`
- `document`
- HTTP clients
- AI providers

---

## 3.2 grid-react

`grid-react` is responsible for rendering and browser interaction.

Responsibilities include:

- React components
- DOM rendering
- Headers
- Rows
- Cells
- Virtualization
- Scroll handling
- Pointer events
- Keyboard event translation
- DOM focus
- React slots
- Custom renderers
- ARIA attributes
- Accessibility behavior
- CSS/data attributes

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

- local data
- remote/server data
- future worker-backed processing

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

- scroll position
- viewport size
- row geometry
- column geometry
- virtualization buffer/overscan policy

---

# 8. Row Virtualization

Only rows required for the current viewport and configured render buffer should be rendered into the DOM.

The implementation must support:

- fixed row heights
- variable row heights

The initial POC uses fixed row heights only. Variable row heights remain a production requirement; no variable-geometry implementation or API is defined by this draft. See [POC-V1](features/POC-V1-virtualization.md) for the fixed-geometry scope and explicit non-goals.

---

# 9. Existing POC Implementation

This section describes inspected source as of 2026-10-17, not a completed production architecture or newly verified runtime behavior.

The POC lives in `apps/playground/src/app/virtualization/VirtualGrid.tsx`. Its pure geometry, column-region, and render-window functions live in `virtualization/engine/`. They are currently playground modules; this document does not claim that production `grid-core` and `grid-react` packages have been extracted.

The data flow is:

```text
Native scrollport → scroll position + viewport state
                 → fixed geometry + buffer → logical render window
                 → React rows with pinned-left / center / pinned-right cells
```

- Dataset: 100,000 logical rows and 1,000 columns; fixed 40px row height and 120px column width.
- Initial viewport: 1,000px × 600px; scroll updates use the scrollport's actual client dimensions.
- Two columns per side are pinned. The other 996 form the center's logical column geometry.
- The center viewport width subtracts both pinned widths and is clamped to zero.
- Render ranges use inclusive starts and exclusive ends. Row and center-column ranges derive from scroll offsets, client dimensions, geometry, and pixel buffers.
- Row buffer defaults to 400px; center-column buffer defaults to 0px. Existing query parameters select predefined experimental alternatives.
- One native scrollport handles both axes. Virtual rows are absolutely positioned; pinned cells use CSS sticky positioning, and center cells are absolutely positioned within their row's center region.
- Pinned and center cells share one logical row range. Stable row/column identifiers determine keys and diagnostic identities; DOM position is not logical identity.
- POC cells now use `overflow: clip` in all three regions to contain wrapped-text overflow within fixed boxes. Wrapping and DOM text are retained; production content/focus presentation remains a separate proposed contract.

Pure calculation is separate from React and DOM concerns. Scroll scheduling and diagnostic layout effects belong to the React/browser layer. Production extraction must preserve the dependency direction in section 3 and requires its own approved implementation scope.

---

# 10. Scroll Scheduling and flushSync Experiment

The scroll handler increments an event identifier, records handler time, and updates both scroll position and viewport dimensions through one callback. Event identity/time travel with state so committed metrics can be attributed to that state.

The default uses normal React state updates. A guarded lazy state initializer reads the query parameter once per mount; only `flushSync=1` enables synchronous flushing. `flushSync=0` and an absent parameter leave it off. Reload after changing the parameter. The canvas exposes `data-flush-sync-enabled`.

When enabled, `flushSync` from `react-dom` wraps the callback containing `setScrollPosition` and `setViewport`. It changes scheduling of the existing updates, not geometry, buffers, logical identity, or the default configuration.

Decision: retain this as an opt-in POC experiment. The user manually reported correct scrolling when enabled and recurrence of the issue when disabled on 2026-10-17. This does not establish production performance, cross-browser behavior, or absence of transient painted blank frames.

Trade-off: synchronous updates may reduce state-to-DOM delay but occupy the main thread immediately. Cost under other workloads remains unmeasured. Default-on behavior, an alternative scheduler, and additional rendering optimizations require evidence and an explicit decision; none is approved by this draft.

---

# 11. Diagnostics and Evidence Boundaries

The component records handler time, render start, window-calculation duration, and a layout-effect commit timestamp. Canvas data attributes also expose committed offsets, viewport dimensions, render ranges/counts, buffers, and event identity.

`scroll-delay.spec.ts` collects programmatic-write, scroll-event, committed-update, and animation-frame observations. Its optional `GRID_FLUSH_SYNC` selector prepares separate comparison runs; output records the requested mode, inspected canvas flag, requested build mode, callback gaps, final actual DOM counts, and an atomic collection-stop viewport snapshot. A build-mode label does not verify which server/build was used. The version-2 diagnostic preserves earlier report keys but now timestamps programmatic writes before the setter; do not compare that interval directly with historical post-setter timestamps.

`flush-sync.spec.ts` contains regression coverage for absent/1/0 flags, reloads, navigation-mode transitions, small movements and vertical/horizontal/combined jumps, native edge clamping, reversal, final identities/counts, timing consistency, and pinned alignment. The current containment milestone passed its four Chromium/development cases plus two `row-overflow.spec.ts` containment cases, targeted app/e2e typechecks, and targeted lint (six diagnostic warnings). The modified timing diagnostic itself has not been rerun for measurements; see [dated project status](../docs/PROJECT-STATUS.md) for scope and earlier history.

Evidence must remain separated:

| Evidence                         | Current status                                                                                                                              | What it does not prove                                                                                       |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Source inspection                | Existing architecture/flag and prepared tests inspected                                                                                     | Runtime correctness or timing improvements                                                                   |
| Historical automated results     | Investigation document reports 27 unit tests, typecheck, lint with four warnings, and 13 Chromium production tests passing before flushSync | Current revision or flag-mode coverage; Firefox/WebKit correctness                                           |
| Manual observation               | User reports improvement with flag enabled and recurrence when disabled                                                                     | Measured speedup or universal fix                                                                            |
| Current targeted verification    | Six Chromium/development containment/flag cases, targeted app/e2e typecheck, and targeted lint passed                                       | Full suites, production, other browsers, performance/memory/scalability, or native painted-frame correctness |
| Historical uncovered rAF samples | Pre-paint DOM coverage observations                                                                                                         | Actual painted blank-frame counts or compositor latency                                                      |

Observer delivery can coalesce intermediate commits; a layout effect is not a paint timestamp. Memory, tracing, and native-scroll procedures are prepared in [the measurement plan](../docs/PERFORMANCE-MEASUREMENT.md), not executed. No continuous memory sampler or additional application instrumentation is introduced.

---

# 12. Remaining POC Validation and Exit Decision

PR #3's [validation review](../docs/POC-VALIDATION.md) maps each requirement to
evidence and gaps. Its only engine correction is a zero-count end-index guard;
the nonempty algorithm, renderer and default-off scheduling are preserved. New
deterministic/state and strengthened six-case browser coverage do not replace
current timing, native presented-frame, memory/scaling or browser-scope decisions.
Recommendation: **NO-GO for production while evidence is incomplete**, not an
unsupported `ARCHITECTURE CHANGE REQUIRED` verdict. Proposed numerical measurement
budgets remain subject to Tech Lead approval; they are not requirements adopted
by this architecture draft or values inferred from historical timings.

The authoritative acceptance requirements remain [POC-V1 sections 12–15 and 19](features/POC-V1-virtualization.md). This draft does not add numerical performance targets or relax those requirements.

Pending review must address:

1. Correct logical ranges and cell identities at normal and large positions on both axes, including edges and reversal.
2. Pinned synchronization and bounded DOM proportional to viewport plus buffers.
3. Rendering costs, responsiveness, and memory behavior, including the required logical-dimension scalability observations.
4. Native-scroll paint/compositor evidence to resolve the reported blink without conflating animation-frame samples and paint.
5. The observed scheduling trade-off and any architecture changes needed before production use.

Increasing logical dimensions can encounter browser maximum-height limits. Stretching remains a separately scoped investigation under POC section 17, not an implementation authorized by this draft. Missing evidence or an execution restriction means the decision remains pending.

Record **VALIDATED** only when the POC acceptance and exit questions are supported by reviewed evidence, required behavior/scalability is demonstrated, and remaining limitations and the intended scheduling policy are documented. Verification must identify the tested revision, environment, modes, commands, and workload limits; historical results alone cannot validate new changes.

Record **ARCHITECTURE CHANGE REQUIRED** when reviewed evidence demonstrates that the current approach cannot meet a POC requirement or needs an architectural change before production. Identify the failing requirement, evidence, proposed trade-off, and approval needed before implementing that change. A pending test run is not itself evidence of architectural failure.

Current result: **pending; not formally VALIDATED**. Document the exit result before production virtualization implementation. Production features such as selection, editing, sorting, filtering, accessibility, and variable geometry require their own specifications and approved scope; this completion of the draft does not implement or schedule them.
