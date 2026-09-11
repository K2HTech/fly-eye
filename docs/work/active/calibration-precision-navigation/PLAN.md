# Calibration Precision Navigation Plan

Status: Approved — Batch 2 complete; Batch 3 pending

## Batch 1 — Deliberate marker controls

- Restore the fixed A–D reference diagram, preserve selected-marker control,
  use a dot indicator, and show green placed statuses.
- Validate selected-marker behavior and direct marker refinement.
- Commit: `fix(calibration): improve landmark marker controls`.

## Batch 2 — Zoom and pan ✓

- Add mouse-wheel continuous zoom and deliberate mouse-drag pan behavior to
  the captured-frame pane, containing wheel input within that pane.
- Redesign the editor around a full-width captured-frame pane, with landmark
  controls above and the fixed court reference below.
- Maintain exact raw-coordinate mapping for clicks and dragged markers.
- Validate coordinate mapping at zoom and pan offsets.
- Commit: `feat(calibration): add precision frame navigation`.

## Batch 3 — Closeout

- Update the calibration validation checklist, archive the specification, and
  remove this plan according to the work-document lifecycle.
- Commit: `docs(calibration): record precision navigation acceptance`.
