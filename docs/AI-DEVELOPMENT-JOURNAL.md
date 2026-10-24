# AI development journal

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
