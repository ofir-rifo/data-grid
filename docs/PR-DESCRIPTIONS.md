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
node --test --test-concurrency=1 .github/scripts/pr-description-reporter.test.mjs
$env:GITHUB_EVENT_PATH = 'C:/absolute/path/to/event.json'
node .github/scripts/check-pr-description.mjs
```

The JSON must contain `{"pull_request":{"body":"the actual description"}}`.
The CLI rejects invalid JSON, missing events and missing/invalid bodies with exit 1.
It reads neither titles nor comments. Section-specific errors identify headings,
order, placeholders and status/reason problems. Correct the PR's description via
GitHub's Edit button; after trusted deployment the `edited` event triggers a new
run. The local CLI validates its supplied snapshot; the hosted reporter re-fetches
the current description/head so an old event body cannot certify success.

Regenerate the template after intentional policy edits:

```powershell
node --input-type=module -e "import {writeFileSync} from 'node:fs'; import {renderTemplate} from './.github/scripts/pr-description-policy.mjs'; writeFileSync('.github/pull_request_template.md', renderTemplate());"
```

The regression suite compares the full generated output with the committed file.
Review policy changes against the specification; do not change required names to
make a noncompliant PR pass. Markdown support and deliberate limits are specified
in the policy. This is structural/heuristic validation, not language understanding.

## GitHub workflow and security

[pr-description.yml](../.github/workflows/pr-description.yml) uses
`pull_request_target` for main-targeting PRs with opened, edited, reopened,
synchronize, ready_for_review and converted_to_draft. There are no path or draft
filters. The workflow definition comes from main, and checkout pins this same
repository at `github.workflow_sha`. PR branches, merge refs, artifacts and code
are never loaded. A PR deleting or replacing its own workflow/validator does not
alter this trusted main-selected run after deployment.

The reporter posts **PR description** as a commit status on the PR's event head
SHA. The separate native job is **Trusted description reporter**; do not select
its default-branch job context as the head status. Job permissions are
`contents: read`, `pull-requests: read`, `statuses: write`. Only the automatic token
is used; no user secrets or code/settings writes. Pinned checkout/setup actions
are trusted and checkout does not persist credentials. No cache, install, Nx,
builds or browsers run. The token is removed from the trusted test subprocess's
environment. The PR body remains data and diagnostics are JSON escaped.

Pending is posted before bounded trusted test gates. The reporter fetches current
PR metadata from a fixed API endpoint, validates its body and verifies the snapshot
again before success. Invalid descriptions post failure; gate/API/stale-head
errors post error where possible and exit nonzero. Network calls have timeouts and
reject redirects. Drafts and forks follow the same metadata-only path without
running contributor code with the token. Event policy or platform restrictions
can prevent execution; absence is not a passing result. Review the full
[security report and bootstrap procedure](PR-DESCRIPTION-SECURITY.md) for residual
status identity, concurrency, SHA reuse and deployment limits. No merge queue
support or tamper-proof enforcement is claimed.

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

The [current activation procedure](PR-DESCRIPTION-SECURITY.md#bootstrap-and-activation)
supersedes the original merge-ref instructions. Main has no trusted validator yet:
PR #6 cannot certify its own trusted deployment. Independent bootstrap review and
existing checks must be satisfied without bypasses before any authorized merge.
After deployment and adversarial hosted verification, require the head commit
status **PR description** with its observed GitHub Actions source, preserving all
existing rules. CODEOWNERS routes reviews but is not enforced under the current
zero-approval rule. Required independent/code-owner reviews need a separately
authorized configuration and eligible independent reviewer. Stronger workflow
identity needs organization-controlled required workflows or a separate App.

A failing Action alone does not block merging. No settings were changed. `[skip ci]`
keeps existing pull_request build/Chromium CI from running on this delivery; it
does not suppress pull_request_target after deployment. Hosted trusted execution
and actual merge blocking remain unverified. Do not merge until existing required
checks and independent review are satisfied under separately approved scope.

## Existing PR impact

Historical first-milestone inspection on 2026-10-24; not re-read or modified during
P1 hardening (branches/descriptions can since have advanced):

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
retroactively run checks. After the trusted workflow is on main, a listed event
such as description edit triggers validation from main, regardless of whether the
PR branch contains the validator. There is no PR-code bootstrap fallback.
Once the check is required, missing/failing results can block these PRs too; there
is no grandfather exemption. No descriptions, branches or review states were changed.

Sources: [GitHub PR events](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#pull_request),
[required-check troubleshooting](https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/troubleshooting-required-status-checks),
[ruleset rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets),
[skipping runs](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/skip-workflow-runs).
