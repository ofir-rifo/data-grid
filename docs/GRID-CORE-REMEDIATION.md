# PR #5 Grid Core review remediation — 2026-10-24

READY FOR FINAL TECH LEAD REVIEW of the remediated foundation. Self-audit and
regression evidence do not replace independent acceptance. PR remains Draft.
Performance HOLD; production POC NO-GO.

## Audit and isolation

Reviewed all 28 PR files at `369a8783c4aa4de36aff9f9015b30edf468f780f`, base
`27b4f1635e04da38316b6020fb2f8426358475ae`. Checked scalar validation, fixed/fractional
row boundaries, column binary searches, overscan, clamping, pinned clipping,
immutable metadata, lazy row access, stable identities, React subscriptions and
rendering, accessibility semantics, unit/E2E sources, package/TS/Nx integration,
CI delta and all specification/documentation changes. Existing numeric boundary
algorithms remain unchanged; their deterministic oracles and regressions pass.

Worked only in `C:\Users\ofirr\Documents\Codex\data-grid-core` on
`feature/grid-core`. Starting status was clean. Other worktrees were inspected
read-only; the supervisor chat was idle before unit execution. No PR #4 code,
native tooling, evidence or pending changes were imported, modified or executed.
The canonical description's exact headings were read from the separate policy
worktree, without importing its unmerged product/tooling implementation.

## Findings, fixes and regressions

| Finding | Correction | Deterministic evidence |
| --- | --- | --- |
| Partitioning interleaved pins can yield descending original indices in a DOM row. | Add immutable zero-based `visualIndex` across the complete left/center/right sequence. Both header/cell ARIA indices use `visualIndex + 1`. Preserve column `id` and original `logicalIndex`. | Core position/repin test; actual React markup checks full order and virtualized gaps `[1,4,6]`, stable row/column IDs and string row values. |
| Zero-width pinned headers persist after cells are omitted. | Apply the same width predicate to headers and cells. | Narrow viewport mounts only left headers/cells; cell-count indicator agrees. |
| No-column/unmeasured layouts produce empty ARIA rows. | Expose no table until width/columns exist; retain normal empty-state message. | DOM tests for width zero, columns zero, and header-only height zero. |
| Debug `<output>` is implicitly a live status on scrolling. | Use ordinary debug text. | No status role before/after synthetic scrolling; debug values still update. |
| LTR-only coordinate math inherits surrounding RTL. | Explicit `dir="ltr"` on the scroll canvas. | RTL-parent fixture verifies the local direction contract. Native RTL scrolling is not claimed. |
| Array `forEach` silently skips missing column definitions. | Indexed validation rejects missing definitions with field-specific RangeError. | Sparse typed column-array rejection test. |

The ARIA correction follows [WAI-ARIA column indices](https://www.w3.org/TR/wai-aria-1.2/#aria-colindex).
The debug correction follows the [implicit output role](https://www.w3.org/TR/html-aria/#el-output).
Renumbering only the mounted window was rejected because it loses full-table
position. Reusing IDs as positions was rejected because identities must survive
reordering. Visual position is a pure Core layout fact; ARIA remains in React.

## Changed files

- `packages/grid-core/src/lib/grid-core.ts`: visual metadata and missing-column validation.
- `packages/grid-core/src/lib/grid-core.spec.ts`: two Core regression tests.
- `apps/playground/src/app/core-demo/CoreTable.tsx`: stateless inspection table,
  actual shared row markup, visual ARIA indices and consistent clipping guards.
- `apps/playground/src/app/core-demo/CoreDemo.tsx`: compose the table, share cell
  counting, enforce LTR and render non-live diagnostics.
- `CoreTable.spec.tsx` / `CoreDemo.spec.tsx` in that folder: seven bounded React
  unit cases with synthetic measurements/ResizeObserver, plus lifecycle checks.
- `specs/features/GRID-CORE-V1.md`: contracts updated before implementation.
- Core README, architecture, project status, original review record and AI journal:
  identity/position distinction, current results, limitations and historical scope.
- This report. No dependency, lockfile, workflow, stylesheet or POC code changes
  were needed for remediation.

## Verification performed

All commands ran serially, with existing installed tools. Nx daemon/cloud/cache
were disabled and Node heap capped at 2048 MiB per process:

```powershell
$env:NX_DAEMON='false'
$env:NX_NO_CLOUD='true'
$env:NX_SKIP_REMOTE_CACHE='true'
$env:NX_SKIP_NX_CACHE='true'
$env:NX_ISOLATE_PLUGINS='false'
$env:NODE_OPTIONS='--max-old-space-size=2048'
```

| Exact command | Result |
| --- | --- |
| `node node_modules/nx/dist/bin/nx.js run @org/grid-core:typecheck --excludeTaskDependencies --skipSync --parallel=1` | PASS |
| `node node_modules/nx/dist/bin/nx.js run @org/playground:typecheck --excludeTaskDependencies --skipSync --parallel=1` | PASS; application, unit and E2E source types |
| `node node_modules/nx/dist/bin/nx.js run @org/grid-core:test --excludeTaskDependencies --skipSync --parallel=1` | PASS, 11 tests |
| `node node_modules/nx/dist/bin/nx.js run @org/playground:test --excludeTaskDependencies --skipSync --parallel=1 --args="--run src/app/core-demo/CoreDemo.spec.tsx src/app/core-demo/CoreTable.spec.tsx --maxWorkers=1 --no-file-parallelism"` | PASS, 7 focused DOM tests |
| `node node_modules/nx/dist/bin/nx.js run @org/playground:test --excludeTaskDependencies --skipSync --parallel=1 --args="--run --maxWorkers=1 --no-file-parallelism"` | PASS, 47 tests in 9 files, including those 7 |
| `node node_modules/nx/dist/bin/nx.js run @org/playground:standards-test --excludeTaskDependencies --skipSync --parallel=1` | PASS, 9 policy tests |
| `node node_modules/nx/dist/bin/nx.js run @org/playground:standards --excludeTaskDependencies --skipSync --parallel=1` | PASS, 48 source/3 style files; zero errors and 9 existing warnings |
| `git diff --check` and final staged whitespace check | PASS |

Unit suites used bounded elevated execution because the previous task demonstrated
sandbox temporary-file/Git-fixture failures. No failing implementation test was
suppressed or disabled. Static checks reported the known native-cache permission
warning and loaded the original module successfully. No installs or pnpm registry
fetch attempts occurred during this remediation.

NOT RUN: browser, Playwright execution, native scrolling/CSS layout, screen-reader
review, dev server, application build, benchmarks, stress/performance workload,
Stage 0, supervisor verification or Windows policy changes. Existing hosted CI may
react to the authorized push; it is not used as local browser/performance evidence.

## Self-review and remaining risks

Core remains ES2022-only with no React/DOM/framework dependency. The extra setup
pass is O(C) time/space; viewport calculation remains O(log Ccenter), fixed-size
result records, with no row enumeration. React materializes only render-window
rows and center columns plus pinned columns, never a data matrix. Column IDs and
row source ownership are unchanged. No new mutable global product state.

The tests assert explicit expected order/IDs rather than reproducing the visual
index formula, and use interleaved pins because the default preset masks the
finding. Both headers and body rows are checked. Gapped virtualized positions,
repinning, count reset, zero dimensions and StrictMode cleanup are exercised.
jsdom tests establish committed DOM contracts only, not browser accessibility-tree
behavior, screen-reader output, sticky/clipping correctness or keyboard scrolling.

Global row-ID uniqueness remains consumer-owned. Pin clipping remains left-first;
arbitrary pinned counts/viewports/overscan can expand render work. The demo's
proportional large-scroll mapping still loses native pixel precision. Production
focus/navigation, RTL support, accurate segmentation and runtime performance need
separate design/acceptance. No benchmark or million-row smoothness claim.

## Publication and review artifacts

Keep [PR #5](https://github.com/ofir-rifo/data-grid/pull/5) Draft. The delivery report
records the final pushed remediation SHA, PR-description write result and complete
patches both against the original PR head and against main. Canonical body has
exactly Summary, Changes, Tests and Verification, Risks and Limitations, and Related
Issues / Specifications. If integration permissions reject its update, the exact
replacement text is supplied as a standalone artifact. No readiness transition,
merge, branch-protection update or PR #4 mutation is authorized or performed.
