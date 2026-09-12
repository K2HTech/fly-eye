# Real Rally Analysis Specification

Status: Implemented 2026-09-12

## Outcome

A signed-in operator can request a review immediately after a rally. Fly Eye
captures the final 12 seconds from a 30-second in-memory camera buffer, uploads
the clip through the backend contract, requests analysis, and presents the
backend result and generated overlays as the source of truth.

## Delivered behavior

- Normal live sessions retain up to 30 seconds of each decoded active camera
  stream in browser memory. A review snapshots the final 12 seconds without
  stopping capture.
- A normal development match can submit one currently calibrated camera; a
  production submission uses both calibrated camera assets.
- The browser requires backend-supported MP4/H.264 recording, declares exact
  metadata/checksums, uses only supplied direct-upload headers, and does not
  store or log secrets or presigned URLs.
- The review page polls authenticated backend analysis state and displays only
  coarse progress while work is queued or running.
- The decision page displays backend verdicts, reasons, diagnostics, and an
  authorized top-down overlay without frontend inference or substitution.
- Backend `INCONCLUSIVE` remains a manual-umpire outcome, not an official
  third Fly Eye verdict. Terminal failure is recoverable and not a verdict.
- Demo review remains visibly simulated and does not upload or analyze media.

## External dependency

The frontend consumes backend clip declaration, direct upload, completion,
analysis submission, analysis polling, and authorized overlay endpoints. The
backend and engine own authorization, object storage, clip verification,
calibration eligibility, queueing, tracking, inference, verdicts, and overlay
generation.

## Delivered difference

Focused contract, capture, workflow, and UI checks pass. Real-browser
validation was not run in the coding environment because it requires a paired
device, accessible backend/object storage, and engine worker. The required
release scenarios remain in the [real rally-analysis validation
checklist](../../../../technical/REAL-RALLY-ANALYSIS-VALIDATION.md), rather than
being treated as completed.
