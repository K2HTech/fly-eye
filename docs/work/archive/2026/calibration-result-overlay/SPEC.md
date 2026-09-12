# Calibration Result Overlay Specification

Status: Implemented — 2026-09-12

## Outcome

After a successful calibration solve, the operator sees the backend-detected
court geometry directly on the captured seed image used for calibration. The
review makes completed line detection obvious without presenting a separate
court, background, or coordinate-space view.

## Operator behavior

1. The review image is the exact captured seed frame used for landmark
   placement and solving.
2. Every backend-returned wireframe path appears only over that image, clipped
   to its visible bounds.
3. Detected court lines are rendered as semi-transparent yellow strokes so they
   visually highlight the corresponding painted white court lines.
4. The overlay has no fill, black background, or standalone court area.
5. Resizing the review pane preserves raw-pixel alignment between the image and
   every detected line.
6. Quality, diagnostics, blocking behavior, and marker redo behavior remain
   unchanged.

## Constraints

- The frontend displays returned raw-pixel coordinates as-is. It must not
  transform, clamp, reinterpret, or mutate the backend geometry.
- The image and SVG share one fixed frame aspect ratio and coordinate space.
- Overlay graphics remain non-interactive and do not obscure review controls.
- The feature applies only to normal backend calibration review; demo remains
  simulated.

## MVP limitation and deferred optimization

The current backend returns line centerline geometry only, not detected paint
areas, image-pixel line widths, or per-point widths. The MVP therefore renders
every detected line as a fixed 3 px non-scaling yellow highlight. It is a
completion aid, not a measurement of the painted-line thickness. A later
engine/backend enhancement should return raw-image line masks or polygon bands
per line so the frontend can tint the actual detected paint area under camera
perspective.

## Acceptance criteria

- No part of the yellow overlay can appear outside the seed image boundary.
- Each returned wireframe line stays aligned when the page or review pane
  changes width.
- The captured image remains visible beneath every highlighted line.
- The safety result and recovery actions retain their existing behavior.
