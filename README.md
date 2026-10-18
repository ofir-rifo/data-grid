# DataGrid

## Playground commands

Use Node 24 (the CI baseline) and the pinned pnpm 12.5.1. Install dependencies
with `pnpm install --frozen-lockfile`, then run commands from the repository root:

| Command                     | Purpose                                                                                      |
| --------------------------- | -------------------------------------------------------------------------------------------- |
| `pnpm run dev`              | Start the existing Nx/Vite playground at http://localhost:4200/.                             |
| `pnpm run dev:open`         | Start the playground and open its URL in your default browser.                               |
| `pnpm run build:playground` | Build the playground bundle.                                                                 |
| `pnpm run test:playground`  | Run playground unit tests once, with one worker.                                             |
| `pnpm run typecheck`        | Verify application, unit-test and browser-test TypeScript projects.                          |
| `pnpm run lint`             | Run repository engineering standards, ESLint, SCSS Stylelint and stylesheet filename checks. |

These scripts wrap existing Nx targets; `lint` deliberately runs the full standards
inventory. Tests do not enter watch mode. Build/typecheck skip implicit dependencies
and sync generators to avoid surprise work or source edits. Stop dev servers with
Ctrl+C. Browser flags can be affected by Vite's `BROWSER`/`BROWSER_ARGS` environment.

For bounded local verification in PowerShell, set `NX_DAEMON=false`,
`NX_NO_CLOUD=true`, `NX_SKIP_REMOTE_CACHE=true`, `NX_SKIP_NX_CACHE=true`,
`NX_ISOLATE_PLUGINS=false` and `NODE_OPTIONS=--max-old-space-size=2048` in the
environment before running one command at a time. These are environment variables,
not shell arguments; the heap cap is per Node process. Previous BSODs remain
undiagnosed; avoid stress/performance workloads without explicit authorization.

Read [project status](docs/PROJECT-STATUS.md),
[engineering standards](docs/ENGINEERING-STANDARDS.md), and the dated
[dependency audit](docs/DEPENDENCY-AUDIT.md) before expanding development scope.
The virtualization POC is **not formally validated**; flushSync remains opt-in.

## Original Nx workspace reference

<a alt="Nx logo" href="https://nx.dev" target="_blank" rel="noreferrer"><img src="https://raw.githubusercontent.com/nrwl/nx/master/images/nx-logo.png" width="45"></a>

✨ Your new, shiny [Nx workspace](https://nx.dev) is ready ✨.

[Learn more about this workspace setup and its capabilities](https://nx.dev/docs/technologies/typescript/introduction?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) or run `npx nx graph` to visually explore what was created. Now, let's get you up to speed!

🚀 If you haven't connected to Nx Cloud yet, [complete your setup here](https://cloud.nx.app/get-started). Get faster builds with remote caching, distributed task execution, and self-healing CI. [See how your workspace can benefit](#nx-cloud).

## Generate a library

```sh
npx nx g @nx/js:lib packages/pkg1 --publishable --importPath=@my-org/pkg1
```

## Run tasks

To build the library use:

```sh
npx nx run pkg1:build
```

To run any task with Nx use:

```sh
npx nx run <project-name>:<target>
```

These targets are either [inferred automatically](https://nx.dev/docs/concepts/inferred-tasks?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) or defined in the `project.json` or `package.json` files.

[More about running tasks in the docs &raquo;](https://nx.dev/docs/features/run-tasks?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

## Versioning and releasing

To version and release the library use

```
npx nx release
```

Pass `--dry-run` to see what would happen without actually releasing the library.

[Learn more about Nx release &raquo;](https://nx.dev/docs/features/manage-releases?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

## Keep TypeScript project references up to date

Nx automatically updates TypeScript [project references](https://www.typescriptlang.org/docs/handbook/project-references.html) in `tsconfig.json` files to ensure they remain accurate based on your project dependencies (`import` or `require` statements). This sync is automatically done when running tasks such as `build` or `typecheck`, which require updated references to function correctly.

To manually trigger the process to sync the project graph dependencies information to the TypeScript project references, run the following command:

```sh
npx nx sync
```

You can enforce that the TypeScript project references are always in the correct state when running in CI by adding a step to your CI job configuration that runs the following command:

```sh
npx nx sync:check
```

[Learn more about nx sync](https://nx.dev/reference/nx-commands#sync)

## Nx Cloud

Nx Cloud ensures a [fast and scalable CI](https://nx.dev/nx-cloud?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) pipeline. It includes features such as:

- [Remote caching](https://nx.dev/docs/features/ci-features/remote-cache?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
- [Task distribution across multiple machines](https://nx.dev/docs/features/ci-features/distribute-task-execution?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
- [Automated e2e test splitting](https://nx.dev/docs/features/ci-features/split-e2e-tasks?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
- [Task flakiness detection and rerunning](https://nx.dev/docs/features/ci-features/flaky-tasks?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

### Set up CI (non-Github Actions CI)

**Note:** This is only required if your CI provider is not GitHub Actions.

Use the following command to configure a CI workflow for your workspace:

```sh
npx nx g ci-workflow
```

[Learn more about Nx on CI](https://nx.dev/docs/features/ci-features?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

## Install Nx Console

Nx Console is an editor extension that enriches your developer experience. It lets you run tasks, generate code, and improves code autocompletion in your IDE. It is available for VSCode and IntelliJ.

[Install Nx Console &raquo;](https://nx.dev/docs/getting-started/editor-setup?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

## 🔗 Learn More

- [Nx Documentation](https://nx.dev/docs)
- [Crafting Your Workspace Tutorial](https://nx.dev/docs/getting-started/tutorials/crafting-your-workspace)
- [Module Boundaries](https://nx.dev/docs/features/enforce-module-boundaries)
- [Releasing Packages](https://nx.dev/docs/features/manage-releases)
- [Nx Plugins](https://nx.dev/docs/concepts/nx-plugins)
- [Nx Cloud](https://nx.dev/nx-cloud)

## 💬 Community

Join the Nx community:

- [Discord](https://go.nx.dev/community)
- [X (Twitter)](https://twitter.com/nxdevtools)
- [LinkedIn](https://www.linkedin.com/company/nrwl)
- [YouTube](https://www.youtube.com/@nxdevtools)
- [Blog](https://nx.dev/blog)
