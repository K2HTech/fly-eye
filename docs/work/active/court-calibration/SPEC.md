# Court Calibration Specification

Status: Draft — awaiting product-owner approval

## Outcome

A normal operator calibrates each paired camera from hardware readiness using
real captured frames and the backend calibration API. The screen guides a
60-second per-camera workflow: capture, upload, identify court landmarks,
solve, inspect the returned wireframe and diagnostics, then recalibrate when
unsafe. Official monitoring remains blocked until both cameras have an eligible
calibration and the rig can resolve every boundary line.

Demo remains visibly simulated and does not call calibration endpoints.

## Operator flow

1. Match creation displays a venue-based End A label supplied by the match
   service. The label is read-only during calibration. Both cameras see the
   same A–D court diagram and landmark coordinates.
2. For one camera, the operator captures three static JPEG frames (up to five)
   from its current live preview. The screen checks the count before uploads.
3. It asks the backend for upload URLs, computes a SHA-256 checksum over the
   exact bytes, and uploads each frame with every returned header. A failed or
   expired upload retries only that frame.
4. On one captured frame, the operator places four A–D doubles-court markers.
   The screen permits outside-frame coordinates, keyboard/numeric adjustment,
   and the defined line-intersection helper. Six documented substitute
   landmarks are available only when a corner is unusable.
5. React submits raw-frame coordinates, asset IDs, and original frame size.
   It does not transform returned wireframe pixels.
6. Review overlays every returned court line on the captured frame, displays
   quality and relevant diagnostics, and provides Redo. Seed correction reuses
   uploads; recapture is requested only when recovery requires new frames.
7. Poor quality, camera movement, non-convergence, or fewer than two usable
   frames block that camera. After both cameras finish, the rig blocks official
   monitoring only if no camera can resolve a boundary line.

## Boundaries and constraints

- Calibration HTTP, frame storage, solving, quality calculation, and analysis
  enforcement remain external backend/engine responsibilities.
- Components use application service contracts; no route component reads or
  writes browser storage or calls HTTP directly.
- The reference diagram uses fixed A–D labels, never camera-relative corner
  language. Backend line keys such as `BASELINE_NEAR` are displayed against
  that diagram rather than reinterpreted per camera.
- A solved result is already current and immutable. React never promises Save,
  Discard, Undo, or a draft state that the backend does not support.
- Raw engine exceptions, frame bytes, signed URLs, and request credentials are
  never exposed as operator messages or persisted by the UI.

## Acceptance criteria

- One camera can reach review in 60 seconds under the normal three-frame,
  four-corner path.
- The same End A label and A–D diagram appear for both cameras.
- The screen preserves frames and markers after a seed/solve error and retries
  only the affected upload.
- Every wireframe line is rendered in raw pixel coordinates over its selected
  captured frame.
- Unsafe camera results clearly block official use with their applicable
  recovery action; acceptable quality and resolution warnings remain distinct.
- Focus, keyboard marker adjustment, semantic status updates, and error
  recovery work in browser and Tauri webview tests.

## External dependencies

See [backend and engine dependencies](BACKEND-DEPENDENCIES.md). The End A
match field is required before this becomes an operational production flow.
