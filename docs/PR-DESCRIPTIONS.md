# Pull request descriptions

All human and Codex PRs, including Drafts, follow the
[specified policy](../specs/pr-description-policy.md). The authoritative ordered
section definitions and author instructions are in
[pr-description-policy.mjs](../.github/scripts/pr-description-policy.mjs).
GitHub prepopulates new descriptions from the generated template; replace every
TODO with actual information. Existing descriptions are not rewritten automatically.

Report checks individually, for example:

```text
- PASS: node policy regression suite (100 tests).
- FAIL: parser regression suite — duplicate heading was accepted; correction pending.
- NOT RUN: Chromium checks — prohibited by this task's verification scope.
```

FAIL/NOT RUN need a named check and reason separated by an em dash, spaced hyphen,
or colon. Bold status labels are accepted. Continued lines may explain an entry.
Do not claim historical or unexecuted results as current verification. Automation
cannot prove test execution, completeness, or truthfulness. Reviewers must check
evidence, relevance and actual risks. `None identified` is only justified when true.
For missing related references use `Not applicable: <actual explanation>`.

## Local use and fixing failures

No dependencies are required. From the repository root:

```powershell
node --test --test-concurrency=1 .github/scripts/pr-description.test.mjs
$env:GITHUB_EVENT_PATH = 'C:/absolute/path/to/event.json'
node .github/scripts/check-pr-description.mjs
```

The JSON must contain `{"pull_request":{"body":"the actual description"}}`.
The CLI rejects invalid JSON, missing events and missing/invalid bodies with exit 1.
It reads neither titles nor comments. Section-specific errors identify headings,
order, placeholders and status/reason problems. Correct the PR's description via
GitHub's Edit button; the `edited` event triggers a new run. Rerunning an old event
can validate an old snapshot, so use a fresh edit when correcting content.

Regenerate the template after intentional policy edits:

```powershell
node --input-type=module -e "import {writeFileSync} from 'node:fs'; import {renderTemplate} from './.github/scripts/pr-description-policy.mjs'; writeFileSync('.github/pull_request_template.md', renderTemplate());"
```

The regression suite compares the full generated output with the committed file.
Review policy changes against the specification; do not change required names to
make a noncompliant PR pass. Markdown support and deliberate limits are specified
in the policy. This is structural/heuristic validation, not language understanding.

## GitHub workflow and security

[pr-description.yml](../.github/workflows/pr-description.yml) runs on opened,
edited, reopened, synchronize, ready_for_review and converted_to_draft. There are
no branch, path or draft filters. Job/check name: **PR description**. It tests the
policy then validates `GITHUB_EVENT_PATH` with Node 24. Permissions are only
`contents: read`; pinned checkout/setup actions retain no checkout credentials.
No secrets, writes, PR comments, dependency installation, Nx tasks or builds run.
Body text is data, never shell interpolation; log strings are JSON escaped.

Fork PRs receive read-only execution without secrets. GitHub may require maintainer
approval for outside contributors. Missing payloads fail closed. A PR can change
its own workflow/validator because `pull_request` uses the merge ref: review these
changes carefully. This check is not tamper-proof policy enforcement. Merge
conflicts can prevent pull_request workflows from running and must be resolved.
Newer events cancel older runs in the same PR concurrency group, but event snapshots
and check results are commit-associated; simultaneous edits and old manual reruns
still warrant checking the latest description/run before merge. No merge queue
support is claimed; adopting one requires a reviewed merge_group design.

## Required check activation — manual, not applied

Read-only inspection on 2026-10-24 found public repository `ofir-rifo/data-grid`,
default `main`, and repository metadata reporting admin/push permissions. The
active [Protect main ruleset](https://github.com/ofir-rifo/data-grid/rules/25351835)
targets the default branch. It requires `DataGrid checks` and `Conventional commits`
from GitHub Actions (integration ID 15368), strict/up-to-date checks, PRs with
resolved conversations, squash, linear history, no force pushes/deletion, and no
bypass actors. The description check is **not required**. Classic protection reads
returned 403 `Resource not accessible by integration`; absence cannot be inferred.
Public repositories support required checks on GitHub Free; the account's billing
plan was not inspected. Repository admin metadata does not grant this connector
administration access. No settings were changed.

After review and merging this policy through the normal protected process:

1. Ensure a compliant PR has a successful `PR description` run in this repository
   within the last seven days. Drafts qualify. Remove any deliberate CI-skip
   marker through a new authorized commit before expecting checks to run.
2. Open Settings → Rules → Rulesets → **Protect main**, ID **25351835**. Update
   this existing applicable ruleset instead of adding a conflicting duplicate.
3. Under Require status checks to pass, add exactly **PR description**, expected
   source **GitHub Actions** (15368). Preserve both existing checks, strict mode,
   targets, Active state and every other existing restriction; add no bypasses.
4. Save only with explicit human authorization. Independently re-read the ruleset
   and confirm the new context/source. On a disposable PR, demonstrate a
   noncompliant description blocks merging and a corrected fresh edit passes.
   Do not merge the disposable PR. Inspect any additional classic protection in UI.

A failing Action alone does not block merging. Enforcement is pending human
activation and independent verification. This delivery uses a `[skip ci]` commit
because existing CI would run prohibited builds/Chromium; all hosted checks are
therefore pending/skipped, not PASS. Do not merge until required checks are satisfied
under separately approved verification scope.

## Existing PR impact

Inspected without mutation on 2026-10-24:

- [PR #4](https://github.com/ofir-rifo/data-grid/pull/4), Draft,
  `codex/local-performance-protocol` at `6f1ea82`: body is null. It needs all five
  sections with current, honest verification and limitations; the local failed
  supervisor result must not be reported as PASS.
- [PR #5](https://github.com/ofir-rifo/data-grid/pull/5), Draft, `feature/grid-core`
  at `369a878`: retain Summary, rename What's Included to the canonical changes
  section, combine Validation/Not Yet Verified into status-tagged entries, and
  add risks plus related specification references. Keep unverified browser,
  accessibility, performance and production limitations explicit.

Adding/merging this workflow does not itself emit a PR event for existing PRs or
retroactively run checks. After the workflow is present in their merge ref (bring
branches up to date if needed), a listed event such as description edit triggers
validation. An unchanged older PR may lack the workflow/check until refreshed.
Once the check is required, missing/failing results can block these PRs too; there
is no grandfather exemption. No descriptions, branches or review states were changed.

Sources: [GitHub PR events](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#pull_request),
[required-check troubleshooting](https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/troubleshooting-required-status-checks),
[ruleset rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets),
[skipping runs](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/skip-workflow-runs).
