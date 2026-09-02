# Camera Calibration UI Specification

Status: Approved on 2026-09-02

## Summary

Fly Eye will replace the normal match's simulated calibration-profile selector
with a real, per-camera calibration workflow backed by the existing Fly Eye
API. An operator captures fixed-camera stills from a paired live preview,
marks the badminton court's four outer corners, submits the calibration, and
inspects the returned court overlay and quality.

The feature separates camera testing from official monitoring. A connected
camera may open a test preview before calibration, but a production monitoring
session may begin only after both required cameras have a current `good` or
`acceptable` calibration. The rally-review control stays unavailable in test
preview and until that production requirement is satisfied.

## Scope

### Included

- Normal authenticated matches using their existing backend camera records.
- Independent calibration of `SIDELINE_LEFT` and `SIDELINE_RIGHT` cameras.
- Capture of three to five still images from the current decoded WebRTC video
  preview while the phone remains fixed.
- Guided marking of exactly four outer doubles-court corners on one selected
  reference still.
- Direct object-storage uploads through backend-issued, short-lived targets.
- Calibration submission, current-result loading, quality presentation, court
  outline/wireframe overlay, and recalibration.
- Clear error recovery for capture, upload, solve, and result-loading failures.
- A test-preview entry that permits visual camera verification but disables
  rally review.
- Official-monitoring and review gating based on both normal cameras' current
  backend calibration quality.

### Excluded

- Changes to Flutter capture, WebRTC, signaling, STUN/TURN, or backend
  calibration-engine behavior.
- Automatic court-line detection, camera-placement guidance, camera controls,
  or native/Tauri capture APIs.
- Calibration history browsing, manual restoration of an old snapshot, and
  editing a completed snapshot.
- Calibration for anonymous demo sessions. Demo keeps its explicitly simulated
  readiness behavior and never calls protected calibration APIs.
- Real rolling-buffer capture, clip upload, processing, or line-call inference.

## Operator journey

1. On hardware readiness, the operator pairs both phones and verifies each
   live preview.
2. With at least one live preview, **Test camera preview** opens the live
   workspace for framing verification. It is visibly a test state and disables
   **Review last rally**.
3. The operator chooses an available camera to calibrate and captures three to
   five stills without moving that phone.
4. The operator chooses the reference still and marks the prompted outer court
   corners in this fixed order: near-left, near-right, far-right, far-left.
5. Fly Eye uploads the stills and requests the backend solve. The operator sees
   progress and must not submit another solve for that camera concurrently.
6. Fly Eye shows the solver's current result over the reference still and its
   `good`, `acceptable`, or `poor` quality.
7. A `poor` result remains visible but asks the operator to reposition or
   re-mark and recalibrate. It is not sufficient for official monitoring.
8. After both camera roles have current `good` or `acceptable` results,
   **Start monitoring** becomes available. The live workspace then enables
   **Review last rally**.

## Business rules

### Camera and result ownership

- Calibration belongs to one backend camera, not to a local profile or the
  whole match.
- Each normal match must use its existing one left-sideline and one
  right-sideline backend camera record. The UI never guesses a role.
- On opening readiness, Fly Eye loads the current calibration for each camera
  from the backend. An absent result is shown as **Not calibrated**.
- A backend camera change that invalidates calibration is authoritative. The
  UI must show that role as requiring calibration again.
- A completed result is immutable. Recalibration requests a new snapshot; the
  backend determines which snapshot is current.

### Capture and point marking

- A camera must have a current decoded live preview before capture is offered.
- The operator captures three to five still images. All must use the registered
  camera resolution and are associated with one unchanged camera position.
- The UI guides exactly four court points rather than exposing metre values:

  | Prompt                  | Court coordinate (metres) |
  | ----------------------- | ------------------------- |
  | Near-left outer corner  | `(-3.05, -6.70)`          |
  | Near-right outer corner | `(3.05, -6.70)`           |
  | Far-right outer corner  | `(3.05, 6.70)`            |
  | Far-left outer corner   | `(-3.05, 6.70)`           |

- A displayed-image click must be transformed into the source image's pixel
  coordinate before submission. The UI prevents proceeding without all four
  valid points and lets the operator correct a point before solving.

### Quality and workflow gates

- `good` and `acceptable` are usable calibrations. `poor`, absent, invalidated,
  loading, and failed results are not usable.
- **Test camera preview** requires at least one current live preview but no
  usable calibration. It must identify itself as test-only and disable rally
  review with an explanation.
- **Start monitoring** for a normal production match requires both required
  camera roles to have usable current calibration, in addition to the existing
  live-preview safety checks.
- **Review last rally** is enabled only for an official monitoring session
  whose two camera roles have usable current calibration. It remains simulated
  until real recording and analysis integrations are separately approved.
- Existing anonymous-demo rules remain unchanged and clearly simulated.

### Backend interaction and recovery

- The UI calculates the byte length and SHA-256 digest of every captured still,
  asks the backend for upload targets, and uploads each image using the exact
  returned method and headers. It never sends the Fly Eye bearer token to
  object storage.
- Upload order is preserved when associating returned asset IDs with captured
  files.
- An upload may retry its same target before expiration. An expired target
  requires a new target batch.
- After an unknown network outcome while submitting a solve, the UI fetches the
  current calibration before allowing a duplicate submission.
- `CALIBRATION_FRAME_INCOMPLETE`, `CALIBRATION_FRAME_INVALID`, and
  `CALIBRATION_DEGENERATE` produce actionable, sanitized recovery messages.
- A backend engine failure leaves prior current calibration intact and offers a
  retry without claiming a successful result.

## States and accessibility

For each camera, the calibration surface communicates **Not calibrated**,
**Capturing**, **Mark points**, **Uploading**, **Solving**, **Good**,
**Acceptable**, **Poor**, and **Action required** through text as well as
color. Capture, point correction, cancellation, retry, and recalibration are
keyboard-operable. The point-marking surface provides an accessible ordered
alternative to pointer-only interaction.

The UI must not expose upload URLs, storage keys, checksums, bearer tokens,
SDP/ICE data, or raw backend exceptions in visible errors, logs, routes, or
persistence-safe state.

## Acceptance criteria

1. A normal operator can calibrate each live backend camera from three to five
   captured stills and sees the returned overlay and quality.
2. Point marking submits the correct source-image coordinates and fixed court
   coordinates in the required order.
3. Existing current results reload after route navigation and a normal
   reauthentication; no calibration secret is persisted locally.
4. Poor, missing, invalidated, incomplete, degenerate, expired-upload, and
   engine-failure states are understandable and recoverable.
5. Test preview is available with a live camera but prevents rally review.
6. Official monitoring and rally review remain unavailable until both required
   cameras hold usable current calibration.
7. Demo behavior remains isolated and simulated.
8. Automated format, lint, strict TypeScript, focused unit/integration and
   accessibility tests, and the production web build pass.

## Open implementation dependencies

The backend's calibration endpoints, object storage CORS configuration, and
calibration engine are external dependencies. The backend contract is already
documented in its frontend calibration handoff; this UI feature must consume
that contract without redefining it.
