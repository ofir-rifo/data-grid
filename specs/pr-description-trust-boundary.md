# PR description trust boundary

Status: authorized P1 hardening design, 2026-10-24, before implementation.
Supersedes the original policy's merge-ref workflow architecture only. The five
headings, content rules, template and existing parser/validator remain unchanged.

## Threat and selected architecture

An author controls the PR tree, including scripts, tests and workflow YAML. A
pull_request workflow executes merge-ref YAML; selecting a trusted script ref
inside that YAML cannot stop the author replacing the command or disabling the
job. Static checks in that same tree cannot enforce their own execution.

Use pull_request_target for main-targeting PRs. GitHub selects the default-branch
workflow; explicitly checkout this repository at github.workflow_sha, the immutable
revision of that workflow. Never checkout PR head/base expressions, refs/pull,
artifacts or local actions supplied by the PR. Run on ephemeral hosted Linux;
disable credential persistence and package-manager caching, use pinned actions.
No installation, build, cache restore/save or untrusted execution is allowed.
This is an independently justified use of pull_request_target for metadata policy.

### SHA compatibility contract — final static review

GITHUB_SHA is event-dependent; GitHub's target-event table places it on the default
branch. GITHUB_WORKFLOW_SHA identifies the workflow-file revision. Official docs
define their roles separately and do not promise equality for all executions.
Do not assume the workflow SHA is the last commit that edited the YAML, or claim
that an ordinary later main commit necessarily produces unequal values. No actual
hosted mismatch has been observed here. As a conservative compatibility decision,
validate both SHA shapes independently rather than requiring equality. Trusted
selection remains the exact repository/main workflow ref plus immutable checkout
at workflow SHA and a matching git HEAD. GITHUB_SHA selects neither executable
source nor status target. New main events and old reruns must preserve those rules.
Reruns preserve original event SHA/ref; they need not use today's main tip or policy.
Use a fresh supported event after policy deployment, not a historical rerun, to
verify the newly deployed policy.

References: [variables](https://docs.github.com/en/actions/reference/workflows-and-actions/variables),
[target events](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#pull_request_target),
[reruns](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/re-run-workflows-and-jobs).

Publish `PR description` as a commit status on the event's PR head SHA. A native
target-workflow job runs in the default-branch SHA context, so do not rely on its
job name alone for a head-specific merge decision. Only the reporter receives the
explicit GH_TOKEN environment variable; checkout also uses the automatic token
implicitly. All pinned actions in the job are trusted. Required job permissions: contents:read,
pull-requests:read and statuses:write; no contents/checks/actions writes or secrets
other than the automatic scoped token. All other permissions are absent. The
write permission is limited to status publication, never repository code/settings.

Validate repository/main/workflow-ref/event identity and strict SHA/PR number
shapes before any API write. URLs and context are constants; body/ref/title and
fork repository names never select commands, destinations or status descriptions.
First post pending on the event head; run bounded trusted regression gates; fetch
the current PR from the fixed base repository API, check its open state/base/head,
validate its real body using the unchanged policy, and re-read before success.
Changed snapshot/head or gate/API failure must never publish success. Publish
failure/error for a known event head where API access allows, exit nonzero and log
escaped actionable errors. All requests have timeouts and reject redirects.
If a success write's response is lost and error publication also fails, the remote
status is unknown; a failed local job cannot prove GitHub did not accept success.
Diagnostics must state that ambiguity rather than certify the absence of success.
Do not fetch source code or execute body content. Ordinary, Draft and fork PRs
targeting main use the same path. An event lagging a newer head fails on the old
head, never certifies the new one. Old reruns re-read the current PR rather than
accepting an old body snapshot. Concurrent changes after the last read/write are
not transactional; document remaining races and SHA reuse across PRs.

## Workflow/policy protection and capabilities

Add CODEOWNERS for all workflows, scripts, template, specifications and CODEOWNERS
itself, naming existing owner @ofir-rifo. This is review routing until code-owner
approval is separately required. Current Protect main requires zero approvals,
does not require code-owner review, and does not require PR description. Do not
change those settings in this task. A sole author cannot approve their own PR;
an independent eligible owner/reviewer must be appointed before claiming required
independent review. Base CODEOWNERS governs proposed changes once deployed.

Name/source-required status checks alone do not bind a result to a particular
workflow. A collaborator with status-write capability, or another workflow with
the same app identity and sufficient privileges, can forge the context. Untrusted
fork workflows cannot obtain the reporter's status-write token through this design,
but hosted duplicate-name and required-source behavior must be adversarially
verified. CODEOWNERS and reviews help protect future main changes, not establish
unforgeable status identity. Administrators and compromised actions remain trusted.

Independently controlled required workflows (organization/enterprise rulesets) or
a dedicated externally hosted GitHub App with its own required source would provide
a stronger identity boundary. This repository is public and owned by a personal
User, not an organization; organization workflow rules are not currently applicable.
No external app credentials/infrastructure or organization migration is authorized.
A reusable trusted workflow called from PR-controlled YAML is insufficient unless
its invocation is independently required. Push path restrictions are not the
public personal-repository solution. Keep the outcome explicitly non-tamper-proof.

## Bootstrap and acceptance

The validator/workflow are absent on main. Never fall back to PR code in a target
run. PR #6 therefore cannot self-certify trusted enforcement before deployment.
Review its pinned final commit and full patch independently, run local bounded
gates, satisfy all existing required checks only within separately approved scope,
and merge solely after human approval. No bypass, temporary protection removal,
untrusted dispatch, or privileged head-code bootstrap. Keep PR #6 Draft now.

After deployment, emit a fresh PR event and verify actual trusted workflow SHA,
head-SHA commit status/source, Draft/fork behavior, invalid/valid description edits,
deleted/replaced PR workflow/validator/tests, forged same-name checks, error and
stale-event cases. Only then, with approval, add the existing ruleset's required
status source/context and code-owner review without removing any protections.
Inspect Actions event policy: pull_request_target may be restricted by GitHub;
do not change that policy automatically. Missing trusted execution is a blocker,
never a reason to execute the PR implementation. Static/unit checks cannot prove
hosted scheduling, permissions, source attribution or merge enforcement.

Regression acceptance: unchanged canonical policy/template; guards and API targets;
pending before gates; named head status; no success for bad bodies, stale heads,
changed bodies, gates, API/permission failures; escaped diagnostics; fork/Draft
equivalence; malicious PR source is never loaded. Static tests constrain the entire
workflow to its reviewed small form and ownership coverage. No dependencies/settings
or other PRs changed. Performance HOLD; production POC NO-GO.
