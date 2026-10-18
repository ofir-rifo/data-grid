# Local launcher and supervision review — 2026-10-18

Historical review below, preserved without rewriting its earlier observations.
Current state: the latest nine harmless groups passed in **5.9546453s** and were
accepted for tested scenarios, including synthetic exit-race decision assertions.
Performance remains HOLD. Actual native fallback use, full 30s outer expiration
and capture overflow/nonempty fixture stderr remain NOT VERIFIED. The current launcher
uses the explicit PowerShell executable directly with `shell:false`, not the old
shell/PID path. `perf-local` is disabled; `local-runner.mjs` is excluded from the
proposed PR and preserved locally. See [current record](SUPERVISOR-VERIFICATION.md).

**Runtime HOLD.** No Stage 0, build, Chromium, ownership canary or performance
measurement executed in this review. Existing uncommitted tooling is preserved.
The old `perf-local` target remains unchanged and must not be invoked yet.

## Exact launcher failure

The target in `apps/playground/package.json` uses
`powershell.exe -NoProfile -NonInteractive -File tools/performance/local-supervisor.ps1`.
PATH resolution and the launched host both identify:

| Property | Failing host | Already installed permitted host |
| --- | --- | --- |
| Executable | `C:\WINDOWS\System32\WindowsPowerShell\v1.0\powershell.exe` | `C:\Users\ofirr\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\powershell\pwsh.exe` |
| Version/edition | 5.1.26100.9711 / Desktop | 7.6.5 / Core |
| MachinePolicy, UserPolicy, Process, CurrentUser | All Undefined | All Undefined |
| LocalMachine | Undefined | RemoteSigned |
| Effective policy | Restricted (Windows client fallback) | RemoteSigned |
| Language mode | FullLanguage | FullLanguage |

There was no explicit Restricted policy scope in the failing host: all scopes
were Undefined, so the effective fallback blocked file scripts. Do not conflate
the current shell's RemoteSigned setting with Windows PowerShell 5.1's policy.
These observations establish the effective policies, not the historical source
of their configuration. No registry/policy/settings writes were performed.

The supervisor has `NotSigned` Authenticode status and only the `:$DATA` stream
(no Zone.Identifier). Under the existing permitted host's RemoteSigned policy,
this local file is eligible for ordinary `-File` execution. No unblock, signing,
policy override, encoded command, stdin script or inline evaluation is required.
This is a policy eligibility conclusion, **not proof the supervisor works**.

Read-only diagnostic (outer shell quoting preserves the child variables):

```powershell
Get-Command powershell.exe,pwsh.exe -All | Select-Object Name,Source
powershell.exe -NoProfile -NonInteractive -Command '$PSVersionTable; (Get-Process -Id $PID).Path; Get-ExecutionPolicy -List; Get-ExecutionPolicy; $ExecutionContext.SessionState.LanguageMode'
Get-AuthenticodeSignature tools/performance/local-supervisor.ps1
Get-Item tools/performance/local-supervisor.ps1 -Stream *
```

A harmless locally authored policy-only `.ps1` was executed normally with the
permitted host, exit 0. It reports host/version/policy only, never imports the
supervisor and never launches a child workload:

```powershell
& 'C:\Users\ofirr\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\powershell\pwsh.exe' -NoProfile -NonInteractive -File 'C:\Users\ofirr\Documents\Codex\datagrid-performance\20261018T190838508Z-launcher-review\policy-file-probe.ps1'
```

The resulting `policy-file-probe.json` is in that same external directory.
Running this small file demonstrated normal file-policy enforcement. The
supervisor itself was not invoked, including in a supposed dry-run mode.

## Proposed launcher changes — not implemented or executed

Replace the bare Windows PowerShell executable with an explicit, reviewed host.
Prefer a small Node launcher using `spawn(host, ['-NoProfile', '-NonInteractive',
'-File', supervisorPath, ...modeArguments])`, `shell:false`, `windowsHide:true`.
Accept the host as an explicit absolute path; record version, file identity,
effective policies, exit/error and source hashes before spawning. No automatic
host hopping or fallback after a failure. Abort if host identity/policy changes
or the script is no longer eligible. Never strip file zone metadata or alter policy.
Cache paths are machine-specific and can move after a Codex runtime update; do
not commit this user's absolute path as a universal workspace command.

Separate proposed Nx targets: `perf-local-verify` for canaries ONLY,
and `perf-local` for the later separately authorized runtime batch. Both dispatch
through the Node launcher with a selected host; neither target exists in this
revised form yet. The supervisor needs an explicit mode validated **before**
Stage 0. Verification mode must have no import/call path to the build/runner.
Do not expose a flag that advances through the Stage 2/3/4 approval boundaries.

Proposed future verification invocation (requires implementation/review first):

```powershell
$env:GRID_PERF_POWERSHELL='C:\Users\ofirr\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\powershell\pwsh.exe'
$env:NX_DAEMON='false'
$env:NX_NO_CLOUD='true'
$env:NX_SKIP_REMOTE_CACHE='true'
$env:NX_SKIP_NX_CACHE='true'
$env:NX_ISOLATE_PLUGINS='false'
$env:NODE_OPTIONS='--max-old-space-size=2048'
pnpm nx run @org/playground:perf-local-verify --excludeTaskDependencies --skipSync --parallel=1
```

No Node/native replacement is needed while this permitted host remains available.
If policy later disallows every installed host, a pure Node child-process/PID
walker is **not equivalent** to a Windows Job Object: it cannot atomically assign
a suspended child and has descendant/PID-reuse races. An alternative would need a
reviewed native Job Object helper controlled by Node, with no new dependencies or
policy circumvention; native compilation availability would need separate inspection.

## Windows Job Object source review

Sound design elements, still unverified at runtime:

- CreateProcess is suspended; assignment precedes ResumeThread. No work is meant
  to execute before ownership. Assignment failure terminates the suspended process.
- Job handle is non-inheritable; child handles are not inherited. No breakaway
  flags are enabled. Kill-on-last-handle-close owns cleanup even if the supervisor
  process dies. Explicit TerminateJobObject targets only that job, not process names.
- Job committed-memory ceiling is 2.5GiB. Sampled browser working-set and available
  RAM limits remain different measures. Kernel commit enforcement is not a total
  physical-RAM cap or a guarantee against OS instability.
- Evidence is append-only with Flush(true)/fsync; phases use rename. These reduce
  loss but cannot guarantee device durability across power loss/BSOD.

**Corrections required before another runtime attempt:**

1. Replace fixed 250ms child discovery/100ms disappearance sleeps with bounded
   canary readiness and retained process handles. Confirm actual termination,
   avoiding PID reuse; verify explicit Stop and kill-on-close separately.
2. Query the installed job flags/commit ceiling and verify expected values.
   Current preflight tests ownership/close but not all claimed limits. Exercise
   timeout/memory decision paths using synthetic samples, never memory pressure.
3. Process enumeration currently uses `-ErrorAction SilentlyContinue`. Distinguish
   normal exits from inability to inspect a live owned process; unknown resource
   usage must fail closed rather than silently undercount.
4. `TerminateProcess`/`CloseHandle` return values are unchecked in several native
   paths. Preserve native error codes; confirm bounded termination and report
   cleanup failure independently of the original failure.
5. Run/build deadlines partly trust worker-written UTC timestamps. Use supervisor-
   owned monotonic deadlines, validate phase transitions and missing/stale control
   data, and ensure the 8min cap persists outside a `browser` phase. Polling/slow
   CIM or disk writes can delay enforcement: use an independent deadline watchdog.
6. Preflight's CIM/event queries and fsync happen before/inside the sampling loop
   without separate bounded waits. They can delay safety checks. An evidence-write
   failure must trigger immediate job cleanup with an independent failure channel.
7. `completed.json` is an unflushed worker marker; supervisor does not wait for
   confirmed empty job membership before declaring completion. Make the supervisor
   final status authoritative, durable, and conditional on verified teardown.
8. Capture a warm memory baseline at explicit readiness/input-start checkpoints,
   not five seconds after the pre-navigation phase marker. The current baseline
   and settlement clocks are misaligned and can produce misleading stop decisions.
9. Console-only launcher failure is outside supervisor JSONL. The Node launcher
   should create/flush the started manifest before invoking PowerShell and record
   normal denial, spawn errors, signals and interrupted outcomes without retry.

## Harmless enforcement validation plan — not executed

Use sleeping Node parent/grandchild canaries, no browser/server/build or large
allocation. Retain process handles and record creation identities. Keep each case
≤5s, entire verification ≤30s, no automatic retry:

1. Verify job membership and queried flags/limit before releasing the child from
   an ownership handshake. An unrelated sleeping sentinel must remain unaffected.
2. Explicit job stop: parent and grandchild terminate; verify handles signal exit.
3. Last-handle close: both terminate; sentinel survives. Separately terminate the
   canary supervisor abnormally to exercise OS-owned cleanup on handle closure.
4. Sleeping canary timeout: independent monotonic watchdog kills only its job;
   preserve aborted JSONL and show no successful marker.
5. Inject low available-RAM, excessive working-set/growth, malformed/stale phase,
   inaccessible live-process telemetry and evidence-write failure. No real memory
   saturation. Assert fail-closed decisions and preserved original/cleanup errors.
6. Confirm no owned processes remain; stop the separately owned sentinel through
   its retained handle. Report each result before any Stage 0 authorization.

Runtime remains HOLD after a successful canary check. Nothing here authorizes
Stage 0 or Chromium. POC status/default-off flushSync remain unchanged.

References: [Microsoft execution policy semantics](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_execution_policies),
[Microsoft Job Objects](https://learn.microsoft.com/en-us/windows/win32/procthread/job-objects).
