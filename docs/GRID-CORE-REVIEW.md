# Grid Core V1 review record — 2026-10-24

## A. Status

READY FOR FINAL TECH LEAD REVIEW of the foundation implementation. Browser,
assistive-technology and production acceptance remain pending. Performance HOLD;
production POC NO-GO. This is self-review, not independent acceptance.

## B. Architecture

Consumers own indexed row data, stable unique row IDs and columns. Core owns
immutable region geometry and pure half-open visible/render windows. React owns
measurement, subscriptions, scrolling, formatting, clipping and DOM semantics.
No fetching, React, JSX, DOM or browser globals in Core. Geometry setup O(C) time
and space; scroll O(log Ccenter) time and O(1) records. No row scan or cell matrix.
Stable row-ID uniqueness is a consumer precondition, not globally scanned.
Column IDs are validated once. Pinned widths reserve space and clip left-first
when the viewport cannot fit them. The [spec](../specs/features/GRID-CORE-V1.md)
and [decision](GRID-CORE-ARCHITECTURE.md) contain exact contracts and alternatives.

## C. Implementation

- `packages/grid-core/src/index.ts` and `src/lib/grid-core.ts`: public data,
  identity, layout, viewport and range API; binary search over varying widths;
  scalar/identity validation; immutable snapshots; fixed row geometry.
- Core package, tsconfigs, ESLint and Vitest configs: private Nx source library,
  ES2022-only production compiler types, framework import restrictions, serial tests.
- `apps/playground/src/app/core-demo/`: configurable React inspection renderer,
  SCSS Module, lazy million-row preset, bounded physical canvas, debug indicators.
- App query route, workspace dependency/lockfile link and TypeScript references.
- Root `test:core` script and one focused Core unit-test CI step. Existing browser
  CI selection is unchanged; the new browser source is not silently auto-enabled.

No external dependency versions changed. Manual workspace-link lockfile entries
were added without installing/updating packages. All Core/React files were
formatted; historical documentation formatting was preserved.

## D. Specs and documentation

New `specs/features/GRID-CORE-V1.md`, `docs/GRID-CORE-ARCHITECTURE.md` and this record.
Architecture and GRID-V1 specs explicitly delimit the new authorized scope.
PROJECT-STATUS, ROADMAP and new AI-DEVELOPMENT-JOURNAL record implementation,
verification limits and PR #4 context without importing its unmerged documents.

## E. Testing and execution record

The PR #4 chat was read-only inspected and its completed/idle state established
before bounded serial verification. No supervisor tooling was invoked here.
Use the following environment for all recorded Nx commands:

```powershell
$env:NX_DAEMON='false'
$env:NX_NO_CLOUD='true'
$env:NX_SKIP_REMOTE_CACHE='true'
$env:NX_SKIP_NX_CACHE='true'
$env:NX_ISOLATE_PLUGINS='false'
$env:NODE_OPTIONS='--max-old-space-size=2048'
```

Actual commands and final results:

```text
node node_modules/nx/dist/bin/nx.js show project @org/grid-core --json
PASS — Nx discovers library, inferred typecheck/lint and explicit serial test.

node node_modules/nx/dist/bin/nx.js run @org/grid-core:typecheck --excludeTaskDependencies --skipSync --parallel=1
PASS — production and unit-test TypeScript projects.

node node_modules/nx/dist/bin/nx.js run @org/playground:typecheck --excludeTaskDependencies --skipSync --parallel=1
PASS — app, unit-test and browser-test TypeScript projects.

node node_modules/nx/dist/bin/nx.js run @org/grid-core:test --excludeTaskDependencies --skipSync --parallel=1
PASS — 9 tests, bounded fixtures, 4096 columns maximum, lazy 1,000,000-row source.

node node_modules/nx/dist/bin/nx.js run @org/playground:standards-test --excludeTaskDependencies --skipSync --parallel=1
PASS — all 9 policy tests.

node node_modules/nx/dist/bin/nx.js run @org/playground:standards --excludeTaskDependencies --skipSync --parallel=1
PASS — zero errors; nine pre-existing diagnostic Playwright warnings.

git diff --check
PASS — whitespace review.
```

Core coverage includes normal/edge/empty/minimal ranges, independent interval
oracles, combined scrolling, overscan and clamping, pinned partition/overflow,
identity replacement, no row reads during calculations, invalid inputs and
fractional-boundary regressions. Large logical counts do not allocate row data.

Initial sandbox Core test run failed before collecting tests due to temporary
cache-file rename EPERM. Policy run passed 8/9 with a temporary Git fixture denied.
Both suites passed bounded elevated reruns. Nx sometimes reported native-cache
EPERM and loaded its original module; checks still completed. Initial direct Nx
discovery lacked `.modules.yaml`; copying existing metadata locally resolved it.

One `pnpm nx show project @org/grid-core --json` attempt unexpectedly entered
supply-chain verification and attempted registry fetches, which failed. It was
interrupted; it did not reach Nx. No successful install/update is claimed. Later
commands bypassed the launcher via installed Nx. Existing dependency package
junctions were created only in this worktree; shared cache directories and
original workspace links were excluded. No new external dependencies installed.

NOT RUN: app build, browser/E2E execution, screenshots, dev server, benchmarks,
Stage 0, stress, supervisor verification, full POC unit-suite rerun or real
performance validation. Browser-test source is typechecked/linted only. Bounded
local checks are not hardware-stability evidence.

## F. Playground and screenshots

After explicit separate authorization for a server/browser workload, from this
isolated worktree with existing dependencies:

```text
node node_modules/nx/dist/bin/nx.js run @org/playground:dev --skipSync
```

Then open `http://localhost:4200/?demo=core` manually. Port 4200 must be free; do
not attach this command to an existing POC or supervisor session. Select small
counts first; inspect both axes and pinning, empty/minimal cases and debug ranges.
The million-row preset is lazy. Capture normal, scrolled-end and million-row
views with debug output visible. No screenshots were captured in this task.

Separately authorized bounded browser correctness command (not executed):

```text
node node_modules/nx/dist/bin/nx.js run @org/playground:e2e --excludeTaskDependencies --skipSync --parallel=1 --args="e2e/core-demo.spec.ts --project=chromium --workers=1 --retries=0 --trace=off --reporter=line --global-timeout=60000 --timeout=15000"
```

Existing Playwright server configuration invokes pnpm; review its launcher
behavior and server safety before future execution. The demo is a read-only ARIA
table plus keyboard-scrollable region. It does not implement production cell
focus/navigation, and accessibility has not been browser/screen-reader verified.

## G. Performance

Only algorithmic claims above are supported by source inspection. Renderer work
is proportional to rendered rows times rendered center plus pinned columns.
Large overscan, viewports or pinned counts can expand rendering work. The demo
caps physical scrolling extents to 1,000,000px per axis and proportionally maps
to logical offsets. Native pixel precision is lost when scaled. Browser maximum
height, smoothness, paint scheduling and production segmentation are unverified.

## H. Git and PR state

Base `27b4f16` (fetched main), branch `feature/grid-core`, isolated worktree
`C:\Users\ofirr\Documents\Codex\data-grid-core`. The delivery report supplies the
final commit SHA and actual Draft PR URL; PR numbering is assigned by GitHub.
No PR #4 modifications, cherry-picks, merge, readiness transition or main changes.

## I. Risks and follow-ups

Independent review must assess API contracts, pin clipping policy, source-only
package exports, and the limited renderer. Browser/screen-reader correctness,
production focus/navigation, accurate large-offset scrolling, RTL, resizing and
performance evidence are subsequent milestones requiring their own acceptance.
No selection/editing/sort/filter/grouping/variable-height/plugin system added.
The generator source was inspected; package scaffolding was authored manually to
avoid generator dependency side effects. Source verification passed; generator
execution itself is not claimed.

## J. Review artifacts

The delivery includes the full commit reference, patch against main and this
record with links to specifications and architecture. Review the patch before
any merge. Performance HOLD and production POC NO-GO are unchanged.
