# Fly Eye Documentation

This directory preserves product intent, business rules, constraints, and
decision rationale that cannot be recovered reliably from the codebase. Source
code and tests remain the authority for implementation mechanics.

## Reading order

Choose the smallest relevant path:

1. Read the product requirements for product-wide context.
2. Read the document for each route-level page affected by the task.
3. Follow links from those pages to any cross-page workflow.
4. Read technical requirements or decisions only when the task crosses those
   boundaries.
5. For active planned work, read its approved specification and plan before
   editing.

Coding agents must also follow the repository-level [agent
instructions](../AGENTS.md).

## Documentation map

| Area        | Responsibility                                                       | Current location                       |
| ----------- | -------------------------------------------------------------------- | -------------------------------------- |
| Product     | Product purpose, users, boundaries, and product-wide rules           | [Product requirements](product/PRD.md) |
| Pages       | Non-obvious business behavior owned by route-level surfaces          | [`pages/`](pages/)                     |
| Workflows   | Journeys and rules spanning multiple pages                           | [`workflows/`](workflows/)             |
| Technical   | System boundaries, quality requirements, and significant decisions   | Planned in `technical/`                |
| Development | Setup and team operating agreements                                  | [`development/`](development/)         |
| Design      | Approved mockups used as visual references                           | [`design/mockups/`](design/mockups/)   |
| Work        | Approved active specifications, plans, and historical specifications | [Work documentation](work/README.md)   |

Planned locations are deliberately not linked until their canonical documents
exist. The current backfill is tracked under [documentation-system
work](work/active/documentation-system/).

## Current product documents

- [Product requirements](product/PRD.md)
- Entry pages: [welcome](pages/WelcomePage.md),
  [sign-in](pages/SignInPage.md), and [registration](pages/RegisterPage.md)
- Entry workflows: [authentication and
  sessions](workflows/AuthenticationWorkflow.md) and [isolated demo
  trial](workflows/DemoTrialWorkflow.md)
- Match preparation pages: [dashboard](pages/MatchDashboardPage.md), [create
  match](pages/CreateMatchPage.md), and [hardware
  readiness](pages/HardwareReadinessPage.md)
- [Match-preparation workflow](workflows/MatchPreparationWorkflow.md)

## Ownership rules

- A rule has one canonical owner. Other documents link to it.
- Page documents describe business behavior, not React implementation.
- Cross-page rules belong to workflows rather than being repeated in pages.
- Architecture explains non-obvious boundaries and rationale, not the
  repository tree.
- Archived specifications explain historical intent and are not current-state
  documentation.
- Uncertain intent is recorded as an open question for product-owner review.
- Documentation changes in the same batch as the behavior or boundary it
  describes.

## Development documents

- [Developer guide](development/SETUP.md)
- [Branching strategy](development/BRANCHING.md)
- [Commit convention](development/COMMIT-CONVENTION.md)
- [Dependency management](development/DEPENDENCIES.md)
- [Continuous integration and delivery](development/CI-CD.md)

These documents preserve team agreements and non-obvious operational knowledge.
