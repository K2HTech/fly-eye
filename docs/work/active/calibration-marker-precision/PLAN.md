# Calibration Marker Precision Plan

Status: Draft — awaiting product-owner approval

## Batch 1 — Explicit precise marker placement

- Replace default center-point seeds with an explicit unplaced/placed landmark
  state.
- Render small visual reticles with accessible focus targets; preserve raw
  coordinates and existing numeric, keyboard, and intersection recovery.
- Disable solving until all four required corners have been placed.
- Add focused landmark-state and interaction tests.
- Update the calibration validation checklist if the manual workflow changes.
- Validate: focused tests, typecheck, lint, formatting, and diff check.
- Commit: `fix(calibration): require precise landmark placement`.

## Batch 2 — Closeout

- Consolidate durable documentation, archive the implemented specification,
  and remove this plan according to the work-document lifecycle.
- Validate: relevant local checks.
- Commit: `docs(calibration): record marker precision acceptance`.
