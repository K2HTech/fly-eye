# Architecture Decision Records

Architecture Decision Records (ADRs) preserve the context and rationale for
technical choices that cannot be recovered reliably from the current code.
They complement the living architecture documentation: architecture describes
the current system, while ADRs explain why consequential choices were made.

## Decision threshold

Create an ADR when a choice is consequential because it is cross-cutting,
costly to reverse, risky, or has meaningful alternatives. Routine
implementation details, easily reversible choices, and behavior already owned
by a product, page, workflow, or quality document do not require an ADR.

An ADR records one decision. It must distinguish established evidence from
unknown rationale and must not reconstruct intent from implementation alone.

## Statuses

- `Proposed`: under review and not yet an accepted project constraint.
- `Accepted`: approved and currently governs the system.
- `Superseded`: replaced by a newer accepted ADR, which the status links to.
- `Rejected`: considered but not adopted; retained to preserve the outcome.

## Immutability and supersession

Once an ADR is accepted or rejected, its decision, context, and rationale are
historical records and are not rewritten to reflect later understanding. A
materially different decision requires a new ADR. When the new ADR is accepted,
the old record is marked `Superseded by ADR-NNN`, and both records link to each
other. Status and supersession-link metadata may be updated without rewriting
the historical decision.

## Records

| ADR                                                                | Status   | Decision                                                                                         |
| ------------------------------------------------------------------ | -------- | ------------------------------------------------------------------------------------------------ |
| [0001](0001-use-react-and-tauri-for-the-cross-platform-ui.md)      | Accepted | Use a React and TypeScript frontend built by Vite and hosted by Tauri v2                         |
| [0002](0002-separate-ui-from-storage-with-application-services.md) | Accepted | Put application service contracts and replaceable adapters between UI components and persistence |
