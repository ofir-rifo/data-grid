# Supervisor hardening and harmless verification — 2026-10-18

## 2026-10-24 — Retained telemetry identity correction; STATIC ONLY

Current deliverable is a reviewable correction, not a successful verification.
No runtime tests, canaries, Nx target, build, browser or benchmark ran in this task.
Earlier failed evidence remains unchanged: overall teardownVerified=false; final
sentinel scenario not executed. Root cause of the historical native false predicate:
UNKNOWN. Source-level misuse of membership as exit proof: PROVEN by the old code.

Exact historical sequence (UTC, evidence 2026-10-24T07-54-06-308Z-verify):

| Time / source | Observation |
| --- | --- |
| 07:54:10.3875882, parent diagnostics | Fixture PID 12784 started via StartCaptured; suspended native startup assigned to parent job before resume; retained creation handle transferred to confirmation ownership |
| 07:54:10.437, captured fixture stdout | Node fixture spawned CrashOwner PowerShell host PID 8264 through owned-shell; it inherited parent-job containment; nested CrashOwner job created the canary pair |
| 07:54:11.942, fixture stdout | 1511.8105ms elapsed; libuv retained-handle kill requested for PID 8264, accepted=true; this is a request, not tree-exit proof |
| Subsequent watchdog reason | GetProcessById(8264) threw ArgumentException; old OpenProcess/membership/wait confirmation returned false, without a nested confirmation exception |
| 07:54:11.9517895, parent diagnostics | Fixture PID 12784 exited 1 after independent guard stopped the outer owned tree |
| 07:54:11.9555345 | reported-result.json absent |
| 07:54:11.9612612, before forced cleanup | Retained handles 12784/8632/36692 exited; empty parent job; sentinel alive; no guard cleanup errors |

The old routine returned false for either `!member` or WAIT_TIMEOUT (258). Neither
value was persisted. No later empty inventory or PID absence distinguishes them.
Do not label the precise native predicate proven. Original fixture stdout and all
parent-owned JSONL/results remain the source of historical evidence.

Implemented protocol: retain a native read-only identity while its PID, creation
FILETIME, unsignaled state and exact job membership are established. A cached
handle outlives exit; a temporary managed Process wrapper must match that identity.
ConfirmTelemetryExit now waits on the retained handle and never reopens the PID or
queries current membership. Native WAIT_FAILED/error and ownership mismatch fail;
WAIT_TIMEOUT is not exit. Only an expected failed PID lookup with confirmed retained
exit is skipped. Removed the prior broad post-lookup HasExited exception escape.
Memory reads and genuine telemetry failures remain fail-closed.

New identity handles are registered before opening, serialized with closure, retained
by GridJob until Dispose, and never used to terminate. Strict teardown checks known
owned handles are signaled; disposal uses the existing shared 1000ms wait allowance.
CloseHandle success is tracked separately from SafeHandle.IsClosed. Failed wait or
close leaves ownership/errors retained; passive retention is not a cleanup worker.
Failed/unvalidated candidate handles are closed without waiting for or terminating
an unrelated process. No original ownership handle or diagnostic error is discarded.
Lock audit: recoverySync may acquire telemetrySync; reverse acquisition is absent.
Closing cannot race a wait on the same retained handle. Stop does not close them.

Future parent/guard snapshots include retained PID, creation time, ownership flag,
last native wait/error/UTC and handle close state. This does not fill missing
historical evidence. The amended [protocol specification](LOCAL-PERFORMANCE-PROTOCOL.md)
defines these contracts and first-observation limitations explicitly.

Added UNEXECUTED pure deterministic cases: known retained exit despite absent current
membership; live/unsignaled wait rejection; absent/mismatched ownership before wait;
WAIT_FAILED Win32 code preservation; unexpected wait rejection; failed/unconfirmed
native close rejection with error preservation; native exception
identity preservation; PID/creation-time mismatch; absent/null/nonzero fixture exit;
missing report; fixture self-PASS, wrong timeout observation and wrong abort reason.
Existing parent retained-tree/job/capture/sentinel assertions remain required.
Pure cases create no native processes or jobs; they are registered in the existing
harmless suite but are not executed by compilation. Real error paths remain untested.

Static three-file C# compilation `/warn:4 /warnaserror+`, four JS syntax checks,
PowerShell parser and `git diff --check` passed, without invoking supervisor/test
methods. Git emitted existing LF-to-CRLF notices, not compiler warnings. Manual full
pending-diff self-review is not independent Tech Lead review or runtime validation.
Unrelated pre-existing .gitignore /.worktrees/ edit preserved and excluded from the
PR4-scoped patch, as is unchanged untracked local-runner.mjs. No PR5/PR6 actions.

Remaining hazards: exit before first trustworthy identity can still fail closed;
late telemetry API errors after lookup are not swallowed; simultaneous schedules,
actual native close/assignment failures, hardware stability and this correction
remain unverified. Native/kernel stalls and pre-assignment supervisor loss retain
their earlier limitations. Natural fallback success, full 30s expiration, capture
overflow/nonempty stderr remain NOT VERIFIED. Performance HOLD; production NO-GO.
Stop for independent Tech Lead review; no commits, pushes, PR updates or runtime.

## 2026-10-24 — End-to-end attempt: BLOCKED after one authorized batch

Current result supersedes readiness implications in earlier historical entries.
Exactly one harmless batch ran; no retries or post-failure implementation edits.
Performance HOLD / production POC NO-GO. No commit, push, PR update or merge.

Pre-run self-review (not independent acceptance) inspected all 15 PR files and
pending ownership/capture/telemetry changes. Two further defects were corrected:
ordinary scenarios could accept cleanup without checking unexpected guard aborts,
and the timeout parent did not dispose its successful capture owner explicitly.
Ordinary guards now require no abort and no cleanup errors; expected-abort cases
require their exact reason and no unexpected secondary errors. Sentinel guard is
stopped/checked before intentional sentinel termination. Capture ownership is
disposed after bounded drain/exit checks, without disposing its Process wrapper
again through the non-owning tracked list. Added synthetic rejection regression
and sampled guard diagnostics (counts, peak owned, lowest available RAM, abort).

Final architecture remains: explicit PowerShell host via direct Node spawn;
suspended native creation/assignment before resume; Job Object kill-on-close,
no breakaway, 2.5GiB committed memory; recovery/confirmation native handles;
serialized teardown and one deferred handoff; explicit retained cleanup owner;
identity-deduplicated historical errors; strict teardown inventory separate from
bounded incomplete live sampling. No new background recovery or performance route.
Atomic assignment at process creation would address the remaining supervisor-crash
window before assignment, but is a separate design change, not implemented here.

Static release gate and source manifest:
`C:\Users\ofirr\Documents\Codex\PR4-final-review-2026-10-24\static-release-gate.json`.
Source patch SHA256 before/after batch:
`7C8D0696030304D6D3F4818F8C7111BE561835271775319296659C48C1AB11C0`.
C# Add-Type `/warn:4 /warnaserror+`, four JS `node --check` checks, PowerShell parser,
and git whitespace checks passed. No supervisor methods ran during compilation.
Read-only `pnpm nx show project @org/playground --json` completed exit 0 after an
EPERM native-cache fallback warning; the subsequent verification used the same
fallback. A separate CIM inventory query was access-denied; it is not cleanup proof.

Exact verification command (workspace root):

```powershell
$env:NX_DAEMON='false'
$env:NX_NO_CLOUD='true'
$env:NX_SKIP_REMOTE_CACHE='true'
$env:NX_SKIP_NX_CACHE='true'
$env:NX_ISOLATE_PLUGINS='false'
$env:NODE_OPTIONS='--max-old-space-size=2048'
pnpm nx run @org/playground:perf-local-verify --excludeTaskDependencies --skipSync --parallel=1
```

Exit **1**; launcher elapsed **5755.5713ms**, native-host observation **5753.6257ms**;
Nx reported **5.8s**, command tool measured **7.8410791s**. The 30s timer excludes
Nx/setup and is not a total-command or hard real-time guarantee. Entry path remains
Nx -> verify launcher -> supervisor Verify -> canaries/CrashOwner/timeout fixture;
no Stage 0, build, browser, benchmark or local-runner route. No dependency/policy
or production-code changes. Existing thresholds/deadlines were not changed.

Evidence:
`C:\Users\ofirr\Documents\Codex\datagrid-performance\2026-10-24T07-54-06-308Z-verify`.

| Scenario | Actual result |
| --- | --- |
| limits-and-ownership | PASS |
| explicit-stop | PASS |
| kill-on-close | PASS |
| supervisor-failure | PASS |
| watchdog-timeout | PASS |
| synthetic-resource-failures | PASS, includes startup/deferred-disposal/history/live-coverage assertions; synthetic schedules, not native failure injection |
| evidence-write-failure | PASS |
| launcher-timeout | FAIL |
| sentinel-and-teardown | NOT VERIFIED; incomplete-not-run |

Confirmed failure chain: fixture stdout records child host PID 8264 and a retained-
handle timeout kill request at 1511.8105ms. Parent watchdog then reports
`Missing live owned-process telemetry: 8264`, caused by GetProcessById throwing
ArgumentException. The independent confirmation returned false (no nested probe
exception); evidence does not distinguish nonmembership from an unsignaled wait.
The guard stopped the outer fixture, which exited 1 before reported-result.json.
This is a confirmed fail-closed telemetry abort, with a likely exit/membership race;
the exact native membership/wait outcome remains UNKNOWN. Do not equate it with
failure to terminate processes or missing parent evidence.

Parent-owned result records cleanupVerified=true, empty Job Object, all three
retained timeout processes exited, sentinelAlive=true before parent-forced cleanup,
capture success (475 stdout bytes, 0 stderr, no truncation), no guard cleanup errors.
Timeout treeTerminationProven=false and overall teardownVerified=false remain
authoritative: expected-timeout proof and the final scenario did not pass.
Read-only post-run GetProcessById checks found none of 34 recorded PIDs present,
with no lookup errors; this is supplementary observation, not retained-handle proof.
It is saved separately in the review directory as post-run-recorded-pids.json.

Recorded sampled peak owned memory: 546463744 bytes; minimum available RAM:
18554380288 bytes; recorded incomplete samples: 4. These are scoped samples, not
global/continuous peaks. No resource-limit violation or machine instability was
reported. Incomplete samples show the live-coverage path ran; they do not prove
every startup interleaving or the successful native exit fallback.
Successful synthetic assertions do not diagnose prior unexplained BSODs.

Still NOT VERIFIED: successful natural telemetry-exit fallback confirmation, full
30s outer expiration, capture overflow/nonempty stderr, actual native failure paths,
true simultaneous-thread schedule coverage, hardware stability and performance.
The native exit fallback was attempted here but did not establish the required proof.

Next: independent review of this failed evidence and a proposed retained-identity
telemetry design/diagnostic for the exact membership/wait outcome. Do not weaken
confirmation, patch-and-rerun, or publish based on seven passing groups. Any further
runtime batch needs explicit approval. PR #4 remains draft at 6f1ea82; existing CI
and Conventions checks succeeded only for that published head, not these local edits.

## 2026-10-24 — Live telemetry versus teardown proof; STATIC ONLY

Current correction supersedes the preflight startup-inventory blocker at the source
level only. No verification, canary, Stage 0, browser, build or benchmark ran.

- `Pids()` remains authoritative: settled startup/recovery checks before and after
  native inventory plus unchanged generation are required. Cleanup, retained-handle
  assertions, Pair ownership checks and parent-owned timeout evidence still use it.
- `Observe()` now uses a separate native member inventory, with coverage checked
  before and after sampling. Active startup or a changed reservation generation
  marks the sample incomplete; even startup settling during sampling cannot erase
  its initial incomplete state. Settled raw recovery handles throw immediately.
  Invalid/truncated native inventory, access denial and other telemetry errors
  still propagate. The existing independently confirmed exit exception is unchanged.
- `WorkingSet()` uses the same live observer but rejects incomplete coverage; its
  return still excludes the supervisor. Watchdog samples include supervisor memory.
- The watchdog samples all enumerated members and checks every existing resource
  threshold during incomplete startup. It additionally aborts with
  `startup-telemetry-incomplete` once 100 monotonic milliseconds have elapsed since
  its first incomplete observation. Repeated incomplete samples cannot reset this
  deadline; a complete sample arriving after expiration cannot erase the gap.
  This is a bounded fail-closed protocol, NOT complete memory coverage: a native
  process between suspended creation and assignment is outside Job Object memory
  accounting and member telemetry. No child executes before assignment; native
  job limits apply after assignment. The 25ms polling cadence/scheduling adds
  detection delay; native calls, lock contention and OS stalls are not hard real-time.
  Existing independent overall watchdog and 29.5s/30s launcher bounds remain.

Interleaving review: live observation never holds the admission lock across process
creation or memory reads. Stop closes admission and retains unresolved startups;
its independently awaited handles are not replaced by live inventory. A timeout
still calls Stop and records cleanup errors; it never certifies active startup.
Concurrent Dispose/native-handle closure remains fail-closed if observation fails.
No observer exception is converted into startup grace. Static retention registries
remain passive ownership roots, not background recovery or termination guarantees.

Unexecuted deterministic coverage: active startup observation, settling within a
sample, complete begin/end generation change, propagated Win32 telemetry exception,
settled unresolved ownership rejection, strict Pids rejection, scheduled Stop during
startup, exact coverage deadline, late-complete rejection, timely recovery, immediate
memory/telemetry failure. New lifecycle fixtures use real empty Job Objects but no
new native child processes or deliberately failing native APIs. Synthetic handle
markers are cleared in finally before cleanup. This does not prove thread scheduling,
real access-denied handling or native API failures at runtime.

Static C# compilation (three files, `/warn:4 /warnaserror+`) and whitespace checks
are recorded for this correction; no methods/fixtures invoked. Three historical
NOT VERIFIED cases remain: natural telemetry exit-race fallback execution, full
30s outer expiration, stdout overflow/nonempty fixture stderr. Current changes
also remain runtime-unverified. Independent static review required next.
Performance HOLD; production POC NO-GO; local-runner unchanged and excluded.

## 2026-10-24 — Historical error ledger correction; STATIC ONLY

Confirmed gap: FinishTeardown previously recorded only entries appended after its
initial errors.Count; CompleteStartup's original errors were not recorded when it
did not own the handoff, and late managed/reader cleanup could append errors after
CompleteStartup returned. Caller exceptions retained them but TeardownFailures
could omit them. Replaced index-sliced recording with full-list recording plus a
HashSet using ReferenceEqualityComparer.Instance. The ordered ledger records each
exception instance once, under recoverySync. Distinct exceptions remain distinct
even with matching messages; wrapper exceptions retain their own context rather
than being flattened or merged by serialized text.

Source-path audit:

| Boundary | Recording responsibility |
| --- | --- |
| CompleteStartup | finally records the full incoming/completion list, with or without owning cleanup |
| FinishTeardown | finally records the full list, including errors present on entry and added by the handoff |
| Stop / Dispose | rejected ownership and finally paths record all errors; later FinishTeardown recording is identity-deduplicated |
| CompletePendingDisposal | precondition, busy-owner and finally paths record their errors; history is never cleared on success |
| Both startup methods | record the final error list before throwing, including managed/reader cleanup after CompleteStartup |
| Admission/interruption rejection | record the exception before throwing, including rejection before a startup reservation exists |

Only FinalizeDeferredDisposal retains an entry-count comparison, solely to decide
whether the current native cleanup/proof attempt succeeded. That comparison no
longer controls historical recording. The ledger never changes disposalComplete,
deferredConfirmed, wait budgets, admission, watchdogs or native teardown decisions.

Added UNEXECUTED assertions for original creation failure in the public ledger,
an early startup failure recorded without handoff, pre-existing owner error through
FinishTeardown, original+secondary errors after failed and later successful deferred
cleanup, idempotent completion, repeated recording through multiple boundaries,
and two distinct exceptions with identical text. Assertions check reference count
in the internal ledger and presence in the public TeardownFailures snapshot.
Replacing the correction with the previous slice semantics would omit original
failures and fail these assertions; this is a static argument, not an executed
mutant test or verification run.

Three-source C# compilation (/warn:4 /warnaserror+) and whitespace checks PASS;
manual recording/lock/confirmation self-review completed, no methods/fixtures run.
This task changed windows-job.cs/captured-process.cs and the three required docs;
guard-verification.cs remains pending from the earlier fixture-registration change.
Complete updated source patch against PR #4 HEAD exported for independent review.
No runtime/canary/build/browser/performance, dependency/policy changes, commit/push/
PR update/merge. Previous concurrency/native/durability limits and the three NOT
VERIFIED cases remain. Performance HOLD / production POC NO-GO.

## 2026-10-24 — Deferred disposal responsibility and bounded handoff; STATIC ONLY

Closed the reviewed passive-retention gap with a synchronous cleanup handoff.
No runtime verification is authorized or performed. The earlier accepted batch
does not cover this changed implementation or the new deterministic assertions.

Responsibility and proof:

- Dispose records a disposal request and closes startup admission. If startup is
  active it fails explicitly and retains ownership. The last CompleteStartup, or
  a teardown caller already holding the cleanup role, takes exactly one automatic
  deferred cleanup attempt after all startup reservations settle.
- ClaimTeardown serializes Stop/Dispose/explicit completion using a metadata flag;
  competing callers fail immediately rather than waiting for another cleanup.
  FinishTeardown checks settled startup and either claims the handoff or releases
  that flag under the same metadata lock. CompleteStartup does the complementary
  check under that lock. Thus completion before/after the owner's release cannot
  lose the handoff; no background task, timer or unbounded retry loop is added.
- Failed automatic cleanup leaves the owner retained and confirmation false.
  The responsible caller may invoke CleanupOwner.CompletePendingDisposal() once
  explicitly per authorized cleanup attempt (or Dispose again). GridTeardownException
  carries CleanupOwner so the caller need not discover an object through a private
  static registry. Calls are not scheduled automatically after a failed handoff.
  An explicit completion call made before startup settles is rejected without
  consuming the pending automatic handoff. Stop alone does not request disposal;
  its responsible caller must still Dispose the job (or retain CleanupOwner).
- Deferred cleanup terminates the owned job, confirms unassigned recovery-handle
  exits, confirms assigned-child exit handles and checks empty job membership,
  then closes the job. Its native wait/poll allowance is shared across those steps:
  at most 1000ms, within the unchanged outer supervisor deadlines. WAIT_FAILED,
  timeout, termination or close error prevents confirmation. Existing startup
  cleanup and reader-join bounds remain separately enforced; this is not a claim
  that every native API or lock can return during an OS/kernel hang.
- Successful assignment changes the original process handle's role to a retained
  Confirmation handle; it is not discarded with a managed Process wrapper.
  Stop confirms these handles after job termination; normal Dispose preserves
  kill-on-close semantics and confirms them after closing the job. This avoids
  certifying deferred cleanup from an empty job while process exit is unknown.
- DeferredTeardownConfirmed becomes true only after current proof and handle
  release succeed. TeardownFailures preserves prior original/cleanup exceptions;
  a later successful release does not turn an earlier failed call into PASS.
  Both startup methods propagate completion/handoff errors after their finally
  and dispose any now-unreturned managed/capture owners. Ordinary Dispose handle
  closure remains distinct from external whole-tree/sentinel verification.

Static interleaving audit:

| Schedule | Required outcome in the implementation |
| --- | --- |
| Dispose returns unconfirmed before the last startup settles | Last startup claims the synchronous handoff |
| Last startup settles while Stop/Dispose owns cleanup | Existing owner claims the handoff before releasing its role |
| Multiple startups are active | No handoff until all reservations settle |
| Concurrent Stop/Dispose/explicit completion | One native cleanup owner; other callers fail closed with history retained |
| Automatic handoff proof fails | No close/confirmation; explicit owner retained; no automatic second attempt |
| Later explicit completion succeeds | Exit/job/close proof confirmed, registry root removed, old errors retained |
| Completion called after confirmed release | Idempotent; does not schedule another native attempt |

Added unexecuted regression schedules for all rows (including injected proof
timeout, actionable exception owner, error identity/history and repeated startup
  completion not retrying a failed handoff, and early explicit completion not
  consuming the handoff). They use empty native jobs when later
executed, not child processes or performance data. They are not simultaneous-thread
stress tests or evidence of Windows native failure behavior. They remain part of
the existing synthetic verification group; batch timers/resources are unchanged.

Static checks: three-file C# Add-Type compilation with /warn:4 /warnaserror+ PASS,
no methods/fixtures invoked; git diff --check PASS. Manual source analysis checked
admission/cleanup lock ordering, no-lost-handoff schedules, shared wait allowance,
failure propagation, confirmation gating, kill-on-close separation and no new
background recovery. No external analyzer or runtime result is claimed.

Remaining limits: native/OS hangs and catastrophic allocation failure cannot be
made safe by managed timeouts; failed cleanup still cannot guarantee termination.
unresolvedOwners remains passive after failed attempts, and incompleteCaptures
remains passive for incomplete readers. Neither provides automatic reaping or
ownership persistence after supervisor exit. A responsible caller must retain the
exception/owner and explicitly authorize another cleanup attempt if needed.
Strict startup telemetry rejection, true threaded/native races, three existing
NOT VERIFIED cases and all new fault paths remain runtime-unverified.
Modified only the three safety-tooling sources and required three documents;
local-runner untouched. No workload/build/browser/dependency/policy changes,
commit/push/PR update/merge. Performance HOLD / production POC NO-GO.

## 2026-10-24 — Startup/teardown concurrency correction; STATIC ONLY

Replaced Starting exemption with explicit Creating/Created/Assigned/Transferred/
CreationFailed/Cleaned/Unresolved states plus an InProgress reservation covering
the entire synchronous startup and its cleanup. Both startup methods complete
that reservation in an outer finally. StartTracked creation now occurs inside
its guarded try/catch; injected/native creation failure preserves its original
error and settles as CreationFailed without a permanently active reservation.

Stop/Dispose atomically close startup admission. New startup is rejected; any
registered active startup makes teardown fail explicitly. Cleanup sweeps skip
handles still owned by an active startup, avoiding concurrent handle closure.
Dispose retains its job handle and roots the owner while startup remains active;
it cannot dispose the job underneath assignment. Startup checks admission before
native creation/assignment/resume; late interruption still prevents teardown
certification because the reservation stays active through final cleanup.

Pids rejects ALL in-progress reservations and unresolved recovery handles, with
no exemption. It checks a startup-generation token after querying the native job,
rejecting any startup interleaving even if that startup completed before return.
After Stop/Dispose, closed admission prevents a new start after an empty inventory.
Without closed admission an inventory is only a moment-in-time observation, not
a promise that future startup cannot occur. Telemetry also fails closed on an
in-progress inventory; this conservative policy may abort a future verification
batch and needs separate runtime review rather than inferred compatibility.

Added unexecuted deterministic cases to the existing synthetic group: injected
creation exception through the real guarded startup path, original-error identity,
settled CreationFailed state, active-start inventory rejection, successful transfer
state, unresolved assignment marker rejection, Stop/Dispose during reserved startup,
job-handle retention, closed admission and explicit later final disposal. The
assignment marker never reaches a native API. These are scheduled interleavings,
not a simultaneous-thread stress test, nor native CreateProcess-false fault injection.

Static three-file C# compilation PASS; no methods/fixtures invoked. Whitespace
check PASS. No runtime/canary/build/browser/performance workload, commit or push.
Modified windows-job.cs, captured-process.cs, guard-verification.cs and these three
status/verification/journal documents. Previous runtime PASS is historical only.

unresolvedOwners/incompleteCaptures are passive supervisor-lifetime roots: no
background recovery, guaranteed termination, automatic reaping or durable ownership
after supervisor exit. Explicit later Dispose can attempt cleanup; absent that call,
retained owners can remain until exit. Kernel/native hangs and catastrophic failures
can defeat wall-clock deadlines. Existing resource/deadline/PASS controls remain;
the three earlier NOT VERIFIED cases and all new fault/concurrency paths remain
unverified. Performance HOLD / production POC NO-GO; independent static review next.

## 2026-10-24 — Four PR safety remediations; static verification only

Implemented approved P1/P2 review corrections in windows-job.cs/captured-process.cs.
The user's last sentence ended at “Do not”; prior no-runtime/no-publication limits
remain in force. No verification/canary/build/browser/performance workload ran.

- Reserve a recovery owner before native process creation. Failed assignment keeps
  the original native process handle until exit is confirmed; failed close retains
  process/thread handles. Success transfers ownership only after job assignment
  and acquisition of the managed retained handle. Pids refuses inventory-as-proof
  while a recovery child remains. Stop/Dispose also service recovery children with
  a shared 1000ms native-wait allowance per recovery sweep, not unbounded polling.
- TerminateProcess failure no longer skips waiting. WAIT_OBJECT_0, WAIT_TIMEOUT,
  WAIT_FAILED (Win32 code) and unexpected returns are distinct; original, native
  termination/wait/close and managed cleanup errors aggregate. Managed kill errors
  likewise do not skip their independent bounded exit wait.
- Capture construction and reader startup are separate. The local capture owner
  exists before readers start, remains available across native-finally failure,
  and is cleaned after producers are stopped. Join/reader/callback errors survive.
- Safe read-handle locals transfer only after capture construction succeeds;
  untransferred wrappers dispose in finally. Raw pipe/attribute cleanup attempts
  remain independent so a cleanup exception does not replace the startup error.

If bounded cleanup cannot establish exit/reader completion, supervisor-lifetime
registries retain the recovery/capture owners and the operation fails. They do not
start retry threads, release a potentially live unassigned process's last recovery
handle, or infer termination from empty job membership. This is evidence-preserving
failure containment, not a guarantee Windows will honor termination; unresolved
objects can remain until supervisor exit. Kernel/disk hangs remain outside the
hard-deadline guarantee. The earlier startup-in-progress inventory exemption in
this preparation was rejected in review and is superseded by the strict lifecycle
and generation checks above. Concurrency/fault paths need separately authorized
review and runtime verification. No deadline/memory budget/PASS assertion was relaxed.

Static C# three-source Add-Type compilation PASS (no methods invoked), whitespace
check PASS. Historical accepted batch applies to 6f1ea82, not these changed files.
The three existing NOT VERIFIED cases remain: native exit-race fallback execution,
full outer-30s expiration, capture overflow/nonempty stderr. New exceptional-owner,
partial-start, wait-failure and reader-retention paths are also NOT runtime verified.
Modified two implementation files and verification/status/journal only; local-runner
untouched, dependencies/policy/production code unchanged, no commit/push/merge.
Performance HOLD / production POC NO-GO. Await Tech Lead static review.

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
