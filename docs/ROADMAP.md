# DataGrid roadmap

Prepared: 2026-10-17; validation review updated 2026-10-18. This document separates requirements from proposed sequencing. It is not blanket implementation or workload authorization. Read [project status](PROJECT-STATUS.md) and current user instructions first.

## 1. Approved work and documented requirements

### Current authorization

The original four preparation phases and subsequent containment/CI work have been
reviewed and merged through PR #2. PR #3 authorizes focused POC audit, deterministic
regressions, bounded local checks/existing hosted correctness CI, and a proposed
performance plan. [The validation review](POC-VALIDATION.md) is the current evidence
ledger. Historical execution restrictions below do not override this narrower
current authorization. Heavy measurement remains approval-gated; production work,
default-on flushSync and POC validation by assertion remain unauthorized.

### Requirements and source status

| Source                                                                   | Status                                                          | Existing requirements / boundaries                                                                                                                                                                                                                               |
| ------------------------------------------------------------------------ | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Project principles](../specs/000-project-principles.md)                 | Accepted, v1.0                                                  | Spec-first development; framework-independent core; React integration; strict typing; accessibility and keyboard interaction; customization; performance evidence; tests and definition of done.                                                                 |
| [Architecture](../specs/001-architecture.md)                             | Draft, v0.3                                                     | Intended `grid-core` / `grid-react` responsibilities, data-agnostic contracts, logical identity, geometry and custom virtualization. Updated sections describe existing POC behavior and evidence limits; no production implementation is approved by the draft. |
| [POC-V1](../specs/features/POC-V1-virtualization.md)                     | Proposed specification; current POC investigation is authorized | Fixed-geometry 2D window, pinned regions, fast jumps, bounded DOM, rendering/memory/scalability evidence, and a documented exit decision before production virtualization. Explicit non-goals remain outside POC scope.                                          |
| [Scroll investigation](../specs/features/POC-V1-scroll-investigation.md) | In progress                                                     | Historical timing/coverage findings, manual flushSync comparison, unresolved paint/compositor and scalability evidence.                                                                                                                                          |

An accepted capability goal is not a detailed feature specification. Draft/proposed sources retain their status; this roadmap does not silently approve them or satisfy their acceptance criteria.

## 2. Proposed development sequence — requires approval for each scope

### Milestone 1: Review and execute bounded regression verification

- Review the stabilized three-mode regressions and diagnostic changes. Targeted app/e2e typechecks, lint, and six Chromium/development containment/flag cases now pass; broader runtime compatibility and performance evidence remain incomplete. See project status for the exact tested revision state and commands.
- Only after explicit authorization, agree on resource limits and execute the selected checks on the exact reviewed revision, starting with a single browser/worker and no performance recording.
- Record commands, environment, results, and failures separately from historical checks. No browser install or production build is implied.
- Exit evidence: reliable flag semantics, final-window/cell correctness, diagnostic consistency, and pinned alignment for the tested configurations. This does not close transient paint investigation.

### Milestone 2: Close the POC evidence gaps

- Follow [the measurement plan](PERFORMANCE-MEASUREMENT.md) only after explicit workload approval.
- Compare absent/0/1 modes under matched settings; investigate native-scroll paint separately from programmatic jumps and timing-only runs.
- Address POC sections 14–15: rendering cost, bounded DOM, memory behavior, and logical-dimension scalability. Scope browser-height limits separately as required by section 17.
- Exit evidence: reviewed observations with limitations, resource conditions, and unresolved issues recorded. No machine-specific pass/fail threshold is invented here.

### Milestone 3: Decide POC outcome before production work

- Answer POC section 19 with evidence and identify any necessary architectural changes.
- Record `VALIDATED` or `ARCHITECTURE CHANGE REQUIRED` only when supported; incomplete evidence remains pending.
- Decide the scheduling policy and flushSync trade-off explicitly. Default-on remains unapproved.
- Review the architecture draft and write the next production feature specifications and acceptance criteria before implementing them.

These are recommended milestones, not a previously approved roadmap or authorization to run workloads.

## 3. Future capabilities — existing goals, new specifications/decisions needed

The following groups derive from accepted principles and the architecture draft. Their ordering below is dependency guidance, not a committed delivery sequence.

| Capability                                   | Existing basis                               | Specification / product decisions still needed                                                                                                                                                                                                                       |
| -------------------------------------------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `grid-core`                                  | Architecture §3.1; principles §§5, 7, 14, 17 | Define production state/model APIs, logical identity, geometry and data-source/query contracts, state ownership, and package acceptance tests. Do not simply promote the POC into a complete core.                                                                   |
| `grid-react`                                 | Architecture §3.2; principles §§8–10, 13     | Specify the public React API, components/slots, styling/theme contracts, scroll integration, and how core state maps to DOM behavior. `grid-react` depends on `grid-core`; never the reverse.                                                                        |
| Accessibility and keyboard/focus             | Principles §§10–11; architecture §§3, 5      | Define semantic structure, virtualized/pinned-row behavior, logical navigation, focus persistence, ARIA and screen-reader acceptance criteria alongside the first production interaction features. Do not postpone accessibility until all features are implemented. |
| Selection                                    | Principles §§9–11, 13–14; architecture §3.1  | Specify selection behavior/state, keyboard/mouse semantics, header/row controls, consumer customization, and accessibility tests. Modes and public APIs are not settled by the existing documents.                                                                   |
| Editing                                      | Principles §§9–11, 13–14                     | Specify lifecycle, editor contracts, commit/cancel behavior, focus, and virtualization interactions before implementation. Product-specific editing rules are not defined.                                                                                           |
| Sorting and filtering                        | Principles §§4, 17, 19; architecture §§3–4   | Specify typed shared query models, UI/interaction semantics, state ownership, client/server responsibilities, accessibility, and edge cases. Keep HTTP/backend logic outside the grid.                                                                               |
| Variable geometry and column behavior        | Architecture §§6, 8; POC §16                 | Specify variable row heights/column widths and any sizing/resizing behavior separately; they are outside fixed-geometry POC scope.                                                                                                                                   |
| Extensibility and theming                    | Principles §§8–9, 15, 18                     | Define concrete slot/plugin contracts only where meaningful boundaries or reuse require them; retain consumer renderers and replaceable visual controls without adding speculative framework complexity.                                                             |
| Server data and optional AI/query extensions | Principles §§4, 16–17; architecture §4       | Specify consumer-owned data-source behavior and validated structured-query integration. AI providers, authentication, databases, and HTTP remain outside the core. No AI feature is currently authorized.                                                            |

Grouping, workers, massive-row stretching, and other future capabilities require separately scoped specifications and decisions; the POC does not authorize them. Workers require profiling evidence under the accepted principles. No third-party runtime grid or virtualization library is permitted by the architecture direction.

## 4. Approval and continuity gates

- Recent user-reported memory-related BSODs remain an active safety constraint. This roadmap grants no workload permission; PR #3's explicit user authorization permits bounded local checks and existing hosted correctness CI only. New performance/native capture/memory/scaling workloads require separate approval. Dependency upgrades and system/hardware changes remain outside scope.
- PR #3 authorizes commits/pushes to its feature branch and PR creation only. Do not merge, reset, clean, discard existing changes, restore the deleted bridge or enable flushSync by default.
- Record important architectural trade-offs in the specifications and summarize their state in project status. Obtain approval before major architecture changes or expanding implementation scope.
- Follow: Read specs → Identify next approved task → Implement → Verify when authorized → Review → Update project status → Continue within approved scope. Unexecuted work remains explicitly unverified.

Next recommendation: review PR #3's correctness evidence and NO-GO/pending exit
recommendation, then approve an explicitly supervised hosted evidence stage and
the remaining browser/scaling decisions. There is no production implementation
task or heavy workload approved by this roadmap.

# Grid Core foundation update — 2026-10-24

PR #5 implements the explicitly authorized pure Core foundation and isolated
React inspection demo; see [Grid Core V1](../specs/features/GRID-CORE-V1.md).
Next milestones: independent architecture review, separately authorized browser
correctness/assistive-technology checks, production React navigation/focus,
then evidence-led scrolling/scheduling and logical-height segmentation design.
Sorting/filtering, selection/editing, variable heights and plugin infrastructure
remain future specified work. Performance HOLD; production POC NO-GO.
