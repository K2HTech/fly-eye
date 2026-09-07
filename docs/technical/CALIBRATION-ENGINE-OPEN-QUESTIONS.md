# Calibration Engine Alignment — Open Questions

Status: Unresolved; not approved for implementation

The engine repository documents calibration behavior that the rebuilt Fly Eye
calibration feature must reconcile before its specification is approved. These
questions preserve the findings from the engine review; they do not change
current product behavior.

## 1. Match-level court orientation anchor

The engine requires both camera calibrations in one match to use the same
physical assignment for court coordinate `(-3.05, -6.70)`. It explicitly
forbids camera-relative corner wording such as “near”, “far”, “left”, or
“right”, because a mirrored second camera can yield plausible but wrong court
positions.

Decide:

- How an operator selects the physical anchor at match creation.
- Where that match-level value is persisted until the backend match contract
  supports it.
- How a shared, read-only A–D court diagram identifies the same anchor for
  both camera calibration surfaces.

## 2. Landmark and seed-point interaction

The engine accepts finite seed points outside the captured frame and permits
known court-line intersections when an outer corner is not visible. The current
prototype interaction must therefore support off-frame placement and decide
whether substitute landmarks are included in the first release.

Decide:

- The initial landmark set beyond the preferred four outer doubles corners.
- The accessible interaction for moving a point outside the displayed image.
- Whether pan, zoom, and a magnifier are required before the first production
  calibration release.

## 3. Result review and operator safety

The engine returns the raw-pixel court outline, every painted-line wireframe,
per-line fit error, per-line resolution, and stability/convergence metadata.
It defines `poor` as a result that can misjudge its worst line, not merely a
reduced-accuracy warning.

Decide:

- Which diagnostics must block or warn before official monitoring.
- The operator wording and primary recovery action for `poor`, unstable, or
  non-converged results.
- Resolution warning thresholds while the engine configuration endpoint does
  not yet publish them.

## 4. Quality-policy contract consistency

The engine documents quality from the worst boundary-line error, while its
analysis gate is described as using mean reprojection error. A calibration can
therefore be `poor` while still reaching analysis. The engine identifies this
as a backend/engine contract decision.

Decide whether the analysis gate must use the same worst-line rule as the
operator quality badge before the calibration UI is released for real calls.

## 5. Submission and recovery semantics

The engine expects a correction to seed points to reuse the already-uploaded
frames. A missing upload should retry only the affected upload. Solving creates
the current immutable calibration immediately, including a `poor` result.

Decide:

- The frontend state model for retained uploads and point correction.
- The retry behavior after upload expiry and an unknown solve outcome.
- Whether a backend draft/confirmation concept is needed to prevent a `poor`
  result becoming current before the operator reviews it.

## Sources reviewed

- `fly-eye-engine/docs/integration/calibration-screen.md`
- `fly-eye-engine/docs/integration/frontend.md`
- `fly-eye-engine/docs/adr/0003-second-entry-point-for-calibration.md`
- `fly-eye-engine/docs/adr/0004-adopt-the-centre-origin-court-frame.md`

The backend API contract remains the final source of truth for endpoint shapes
and persistence. These engine documents identify requirements and contract
gaps that must be resolved with the backend owner.
