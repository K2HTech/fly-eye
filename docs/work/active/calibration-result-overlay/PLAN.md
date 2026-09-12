# Calibration Result Overlay Plan

Status: Approved — Batch 1 complete; closeout pending

## Batch 1 — Align solved court geometry ✓

- Establish one aspect-ratio-locked review frame for the seed image and its
  SVG overlay.
- Clip backend geometry to that frame and render returned wireframe paths as
  yellow, transparent line highlights without a separate court background.
- Add focused coverage for the review-frame coordinate contract.
- Update the calibration validation checklist with the visual acceptance rule.
- Commit: `fix(calibration): align solved court overlay`.

## Batch 2 — Closeout

- Archive the specification and remove this plan according to the
  work-document lifecycle.
- Commit: `docs(calibration): record result overlay acceptance`.
