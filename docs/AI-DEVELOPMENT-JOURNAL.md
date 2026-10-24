# AI development journal

## 2026-10-24 — PR #5 review remediation

Rechecked the clean isolated feature worktree and GitHub PR base/head/Draft state.
Audited all 28 changed paths, Core math and invariants, identity/data access,
geometry, React rendering, test assertions, Nx/package boundary and documentation.
Confirmed the known ARIA defect against the WAI-ARIA increasing-column-index
requirement. The default first/last pin preset masked arbitrary interleaved pins.
Specified separate original and visual positions before changing Core metadata;
stable IDs were preserved. No mounted-window renumbering or ID substitution.

Other demonstrated defects: headers persisted in zero-width pinned regions while
cells disappeared; no-column/unmeasured layouts emitted empty semantic rows;
high-frequency `<output>` carried an implicit status role; inherited RTL conflicted
with LTR-only scroll coordinates; sparse column arrays silently skipped entries.
Updated the specification first, then fixed each with deterministic regressions.
Extracted a small stateless CoreTable to exercise actual header/cell markup with
interleaved pins and string row data. Core remains framework-independent.

11 Core, 47 Playground and 9 policy tests passed serially. Focused React tests
cover 7 cases and are included in the 47, not additional to them. Core/app
typechecks and standards passed (0 errors, 9 pre-existing diagnostic warnings).
Used installed Nx directly due the earlier pnpm discovery side effect; no
dependency operation occurred in this remediation. Supervisor chat remained idle.
No browser, Playwright execution, build, dev server, benchmark, performance or
supervisor verification. DOM semantics are unit evidence, not AT/native layout
acceptance. The canonical five-section PR text follows the separate description
policy's published template headings, inspected read-only; none of that branch's
unmerged implementation was imported. Publication and exact diff are recorded in
the delivery report. Performance HOLD; production POC NO-GO.

## 2026-10-24 — isolated Grid Core foundation (PR #5)

Read principles/status/standards and Nx skills before implementation. Inspected
PR #4 checkout and preserved six modified files plus the untracked runner.
Fetched main and created `feature/grid-core` in a separate Documents/Codex
worktree. Wrote Core specification and architecture decision before code.
Separated pure indexed-data/geometry/window contracts from React browser work.
Kept POC scheduling/instrumentation experimental. Implemented varying column
width binary searches and shared fixed row geometry with bounded pinned regions.

Added deterministic boundary/identity/invalid-input tests and independent small
interval oracles. Self-review found division rounding could include a phantom
row at fractional boundaries; corrected against multiplication boundaries and
added regression coverage. Read-only React inspection uses lazy million-row data
and explicitly unvalidated proportional scrolling, not production segmentation.

Local Nx package files were authored after inspecting generator source; generator
execution was not used. Existing installed packages were linked into isolated
node_modules, excluding shared caches and workspace links. A `pnpm nx show`
attempt unexpectedly entered supply-chain verification/network fetching; it was
interrupted, reported fetches failed, and no Nx checks ran through that launcher.
Subsequent commands invoked the installed Nx Node entry point directly. No
dependency installation/update was completed or intentionally requested. This
unexpected attempt is recorded rather than omitted. Sandbox rename/Git fixture
failures were rerun with bounded escalation. See [review](GRID-CORE-REVIEW.md).

Other agent's completed/idle state established before bounded checks. No browser,
server, build, stress, benchmark, Stage 0, supervisor execution or policy change.
Performance HOLD and production POC NO-GO remain. Self-review does not replace
independent Tech Lead review. This journal is new on main; PR #4's separate journal
was not copied or overwritten.
