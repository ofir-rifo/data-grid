# PR #6 security hardening report — 2026-10-24

**BLOCKED for trusted hosted activation; local implementation is ready for final
Tech Lead inspection.** This report supersedes the original delivery architecture.
No tamper-proof or active mandatory enforcement is claimed. PR #6 stays Draft.
Performance HOLD; production POC NO-GO.

## Root cause and threat model

The original `pull_request` workflow used merge-ref YAML and default checkout.
An author could replace the script, remove its tests, change the run command to
success, rename/remove the job, or add another workflow reporting the same name.
Read-only permissions limited damage to repository state but did not authenticate
the validation result. Checking out base scripts inside editable workflow YAML
would fix only one of these paths. Static tests in that YAML cannot force the
author to run them. This was an enforcement design defect.

Trust now rests on GitHub selecting the default-branch `pull_request_target`
workflow, protected main content, the pinned checkout/setup actions, and the hosted
runner. The author still controls description text, PR branch names, files and
head commits. Those values are data and never become a code path, command, import,
download destination, status context or log command. The known repository, event
identity, PR number, base, workflow ref and SHA shapes are checked before API writes.
Only main-targeting PRs are supported by the hosted enforcement workflow.

GitHub documents that the target event selects trusted default-branch YAML and
that executing PR code under it is unsafe. That is why this implementation never
loads PR source or artifacts. [GitHub target-event security](https://docs.github.com/en/actions/reference/security/securely-using-pull_request_target).

## Selected architecture and alternatives

| Option | Decision and boundary |
| --- | --- |
| pull_request + checkout main scripts | Rejected: the PR still controls YAML, command and job execution. |
| PR-called reusable workflow pinned to trusted source | Insufficient alone: caller can omit/replace invocation. Needs an independently required workflow rule. |
| Read-only target workflow native job only | Avoid as sole head status: target execution uses the default-branch SHA context. Explicitly publish the evaluated PR head. |
| Trusted target workflow + head commit status | Implemented with fixed API endpoints, live body reads, pending/error states and trusted tests. Small dependency-free option available in this personal repository. |
| CODEOWNERS + required owner/independent review | Ownership file implemented. Review enforcement needs human configuration and an eligible independent reviewer. Current zero-approval rule does not enforce it. |
| Organization/enterprise required workflow | Stronger workflow identity control; documented GitHub feature is organization/enterprise scoped. Current owner type is User, so this is not a presently deployable repository setting. |
| External trusted GitHub App | Stronger distinct status-source identity; needs separately controlled service, credentials and installation. Not provisioned or assumed available here. |

The workflow uses `pull_request_target` on the same six original activity types,
filtered to base main. Checkout explicitly selects fixed repository
`ofir-rifo/data-grid` at immutable `github.workflow_sha`; its HEAD is checked before
running trusted gates. The native job is **Trusted description reporter**. The
required merge context remains **PR description**, now an explicit commit status
on the event PR head, with a link to the trusted run. Default-branch workflow
semantics and workflow SHA are documented by [PR events](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#pull_request_target)
and [GitHub contexts](https://docs.github.com/en/actions/reference/workflows-and-actions/contexts#github-context).

Only `contents: read`, `pull-requests: read` and `statuses: write` are requested.
The status write is necessary to bind the decision to the PR head, rather than
the default branch. No contents/checks/actions write permission or user secret is
requested. All pinned actions share job permission scope and remain trusted;
checkout uses the automatic token but does not persist it. Only the reporter gets
the explicit GH_TOKEN environment variable, removed from its test subprocess.
[Commit status API and permission requirement](https://docs.github.com/en/rest/commits/statuses#create-a-commit-status).

Reporter sequence:

1. Reject wrong event/repository/default-main/workflow ref, missing trust metadata,
   malformed PR number/head SHA or unsupported event action before any write.
2. Post pending on the event head SHA in the fixed base repository.
3. Check checkout HEAD equals workflow SHA; run both dependency-free suites
   serially with a 30-second gate deadline and 256MB per-process Node heap cap.
4. Fetch the real current PR, verify identity/open state/main base and matching
   event head, and validate the current API body using the unchanged parser.
5. Post failure for invalid content. Otherwise fetch again; require unchanged
   body, timestamp, head and base before posting success. Errors attempt an error
   status and always fail the job. Status publication errors never return success.

All HTTP calls target fixed allowlisted GitHub endpoints, reject redirects, have
10-second deadlines and avoid logging tokens/API response bodies. The two-minute
job deadline bounds the whole run. No pnpm, installation, cache, build, browser,
untrusted executable or PR code is involved. Draft/regular/fork PRs use the same
path. A stale-head event updates only its original head and cannot certify a newer
commit. A rerun reads the current body, not the old event body.

## Implementation and regression coverage

Changed architecture files: `.github/workflows/pr-description.yml`, new
`.github/scripts/pr-description-reporter.mjs`, new
`.github/scripts/report-pr-description.mjs`, and `.github/CODEOWNERS`.
The existing policy test's workflow assertions are updated; new
`pr-description-reporter.test.mjs` supplies 35 security/unit/static tests.
Specification, operational guide, project status and development journal are updated.

The 100 original format/CLI/template regressions remain. The new suite asserts the
five exact headings independently, exercises runtime/event guards before writes,
fork/Draft equivalence, current-vs-event bodies, pending before gates, stale heads,
changed snapshots, gate failures, HTTP/permission/timeout/JSON failures, API endpoint
allowlists, head/source destinations and no success on evaluated error paths.
It includes hostile body/code-file fixtures and constrains the complete workflow
to a reviewed exact shape plus ownership coverage and runner token/path handling.
These are local simulations/static assertions, not proof of GitHub execution or
independent policy enforcement. Full-shape tests are regression alarms, not a
trusted-root control when run from attacker-controlled code.

No content-policy relaxation: `.github/scripts/pr-description-policy.mjs`,
`.github/scripts/pr-description.mjs`, `.github/scripts/check-pr-description.mjs`
and `.github/pull_request_template.md` are unchanged from `477bf5f`. Exact headings,
order, placeholder and PASS/FAIL/NOT RUN rules remain in effect.

## Actual verification

PASS on 2026-10-24 with `NODE_OPTIONS=--max-old-space-size=256`, from the PR worktree:

```text
node --test --test-concurrency=1 .github/scripts/pr-description.test.mjs .github/scripts/pr-description-reporter.test.mjs
node --check .github/scripts/pr-description-reporter.mjs
node --check .github/scripts/report-pr-description.mjs
node --check .github/scripts/pr-description-reporter.test.mjs
git diff --check
```

Final local suite: **135 tests passed, zero failed**. First combined run was
133/134 because an old unanchored `uses:` counter also matched `statuses:`; corrected
it to recognize actual YAML action steps, reran successfully, and added a runner
guard test. These results do not include hosted status writes.

PASS: empty diff for the four content-policy/validator/template files against
the previous branch tip. No dependency or lockfile changes. Full staged diff and
the existing PR diff were inspected for unrelated changes and obsolete guidance.

NOT RUN: Nx standards-test/standards/typecheck; installed dependencies remain
unavailable and installation is prohibited. No pnpm invocation or installation
attempt occurred during this hardening task. JavaScript syntax, static contracts
and dependency-free tests are the available local gates; they are not ESLint or
typecheck substitutes. No builds, Chromium, performance, Stage 0 or supervisor
verification ran. No Windows settings or GitHub protections changed.

NOT RUN: deployed target event, real token permissions, fork SHA publication,
same-name spoofing behavior, source attribution and actual merge-blocking tests.
The trusted workflow/validator do not yet exist on main. Read-only GitHub
inspection confirms PR #6 is open Draft on the specified branch, base main at
`27b4f16`. `Protect main` (25351835) still requires only `DataGrid checks` and
`Conventional commits` from Actions integration 15368, with strict checks and no
bypasses. Zero required approvals and code-owner requirement false remain unchanged.
Owner type is User; no organization-controlled required workflow is claimed.
Classic protection had connector 403 on the prior task; it was not reverified here.

## Bootstrap and activation

1. Keep PR #6 Draft for independent review. Review the final pushed commit, entire
   PR patch, trusted workflow, status writer, ownership, tests and this report.
   Run the local bounded gates against that exact reviewed commit. The PR cannot
   supply the trusted workflow before it is installed on main; do not claim a
   PR-branch run is trusted enforcement. Never add a head-code fallback, temporary
   protection exemption, privileged untrusted dispatch or forced success status.
2. Satisfy the two existing required checks through their normal approved process.
   This task forbids their build/Chromium workloads; the delivery commit retains
   `[skip ci]`. Separate verification authorization is needed before those checks
   can run. Do not disable, bypass or weaken them. Human approval is required for
   any subsequent merge; this task does not merge or mark Ready for Review.
3. After an authorized merge, verify main contains the reviewed workflow, scripts,
   template and CODEOWNERS together. Check the applicable Actions event policy and
   permissions permit this narrowly scoped target workflow. GitHub documents
   restrictions/evaluation of target events for public repositories; no policy
   changes are authorized here. A blocked event is a deployment blocker.
4. On a new disposable ordinary/Draft PR, including a fork case, emit a supported
   event (editing a description is sufficient). Verify the run's workflow ref/SHA
   is main, checkout matches that revision, API calls target the correct base
   repository and the **PR description** commit status appears on the exact head
   with its observed source and trusted run URL. A target event ignores `[skip ci]`
   once deployed; that marker only suppresses existing pull_request workloads.
5. Adversarially change/delete PR copies of the YAML, scripts, policy and tests,
   with an invalid description. Confirm trusted failure persists. Also test
   same-name forged check/status attempts, API denial, stale reruns, new heads and
   rapid edits. Confirm corrected bodies pass and invalid ones block merge, without
   merging the disposable PR. Do not treat a normal success as proof against spoofing.
6. With explicit approval, update **Protect main**, not a conflicting duplicate:
   add exact context **PR description** with the actual observed GitHub Actions
   source (existing Actions integration is 15368; verify this status's attribution
   before selecting it). Preserve existing checks, strict mode, targets, Active
   state, deletion/force-push/linear-history/squash/review-conversation restrictions
   and absence of bypasses. A recent successful status is needed for selection.
   Re-read configuration and demonstrate actual merge blocking independently.
7. Separately approve an eligible independent reviewer/code owner and require
   owner review plus stale-approval/last-push protections as appropriate without
   weakening any existing settings. CODEOWNERS is routing only until this occurs.
   The present owner cannot approve their own PR. If independent workflow identity
   is mandatory, provision an external App or evaluate organization migration and
   required workflows first; name-only checks do not satisfy that stronger claim.

GitHub's [required-workflow capabilities](https://docs.github.com/en/enterprise-cloud@latest/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets#require-workflows-to-pass-before-merging)
are organization/enterprise scoped; their default event handling must be tested
alongside description-edit triggers if adopted. [CODEOWNERS](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)
must be on the base branch and required by protections to block changes.

## Remaining limitations and review decision

- **No independent result identity yet.** Any actor/workflow able to publish the
  same context using the allowed App identity may forge it. GitHub Actions as a
  required source identifies the App, not a workflow path. Current settings do not
  enforce the new context or owner review. A fork's read-only PR token cannot use
  this writer, but hosted duplicate-name behavior remains unproven. GitHub says
  matching check and status names must both pass; do not infer that this eliminates
  all spoofing cases. [Required-check behavior](https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/troubleshooting-required-status-checks).
- **Deployment trust.** Main, administrators, pinned actions and hosted runners
  remain trusted. With zero approvals today, future weakening can be merged unless
  independent review is actually enforced. CODEOWNERS alone does not fix that.
- **Commit-scoped mutable metadata.** Read/write is not transactional with PR body
  edits. A change after the last read, delayed/cancelled jobs, shared head SHA across
  PRs, or a transport failure after a server accepts success can leave stale or
  ambiguous status. Pending/error reporting narrows, but does not eliminate, these
  windows. A workflow unable to start/write cannot revoke an earlier success.
  Review latest PR/run/status together. No merge-queue support is claimed.
- **Platform and content limits.** Event-policy blocks, API rate limits, denied
  status writes and fork behavior require hosted verification. Meaningful/truthful
  prose is still a human review responsibility; parser limitations remain documented.

Self-review is not independent Tech Lead acceptance. The direct PR-tree execution
path is removed by design, but local tests cannot prove end-to-end mandatory
enforcement. Outcome is **BLOCKED** until trusted bootstrap, required-check/review
decisions and hosted adversarial verification are completed with authorization.
Only the existing PR #6 branch is committed/pushed; PR #4/#5 are untouched.

## Delivery and metadata permission boundary

Branch: `chore/pr-description-enforcement`; existing PR:
[PR #6](https://github.com/ofir-rifo/data-grid/pull/6), open Draft at inspection.
The final commit/hash and remote confirmation are supplied in the delivery chat.
The complete branch patch and hardening-only patch are exported locally as ignored
`_tmp_pr-description.patch` and `_tmp_pr6-hardening.patch` for offline review.

A proposed updated description was validated with the unchanged local event CLI
and passed. Connector update of PR #6 title/body returned 403 `Resource not
accessible by integration`. No metadata was changed and no alternative credential
or permission bypass was attempted. Manual metadata update: title
`chore: harden PR description trust boundary`, body from ignored local
`_tmp_pr6-security-body.md`. Keep the PR Draft. The current remotely stored title
and old verification statements are not evidence of this correction's results;
replace them with the prepared honest report before review. This metadata blocker
does not prevent the authorized branch push.
