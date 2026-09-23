# Project Principles

**Status:** Accepted
**Version:** 1.0
**Purpose:** Foundational engineering and architectural contract for the DataGrid project.

---

## 1. Project Goal

Build a production-quality, extensible React DataGrid inspired by the capabilities and usability of mature enterprise grids, while maintaining a clean architecture, strong typing, accessibility, performance, and consumer customization.

The project should provide a reusable grid that can support:

* Client-side data.
* Server-side data.
* Large datasets and virtualization.
* Keyboard-first interaction.
* Accessible interaction and screen-reader semantics.
* Theming.
* Consumer-controlled presentation.
* Extensibility through well-defined extension points and plugins.
* Natural-language/AI query capabilities as an optional extension.

The grid itself must remain independent from application-specific concerns such as HTTP, databases, authentication, AI providers, or business logic.

---

## 2. Spec-Driven Development

This project follows **Spec-Driven Development (SDD)**.

The specification is the source of truth for intended behavior and architecture.

### Rules

1. A feature must be specified before implementation.
2. Architectural decisions must be documented before implementation when they affect project boundaries or shared abstractions.
3. Acceptance criteria must be defined for user-visible behavior.
4. Tests must reflect the acceptance criteria.
5. If implementation reveals a design problem, update the specification first.
6. Code must not silently introduce behavior that contradicts the specification.
7. The specification must be updated when intentional behavior or architecture changes.

The workflow is:

```text
Discussion
    ↓
Specification
    ↓
Architecture Decision
    ↓
Acceptance Criteria
    ↓
Tests
    ↓
Implementation
    ↓
Verification
    ↓
Specification Update (if required)
```

---

## 3. Engineering Principles

The project follows:

* **SOLID**
* **KISS**
* Separation of concerns.
* Explicit dependencies.
* Composition over unnecessary inheritance.
* Small, focused modules.
* Strongly typed public APIs.
* No premature abstraction.
* No premature optimization.

A local implementation must not bypass or undermine the global grid architecture simply because it is convenient for one feature.

---

## 4. DataGrid Responsibility

The DataGrid is intentionally **dumb** regarding application data and infrastructure.

The grid:

* Receives data from its consumer.
* Owns grid interaction and presentation state.
* Provides grid behavior.
* Does not perform HTTP requests itself.
* Does not access databases.
* Does not know about authentication.
* Does not depend on a specific backend.
* Does not depend on an AI provider.
* Does not contain application-specific business logic.

The consumer is responsible for providing data and application-level behavior.

The architecture must support both:

```text
Client-side
Consumer → rows → DataGrid
```

and:

```text
Server-side
Consumer/DataSource → request → server → response → DataGrid
```

---

## 5. Architecture

The project should separate:

```text
Grid Core
    ↓
Framework Integration
    ↓
React Rendering
```

The core domain/model/engine should not depend on React or the DOM.

React-specific behavior belongs in the React integration layer.

The architecture must preserve the ability to process pure data operations independently from rendering.

---

## 6. Technology Requirements

The project uses:

* Nx
* pnpm
* React 19
* TypeScript
* SCSS Modules
* Playwright
* Unit testing for pure logic
* CSS custom properties for theme/design tokens where appropriate

Nx is the workspace and task orchestration layer.

Tasks should be executed through the workspace package manager, for example:

```bash
pnpm nx test
pnpm nx build
pnpm nx affected
```

---

## 7. TypeScript Rules

TypeScript strict mode is mandatory.

### Requirements

* `strict: true`.
* `any` is prohibited.
* Prefer explicit types for public APIs.
* Prefer `unknown` when a value is genuinely unknown.
* Avoid unsafe type assertions.
* Generic APIs should preserve type information.
* Consumer-facing APIs must be strongly typed.
* Domain models must not rely on `any`.

Type safety is considered part of the architecture, not merely a compiler preference.

---

## 8. Styling Rules

The project uses **SCSS Modules** for component styling.

Preferred pattern:

```text
Component.tsx
Component.module.scss
```

Rules:

* Component styles should be locally scoped.
* Avoid global component styling.
* Avoid coupling the grid to a specific UI component library.
* Theme values should be represented through CSS custom properties/design tokens where appropriate.
* Styling architecture must support consumer theming without modifying grid source code.

---

## 9. Consumer Customization

The grid owns behavior and state; the consumer may own presentation.

Consumers must be able to customize important visual components without replacing grid functionality.

At minimum, the architecture must support overriding:

* Icons.
* Checkbox presentation.
* Row-selection checkbox.
* Header-selection checkbox.
* Cell renderers.
* Cell editors.
* Appropriate grid slots.
* Loading/empty states where applicable.

For example:

```tsx
<DataGrid
  icons={{
    sortAscending: CustomSortIcon,
    sortDescending: CustomSortIcon,
    filter: CustomFilterIcon,
  }}
  selection={{
    checkbox: CustomCheckbox,
    headerCheckbox: CustomHeaderCheckbox,
  }}
/>
```

Customization must not require the consumer to understand or reimplement internal grid behavior.

Custom components must preserve the grid's accessibility and interaction contracts.

The grid must not depend on a specific icon library or checkbox/UI library.

---

## 10. Accessibility

Accessibility is a first-class architectural requirement.

It must not be added as a final polishing phase.

The grid must support, where applicable:

* Semantic grid structure.
* Keyboard navigation.
* Header navigation.
* Arrow-key navigation.
* Focus management.
* Selection semantics.
* Editing semantics.
* Screen-reader semantics.
* Appropriate ARIA attributes.
* Accessible sorting state.
* Accessible filtering state.
* Accessible custom controls.
* Virtualized-row accessibility.
* Pinned-column accessibility.

Customizable components must not bypass the accessibility contract.

Accessibility behavior must be included in feature acceptance criteria and Playwright tests.

---

## 11. Keyboard Navigation

Keyboard navigation is part of the core grid architecture.

The logical grid position is independent from the physical DOM representation.

Navigation must work correctly with:

* Headers.
* Rows.
* Pinned columns.
* Virtualized rows.
* Selection.
* Editing.
* Grouped/tree data when implemented.

Logical navigation must follow logical column order rather than physical DOM order.

---

## 12. Performance

Performance is an architectural concern.

The project should support:

* Row virtualization.
* Column virtualization where required.
* Efficient scrolling.
* Large datasets.
* Pinned columns without duplicating logical grid state.
* Efficient event handling.

Performance optimizations must be evidence-driven.

### React 19

Do not automatically use:

* `useMemo`
* `useCallback`

Manual memoization should be introduced when:

* Identity stability is part of an API/contract.
* An external imperative system requires stable references.
* Profiling demonstrates a meaningful performance problem.
* There is another concrete architectural reason.

Prefer good component boundaries, data structures, algorithms, and DOM/event architecture before adding memoization.

### Web Workers

Web Workers may be introduced when profiling demonstrates that pure data processing is expensive enough to justify moving it away from the main thread.

The core architecture should allow processing to run either:

```text
Main thread
```

or:

```text
Web Worker
```

without changing the consumer-facing grid API unnecessarily.

---

## 13. Virtualization and Pinned Columns

Pinned columns must remain part of one logical grid.

The physical rendering architecture may contain:

```text
Pinned Left
     +
Center
     +
Pinned Right
```

but these are not independent logical grids.

All physical renderers share the same logical:

* Row identity.
* Column identity.
* Selection.
* Focus.
* Hover.
* Editing.
* Accessibility semantics.

A logical row must remain one row regardless of which physical renderer displays it.

---

## 14. State Architecture

State should be separated according to responsibility.

Examples:

```text
Selection       → grid state
Editing         → grid state
Sorting         → grid state
Filtering       → grid state
Grouping        → grid state
Column config   → grid state
Focus           → interaction/grid state
Hover           → DOM interaction state where appropriate
Theme           → CSS variables
Scroll          → specialized rendering state
```

High-frequency transient interactions should not cause unnecessary React re-renders.

---

## 15. Extensibility and Plugins

The architecture must support deliberate extension points.

Potential extensions include:

* AI query.
* Export.
* Clipboard.
* Advanced filtering.
* Specialized integrations.
* Additional renderers.
* Other application-specific capabilities.

Plugins must not unnecessarily increase the complexity of the core.

A plugin should be introduced when there is a meaningful architectural boundary, reuse requirement, or integration concern.

The plugin system must remain simple and explicit.

---

## 16. AI Query

AI functionality is **not part of the DataGrid core**.

AI should translate natural language into a validated structured query model.

Conceptually:

```text
Natural Language
       ↓
AI Provider
       ↓
Grid Query
       ↓
Validation
       ↓
Grid State / Consumer
       ↓
Client or Server Data Processing
```

The AI layer must not execute arbitrary code or directly manipulate grid internals.

AI must use the grid's structured query model rather than inventing its own independent filtering system.

The AI provider must be replaceable.

The grid must not depend on a specific AI provider.

---

## 17. Structured Query Model

Filtering, sorting, and future query capabilities should share common typed models.

The architecture should prefer a unified query abstraction where appropriate.

This allows the same query model to be used by:

* Normal filter UI.
* AI query.
* Saved views.
* URL state.
* Server-side data sources.
* Plugins.

There should be one authoritative representation of grid query state.

---

## 18. Dependencies

The project must not depend on a third-party runtime DataGrid implementation.

Third-party development/test tooling is allowed when appropriate, including:

* Playwright.
* TypeScript.
* ESLint.
* Vitest.
* Nx tooling.

The grid must not become coupled to a specific:

* UI library.
* Icon library.
* Checkbox library.
* AI provider.
* HTTP client.
* Backend technology.

---

## 19. Testing

Testing is required for every feature.

Testing should include:

### Unit tests

For:

* Pure data processing.
* State transitions.
* Query validation.
* Sorting/filtering algorithms.
* Utility functions.
* Core engine behavior.

### Playwright

For user-visible behavior, including:

* Mouse interactions.
* Keyboard navigation.
* Accessibility behavior.
* Virtualization.
* Selection.
* Editing.
* Filtering.
* Sorting.
* Pinned columns.
* Consumer customization.
* Edge cases.

Tests must cover more than the happy path.

Important edge cases must be explicitly tested.

---

## 20. Definition of Done

A feature is not considered complete until:

1. Its behavior is specified.
2. Its architectural impact is understood.
3. Acceptance criteria exist.
4. Appropriate unit tests exist.
5. Appropriate Playwright tests exist.
6. Accessibility behavior is verified.
7. Edge cases are covered.
8. TypeScript strict rules are satisfied.
9. No `any` is introduced.
10. SCSS Module conventions are followed.
11. Consumer customization is preserved where applicable.
12. Relevant Nx tasks pass.
13. The implementation does not violate existing architecture.
14. The specification is updated if behavior or architecture changed.

---

## 21. Architectural Change Rule

This document is a project contract.

If a future requirement conflicts with these principles:

1. Stop implementation.
2. Identify the conflict.
3. Discuss the architectural trade-off.
4. Update the specification.
5. Document the decision where appropriate.
6. Then implement the change.

The code must not silently redefine the architecture.

---

## 22. Guiding Principle

> Build the grid as a reusable platform, not as a collection of isolated features.

Every feature should strengthen the shared architecture rather than create a parallel implementation.
