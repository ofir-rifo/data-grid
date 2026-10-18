# CI foundation

PRs targeting `main` run two independent required-check candidates. Repository
rules are not enabled by this change; checks alone do not prevent merging.

## DataGrid checks

`.github/workflows/ci.yml` uses Ubuntu 24.04, Node 24, and pnpm 12.5.1 (pinned in
`package.json`). Installation uses `pnpm install --frozen-lockfile`.
pnpm 12 records its package-manager bootstrap dependencies in a
separate lockfile document; the existing application dependency graph is unchanged.
Actions are
pinned to reviewed commit SHAs. Only read access to repository contents is granted;
checkout does not persist credentials. No Nx Cloud, distributed agents or daemon
are used. Superseded runs are cancelled per PR. Tasks execute sequentially, with
Node old-space limited to 2 GB per process (not a total-machine memory cap).

The workflow runs the existing `@org/playground` Nx targets:

The finite typecheck, standards, unit-test and build steps call the root pnpm
scripts documented in [README](../README.md), so CI exercises the same convenience
commands as local development. Their underlying Nx commands/flags are preserved.

1. `typecheck`: TypeScript build mode, declaration-only; covers app, unit-test and
   Playwright project references. This is not a Vite application build.
2. `standards-test` and `standards`: positive/negative engineering policy tests,
   full authored-file ESLint (including the playground's existing config),
   SCSS Stylelint and stylesheet filename inventory; existing warnings are reported,
   errors fail. [Engineering standards](ENGINEERING-STANDARDS.md) defines rules,
   exceptions, safe import fixing and the unimported-file checks.
   `dead-code-report` runs Knip advisory-only with a two-minute timeout; findings
   and tool failures are visible but non-blocking during evaluation.
3. `test`: seven Vitest files (40 tests at the PR #3 checkpoint), one worker,
   no file parallelism, no watch mode.
4. `build`: one Vite bundle verification on the hosted runner, catching bundling
   failures that typechecking does not detect. No publishing or deployment.
5. `e2e`: only `flush-sync.spec.ts` and `row-overflow.spec.ts` (six existing cases).
   Chromium only, one worker, zero retries, 30s per-test / 120s global timeout,
   three-minute step / fifteen-minute job timeout. Tracing is explicitly off;
   video and screenshots retain Playwright's off defaults. The existing development
   web server starts automatically; this does not test the production bundle.

All Nx calls use `--excludeTaskDependencies --skipSync --parallel=1` to avoid
implicit duplicate builds or generator changes. Nx cache and remote cache are
disabled so execution results are attributable to this checkout. No timing
benchmarks, diagnostic experiments, Firefox/WebKit or full monorepo suite run.
Only Chromium and its system dependencies are installed on the hosted runner.
The bundle and development-server checks have distinct purposes; a production
browser regression remains a separate future decision.

## Conventional Commits

`.github/workflows/conventions.yml` validates the PR title and **every commit** in
the event's `base.sha..head.sha` Git range, with full history. It excludes the
synthetic merge checkout commit; no API pagination or latest-commit shortcut is
used. Branch merge commits must also have conventional subjects. Legacy commits
already in the base are excluded. All commit bodies remain unrestricted.

Use `type: description` or `type(scope): description`, for example:

- `fix(playground): contain virtualized cell overflow`
- `ci: add bounded Chromium regressions`

Allowed types: `feat`, `fix`, `perf`, `refactor`, `test`, `docs`, `build`, `ci`,
`chore`, `revert`. Types are lowercase. Optional scopes start with a lowercase
letter or digit and contain lowercase letters, digits, `.`, `_`, `/` or `-`.
Optional Conventional Commits breaking markers are supported (`feat(core)!: ...`).
Descriptions must be nonempty, with exactly one space after the colon and no
leading/trailing whitespace. Fixup/squash subjects and ordinary merge subjects
fail; arrange conventional commits before opening a PR.

The validator reads event JSON as data, never interpolates a PR title into a
shell, validates SHAs, and invokes Git without a shell. Its Node tests include
multi-commit history and synthetic-merge exclusion. Run them without dependencies:
`node --test .github/scripts/check-conventions.test.mjs`.

PR title/body edits rerun the lightweight conventions workflow, not the expensive
DataGrid workflow. New commits and reopened PRs run both. There is no duplicate
push-to-main workflow; CI also permits manual dispatch after workflow availability
on the default branch. Fork PRs receive no write permissions or repository secrets;
GitHub may require maintainer approval for their workflow execution.

## Proposed merge policy and follow-up settings

After observing successful real PR runs, separately approve repository rules for
`main`: require a PR, require `DataGrid checks` and `Conventional commits`, require
review and resolved conversations, and prohibit force pushes/deletion. Decide
whether checks must be up to date and who may bypass rules before enabling them.
These settings are not changed here.

Intended future policy: squash-merge PRs, with the validated PR title as the squash
commit subject. Enable squash merging and title-based default messages, and decide
whether to disable other merge strategies only after approval. Until then every
PR commit is validated regardless of eventual merge method. This does not automate
releases or publishing.

AI review can later be added as an advisory, PR-scoped reviewer after reviewing
repository access, pricing and data permissions. Keep human review and deterministic
checks authoritative; do not give a reviewer deployment/write secrets by default.
No AI-review product, branch protection or publishing infrastructure is installed.

Passing these checks does not validate the POC's native painted frames, performance,
memory, scalability or production/browser compatibility. `flushSync` remains opt-in.
Local BSOD safety restrictions still apply; runner limits are not authorization
for unrestricted local workloads.
