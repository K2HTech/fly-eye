# Calibration Precision Navigation Plan

Status: Draft — awaiting product-owner approval

## Batch 1 — Deliberate marker controls

- Restore the fixed A–D reference diagram, preserve selected-marker control,
  use a dot indicator, and show green placed statuses.
- Validate selected-marker behavior and direct marker refinement.
- Commit: `fix(calibration): improve landmark marker controls`.

## Batch 2 — Zoom and pan

- Add fixed-level zoom and deliberate pan behavior to the captured-frame pane.
- Maintain exact raw-coordinate mapping for clicks and dragged markers.
- Validate coordinate mapping at zoom and pan offsets.
- Commit: `feat(calibration): add precision frame navigation`.

## Batch 3 — Closeout

- Update the calibration validation checklist, archive the specification, and
  remove this plan according to the work-document lifecycle.
- Commit: `docs(calibration): record precision navigation acceptance`.
