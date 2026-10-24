# Controlled virtualization measurement plan

Latest accepted runtime evidence: [harmless supervisor verification](SUPERVISOR-VERIFICATION.md)
passed nine groups in **5.9546453s**, including synthetic exit-race decision checks,
and was accepted by Tech Lead for the executed scenarios. Earlier failures remain
historical records. Performance execution remains explicitly disabled; production remains
NO-GO. No Stage 0/build/browser/performance measurement has run in this workstream.
Three cases remain NOT VERIFIED: actual native exit-confirmation fallback execution,
full 30s outer-deadline expiration, and capture overflow/nonempty fixture stderr.
No performance or hardware-stability conclusion follows from the canary pass.

Historical 2026-10-18 local amendment: Tech Lead approved the conditional Windows protocol
in [LOCAL-PERFORMANCE-PROTOCOL.md](LOCAL-PERFORMANCE-PROTOCOL.md), ending execution
at Stage 2. The first launch was blocked by PowerShell execution policy before
preflight; no performance workload ran. See project status and the AI journal.
That execution authorization is now suspended by the current HOLD. The older
hosted-only restriction below is historical for its proposal; neither passage
authorizes a new workload or Stages 3–4.

Status: prepared on 2026-10-17; **not executed**. Nothing in this procedure authorizes running it. Recent user-reported memory-related BSODs make bounded execution approval a prerequisite.

PR #3 audit (2026-10-18): current correctness/evidence classification and the
production **NO-GO pending evidence** recommendation are in [POC validation](POC-VALIDATION.md).
The diagnostic comparison below remains unexecuted for current performance results.
Only ordinary bounded correctness CI is authorized now. The proposal at the end
needs Tech Lead approval before a new measurement workflow is implemented/run.

## Scope and controls

Compare the same POC revision with the flag absent, `flushSync=0`, and `flushSync=1`; preserve the default-off implementation. Start with the fixed 100,000 × 1,000 dataset, default 400px row / 0px column buffers, identical viewport, browser/version, input workload, and build. Do not introduce larger datasets or parallel browsers without separate approval.

Before a run, obtain agreement on one browser, one worker, repetitions, duration, memory budget/stop conditions, build permission, and whether video/screenshots/traces are allowed. Stop on instability or the agreed budget. Do not run load generation alongside other verification. No dependency or browser installation is authorized by this plan.

Record commit and uncommitted diff, OS/browser versions, viewport/device scale, URL and actual `data-flush-sync-enabled`, buffers, dev/production mode, input type, requested and observed events/commits, repetitions, and recording overhead. Development StrictMode is enabled in `apps/playground/src/main.tsx`; do not compare development timings directly with production timings. A requested build-mode label is metadata, not proof that the intended server was used.

## Existing signals and limitations

| Question                                  | Existing source / method                                                                                                           | Interpretation and limits                                                                                                                                                                                                                   |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Programmatic write → React scroll handler | `scroll-delay.spec.ts`: matching write position and committed event timestamp                                                      | Includes browser event delivery; position matching is suitable for this monotonic workload, not arbitrary repeated positions. Wheel input has no write timestamp and reports no equivalent latency.                                         |
| Handler → render start                    | `lastScrollEventAt`, `renderStartedAt`                                                                                             | Includes scheduling and possibly earlier development invocations; not pure React execution time.                                                                                                                                            |
| Window calculation                        | `windowCalculationMs`                                                                                                              | Timing around the pure calculation; values below timer resolution are not proof of zero cost.                                                                                                                                               |
| Render start → layout effect              | `renderStartedAt`, `reactCommitAt`                                                                                                 | Includes component work, reconciliation, and DOM mutation; layout-effect timestamp is a commit proxy, not paint completion.                                                                                                                 |
| Callback gaps                             | Raw `frames[].at` and summary `rafCallbackGapMs`; buffer experiment also records rAF timestamps/gaps                               | Scheduling observations, not direct counts of dropped or blank painted frames.                                                                                                                                                              |
| Rendered DOM                              | New diagnostic `finalDom` counts actual canvas rows, cells, descendants; existing canvas range/count attributes and buffer samples | Final snapshot is not peak DOM size or proof of scaling. Sample fixed checkpoints for a later approved bounded-DOM study.                                                                                                                   |
| Memory                                    | Browser memory tools and OS process working-set observations, manually collected during an approved run                            | Separate JS heap, DOM-related retention, renderer working set, and GPU/process totals; none is interchangeable with total machine memory or a BSOD diagnosis. No memory API or continuous sampler is added.                                 |
| Paint/compositor                          | Separate, explicitly approved browser performance recording with screenshots during native scrolling                               | Correlate event/render/commit points with screenshots and paint/compositor activity; timestamps from a different clock require an explicit alignment method. Recording affects timings and may not expose every compositor-presented frame. |

Canvas timing fields belong to committed scroll state. MutationObserver callbacks can coalesce changes; recorded commit samples must not be assumed to enumerate every intermediate commit. The DOM counts are taken after trace collection stops to avoid extra per-frame DOM traversal. No new application instrumentation is needed for this preparation.

Static stabilization review: the diagnostic now captures the latest pending commit before disconnecting its observer and uses idempotent teardown after failures as well as successful collection. `finalViewport` captures native offsets, committed offsets, and coverage atomically at collection stop; final assertions use this snapshot rather than the last rAF callback, which can be older. Two frame boundaries after a matching committed offset do **not** prove all wheel events or momentum have ended. Treat the result as a collection-stop snapshot; native-scroll completion and observer overhead still need runtime investigation.

Output compatibility: `summary.schemaVersion` is now `2`. Existing summary keys and raw `commits`, `events`, `writes`, and `frames` arrays remain; mode/build, gap, final-viewport, and DOM fields are additive. Reported enabled mode comes from the actual canvas attribute, checked against the request. Programmatic write timestamps now precede the setter, so write-to-handler timing includes setter work; older results timestamped after the setter are not directly interchangeable. This is a measurement-definition correction, not a measured improvement. Invalid `GRID_FLUSH_SYNC` values fail when this diagnostic executes rather than during unrelated test collection.

## Diagnostic comparison procedure — future authorized execution only

1. Review `apps/playground/playwright.config.mts`, `apps/playground/package.json`, and resolved Nx targets before choosing future measurement commands. Use pnpm/Nx conventions; do not guess flags or infer execution approval from this procedure. Ordinary bounded correctness checks are a separate authorization.
2. For one selected run, set `GRID_FLUSH_SYNC` to `0` or `1`, or leave it unset for the default URL. `scroll-delay.spec.ts` validates the selector, navigates accordingly, and checks the actual flag attribute before collecting data. This does not change the application default or the other diagnostic suite.
3. Select the build with `GRID_TEST_PRODUCTION`; leave unset for development. If production is approved, explicitly approve/build the current revision before preview. The Playwright config requests `pnpm nx preview @org/playground` in production; whether its resolved target builds dependencies must be checked rather than assumed. Ensure `BASE_URL` does not point at an unrelated/stale server.
4. Select only `scroll-delay.spec.ts`, one browser and one worker; use separately named output directories for every mode/build/repetition. Keep tracing/video off for timing-only runs when authorized to configure the invocation. The buffer experiment currently enables video and is a separate workload, not a prerequisite.
5. Collect its `scroll-delay.json` summary/raw trace for programmatic and wheel inputs. Report distributions, event/commit/sample counts, final DOM counts, and final coverage. Inspect raw data for missing/coalesced events before comparing. Differences are observations; add no machine-specific pass/fail thresholds.
6. Release run-local environment overrides after the run. Preserve result identity and comparison notes; do not commit large raw recordings or credentials. Update project status with the actual commands, environment, results, and remaining limits. No results exist from this preparation.

## Memory and native-scroll evidence — separate approval gates

- Memory: agree on a short duration and checkpoint schedule first. Record baseline, after a fixed scroll/reversal sequence, and after settling, with the same tools and process scope in each mode. Do not force collection in only one comparison arm. Repeated retention trends require multiple bounded observations; one snapshot proves neither a leak nor its absence.
- Native scrolling: use the same wheel/trackpad action pattern in each mode, record a short browser performance trace with screenshots, and inspect visible coverage alongside main-thread work and paint/compositor events. Playwright wheel calls are not guaranteed to map one-to-one to display frames; programmatic jumps are a different input class.
- Use a separate trace session from timing-only measurements and record the overhead. If the recording cannot establish actual displayed blank frames, state that uncertainty instead of promoting rAF coverage to paint evidence.
- Scalability: defer enlarged logical dimensions and browser-height stretching until separately scoped. Existing final-state regressions and a baseline dataset cannot satisfy all POC memory/scalability exit criteria.

## Decision record

Keep the current opt-in flag while evidence is incomplete. Regression correctness, main-thread cost, native-scroll evidence, bounded DOM, and memory observations inform the POC exit review together. A successful manual observation or a passing final-state test is insufficient to mark the POC `VALIDATED` or enable flushSync by default.

## PR #3 proposed hosted validation contract — approval required, not executed

Existing POC §§14–15/19 require evidence but specify no latency or memory SLA.
The following candidate budgets are **new proposals**, not existing approved
requirements, current results, or CI thresholds. Do not retroactively judge old
exploratory data against them. Tech Lead must approve/adjust budgets, browser scope
and measurement validity before an exit decision.

### Measurement identity and repeatability

- Use the exact approved commit and frozen lockfile; record runner CPU/OS/RAM,
  Node/pnpm/browser versions, browser flags/headless/display mode, device scale,
  observed client dimensions, dataset, buffers and actual flag attribute.
- Fixed 100,000×1,000, rows 40px / columns 120px, 1,000×600 outer viewport,
  rowBuffer=400 / columnBuffer=0. Use one fresh browser context per run; never
  preload 100 million cells. Record actual scrollbar-adjusted client dimensions.
- Timing runs: production build only, one build per commit, verify the fresh
  preview server/artifact. A later test-only runner must avoid the preview target's
  implicit rebuild and stale server reuse; the existing mode environment variable
  alone is not proof of build identity. Development StrictMode data stays separate.
- Compare absent/0/1, programmatic and native wheel input, three short repetitions
  each: 18 sequential subruns, no retries. Use the existing 60×800px request pattern,
  plus a fixed reversal/end checkpoint sequence for correctness. A wheel call is
  not a display frame, and requested writes need not produce one event/commit each.
- Archive raw requests, observed event/commit/sample counts and failures, per-run
  distributions and pooled p95 from raw observations; never average p95s or drop
  slow/failed runs. Require at least 30 valid intervals per mode/input across the
  repetitions before drawing a latency conclusion. A budget stop is incomplete
  evidence, not a pass or permission for automatic reruns.

### Candidate measurable gates

| Signal / category              | Proposed acceptance                                                                                                                                                    | Validity / current gap                                                                                                                                                     |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Correctness                    | Zero missing/extra identities, correct pinned geometry/scroll extents at every sampled checkpoint; preserve default-off semantics                                      | Existing hard regressions; eventual coverage cannot prove intermediate paint                                                                                               |
| DOM elements                   | At default geometry, ≤360 cells and ≤432 canvas element descendants at each checkpoint; count peak sampled elements and text nodes separately                          | Finite state assertions added; continuous/peak behavior and other dataset sizes pending                                                                                    |
| Fixed window calculation       | P95 ≤1ms on the identified reference runner                                                                                                                            | Current timing field is usable only above clock resolution; below resolution is not zero                                                                                   |
| Handler → layout-effect commit | P95 ≤16.7ms during steady input (a proposed 60Hz budget)                                                                                                               | Includes scheduling; does not include paint or guarantee 60fps                                                                                                             |
| Programmatic write → commit    | P95 ≤50ms for the defined jumps                                                                                                                                        | Includes setter/event delivery; version-2 timestamps only; wheel has no equivalent write time                                                                              |
| Initial rendering              | P95 navigation-start → first complete visible DOM ≤250ms on a warmed local preview; separately report first confirmed paint                                            | Includes startup/module load, not pure React time; current eventId=0 diagnostics skip initial commit and cannot measure this alone                                         |
| React work                     | Record initial/update commit counts and costs with validated test-only instrumentation where measurable                                                                | Observer delivery can coalesce; no render-count claim from event IDs. Profiling-enabled builds need separate labels/overhead controls; unavailable counts stay unavailable |
| Visual stability               | Zero confirmed exposed blank/stale/pinned-misaligned presented frames in the approved native-scroll capture, with observed-frame denominator and capture gaps reported | rAF, layout effects and headless screenshots alone cannot establish displayed-frame completeness; inconclusive capture cannot close the visual criterion                   |
| Memory                         | After warm-up and three identical scroll/settle cycles, settled JS-heap increase ≤max(5MiB, 10% of warm baseline); report renderer RSS trend and DOM/text counts too   | Candidate noise budget, not proof of no leaks. Apply the same GC policy to all modes, in separate memory runs; do not mix GC with latency comparisons                      |
| Logical scaling                | Same viewport/buffer yields the same bounded DOM scale at 100k×1k, 1m×1k and 100k×10k at equivalent valid interior offsets                                             | Pure count-only unit evidence exists; empirical DOM/memory and browser native-height policy remain pending. No giant cell arrays or stretching implementation              |

Initial-render/React-count instrumentation, memory collection and a parameterized
test-only scale harness are **not implemented** by PR #3. Existing `scroll-delay`
schema 2 covers only some timing/final-DOM fields. Its afterEach/stop cleanup is
source-inspected; the new component unmount test does not validate that observer's
runtime teardown. Capture UI overlay/occlusion explicitly; masked pixels are not
evidence of coverage. Report screenshot/trace overhead separately from timing runs.

### Proposed dispatch/resource envelope

No extra hosted infrastructure or workflow is provisioned here. Proposed first
stage: a manually dispatched Ubuntu 24.04 / Node 24 / pinned pnpm job on GitHub,
one Chromium browser at a time, one worker, zero retries, no parallel Nx, no daemon
or Nx Cloud, 2GiB Node old-space. Job timeout 10 minutes including setup/build;
20 seconds per timing subrun, ≤5 seconds active input per subrun and ≤90 seconds
aggregate active collection. Abort on invalid/insufficient measurements rather
than extending the workload. No tests on the BSOD-affected Windows host.

Propose stopping owned processes if Chromium-tree RSS exceeds 2GiB or aggregate
job-process RSS exceeds 4GiB; a supervisor must enforce the cap before execution
is approved. RSS can count shared pages repeatedly and is not retained JS heap.
Preserve the failure/partial data and stop on instability, OOM, unexpected browser
failure or timeout. Cap JSON at 5MiB, total artifacts at 100MiB, retention seven days;
no credentials or recordings committed to Git.

Native visual capture and memory/scaling are separately approved stages, not an
automatic expansion of the timing job. Proposed visual pilot: two ≤10-second
default/enabled native-scroll captures, one session at a time, with screenshots/
trace explicitly approved and the same process/disk limits. If a suitable headed
display/compositor capture cannot be obtained on the hosted runner, report the
gap and request a display-capable environment rather than claiming visual stability.
Memory/scaling stage limits and §17 height handling must be approved separately.

**Approval requested at review:** reference environment/browser scope; candidate
budgets; the supervised timing stage; separate display/native capture and retention/
scaling stages; default-off scheduling decision. No heavy command is dispatched
and no blanket future workload authorization is inferred from this proposal.
