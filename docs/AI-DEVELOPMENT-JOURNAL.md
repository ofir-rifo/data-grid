# AI development journal

## 2026-10-24 — PR #6 final SHA compatibility review

Read official GitHub variables, contexts, target-event and rerun docs. Separate
event/workflow SHA definitions do not promise universal equality; no hosted
mismatch observed. Removed that assumption while validating both SHA shapes and
preserving trusted workflow ref, pinned workflow checkout and git HEAD equality.
No workflow YAML, permissions, canonical policy/parser/template/local CLI changes.

PASS: 157 bounded dependency-free tests plus JS syntax and whitespace checks.
New tests cover all six event actions with equal/different valid SHAs, malformed
metadata, future main contexts, old reruns/current heads, final publication errors
and accepted-success/lost-response ambiguity. Corrected the diagnostic to remote
state unknown when recovery also fails. Reproduced existing body-edit-at-POST race;
additional reads cannot make the commit-status API transactional with PR text.
No additional locally fixable critical issue found. Full diff independently
self-reviewed; not a substitute for Tech Lead acceptance or hosted verification.

Kept approved architecture and documented old-policy rerun risk and bootstrap
limits. Prepared updated canonical PR #6 description with current test count.
No dependencies, Windows settings, protections, PR #4/#5 or heavy workloads touched.
Keep Draft; BLOCKED for deployment/enforcement assurance. Performance HOLD; POC NO-GO.

Latest canonical body passed the unchanged event CLI. Body-only update of PR #6
returned connector 403 Resource not accessible by integration; saved complete
manual replacement `_tmp_pr6-final-body.md`. No alternate credentials or bypass.

## 2026-10-24 — PR #6 P1 trust-boundary correction

Audited merge-ref workflow and script trust, event metadata, head-vs-default SHA
reporting, required-check identity and owner review. Specified the correction in
specs/pr-description-trust-boundary.md before implementation. Read-only GitHub
inspection confirmed PR #6 Draft, personal User ownership, unchanged Protect main
with two existing required checks, zero approvals and no required owner review.

Implemented main-selected pull_request_target with checkout at workflow SHA and
bounded trusted tests. A dependency-free reporter posts pending then validates
the current API body/head and checks the snapshot again before a head-SHA commit
status. It fails gate/API/stale conditions without success. No PR code, branch
paths or artifacts execute. Narrow job permissions are contents/pull-requests:read
and statuses:write; pinned actions remain trusted. Added owner routing covering
all workflows, scripts, template and ownership itself. Canonical policy/parser,
local event CLI and template are unchanged.

PASS: 135 serial Node tests plus syntax and whitespace/static checks on 2026-10-24.
Initial combined run 133/134 exposed an old uses: counter matching statuses:;
anchored to action steps and reran, then added the runner guard test. New coverage
exercises trusted metadata, stale heads/bodies, gate and API failures, fixed write
destinations, fork/Draft equivalence and exact workflow/ownership contracts.
No pnpm, Nx, installation or prohibited workload ran in this correction. Nx
standards/typecheck NOT RUN due absent dependencies and no-install restriction.

Bootstrap requires independent review and existing checks before any authorized
merge; PR #6 cannot supply trusted main code before deployment. No head fallback.
Hosted trust/source/spoofing and merge blocking remain NOT RUN. Name-based status
checks plus inactive CODEOWNERS are not tamper-proof enforcement. External App or
organization-controlled workflow identity is a separate human decision. Detailed
alternatives, activation steps and races are in docs/PR-DESCRIPTION-SECURITY.md.
Keep PR #6 Draft. No ruleset/protection/Windows changes or PR #4/#5 mutations.
Delivery commit retains skip-ci to avoid existing heavy CI; target events ignore
that marker after deployment. Performance HOLD; production POC NO-GO.

Delivery metadata: prepared replacement PR #6 body passes the unchanged event CLI.
Connector title/body update returned 403 Resource not accessible by integration;
no metadata change or credential workaround. Saved manual body and instructions
with the security report. Branch delivery remains authorized; keep existing Draft.

## 2026-10-24 — Canonical PR description policy

Authorized scope: isolated tooling/documentation branch from main, specification
before implementation, bounded dependency-free tests/static review, Draft delivery;
no changes to PR #4/#5 or repository settings. Existing dirty supervisor checkout
was preserved. This file is new on main; PR #4's separate journal remains untouched.

Implemented executable policy, generated template, parser/content validator,
fail-closed event CLI, read-only pinned-action workflow and 100 regression tests.
Self-review caught template instruction acceptance; fixed the matcher and reran.
PASS on 2026-10-24: `node --test --test-concurrency=1 .github/scripts/pr-description.test.mjs`
(100/100). Static security/trigger/template contracts are included in that suite.

Nx discovery attempt `pnpm nx show project @org/playground --json` failed before
Nx ran: dependencies were absent and pnpm unexpectedly initiated automatic install
requests; network/DNS requests failed. Stopped the session. No dependency changes
were approved or committed. Standards-test, standards and typecheck are NOT RUN
because installed tooling is unavailable. No broad install/autofix attempted.

Ruleset inspection found active Protect main with two required checks, no bypasses;
new description check is not required. Classic protection returned connector 403.
Documented manual activation and PR #4/#5 migration without changing them.
Self-review is not independent Tech Lead acceptance. Hosted checks deliberately
skipped using the delivery commit marker because existing CI includes prohibited
build/Chromium tasks. Further verification/activation remains pending approval.
Performance HOLD; production POC NO-GO; no Stage 0, canaries or product changes.

Delivery: implementation commit `3d5b9e4` pushed to the requested branch. Proposed
PR body passed the event CLI. Connector Draft PR creation returned 403 `Resource
not accessible by integration`; no PR created and no credential workaround tried.
Preserved branch and documented exact manual Draft creation steps in the report.
