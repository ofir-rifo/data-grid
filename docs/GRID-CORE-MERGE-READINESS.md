# PR #5 safe-merge preparation — 2026-10-24

## Customizable pinned shadows

NOT MERGE READY. Shadows decorate center edges above center cells only when
content is hidden behind an applicable pin. Pure window-based conditions retain
geometry and scrolling. Existing pinned clip/surface/stacking, sole solid-line
ownership, transparent cell dividers and vertical centering remain unchanged.
No added DOM or public React API. Theme properties and usage examples are in
GRID-CORE-ARCHITECTURE.md; opacity 0 or side box-shadow `none` disables effects.
Spec and acceptance criteria were updated before implementation.

81 Playground tests PASS (16 new pure/DOM/Sass cases); 9 policy tests PASS.
Final source/Core checks, SHA, canonical body and remote CI are in delivery
artifacts. No browser execution: token wiring and static opposite shadow offsets
are verified, but actual inheritance, softness, theme contrast, clipping/scroll
compositing and native input/AT still require independent authorized acceptance.
No local build/server/performance/supervisor activity. Keep Draft/unmerged.
Performance HOLD. Production POC NO-GO. Earlier sections are historical snapshots.

## PR #5 clarified pinned-only vertical borders and centered content — 2026-10-24

NOT MERGE READY. The user's second reference explicitly requires visible vertical
rules only at pinned boundaries. This supersedes the earlier ordinary internal
vertical-divider contract. Cells and headers now reserve transparent trailing
borders, retaining width/padding and content-box geometry. Horizontal row rules
and the stage frame remain visible. Removed per-cell suppression attributes and
the now-unnecessary paint helper; pure owner selection, clipping/opaque surfaces
and stacking stay. Body and headers share flex vertical centering with horizontal
start alignment. Core, identity, ARIA and native scroll/hit testing are unchanged.

The initial screenshot showed a center divider outside the one-pixel seam band.
An intermediate clipped-adjacency design passed 69 tests before the user clarified
that ordinary vertical borders should be absent. It was simplified before commit.
Final checks: 65 Playground tests, 11 Core tests, both typechecks, 9 policy tests
and standards PASS (0 errors/9 existing warnings). Replaced only obsolete per-cell
suppression expectations with unconditional transparent vertical-border checks;
retained owner, fractional-scroll, hit-testing, identity and ARIA regressions.
No executed check failed. Browser source updated/typechecked but NOT RUN.
No local browser/build/server, benchmark/performance or supervisor execution.
PR #4's current task explicitly prohibits native verification; other worktrees
and dependencies untouched. Final SHA, remote checks and canonical description
outcome are in delivery artifacts. User screenshots are pre-fix evidence, not
proof of corrected pixels. Actual glyph alignment, native scroll/Picker/AT and
independent browser/review acceptance remain missing. Keep PR #5 Draft/unmerged.
Performance HOLD. Production POC NO-GO. Earlier sections are historical.

## Current single-owner boundary candidate

NOT MERGE READY. This section supersedes historical integration/verification
statements below. Main `4f207d1` is now integrated by normal feature-branch merge
`05d6ad4`; journal/status conflicts retain both histories. Trusted PR #6 policy
files are unchanged from main. Main and PR #4 remain untouched.

Statically demonstrated cause: clipping leaves part of a center trailing border
inside its region next to the pinned separator. At a fractional scroll position
that partial pixel can combine with the pinned line. The fix assigns each inner
edge one pinned-region owner and suppresses complete cell-border intervals
intersecting its reserved one-pixel bands. Left and right are symmetric; when
pins meet the right alone owns the seam. Empty/full-viewport pins have no inner
separator. Border width and other internal dividers are retained. Regions have
clipped children, isolated stacking and opaque theme backing. Core untouched.

Changed source: `CoreTable.tsx`, `CoreDemo.module.scss`, new renderer-only
`pinned-boundaries.ts`; regressions in its new unit suite, CoreTable and compiled
SCSS suites; unexecuted browser cases in `e2e/core-inspection.spec.ts`. Specs:
`specs/features/GRID-CORE-V1.md` and `docs/GRID-CORE-ARCHITECTURE.md`, updated
before implementation. Status/journal preserve the previous work and limitations.

Using the bounded Nx commands/environment recorded below: Core tests PASS (11),
Playground PASS (65 in 11 files), standards-test PASS (9), both typechecks PASS,
standards PASS (59 source/3 style files; 0 errors/9 existing warnings).
Canonical parser/reporter/security suite PASS (157) using
`node --test --test-concurrency=1 .github/scripts/pr-description.test.mjs .github/scripts/pr-description-reporter.test.mjs`.
No test failure this turn, weakened assertion or dependency change. Whitespace
and exact change-set self-review completed before committing. Delivery artifacts
record final SHA, canonical body validation, GitHub status URLs and complete diff.

NOT RUN: local browser/Playwright, build/server, actual painted separators,
native scrolling, Chrome Element Picker, screen-reader acceptance, benchmarks,
performance or supervisor verification. Existing hosted CI selects baseline
browser tests, not the new core-inspection cases. LTR canvas behavior in RTL
hosts is covered statically; native RTL grid coordinates remain deferred. Themes
with translucent cells require an opaque `--core-surface`. Independent browser
evidence and review acceptance remain mandatory even if required CI is green.

Performance HOLD. Production POC NO-GO. Keep PR #5 Draft; do not merge.

## Historical checkpoint before this correction

Verdict: NOT MERGE READY. This record distinguishes verified source/DOM/style
contracts from required browser and integration acceptance.

## Root-cause assessment and fixes

The right pinned region had no independent leading-edge rule. Every cell drew
only a trailing border; the nearest center-cell border can be outside its clipped
viewport. Added a right-region pseudo-element to both header and body rows. It
is anchored to the region's leading edge, overlays backgrounds with z-index 1,
uses `--core-pinned-separator` → `--core-border` → default color, takes no layout
space and cannot intercept input. Zero-width/unpinned right regions omit it.
Actual pixels and themed visual contrast remain browser acceptance work.

The table had pointer-events:none, inherited by its cells. This is source-level
ordinary hit-test exclusion, consistent with the reported Picker symptom; Chrome
DevTools itself was not launched/reproduced. Merely enabling pointers on the old
sibling overlay would leave cell wheel/touch input outside the native scrollport.
Moved the semantic table inside the physical canvas/scrollport and made its
viewport layer sticky on both axes. Restored pointer-events:auto. The canvas is
no longer aria-hidden. No wheel forwarding, preventDefault, cell-size changes or
Core changes. Native scrolling and Picker success still require browser evidence.

The explicit LTR canvas is preserved inside RTL pages; logical CSS positioning
respects that contract. Full RTL grid geometry is still deferred. Existing theme
variables, ARIA positions, stable IDs, row windows and scroll mapping are retained.

Standards references: [pointer hit testing](https://www.w3.org/TR/css-ui-4/#pointer-events-control)
and [sticky positioning](https://www.w3.org/TR/css-position-3/#sticky-pos).

## Changed files and architectural review

- `specs/features/GRID-CORE-V1.md`: pre-code input, separator, layout and acceptance contracts.
- `apps/playground/src/app/core-demo/CoreDemo.module.scss`: sticky/hit-testable table and boundary pseudo-element.
- `CoreDemo.tsx` in the same folder: native scroll ancestry and accessible canvas.
- `CoreTable.tsx`: matching header/body boundary ownership on visible right regions.
- `CoreDemo.spec.tsx`, `CoreTable.spec.tsx`, new `CoreDemo.styles.spec.ts`: four new regressions.
- `apps/playground/e2e/core-inspection.spec.ts`: bounded browser regression source, NOT RUN.
- Architecture, project status, AI journal and this record: decisions, evidence and blockers.

Core remains framework-independent with ES2022-only production types, strict
generics, immutable geometry, original/visual column positions and stable IDs.
No new Core or data-source responsibility, networking, global mutable state or
dependency. Setup O(C); scroll O(log Ccenter); render-window work remains bounded
by viewport/overscan/pins. SOLID/KISS favors native DOM ownership over a new input
forwarding subsystem. No new styles outside SCSS Modules or lint suppressions.

## Executed bounded checks

For Nx commands, environment was NX_DAEMON=false, NX_NO_CLOUD=true,
NX_SKIP_REMOTE_CACHE=true, NX_SKIP_NX_CACHE=true, NX_ISOLATE_PLUGINS=false and
NODE_OPTIONS=--max-old-space-size=2048. Installed tools were reused through
worktree-local package links; caches and original workspace links were excluded.
No dependency install/update or pnpm auto-fetch attempt occurred.

| Exact command | Result |
| --- | --- |
| `node node_modules/nx/dist/bin/nx.js run @org/grid-core:typecheck --excludeTaskDependencies --skipSync --parallel=1` | PASS |
| `node node_modules/nx/dist/bin/nx.js run @org/playground:typecheck --excludeTaskDependencies --skipSync --parallel=1` | PASS, including E2E source types |
| `node node_modules/nx/dist/bin/nx.js run @org/grid-core:test --excludeTaskDependencies --skipSync --parallel=1` | PASS, 11 tests |
| `node node_modules/nx/dist/bin/nx.js run @org/playground:test --excludeTaskDependencies --skipSync --parallel=1 --args="--run --maxWorkers=1 --no-file-parallelism"` | PASS, 51 tests in 10 files |
| `node node_modules/nx/dist/bin/nx.js run @org/playground:standards-test --excludeTaskDependencies --skipSync --parallel=1` | PASS, 9 policy tests |
| `node node_modules/nx/dist/bin/nx.js run @org/playground:standards --excludeTaskDependencies --skipSync --parallel=1` | PASS, 50 source/3 style files; 0 errors, 9 existing warnings |
| `git diff --check` and staged equivalent | PASS |

Initial Playground run: FAIL at collection of the new style fixture, because
Vite rewrote the SCSS asset URL. The filesystem-path correction retained every
assertion; complete rerun passed. Nx's known native-cache permission warning used
the original module fallback. Unit suites used bounded escalation for previously
demonstrated sandbox temporary-file limitations. No existing tests were removed.

Compiled SCSS assertions check sticky logical offsets, hit testing, token
fallbacks, non-intercepting separator and absence of geometry-changing border.
DOM tests check header/body symmetry, native scroll ancestry, no aria-hidden
ancestor and uncancelled event propagation. These do not establish native browser
scrolling, painted separators, DevTools behavior or assistive-technology results.

NOT RUN: browser/Playwright, local build/server, screenshots, Element Picker,
screen-reader acceptance, benchmarks/stress/performance or supervisor verification.
Browser execution requires separately scoped safety authorization. The new E2E
source must not be treated as an executed test or silently added to browser CI.

## Main / PR #6 integration and canonical policy

Fetched main is `4f207d1186301a067af642c0530bde4769e02fd9`, the PR #6 squash.
PR #5's earlier head is `08cdf9b94b950559b64efb37a758488e43b66c95`. Read-only
`git merge-tree --write-tree HEAD origin/main` reports:

- Add/add conflict: `docs/AI-DEVELOPMENT-JOURNAL.md`.
- Content conflict: `docs/PROJECT-STATUS.md`.

No actual merge, rebase, force push or main edit was performed under the explicit
no-merge constraint. Both journal/status histories must be retained in a future
authorized synchronization. No source/config integration conflict was reported,
but local tests are feature-branch checks, not a validated conflict-free combined
merge candidate. Main's canonical five-section policy is mandatory. Its exact
trusted scripts can be exported from the fetched SHA for local body validation
without importing policy implementation into this branch or changing protections.

## GitHub verification and remaining blockers

No review threads, reviews or conversation comments were returned at inspection.
There is no independent approval in that evidence. Historical CI and Conventions
at `08cdf9b` passed, but cannot verify the new renderer patch. The delivery report
records the actual final commit, current-head DataGrid checks, Conventional commits
and PR description status and their URLs. Missing/pending checks are not PASS.

Merge blockers: unresolved main conflicts; missing authorized browser proof for
sticky layout, native scrolling, separator/themes and hit testing; remaining
accessibility acceptance; independent Tech Lead acceptance and all required
current-candidate checks. If GitHub denies description writes, supply the exact
validated canonical replacement text without an authentication bypass.

Performance HOLD. Production POC NO-GO. Keep PR #5 Draft. Do not merge.
