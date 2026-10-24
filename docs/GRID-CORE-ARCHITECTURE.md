# Grid Core architecture decision — 2026-10-24

The [V1 specification](../specs/features/GRID-CORE-V1.md) defines this milestone.
Pure immutable geometry and window functions are the Core-to-renderer boundary.
Consumer indexed rows avoid allocating a million records. Region metadata takes
O(columns) setup space; binary searches support differing column widths without
scanning columns on scroll. No cells are stored by Core.

The POC's fixed geometry, half-open range intent, single scroll owner and shared
pinned-row model informed this design. Its diagnostic scheduling, flushSync flag,
DOM attributes and fixed fixture data remain experimental and are not imported.
This isolates correctness contracts from the unvalidated browser performance
experiment. Existing POC behavior and routes remain available unchanged.

Alternatives: a mutable engine would add update/lifecycle contracts before they
are needed; uniform-width arithmetic would prevent explicit widths; a prefix tree
would complicate static widths without benefiting this milestone. Column rebuilds
are O(C); future interactive resizing may justify a new data structure. Future
sorting/filtering can provide an indexed row projection while preserving keys.
Future framework adapters can consume the same pure window without React.

Physical pinning has three clipping regions, but each DOM row is one logical row.
The full left/center/right sequence supplies `visualIndex`; ARIA column positions
use that index plus one, preserving virtualization gaps. Column IDs remain stable
and `logicalIndex` retains input position only. Using input positions for ARIA
after partitioning can produce descending indices; renumbering mounted cells
would lose full-table positions. Both alternatives are rejected. One additional
linear setup pass assigns/finalizes immutable visual metadata; scroll complexity
and framework independence are unchanged. Sparse column definitions fail early.

The React inspection table omits headers and cells together for zero-width
regions, suppresses empty table/rows at zero width or with no columns, and keeps
row data independent of row position. Its LTR canvas matches Core coordinates
even when the surrounding UI is RTL. Diagnostics are ordinary text rather than
an implicitly live `<output>`. Bounded jsdom tests cover these semantic contracts;
they do not verify native scroll geometry, CSS clipping or assistive technology.

Pinned overflow has deterministic left-first clipping. This is deliberately
specified rather than allowing overlapping regions. It needs product review
before a production renderer and RTL support.

The isolated React inspection demo owns browser measurement and proportional
logical/physical scrolling when extents exceed its canvas cap. It is not the
proposed production `grid-react` package. Production keyboard navigation,
assistive-technology acceptance, scheduling, segmentation and runtime performance
are deferred. The POC exit decision remains unresolved; Performance HOLD and
production POC NO-GO remain in effect. No unmerged PR #4 code is a dependency.

UI inspection correction: the table is now a sticky viewport child of the native
scroll canvas. Restoring pointer hit testing on a sibling overlay alone would
leave cell input without a scrollport ancestor; native scrolling is preserved by
DOM ownership instead of introducing synthetic wheel forwarding. The canvas no
longer has aria-hidden, since it now owns the semantic table. Geometry and Core
are unchanged. A right-region pseudo-element draws the themed leading boundary
over cell backgrounds without occupying layout space or intercepting input.
Static/Sass/jsdom regressions pass; actual sticky layout, native scrolling, Chrome
Element Picker and visual theme behavior require separately authorized browser
verification before merge acceptance.
