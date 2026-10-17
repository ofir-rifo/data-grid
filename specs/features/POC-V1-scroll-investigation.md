# POC-V1 fast-scroll investigation

Date: 2026-10-03. Status: investigation in progress; no virtualization algorithm change.

## Manual flushSync experiment — 2026-10-17

An opt-in `?flushSync=1` flag now wraps the existing scroll-position and viewport state updates in `flushSync`. It is disabled by default and read once per component mount. Remove the parameter and reload to disable it. The canvas exposes `data-flush-sync-enabled` for verification.

In a manual development-server comparison, the user reported that scrolling behaved correctly with the flag enabled and that the problem returned after disabling it. This is a manual observation, not a measured performance result or proof across browsers and workloads. No tests, builds, or benchmarks were run for this change. The diagnostic tests below currently exercise the default mode only; the earlier measurements predate this experiment.

## Current implementation

The playground implements the POC with 100,000 rows, 1,000 columns, fixed 40px rows and 120px columns, two pinned columns on each side, and one native scrollport. Defaults remain a 400px row buffer and no column buffer. Pinned cells use CSS sticky positioning within the same virtualized rows. The pure engine is unchanged by this investigation.

Existing uncommitted work adds buffer query parameters and scroll-to-layout-effect measurements. The previous experiment changes the scroll position and immediately samples it in the same animation-frame callback. Its stale-sample counts include the expected interval before the scroll event is delivered; they are not counts of painted blank frames.

## Measurement contract

The new `scroll-delay.spec.ts` diagnostic compares programmatic 800px increments on 60 animation frames with 60 Playwright wheel inputs of 800px. Wheel calls are not assumed to be one per display frame. It samples coverage in a separately registered animation-frame loop, before the next programmatic write, and records each observed commit through a MutationObserver. Event identity and timestamp travel with the scroll state so a commit cannot be attributed to a later event merely because a mutable ref advanced.

Stages measured:

1. Programmatic position write to React scroll-handler entry. This includes browser event delivery, not React rendering. Wheel input has no corresponding write timestamp and reports this stage as unavailable.
2. Handler entry to the start of the committed component render. This includes scheduling and, in development StrictMode, potentially a prior invocation.
3. Time spent in `calculateRenderWindow`.
4. Component render start to its layout effect. This includes JSX construction, React reconciliation and DOM mutation, but does not isolate their individual costs or include subsequent paint.

Each run saves `scroll-delay.json` in its Playwright output directory and attaches it to the report. Tests assert that events are observed, timestamps are ordered, and the final viewport is covered. Timing values are observations, not machine-dependent pass/fail thresholds.

## Observations

Chromium, headless, local machine, default buffers. Values below are medians in milliseconds from exploratory runs, not universal performance guarantees. Development measurements overlapped verification work; production is the more useful reference.

| Input/build               | Write to handler | Handler to render |     Window calculation | Render to layout effect |
| ------------------------- | ---------------: | ----------------: | ---------------------: | ----------------------: |
| Programmatic, development |             14.9 |               5.0 | below timer resolution |                     5.0 |
| Wheel, development        |      unavailable |               1.8 | below timer resolution |                     5.2 |
| Programmatic, production  |             14.8 |               4.3 | below timer resolution |                     2.0 |
| Wheel, production         |      unavailable |               2.0 | below timer resolution |                     1.8 |

Production calculation p95 was approximately 0.1ms. All four runs observed 60 scroll events and 60 commits, with 60 uncovered animation-frame samples during motion, followed by covered final viewports. The development baseline buffer experiment had zero window/committed-position mismatches at 200, 400 and 800px increments. Its DOM stayed at 25–35 rows for those aligned vertical positions.

## Finding and limits

The measured delay lies in browser event delivery and the React state-to-DOM update path, not the fixed-geometry window calculation. Production rendering reduces work but does not remove uncovered viewport samples. An 800px advance exceeds the 400px forward buffer while the DOM still reflects an older scroll position.

An animation-frame callback is not a paint timestamp. These results establish stale DOM coverage at a pre-paint observation point and a plausible source of the reported blink; they do not quantify actual blank painted frames, compositor latency, raster cost, or GPU behavior. No overscan policy, scheduling strategy, memoization, synchronous flushing, or virtualization algorithm was changed.

Next investigation: capture browser performance traces with screenshots for native fast scrolling, correlate the event/render/commit stages with paint and compositing, then evaluate a targeted rendering or scheduling change against the same workload. Do not treat increasing the buffer as a proven fix.

## Reproduction and verification

```powershell
pnpm nx run-many -t test typecheck lint -p @org/playground --skipNxCache
pnpm nx run @org/playground:e2e --args='--project=chromium --workers=1 --reporter=line'
$env:GRID_TEST_PRODUCTION='1'
pnpm nx run @org/playground:e2e --args='scroll-delay.spec.ts --project=chromium --workers=1 --reporter=line --output=test-output/scroll-delay-production'
Remove-Item Env:GRID_TEST_PRODUCTION
```

The explicit playground `e2e` target allows running browser tests without reverting the pending removal of the global Playwright Nx plugin. Playwright lint rules are scoped to browser tests rather than Vitest files. Production mode builds and starts a fresh preview server on port 4300; development uses port 4200.

Browser correctness coverage now includes the specified large jumps, both axes together, actual bottom/right clamping and a return to origin. It compares every rendered logical cell identity against the expected window, including all pinned columns, and asserts a bounded cell count. This complements the existing geometry unit tests and pinned-position browser tests.

The overall POC is not yet marked VALIDATED: paint/compositor investigation and the remaining performance/memory/scalability exit criteria are still open.

Final verification: 27 unit tests passed; typecheck passed; lint passed with four conditional-in-diagnostic-test warnings; all 13 Chromium tests passed against the production build. Firefox and WebKit were not run. The final saved production run reproduced median programmatic stages of 14.9ms / 4.6ms / below timer resolution / 2.0ms, and wheel render stages of 2.1ms / below timer resolution / 1.9ms. Both input runs again observed 60 events, 60 commits and 60 uncovered pre-paint samples.
