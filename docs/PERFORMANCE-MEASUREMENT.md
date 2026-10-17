# Controlled virtualization measurement plan

Status: prepared on 2026-10-17; **not executed**. Nothing in this procedure authorizes running it. Recent user-reported memory-related BSODs make bounded execution approval a prerequisite.

## Scope and controls

Compare the same POC revision with the flag absent, `flushSync=0`, and `flushSync=1`; preserve the default-off implementation. Start with the fixed 100,000 × 1,000 dataset, default 400px row / 0px column buffers, identical viewport, browser/version, input workload, and build. Do not introduce larger datasets or parallel browsers without separate approval.

Before a run, obtain agreement on one browser, one worker, repetitions, duration, memory budget/stop conditions, build permission, and whether video/screenshots/traces are allowed. Stop on instability or the agreed budget. Do not run load generation alongside other verification. No dependency or browser installation is authorized by this plan.

Record commit and uncommitted diff, OS/browser versions, viewport/device scale, URL and actual `data-flush-sync-enabled`, buffers, dev/production mode, input type, requested and observed events/commits, repetitions, and recording overhead. Development StrictMode is enabled in `apps/playground/src/main.tsx`; do not compare development timings directly with production timings. A requested build-mode label is metadata, not proof that the intended server was used.

## Existing signals and limitations

| Question | Existing source / method | Interpretation and limits |
| --- | --- | --- |
| Programmatic write → React scroll handler | `scroll-delay.spec.ts`: matching write position and committed event timestamp | Includes browser event delivery; position matching is suitable for this monotonic workload, not arbitrary repeated positions. Wheel input has no write timestamp and reports no equivalent latency. |
| Handler → render start | `lastScrollEventAt`, `renderStartedAt` | Includes scheduling and possibly earlier development invocations; not pure React execution time. |
| Window calculation | `windowCalculationMs` | Timing around the pure calculation; values below timer resolution are not proof of zero cost. |
| Render start → layout effect | `renderStartedAt`, `reactCommitAt` | Includes component work, reconciliation, and DOM mutation; layout-effect timestamp is a commit proxy, not paint completion. |
| Callback gaps | Raw `frames[].at` and summary `rafCallbackGapMs`; buffer experiment also records rAF timestamps/gaps | Scheduling observations, not direct counts of dropped or blank painted frames. |
| Rendered DOM | New diagnostic `finalDom` counts actual canvas rows, cells, descendants; existing canvas range/count attributes and buffer samples | Final snapshot is not peak DOM size or proof of scaling. Sample fixed checkpoints for a later approved bounded-DOM study. |
| Memory | Browser memory tools and OS process working-set observations, manually collected during an approved run | Separate JS heap, DOM-related retention, renderer working set, and GPU/process totals; none is interchangeable with total machine memory or a BSOD diagnosis. No memory API or continuous sampler is added. |
| Paint/compositor | Separate, explicitly approved browser performance recording with screenshots during native scrolling | Correlate event/render/commit points with screenshots and paint/compositor activity; timestamps from a different clock require an explicit alignment method. Recording affects timings and may not expose every compositor-presented frame. |

Canvas timing fields belong to committed scroll state. MutationObserver callbacks can coalesce changes; recorded commit samples must not be assumed to enumerate every intermediate commit. The DOM counts are taken after trace collection stops to avoid extra per-frame DOM traversal. No new application instrumentation is needed for this preparation.

Static stabilization review: the diagnostic now captures the latest pending commit before disconnecting its observer and uses idempotent teardown after failures as well as successful collection. `finalViewport` captures native offsets, committed offsets, and coverage atomically at collection stop; final assertions use this snapshot rather than the last rAF callback, which can be older. Two frame boundaries after a matching committed offset do **not** prove all wheel events or momentum have ended. Treat the result as a collection-stop snapshot; native-scroll completion and observer overhead still need runtime investigation.

Output compatibility: `summary.schemaVersion` is now `2`. Existing summary keys and raw `commits`, `events`, `writes`, and `frames` arrays remain; mode/build, gap, final-viewport, and DOM fields are additive. Reported enabled mode comes from the actual canvas attribute, checked against the request. Programmatic write timestamps now precede the setter, so write-to-handler timing includes setter work; older results timestamped after the setter are not directly interchangeable. This is a measurement-definition correction, not a measured improvement. Invalid `GRID_FLUSH_SYNC` values fail when this diagnostic executes rather than during unrelated test collection.

## Diagnostic comparison procedure — future authorized execution only

1. Review `apps/playground/playwright.config.mts`, `apps/playground/package.json`, and resolved Nx targets before choosing commands. Use pnpm/Nx conventions; do not guess flags. Do not start Nx or discover tests during the current no-execution phase.
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
