# Windows local performance experiment

**Current decision: runtime HOLD.** Do not run the command below. See
[accepted harmless verification result](SUPERVISOR-VERIFICATION.md): nine groups
passed in **5.9546453s** and Tech Lead accepted the executed scenarios; previous
failures remain historical. `perf-local` remains explicitly disabled and the
supervisor only supports canaries. Actual native exit-confirmation fallback use,
full 30s outer expiration and capture overflow/nonempty fixture stderr remain
NOT VERIFIED. Older runtime behavior below is
the proposed performance protocol, not current executable capability. Also see
[launcher and safety review](LOCAL-LAUNCHER-REVIEW.md) for historical host-policy
findings and [current verification](SUPERVISOR-VERIFICATION.md) for pending risks.
Earlier execution authorization is suspended; no Stage 0 or browser launch now.

Historical proposed protocol, approved conditionally on 2026-10-18 before HOLD.
Source baseline: PR #3 squash `27b4f16`.
This is isolated test tooling, not production instrumentation or hardware diagnosis.
If separately reauthorized, the proposed initial execution ends after Stage 2.
There is no current performance authorization. No dependency/browser installation,
driver/BIOS/Windows configuration changes, stress tools, recordings or automatic retries.

## Command and ownership

From the workspace root, with installed dependencies:

```powershell
$env:NX_DAEMON='false'
$env:NX_NO_CLOUD='true'
$env:NX_SKIP_REMOTE_CACHE='true'
$env:NX_SKIP_NX_CACHE='true'
$env:NX_ISOLATE_PLUGINS='false'
$env:NODE_OPTIONS='--max-old-space-size=2048'
pnpm nx run @org/playground:perf-local --excludeTaskDependencies --skipSync --parallel=1
```

The independent PowerShell supervisor creates a Windows Job Object with
kill-on-close, no breakaway and a 2.5GiB committed-memory ceiling. A worker is
created suspended, assigned to the job, then resumed; descendants inherit ownership.
Before workload, a harmless Node parent/child probe verifies membership and
termination on close. Failure aborts preflight. No process-name-based global kill
is used. Supervisor teardown terminates only the job, including its preview server.
The supervisor and worker append JSONL using explicit file flushes. An OS crash
can still lose buffered device writes; complete survival cannot be guaranteed.

Stage 0 records OS/CPU/RAM/top-process baseline and bounded recent Windows warning/
error events, verifies enforcement, and observes idle memory for 15s before the
worker starts. The worker checks installed Chromium, existing pnpm, an unused
localhost:4300 port and build provenance. There is exactly one build invocation,
under the same supervisor, with 120s deadline. Preview uses Nx with dependency
execution disabled; fetched HTML must match the just-built HTML. No stale server
reuse or implicit preview rebuild. Build errors abort, never retry.

## Stages and gates

| Stage | Work | Limit |
| --- | --- | --- |
| 0 | Environment/enforcement/idle preflight | 15s idle, no browser/build |
| 1 | Fresh headed Chromium, explicit `flushSync=0`, idle | 10s collection |
| 2a | Fresh browser, `flushSync=0`, programmatic vertical scrolling | 5s warm-up + 2s input + 5s settle |
| 2b | Fresh browser, `flushSync=1`, identical sequence | 5s warm-up + 2s input + 5s settle |
| Checkpoint | Stop, close owned processes, report results | Tech Lead review required |
| 3 | Proposed 5s wheel input per mode | Not executable by this runner; later approval |
| 4 | Proposed 10s wheel input per mode, reversed order | Explicit confirmation after Stage 3 review |

Input: 40 requests at 50ms intervals, +800px/request. Dataset stays 100k×1k,
40px rows/120px columns, 400px row buffer/0 column buffer, fixed 1000×600 outer
scrollport. Browser viewport 1280×800/device scale 1; actual client dimensions
recorded. Windows scrollbars can reduce client size. One browser at a time, no
traces/video/screenshots or concurrent verification. Each run has a 30s deadline
starting before launch; aggregate browser batch has an 8min deadline. Overall
supervisor deadline is 11min (setup/build/preview included). Stage 3–4 have no
continuation flag: authorization must precede a reviewed extension.

## Stops and limits

- Available physical RAM must remain ≥max(4GiB, 25% total), including every
  preflight sample. Failure is an abort, not a request to free memory automatically.
- Monitor every 500ms: Chromium-tree working set ≤1.5GiB; job-tree plus supervisor
  working set ≤2.5GiB. The outer Nx launcher is outside the job; its footprint is
  reflected in the system available-memory gate. Shared pages may be counted twice.
- After warm-up, abort growth >256MiB within a rolling five-second window; after
  settling, abort if >128MiB above warm browser baseline. These are early-stop
  heuristics, not leak criteria. Startup/settling clocks in the supervisor include
  navigation, making the settling check conservative.
- Independent job committed-memory ceiling complements, not replaces, working-set
  sampling. Node old-space 2GiB is per process, not a machine-wide cap.
- Artifact ceiling 25MiB. Timeout/crash/assertion/memory/operator failure aborts,
  preserves partial data, kills only owned job processes and prohibits retry.
- Create an empty `STOP` file in the printed evidence directory for a cooperative
  operator abort, or interrupt the supervisor. Stop immediately on visible system
  instability. Polling/enforcement cannot guarantee safety during an OS/kernel hang.

## Evidence and interpretation

Timestamped directories under `%USERPROFILE%\Documents\Codex\datagrid-performance`:
`environment.jsonl`, `windows-events.jsonl`, `supervisor.jsonl`, `resources.jsonl`,
`measurements.jsonl`, build/preview stdout/stderr, atomic `phase.json`, and a
`completed.json` marker only after Stage 2. Manifest records commit and dirty status:
this tooling is uncommitted until separately authorized. No artifacts are committed.

Resource samples include process IDs, working set/private bytes/cumulative CPU,
available physical RAM and UTC timestamps. Browser identity comes from the actual
launched instance. Renderer/JS heap, total GPU allocation, presented frames and
hardware stability are **not** established by process working-set data.

Every 500ms persist buffered commit/write/rAF samples and DOM checkpoints; flush
the remaining buffered observations at shutdown. Report handler-to-layout-effect
commit and uniquely matched programmatic-write-to-commit distributions (nearest-rank
p95), calculation duration, rAF gaps and sample counts. Fewer than 30 observations
means insufficient p95-comparison evidence, not permission to extend the workload.
MutationObserver can coalesce commits; these are observed samples, not all commits.
Instrumentation/periodic DOM traversal overhead remains a limitation.

DOM correctness: sampled 360-cell/432-element bounds and exact logical extents;
final identities, clipping styles, pinned positions and rendered coverage. These
are distinct from transient rAF coverage, which is distinct from presented-frame
evidence. A headed browser without a human observation/capture is **unobserved**,
not visually stable. No initial-render benchmark, native wheel conclusion, heap
leak conclusion, cross-browser claim or formal POC validation follows from Stage 2.

After crash/reboot: do not rerun. Preserve the incomplete directory and collect
bounded System/Application events around its UTC timestamps, especially Kernel-Power
41, bugcheck 1001, EventLog 6008 and WHEA-Logger. Record Reliability Monitor entries
and existing minidump metadata without enabling/changing collection settings.
Event 41 establishes an unclean shutdown, not a root cause. Access failures or
missing records must be recorded. Do not automatically copy potentially sensitive
full memory dumps or upload system evidence.

Successful execution does not prove hardware stability or resolve the two BSODs.
