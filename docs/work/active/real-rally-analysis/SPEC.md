# Real Rally Analysis Specification

Status: Approved — Batch 1 ready

## Outcome

A signed-in operator can request a review immediately after a rally. Fly Eye
captures the final 12 seconds from its 30-second in-memory camera buffer,
uploads the clip through the backend contract, requests analysis, and presents
the backend result and generated overlays as the source of truth.

## Operator workflow

1. While a normal match is live, Fly Eye continuously retains up to 30 seconds
   of each decoded camera stream in memory.
2. The operator selects **Review last rally** immediately after the rally.
3. Fly Eye freezes a 12-second snapshot ending at that action. Capture and the
   rolling buffer continue while review and analysis proceed.
4. The operator sees processing progress while Fly Eye creates a backend clip,
   uploads every available calibrated camera asset, completes the clip, and
   requests analysis.
5. When analysis is done, the review and decision surfaces render the backend
   response: verdict, confidence, landing data, reason fields, per-camera
   diagnostics, and generated overlays. The frontend does not infer, modify,
   or substitute a result. `INCONCLUSIVE` is displayed with its backend reason
   and evidence, but is not recorded or presented as a third line-call result;
   the umpire decides manually.
6. The operator may return to live monitoring without completing the match.

## Rules and constraints

- The local retention window is 30 seconds; the uploaded analysis window is
  the final 12 seconds because the backend's current `CLIP_MAX_DURATION_MS`
  default is 12,000 milliseconds.
- A normal development match may monitor with one decoded preview. It may
  submit one camera asset for analysis only when that camera has a current
  calibration. Production submission uses both calibrated camera assets.
- Two submitted assets must represent the same window and meet the backend's
  overlap requirement. One usable calibrated asset remains a valid analysis
  request under the backend/engine contract.
- The browser must use the backend-supported `video/mp4` and `h264` format.
  It must check recording support before beginning the local buffer and fail
  clearly rather than upload an unsupported format.
- The browser obtains direct-upload targets from the backend and sends only the
  exact supplied method and headers. Presigned URLs and authentication secrets
  are never logged, stored, or placed in route state.
- Analysis progress uses authenticated HTTP polling through the existing
  backend HTTP boundary. It must not expose access tokens to a new WebSocket
  adapter merely for this feature.
- A terminal analysis failure is a recoverable review failure, not a third
  line-call result and not a frontend-generated IN/OUT call. A successful
  `INCONCLUSIVE` result is displayed faithfully but remains a manual-umpire
  outcome rather than a recorded verdict.
- Anonymous demo remains visibly simulated and does not upload or analyze real
  camera video.

## External contract dependency

This work consumes the existing backend endpoints:

- `POST /matches/{matchId}/clips`
- direct asset upload using returned targets
- `POST /clips/{clipId}/complete`
- `POST /clips/{clipId}/analyze`
- `GET /analyses/{analysisId}`
- authorized analysis-overlay endpoints returned by the result

The backend and engine own authorization, object storage, clip verification,
queueing, retry, detection, tracking, geometry, verdicts, and overlays. This
repository owns only browser capture, contract-safe transfer, progress
presentation, and result rendering.

## Acceptance criteria

- A normal live session retains no more than 30 seconds of decoded video per
  active role in memory and does not persist it across refresh or sign-out.
- Review uses the final 12 seconds available at the operator action; live
  capture remains active after the snapshot is made.
- A camera without a current calibration cannot be declared for analysis, and
  the operator receives an actionable recovery message.
- Clip declarations, direct uploads, completion, and analysis requests follow
  the backend contract exactly, including size, checksum, timestamps, MIME,
  codec, and supplied upload headers.
- Analysis progress, terminal failure, and terminal result are distinguishable
  and accessible.
- Result surfaces show backend verdict/evidence values and generated overlays;
  they do not retain simulated decision values for a real analysis.
- The full feature is covered by contract, capture, workflow, and UI tests;
  real-browser validation verifies MP4/H.264 recording and backend acceptance.
