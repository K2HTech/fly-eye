# Camera Calibration Validation Checklist

Status: Required, deferred manual validation

This checklist records the real-environment acceptance work for normal
authenticated camera calibration. Automated tests verify the UI gate and
adapter behavior; they cannot prove a physical court, decoded phone stream,
backend calibration engine, or object-storage CORS policy.

Run it before claiming the calibration workflow is operational, after a change
to the Flutter camera app, backend calibration contract or engine, object
storage policy, browser capture code, or a deployed frontend origin.

## Preconditions

- Use a normal authenticated operator account, not the anonymous demo.
- Put the operator laptop and both paired phones on the intended court network.
- Configure a reachable API, WSS signaling endpoint, and object-storage CORS
  policy for the exact frontend origin.
- Create or select a draft match with its active `SIDELINE_LEFT` and
  `SIDELINE_RIGHT` camera records.
- Fix each phone in its intended court position before taking stills. Do not
  move it between captured frames or while marking points.
- Never retain passwords, access tokens, mobile/viewer pairing tokens, upload
  target URLs, storage keys, SDP, or ICE data in evidence.

## Required acceptance matrix

| ID         | Scenario                                                                                                          | Expected result                                                                                                                                        |
| ---------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| CAL-E2E-01 | Pair both phones and wait for decoded previews.                                                                   | Each readiness card identifies the corresponding left or right camera. A lost preview prevents capture for that role.                                  |
| CAL-E2E-02 | With one decoded preview and no usable calibration, open **Test camera preview**.                                 | The live workspace is visibly labelled test-only; **Review last rally** and F1 are disabled with an explanation.                                       |
| CAL-E2E-03 | Capture three stills from one fixed current preview and mark the four prompted outer doubles-court corners.       | Each captured image uses the registered source resolution; the submission succeeds without revealing checksums, targets, or bearer credentials.        |
| CAL-E2E-04 | Repeat the process with four and five stills.                                                                     | The backend accepts each valid count and returns a current calibration result.                                                                         |
| CAL-E2E-05 | Submit fewer than three or more than five stills.                                                                 | The UI prevents submission before an API call.                                                                                                         |
| CAL-E2E-06 | Deliberately mark an invalid or degenerate court shape.                                                           | The backend error is understandable and offers recapture or correction without replacing a prior usable calibration.                                   |
| CAL-E2E-07 | Validate a `poor` result, then recalibrate with corrected framing/marks.                                          | The poor result remains visible but does not unlock official monitoring. A later `good` or `acceptable` current result replaces its role's gate state. |
| CAL-E2E-08 | Produce one usable camera result while the other is missing, poor, or invalidated.                                | **Start monitoring** remains disabled and identifies the remaining camera calibration requirement.                                                     |
| CAL-E2E-09 | Produce current usable results for both roles while at least one live preview remains connected.                  | **Start monitoring** becomes available. The official live workspace enables its simulated rally-review affordance.                                     |
| CAL-E2E-10 | Refresh or sign in again after successful calibration without pairing a phone again.                              | Backend calibration status reloads, but official monitor return remains blocked until a fresh decoded live preview exists in the browser session.      |
| CAL-E2E-11 | Expire or invalidate an upload target before uploading, and interrupt the solve request after an unknown outcome. | The UI provides a safe retry path; it does not report completion until the backend current result confirms it.                                         |
| CAL-E2E-12 | Inspect browser storage, browser console, visible errors, and sanitized test evidence.                            | No credentials, authorization header, upload URL, storage key, digest, pairing token, SDP, or ICE candidate is exposed.                                |

## Evidence to retain

For each run, record the frontend and backend versions, calibration-engine
version, storage provider/CORS configuration version, network topology,
phone/browser models, test date, and pass/fail result. Record camera role,
frame count, and final quality. Attach screenshots only after removing secrets
and private network details.

The checklist establishes neither line-call accuracy nor real rolling-buffer,
tracking, or inference behavior. Those require separately approved contracts
and validation.
