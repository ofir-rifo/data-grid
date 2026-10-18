# Dependency maintenance audit — 2026-10-18

PR #2 baseline: squash merge `ee84747` on `origin/main`. Versions below are
**installed before this PR**, compared with npm registry `latest` metadata fetched
for every direct dependency on the audit date (all latest tags were stable).
Declared ranges alone are not installed versions. This is a version/compatibility
audit, not a vulnerability-advisory scan or proof of POC validation.

## Scope and graph

- Both workspace manifests inspected: root `@org/source` and `apps/playground`
  (`@org/playground`). The playground has Nx targets but no separate dependency
  declarations; no production library packages exist yet. Nx reports one project,
  and adding the root scripts does not introduce another inferred project.
- All **46 direct packages** covered below. Runtime dependencies are React and
  React DOM; the rest are development tools. Existing direct ranges/pins remain
  unchanged except the two explicit Testing Library patch pins.
- `pnpm list --recursive --include-workspace-root --depth 100 --json` inspected the
  full installed tree: **995 unique package/version pairs**, 12,707 traversed edges.
  The lock has 995 package and snapshot records. Cross-platform optional/native
  packages may not be materialized on Windows even though their lock records exist.
  The table intentionally lists direct dependencies, not 995 registry comparisons.
- pnpm **12.5.1**, frozen installs and lockfile v9 are retained. There are two lock
  documents: pnpm bootstrap metadata plus the application dependency graph; both
  workspace importers are covered. CI uses Node 24; local checks use Node 26.5.0.
  Public engine/peer ranges for proposed/latest versions were inspected. Peer
  consistency is checked after installation, not inferred from version numbers.

## Direct dependency decisions

| Package                             | Installed before | Latest stable | Action in this PR           | Compatibility / migration risk                                                |
| ----------------------------------- | ---------------- | ------------- | --------------------------- | ----------------------------------------------------------------------------- |
| `@eslint/js`                        | 9.39.5           | 10.0.1        | Defer major                 | ESLint 10 coordinated parser/plugin/config migration.                         |
| `@nx/devkit`                        | 23.2.1           | 23.3.0        | Defer coordinated minor     | Keep all ten Nx packages aligned; inspect Nx migrations together.             |
| `@nx/eslint`                        | 23.2.1           | 23.3.0        | Defer coordinated minor     | Keep all ten Nx packages aligned; inspect Nx migrations together.             |
| `@nx/eslint-plugin`                 | 23.2.1           | 23.3.0        | Defer coordinated minor     | Keep all ten Nx packages aligned; inspect Nx migrations together.             |
| `@nx/js`                            | 23.2.1           | 23.3.0        | Defer coordinated minor     | Keep all ten Nx packages aligned; inspect Nx migrations together.             |
| `@nx/playwright`                    | 23.2.1           | 23.3.0        | Defer coordinated minor     | Keep all ten Nx packages aligned; inspect Nx migrations together.             |
| `@nx/react`                         | 23.2.1           | 23.3.0        | Defer coordinated minor     | Keep all ten Nx packages aligned; inspect Nx migrations together.             |
| `@nx/vite`                          | 23.2.1           | 23.3.0        | Defer coordinated minor     | Keep all ten Nx packages aligned; inspect Nx migrations together.             |
| `@nx/vitest`                        | 23.2.1           | 23.3.0        | Defer coordinated minor     | Keep all ten Nx packages aligned; inspect Nx migrations together.             |
| `@nx/web`                           | 23.2.1           | 23.3.0        | Defer coordinated minor     | Keep all ten Nx packages aligned; inspect Nx migrations together.             |
| `@playwright/test`                  | 1.63.0           | 1.64.1        | Defer browser-tooling minor | New browser revisions; preserve the verified regression baseline.             |
| `@swc-node/register`                | 1.11.1           | 1.12.1        | Defer transpiler minor      | Review with SWC/Nx; latest peer still excludes TypeScript 7.                  |
| `@swc/cli`                          | 0.8.1            | 0.8.1         | Keep                        | Already latest stable; preserve current compatibility.                        |
| `@swc/core`                         | 1.15.8           | 1.16.18       | Defer native compiler minor | Native binaries and emitted-code compatibility; coordinate SWC/Nx.            |
| `@swc/helpers`                      | 0.5.18           | 0.5.23        | Defer helper patch          | Review generated helpers with the transpiler, not test-only maintenance.      |
| `@testing-library/dom`              | 10.4.0           | 10.4.2        | Apply 10.4.2                | Low: patch; dependency/type compatibility fixes.                              |
| `@testing-library/react`            | 16.3.0           | 16.3.3        | Apply 16.3.3                | Low: React 19 typing and act re-entry fixes; peers fit.                       |
| `@types/node`                       | 24.13.6          | 26.6.5        | Keep 24.x line              | CI targets Node 24; latest 26.x would expose unavailable Node APIs.           |
| `@types/react`                      | 19.3.0           | 19.3.0        | Keep                        | Already latest stable; preserve current compatibility.                        |
| `@types/react-dom`                  | 19.3.0           | 19.3.0        | Keep                        | Already latest stable; preserve current compatibility.                        |
| `@vitejs/plugin-react`              | 6.1.1            | 6.1.2         | Defer bundler patch         | Review with Vite/native optional transform peers.                             |
| `@vitest/coverage-v8`               | 4.1.11           | 5.0.5         | Defer major                 | Upgrade with vitest and UI to identical versions; coverage migration.         |
| `@vitest/ui`                        | 4.1.11           | 5.0.5         | Defer major                 | Upgrade with vitest and coverage; runner/config migration.                    |
| `eslint`                            | 9.39.5           | 10.13.0       | Defer major (priority)      | 9.x deprecated; React/import plugins lack ESLint 10 peer support.             |
| `eslint-config-prettier`            | 10.1.8           | 10.1.8        | Keep                        | Already latest stable; preserve current compatibility.                        |
| `eslint-plugin-import`              | 2.31.0           | 2.32.0        | Defer lint minor            | Rule changes and peer compatibility; keep within lint-stack review.           |
| `eslint-plugin-jsx-a11y`            | 6.10.1           | 6.10.2        | Defer lint patch            | Review potential new accessibility diagnostics separately.                    |
| `eslint-plugin-playwright`          | 1.8.3            | 2.12.1        | Defer major                 | Rules/defaults migration; do not silently change regression assertions.       |
| `eslint-plugin-react`               | 7.37.5           | 7.37.5        | Keep                        | Already latest stable; preserve current compatibility.                        |
| `eslint-plugin-react-hooks`         | 5.0.0            | 7.1.1         | Defer major                 | React Compiler/new rules need an explicit lint-policy review.                 |
| `eslint-plugin-unused-imports`      | 4.4.1            | 4.4.1         | Keep                        | Already latest stable; preserve current compatibility.                        |
| `jiti`                              | 2.4.2            | 2.7.0         | Defer loader minor          | Nx/config-loading path; coordinate toolchain verification.                    |
| `jsdom`                             | 27.4.0           | 30.1.3        | Defer major                 | DOM behavior changes and higher Node floor (24.15+ on Node 24).               |
| `knip`                              | 6.41.0           | 6.42.0        | Defer advisory minor        | Existing false positives need modeling review; no cleanup implied.            |
| `nx`                                | 23.2.1           | 23.3.0        | Defer coordinated minor     | Keep all ten Nx packages aligned; inspect Nx migrations together.             |
| `prettier`                          | 3.9.8            | 3.9.10        | Defer formatter patch       | Potential formatting churn; no broad reformat in this PR.                     |
| `sass`                              | 1.104.1          | 1.105.2       | Defer Sass minor            | Compiler behavior changes; no authored styling change here.                   |
| `stylelint`                         | 17.16.0          | 17.16.0       | Keep                        | Already latest stable; preserve current compatibility.                        |
| `stylelint-config-recommended-scss` | 17.0.1           | 17.0.1        | Keep                        | Already latest stable; preserve current compatibility.                        |
| `tslib`                             | 2.8.1            | 2.8.1         | Keep                        | Already latest stable; preserve current compatibility.                        |
| `typescript`                        | 6.0.3            | 7.0.2         | Defer major (blocked)       | Parser peer >=4.8.4 <6.1.0; latest SWC register also requires TS <7.          |
| `typescript-eslint`                 | 8.70.0           | 8.71.2        | Defer parser minor          | Compatible candidate, but keep lint/parser maintenance separately reviewable. |
| `vite`                              | 8.3.0            | 8.3.4         | Defer bundler patch         | Keep transform/bundle baseline; review with React plugin.                     |
| `vitest`                            | 4.1.11           | 5.0.5         | Defer major                 | Version-match UI/coverage and validate Nx integration/runner changes.         |
| `react`                             | 19.3.0           | 19.3.1        | Defer runtime patch         | Upgrade with react-dom; preserve POC runtime baseline in this test/DX slice.  |
| `react-dom`                         | 19.3.0           | 19.3.1        | Defer runtime patch         | 19.3.1 peers on React ^19.3.1; upgrade together with runtime regressions.     |

| `pnpm` (packageManager) | 12.5.1 | 12.14.0 | Defer package-manager minor | Keep the known bootstrap/multi-document lock behavior and CI setup; review upgrade separately. |

## Applied updates and lockfile boundaries

Only two test-only patches are applied and pinned exactly:

- `@testing-library/dom` **10.4.0 → 10.4.2**: maintenance of dependency/type
  compatibility, including the prior chalk-to-picocolors change.
- `@testing-library/react` **16.3.0 → 16.3.3**: React 19 RenderOptions type inference
  and avoiding re-entrant act() during event dispatch. React/DOM 19.3.0 and installed
  React types satisfy the published peers; DOM ^10.0.0 is satisfied by 10.4.2.
  Both packages require Node >=18, covering CI Node 24 and local Node 26.

Lock changes are limited to these packages, their references/integrities, and the
DOM package's chalk-to-picocolors edge; existing React, Nx, Vite, compiler, browser,
formatting and policy-tool resolutions stay fixed. Existing warnings about ESLint
9 being deprecated and transitive whatwg-encoding remain; no rules or peer checks
are disabled. No dependencies are removed based on advisory Knip findings.

Sources: [DOM releases](https://github.com/testing-library/dom-testing-library/releases),
[React Testing Library releases](https://github.com/testing-library/react-testing-library/releases).
Latest/peer/engine metadata comes from
[the npm registry](https://registry.npmjs.org/), using each package's encoded
`/<name>/latest` endpoint. This is a dated snapshot, not a claim about future versions.

## Recommended follow-ups — deferred, not approved implementation

1. Prioritize an ESLint 10 / Nx lint integration plan because ESLint 9 is deprecated.
   Latest React/import plugins still advertise only ESLint 9 support. Audit the
   ESLint 9 forward-compatibility config-lookup flag, custom policy fixtures and
   rule changes before migrating. Nx 23.3.0 is a coordinated ten-package minor,
   not a reason to update only one plugin.
2. Keep TypeScript 6 until parser/SWC peers permit TypeScript 7. Review Vitest 5,
   UI/coverage version equality and jsdom 30 as coordinated test-environment work.
3. Review React/DOM 19.3.1 together and Playwright/browser revisions in separately
   bounded regression work. Other compatible patch/minor candidates are deferred
   for scope, not claimed incompatible. No blanket latest upgrade is recommended.

## Validation scope

The six root scripts were exercised through pnpm: typecheck, lint, unit test and
one playground build completed. Dev and dev:open each started the existing Nx/Vite
server, served HTML and transformed main.tsx over HTTP, then their own process trees
were stopped. For dev:open, a temporary BROWSER callback captured the real --open
URL (http://localhost:4200/); no actual browser or browser stress test ran. OS/default
browser association behavior was not visually verified.

Also run: the nine existing engineering policy tests, dependency peer check,
format/whitespace checks. Exact results are recorded in PROJECT-STATUS.md. Hosted
CI results must be reported separately for the PR head; local script checks do not
establish hosted success or POC validity.
