<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->

## Persistent DataGrid development workflow

- Read `docs/PROJECT-STATUS.md` before planning new development; follow the existing specifications and project principles it references.
- Use this cycle: Read specs → Identify next approved task → Implement → Verify when authorized → Review → Update project status → Continue within approved scope.
- Update project status after completing an approved milestone, preserving architectural decisions and recording important trade-offs.
- Distinguish implemented work, tested results (including dates and scope), manual observations, hypotheses, and pending work. Do not present historical results as newly verified.
- Ask for approval before major architecture changes or expanding scope. Recommended milestones are not authorization to implement them.
- Observe the safety constraints in project status; verification requirements do not authorize prohibited workloads.

## Engineering standards

- Read `docs/ENGINEERING-STANDARDS.md` before changing code/configuration. Preserve Nx/project lint rules and the documented legacy exceptions.
- New authored styles must be `*.module.scss`; do not add global CSS/SCSS, `!important`, or blanket lint suppressions. Keep required legacy framework styles until their reviewed migration.
- Reject unused bindings/imports, empty implementations, unreachable code, debugger statements, explicit `any`, unsafe TS suppressions and unhandled Promises. Production library logging must use an injected diagnostic contract.
- Only underscore-prefixed intentionally discarded parameters are exempt from unused checks; unused variables are not exempt. Explain negative type-test suppressions.
- Run the bounded Nx `standards-test`, `standards` and `typecheck` targets when authorized. The standards inventory includes unimported files; keep it that way when adding packages.
- Safe import autofixing is opt-in, explicit-file and type-only. Do not run broad autofixes or remove runtime imports/dead-code candidates without reviewing effects and approval scope.
- Knip is advisory; investigate findings before cleanup. Never disable useful rules merely to pass CI. Record existing debt, exact exceptions and verification limits in project status.
