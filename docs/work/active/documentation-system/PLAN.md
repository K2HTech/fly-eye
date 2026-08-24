# Fly Eye Documentation System Implementation Plan

Status: Approved

Related specification: [SPEC.md](SPEC.md)

## Working Agreement

- Work proceeds one approved batch at a time.
- Every batch is independently reviewable and receives its own Conventional
  Commit after approval.
- The next batch does not begin until the current batch is approved and
  committed.
- Nothing is pushed without explicit permission immediately before the push.
- Documentation records non-obvious intent, business rules, constraints, and
  rationale; it does not narrate code that can be inspected directly.
- When parallel agents are used, each file has one owner for that batch. The
  orchestrator reviews and integrates all work.
- The current implementation and behavioral tests provide evidence of existing
  behavior. Ambiguous intent is returned to the product owner as a question.
- The personal `docs/react-for-vue-developers.md` guide is outside this system
  and must remain excluded from Git.

## Completed Specification Batch

The approved documentation-system specification was committed separately as:

```text
docs: define documentation system
```

## Batch 1: Agent and Documentation Foundation

### Scope

- Add root `AGENTS.md` with the mandatory reading order, validation commands,
  edit boundaries, documentation workflow, agent file-ownership rule, batch
  approval rule, commit rule, and push-approval rule.
- Add `docs/README.md` as the canonical documentation map.
- Add `docs/work/README.md` defining active-work and archive semantics.
- Link the documentation map from the root `README.md`.
- Keep links for document categories that do not exist yet clearly marked as
  planned rather than broken.

### File ownership

- Orchestrator: `AGENTS.md`, `README.md`, `docs/README.md`,
  `docs/work/README.md`

These entry-point files are tightly coupled and will not be delegated.

### Review focus

- Can a new agent discover the correct documents automatically?
- Is information linked instead of duplicated?
- Are our approval, commit, and push rules unambiguous?

### Validation

- Verify every new relative link.
- Run Prettier and `git diff --check`.
- Run `task check:quality` because root project documentation changes.

### Proposed commit

```text
docs: establish documentation entry points
```

## Batch 2: Development and Design Reorganization

### Scope

- Create `docs/development/` and move the existing maintained development
  documents into it.
- Create `docs/design/mockups/` and move maintained mockup references into it.
- Update repository links affected by the moves.
- Remove obsolete placeholders and duplicate development documentation only
  when the same information has a clear canonical owner.
- Do not move, rewrite, or commit the personal React learning guide.

### Planned mapping

| Current file                    | Destination                             |
| ------------------------------- | --------------------------------------- |
| `docs/development.md`           | `docs/development/SETUP.md`             |
| `docs/commit-convention.md`     | `docs/development/COMMIT-CONVENTION.md` |
| `docs/branching-strategy.md`    | `docs/development/BRANCHING.md`         |
| `docs/dependency-management.md` | `docs/development/DEPENDENCIES.md`      |
| `docs/ci-cd.md`                 | `docs/development/CI-CD.md`             |
| `docs/mockups/`                 | `docs/design/mockups/`                  |

### File ownership

- Documentation migration agent: development documents and mockups
- Orchestrator: `README.md`, `docs/README.md`, link reconciliation

The owners work on disjoint files. The orchestrator performs the final link
audit after the migration agent finishes.

### Review focus

- Did any operating agreement or mockup disappear?
- Are names and navigation clearer than the current flat folder?
- Was readily discoverable configuration avoided rather than duplicated?

### Validation

- Search for references to every old path.
- Verify every changed relative link.
- Run Prettier, `git diff --check`, and `task check:quality`.

### Proposed commit

```text
docs: reorganize development and design references
```

## Batch 3: Product Baseline and Entry Experience

### Scope

- Add `docs/product/PRD.md` with the current product problem, operator,
  product boundary, major capabilities, product-wide rules, current
  limitations, and deferred integrations.
- Add concise page documents for `WelcomePage`, `SignInPage`, and
  `RegisterPage`.
- Add workflow documents for registration/sign-in and the isolated demo trial.
- Preserve the business distinction between local simulated authentication and
  future production authentication.
- Preserve that demo setup is untimed, the trial begins only after **Start
  monitoring**, the duration is at most 15 minutes, and the session is limited
  to its assigned match.
- Raise any conflict between old specifications, current copy, and approved
  product intent for review rather than resolving it silently.

### File ownership

- Product agent: `docs/product/PRD.md`
- Entry-pages agent: `docs/pages/WelcomePage.md`,
  `docs/pages/SignInPage.md`, `docs/pages/RegisterPage.md`
- Workflow agent: authentication and demo workflow documents
- Orchestrator: cross-document ownership and duplication review

No two agents edit the same file.

### Review focus

- Does the PRD describe Fly Eye without becoming a feature backlog?
- Are authentication and demo restrictions truthful and unambiguous?
- Do page documents contain business meaning rather than UI narration?

### Validation

- Verify routes, primary source links, and behavioral-test links.
- Compare documented rules with access guards and demo integration tests.
- Run Prettier, `git diff --check`, and `task check:quality`.

### Proposed commit

```text
docs(product): document entry and demo behavior
```

## Batch 4: Match Preparation Knowledge

### Scope

- Add page documents for `MatchDashboardPage`, `CreateMatchPage`, and
  `HardwareReadinessPage`.
- Add the match-preparation workflow from dashboard through monitoring entry.
- Preserve non-obvious rules for match ownership, status progression,
  standalone-match scope, singles/doubles participants, supported 3x21 and
  3x15 formats, readiness gating, and simulated hardware.
- Link rules to one canonical workflow instead of copying them across pages.

### File ownership

- Match-pages agent: dashboard and create-match page documents
- Readiness agent: hardware-readiness page document
- Workflow agent: match-preparation workflow document
- Orchestrator: rule ownership and consistency review

No two agents edit the same file.

### Review focus

- Can an operator's preparation journey be understood without reading JSX?
- Are current rules distinguished from deferred tournament and hardware work?
- Are state-transition rules owned once?

### Validation

- Verify routes, primary source links, and behavioral-test links.
- Compare rules with match-transition, creation, navigation, and readiness
  tests.
- Run Prettier, `git diff --check`, and `task check:quality`.

### Proposed commit

```text
docs(product): document match preparation
```

## Batch 5: Line-Call Review Knowledge

### Scope

- Add page documents for `LiveMonitor`, `ClipReview`, and `DecisionScreen`.
- Add the line-call workflow spanning live monitoring, rally review, landing
  selection, evidence, decision, and return paths.
- Clearly label simulated camera views, rolling-buffer data, reconstructed
  evidence, result values, and external actions as current UI behavior rather
  than real processing.
- Record product meaning only where it has been explicitly approved; treat
  unexplained hard-coded values as implementation fixtures, not business rules.

### File ownership

- Live agent: `docs/pages/LiveMonitor.md`
- Review agent: `docs/pages/ClipReview.md`
- Decision agent: `docs/pages/DecisionScreen.md`
- Orchestrator: line-call workflow and cross-page consistency

No two agents edit the same file.

### Review focus

- Is the operator's decision journey clear?
- Are real product goals separated from simulated UI fixtures?
- Have we avoided inventing processing behavior not yet designed?

### Validation

- Verify source and test links.
- Compare documented actions and transitions with workflow integration tests.
- Run Prettier, `git diff --check`, and `task check:quality`.

### Proposed commit

```text
docs(product): document line-call workflow
```

## Batch 6: Technical Boundaries and Decisions

### Scope

- Add a lean `docs/technical/ARCHITECTURE.md` covering only non-obvious system
  boundaries, runtime responsibilities, persistence boundary, and future
  integration seams.
- Add `docs/technical/QUALITY-REQUIREMENTS.md` for approved system-wide
  security, accessibility, cross-platform, resilience, and performance
  constraints. Unknown targets remain open questions, not fabricated numbers.
- Add `docs/technical/decisions/README.md` explaining when an ADR is required
  and how supersession works.
- Record only architectural decisions whose rationale is established from
  approved project history, initially React with Tauri for the cross-platform
  UI and replaceable local adapters for future backend integration.

### File ownership

- Architecture agent: `ARCHITECTURE.md`
- Quality agent: `QUALITY-REQUIREMENTS.md`
- Decision agent: ADR index and approved initial ADRs
- Orchestrator: evidence, scope, and terminology review

No two agents edit the same file.

### Review focus

- Does technical documentation explain boundaries and reasons rather than the
  repository tree?
- Is each quality requirement measurable or explicitly unresolved?
- Are ADRs limited to consequential, evidenced decisions?

### Validation

- Verify every source, configuration, and related-document link.
- Compare stated boundaries with service contracts, local adapters, and the
  Tauri host.
- Run Prettier, `git diff --check`, and `task check:quality`.

### Proposed commit

```text
docs(architecture): record system boundaries and decisions
```

## Batch 7: Reconciliation and Closeout

### Scope

- Audit the entire documentation map for broken links, duplicate ownership,
  stale prototype language, unsupported claims, and missing current pages.
- Confirm that `AGENTS.md` points to the final canonical reading paths.
- Confirm that root `README.md` remains concise and accurate.
- Record any remaining product ambiguities as explicit open questions in their
  owning current-state documents.
- Mark the documentation-system specification as implemented and move it to
  `docs/work/archive/<year>/documentation-system/SPEC.md`.
- Delete this completed `PLAN.md` and remove the empty active-work directory.

### File ownership

- Audit agents may inspect separate document categories in parallel but do not
  edit them.
- The orchestrator owns every closeout edit to avoid cross-category conflicts.

### Review focus

- Can a new human or agent recover the product context from the final tree?
- Is every statement either durable non-obvious knowledge or a useful
  operational rule?
- Is active work empty and historical intent discoverable?

### Validation

- Run a repository-wide relative-link and source-link audit.
- Search for obsolete documentation paths and duplicate canonical rules.
- Run Prettier, `git diff --check`, and the full `task check` suite.

### Proposed commit

```text
docs: complete documentation system backfill
```

## Completion Gate

The documentation-system work is complete only when every acceptance criterion
in the approved specification is satisfied, Batch 7 is approved and committed,
and no required work remains under `docs/work/active/documentation-system/`.
