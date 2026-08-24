# Fly Eye Agent Instructions

## Project

Fly Eye is a React 19, TypeScript, Vite, and Tauri v2 cross-platform operator
interface for sports line-call review. This repository owns the UI. Camera
capture, calibration, tracking, inference, and the future remote backend are
external boundaries unless an approved specification changes that scope.

## Read Before Editing

1. Read [the documentation map](docs/README.md).
2. Read the product PRD when the task affects product-wide behavior.
3. Read the document for each route-level page affected by the task.
4. Read workflows linked by those page documents.
5. Read applicable architecture, quality requirements, and architecture
   decisions.
6. For planned work, read its approved `SPEC.md` and `PLAN.md` under
   `docs/work/active/` before editing.

Read only documents relevant to the task. Do not load `docs/work/archive/`
unless historical intent is needed.

## Working Rules

- Discuss non-trivial features with the product owner before implementation.
- Lock approved behavior in `SPEC.md`, then write a batch-based `PLAN.md`.
- Do not implement before both documents are approved.
- Work on one approved batch at a time and stop for review before committing.
- Do not start the next batch until the current batch is approved and
  committed.
- When agents work in parallel, assign one owner per file. Two agents must not
  edit the same file within a batch.
- Keep changes focused. Preserve unrelated and pre-existing worktree changes.
- Use Conventional Commits and keep each approved batch in a separate commit.
- Never push until the product owner gives explicit permission immediately
  before the push.

## Documentation Boundary

Code and tests are the source of truth for implementation mechanics.
Documentation records knowledge that cannot be recovered reliably from code:
product intent, business rules, user goals, constraints, cross-page workflows,
quality requirements, and consequential decision rationale.

Do not narrate JSX, component trees, props, CSS, function behavior, file lists,
or configuration that is easy to inspect. Link to the canonical document
instead of duplicating a rule. If business intent is uncertain, ask the product
owner or record an open question; do not infer a new rule from hard-coded demo
data.

When code changes documented behavior or a documented boundary, update the
canonical document in the same batch. Follow the active-work closeout process
in [docs/work/README.md](docs/work/README.md).

## Project Commands

Run commands from the repository root:

```bash
task setup        # Install locked npm dependencies and cargo-audit
task dev          # Start the browser development server
task desktop:run  # Start the native Tauri application
task check:quality
task check        # Full local quality and security validation
```

Use the smallest validation appropriate while developing, then run the exact
validation required by the approved batch. `task check` includes frontend,
Rust, build, test, formatting, lint, and dependency-audit checks and may require
platform packages and network access.

## Important Boundaries

- UI components must not access browser storage directly; use application
  service contracts and replaceable adapters.
- Never persist passwords, tokens, hashes, or other authentication secrets.
- Clearly distinguish simulated UI behavior from real hardware or backend
  integration.
- Preserve keyboard accessibility, semantic controls, focus behavior, and the
  tested cross-platform UI unless the approved specification changes them.
- Use hash-based application routes so navigation remains compatible with the
  browser and Tauri webview.
