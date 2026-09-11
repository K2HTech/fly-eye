# Calibration Precision Navigation Specification

Status: Draft — awaiting product-owner approval

Related historical work: [court calibration](../../archive/2026/court-calibration/SPEC.md) and [marker precision](../../archive/2026/calibration-marker-precision/SPEC.md).

## Outcome

An operator can inspect a court corner closely without changing the raw image
coordinate sent to calibration. Marker control remains deliberate: the operator
selects a named A–D landmark, places or moves only that landmark, and can pan
the captured frame while zoomed.

## Operator behavior

1. The fixed A–D court reference diagram and marker list identify the selected
   landmark. Image clicks never change that selection automatically.
2. A small dot marks a placed raw-pixel coordinate. The dot has no radius or
   uncertainty meaning in the calibration payload.
3. The list shows placed landmarks with a green status and unplaced landmarks
   as requiring placement.
4. The operator chooses 100%, 200%, 400%, or 800% image zoom. Zoom changes
   only the rendered view; marker and submitted coordinates remain raw pixels.
5. While zoomed, the operator can pan the image deliberately. Panning must not
   place or move a marker accidentally.
6. Clicking the image places/repositions the selected marker; dragging a
   placed marker refines that marker's raw coordinate.
7. Numeric entry, keyboard movement, and line-intersection recovery remain
   available. Off-frame positions remain valid.

## Constraints

- Backend calibration receives only exact raw image coordinates; no marker
  radius, zoom factor, or viewport offset is sent.
- Zoom/pan must preserve pointer-to-raw-coordinate accuracy.
- The shared A–D court orientation and current solve gate remain unchanged.
- The implementation remains browser and Tauri compatible and keyboard
  accessible.

## Acceptance criteria

- At every supported zoom level, clicking a known displayed image position
  produces the equivalent raw image coordinate.
- Panning cannot place or move a marker.
- Moving a marker changes only that selected marker.
- A visible dot does not obscure the relevant court-line intersection.
- Operators can return to 100% view and continue placement without losing
  landmarks.
