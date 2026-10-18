# POC-V1 validation review — PR #3

Date: 2026-10-18. Baseline: `f04bafa` (PR #2 squash merge). Scope: playground
100,000 × 1,000, 40px rows, 120px columns, two pinned columns per side, 400px row
buffer / zero column buffer. Production foundation implementation is not authorized.

**Recommendation: NO-GO for production foundation implementation.** This means
insufficient exit evidence, not a demonstrated need to replace the architecture.
The formal POC result remains **pending / not VALIDATED**; do not manufacture either
§19 final outcome from missing data. Continue the evidence plan after Tech Lead approval.

## 1. Source audit and minimal correction

- `VirtualGrid.tsx`: one native two-axis scrollport; shared inclusive-start /
  exclusive-end row range for all regions; center geometry excludes four pins.
  Rows use logical row keys and cells use logical column IDs. Only the calculated
  window is mounted. No 100-million-cell data array is allocated.
- `engine/geometry.ts`: constant-space fixed offsets/index lookup. Center viewport
  is `max(0, clientWidth - 480)`. The fixed POC does not define a production contract
  for invalid dimensions/nonfinite inputs, hidden zero-size viewports or dynamic
  geometry; do not infer those APIs from these tests.
- One scroll callback reads both native offsets and client dimensions. Event ID/time
  travel with state; layout-effect diagnostics describe a committed state. They do
  not timestamp paint or enumerate every render/commit.
- Only `flushSync=1` enables synchronous updates, once per mount. Absent/0 remain
  off. Changing URL state without remount does not change the flag. A synchronous
  arm may commit intermediate scroll events that a batched arm skips; DOM identity
  is preserved only while an item stays mounted, not across virtualization unmounts.
- Every cell region clips overflow. Existing browser tests protect 4,000,000px /
  120,000px logical extents, wrapping/full DOM text, fixed boxes and pinned positions.
  Clipping is not screen-reader/focus validation; those are outside this POC.
- Found and reproduced: `getEndIndex` returned 1 for zero-count geometry with a
  positive end offset, inventing a row/column. Three failing unit cases now have a
  four-line zero-count guard. No nonempty geometry algorithm, renderer, scheduling,
  buffers or public production API was changed.

## 2. Evidence ledger

Prior hosted evidence: [PR #2 CI](https://github.com/ofir-rifo/data-grid/actions/runs/39154021525)
at `f2342bb` passed 27 units, nine policies, typecheck/standards/build and six
Chromium/development regressions. This is historical evidence, not a PR #3 rerun.
The old 2026-10-03 production measurements and 13 Chromium cases predate flushSync
and diagnostic schema 2; they cannot validate this revision.

New deterministic coverage:

- Eleven engine cases: three empty-axis regressions, five aligned/fractional,
  buffer/edge/oversized-viewport cases, three count-only scaling checks. Million-row
  / 10,000-column **geometry counts** allocate no dataset or DOM and are not stress
  tests or empirical browser scalability evidence.
- Two jsdom/StrictMode cases: latest of consecutive scroll events wins on both axes,
  exact cells/ranges/counts, in-window key reuse, mount-time flag behavior, detached
  scroll events after unmount, and fresh remount state. Injected client dimensions
  make this a React/state test, not a native layout/scroll/clipping/memory test.
- Existing browser cases strengthened, with no new matrix: negative native clamping,
  multiple writes in one browser task followed by exact final coverage/pinned checks,
  exact settled element-descendant counts, and both-axis commit/three-region checks
  in containment. Still six Chromium cases in the existing bounded CI job.

Local results and correction history are recorded in PROJECT-STATUS.md. New browser
assertions must pass on the PR head in hosted CI; do not reuse the prior run as their
result. There is no local browser, trace, benchmark, retention or cross-browser run.

## 3. Acceptance and exit matrix

“Verified in scope” means the finite scenarios tested, never every possible frame.
PR-head hosted execution is separate from test-source review and local units.

| Existing requirement                                                             | Evidence / status                                                                                   | Remaining closure evidence                                                                                         |
| -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| §§2–8: fixed 2D geometry, configurable buffers, pinned regions                   | Implemented/source-inspected; unit and prior settled-browser evidence                               | PR-head regressions; no variable-size/general-purpose API claim                                                    |
| §§9, 13: logical row/column identities; exactly the window and all pins          | Verified for tested unit states and prior browser checkpoints; PR-head browser additions pending    | Native scrolling throughout motion is not covered by eventual assertions                                           |
| §§11–13: vertical/horizontal/combined jumps, clamping, reversal, synchronization | Partial: settled state checked; burst/state/lifecycle coverage added                                | Actual painted-frame/native-input behavior and scheduling decision                                                 |
| §20: fixed-cell overflow containment                                             | Prior two Chromium flag-mode cases passed; strengthened both-axis/region checks prepared            | PR-head browser run; no focus/screen-reader claim                                                                  |
| §14 DOM counts / §19.3 bounded DOM                                               | Partial: exact rows/cells/element descendants at sampled checkpoints, ≤360 cells / ≤432 descendants | Peak elements/text nodes and retention during a bounded native sequence                                            |
| §14 rendering / §19.2 fixed geometry fast enough                                 | Pending current performance measurements; old medians are historical                                | Production initial/update distributions on an identified runner and approved budgets                               |
| §14 React render count / §19.6 unexpected rendering costs                        | Pending; event IDs and observer callbacks are not render counts                                     | Explicit render/commit instrumentation where measurable, or document unavailable signal and approve an alternative |
| §14 memory                                                                       | Pending                                                                                             | Bounded heap/renderer-process observations and retention checkpoints; no leak-free claim from unmount test         |
| §15 row/column scalability                                                       | Partial: pure calculation independent of counts at an interior offset                               | Actual DOM/memory across increased logical dimensions and explicit treatment of §17 height limits                  |
| §19.4 fast-scroll responsiveness                                                 | Pending visual/performance evidence                                                                 | Native input, trace/presented-frame limits, latency distributions; final coverage is insufficient                  |
| §19.5 pinned synchronization                                                     | Prior browser checkpoints + deterministic shared identities; partial during motion                  | Native motion/paint evidence in supported browser scope                                                            |
| §19.7 required architecture changes                                              | Pending decision                                                                                    | Evidence-based scheduling policy and reviewed exit record before GRID-V1                                           |

Cross-browser support is not numerically specified by POC-V1. Current CI is Chromium
headless/development only. Firefox, WebKit, headed display/native trackpad and current
production browser regression evidence are absent. Tech Lead must select the POC
browser/support scope rather than imply that Chromium proves all browsers.

## 4. Reproducible correctness gates (existing requirements made explicit)

At the supported fixed viewport and default buffers, each sampled settled state must
have zero missing/extra/duplicate logical cells, identical native/committed offsets,
identical row identities in all regions, pinned x/y alignment within 1 CSS pixel,
and no cell content enlarging the logical scroll extent. The existing test timeout
is a resource/convergence guard, **not** a responsiveness SLA.

For a positive viewport extent, each axis's count is bounded by
`ceil((viewport + 2 * buffer) / itemSize) + 1` (capped by item count). With viewport
≤1,000×600, center width ≤520, row buffer 400 and column buffer 0: ≤36 rows, ≤6 center
columns, ≤360 cells and ≤432 **element descendants of the canvas**. The latter is
`rows * (row wrapper + center wrapper + four pins + center columns)`. Text/comment
nodes, the canvas itself and the debug overlay are separate counts. These bounds
must be recalculated for another viewport/buffer, not blindly reused.

## 5. Minimum remaining work and decisions

1. Review PR-head finite correctness CI and accept the documented empty-axis fix.
2. Approve the **proposed**, resource-capped hosted measurement stages and candidate
   numerical budgets in PERFORMANCE-MEASUREMENT.md before implementing/dispatching
   any heavier workflow. No benchmark workflow or new infrastructure is created here.
3. Collect current production timing, initial render, React cost/count where measurable,
   native visual/paint, memory/peak DOM and dimension-scaling evidence on the approved
   environment. Native rendered-frame evidence may require a separately approved
   headed/display-capable runner; headless screenshots/DOM samples are not substitutes.
4. Resolve §15's million-row logical height (40,000,000px) against §17's stretching
   non-goal. Decide what logical scalability evidence is accepted without full native
   reachability, or scope a separate architecture investigation. No silent waiver.
5. Decide supported browsers and whether default-off scheduling meets the agreed
   gates. Passing the enabled experiment alone cannot qualify the default. Any
   default/policy/architecture change needs explicit approval and new regressions.
6. Review all §19 questions and record the supported final POC outcome. Only then
   review GRID-V1-foundation.md for approval and start a narrow production slice.

No production implementation, dependency upgrade, broad refactor, heavy run,
default-on switch or PR merge is part of this milestone.
