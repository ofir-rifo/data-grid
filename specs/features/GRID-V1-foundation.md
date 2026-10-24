# GRID-V1 — production foundation

2026-10-24 scope update: the PR #5 request authorizes the narrower
[Grid Core V1 foundation](GRID-CORE-V1.md) and isolated inspection demo. The rest
of this proposed production renderer milestone, including full keyboard/focus
and accessibility acceptance, stays deferred. POC-V1 is not declared validated.

**Status:** Proposed; specification preparation authorized, production implementation not authorized.
**Version:** 0.1
**Date:** 2026-10-17

## 1. Purpose and approval boundary

Define the smallest reusable production slice after the fixed-geometry virtualization POC: typed local rows/columns, pure geometry/window calculations, and a read-only React renderer with deterministic cell containment and initial accessible interaction. This is not a full enterprise grid or a declaration that the POC is validated.

Sources: [accepted principles](../000-project-principles.md), [draft architecture](../001-architecture.md), [POC-V1](POC-V1-virtualization.md), and [current evidence/status](../../docs/PROJECT-STATUS.md). The labels below distinguish existing requirements from new design proposals. Authorizing this draft does not approve proposed APIs, defaults, or implementation.

## 2. Existing requirements inherited from project documents

- Framework-independent `grid-core`; React/DOM integration in `grid-react`; dependencies point from React integration to core, never back (architecture §3).
- Consumers provide data. HTTP, databases, authentication, business logic, and AI providers stay outside grid packages (principles §4).
- Strict TypeScript, strong public generics, no public/internal `any`, explicit dependencies, SOLID/KISS (principles §§3, 7).
- Own virtualization implementation; no third-party runtime grid or virtualization library (architecture §§2, 7).
- Logical row/column identity and shared pinned/center state survive virtual DOM lifetimes (principles §13; architecture §5).
- SCSS Modules, theme tokens where appropriate, consumer-controlled rendering without replacing behavior (principles §§8–9).
- Accessibility and logical keyboard/focus behavior are architectural requirements, not later polish (principles §§10–11).
- Spec-first development, acceptance tests, and relevant checks before completion (principles §§2, 19–20). Workload approval is still required under machine-safety constraints.
- Document the POC exit result before production virtualization implementation (POC §19). Current result remains pending.

## 3. Proposed first-slice scope

**New proposal:** support caller-owned synchronous local rows, fixed uniform row height and column width, headers, read-only cells, two-axis virtualization, and pinned-left/center/pinned-right presentation using one native scrollport and shared row identity. Pinned widths derive from the fixed column size. General column resizing, row-height measurement, and data fetching are excluded.

Production code must not inherit POC constants (100,000 rows, 1,000 columns, 40px, 120px, fixed viewport) as immutable product constraints. Supply dimensions through typed inputs and measure the actual viewport in the React layer. Concrete defaults and supported browser/version policy require review before implementation.

Non-goals: sorting, filtering, grouping, selection, editing, variable geometry, auto-sizing/resizing/reordering, remote data loading, workers, plugins, AI, export, and browser-height stretching. These require separate specifications. Read-only logical navigation is in scope; editing/selection navigation is not.

## 4. Proposed core contracts

`grid-core` owns pure fixed geometry, range/window calculations, typed identities and row/column definitions. It must be importable without React, JSX, DOM globals, styles, or a browser runtime. Core calculations accept viewport dimensions/offsets as numbers; they neither read layout nor subscribe to events.

Proposed logical contracts, with names subject to review:

- `RowId` and `ColumnId`: stable unique strings within an instance; indices are positions, not identity.
- Rows: `readonly TRow[]` plus `getRowId(row: TRow): RowId`; consumer data is not mutated. Row replacement/reordering resolves identity through the callback.
- Column definition: `GridColumn<TRow, TValue>` has a stable ID, accessible/header text, a typed value accessor `(row: TRow) => TValue`, and optional pin placement (`left`, `right`, or unpinned).
- Fixed geometry input: nonnegative integer item count and positive finite item size; viewport dimensions and buffers are finite nonnegative numbers. Offset normalization, invalid-input errors, and range boundaries must be explicit and unit-tested.
- Render window: inclusive start / exclusive end indices, clamped to logical counts; empty rows/columns produce empty ranges without invalid cell access.
- Pixel buffers remain configurable separately per axis. The center width excludes pinned widths and never becomes negative. A zero-width center must not generate visible center cells solely because a nonzero column buffer exists; exact empty-center behavior is to be reviewed with the range contract.

**Proposed error policy:** reject invalid dimensions and duplicate IDs with descriptive errors rather than silently corrupt identity/geometry. Clamp otherwise valid scroll offsets to the applicable logical range. This policy and exact public type names are proposals, not behavior implemented by the POC.

Do not expose POC diagnostic event IDs, performance timestamps, browser elements, or `flushSync` query flags as core APIs. No generic state/plugin framework is needed for this slice.

## 5. Proposed React integration and API boundary

`grid-react` supplies a generic `DataGrid<TRow>` integration over core definitions. Proposed inputs comprise rows, typed columns, row identity, fixed row/column sizes, separate row/column buffers, an accessible grid name, and presentation hooks. Exact prop/type names and defaults remain reviewable.

- React-specific cell rendering receives typed row/value plus logical row/column identity. React nodes/slots exist only in `grid-react`; core column values/accessors remain React-free.
- Mixed value types across columns must retain the accessor/renderer relationship through typed column-definition helpers or an equivalent reviewed design. Do not force consumers to cast values or use `any` to construct heterogeneous column collections.
- Display text/formatting must be explicit for non-string values; do not silently serialize arbitrary objects as product behavior. The empty/null display policy must be agreed with public API examples.
- Native scroll position and viewport dimensions drive a single logical render window; pinned and center regions share rows and focus identity.
- Resize observation, subscriptions, and cleanup belong in React integration. Layout effects and DOM reads must be bounded and isolated; no redundant listeners per cell.
- Public entry points expose supported package APIs only; consumers must not import playground engine paths or package internals.
- Separate pure calculation from DOM scheduling. The production scheduling strategy requires the POC decision and current evidence; do not copy experimental `flushSync` as a default. The playground flag remains default-off and unchanged by this draft.

Proposed public examples and compile-time tests must demonstrate a typed row, at least two different column value types, custom cell rendering, and stable IDs before the API is accepted. A final TypeScript signature is deliberately not frozen by this draft.

## 6. Proposed fixed geometry, rendering, and containment contract

The first slice uses one fixed row size and one fixed column size per grid instance. Cell/row boxes, borders, and padding must fit inside those dimensions. Geometry does not derive from rendered text, and render counts remain proportional to viewport plus buffers.

**New proposal informed by measured POC overflow:** arbitrary cell content must not enlarge the native scroll extent beyond the defined logical canvas. The default presentation is a clipped single-line value. Wrapping/custom content may be rendered only within the fixed cell content box; it does not implicitly increase row height. The exact CSS technique is an implementation choice after review, not permission to change the POC now.

- Long words, multi-line strings, unbroken text, custom renderer children, and larger font metrics must not extend scrollable geometry or overlap adjacent row content.
- Preserve the full textual accessible value when visually clipped. A tooltip is not the sole accessible representation; tooltip/expanded-content product design is outside this slice.
- Containment must not clip the visible focus indication; use a reviewed focus treatment inside the available cell/viewport geometry.
- Use SCSS Modules and scoped class/slot contracts; publish reviewed CSS custom properties for theme values. Consumer styling must preserve the fixed geometry, containment, focus, and accessibility invariants.
- Do not impose a UI/icon library. Do not introduce portals, popup editors, or overflow escape mechanisms for features excluded from this slice.
- Extreme pinned-width cases need a defined viewport policy before implementation: when pinned regions consume/exceed available width, preserve valid geometry and accessible navigation; choose a documented visual fallback rather than silently creating negative center dimensions. The visual fallback is an open proposal decision, not solved here.

## 7. Proposed initial accessibility contract

The existing accessibility requirement is accepted; the following first-slice details are **proposals requiring review**:

- A named read-only grid with semantic headers, rows, and cells; logical total row/column counts and indices remain meaningful when only a window is mounted. Specify header/data-row indexing consistently.
- One logical row representation spans pinned/center cells; pinning does not duplicate announced rows or create independent grids. DOM structure/ARIA ownership must be validated rather than inferred from visual alignment.
- One grid entry point in sequential keyboard navigation. Arrow keys move logical cell focus; Tab/Shift+Tab leave the grid naturally. Movement across virtualized/pinned boundaries renders and focuses the destination without creating multiple tab stops.
- Retain logical focus identity across scrolling/remounting; decide the fallback when focused data is removed. That fallback and entry-cell behavior must be approved before implementation.
- Consumer renderers preserve the accessible name/value and grid navigation contract. Interactive custom controls require separate specified focus behavior; this read-only slice does not promise arbitrary embedded-widget navigation.
- Keyboard and semantic checks must be accompanied by a bounded screen-reader review on the chosen supported browser/platform. DOM assertions alone do not prove assistive-technology usability.

## 8. Acceptance criteria and required tests — proposed

| ID | Acceptance criterion | Required evidence |
| --- | --- | --- |
| F1 | Core has no React/DOM/runtime infrastructure dependencies; React depends on core only | Import/boundary review and pure-unit execution without browser globals |
| F2 | Typed row/column/value/rendering contracts preserve inference and stable IDs | Compile-time positive/negative consumer examples; duplicate-ID and immutability tests |
| F3 | Fixed geometry/window boundaries handle empty data, exact/fractional offsets, edges, buffers, invalid dimensions and zero-width center | Independent core unit cases; no tests that merely call the same implementation as their oracle |
| F4 | Exact visible/window identities, bounded cells and synchronized pinned regions after normal, large, combined, edge and reverse scrolls | Focused browser cases plus logical-size variation under approved resource limits |
| F5 | Text/custom content never increases fixed logical canvas scroll extents | A final-row layout regression: before/after mount bounds and actual scroll extent; long/wrapped text and changed font metrics; inspect clipping and focus behavior |
| F6 | React viewport updates and teardown do not leak listeners/observers or retain stale subscriptions | Resize/unmount cases, source review and bounded memory observations |
| F7 | Named grid/header/cell semantics, logical indices/counts, single row identity, keyboard/focus behavior survive virtualization/pinning | Playwright semantic/keyboard cases and bounded manual assistive-technology review |
| F8 | Theme/custom renderer hooks preserve behavior, geometry, containment and accessible values | Consumer fixture cases with alternate styles/renderers and compile-time API examples |
| F9 | Scroll responsiveness and DOM/memory behavior meet the reviewed evidence-based target for supported environments | Approved controlled measurements; no arbitrary machine-specific CI timing thresholds |
| F10 | Package entry points and documentation describe supported inputs, limitations and exclusions | Consumer integration review, relevant scoped Nx checks, specification/status updates |

These tests are required future work, not tests already written or executed. The broader project definition of done remains applicable; this document does not waive it or authorize unsafe workloads.

## 9. Decisions and minimum production-entry gates

Before implementation:

1. Record the POC §19 exit decision with remaining required native-scroll/rendering/memory/scalability evidence; diagnose and decide treatment of the measured cell-overflow issue. Do not label the POC validated solely from final-state regressions or this layout diagnostic.
2. Review/approve this first-slice scope and proposed APIs, dimensions/defaults, text/empty-value display, containment, pinned-width fallback, keyboard/focus semantics, and supported environments. These are review items, not architectural decisions adopted by this draft.
3. Specify the smallest package extraction and acceptance-test sequence. Begin with pure geometry/identity contracts, then add the minimal React/semantic renderer and containment cases; do not extract the POC debug UI as the public component.
4. Obtain bounded execution/implementation authorization. No builds, production code, dependency changes, or application fixes are authorized by specification preparation alone.

If POC evidence requires a major architecture change, approve/document it before production extraction. Otherwise keep the first delivery narrow; selection, editing, sorting, filtering, remote data and plugins follow only their own approved specifications.
