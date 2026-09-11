# Work Documentation

This area holds approved requirements and execution plans for non-trivial work.
It is not the current product knowledge base; durable behavior must be moved to
the appropriate product, page, workflow, or technical document during
closeout.

## Lifecycle

```text
Discuss
  -> approve SPEC.md
  -> approve PLAN.md
  -> implement and approve each batch
  -> consolidate current-state documentation
  -> archive SPEC.md and normally delete PLAN.md
```

## Active work

Each feature uses:

```text
active/<feature>/
├── SPEC.md
└── PLAN.md
```

`SPEC.md` owns approved behavior, scope, constraints, and acceptance criteria.
`PLAN.md` owns batch order, dependencies, file ownership, validation, and
proposed commits.

Active work:

- [Calibration marker precision](active/calibration-marker-precision/SPEC.md)

Completed historical specifications:

- [Documentation system](archive/2026/documentation-system/SPEC.md)
- [Browser camera pairing](archive/2026/browser-camera-pairing/SPEC.md) —
  delivered browser integration; its required real-environment acceptance is
  retained in the [camera-pairing validation checklist](../technical/BROWSER-CAMERA-PAIRING-VALIDATION.md).
- [Court calibration](archive/2026/court-calibration/SPEC.md) — delivered UI
  integration; its external dependencies and required physical-camera
  validation are retained in the [dependency record](archive/2026/court-calibration/BACKEND-DEPENDENCIES.md)
  and [calibration validation checklist](../technical/CALIBRATION-VALIDATION.md).

## Approval rules

- Discussion happens before a non-trivial specification is written.
- Implementation waits until both the specification and plan are approved.
- Work stops for review after each batch.
- The approved batch is committed separately before the next batch starts.
- Parallel agents have disjoint file ownership within a batch.
- Pushing always requires explicit permission immediately before it happens.

## Closeout

Before work leaves `active/`:

1. Move durable current behavior into its canonical documents.
2. Record consequential technical rationale in an Architecture Decision
   Record.
3. Record material differences between approved and delivered behavior.
4. Verify links to primary source files and relevant behavioral tests.
5. Mark `SPEC.md` as implemented and move it to
   `archive/<year>/<feature>/SPEC.md`.
6. Delete `PLAN.md` unless its archival value is explicitly approved.
7. Remove the empty active-work directory.

Archived specifications are immutable historical context. They are read only
when a task requires historical intent and never override current-state
documentation.
