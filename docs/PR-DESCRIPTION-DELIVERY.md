# PR description engineering report — 2026-10-24

## A. Status

**BLOCKED** for full Definition of Done: implementation and lightweight regression
verification are complete; Nx standards verification is unavailable, hosted CI is
deliberately skipped, and required-check activation needs explicit human action.
Ready for skeptical Tech Lead inspection of the concrete patch, not formal
independent acceptance or a claim that merge enforcement is active.

## B. Architecture

The executable `.github/scripts/pr-description-policy.mjs` is the authoritative
ordered section/instruction definition. The template is generated and compared in
tests. Parser, content validation and event CLI are separate dependency-free Node
modules. The specification defines the accepted Markdown subset and semantic
heuristic limits. Five exact H2 sections, one occurrence each in order, meaningful
content and explicit verification statuses are mandatory for regular and Draft PRs.

## C. Implementation

- `.github/scripts/pr-description-policy.mjs`: ordered section names, prompts,
  template renderer.
- `.github/pull_request_template.md`: generated five-section author guidance.
- `.github/scripts/pr-description.mjs`: comment/fence-aware parsing, precise
  structural/content diagnostics, status/reason and reference checks.
- `.github/scripts/check-pr-description.mjs`: real event payload reader, fail-closed
  exit code and escaped log output.
- `.github/scripts/pr-description.test.mjs`: 100 unit/integration regressions,
  template comparison and static workflow contract.
- `.github/workflows/pr-description.yml`: stable read-only `PR description` job.
- `specs/pr-description-policy.md`: pre-implementation policy and acceptance scope.
- `docs/PR-DESCRIPTIONS.md`: usage, fixes, security, activation and existing PR impact.
- `AGENTS.md`: mandatory future Codex PR description convention.
- `docs/PROJECT-STATUS.md`, `docs/AI-DEVELOPMENT-JOURNAL.md`: milestone and evidence.
- This delivery report: scope, verification limits and review handoff.

## D. Test results

PASS (2026-10-24), run from the isolated checkout:

```text
node --test --test-concurrency=1 .github/scripts/pr-description.test.mjs
node --check .github/scripts/pr-description-policy.mjs
node --check .github/scripts/pr-description.mjs
node --check .github/scripts/check-pr-description.mjs
node --check .github/scripts/pr-description.test.mjs
git diff --cached --check
```

Regression suite: 100 passed, zero failed. Covers all requested input/heading,
multiline/fence, placeholder, status, risk/reference, type, draft, diagnostic,
template and workflow scenarios. CLI integration spawns bounded Node subprocesses
against valid, invalid, missing and malformed events. Initial run was 97/100;
three failures exposed prompt detection, corrected before the passing rerun.
Final self-review also normalized CRLF in template/workflow comparisons for Windows.

FAIL/BLOCKED discovery: `pnpm nx show project @org/playground --json` failed before
Nx ran: absent dependencies caused pnpm to attempt automatic installation, then DNS
requests failed. The session was stopped; no dependency/lockfile changes committed.

NOT RUN (installed tooling absent):

```text
pnpm nx run @org/playground:standards-test --excludeTaskDependencies --skipSync --parallel=1
pnpm nx run @org/playground:standards --excludeTaskDependencies --skipSync --parallel=1
pnpm nx run @org/playground:typecheck --excludeTaskDependencies --skipSync --parallel=1
```

Environment for attempted Nx discovery: daemon/cloud/remote cache/Nx cache off,
plugin isolation off, serial execution, Node heap cap 2048MB. No installation retry
was authorized. No build, Chromium, Stage 0, performance or supervisor canary ran.
Hosted CI is NOT RUN via `[skip ci]`, since opening a Draft otherwise starts the
existing heavyweight CI. Required checks remain pending and merges remain blocked.

## E. Security review

All six required pull_request activity types are present, without draft filters.
Job uses `contents: read`, pinned action SHAs, no persisted checkout credentials,
secrets, write API calls, installation or privileged event. The body is parsed from
the event file rather than interpolated into shell code. Errors are JSON escaped.
Fork approvals, missing payload failure, merge conflicts, stale event snapshots
and untrusted merge-ref workflow changes are explicitly documented. Static checks
do not prove hosted execution or make workflow changes tamper-proof.

## F. GitHub enforcement

Exact check context: **PR description**, GitHub Actions source **15368**.
Read-only inspection found active ruleset **Protect main**, ID **25351835**, with
strict `DataGrid checks` and `Conventional commits`, no bypasses and existing
PR/squash/linear-history/deletion/force-push protections. New context is absent.
Repository is public and reports admin permissions; connector classic-protection
read returned 403. Account billing plan and classic protection remain unverified.

Follow the precise activation procedure in `PR-DESCRIPTIONS.md`: get a recent
successful run after policy deployment and approved CI execution, edit the existing
ruleset, add the exact context/source preserving all rules, save only with human
approval, re-read configuration and demonstrate invalid/valid PR merge eligibility.
No protection settings were changed. A failing check alone is not merge enforcement.

## G. Existing PR impact

PR #4 is Draft at `6f1ea82` with null body; it needs every section. PR #5 is Draft at
`369a878` with noncanonical headings; reorganize its implementation/results/limits
and add related references. Neither PR was modified. Workflow deployment alone
does not trigger old PRs; refresh their merge refs as necessary and emit a supported
event. Description edits then trigger checks. Required-check activation may block
both missing and failing results; no exemption exists.

## H. Git status

Dedicated worktree `.worktrees/pr-description`, branch
`chore/pr-description-enforcement`, based on main `27b4f16`. Original dirty PR #4
checkout and PR #5 worktree remain untouched. Only this milestone's named files
are staged/committed. Delivery commit, Draft URL and final remote state are reported
in the final chat response. No merge or Ready for Review action is authorized.

## I. Remaining risks and approval decisions

Human review must assess truthfulness and relevance; a heuristic cannot prove
meaningful prose. The documented Markdown subset excludes indented code/HTML-block
parsing beyond comments. PR-controlled workflows can weaken their own check and
must be reviewed. Old reruns use old snapshots. Hosted behavior, missing Nx checks,
classic protection and actual merge blocking remain unverified. Further dependency
installation, heavyweight verification and ruleset changes need separate approval.
Performance HOLD; production POC NO-GO remains unchanged.

## J. Review artifacts

The Draft PR Files changed view provides the complete authoritative patch. A local
ignored `_tmp_pr-description.patch` is exported after commit for offline inspection.
Read the policy specification, operational guide, regression tests, workflow and
status/journal together. Self-review is not independent Tech Lead acceptance.
