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
Pinned overflow has deterministic left-first clipping. This is deliberately
specified rather than allowing overlapping regions. It needs product review
before a production renderer and RTL support.

The isolated React inspection demo owns browser measurement and proportional
logical/physical scrolling when extents exceed its canvas cap. It is not the
proposed production `grid-react` package. Production keyboard navigation,
assistive-technology acceptance, scheduling, segmentation and runtime performance
are deferred. The POC exit decision remains unresolved; Performance HOLD and
production POC NO-GO remain in effect. No unmerged PR #4 code is a dependency.
