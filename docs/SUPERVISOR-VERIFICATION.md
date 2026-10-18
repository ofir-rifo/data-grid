# Supervisor hardening and harmless verification — 2026-10-18

## PR #4 review preparation — no publication authorized

Tech Lead accepted the latest executed scenarios recorded below. Proposed scope:
15 files (eight supervisor/fixture files, playground Nx target configuration and
six documents). local-runner.mjs stays untracked, unchanged and excluded. No
production implementation, dependencies, lockfiles or CI workflow changes.
All eight executable source hashes match the accepted batch manifest. The three
NOT VERIFIED cases below remain explicit; earlier entries are historical snapshots,
not current execution authorization or replacement results. No additional checks
or workloads ran for PR preparation. Performance HOLD / production NO-GO.
Review order: native ownership/capture → guard/telemetry/assertions → launcher and
fixtures/targets → evidence and historical protocol. The fixed per-user PowerShell
7.6.5 location is a portability limitation, not a general CI command. Publication,
commits and additional execution require separate approval.

## Latest authorized batch — PASS for tested scenarios; performance HOLD

Preflight reviewed lookup-only recovery requiring owned-job membership AND a
signaled native process handle; access denial/live/nonmember/failed proof remain
fail-closed. Original timers, independent watchdog, limits and PASS assertions
unchanged. Verification cannot reach local-runner/build/Chromium/performance.
Exactly one batch ran, no retries or code/threshold changes:

```powershell
$env:NX_DAEMON='false'
$env:NX_NO_CLOUD='true'
$env:NX_SKIP_REMOTE_CACHE='true'
$env:NX_SKIP_NX_CACHE='true'
$env:NX_ISOLATE_PLUGINS='false'
$env:NODE_OPTIONS='--max-old-space-size=2048'
pnpm nx run @org/playground:perf-local-verify --excludeTaskDependencies --skipSync --parallel=1
```

Exit **0**; launcher **5954.6453ms**, Nx task **6.0s**. Evidence:
`C:\Users\ofirr\Documents\Codex\datagrid-performance\2026-10-18T20-18-12-219Z-verify`.

| Scenario | Result |
| --- | --- |
| limits-and-ownership | PASS |
| explicit-stop | PASS |
| kill-on-close | PASS |
| supervisor-failure | PASS |
| watchdog-timeout | PASS |
| synthetic-resource-failures, nine exact reasons | PASS |
| Exit-race decision regressions within synthetic group | PASS |
| evidence-write-failure | PASS; expected injected error retained |
| launcher-timeout | PASS |
| sentinel-and-teardown | PASS |
| Native fallback actually exercised by natural exit race | NOT VERIFIED; no branch counter |
| Full 30-second outer deadline expiration | NOT VERIFIED |
| Stdout overflow/nonempty fixture stderr | NOT VERIFIED |

Timeout fixture PID 29416 exited 0; report existed and parsed. Reported reason:
launcher-timeout; supervisor guard reason null, guard cleanup errors empty.
Parent independently confirmed all three retained exits, empty Job Object and
sentinel survival before forced cleanup. Timeout tree proof and cleanup true;
overall teardownVerified true. Child exit was reported as SIGKILL by Node.
Capture: 1241 stdout bytes, zero stderr, no truncation (65536-byte caps unchanged).
The separately owned sentinel survived assertions, then was intentionally stopped
in final cleanup. Read-only post-batch-inventory.json found none of 36 recorded PIDs
present; raw results unchanged. Nx emitted native-cache EPERM fallback warning;
execution completed without another unexpected error or observed instability.

The synthetic assertions verify the recovery decision and failure propagation,
not direct Windows OpenProcess/IsProcessInJob/Wait invocation coverage. This single
passing run does not prove elimination of the timing race, all native fault paths,
performance readiness or hardware stability. Earlier failures remain preserved.
Only the three verification/status/journal documents changed; no source edits,
Stage 0/build/browser/workload, policy/dependency change, commit/push or PR.
Performance HOLD / production NO-GO; next step is Tech Lead review of this evidence.

## Historical: narrowly scoped telemetry exit confirmation — static preparation

Confirmed failure location: `GridSafety.Observe` called `Process.GetProcessById(7596)`;
the ArgumentException was wrapped as missing telemetry and the guard terminated
the fixture job. The old fallback re-enumerated the job but did not establish
absence. Evidence cannot prove exit or membership at that exact instant: the
underlying Windows enumeration/exit race remains LIKELY, not conclusively proven.

Changed only guard-verification.cs plus these three status documents. Both Observe
and WorkingSet now recover from a lookup-stage ArgumentException only with new
independent native proof: OpenProcess with QUERY_LIMITED_INFORMATION|SYNCHRONIZE,
non-inheritable SafeProcessHandle; IsProcessInJob against the actual owned job;
zero-time WaitForSingleObject must signal exit. The temporary handle is disposed
on every path and never used for termination. A live/nonmember process is not
accepted; failed open/query/wait fails closed and preserves original plus probe
errors. Absence from a later PID list alone no longer permits skipping telemetry.
No polling delay, retry, blanket exception suppression or changed resource limits.
The existing post-acquisition retained-process exit handling remains unchanged.

Added unexecuted deterministic assertions to the existing synthetic-failure group:
confirmed lookup exit accepted; unconfirmed/live/nonmember proof rejected;
post-lookup errors and access denial do not enter recovery; failed independent
probe propagates. This covers the recovery decision, not Windows interop behavior.
All existing PASS assertions, timers, watchdog/termination and ownership policies
remain; no launcher/helper/native ownership implementation changed.

Static C# compilation of all three source files via reviewed-host Add-Type PASS;
git diff --check PASS. No methods, regression assertions, canaries or verification
were executed. No build/browser/performance/dependency/policy changes or commit/push.
Residual risk: Windows may refuse to open an exited object or no longer report
job membership, so this conservative correction may still abort the timeout test.
PID reuse cannot satisfy recovery without membership plus exited-handle proof;
native race behavior and future fixture success remain NOT VERIFIED. Full outer
timeout and overflow/nonempty stderr remain NOT VERIFIED. Performance HOLD / POC NO-GO.

## Historical diagnostic batch — FAIL; guard-triggered termination identified

Exactly one authorized batch ran with unchanged code/thresholds, stopped at the
first assertion failure and was not retried. Command:

```powershell
$env:NX_DAEMON='false'
$env:NX_NO_CLOUD='true'
$env:NX_SKIP_REMOTE_CACHE='true'
$env:NX_SKIP_NX_CACHE='true'
$env:NX_ISOLATE_PLUGINS='false'
$env:NODE_OPTIONS='--max-old-space-size=2048'
pnpm nx run @org/playground:perf-local-verify --excludeTaskDependencies --skipSync --parallel=1
```

Exit **1**; launcher **5676.5967ms**, Nx task **5.8s** (shell invocation 9.63s).
Preflight static review confirmed original PASS assertions, live independent
watchdog, 29.5s helper/30s outer timeout and workload isolation. No source changes
were made. Nx warned of EPERM copying its native module to cache and loaded the
original instead; no retry was requested. No evidence links this warning to the
subsequent telemetry failure.

| Scenario | Result |
| --- | --- |
| limits-and-ownership | PASS |
| explicit-stop | PASS |
| kill-on-close | PASS |
| supervisor-failure | PASS |
| watchdog-timeout | PASS |
| synthetic-resource-failures (nine exact abort reasons) | PASS |
| evidence-write-failure | PASS |
| launcher-timeout | FAIL |
| sentinel-and-teardown final scenario | NOT VERIFIED; incomplete-not-run |
| Full 30-second outer expiration | NOT VERIFIED |
| Stdout overflow/nonempty fixture stderr | NOT VERIFIED |

Evidence:
`C:\Users\ofirr\Documents\Codex\datagrid-performance\2026-10-18T20-11-35-418Z-verify`.
`launcher-timeout/result.json` now records the independent guard abort:
`watchdog-failure: System.InvalidOperationException: Missing live owned-process telemetry: 7596`,
caused by `ArgumentException: Process with an Id of 7596 is not running` in
`GridSafety.Observe` / `Process.GetProcessById`. Guard cleanup errors: empty.
PID 7596 is the fixture's PowerShell child: stdout records its accepted timeout
termination request at 1511.8049ms. The guard's exception path calls `job.Stop()`,
terminating the containing fixture job. Fixture PID 13900 exited 1 without a report;
the parent failed its existing exit-code-zero assertion. Capture persisted 486
stdout bytes, zero stderr, no truncation.

**Confirmed mechanism:** telemetry failure triggered independent guard termination,
interrupting fixture reporting. **Likely underlying race:** an exiting child was
still returned by Job Object enumeration while no longer openable by PID. The
Observe fallback did not establish its absence; no retained handle for this direct
PowerShell child exists in the parent. Exact Windows membership-transition timing
is not captured. This evidence does not prove the older run had the same cause or
implicate SafeHandle corruption. Do not suppress telemetry failures or weaken the
guard without a reviewed identity-safe correction.

Before parent-forced cleanup: retained fixture 13900 exited 1; canaries 24072 and
23004 exited 0; job PID list empty; sentinel alive; report absent. Final fixture
cleanup confirmed true, timeout proof false, overall teardownVerified false.
The final sentinel scenario remains unexecuted even though pre-cleanup survival
was observed. Read-only post-batch inventory found none of 36 recorded PIDs present;
saved in `post-batch-inventory.json`, without changing raw summaries or killing PIDs.

Only this document, PROJECT-STATUS.md and AI-DEVELOPMENT-JOURNAL.md changed. No
Stage 0/build/Chromium/performance/dependency/policy/production changes, commit or
push. Performance HOLD / production NO-GO. Next: Tech Lead review of an identity-
safe telemetry/exit-race correction; no fix or further run authorized by this result.

## Historical: targeted parent diagnostics — static checks only

Added diagnostic instrumentation only to `guard-verification.cs`; no termination,
SafeHandle, helper/launcher, timeout, resource-limit or PASS requirement changes.
No fixture-side breadcrumbs were necessary. This revision has NOT run.

New parent-owned evidence fields:

- `supervisorGuardAbortReason` and `supervisorGuardCleanupErrors`, separate from
  `fixtureReportedAbortReason`. Legacy `firstAbortReason` remains a fixture-reported
  field for compatibility; null does not mean the independent guard was healthy.
- `fixtureReportExists` (file presence) separately from `fixtureReportPresent`
  (successfully parsed report). Presence is recorded before the exit-code assertion
  and again before forced cleanup, even when the fixture fails unexpectedly.
- `preCleanupObservations`: timestamped retained-process IDs/exit states/exit codes,
  Job Object PID list and nullable `jobEmpty`, nullable `sentinelAlive`, report
  existence and guard state. Observation errors are retained and prevent PASS.

`before-parent-forced-cleanup` is durably acknowledged through the existing bounded
parent writer before cooperative disposal/explicit job termination. The independent
watchdog remains active, so observations are sequential, not atomic, and cannot
claim no earlier watchdog termination. The same observations are included in the
parent completion event and final result; write failures remain failures and do
not bypass cleanup. Existing retained-exit, empty-job, successful capture, fixture
report and sentinel PASS assertions remain unchanged.

Static check PASS: reviewed PowerShell host compiled the three C# source files
using `Add-Type -Path` only; no supervisor methods invoked. `git diff --check` PASS.
No verification/canary/build/browser/performance execution. Historical exit-1 root
cause remains UNKNOWN; this instrumentation cannot reconstruct absent old evidence.
Full outer-timeout expiration and overflow/nonempty-stderr cases remain NOT VERIFIED.
Unexpected native termination, parent/disk failure and the unretained direct
PowerShell child's exit remain blind spots. Performance HOLD / production NO-GO.

## Historical revised-implementation batch — FAIL; no retry

One conditionally authorized batch ran, then stopped on its first failure. Seven
groups passed; launcher-timeout failed; the final sentinel/teardown group did not
run. No implementation changes or retries followed. Performance remains HOLD and
production POC remains NO-GO. Older PASS records below concern earlier source hashes.

Exact command (sequential, Node old-space 2048MiB):

```powershell
$env:NX_DAEMON='false'
$env:NX_NO_CLOUD='true'
$env:NX_SKIP_REMOTE_CACHE='true'
$env:NX_SKIP_NX_CACHE='true'
$env:NX_ISOLATE_PLUGINS='false'
$env:NODE_OPTIONS='--max-old-space-size=2048'
pnpm nx run @org/playground:perf-local-verify --excludeTaskDependencies --skipSync --parallel=1
```

Exit **1**; launcher elapsed **5427.1608ms**, helper **5426.0267ms**, Nx **5.5s**.
Independent 29.5s helper/30s outer deadlines remained armed; native watchdog and
resource checks remained active. No Stage 0, build, browser or workload ran.

| Scenario | Result |
| --- | --- |
| limits-and-ownership | PASS |
| explicit-stop | PASS |
| kill-on-close | PASS |
| supervisor-failure | PASS |
| watchdog-timeout | PASS |
| synthetic-resource-failures (nine exact abort reasons) | PASS |
| evidence-write-failure | PASS (expected injected error retained) |
| launcher-timeout | FAIL |
| sentinel-and-teardown | NOT VERIFIED; incomplete-not-run |
| Full 30-second outer deadline expiration | NOT VERIFIED |
| Stdout overflow/truncation and nonempty fixture stderr | NOT VERIFIED |

Evidence directory:
`C:\Users\ofirr\Documents\Codex\datagrid-performance\2026-10-18T19-59-38-243Z-verify`.
The parent persisted `launcher-timeout/result.json` and bounded pipe logs despite
fixture failure. Capture completed: 486 stdout bytes, zero stderr, neither truncated
(65536-byte cap per stream). Native fixture PID 13292 exited 1; stdout records a
retained-child-handle termination request for PID 14680 at 1528.5502ms with
`killRequested:true`, no error, and `treeTerminationProven:false`. No subsequent
child-exit/final fixture report was saved. Exact reason for the reporter's exit 1
is unresolved; accepted kill request alone is not proof of successful teardown.

Parent timeout cleanup reports `cleanupVerified:true`, but timeout proof remains
`passed:false`, `treeTerminationProven:false`; overall `verification-result.json`
retains `teardownVerified:false`. Sentinel survival was asserted after the seven
completed groups, not after the failed timeout; final sentinel verification is
incomplete. A separate read-only `post-batch-inventory.json` found **none of 36
recorded PIDs present**. This observation does not replace the missing assertions
or alter the failed summary. No PID-based cleanup was attempted.

Pre-run static JS syntax, PowerShell parsing, C# compilation and whitespace checks
passed. Review confirmed direct explicit-host invocation, SafeHandle ownership,
bounded cleanup and independent deadlines; runtime failure prevents acceptance of
the revision. Verification remains isolated from local-runner/build/Chromium.
Kill-denial, missing-exit and exceptional native-constructor paths remain untested.
Only this document, PROJECT-STATUS.md and AI-DEVELOPMENT-JOURNAL.md changed in this
task. Existing uncommitted work/local-runner and earlier artifacts were preserved.
Next: Tech Lead review of the fixture exit/reporting failure before any correction
or additional run. No performance or hardware-stability conclusion is supported.

## Historical static hardening after earlier accepted canaries

Tech Lead requested static corrections only; no tests, Stage 0/build/Chromium,
workloads, dependency/policy/production changes, commit or push. The accepted nine
passing groups below apply to the earlier hashed implementation, not this revision.
Performance remains HOLD; production POC remains NO-GO.

Established defects and corrections:

1. **Unbounded cleanup after launcher failure.** Previously `done` waited forever
   for child `exit` after a failed taskkill. The helper now returns a failure by its
   fixed deadline even without exit or completed fsync. It reserves up to 500ms for
   cleanup before that deadline. The outer launcher gives the helper 29.5s, retaining
   a separate 30s failure-exit timer through final evidence/descriptor closure.
   Outcome explicitly records unconfirmed teardown/diagnostics and cannot PASS.
   Started/terminal records are flushed where possible; disk/kernel failure can
   still prevent a final durable record. An absent final record stays incomplete.
2. **Liveness/identity ambiguity.** Explicit starting/running/exited/spawn-failed
   state consumes both exit code and signal. There is one termination attempt only
   after confirmed spawn. It uses `ChildProcess.kill` on the retained Windows child
   handle, not numeric-PID taskkill/process.kill. Unknown identity means withheld
   cleanup and failure, not unsafe PID fallback. Direct-child exit is distinct from
   native retained-handle/empty-job proof; independent tree assertions remain intact.
3. **Inherited shell trust.** Direct spawn with `shell:false` and an argument array
   removes ComSpec/PATH shell selection and interpolation. The explicit reviewed
   PowerShell 7 path and the host/version/effective-policy checks remain. No host
   discovery/fallback, execution-policy flag, metadata stripping or settings change.
   Path selection remains machine-specific; mutable user-runtime binaries are not
   cryptographically pinned, so this is a trusted local tool, not a security sandbox.
4. **Exceptional native ownership.** The job now has a SafeHandle owner, with P/Invoke
   references protected against disposal and finalization fallback for abandoned
   construction. Explicit close errors remain visible. Managed retained-process
   wrappers are disposed on failed startup/native-close paths; post-resume close
   failures attempt bounded retained-handle cleanup. Pipe ownership transfers once
   into SafeFileHandle objects; incomplete capture construction closes unstarted
   readers while started reader threads own their handles. SafeHandle disposal is
   idempotent, avoiding a second native close through FileStream/finally paths.
   Original and cleanup errors remain aggregated. No constructor/finalizer fault
   injection was run; finalization is a fallback, not a timely cleanup guarantee.
5. **Dormant measurement code.** `local-runner.mjs` remains untracked, untouched,
   and explicitly excluded from the proposed PR. SHA-256 before this task:
   `F4889622EC887AEA5B9BFA594CCBCEEB9EF5BEA4D29CF1D27E6D2A378019A56A`.
   Do not use blanket `git add .` or include that file. It can start workloads if
   directly invoked, but is never imported/invoked by the verification call graph.
6. **Status consistency.** Measurement/protocol summaries now distinguish accepted
   historical nine-group success from later unverified static corrections; earlier
   failures and proposed runtime protocol remain clearly historical, not approval.

The fixture's observed-timeout predicate now requires confirmed direct exit,
confirmed diagnostics, accepted retained-handle termination and the expected abort
reason. It still self-reports `passed:false`. Native parent checks for retained
exits, empty job **before forced cleanup**, successful capture and sentinel survival
were not removed, loosened or replaced by inferred success.

Both prior coverage gaps remain explicit:

- **NOT VERIFIED:** actual full 30s outer-deadline expiration.
- **NOT VERIFIED:** capture overflow/truncation and nonempty fixture-stderr payload.

Additionally this revision's direct host launch, kill-denial/missing-exit/signal
failure handling, bounded failure completion and SafeHandle/constructor-error
behavior are **NOT VERIFIED at runtime**. No prior PASS is promoted to cover them.
The verification path contains only launcher → reviewed PowerShell → C# guard/
canaries/fixtures. There are no imports/calls to local-runner, Vite, Chromium or
benchmark workloads; the separate `perf-local` target still fails closed.

Static checks: JavaScript syntax, PowerShell parsing and C# compilation only, plus
Git whitespace and untouched-local-runner identity inspection. No methods or
verification entry points invoked. See project status/journal for final results.

Final static result for this task: all checks above **passed**. The local runner's
SHA-256 matches the pre-task value and `git ls-files` still reports it untracked.
Changed exactly 11 files this task:
`tools/performance/owned-shell.mjs`, `launch-local.mjs`,
`launcher-timeout-case.mjs`, `windows-job.cs`, `captured-process.cs`, and
`docs/PERFORMANCE-MEASUREMENT.md`, `LOCAL-PERFORMANCE-PROTOCOL.md`,
`LOCAL-LAUNCHER-REVIEW.md`, `SUPERVISOR-VERIFICATION.md`, `PROJECT-STATUS.md`,
`AI-DEVELOPMENT-JOURNAL.md`. Earlier uncommitted files were preserved.

Proposed PR scope stays 15 files (eight test-tooling files, app Nx targets and six
documents), excluding local-runner. Current code is ready for static Tech Lead
review, not publication or performance execution; further harmless validation
requires separate authorization. Raw artifacts remain external and unchanged.

API basis: libuv's Windows `uv_process_kill` targets `process->process_handle`,
unlike `uv_kill(pid)` ([upstream source](https://github.com/libuv/libuv/blob/v1.x/src/win/process.c)).

## Earlier authorized batch — PASS, performance runtime still HOLD

Exactly one separately authorized harmless batch ran against the diagnostic-fix
tooling, with **no code changes before/after execution in this task**. Command:

```powershell
pnpm nx run @org/playground:perf-local-verify --excludeTaskDependencies --skipSync --parallel=1
```

Daemon/Cloud/caches disabled, plugin isolation off, Node old-space 2048MiB.
Exit **0**. Launcher **5870.2653ms** (owned-shell 5869.5750ms), Nx task 6.0s;
below the 30s cap, **no retries**. Prior failures below remain historical.
No Stage 0, production build, preview, Chromium, benchmark or stress workload.

Pre-execution review confirmed suspended creation/job assignment, selective handle
inheritance, 64KiB-per-stream capture, fail-closed evidence, retained-handle exit,
empty-job/sentinel assertions and parent-only final PASS. Independent 30s launcher
timer, 25s batch watchdog, per-case watchdogs and resource guards remained active.
JS syntax, C# compilation, PowerShell parsing and whitespace checks passed first.

| Required check | Actual result |
| --- | --- |
| Queried Job Object limits and retained parent/grandchild ownership | PASS |
| Explicit termination and empty-job cleanup | PASS |
| Kill-on-last-handle-close | PASS |
| Abrupt canary-supervisor failure and descendant cleanup | PASS |
| Independent native watchdog timeout | PASS |
| Nine exact synthetic resource/telemetry/phase abort reasons; reason preserved through later observations/cleanup | PASS |
| Injected evidence-writer failure and exact abort/termination path | PASS |
| Launcher timeout via shared implementation with 2s fixture deadline | PASS |
| Final sentinel survival and deliberate owned cleanup | PASS |
| Surviving-parent capture/flush and authoritative timeout result | PASS: 1969 stdout bytes, 0 stderr bytes, no truncation |
| Actual expiration at the full 30s outer deadline | NOT VERIFIED: timer armed; same implementation exercised at 2s |
| Capture overflow/truncation and nonempty fixture-stderr payload | NOT VERIFIED: neither occurred in this batch |
| Real OOM, disk saturation, kernel hang or hardware stability | NOT VERIFIED; deliberately excluded |

The fixture exited **0**, targeted shell exited **1** as expected after timeout,
taskkill exited **0**, Node signal values were null. The parent independently
verified three retained handles exited, the tested Job Object was empty **before
forced cleanup**, capture completed, and sentinel remained alive. Parent-written
`launcher-timeout/result.json` has `passed:true`, `treeTerminationProven:true`,
`cleanupVerified:true` and `errors:[]`. The fixture's own provisional report
correctly remains `passed:false`; successful taskkill alone did not establish PASS.

Top-level `verification-result.json` records all nine groups passed and
`teardownVerified:true`. The sentinel was outside the tested jobs, survived all
checks including timeout termination, then was intentionally stopped during its
separately owned job's final cleanup. No unrelated user process was targeted.
A post-batch **read-only** inventory found none of **36 recorded canary/sentinel/
fixture/shell PIDs** present. Expected injected writer-error text in host stderr is
test evidence, not an unexpected batch failure. Total artifacts after inventory:
17,758 bytes; stream cap was 65,536 bytes each.

Evidence directory:
`C:\Users\ofirr\Documents\Codex\datagrid-performance\2026-10-18T19-39-27-719Z-verify`.

- `launcher.jsonl`: source hashes, outer timer state, exit/signal and elapsed time.
- `verification.jsonl`, `verification-result.json`: incremental full matrix and
  durable successful final teardown result.
- `launcher-timeout-parent.jsonl`: native exit/capture metadata and independent
  retained-handle/empty-job/sentinel proof.
- `launcher-timeout/fixture.stdout.log`, `fixture.stderr.log`, `timeout.jsonl`,
  `reported-result.json`, `result.json`: bounded diagnostics, taskkill outcome,
  provisional fixture report and authoritative parent decision.
- `host.stderr.log`: expected injected evidence failure. `post-batch-inventory.json`:
  read-only no-leftovers observation. Prior failed directories remain untouched.

Only `docs/SUPERVISOR-VERIFICATION.md`, `docs/PROJECT-STATUS.md` and
`docs/AI-DEVELOPMENT-JOURNAL.md` changed in this task; all earlier uncommitted work
was preserved. No dependency/policy/production-code change, commit or extra run.

This establishes bounded harmless-supervision evidence for this Windows host/run,
not performance POC validation or a hardware-stability diagnosis. Native capture
failure/overflow and full 30s emergency duration are not newly proven. The old
performance runner stays unreachable; integrating the actual performance controller
and Stage 0/build/Stages 1–2 requires **separate Tech Lead approval**. Runtime
performance execution remains HOLD.

## Historical diagnostic fix — static checks passed, runtime HOLD

Following the failed rerun, Tech Lead authorized diagnostics/source corrections
only. **No verification, Stage 0, build, Chromium or performance workload was
executed.** Previous failed artifacts/results below remain unchanged.

Lifecycle review: surviving C# verifier → job-owned Node fixture → shell →
PowerShell canary owner → nested job-owned sleeping parent/grandchild. After the
2s timer, Node requests taskkill for its owned shell tree. Previously only the
fixture could write `result.json`, after `await launch.done` and another evidence
write. A rejection/uncaught exception or reporter termination before that point
skipped the result; `finally` only closed the fixture's file. Both fixture stdout/
stderr and nested host output were discarded, and C# asserted successful exit
before saving the exit value. Thus the confirmed design defect was **missing
surviving-owner failure diagnostics and completion authority**.

The historical log proves the timer fired and taskkill returned success. It does
**not** establish the exact exception/signal/exit value that prevented the fixture's
final write. Static inspection cannot recover discarded output or prove that the
reporter was killed. The precise original runtime trigger remains unknown; this
fix makes that distinction explicit rather than inventing a root cause.

Correction implemented, not executed:

- New native `StartCaptured` keeps suspended creation/assignment before resume.
  STARTUPINFOEX selectively inherits only NUL/stdout/stderr handles; unrelated job
  handles are not inherited. The C# parent owns pipe readers and evidence files.
- Independent parent capture saves ≤65,536 bytes per stream to
  `launcher-timeout/fixture.stdout.log` and `fixture.stderr.log`, drains excess,
  and records byte totals/truncation. Capture errors abort; no missing data becomes
  a pass. Reader threads cannot bypass watchdogs by blocking the verifier on IO.
- `launcher-timeout-parent.jsonl` records start/exit UTC, retained process identity,
  exit code, bounded capture metadata, proof and separate original/cleanup errors.
  Windows retained handles supply exit codes; the signal is explicitly unavailable
  there. Node's actual exit event now records code **and signal**. Taskkill result
  includes its exit code/signal/error/output and UTC/monotonic timestamps.
- The fixture mirrors lifecycle/termination events to parent-captured stdout,
  catches/report errors, and writes only `reported-result.json` with `passed:false`.
  It cannot assert its own process-tree termination. `ownedShell` likewise returns
  `treeTerminationProven:false`; successful taskkill is never promoted to proof.
- Only the surviving C# parent writes `launcher-timeout/result.json`, after checking
  fixture exit 0, exact expected timeout report, retained parent/grandchild exits,
  empty Job Object **before forced cleanup**, successful pipe capture and sentinel
  survival. Final cleanup/diagnostic failures also prevent PASS. A missing/malformed
  fixture report remains failure; parent terminal diagnostics still persist when
  the fixture cannot write its own result.
- Cleanup now attempts guard stop, job termination, retained-handle waits,
  empty-job verification and handle disposal even if an earlier cleanup step fails;
  errors are aggregated. Final sentinel-disposal errors set overall failure and
  `teardownVerified:false`. The final sentinel group is still not skipped after a
  passing timeout group, and remains incomplete if that preceding group fails.

The launcher retains its independent 30s timer; no authorization gates/timeouts
were removed or extended. No assertions were weakened. New native capture code and
its handle inheritance/pipe EOF behavior require a later authorized harmless check.
Disk stalls, parent/OS failure or power loss can still prevent durable evidence;
the independent parent is outside the target job, not outside the whole experiment.

Static-only checks executed: `node --check` for launch-local, owned-shell and
launcher-timeout-case; PowerShell parser for local-supervisor; `Add-Type -Path`
for windows-job/captured-process/guard-verification; Git whitespace check. All
passed. No C# methods, supervisor script, tests, lint, browsers or workloads invoked.

Files changed in this diagnostic task: `tools/performance/launch-local.mjs`,
`launcher-timeout-case.mjs`, `owned-shell.mjs`, `guard-verification.cs`,
`windows-job.cs`, `local-supervisor.ps1`, new `captured-process.cs`, plus
`docs/SUPERVISOR-VERIFICATION.md`, `PROJECT-STATUS.md`, `AI-DEVELOPMENT-JOURNAL.md`.

References for the reviewed native/Node API contracts:
[selective handle inheritance](https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-updateprocthreadattribute),
[extended startup attributes](https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-initializeprocthreadattributelist),
[Node child lifecycle](https://nodejs.org/download/release/v26.8.2/docs/api/child_process.html).

## Historical authorized rerun — FAILED, runtime HOLD

Exactly one separately authorized rerun on the existing uncommitted branch; no
automatic retry. Exit **1**, launcher **5752.6814ms** (owned-shell elapsed
5752.0919ms), Nx task 5.8s, below the 30s maximum. No Stage 0, build, preview,
Chromium, benchmark, stress workload, dependencies or policy/settings changes.
The earlier failed batch below remains historical evidence, not overwritten.

Before this rerun, source review replaced writable reason fields with a shared
write-once `GridAbortRecord`: healthy/null observations, later failures, watchdog
exceptions, explicit stop, cleanup errors and watchdog disposal cannot assign over
the first reason. Cleanup errors are stored separately. The synthetic regression
uses nine independently specified expected strings, then deliberately supplies a
healthy sample, secondary abort and cleanup error, and checks exact equality both
before and after disposal. Replacing `Observe` with the old unconditional overwrite
would deterministically lose the first reason and fail this assertion. This is a
static mutation argument, not an additional executed mutant/verification batch.

The real launcher keeps its independent 30,000ms timer. `owned-shell.mjs` is now
shared with a harmless timeout fixture using a 2,000ms deadline, allowing the same
termination path to be exercised without consuming the entire batch allowance.
Static JavaScript syntax, C# compilation, targeted Nx ESLint and whitespace checks
passed before execution. No assertion was weakened or failed group skipped.

| Required check | Actual rerun result |
| --- | --- |
| Limits and parent/grandchild ownership | PASS |
| Explicit job termination | PASS |
| Kill-on-close | PASS |
| Abrupt supervisor failure cleanup | PASS |
| Independent native watchdog timeout | PASS |
| Nine synthetic resource/telemetry/phase reasons, first-reason preservation and cleanup errors | PASS |
| Actual injected evidence-writer exception, exact `evidence-write-failure`, owned-process stop | PASS |
| Shared launcher-timeout path, shortened to 2s | FAIL: fixture exited unsuccessfully before persisting its result |
| Final sentinel survival/teardown group | INCOMPLETE, not run after failure |

The shared timeout **did fire**: nested `timeout.jsonl` records
`reason=launcher-timeout` and successful owned-shell-tree termination (`error=null`)
at 2140.6562ms. Nevertheless the fixture did not produce `result.json` or its final
expected-timeout event, and the caller rejected its nonzero exit. This remains a
failure, not a timeout-validation pass. Nested fixture stdout/stderr was ignored;
the precise underlying fixture exception/exit value is therefore not established.
Do not infer a successful full launcher emergency path from taskkill output alone.

The sentinel survived each of the seven completed groups. The final dedicated
sentinel group was not reached. Cleanup ran without a logged cleanup exception;
the original summary correctly remains `teardownVerified:false`. A subsequent
read-only inventory found **none of 33 recorded canary/sentinel PIDs** present.
That is no detected leftovers, not completion of the missing final group or a
hardware-stability guarantee. No code fix or second rerun followed this failure.

Evidence directory:
`C:\Users\ofirr\Documents\Codex\datagrid-performance\2026-10-18T19-24-29-973Z-verify`.
Preserved `launcher.jsonl` (all executed-tool hashes and outer timer state),
`verification.jsonl`, `verification-result.json`, host logs, nested
`launcher-timeout/timeout.jsonl`, ready markers and `post-failure-inventory.json`.
The empty injected-writer file is intentional failure evidence. All previous
artifacts remain untouched.

Changed in this rerun task only: `tools/performance/guard-verification.cs`,
`launch-local.mjs`, new `owned-shell.mjs`, new `launcher-timeout-case.mjs`, and
`docs/SUPERVISOR-VERIFICATION.md`, `PROJECT-STATUS.md`, `AI-DEVELOPMENT-JOURNAL.md`.
No commit/merge. Performance execution remains explicitly disabled.

Next Tech Lead review: investigate the timeout fixture with captured diagnostics,
then decide whether to authorize another harmless check. Launcher timeout/final
sentinel verification and future performance-controller integration remain open.
Synthetic inputs still do not prove real OOM/full-disk/OS-hang/BSOD safety or
durability during power loss. No POC performance/paint validation is implied.

## First batch — historical failed result

**Overall FAILED; runtime HOLD remains.** One authorized verification invocation,
no retry. No Stage 0, production build, preview server, Chromium or performance
experiment ran. Source baseline `27b4f16`; uncommitted branch
`codex/local-performance-protocol`. Default-off flushSync and production code unchanged.

## Implementation and scope

`perf-local-verify` invokes `node tools/performance/launch-local.mjs verify`.
The Node launcher uses the explicit reviewed PowerShell 7.6.5 executable with
ordinary `-NoProfile -NonInteractive -File`, through a cmd.exe shell as requested.
Paths are quoted and reject shell metacharacters/environment-expansion syntax.
No policy flag, host fallback, encoded/stdin script, settings change or dependency.
PowerShell checks its executable/version/effective RemoteSigned policy before
loading native helpers. The fixed runtime path is intentionally machine-specific;
runtime updates require review, not fallback to Windows PowerShell 5.1.

`perf-local` now fails closed with Runtime HOLD. The old measurement runner stays
preserved in `local-runner.mjs`, unreachable from the hardened supervisor. Old
uncommitted supervisor/native/runner sources were also snapshotted externally at
`C:\Users\ofirr\Documents\Codex\datagrid-performance\20261018T191244346Z-before-hardening`.
This is a verification-only replacement, not a claim the previous performance
controller has become safe to re-enable.

Hardening implemented:

- Suspended native process creation, assignment before resume, non-inherited job
  handles, queried no-breakaway/kill-on-close/2.5GiB committed-memory flags.
- Retained process handles and atomic readiness markers replace fixed canary sleeps;
  identities/ownership checked before tests. A sentinel is in its own experiment-owned
  job, outside every tested job, and is never globally killed by process name.
- Live owned telemetry errors fail closed; a disappearing PID is accepted only if
  a retained handle confirms exit or the kernel job inventory confirms departure.
- Native termination/handle-close errors checked, primary and cleanup failures
  aggregated. Bounded handle waits and empty-job checks precede teardown success.
- Monotonic watchdog runs independently of PowerShell/control files/disk writes;
  per-case limits 2–5s, overall sentinel watchdog 25s, launcher watchdog 30s starting
  before host spawn. Outer timeout targets only the still-owned shell process tree.
- Evidence writer is a bounded dedicated thread. Producers wait at most 300ms for
  durable acknowledgement; writer failure/queue backpressure aborts. Watchdog never
  waits on fsync. Failed flush cannot be described as successful persistence.
- Supervisor result is flushed after cleanup, independent of worker completion
  markers. Worker-supplied phase/deadline/warm-baseline machinery is removed from
  the executable path. Its previous warm-baseline mismatch cannot be reused: a
  future measurement controller needs explicit supervisor-owned readiness/warm/settle
  transitions, fixed 8min browser deadline and 30s run deadlines before approval.

## Command and actual results

Daemon/Cloud/caches disabled, plugin isolation off, Node old-space 2048MiB:

```powershell
pnpm nx run @org/playground:perf-local-verify --excludeTaskDependencies --skipSync --parallel=1
```

Exit **1**. Launcher measured **2584.6392ms**; Nx task 2.7s. No timeout or retry.

| Group | Actual outcome |
| --- | --- |
| Queried limits and parent/grandchild ownership | Passed |
| Explicit job termination and retained-handle exits | Passed |
| Kill-on-last-handle-close | Passed |
| Abrupt canary-supervisor failure closes its child job | Passed |
| Independent watchdog timeout while verifier sleeps | Passed; expected abort preserved |
| Synthetic resource failures | Failed during original-reason preservation assertion |
| Evidence-write failure injection | Incomplete, not run |
| Final sentinel/teardown group | Incomplete, not run |

The sentinel survived each of the five completed groups. Within synthetic testing,
the available-RAM input produced the expected abort; the following synthetic input
failed `Original failure lost`. Remaining inputs were not completed. No real memory
pressure was generated.

Source review identified a failure-reason race: `Fail(reason)` latched a reason,
but the watchdog could overwrite it with the next healthy/empty-job observation.
The failed run did not persist the overwritten value, so its exact value is unknown.
A **post-run static correction** preserves the first reason and separately records
secondary failures. It compiles, but was **not rerun**; no passing result is claimed
for that correction. Artifact hashes identify the executed pre-correction code.

The historical authoritative summary has `teardownVerified:false`; do not rewrite
it as success. Cleanup paths ran and no cleanup error was logged. A separate
read-only inventory subsequently found none of the 15 recorded canary/sentinel PIDs
still present. This supports no detected leftover canaries, not completion of the
unexecuted final retained-handle verification group.

## Evidence

Directory: `C:\Users\ofirr\Documents\Codex\datagrid-performance\2026-10-18T19-15-56-060Z-verify`

- `launcher.jsonl`: pre-launch manifest/source hashes, elapsed time and failed result.
- `verification.jsonl`: incrementally flushed group starts, passes, expected aborts
  and final failed summary; no fabricated success marker.
- `verification-result.json`: failed groups and explicitly incomplete checks.
- `host.stdout.log`, `host.stderr.log`: normal host execution and assertion stack.
- `*.ready.json`: sleeping canary handshakes; `post-failure-inventory.json`: read-only
  cleanup observation. Original artifacts are preserved unchanged.

Static checks passed: JavaScript syntax, PowerShell parsing, native C# compilation,
targeted Nx ESLint for launcher/canary, and Git whitespace check. After the failed
batch only static compilation/checks are allowed here; no second verification.

## Remaining risks / next Tech Lead decision

1. Review the latch/secondary-error correction and authorize a new **harmless**
   verification batch. Resource, telemetry/phase and evidence-write failure paths
   are not fully validated. No performance authorization follows from static checks.
2. Synthetic failures validate decision/termination paths, not real OOM behavior,
   resource saturation, full-drive stalls, BSOD safety or actual kernel memory denial.
3. The launcher uses shell-tree termination as an outer emergency bound; canary
   verification exercised the internal watchdog, not the 30s outer timeout. Review
   that emergency path separately without extending this completed batch.
4. Managed scheduling, kernel hangs and device write caching prevent absolute hard
   real-time/durability guarantees. The shell/Nx launcher are outside the native job;
   available-RAM observation includes them. A successful canary run is not hardware
   stability evidence, nor DOM/timing/visual/presented-frame POC evidence.
5. Performance execution stays disabled. A future separately approved controller
   must integrate all approved RAM/growth/settling, artifact, run/batch deadline and
   Stage 2/3/4 gates; do not resurrect the old unsafe control-file path.

No commit, merge, dependency upgrade, policy or machine configuration change.
