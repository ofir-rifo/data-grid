# DataGrid project status

Last reviewed: 2026-10-17. This handoff records the authorized four-phase preparation; future proposals are not authorization for new work.

## Objective and phase

Build a reusable, extensible, accessible React DataGrid with strong typing, consumer customization, and efficient large-data rendering. Core logic must remain independent of React, the DOM, and application infrastructure.

Current phase: playground POC-V1 for fixed-geometry 2D virtualization and fast-scroll investigation. The POC is **not formally VALIDATED** and is not production grid code.

## Repository checkpoint

- Repository: `C:\Users\ofirr\dev\table\data-grid`.
- Branch at CI preparation: `ci/datagrid-foundation`, based on `origin/main` at `3cc5b917f4fc55677cc877145ccb31630aec8ebc`. Recheck Git for the current tip.
- Checkpoint base: `524290a4574321c00c84617e504e21cfe9901e74` — `feat(playground): add scroll diagnostics and opt-in flushSync experiment`. The authorized checkpoint below records subsequent containment/regression/documentation work; use current Git history for the final checkpoint tip.
- Containment implementation checkpoint: `0820ed7cfd65dca590a59a150275c264403eeaec` — `fix(playground): contain virtualized cell overflow`.
- Regression/diagnostic checkpoint: `0133ac172d5b6c6c36bb14f93a0c9725e55d0ce3` — `test(playground): add flushSync regressions and scroll diagnostics`.
- Previous commit: `4e4bb47` — `feat(virtualization): implement single-scroll pinned column layout`.
- At the start of the four-phase task, `AGENTS.md` was modified and `docs/PROJECT-STATUS.md` was untracked from earlier documentation work. Those changes are preserved. Commit/push was prohibited during preparation; the user subsequently authorized the grouped checkpoint below. Recheck Git on resumption; historical checkpoint descriptions are not live state.

## Sources of truth

- [Project principles](../specs/000-project-principles.md): accepted engineering contract, spec-first development, testing, accessibility, and definition of done.
- [Architecture](../specs/001-architecture.md): completed draft describing intended package boundaries, existing POC architecture, scheduling trade-offs, evidence limits, and exit decision criteria; still a draft, not formal POC validation.
- [POC requirements](../specs/features/POC-V1-virtualization.md): proposed scope, correctness, performance, scalability, non-goals, and exit criteria.
- [Scroll investigation](../specs/features/POC-V1-scroll-investigation.md): historical measurements, their limitations, and the manual flushSync observation.
- [Agent instructions](../AGENTS.md): Nx conventions and resumption workflow.
- [Measurement preparation](PERFORMANCE-MEASUREMENT.md): controlled procedures, signal limits, and execution approval gates; no measurements run.
- [Roadmap](ROADMAP.md): source-backed requirements, proposed sequencing, and features needing further specification; no blanket implementation approval.
- [GRID-V1 foundation](../specs/features/GRID-V1-foundation.md): proposed first production slice, API/containment/accessibility contracts, acceptance tests, and approval gates; no production implementation authorization.

## Completed work and evidence

- **Implemented; confirmed by source inspection:** `apps/playground/src/app/virtualization/VirtualGrid.tsx` contains the single-scrollport POC, buffer query options, timing instrumentation, and opt-in flushSync. Geometry/render-window modules and unit-test sources live in its `engine/` directory.
- **Existing diagnostic coverage; inspected, not run here:** `apps/playground/e2e/example.spec.ts` covers large jumps and pinned behavior; `scroll-delay.spec.ts` and `virtualization-buffer-experiment.spec.ts` contain timing/coverage collection. Both originally exercised only default-mode URLs; the new delay-diagnostic selector is described below.
- **Regression sources and execution:** `apps/playground/e2e/flush-sync.spec.ts` covers absent/1/0 flags, reloads, final cell identities, ranges/counts, timing consistency, pinned alignment, both axes, edge clamping, and reversal; all four cases passed in the containment milestone. The delay diagnostic can select `GRID_FLUSH_SYNC=0` or `1`; unset retains the default URL. Its modified measurement workload remains unexecuted; the buffer diagnostic remains default-mode only.
- **Historical test results, not newly verified:** the investigation document reports 27 unit tests, typecheck, lint with four warnings, and 13 Chromium production tests passing. It says Firefox/WebKit were not run. These results predate the flushSync experiment and do not validate its current behavior.
- **Manual observation, 2026-10-17:** the user reported correct scrolling with `flushSync=1` and recurrence of the problem after disabling it. This is not a benchmark or cross-browser guarantee.
- **Workflow support implemented:** `.gitignore` excludes `_tmp_*`, `/ofir.md`, and `.pnpm-store/`; `Remove-TempFiles.ps1` supports preview with `-WhatIf`. The deleted Tunnel/MCP bridge is not a development prerequisite and must not be restored without approval.
- **Current verification:** the containment milestone passed targeted app/e2e no-emit typechecks, targeted lint (0 errors, 6 diagnostic warnings), two default/enabled containment cases, and all four flag/scroll regressions. Cell `overflow: clip` now prevents the measured 4px extension; the grid remains exactly 4,000,000px high and 120,000px wide in captured default/enabled layouts. Production foundation remains proposed; no builds, recordings, benchmarks, or performance measurements ran. Formal POC validation remains pending.

## Current virtualization architecture

- Logical grid: 100,000 rows × 1,000 columns; fixed 40px rows and 120px columns; initial viewport 1,000px × 600px.
- Pure fixed geometry and render-window calculation determine visible ranges; React renders the window with stable row/column identities.
- One native scrollport owns both axes. Two pinned columns per side use CSS sticky positioning within the same virtualized rows and share the logical row range with the center.
- Default row buffer: 400px; default column buffer: 0px. Query options allow other predefined values.
- Scroll events update position and viewport state; layout-effect instrumentation records event/render/commit timing and rendered positions in canvas data attributes.
- Intended production separation remains framework-independent `grid-core` and React/DOM `grid-react`; the playground POC does not establish completed production packages.

## flushSync decision and trade-off

Keep the experiment **off by default**. Only a query value exactly equal to `1` enables it: `?flushSync=1`, or `&flushSync=1` with existing parameters. The flag is read once per mount with a guarded lazy state initializer; reload after adding/removing it.

The scroll handler groups `setScrollPosition` and `setViewport` in one callback. When enabled, `flushSync` invokes it and synchronously flushes the update; otherwise it runs normally. `data-flush-sync-enabled` on `grid-canvas` exposes the mode. Existing timing instrumentation is retained.

The successful manual comparison supports further investigation, not a default-on or production decision. Synchronous work can occupy the main thread; its cost and behavior across workloads remain unmeasured for this experiment.

## Known issues, risks, and unfinished requirements

- Default-mode fast scrolling still has a user-reported issue. Hypothesis: browser event delivery and React state-to-DOM delay contribute; actual paint/compositor behavior is not established by animation-frame samples.
- Historical diagnostics observed uncovered pre-paint samples; these are not counts of painted blank frames. Increasing buffers is not a proven fix.
- Automated mode-comparison sources are prepared but unexecuted. Production performance, memory behavior, broader browser coverage, and POC scalability criteria remain unresolved.
- The POC requires bounded DOM behavior as logical dimensions increase to 1,000,000 rows / 10,000 columns. Browser maximum-height stretching is explicitly a separate investigation; larger datasets must not silently expand current scope.
- The architecture draft's unfinished section is completed, and stale investigation wording is reconciled with the committed experiment. Production architecture and POC validation remain pending despite documentation completion.
- POC section 19 requires a documented `VALIDATED` or `ARCHITECTURE CHANGE REQUIRED` result before production virtualization begins. Neither result is recorded.
- Sorting, filtering, selection, editing, keyboard navigation, accessibility, variable geometry, server data, AI, plugins, and workers are outside this POC; production requirements still apply when their features are specified.

## Recommended milestones — proposed, not an approved roadmap

1. Close fast-scroll investigation: cover both flushSync modes, then, only with explicit workload authorization, compare rendering and native-scroll paint/compositor evidence.
2. Complete the POC performance, memory, bounded-DOM, and scalability evidence required by POC sections 14–15, using separately approved resource limits.
3. Record the POC exit decision and required architecture trade-offs under section 19; reconcile the draft architecture before proposing production virtualization work.

## Authorized four-phase plan — progress

The user authorized regression coverage, measurement preparation (no execution), architecture documentation, and a specification-derived roadmap on 2026-10-17. This supersedes the earlier wait for approval to implement the regression proposal. Execution safety restrictions remain active.

- Phase 1: implemented `apps/playground/e2e/flush-sync.spec.ts` for absent/1/0 flags, reloads, both axes, combined/large jumps, edge clamping, return to origin, exact final cell identities, diagnostics, and all four pinned columns. Source reviewed; targeted typecheck/lint results are recorded below. Runtime verification remains pending. No application code changed.
- Phase 2: prepared `docs/PERFORMANCE-MEASUREMENT.md`; added a `GRID_FLUSH_SYNC` selector with input validation, comparison metadata, rAF callback-gap summary, and final actual DOM counts to `scroll-delay.spec.ts`. Existing application instrumentation is sufficient; no application changes or new samplers. Targeted typecheck/lint results are recorded below; all measurements remain pending.
- Phase 3: completed architecture draft sections 8–12 and reconciled stale investigation wording. Documents separate intended production boundaries, inspected POC behavior, historical checks, manual findings, unexecuted regressions, and pending exit evidence. No production architecture decision or formal POC validation is claimed.
- Phase 4: created `docs/ROADMAP.md` with source/status distinctions, proposed validation-first sequencing, and future core/React, accessibility, selection, editing, query, and extension design gates. No future production feature implemented.

All four authorized implementation/preparation phases are complete for review; runtime verification and formal POC validation are not complete. Existing `AGENTS.md` changes remain intact. Application code, defaults, and dependencies are unchanged; nothing is staged, committed, or pushed by this task.

## Static stabilization review — 2026-10-17

- Completed the authorized source/specification/diff review without execution. Preserved the existing uncommitted four-phase work and `AGENTS.md` instructions.
- Regression fixes: added enable → disable → remove navigation coverage and small movements; explicitly assert committed offsets in the collected snapshot and require an event-ID attribute before numeric conversion. Existing large jumps, edge/reversal, all pinned cells, and timing consistency remain covered in source.
- Diagnostic fixes: validate the selector at test execution rather than collection; capture pending commit state before observer disconnection; provide idempotent cleanup on success/failure; derive enabled-mode metadata from the canvas; validate finite committed metrics; assert atomic final native/committed offsets and coverage instead of a potentially older rAF sample.
- Measurement definition: schema version 2 retains earlier keys/arrays and adds metadata/snapshots. Programmatic write time now precedes the setter, including setter work; do not directly compare this latency with old post-setter timestamps. No performance improvement is inferred.
- Documentation review aligned the architecture, roadmap, investigation, and measurement plan with the corrected sources and current approval boundaries. Accepted principles, proposed POC scope, and draft architecture retain their statuses.
- Remaining risks: asynchronous wheel delivery/momentum can outlast collection; observer coalescing and instrumentation affect samples; final snapshots are not peak DOM, memory, or paint evidence. The fixed-geometry oracle and pixel alignment checks are intentionally POC-specific and still require browser verification.
- No clear Playwright API misuse or TypeScript error was established by static inspection. Local Playwright declaration files were not found at the inspected standard paths, so API/type compatibility is not verified. No tests, builds, typecheck, lint, browsers, or traces ran; whitespace and relative-link checks are the only mechanical verification allowed here.

## Controlled verification Phase 1 — 2026-10-17

The user authorized one targeted typecheck followed by one targeted lint, sequentially, with at most one retry of a failed check after a fix. The computer was reported to be operating normally; previous memory-related BSODs remain undiagnosed and are not confirmed resolved. Commands exited normally without an apparent hang or instability; peak total memory and machine-wide stability were not measured.

Every pnpm invocation below used these process-local environment settings (not persisted to repository or user configuration):

```powershell
$env:NX_DAEMON='false'
$env:NX_NO_CLOUD='true'
$env:NX_SKIP_REMOTE_CACHE='true'
$env:NX_SKIP_NX_CACHE='true'
$env:NX_PARALLEL='1'
$env:NX_ISOLATE_PLUGINS='false'
$env:NODE_OPTIONS='--max-old-space-size=2048'
$env:CI='true'
```

The 2 GB setting caps each Node process's old-space heap, not total process or machine memory. Tasks ran one at a time; Nx daemon, Cloud, remote cache, task dependencies, and automatic sync were disabled. No tests/build targets were invoked.

Command discovery:

```powershell
pnpm nx show project @org/playground --json
```

The initial sandbox attempt failed before Nx started with `canonicalizing the --dir argument ... Access is denied`. The same read-only command succeeded outside the sandbox. Resolved targets: typecheck normally runs `tsc --build --emitDeclarationOnly` with dependency typechecks/sync generators; lint runs `eslint .`. The controlled invocations override those commands to avoid declaration emission, unrelated prerequisites, and broader lint scope. Nx option support was inspected in installed Nx source.

First typecheck attempt (exit 1; Nx task duration 716ms):

```powershell
pnpm nx run @org/playground:typecheck --excludeTaskDependencies --skipSync --skipNxCache --parallel=1 --command="tsc --project tsconfig.e2e.json --noEmit --incremental false --composite false"
```

Failed with TS5069: inherited `declarationMap` and `emitDeclarationOnly` conflict with disabling `composite` without `declaration`. This was an invocation configuration issue, not a reported source error. No source/configuration file was changed.

Single corrected retry (exit 0; Nx task duration 759ms):

```powershell
pnpm nx run @org/playground:typecheck --excludeTaskDependencies --skipSync --skipNxCache --parallel=1 --command="tsc --project tsconfig.e2e.json --noEmit --incremental false --composite false --declarationMap false --emitDeclarationOnly false"
```

Passed. Scope: `apps/playground/tsconfig.e2e.json` includes `e2e/**/*.ts`, `e2e/**/*.js`, and `playwright.config.mts`. This establishes targeted type compatibility for the test sources/configuration, not a full application/monorepo typecheck, runtime test execution, or production build.

Single lint invocation (exit 0; Nx task duration 2.3s):

```powershell
pnpm nx run @org/playground:lint --excludeTaskDependencies --skipSync --skipNxCache --parallel=1 --command="eslint e2e/flush-sync.spec.ts e2e/scroll-delay.spec.ts"
```

Passed with 0 errors and 6 `playwright/no-conditional-in-test` warnings in `scroll-delay.spec.ts`: line 65; line 66 twice; lines 159, 261, and 264. These concern diagnostic selector validation, input-mode branching, optional write matching, and report labels. They remain documented; no suppressions or unrelated refactoring were added. A separate Node color-environment warning was non-fatal. Lint was not rerun because it passed. `flush-sync.spec.ts` reported no lint findings.

Only this status document was edited in this verification phase. All pre-existing changes were preserved. No dependency installation, Playwright invocation, browser, app build, benchmark, performance trace, commit, push, reset, or discard was performed. Historical four-phase documents describing unexecuted typecheck/lint reflect the earlier preparation point; this dated record supersedes those statements for the exact targeted scope above. Runtime scrolling and formal POC validation remain pending.

## Controlled verification Phase 2 — 2026-10-17

Authorization: exactly one Chromium smoke test, one worker, no retries, no builds or recordings, at most 60 seconds; inspect a failure and make a small test-only correction without rerunning. BSOD cause remains undiagnosed. No apparent hang or instability occurred during the run; this does not establish machine stability or peak memory usage.

Selected test: `apps/playground/e2e/flush-sync.spec.ts` → `flushSync POC regression` → `enabled: flag, final coverage, diagnostics, and pinned alignment` (line 164 before the correction). The navigation-only case is shorter but does not check final coverage; the three mode-specific cases have the same workload, so enabled mode was selected. `--grep=enabled:` selects only that case, not absent/disabled or navigation.

Inspected configuration uses Vite development serve on port 4200 when `GRID_TEST_PRODUCTION` is not `1`. Installed Chromium revision 1243 was available. Video is not enabled by this file/config/preset; the other diagnostic file that enables video was not selected. Trace was explicitly disabled and line reporting avoided HTML-report browser opening. The existing development-server reuse setting remained enabled; no claim is made that a fresh server was started or an unrelated existing server was terminated.

The run inherited the Phase 1 environment settings above, plus these process-local overrides:

```powershell
$env:GRID_TEST_PRODUCTION='0'
$env:BASE_URL='http://localhost:4200'
$env:PLAYWRIGHT_HTML_OPEN='never'
$env:PWDEBUG='0'
```

Exact test command:

```powershell
pnpm nx run @org/playground:e2e --excludeTaskDependencies --skipSync --skipNxCache --parallel=1 --args="flush-sync.spec.ts --project=chromium --workers=1 --retries=0 --trace=off --global-timeout=50000 --timeout=30000 --reporter=line --grep=enabled:"
```

A hidden PowerShell child ran that command with a 60,000ms `WaitForExit` watchdog; if exceeded, only its process tree would be terminated. Playwright's internal global limit was 50,000ms and test limit 30,000ms. One browser instance/worker was requested; Chromium's normal subprocess architecture is not a single OS process. Node old-space heap was capped at 2 GB per process, not total browser/machine memory.

Result: **FAIL**, exit 1; Playwright reported `Running 1 test using 1 worker` and `1 failed`. Nx task duration 4.7s; outer elapsed 6.6s, watchdog not triggered. At the bottom-edge check, the native `scrollTop` was `3999402`, while the oracle computed `3999406` from the later `scrollHeight - clientHeight`. Earlier jumps completed their assertions; the bottom checkpoint and return-to-origin were not fully verified. No passing enabled-mode regression is claimed.

Failure context: `apps/playground/test-output/playwright/output/flush-sync-flushSync-POC-r-b22de-ostics-and-pinned-alignment-chromium/error-context.md` (ignored generated output; no video or trace was found in that test's output directory). The assertion compared an assigned scroll offset with a maximum measured after destination rendering. Those layout checkpoints need not share identical scrollable overflow; the precise source of the 4px difference was not independently measured.

Small correction: `checkJump` now records the maximum and browser-applied position in the assignment evaluation, checks native clamping against that checkpoint, then checks committed/final offsets against the applied position. The later final-cell/range/count and pinned-alignment checks remain intact. It adds no tolerance and changes no application code. **No rerun, typecheck, or lint followed this correction.** The Phase 1 typecheck/lint results predate it.

Only `flush-sync.spec.ts` and this status document were edited in Phase 2; existing changes were preserved. No install, build, benchmark, performance measurement, trace/video capture, commit, push, reset, or discard was performed. The POC is not formally validated.

## Controlled verification — corrected clamp smoke rerun, 2026-10-17

Static review found the correction sound for assignment-time clamping: it still checks applied native offsets against `min(requested, maximum)` at assignment, then verifies unchanged final offsets, committed state, exact cells/ranges/counts, diagnostics, and pinned alignment. No tolerance or assertion removal was used. It does not establish invariant post-render overflow or independently explain the original 4px geometry difference; those remain investigation gaps rather than silently accepted application behavior.

The user separately authorized exactly one rerun under the same safety limits. No test or application code was changed in this follow-up; only this status document was updated.

Exact command:

```powershell
pnpm nx run @org/playground:e2e --excludeTaskDependencies --skipSync --skipNxCache --parallel=1 --args="flush-sync.spec.ts --project=chromium --workers=1 --retries=0 --trace=off --global-timeout=50000 --timeout=30000 --reporter=line --grep=enabled:"
```

Environment: the same process-local Nx/Node and development-server overrides recorded in Phases 1–2; Nx daemon/Cloud/remote cache disabled, Node old-space capped at 2 GB per process, development URL `http://localhost:4200`, installed Chromium, one worker, zero retries, trace/video off, no HTML reporter opening. Same 50s global / 30s test timeout and 60s process-tree watchdog. No build, install, diagnostic measurement, benchmark, or broader suite was invoked.

Result: **PASS**, exit 0; Playwright reported `Running 1 test using 1 worker` and `1 passed (1.4s)`. Selected case: `flush-sync.spec.ts:174` → `flushSync POC regression` → `enabled: flag, final coverage, diagnostics, and pinned alignment`. Nx task duration 2.1s; outer elapsed 3.99s, watchdog not triggered. No apparent instability was observed; BSOD cause remains undiagnosed and no machine-wide stability or peak-memory guarantee follows.

Passing scope: enabled flag/reload, small and large vertical/horizontal/combined programmatic jumps, assignment-time edge clamping, reversal, committed diagnostics, exact final cell coverage, and pinned alignment for this single development/Chromium run. Not verified: absent/0 modes, cross-mode navigation case, other browsers, repeatability, production behavior, native-wheel/paint behavior, post-render overflow stability, memory/scalability, or performance. Phase 1 typecheck/lint predates the clamp correction and was not rerun. The POC remains **not formally VALIDATED**. Execution stopped after this pass; no commit/push or additional run.

## Controlled verification — default-mode Chromium smoke, 2026-10-17

Reviewed the absent-mode case: it navigates to `/`, expects `data-flush-sync-enabled="false"` before/after reload, and uses the same final-state coverage, assignment-time clamping, diagnostics, and pinned-alignment assertions as enabled mode. No test or application changes were needed.

Exactly one authorized test was run:

```powershell
pnpm nx run @org/playground:e2e --excludeTaskDependencies --skipSync --skipNxCache --parallel=1 --args="flush-sync.spec.ts --project=chromium --workers=1 --retries=0 --trace=off --global-timeout=50000 --timeout=30000 --reporter=line --grep=absent:"
```

Environment: same process-local settings as the prior enabled-mode pass: `NX_DAEMON=false`, `NX_NO_CLOUD=true`, `NX_SKIP_REMOTE_CACHE=true`, `NX_SKIP_NX_CACHE=true`, `NX_PARALLEL=1`, `NX_ISOLATE_PLUGINS=false`, `NODE_OPTIONS=--max-old-space-size=2048`, `CI=true`, `GRID_TEST_PRODUCTION=0`, `BASE_URL=http://localhost:4200`, `PLAYWRIGHT_HTML_OPEN=never`, and `PWDEBUG=0`. One Chromium worker, zero retries, no trace/video, Vite development configuration, 50s global / 30s test limit, and 60s outer process-tree watchdog. Node heap cap is per process, not total machine/browser memory.

Result: **PASS**, exit 0; Playwright reported `Running 1 test using 1 worker` and `1 passed (1.3s)`. Selected case: `flush-sync.spec.ts:174` → `flushSync POC regression` → `absent: flag, final coverage, diagnostics, and pinned alignment`. Nx task duration 2.0s; outer elapsed 3.84s, watchdog not triggered. No apparent instability occurred; previous BSODs remain unexplained.

This establishes final-state correctness for one default-mode development/Chromium run, not absence of transient painted blank frames or a comparison of scrolling performance. No suite expansion, rerun, build, install, measurement, benchmark, recording, application change, commit, or push occurred. Only this status document was edited; existing changes were preserved. Explicit `flushSync=0`, cross-mode navigation, repeatability, other browsers/production, post-render overflow, paint, memory, and scalability remain unverified. The POC is not formally validated.

## Bounded Chromium regression batch — 2026-10-17

Reviewed `AGENTS.md`, current status, POC correctness requirements, the test cases, and Playwright configuration before execution. The user authorized the remaining cases sequentially, maximum six invocations and approximately five minutes cumulative execution, with at most one affected-case rerun after a justified test correction. No failure occurred, so no corrections or reruns were needed; the already-passing enabled case was skipped.

Exact commands, executed in this order:

```powershell
pnpm nx run @org/playground:e2e --excludeTaskDependencies --skipSync --skipNxCache --parallel=1 --args="flush-sync.spec.ts --project=chromium --workers=1 --retries=0 --trace=off --global-timeout=45000 --timeout=30000 --reporter=line --grep=absent:"
pnpm nx run @org/playground:e2e --excludeTaskDependencies --skipSync --skipNxCache --parallel=1 --args="flush-sync.spec.ts --project=chromium --workers=1 --retries=0 --trace=off --global-timeout=45000 --timeout=30000 --reporter=line --grep=disabled:"
pnpm nx run @org/playground:e2e --excludeTaskDependencies --skipSync --skipNxCache --parallel=1 --args="flush-sync.spec.ts --project=chromium --workers=1 --retries=0 --trace=off --global-timeout=45000 --timeout=30000 --reporter=line --grep=navigation"
```

| Selected Chromium case | Result | Playwright duration | Outer invocation elapsed |
| --- | --- | --- | --- |
| `absent: flag, final coverage, diagnostics, and pinned alignment` | PASS, exit 0 | 1.3s | 3.92s |
| `disabled: flag, final coverage, diagnostics, and pinned alignment` | PASS, exit 0 | 1.4s | 3.32s |
| `navigation reinitializes the flag when enabling, disabling, and removing it` | PASS, exit 0 | 953ms | 2.86s |

Total: **3 invocations, 3 tests passed, 0 failed, 0 retries/reruns**, approximately 10.10s cumulative outer execution. Every invocation reported one test using one worker. No signs of instability appeared; this is not a diagnosis or proof that earlier BSODs are resolved.

Resource settings were the same process-local Nx/Node/development overrides recorded above: daemon and Cloud disabled, remote/local cache bypassed, one Nx task and Playwright worker, `NODE_OPTIONS=--max-old-space-size=2048`, `GRID_TEST_PRODUCTION=0`, and `BASE_URL=http://localhost:4200`. A 50,000ms outer process-tree watchdog covered each full invocation; Playwright's global timeout was 45,000ms and per-test timeout 30,000ms. These tighter internal limits leave shutdown time within the per-invocation budget. One Chromium instance at a time was requested; normal browser helper processes still exist. The Node setting caps per-process old-space heap, not browser or total system memory.

Trace was explicitly off. Installed Playwright defaults and inspected test/config/preset leave video and screenshots off; no snapshot assertions were selected, and the separate video-enabled diagnostic file was not run. Line reporting prevented HTML-report browser opening. Existing development-server reuse was retained; no production build or fresh-server provenance is claimed. Only non-fatal Node color-environment warnings appeared.

Evidence consolidation against POC-V1:

- Section 13 requirements 1–10 have final-state support at the selected fixed-geometry positions: exact rendered cell identities/ranges cover visible rows and center columns, retain pinned columns, exclude extra cells outside the window, and keep pinned positions/alignment consistent. This is tested-position evidence, not an all-times guarantee.
- Section 12 large-jump behavior and section 15 scroll/pinned behavior have support for programmatic vertical, horizontal, combined, edge-clamped, and reverse jumps in absent/disabled modes here and enabled mode in its prior passing smoke. Small movements and reload flag state are also covered.
- The cell-count bound supports bounded DOM at this fixed dataset/viewport only. It does not establish invariance under larger logical dimensions, peak DOM/memory, initial-render cost, or POC section 14–15 performance/scalability requirements.
- Navigation confirms enabled → explicit-disabled → absent flag initialization across page navigations. It is not a test of changing query parameters without remounting, which the implementation does not promise.

No application/test code or dependencies changed in this batch; only this status document was edited. Existing uncommitted work was preserved; no builds, benchmarks, traces, installations, commits, pushes, reset, or discard occurred. Remaining gaps: native wheel/trackpad and transient paint behavior, unexplained 4px post-render overflow, production/other browsers, broader repeatability, memory/performance/scalability, and a post-correction typecheck/lint. No claim is made that final coverage proves absence of transient painted blanks. The POC remains **not formally VALIDATED**. Batch execution is complete and stopped for review.

## POC closure investigation — source/evidence review, 2026-10-17

No browser, test, build, benchmark, trace, or dependency installation ran in this investigation. Existing source, the saved initial failure log, and two saved historical diagnostic summaries were inspected. Only this status document was changed; all existing work and default-off flushSync were preserved.

### The 4px discrepancy: evidence and classification

Evidence:

- The original failure log (`%TEMP%/datagrid-smoke-3d714f5eac0744938212e5c545ce7a6a.stdout.log`) records native offset `3999402` versus a later computed maximum `3999406`. It does not record pre-assignment `scrollHeight`/`clientHeight`, computed line height, or descendant text bounds. The old test compared different layout checkpoints.
- `VirtualGrid.tsx` fixes canvas height to `100000 * 40 = 4000000` (lines 152, 348), and rows/cells to 40px. All cell regions use 120px border-box width, 8px padding, and 1px bottom/right borders (lines 184–197, 225–238, 253–266). Their text is `R{row} C{column.columnId}`. No cell clipping, nowrap, explicit font, or line-height is specified.
- `src/styles.scss` is only a comment; `index.html` adds no typography rule; `app.tsx` renders `VirtualGrid` directly. The unrelated `nx-welcome.tsx` component's embedded styles are not rendered through this app. The scrollport alone has `overflow: auto`; the debug overlay is its sibling, not its content.

Leading hypothesis (**moderate confidence; exact cause unconfirmed**): labels wrap onto two lines and their visible text/line-box overflow enlarges scrollable overflow when the last logical row is mounted. Border-box dimensions constrain the cell box, not necessarily overflowing content. A 40px cell with 16px vertical padding and a 1px bottom border has 23px content height. If the inherited line box is 18px, two lines occupy 36px and reach `8 + 36 = 44px` from the cell top: 4px past its 40px box. A row away from the logical bottom can overflow into the existing canvas; the last row can extend the scrollport's total overflow. These font/wrapping values were not measured and must not be presented as observed.

Conditional consistency check, not a measurement: if client height was 598px (600px outer height minus its two borders, with no scrollbar-height subtraction), the nominal maximum is `4000000 - 598 = 3999402`; a 4px content extension gives `4000004 - 598 = 3999406`. This exactly fits the logged numbers, but actual viewport metrics are missing. Borders explain a baseline size adjustment, not independently the dynamic 4px extension. Other overflow or viewport changes cannot yet be excluded.

Classification:

- **Test-measurement defect: high confidence.** It assumed a maximum computed after rendering must equal the earlier applied clamp. The corrected test checks assignment-time clamping and unchanged applied/final/committed offsets without adding tolerance; exact cells and alignment still have passing evidence.
- **Expected browser response to visible descendant overflow: plausible mechanism, not proven cause.** A fixed canvas height alone does not establish invariant scrollable content bounds.
- **Potential POC presentation/geometry defect: unresolved.** If text actually extends past the fixed row/canvas, the browser can behave correctly while the renderer lacks a defined content-containment policy. The passing corrected test does not rule that out or verify that the current post-render physical maximum was reached. No virtualizer/indexing defect is established by the log. No application change or production containment policy is approved here.

### Acceptance inventory

Status meanings: **Verified** is scoped to the recorded Chromium/development checkpoints or explicit source inspection; **Partially verified** has narrower/historical evidence than the full requirement; **Pending** lacks adequate evidence. None implies all browsers, all times, or production approval.

POC sections 2–12 implementation/scope:

| Requirement | Status | Evidence / limit |
| --- | --- | --- |
| Dataset 100,000 × 1,000; fixed 40px/120px geometry; deterministic initial 1,000 × 600 viewport (§§2–4) | Verified | Source constants inspected; passing tests use actual client dimensions. Larger datasets are not exercised. |
| Logical 2D render window; configurable 10-row-equivalent default overscan; no default column overscan (§§5–7) | Partially verified | Source and exact default-buffer cell/range checks pass; alternate query buffer settings have only historical diagnostic coverage. |
| Two pinned columns each side sharing the row range (§8) | Verified | Exact identities and all four pinned positions/alignment pass at selected checkpoints. |
| Stable logical identity independent of DOM position (§9) | Partially verified | Source keys/identities and cell checks support this; persistent production interaction state is outside the POC. |
| Render only calculated window, bounded visible DOM (§10) | Verified at tested checkpoints | Exact identity set and ≤360-cell assertion pass; not an independent scalability result. |
| Both axes and simultaneous scrolling (§11), large jumps (§12) | Verified for programmatic final state | Small/large jumps, edges, reversal, all flag modes pass; native fast-scroll/transient behavior remains partial. |

Every section 13 correctness criterion is classified below. The specification says "at every tested scroll position"; these statuses refer to final settled checkpoints in the recorded tests, not every intermediate painted frame.

| §13 criterion | Status | Evidence |
| --- | --- | --- |
| 1. All visible rows rendered | Verified, scoped | Exact final cell identities and expected row range. |
| 2. All visible center columns rendered | Verified, scoped | Independent fixed-geometry center-column oracle and exact identities. |
| 3. Pinned columns remain rendered | Verified, scoped | All four pinned identities expected in every rendered row. |
| 4. No visible cell missing | Verified, scoped | Exact expected/actual cell set equality. |
| 5. No cell outside render window | Verified, scoped | Same equality excludes extra cells. |
| 6. Correct row indices | Verified, scoped | Expected row IDs are constructed independently. |
| 7. Correct column indices | Verified, scoped | Center indices map to logical IDs after two left-pinned columns; all pin IDs checked. |
| 8. Pinned/center share logical rows | Verified, scoped | Expected row/cell sets plus visible-row alignment. |
| 9. Horizontal scroll leaves pins fixed | Verified, scoped | All four pin x positions checked against viewport edges after jumps. |
| 10. Vertical scroll keeps regions synchronized | Verified, scoped | Shared logical rows and matching visible-cell y positions. |

Section 14 required measurements:

| Measurement | Status | Evidence / gap |
| --- | --- | --- |
| Total rendered cells, rows, columns | Verified, scoped | Exact final counts/ranges and diagnostic count attributes in passing cases. No peak/time-series claim. |
| Initial render time | Pending | No current initial-render measurement. |
| Render-window update time | Partially verified | Current tests check timing-field consistency, not speed; saved pre-flushSync calculation/commit timings exist. |
| React render count where measurable | Pending | Observed commit samples/event IDs are not component invocation counts. |
| Normal-scroll response | Partially verified | Programmatic small moves pass; manual observations and historical wheel diagnostics are narrower evidence. |
| Fast-scroll response | Partially verified | Manual enabled-mode improvement and historical diagnostics; no current controlled native/paint evidence. |
| Large-jump latency | Partially verified | Final correctness passes, but no current latency characterization/decision. Test duration is not jump latency. |
| Approximate memory behavior | Pending | No controlled memory observations for this revision. BSODs are not diagnosed by smoke-test success. |
| Bounded DOM over movement | Partially verified | Bounds pass at selected fixed-dataset checkpoints; no comprehensive peak/scaling observation. |

Section 15 success criteria:

| Criterion | Status | Remaining gap |
| --- | --- | --- |
| Correctness: cells always match render window | Partially verified | Final checkpoints pass; transient native scrolling and overflow remain unresolved. |
| DOM scales with viewport + overscan, not logical size | Partially verified | Fixed-dataset count bound only; independent dimension/viewport variation pending. |
| 2D scalability: 1,000,000 rows and 10,000 columns | Pending | No recorded scaling run; browser maximum-height limits require a separately scoped plan under §17. |
| Scroll behavior: large jumps without stale rows/columns | Partially verified | Final-state jumps pass; continuous responsiveness/native paint not established. |
| Pinned behavior: synchronized with center | Verified, scoped | Programmatic final states pass; native-motion evidence still belongs to scroll validation. |

Section 19 exit questions:

| Question | Status | Assessment |
| --- | --- | --- |
| 1. Render-window model correct? | Partially verified | Strong final-state evidence at fixed geometry; not universal validation. |
| 2. Fixed geometry fast enough? | Partially verified | Historical low calculation times; no reviewed current performance decision or agreed responsiveness criterion. |
| 3. DOM count bounded as expected? | Partially verified | Tested counts bounded; requested logical scaling not demonstrated. |
| 4. Responsive during fast 2D scrolling? | Partially verified | Manual improvement, no controlled current native/paint result. |
| 5. Pinned architecture synchronized? | Verified, scoped | Logical/final positional checks pass in all modes. |
| 6. Unexpected React rendering costs? | Partially verified | Historical commit-stage timings, no current production/flushSync cost evidence. |
| 7. Architecture changes before production? | Pending | Containment and scheduling policy need an explicit evidence-backed decision. |

§16 non-goals remain excluded, §17 massive-row stretching remains separate, and §18 architectural direction is supported by source inspection. They are scope constraints, not additional evidence of runtime completion. §19's formal outcome is **pending**, neither `VALIDATED` nor `ARCHITECTURE CHANGE REQUIRED` at this point.

### Existing diagnostics and minimum closure work

Two existing `apps/playground/test-output/scroll-delay-production/*/scroll-delay.json` summaries were read, not regenerated: each reports 60 events/commits and 60 uncovered rAF samples; calculation maxima are about 0.1ms. They support the earlier investigation's historical account. Their mode/build provenance is not newly established, their old write-time definition differs, and they contain no bottom-row text overflow/line-height measurements. They cannot resolve the 4px cause or validate the current experiment.

Minimum remaining verification, each requiring separate bounded authorization where execution is involved:

1. **One targeted layout diagnosis, not another regression batch:** capture assignment/post-commit scrollHeight, clientHeight, offsets, last-row/cell boxes, text line boxes, computed typography/overflow, and current flag at a middle and bottom position. Determine which descendant extends the canvas, or identify a different viewport/overflow cause. Decide and specify any fixed-row content-containment requirement before an application fix. No such capture ran here.
2. **One controlled current-revision native-scroll comparison:** fixed workload, same browser/viewport, baseline and enabled flag; inspect actual visible behavior and event/render/commit evidence together. A short screenshot/paint recording is only needed if the visual question remains unresolved and is explicitly permitted; rAF samples alone cannot close it. Agree useful responsiveness criteria first rather than retrofitting arbitrary thresholds.
3. **A small rendering/DOM/memory evidence pass:** cover initial render, window updates, render/commit counts as distinguishable, fixed checkpoints over motion, approximate memory/retention, and independent logical-dimension increases required by §15. Reuse existing instrumentation; serial runs with explicit memory/time stop conditions. Production scheduling-cost evidence needs a separately approved fresh build; do not infer it from development or historical results. Browser-height stretching cannot be silently implemented to satisfy the million-row case; document the constraint and obtain a scope/architecture decision if encountered.
4. **Close the revision/checkpoint record:** targeted typecheck/lint of the clamp correction (the previous passes predate it), evidence provenance and limitations, then answer all seven exit questions and record the formal decision. Do not repeat already-passing regressions unless code changes or a specific unresolved concern justifies it. Additional browser matrices are production-risk work unless a supported-browser decision makes them required for this POC.

This is an irreducible evidence list derived from §§14–15/19, not permission to execute or an assertion that all items fit one smoke test. If safety prevents collection, leave the outcome pending; do not silently waive requirements to start production implementation.

### Practical production handoff and decision

Recommendation: retain **POC decision pending** and keep flushSync default-off. The evidence does not yet justify either universal validation or a fundamental architecture rejection. The likely containment issue may be a localized renderer concern; treat it as a potential defect until confirmed rather than redesigning the pure geometry engine from the log alone.

While waiting for safe verification, a separately approved documentation-only task can specify the first production slice: public boundaries for framework-independent geometry/window/identity in `grid-core`, and a minimal `grid-react` adapter with explicit fixed-row content, scrolling, styling, and accessibility contracts. Reuse the POC's proven calculations/acceptance patterns without promoting its debug renderer or experimental default into a production contract. Do not invent selection/editing/query APIs or implement them ahead of their feature specifications.

Once the required evidence supports a documented exit result and the first-slice specification is approved, begin that narrow production slice with strict package boundaries and its acceptance tests. If evidence requires an architecture change, document and approve that change first. Production implementation must wait for the §19 decision; preparatory specifications may proceed only under their own approved scope.

Single next proposed milestone: a separately authorized, minimal last-row layout capture to confirm or reject the wrapped-text overflow hypothesis and decide whether a containment correction is needed. No application/test change was made in this investigation. Existing browser regressions were not repeated.

## Authorized final-row diagnostic and foundation draft — 2026-10-17

Both authorized workstreams are complete. One focused layout diagnostic was prepared and executed; the foundation specification was written without production code or an application change. Earlier hypothesis-only statements above are historical; the captured evidence below supersedes the uncertainty about the source of overflow for this environment.

### A. Captured layout evidence

New diagnostic: `apps/playground/e2e/row-overflow.spec.ts`, one test named `captures final-row text and scrollable overflow`. It reads scroll/canvas/row/cell/text geometry, computed typography and overflow, and committed offsets at a middle baseline, immediately after assigning the bottom position, and after row 99999 mounts. It performs no style mutation, assumes no 4px result, and saves/attaches `row-overflow.json`.

Exact invocation (only one; no rerun):

```powershell
pnpm nx run @org/playground:e2e --excludeTaskDependencies --skipSync --skipNxCache --parallel=1 --args="row-overflow.spec.ts --project=chromium --workers=1 --retries=0 --trace=off --global-timeout=45000 --timeout=30000 --reporter=line"
```

Environment: same process-local settings as the bounded batch (Nx daemon/Cloud/cache off; one worker; Node old-space 2048 MB; CI=true; `GRID_TEST_PRODUCTION=0`; `BASE_URL=http://localhost:4200`; HTML auto-open/debug off). Trace explicitly off; video/screenshots not enabled. A 50s outer process-tree watchdog bounded the whole invocation; Playwright global timeout 45s, test timeout 30s. No production build, install, benchmark, or performance recording ran.

Result: **PASS**, exit 0, `Running 1 test using 1 worker`, `1 passed (1.1s)`; Nx task duration 1.8s, outer elapsed 3.87s. Watchdog not triggered; no apparent machine instability. Previous BSOD cause remains undiagnosed. New diagnostic was not separately typechecked/linted; its browser execution is not a substitute for those checks.

Evidence file (ignored output, may be replaced by future Playwright runs): `apps/playground/test-output/playwright/output/row-overflow-captures-final-row-text-and-scrollable-overflow-chromium/row-overflow.json`. Essential values are preserved here:

| Stage | Final row mounted | scrollHeight | clientHeight | Maximum top | Applied top | Committed top | Canvas bottom |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Middle committed | No; last rendered row 50024 | 4000000 | 598 | 3999402 | 2000000 | 2000000 | 4000000 |
| Bottom assignment before commit | No; row 50024 still last | 4000000 | 598 | 3999402 | 3999402 | 2000000 | 4000000 |
| Final row committed | Yes; row 99999 | 4000004 | 598 | 3999406 | 3999402 | 3999402 | 4000000 |

All nine mounted final-row cells (four pinned and five center) have 40px box height, box bottom 4000000, `clientHeight=39`, `scrollHeight=44`, visible overflow, normal wrapping, 8px vertical padding, a 1px bottom border, and 16px Times New Roman with computed `line-height: normal`. Row bottom also remains 4000000. Representative `R99999 Ccolumn-0` text rectangles occupy two vertical bands, top coordinates 3999968 and 3999986 (18px apart); their glyph bounds end at 4000003, 3px beyond the cell/canvas. Range rectangles are text fragments, not one rectangle per line; the grouped vertical bands establish the wrapping. The measured cell scroll extent reaches 44px, explaining the 4px scrollable extension; glyph bounds need not equal line-box overflow bounds.

Conclusion: **high confidence, in this Chromium/development run, wrapped final-row cell content extends scrollable overflow by 4px**. Client height and canvas/row boxes do not change, ruling out viewport resizing or canvas-size changes for this observation. Two-line text with line starts 18px apart and 8px top padding is consistent with a 44px line-layout extent in a 40px cell; computed line height remains `normal`, not an explicitly reported 18px CSS value. No clipping/nowrap counterfactual was performed, so this is converging geometric evidence rather than an isolated CSS-toggle experiment.

Classification: normal browser accounting of visible descendant overflow exposes a **confirmed POC cell-content containment/scroll-geometry issue**. The earlier test also had an independent checkpoint-oracle defect. The corrected regression appropriately verifies assignment-time clamping; it does not remove or resolve the application overflow. No render-window indexing defect or need to redesign the pure engine is indicated by this evidence. A containment policy and application correction still need explicit approval; no implementation was changed.

### B. Production foundation specification

Created `specs/features/GRID-V1-foundation.md` (Proposed, v0.1). It distinguishes accepted principles/package boundaries from proposed first-slice contracts: generic local rows/typed columns, pure fixed geometry/window logic in core, minimal React integration, scoped styling, fixed-cell content containment, initial semantics/keyboard/focus behavior, public API boundaries, and acceptance criteria F1–F10 with required future tests.

New choices such as clipped single-line defaults, validation/error policy, exact APIs/defaults, pinned-width fallback, and keyboard/focus details are reviewable proposals, not adopted behavior. No production APIs or implementation were created. The POC renderer/query experiment must not silently become the production public contract. Default-off flushSync is preserved.

### Closure impact and remaining gates

The minimum-layout-diagnosis item from the earlier closure inventory is now satisfied for the measured environment; the 4px cause no longer needs another speculative regression rerun. POC final-state evidence remains intact. Initial-render/render-count evidence, current native-scroll/paint and scheduling-cost evidence, approximate memory behavior, logical-dimension scalability, and a reviewed §19 exit result remain pending. The new diagnostic and earlier clamp correction still need a separately authorized targeted typecheck/lint.

Before production implementation: (1) review the proposed foundation/containment contract and authorize any targeted POC containment correction if required; (2) safely collect the outstanding POC evidence under explicit bounded execution approval and record the exit decision; (3) approve the first-slice API/accessibility/default decisions and a narrow package implementation scope. Drafting the specification does not bypass the POC gate. The POC is **not formally VALIDATED**.

Files changed in this work: new `row-overflow.spec.ts`, new `GRID-V1-foundation.md`, updated this status. Existing staged/unstaged work was preserved. No builds, full suites, performance workloads, installs, application edits, commits, pushes, resets, or discards occurred. Work stopped after the one diagnostic and documentation workstreams for user review.

## POC containment fix, verification, and pending-diff review — 2026-10-17

Authorization: fix playground cell containment only, strengthen the layout regression, run targeted static checks and at most two sequential Chromium invocations, then review all pending tracked/staged/untracked changes without committing. Completed within that scope; no geometry algorithm, production architecture/API, or default-off flushSync change.

### Exact change and trade-offs

Added `overflow: 'clip'` to the existing left, center, and right cell style objects in `VirtualGrid.tsx` (three added lines). This clips visible overflow and prevents it propagating into the scrollport without making cells scroll containers. Retained wrapping, 40px/120px boxes, 8px padding, borders, typography, original full text, keys/identity, ARIA/focus attributes, pinned sticky layout, buffers, and scheduling. Text exceeding a fixed box is now visually clipped; no nowrap, ellipsis, tooltip, or single-line production policy was introduced.

Accessibility limit: source inspection and regression preserve full DOM text and absence of `aria-hidden`; no semantic roles/focusability changed. The POC has no interactive cell controls/focus rings. This is not screen-reader verification; production clipped-value access and focus-ring behavior remain proposed requirements. Compatibility evidence is Chromium only.

`row-overflow.spec.ts` now runs default/enabled cases and asserts exact canvas scroll height/width at middle, assignment, and final-row stages; zero maximum/scroll-height drift; fixed row/cell boxes; `overflow: clip` in both axes; preserved wrapping/padding/border/full text; and no `aria-hidden`. Text Range bounds/internal cell scrollHeight may remain larger than the box; the regression correctly tests containment at the grid scroll extent rather than demanding text-layout removal.

### Static checks — sequential, no output build

All commands used the process-local settings recorded earlier: daemon/Cloud/remote and local cache off, one Nx task, plugin isolation off, CI=true, `NODE_OPTIONS=--max-old-space-size=2048`. Dependencies and sync generators were skipped. Commands executed:

```powershell
pnpm nx run @org/playground:typecheck --excludeTaskDependencies --skipSync --skipNxCache --parallel=1 --command="tsc --project tsconfig.e2e.json --noEmit --incremental false --composite false --declarationMap false --emitDeclarationOnly false"
pnpm nx run @org/playground:typecheck --excludeTaskDependencies --skipSync --skipNxCache --parallel=1 --command="tsc --project tsconfig.app.json --noEmit --incremental false --composite false --declarationMap false --emitDeclarationOnly false"
pnpm nx run @org/playground:lint --excludeTaskDependencies --skipSync --skipNxCache --parallel=1 --command="eslint src/app/virtualization/VirtualGrid.tsx e2e/row-overflow.spec.ts e2e/flush-sync.spec.ts e2e/scroll-delay.spec.ts"
```

Both typechecks passed (exit 0; Nx task durations 803ms and 672ms). Lint passed (exit 0; 1.6s) with 0 errors and the same six `playwright/no-conditional-in-test` warnings in the timing diagnostic; renderer and two other test files reported no findings. No suppression or unrelated refactor was introduced.

### Browser verification — exactly two invocations

```powershell
pnpm nx run @org/playground:e2e --excludeTaskDependencies --skipSync --skipNxCache --parallel=1 --args="row-overflow.spec.ts --project=chromium --workers=1 --retries=0 --trace=off --global-timeout=45000 --timeout=30000 --reporter=line --output=test-output/playwright/containment"
pnpm nx run @org/playground:e2e --excludeTaskDependencies --skipSync --skipNxCache --parallel=1 --args="flush-sync.spec.ts --project=chromium --workers=1 --retries=0 --trace=off --global-timeout=45000 --timeout=30000 --reporter=line --output=test-output/playwright/containment-scroll"
```

Same development environment as earlier: `GRID_TEST_PRODUCTION=0`, `BASE_URL=http://localhost:4200`, HTML auto-open/debug off, installed Chromium. One worker, zero retries, no screenshots/video/traces; 45s Playwright global / 30s per-test limits and a 50s outer process-tree watchdog per invocation. No app build, install, benchmark, or memory stress workload ran. Node limit is per-process old-space, not total machine memory.

Results: containment **2 passed (1.3s)**, exit 0, outer elapsed 3.20s; flag/scrolling **4 passed (2.7s)**, exit 0, outer elapsed 4.74s. No failed check, rerun, timeout, or apparent instability. BSOD cause remains undiagnosed. Six cases support the changed layout and existing final-state scrolling/pinned behavior on this development/Chromium run, not production/native-paint/performance validation.

Saved evidence in `apps/playground/test-output/playwright/containment/*/row-overflow.json`: default and enabled modes both retain scrollHeight 4,000,000 before/after final mounting, canvas height 4,000,000, scrollWidth 120,000, and zero scroll-height/max-top delta. Cell internal scrollHeight remains 44px but computed overflow is clip; it no longer enlarges the grid scrollable area. Separate output folders preserve the containment evidence when scrolling cases run.

### Complete pending change review and commit recommendation

Reviewed HEAD-to-working-tree changes, existing staged contents, and untracked file contents. Existing staging was preserved; this task did not stage, commit, reset, or discard anything. All pending paths belong to the earlier approved workflow, diagnostic, specification, and current containment work; no unrelated implementation/configuration/dependency changes were found.

- POC fix/regressions: `VirtualGrid.tsx`, `row-overflow.spec.ts`, `flush-sync.spec.ts`, and `POC-V1-virtualization.md`/`POC-V1-scroll-investigation.md` updates.
- Diagnostic preparation: `scroll-delay.spec.ts` and `docs/PERFORMANCE-MEASUREMENT.md` (new report schema is typechecked/linted, but measurements remain unexecuted).
- Workflow/architecture: `AGENTS.md`, `docs/PROJECT-STATUS.md`, `docs/ROADMAP.md`, and `specs/001-architecture.md`.
- Proposed production scope: untracked `specs/features/GRID-V1-foundation.md`; still a proposal, no production implementation approval implied.

No `_tmp_*`, caches, process log, deleted bridge files, or `ofir.md` occur in the pending tracked/untracked inventory or current index. Ignore checks confirm `ofir.md`, `.pnpm-store/`, `.codex-tools/`, and `_tmp_*` remain excluded. The local ignored `ofir.md` was previously identified as containing credentials; it must remain excluded. A heuristic credential-pattern scan of all pending working files and staged versions found no matches; this is not a guarantee or a scan of Git history/ignored files, and no credential values were printed.

Review corrected stale current-verification claims in the architecture/roadmap/investigation; historical results remain explicitly dated, production specification remains proposed, and performance/paint/memory claims remain unverified. New bounds/scrolling results do not prove absence of transient painted blank frames. Whitespace and documentation-link checks are separate lightweight review checks, not application tests.

Recommended future commit grouping (no commit authorized now): (1) POC containment implementation + overflow regression + POC contract/findings; (2) flag/scroll regression and diagnostic/report preparation; (3) persistent workflow/status, roadmap, and completed architecture draft; (4) proposed GRID-V1 foundation specification. Keep evidence scope/limitations with each group and reconcile shared documentation when preparing actual commits. Nothing should be blindly staged with `git add .`; preserve current index choices until explicitly asked to arrange commits.

### Remaining requirements and next milestone

The observed containment issue is fixed and verified within scope. Remaining POC gaps: current native-scroll/paint behavior and scheduling-cost comparison, initial rendering/render counts, approximate memory, logical-size scalability, production/other browser compatibility, and a reviewed §19 exit decision. No POC validation or production architecture decision was made. Next proposed milestone: a separately authorized, bounded native-scroll evidence plan/run to resolve the fast-scroll/paint question and scheduling trade-off; no broad performance workload or default-on switch is implied.

## Prepared regression acceptance criteria — exercised within the recorded scope

Focused regression coverage is implemented under the authorized plan, preserving application implementation and default behavior. The criteria below have passing Chromium/development evidence across the recorded runs and batch, with the limitations above; this is not general POC validation.

Acceptance criteria:

- Cover omitted flag, `flushSync=1`, and a non-enabling value such as `flushSync=0`; assert `data-flush-sync-enabled` after navigation/reload.
- In enabled and default modes, check final rendered coverage and pinned-column synchronization after representative vertical, horizontal, and combined jumps. Final coverage alone must not be claimed to prove absence of transient blank frames.
- Preserve existing diagnostics; introduce no machine-dependent timing pass/fail thresholds or default-on behavior.
- Report source review separately from execution. Run only explicitly authorized checks, record commands/environment/results, and leave runtime verification pending if execution remains prohibited.
- Update this status with the outcome and remaining investigation gaps; do not mark the POC validated from these checks alone.

## Safety and authorization constraints

The user reports recent memory-related BSODs; their cause has not been diagnosed here. Avoid heavy tests, benchmarks, parallel workloads, large-data runs, and browser trace capture until explicitly authorized with bounded scope. Current instructions prohibit all tests, builds, benchmarks, browser automation, performance traces, dependency installs/updates, system/hardware configuration changes, commits/pushes, reset/clean/discard operations, and Tunnel/bridge restoration. Keep flushSync off by default. A proposed task or general definition of done does not lift these restrictions.

Exceptions completed: previous controlled checks/batches, final-row layout diagnostic, and the authorized POC containment correction/static checks/two-invocation verification are finished. Foundation specification preparation is complete; it does not authorize production implementation. No exception authorizes additional execution.

## Authorized Git checkpoint — 2026-10-17

The user authorized up to four additive commits and a non-force push to the existing tracked `origin/main`. Initial fetch confirmed local/upstream both at base `524290a`, divergence `0 0`, and remote URL `https://github.com/ofir-rifo/data-grid.git`. Stop rather than merge/rebase/force if that remote changes before publication.

Groups: A `fix(playground): contain virtualized cell overflow` (three-line cell fix, final-row regression, POC containment contract); B `test(playground): add flushSync regressions and scroll diagnostics` (flag cases and diagnostic preparation); C `docs: update virtualization architecture and project roadmap` (workflow, architecture, investigation, measurement procedure, roadmap and this status); D `docs: specify initial DataGrid foundation` (proposed specification only). Whole-file grouping avoids risky artificial hunk splits. Existing staged versions are included with their intended current contents; no changes are discarded.

The complete pending/staged/untracked review found only these intended project changes. Credential-pattern scans of working and staged versions found no matches (heuristic, not a guarantee); temporary files, ignored credentials, caches, and generated browser outputs are excluded. No tests/builds/benchmarks or application changes occur during checkpoint creation. Relevant verification remains the targeted typecheck/lint and six passing Chromium cases recorded above, with their limitations. Default-off flushSync and the **not formally VALIDATED** POC status are preserved.

This document is committed in group C; the separately committed foundation proposal follows in group D. Exact final hashes and publication success must be checked in Git/remote state, not inferred from this pre-commit record. This checkpoint authorization does not authorize subsequent implementation or new workloads. Native-scroll/paint, scheduling cost, initial rendering/render counts, memory/scalability, production/other-browser evidence, and the formal POC decision remain pending.

## Single next recommendation — awaiting scope/execution approval

Next recommended milestone: review the verified POC containment change, then separately authorize a bounded native-scroll evidence plan/run to resolve the fast-scroll/paint question and scheduling trade-off. Do not repeat passing geometry regressions without a new reason or enable flushSync by default. Production implementation still requires the documented POC exit decision and approval of the proposed foundation contract.

## CI foundation — 2026-10-17

Authorized scope: feature-branch CI/configuration/documentation, bounded relevant
validation, branch push and PR creation. This supersedes the earlier blanket
execution/commit restriction only for this milestone. No application behavior,
default-off flushSync, POC decision or production implementation is changed.

Prepared on `ci/datagrid-foundation` from `3cc5b91` (`origin/main`). See [CI contract](CI.md)
for exact checks, conventions and proposed squash policy. PR CI replaces the old
npm/Nx Cloud distributed template with pinned pnpm, frozen installation, sequential
Nx checks, one hosted Vite build and six bounded Chromium regressions. Separate
read-only conventions workflow checks PR titles and every commit in the actual
base/head range, including multi-commit PRs and excluding synthetic merge commits.
Conventions title edits do not repeat browser work. No branch rules/settings changed.

Local validation (Windows, Node v26.5.0, pnpm 12.5.1; daemon/cloud/cache disabled,
one Nx task at a time, 2 GB Node old-space):

- `node --test .github/scripts/check-conventions.test.mjs`: 3 passed. Initial sandbox
  run could not write temporary Git metadata; rerun outside sandbox passed.
- `pnpm nx run @org/playground:typecheck --excludeTaskDependencies --skipSync --parallel=1`:
  passed, declaration-only TypeScript project-reference checks.
- `pnpm nx run @org/playground:lint --excludeTaskDependencies --skipSync --parallel=1`:
  passed, zero errors / nine existing conditional-in-test warnings in diagnostic files.
- `pnpm nx run @org/playground:test --excludeTaskDependencies --skipSync --parallel=1 --args="--run --maxWorkers=1 --no-file-parallelism"`:
  6 files / 27 tests passed (3.62s Vitest duration).
- Both workflow YAML files parsed; PR events/read-only permissions checked.
  Lockfile's existing application document is byte-equivalent after newline normalization;
  pnpm added only its pinned bootstrap document. No application dependency installation
  or local browser/build/benchmark was performed in this milestone.

Published PR: https://github.com/ofir-rifo/data-grid/pull/1, feature branch
`ci/datagrid-foundation`; main is unchanged. Initial hosted conventions run
`39068816589` failed during Node setup: implicit package-manager caching tried to
invoke pnpm in the dependency-free job. Explicitly disabling that cache fixes the
configuration without installing dependencies there. Initial main CI frozen install
succeeded; that superseded CI run was cancelled by concurrency control.

Hosted evidence at `89f9823` (Ubuntu 24.04 / Node 24.21.0):

- [DataGrid checks, run 39068867300](https://github.com/ofir-rifo/data-grid/actions/runs/39068867300):
  success. Frozen installation, full project-reference typecheck, ESLint (zero errors /
  nine existing warnings), 6 unit files / 27 tests, Vite bundle (244ms), and all
  6 bounded Chromium regressions (6.8s) passed. This is real hosted execution.
- [Conventions, run 39068867331](https://github.com/ofir-rifo/data-grid/actions/runs/39068867331):
  success. Three validator tests passed; log confirms the title and **all 2 PR commits**
  were validated, excluding the synthetic merge.
- Runner warns that pinned `pnpm/action-setup@v4` declares a Node 20 action runtime;
  GitHub forced Node 24 and the action succeeded. Review an upstream runtime migration
  separately; no runner/runtime setting is changed here.

This evidence update is a subsequent documentation commit. Check current-head runs
before merge; the links above establish results for `89f9823`, not unseen future tips.
Local checks do not establish runner success. CI's development-browser
regressions and bundle compilation are separate checks, not production-browser evidence.
The POC is **not formally VALIDATED**; painted frames, scheduling cost, memory,
scalability and the reviewed exit decision remain pending. BSODs remain unexplained.

Next recommendation: review real hosted CI outcomes, then separately approve main
branch rules/merge settings and advisory AI review permissions. No settings approval
or further POC workload is implied by this CI implementation.

## Engineering standards follow-up — 2026-10-18

Authorized on the same open PR #1 / `ci/datagrid-foundation`, from `79dbc63`;
do not merge or change protection settings. Scope includes the four pinned policy
tools, configuration, isolated policy tests, documentation, bounded checks and
feature-branch publication. Application implementation, default-off flushSync and
the **not formally VALIDATED** POC status are unchanged.

See [Engineering standards](ENGINEERING-STANDARDS.md) for enforced rules, safe
type-only import fixing, precise legacy styling/underscore-parameter exceptions,
report-only Knip limitations and staged cleanup proposals. The root inventory checks
unimported tracked/non-ignored files and uses nearest ESLint configs to preserve
React/Playwright rules. CI replaces its duplicate app lint step with this inventory,
adds nine policy tests and an advisory, timeout-bounded Knip step. Existing
unit/build/six-case Chromium checks and multi-commit conventions validation remain.

Bounded local results (Windows / Node 26.5.0 / pnpm 12.5.1, daemon/cloud/cache off,
2 GB per-process Node old-space, serial Nx tasks, common flags
`--excludeTaskDependencies --skipSync --parallel=1`):

- `pnpm nx run @org/playground:standards-test`: **9 passed**, latest duration 2.35s.
  Initial Promise-misuse fixture used DOM TimerHandler, which does not promise a
  void callback; corrected the fixture to an explicit void-callback contract and
  separately checked valid rejection handling. No application issue or assertion
  weakening was involved. Comment-only empty bodies also fail; parameter-property
  constructors retain their real initialization semantics.
- `pnpm nx run @org/playground:standards`: **passed**, 37 source / 2 style files,
  zero errors and nine existing Playwright conditional warnings. Initial unused
  audit flagged five intentional positional/interface `_` parameters; documented
  the conventional parameter-only exception, with negative tests for unused locals
  and used underscore parameters. No source code was changed to silence checks.
- `pnpm nx run @org/playground:typecheck`: **passed** with unused-parameter and
  unreachable-code checking added.
- `pnpm nx run @org/playground:test --args="--run --maxWorkers=1 --no-file-parallelism"`:
  **6 files / 27 tests passed**, 3.44s. No local browser/build/performance run.
- `pnpm nx run @org/playground:dead-code-report`: completed report-only, exit 0;
  five unused-file candidates plus dependency/export/type findings and configuration
  hints. Includes known modeling limitations; not proof that the HTML-linked global
  stylesheet or Nx tooling dependencies can be removed. No cleanup performed.
- `pnpm peers check`: passed after a targeted, in-range update of two CSS tooling
  transitive peers. No broad dependency upgrade. Required pinned tools installed;
  existing ESLint 9 deprecation and old `whatwg-encoding` warning remain upgrade debt.

Read-only GitHub verification: PR open on the expected branch, public personal repo;
rulesets and effective main rules empty, classic protection GET 404, merge/squash/rebase
all enabled. Existing required-check candidates are `DataGrid checks` and
`Conventional commits`, both GitHub Actions integration 15368. Exact recommended
main/squash settings are documented; no protection/settings mutation performed.

This is the pre-publication evidence record for the follow-up commit. Actual
current-head hosted results must be confirmed on PR #1 after push and reported
separately; earlier green runs do not establish this commit's results. No instability
was apparent during bounded commands; the prior BSOD cause remains undiagnosed.

Next recommendation: review this policy PR and its actual current-head checks, then
separately approve protection/squash settings. Legacy-style/Knip cleanup and POC exit
work require their own scope; no further implementation is approved here.

## Resume and continue

1. Read `AGENTS.md`, this status, the linked specifications, then current Git status/log and relevant source. Preserve existing changes and recheck outdated checkpoint claims.
2. Identify the next task actually approved by the user. Ask before starting a proposal, expanding scope, or making major architecture changes; document important decisions and trade-offs before implementation where required.
3. Follow: **Read specs → Identify next approved task → Implement → Verify when authorized → Review → Update project status → Continue** within approved scope only. If checks are prohibited, record pending verification instead of declaring completion under the full definition of done.
4. After an approved milestone, update the checkpoint, evidence (implemented/tested/manual/hypothesis/pending), decisions, unresolved requirements, and next proposal. Keep secrets and local credentials out of documentation.
5. Finish only the explicitly authorized phases, then stop for review. Recommended future milestones do not authorize additional implementation or prohibited execution.
