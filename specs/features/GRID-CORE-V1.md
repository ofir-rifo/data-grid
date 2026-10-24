# Grid Core V1 — framework-independent foundation

Status: implementation authorized by the PR #5 request, 2026-10-24; runtime and
production acceptance pending. Performance HOLD; production POC NO-GO.

This scope supersedes GRID-V1's former implementation gate only for the pure Core
foundation and isolated inspection demo. It does not validate POC-V1, authorize
performance execution, or complete the proposed production grid renderer.

## Scope and public API

`packages/grid-core` is a private Nx TypeScript library. Its public entry point
exports `RowSource<T>`, `ColumnDefinition<T>`, `ColumnLayout<T>`, `GridGeometry<T>`,
`GridWindow`, `IndexRange`, `createGridGeometry`, `calculateGridWindow`,
`getRow`, and `getRowOffset`. No framework, DOM, network or runtime dependencies.
Consumers supply synchronous indexed rows (`count`, `getRow(index)`,
`getRowId(row)`) and column definitions (`id`, `header`, `width`, optional `pinned`,
`getValue(row): unknown`). Values deliberately have no associated Core renderer;
typed accessors accept T, and formatting stays with the consumer/adapter.

Rows are never enumerated for geometry. Row keys are nonempty unique strings,
stable across reorder/replacement, supplied by the consumer. `getRow` validates
the requested index and returned key, but cannot detect global duplicate keys
without an O(rows) scan, which is explicitly excluded. Column IDs are nonempty
unique strings, checked at layout creation. Neither row positions nor column
positions are identities. `logicalIndex` preserves the original input position;
it is not an accessibility position or a stable identity. `visualIndex` is the
zero-based position across the complete left, center, right sequence, preserving
input order within each region. It is assigned during geometry construction and
can change on repinning/reordering; column `id` remains the stable identity.
Sparse column arrays (missing definitions) are rejected with RangeError rather
than silently dropping positions.

`createGridGeometry({rowCount,rowHeight,columns})` snapshots column metadata and
accessors, computes offsets within each region, and returns immutable geometry.
Consumers rebuild geometry after changing counts, height, widths, IDs or pinning.
Changing row values alone does not require rebuilding geometry. No hidden state,
listeners, caches or disposal. `getRowOffset(geometry,index)` validates an existing
row; the exclusive content-end position is `geometry.height`.

## Geometry, virtualization and coordinates

All units are logical CSS pixels; LTR only. Rows have one positive finite height.
Column widths are positive finite numbers (fractional widths allowed). Counts
are nonnegative safe integers. Accumulated widths and row extent must be finite
and <= Number.MAX_SAFE_INTEGER; excessively small positive dimensions whose
addition fails to advance the cumulative extent are rejected.
Row height must also be at least height*Number.EPSILON for multiple rows, ensuring
representable progression at the largest offset. Fractional row boundaries use
index*rowHeight as authoritative; division rounding must not add phantom rows.

`calculateGridWindow(geometry,{width,height,scrollLeft,scrollTop,rowOverscan?,
columnOverscan?})` accepts finite nonnegative viewport dimensions and pixel
overscan (default zero). Scroll offsets must be finite; negatives/overshoot clamp
to [0,maxScroll]. `scrollLeft` is the center's content offset, `scrollTop` the
shared row offset. Core never reads a scrollbar or subtracts scrollbar thickness;
the renderer supplies the measured inner viewport. Pinned widths are reserved
before center width. If pinned widths exceed the viewport, left clips first to
viewport width, then right gets the remainder, and center is zero. Core returns
both full pinned content widths and nonoverlapping region viewport rectangles.
Pinned columns do not scroll horizontally and are not column-virtualized.

Returned visible and render ranges are half-open [start,end). An item intersects
[a,b) exactly when item.end > a and item.start < b. Touching a boundary alone is
not visible. Render ranges expand the visible pixel interval by overscan then
clamp to content. Zero viewport extent returns [0,0) on that axis regardless of
overscan. Zero center width produces empty center ranges. Zero width or height
prevents cells on that axis; independent ranges may still describe the other
axis. Empty counts return [0,0). Visible ranges exclude overscan. Renderer uses
one row render range across all regions. ARIA uses `visualIndex + 1`, including
gaps for unmounted center columns; it never renumbers just the mounted window.

`GridWindow` returns clamped scroll offsets, maximum offsets, region rectangles,
row visible/render ranges, and center-column visible/render ranges. Column
offsets are relative to their region; viewport cell X is region.x+column.offset
minus scrollLeft for center only. Row viewport Y is index*rowHeight-scrollTop.
Total logical height is rowCount*rowHeight; width is sum of all three regions.

## Errors and immutability

Invalid scalar dimensions/counts, invalid runtime pin values, missing/duplicate
column IDs, unsafe extents, invalid row indices or empty row IDs throw RangeError
with a field-specific message. Consumer callback exceptions propagate unchanged.
No callback is invoked during geometry/window calculation. Geometry metadata is
frozen; row objects remain owned by the consumer and are not cloned/frozen.

## Complexity and alternatives

Setup O(C) time/memory, no row-dependent allocation. Scroll O(log Ccenter) time,
O(1) allocation (fixed number of result records), no row/cell materialization.
Binary search over stored region offsets supports unequal column widths.
Rows use division; uniform-width-only arithmetic was rejected because explicit
widths are required. Reusing POC implementation directly was rejected because
it lacks validation, data contracts and explicit edge semantics. Stateful engine,
prefix tree for interactive resizing, plugins and memoization are deferred until
requirements justify them. Pinned rendering costs O(renderRows * pinnedColumns);
consumers must keep pinned counts bounded. The Core cannot promise bounded DOM
for arbitrarily large viewports, overscan or pinned counts.

## Renderer and accessibility responsibilities

React owns measurement, event subscription/cleanup, scheduling, clipping, DOM,
styles, keyboard events and focus, headers, formatting and accessibility. Core
owns logical indices/identity/geometry only. A future production grid must keep
one logical row across regions, expose total counts and 1-based logical indices,
preserve focus across virtual lifetimes and implement the approved keyboard model.
The inspection demo is a read-only ARIA table with keyboard-scrollable viewport,
not an interactive grid or an accessibility acceptance claim. Region cells share
one row. Both headers and cells follow visual order and use `visualIndex + 1`
for aria-colindex. The complete column count includes unmounted columns. This
matches [WAI-ARIA's increasing-index contract](https://www.w3.org/TR/wai-aria-1.2/#aria-colindex).
Zero-width regions mount neither headers nor cells; zero body height mounts no
data rows, but the independently visible header may remain. No-column layouts
show an empty-state message instead of an empty ARIA row/table. An unmeasured or
zero-width viewport also exposes no empty table/rows. Header-only
empty-data tables are allowed when columns exist. Buffered rows/cells may remain
mounted beyond the visible window; screen-reader acceptance remains pending.
Scroll diagnostics are ordinary text, not a live status announcement on every
scroll update. The scroll canvas is explicitly LTR to match Core coordinates.

The inspection table is a sticky viewport layer inside the scroll canvas and
native scrollport, not a pointer-transparent sibling overlay. Cells and headers
participate in normal pointer hit testing. Wheel/touch input over cells must have
the native scrollport in its ancestor chain; no synthetic wheel forwarding or
preventDefault is introduced. Sticky viewport size and canvas extents preserve
the existing logical/physical mapping. The canvas must not hide its table from
the accessibility tree. Chrome Element Picker behavior requires browser evidence;
static removal of hit-test exclusion alone is not a browser acceptance result.

Body cells and headers vertically center their single-line content in the
available row content box, using the same flex alignment rule. Horizontal
alignment remains at inline start. Symmetric padding, fixed border-box dimensions,
clipping, roles and pointer hit testing remain unchanged; no row-height-dependent
line-height or extra content wrappers. Compiled-SCSS regressions cover both
selectors; actual glyph placement still requires browser acceptance.

A pinned region owns its applicable inner boundary in both header and body rows:
left pinning draws at its trailing edge and right pinning at its leading edge.
Each separator is one CSS pixel. If the center collapses and visible pins meet,
the right region alone owns their shared seam. A pinned region filling the whole
viewport has no inner separator; empty/zero-width pins have none. Use logical
CSS positioning within the explicit LTR coordinate canvas. The separator uses
`--core-pinned-separator`, falling back to `--core-border` then the default border
color. It overlays content without changing column widths/offsets, is clipped to
the region and cannot intercept pointer events.

Visible vertical rules belong only to pinned-region separators, in both body and
headers, following the user's clarified reference. All ordinary cells (including
internal pinned columns) have transparent one-pixel trailing borders. Retain the
existing border width to preserve content-box dimensions and horizontal padding;
keep visible horizontal row rules and the stage frame. No center-column divider
can bleed through or leave a bordered sliver, at any fractional offset. There is
no per-column border suppression attribute or scroll-dependent paint helper.
This supersedes the earlier internal vertical-divider/overlap-band contract.

Pinned shadows are renderer-only decoration painted into the clipped center
region, not outside pinned wrappers (which must retain clipping). A visible left
pin casts toward the center only when clamped `scrollLeft > 0`; a visible right
pin casts toward the center only when `scrollLeft < maxScrollLeft`. Thus the
right shadow can appear at the initial position when content is hidden to the
right. No shadow without center width, an applicable pin or horizontal overflow.
Header and body use identical conditions; touching pins have no center shadow.
Transparent edge pseudo-elements paint soft shadows above center cells, clipped
to their region, with pointer-events:none and no border/background/layout space.
Existing pinned-only one-pixel separators remain their sole solid-line owners.

Stable inherited CSS custom properties are the public customization contract:

| Property | Default | Purpose |
| --- | --- | --- |
| `--core-pinned-shadow-color` | `var(--core-text, #172337)` | Theme-aware shadow color |
| `--core-pinned-shadow-opacity` | `0.18` | Effect opacity; `0` disables both |
| `--core-pinned-shadow-offset` | `2px` | Centerward offset magnitude |
| `--core-pinned-shadow-blur` | `6px` | Blur radius |
| `--core-pinned-shadow-spread` | `0px` | Spread radius |
| `--core-pinned-shadow-left` | Component-derived box-shadow | Full left-shadow override; `none` disables left |
| `--core-pinned-shadow-right` | Mirrored component-derived box-shadow | Full right-shadow override; `none` disables right |

Consumers set these properties on the demo's ancestor/theme container without
private CSS-class overrides or new React props. Color may include alpha; opacity
multiplies the complete effect. Full overrides accept a CSS box-shadow value and
remain subject to common opacity and center clipping. Offset is a nonnegative
length, blur a nonnegative length, spread a CSS length and opacity in [0,1].
Explicit LTR grid coordinates remain stable inside RTL hosts; native RTL grid
geometry is deferred. No automatic light/dark detection: inherited theme colors
and consumer overrides determine appearance.

Acceptance: deterministic pure/DOM cases cover start/middle/end, fractional
scroll, no overflow, absent/empty pins and collapsed center; compiled SCSS checks
opposite offsets, all token fallbacks, `none` overrides, opacity disablement,
clipping, no solid border/background, no layout contribution and non-interception.
Actual shadow softness, theme contrast and compositing require separately
authorized browser acceptance; static token tests cannot establish painted pixels.

Each region clips its own children, establishes an isolated stacking context and
has an opaque themed backing surface. Center content stacks below pinned
regions. `--core-surface` supplies that backing, falling back to `--core-cell` then
white; themes must provide an opaque surface (even if cell fills are translucent).
No new DOM layer; horizontal row dividers remain. This prevents a center
cell border/background from becoming a second pinned-edge owner. The table
itself declares LTR as well as the scroll canvas, so the contract also holds when
embedded in an RTL page. Logical start/end CSS keeps the edge rules directional;
native RTL grid coordinates and scrolling remain an explicitly deferred feature,
not a claim of RTL grid support from inherited-page tests.
No sorting, filtering, selection, editing, grouping, variable-height rows,
fetching, full plugin system or production navigation in this milestone.

The million-row preset uses lazy indexed rows and a bounded physical scroll
canvas with proportional logical offsets. This sacrifices pixel-perfect native
scroll precision at large logical extents; it is an inspection coordinate mapping,
not validated production segmentation or evidence of smooth performance.

## Acceptance and test strategy

Deterministic unit tests must cover exact/interior edges, beginning/middle/end,
overscan/clamping, 0/1 items, zero viewports, unequal/fractional widths, combined
2D motion, all pin states/overflow, identity across replacement/reorder, invalid
inputs/callback errors and large logical rows with bounded columns. Compare
binary-search ranges against an independent interval-intersection oracle over
small fixtures. Demonstrate no row access during window calculations.
Core tsconfig has ES2022 only and no ambient browser/framework types. Add import
restrictions as an additional boundary check.

Separator/hit-testing acceptance: bounded DOM unit tests assert native scroll
ancestry, accessible table ownership, matching header/body boundary classes,
zero-width/unpinned omission, and uncancelled pointer/wheel event propagation.
Pure renderer cases cover boundary owners, fractional scrolling, empty pins,
collapsed-center shared seams and full-viewport pinning. DOM cases inspect owner
counts under LTR/RTL hosts before/after horizontal window changes. Compiled-SCSS
cases verify transparent vertical cell/header borders, visible row rules and frame,
and consistent vertical content centering. Compiled-SCSS contract tests check sticky offsets, hit testing, themed separator
positioning, surface/stacking/clipping, and no geometry-changing border. Separately authorized browser tests
must check actual hit targets, native scrolling over cells, pinned alignment and
separator style/placement before/after scrolling, with theme overrides and an
RTL surrounding page. jsdom/static Sass checks cannot satisfy those visual/native
input acceptance criteria.

Demo must expose configurable bounded counts, a million-row preset, both axes,
pinning, visible/render windows, offsets, dimensions and cell count. Browser tests
specify bounded correctness and semantics only. No browser, server, benchmark,
stress, dependency installation or supervisor execution during this task. Run
bounded Nx checks only after establishing no concurrent native verification and
safe local tooling; otherwise record NOT RUN with exact follow-up commands.
