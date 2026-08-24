# Fly Eye Documentation System Specification

Status: Implemented

Completed: 2026-08-24

## Delivery record

The documentation system was delivered in reviewable batches through these
commits:

- `756a872` — establish documentation entry points
- `6aa3d53` — reorganize development and design references
- `6ed8493` — document product entry and demo behavior
- `e256fe8` — document match preparation
- `08e3f61` — document the line-call workflow
- `8d40cb9` — record technical boundaries, quality requirements, and decisions

Two product clarifications discovered during backfill were recorded as current
rules and implementation gaps: match length and point target are independent,
and line-call verdicts are limited to IN and OUT. The structure and lifecycle
defined by this specification were otherwise delivered without material
deviation.

## 1. Purpose

Fly Eye needs a small, durable documentation system that lets a developer or
coding agent recover the product context without reconstructing business intent
from source code, mockups, commits, or old conversations.

The system must complement the repository rather than describe the codebase in
prose. Code remains the source of truth for implementation mechanics;
documentation preserves product intent, business rules, constraints, and
decision rationale that code cannot communicate reliably.

## 2. Goals

- Give humans and agents a predictable entry point into project knowledge.
- Preserve current product behavior and the reasons behind important choices.
- Make route-level business behavior traceable to its primary React component.
- Separate page-specific rules from workflows that span multiple pages.
- Formalize the discuss, specify, plan, implement, review, and closeout process.
- Keep documentation small enough to remain accurate and useful.
- Backfill the non-obvious business context of the application that already
  exists.

## 3. Non-goals

The documentation system will not:

- Restate JSX structure, TypeScript types, CSS values, function behavior, or
  directory contents that are easy to discover in the repository.
- Document every React component; only route-level product surfaces receive
  page documents.
- Treat mockups as proof of implemented behavior.
- Introduce a roadmap, glossary, or other empty process artifact before a real
  need exists.
- Replace tests, source code, issue tracking, pull requests, or Git history.
- Describe future behavior as though it is already implemented.

## 4. Sources of Truth

Each kind of knowledge has exactly one canonical owner.

| Knowledge                                              | Canonical source            |
| ------------------------------------------------------ | --------------------------- |
| Implementation mechanics and current data shapes       | Source code and tests       |
| Product purpose, users, scope, and product-wide rules  | `docs/product/PRD.md`       |
| Business behavior owned by one route-level surface     | `docs/pages/`               |
| Journeys and rules spanning multiple surfaces          | `docs/workflows/`           |
| Current technical boundaries and system qualities      | `docs/technical/`           |
| Rationale for significant technical decisions          | `docs/technical/decisions/` |
| Approved requirements for work in progress             | Active `SPEC.md`            |
| Batch order, ownership, and validation for active work | Active `PLAN.md`            |
| Developer and repository operating rules               | `docs/development/`         |

Documents must link to a canonical rule instead of copying it. Archived work is
historical evidence and is never the source of truth for current behavior.

## 5. Repository Structure

```text
README.md
AGENTS.md

docs/
├── README.md
├── product/
│   └── PRD.md
├── pages/
│   └── <RouteComponent>.md
├── workflows/
│   └── <WorkflowName>.md
├── technical/
│   ├── ARCHITECTURE.md
│   ├── QUALITY-REQUIREMENTS.md
│   └── decisions/
│       ├── README.md
│       └── <number>-<decision>.md
├── development/
├── design/
│   └── mockups/
└── work/
    ├── README.md
    ├── active/
    │   └── <feature>/
    │       ├── SPEC.md
    │       └── PLAN.md
    └── archive/
        └── <year>/
            └── <feature>/
                └── SPEC.md
```

`ROADMAP.md`, `GLOSSARY.md`, `CONTEXT.md`, and `TRD.md` are intentionally
omitted. They may be introduced later only when they have a distinct owner and
purpose that is not already served by another document.

## 6. Document Responsibilities

### 6.1 Repository entry points

The root `README.md` introduces the product, provides basic setup, and links to
`docs/README.md`. It remains concise.

The root `AGENTS.md` is the mandatory operational entry point for coding
agents. It contains commands, validation expectations, edit boundaries, and
the documentation workflow. It links to canonical documents instead of
duplicating their content.

`docs/README.md` is the documentation map. It explains the ownership model,
provides a short reading order, links active work, and helps readers select only
the documents relevant to their task.

### 6.2 Product requirements

`docs/product/PRD.md` contains stable product-level knowledge:

- Product problem and value proposition
- Target users and their goals
- Product scope and boundaries
- Major capabilities
- Product-wide business rules
- Success criteria and known product limitations

It does not accumulate detailed requirements for every feature or page.

### 6.3 Page documents

A page document is created only for a route-level React product surface. Its
filename matches the primary component, such as:

```text
src/features/matches/MatchDashboardPage.tsx
docs/pages/MatchDashboardPage.md
```

Each page document records only non-obvious product knowledge:

- Purpose and user goal
- Allowed actors and entry conditions
- Business rules and invariants
- Meaningful states, including empty and failure states
- User actions and their business consequences
- Navigation expectations
- Related workflows and unresolved product questions
- Route, primary source file, and relevant behavioral tests for traceability

It does not describe component trees, props, styling, event-handler mechanics,
or other implementation details. If a page is split into multiple components,
the business document remains stable and its source links are updated.

### 6.4 Workflow documents

Workflow documents own behavior spanning more than one page, including entry
conditions, ordered stages, state transitions, restrictions, exit conditions,
and recovery behavior. Page documents link to workflows rather than repeating
their rules.

### 6.5 Technical documents

`ARCHITECTURE.md` explains only high-level boundaries and non-obvious system
behavior needed to make safe changes. It does not reproduce the repository
tree.

`QUALITY-REQUIREMENTS.md` owns measurable, system-wide constraints such as
security, accessibility, supported platforms, resilience, and performance.

Architecture Decision Records are created only for consequential choices that
are cross-cutting, costly to reverse, risky, or have meaningful alternatives.
Accepted records are preserved. A later decision supersedes an old record
rather than rewriting it.

### 6.6 Development documents

Development documents preserve team agreements and non-obvious operational
knowledge, including setup prerequisites, validation expectations, branching,
commits, CI, dependency handling, and releases. Commands already defined by
automation should be linked or summarized, not copied into multiple files.

## 7. Agent Reading Contract

`AGENTS.md` must instruct an agent to follow this order before changing code:

1. Read `docs/README.md`.
2. Read the PRD only when product-wide context is relevant.
3. Read the document for every route-level page affected by the task.
4. Read any workflow linked by those page documents.
5. Read applicable technical requirements and architecture decisions.
6. If the task is active planned work, read its approved `SPEC.md` and
   `PLAN.md` before editing.

The agent must not load the whole archive by default. Archived specifications
are consulted only when historical intent or a prior decision is relevant.

## 8. Feature Documentation Workflow

Every non-trivial feature follows this sequence:

1. The product owner and orchestrator discuss the problem, behavior, scope,
   constraints, and open questions.
2. The orchestrator writes `docs/work/active/<feature>/SPEC.md`.
3. Implementation does not begin until the product owner approves the spec.
4. The orchestrator writes `PLAN.md` with small, independently reviewable
   batches, their dependencies, validation, and proposed commits.
5. Implementation does not begin until the product owner approves the plan.
6. Only one batch runs at a time unless the plan explicitly identifies
   independent parallel work.
7. Within a batch, two agents must not edit the same file. The plan records
   file ownership when parallel work is used.
8. Each batch is reviewed and approved before it is committed and before the
   next batch begins.
9. The orchestrator asks for explicit permission immediately before pushing.

Defect fixes discovered while building a feature remain part of that feature
when they are necessary to satisfy its approved acceptance criteria. Unrelated
fixes require separate scope and commits.

## 9. Closeout and Archival

The final batch of a feature must include documentation closeout:

- Move every durable current-state rule into its owning PRD, page, workflow,
  quality, or architecture document.
- Record consequential rationale in an ADR.
- Verify links to primary source files and relevant tests.
- Record material differences between the approved specification and the
  delivered behavior.
- Mark the specification as implemented and move it to
  `docs/work/archive/<year>/<feature>/SPEC.md`.
- Delete the completed `PLAN.md` unless it contains exceptional historical
  value explicitly approved for archival.
- Remove the empty active-work directory.

Archived specifications are immutable historical context. Corrections to
current behavior belong in current-state documents or a new feature spec.

## 10. Existing-Application Backfill

The initial documentation migration will recover only business knowledge that
is non-obvious from the current implementation. The code and behavioral tests
will be inspected for evidence, while prior approved decisions and product-owner
confirmation determine intent.

The first backfill covers these existing route-level surfaces:

- `WelcomePage`
- `SignInPage`
- `RegisterPage`
- `MatchDashboardPage`
- `CreateMatchPage`
- `HardwareReadinessPage`
- `LiveMonitor`
- `ClipReview`
- `DecisionScreen`

It also covers these cross-page workflows:

- Authentication and session access
- Registration and sign-in
- Time-limited isolated demo trial
- Match creation and hardware readiness
- Live monitoring, clip review, and decision

Known examples of business knowledge requiring preservation include the demo
access boundary, the point at which the 15-minute trial starts, allowed match
status progression, supported scoring formats, simulated-versus-real system
boundaries, and future backend integration expectations.

Visual copy, exact layouts, hard-coded simulated values, storage keys, type
definitions, and component mechanics will not be transcribed merely because
they exist in the code.

## 11. Evidence and Uncertainty Rules

- Current implementation and passing behavioral tests establish what the
  application does, but not automatically why it should do it.
- Approved product decisions establish intended business behavior.
- Mockups provide visual intent only and cannot override implemented or
  explicitly approved behavior without a new decision.
- A previous spec may provide historical intent but cannot override newer
  approved behavior.
- If intent cannot be established confidently, the document records an open
  question for the product owner instead of inventing a rule.
- Future behavior is labeled as planned or deferred and is never presented as
  current functionality.

## 12. Documentation Definition of Done

A code change is not complete when it changes documented business behavior,
quality requirements, architecture boundaries, or a significant decision
without updating the canonical document in the same batch.

A documentation change is complete only when:

- It adds knowledge not trivially recoverable from code.
- Its facts have an identified source or explicit product-owner approval.
- It does not duplicate a canonical rule owned elsewhere.
- Its links resolve and its mapped source files exist.
- Current and historical information are clearly distinguished.
- Formatting and repository quality checks pass.

## 13. Acceptance Criteria

The documentation system is successfully established when:

- A new human can start at `README.md` and find current product, workflow,
  technical, and development knowledge.
- A coding agent is automatically directed by `AGENTS.md` to the smallest
  relevant set of canonical documents.
- Every implemented route-level surface has a concise business document or an
  explicit justification for not needing one.
- Cross-page rules have one workflow owner and are not duplicated across page
  documents.
- Active work has an approved specification and batch plan.
- Completed work no longer appears active, while approved historical intent
  remains discoverable.
- Existing development documentation is reorganized without losing current
  team agreements.
- No generated structure, JSX walkthrough, CSS description, or other readily
  discoverable code detail is maintained as prose.

## 14. Locked Decisions

- Documentation is stored as Markdown in the repository and reviewed with
  code.
- `AGENTS.md` is the agent bootstrap; `docs/README.md` is the canonical map.
- Product/page/workflow documents capture non-obvious business knowledge, not
  implementation narration.
- Page document filenames match their route-level React surface for
  traceability.
- Cross-page behavior belongs to workflows.
- `PRD.md`, `ARCHITECTURE.md`, and `QUALITY-REQUIREMENTS.md` have distinct
  responsibilities; no generic `TRD.md` is introduced.
- Completed plans are normally deleted; approved specifications are archived
  after current-state documentation is consolidated.
- Roadmap, glossary, and context-summary documents are added only when a
  distinct need appears.

## 15. Open Questions

No blocking structural questions remain. Product ambiguities discovered while
backfilling current behavior will be collected for explicit review rather than
resolved by assumption.
