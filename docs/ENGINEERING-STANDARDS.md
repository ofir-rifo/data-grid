# Engineering standards

Adopted for PR #1 on 2026-10-18. These policies support the accepted project
principles; they do not approve production implementation or validate the POC.

## TypeScript and JavaScript

The root flat ESLint config shares policy with `tools/engineering/eslint-policy.mjs`.
Existing Nx module boundaries, React, accessibility and Playwright rules remain.
The consolidated inventory uses ESLint 9's supported `v10_config_lookup_from_file`
flag to load each file's nearest project config, rather than losing app-specific
rules when running from the repository root.

Errors, including in unimported authored files:

- Unused imports and variables (`unused-imports` rules). All parameters and caught
  errors are checked. Only intentionally discarded `_`-prefixed **parameters** are
  exempt; an underscore-prefixed local variable still fails, and using an ignored
  parameter also fails. Current POC callbacks and fixed-geometry implementations
  need five such placeholders to preserve positions/interface signatures. This
  matches TypeScript's underscore-parameter convention; it is not a debt baseline.
- Empty functions/methods, including comment-only bodies. Constructors that
  initialize TypeScript parameter properties have real runtime effects and are
  permitted; an empty constructor otherwise fails.
- Unreachable statements and `debugger`. TypeScript also enables
  `noUnusedLocals`, `noUnusedParameters` and `allowUnreachableCode: false`.
- Explicit `any`. Use `unknown` plus narrowing for untrusted boundaries.
- `@ts-ignore` and `@ts-nocheck`. `@ts-expect-error` is forbidden in production
  source; negative type tests may use it with a description of at least 15
  characters explaining the contract. TypeScript still rejects unused directives.
- `console.log`, `.debug` and `.info` in non-test `packages/**` and `libs/**`
  source, including computed string access/destructuring. Inject diagnostics in
  production libraries. Tests, CI scripts and existing playground diagnostics may
  log. `warn`/`error` are not banned by this particular policy. There are no
  production packages yet, so isolated negative fixtures verify the boundary now.

Type-aware linting uses TypeScript Project Service for app source/E2E and library
TypeScript. `no-floating-promises` (including `void`-discarded promises),
`no-misused-promises` and `await-thenable` are errors. Await, return, or explicitly
handle a rejection with `.catch`; `void` alone is not rejection handling. New
libraries must have a real tsconfig; missing project coverage fails rather than
silently disabling typed linting. Standalone tooling/config scripts retain syntax
checks; no broad default-project fallback or type-aware JS checks are added.

### Safe unused-import removal

The unused-import rule supports fixes, but blindly removing an entire runtime
import can remove module evaluation. Use the opt-in helper on explicit paths:

```powershell
node tools/engineering/fix-unused-imports.mjs apps/playground/src/example.ts
```

It applies only unused `import type` fixes from ESLint, preserves runtime/bare
imports and unrelated variables, and never runs in CI. Overlapping fixes are
deferred rather than applied unsafely. Review the diff and rerun checks. Runtime
imports need manual side-effect review; preserve intentional initialization as a
bare import. No bulk autofix or automatic dead-code deletion is approved.

## Styles

New authored stylesheet files must end in `.module.scss`. `.css`, `.module.css`
and non-module `.scss` fail even if no source imports them. Stylelint uses
`stylelint-config-recommended-scss` (SCSS syntax/plugin support), with empty blocks
(even comment-only blocks), duplicate standard/custom declarations and `!important`
as errors. Inline disable comments cannot bypass Stylelint. There are currently
no SCSS `!important` exceptions. A future unavoidable framework adapter requires a
reviewed exact-file configuration exception, rationale and regression coverage;
never disable the rule globally or allow a whole directory.

The request's unnamed usage restriction is interpreted as `!important`; this is
also consistent with the existing SCSS Modules requirement. Dynamic React geometry
style objects remain necessary in the POC; this milestone does not migrate them.

Temporary, exact legacy inventory:

| File                                         | Treatment and migration                                                                                                                                                                                                                                                                          |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `apps/playground/src/styles.scss`            | Nx scaffold, linked from `index.html`, currently comment-only. Filename exception accepts **comments/whitespace only**, so adding a declaration fails. Keep the HTML/framework contract here; separately remove or migrate the unused link/file after approval. Stylelint still checks the file. |
| `apps/playground/src/app/app.module.scss`    | Comment-only, unused SCSS Module; permitted but a Knip cleanup candidate. No deletion here.                                                                                                                                                                                                      |
| `apps/playground/src/app/nx-welcome.tsx:280` | Unused Nx scaffold contains embedded `<style>` CSS with `!important`. Embedded CSS is outside the stylesheet linter's scope and is recorded legacy debt, not a new-style pattern. Separately review removal of the whole unused scaffold or migrate static styles to a Module before reuse.      |

Dependencies, `.git`, `.nx`, `dist`, `out-tsc`, coverage and test outputs are excluded.
Vendored agent skills (`.agents/`, `.github/skills/`) are not authored product/tooling
code. Other tracked and non-ignored untracked files are inventoried with Git,
including unused/orphan files. Do not put authored source in generated directories
to evade checks; future generated roots/exceptions require review.

## Commands, tests and CI

Use pnpm/Nx with daemon and Nx Cloud disabled, serial tasks and
`NODE_OPTIONS=--max-old-space-size=2048` under local BSOD safety limits:

```text
pnpm nx run @org/playground:standards-test --excludeTaskDependencies --skipSync --parallel=1
pnpm nx run @org/playground:standards --excludeTaskDependencies --skipSync --parallel=1
pnpm nx run @org/playground:typecheck --excludeTaskDependencies --skipSync --parallel=1
pnpm nx run @org/playground:dead-code-report --excludeTaskDependencies --skipSync --parallel=1
```

Nine policy tests exercise positive and negative cases, real root/nested ESLint
configuration, real unimported library
files with Project Service, safe type-import fixing, unimported forbidden style
files, generated exclusions and the constrained legacy exception. Temporary
fixtures are isolated outside the product source and cleaned up by the tests.

`DataGrid checks` runs these policies sequentially. The standards inventory replaces
the separate playground lint step to avoid linting the same app twice; its nearest
config lookup preserves the original lint checks. Existing unit/build/bounded
Chromium checks remain. Knip uses `--no-exit-code`; its two-minute CI step is advisory
(`continue-on-error`) so findings/tool failures are visible in logs without blocking
this initial rollout. Hard standards/typecheck/test errors still fail CI. Node's
heap cap is per process, not a total system memory guarantee.

Pinned new tools: unused-imports 4.4.1, Stylelint 17.16.0, recommended-scss 17.0.1,
Knip 6.41.0. A targeted update of two CSS parser/tokenizer transitive peers within
their existing ranges resolved peer warnings; no broad dependency upgrade occurred.

## Existing debt and staged migration

No application implementation is changed. Full standards checks retain nine
existing `playwright/no-conditional-in-test` warnings in diagnostic files. Review
those conditionals as diagnostics in a separate scoped change; do not suppress the
rule to remove warnings.

Initial report-only Knip findings: five unused-file candidates (the three legacy
files above plus `engine/overscan.ts` and `engine/render-range.ts`), seven devDependency
findings, two unused named exports, one exported type and two duplicate export pairs.
It also reports the existing `types: ["*"]` configuration as an unresolved import and
entry/SCSS-compiler configuration hints. The global stylesheet is explicitly linked
from HTML, named/default exports may be intentional, and Nx plugin dependencies can
be indirect tooling requirements. These are **candidates/analysis limitations**, not
proof of dead code. Do not delete dependencies or public exports based on this run.

Proposed sequence: (1) confirm scaffold/HTML usage and remove or migrate only approved
legacy styles; (2) review engine/export/dependency findings against specs and Nx plugin
loading, improve Knip entry/compiler modeling; (3) consider a reviewed blocking
baseline only after false positives are resolved. None of these follow-up cleanups
is implemented or approved by this policy commit.

## Main protection recommendation — not applied

Read-only GitHub inspection on 2026-10-18: public personal repository, `main` default,
repository/inherited rulesets and effective `main` rules both empty; classic protection
returns 404. All three merge methods are enabled. GitHub's documented ruleset
capabilities support branch rules for public repositories. Existing check runs are
from GitHub Actions, app/integration ID **15368**.

After approving this PR, create branch ruleset `main-engineering-standards`:

- Target exactly `refs/heads/main`; enforcement **Active**; no bypass actors.
- Require pull requests and resolved review conversations. For a sole maintainer,
  use **0 required approvals** initially (owners cannot approve their own PRs);
  change to **1 independent approval**, dismiss stale approvals and require approval
  of the most recent reviewable push once another reviewer is available. No code
  owner requirement until CODEOWNERS/review ownership is designed.
- Require `DataGrid checks` and `Conventional commits`, source **GitHub Actions**
  (`integration_id: 15368`), with **strict/up-to-date checks enabled**. Do not skip
  checks on branch creation. Advisory Knip is inside the first job, not a separate
  required status context.
- Block branch deletion and non-fast-forward/force pushes; require linear history.
- In merge settings allow **squash only**, using the validated PR title as the
  squash subject; disable merge commits/rebase merges after approval. Linear history
  alone does not enforce squash. Keep merge queue, deployment/signature and AI review
  requirements off until their workflows and operational access are designed.

No protection/merge settings, bypasses, AI integrations or PR merge were changed.
Passing CI supports readiness to review this policy change, not formal POC validation.

References: [Project Service](https://typescript-eslint.io/blog/project-service/),
[unused-imports](https://github.com/sweepline/eslint-plugin-unused-imports),
[Stylelint SCSS setup](https://stylelint.io/user-guide/get-started/),
[Knip CLI](https://knip.dev/reference/cli), and
[GitHub rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets).
