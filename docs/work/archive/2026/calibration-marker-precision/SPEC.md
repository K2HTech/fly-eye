# Calibration Marker Precision Specification

Status: Implemented — 2026-09-11

Related historical work: [court calibration specification](../../archive/2026/court-calibration/SPEC.md).

## Outcome

The calibration landmark editor makes every required court point an explicit
operator action. Operators can see the painted-line intersection while placing
a marker precisely, and Fly Eye never represents an unplaced point as captured
data.

## Operator behavior

1. After frame uploads complete, A–D begin **unplaced**. The frame has no
   fabricated/default marker coordinates.
2. The landmark list identifies every unplaced point and selects the first one
   for placement.
3. Clicking the frame assigns the selected marker at the exact raw-pixel
   coordinate, then selects the next unplaced required marker.
4. Placed markers use a small high-contrast reticle whose visual center is the
   submitted coordinate. The painted intersection remains visible beneath it.
5. The reticle preserves a sufficiently large keyboard/focus target without
   enlarging its visible precision indicator.
6. Numeric coordinates, keyboard nudging, and the line-intersection helper
   remain available after placement, including for off-frame points.
7. Solve remains unavailable until all four A–D points have explicit valid
   image coordinates.

## Constraints

- A–D court coordinates and their match-wide fixed orientation do not change.
- React continues to submit raw image coordinates only; it must not round or
  transform click coordinates.
- The change is UI-only and does not alter the calibration backend contract.
- Demo remains outside this real calibration workflow.

## Acceptance criteria

- Uploading frames never visibly places D or any other corner.
- Four explicit placements are required before solve is enabled.
- Clicking a known rendered position produces the equivalent raw-frame pixel
  coordinate within normal browser floating-point precision.
- The visible reticle does not conceal the line intersection it represents.
- Numeric adjustment, arrow-key nudging, off-frame coordinates, and
  line-intersection placement remain keyboard-accessible.

## Delivered behavior

The landmark editor now stores an image coordinate only after an explicit frame
click, numeric adjustment of an already placed point, or line-intersection
result. The visual crosshair is deliberately smaller than its keyboard/focus
target so the operator can see the painted intersection while retaining an
accessible control.
