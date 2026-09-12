# Court Calibration Validation Checklist

Status: Required, deferred manual validation

This checklist records the physical-camera and backend/engine acceptance work
that browser tests cannot prove. It applies only to normal authenticated
operator sessions; demo calibration remains simulated.

Run it after material changes to the calibration API, engine, camera capture
adapter, signed-upload storage, or court setup.

## Preconditions

- Use two paired phones and a normal backend-authorized match on the intended
  court Wi-Fi network.
- Confirm the match has the same immutable venue-based End A assignment shown
  to both camera operators once the backend field is available.
- Use an unobstructed, evenly lit doubles court with both camera positions
  secured before capture.
- Record frontend, backend, engine, and mobile application versions without
  retaining tokens, signed URLs, or credentials.

## Required acceptance matrix

| ID         | Scenario                                                                                                   | Expected result                                                                                                                                                                                                                                                                                                                                                |
| ---------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CAL-E2E-01 | Capture exactly three stable JPEG frames from one live camera.                                             | Each gets a checksum, a signed upload, and an uploaded state; the seed screen uses one of those same frames.                                                                                                                                                                                                                                                   |
| CAL-E2E-02 | Fail one signed PUT, then retry it before expiry.                                                          | Only the failed frame is retried; the other uploaded frames and all placed markers remain intact.                                                                                                                                                                                                                                                              |
| CAL-E2E-03 | Let a signed upload URL expire.                                                                            | The UI requests a replacement target through the supported backend recovery contract; it never reports an expired upload as successful.                                                                                                                                                                                                                        |
| CAL-E2E-04 | Place A–D corners on both cameras.                                                                         | Every A–D point starts visibly unplaced. Each is placed explicitly with the dot center on its painted intersection; both screens show the same immutable A–D court diagram and End A anchor. Only the selected landmark can be changed. At 100–800% mouse-wheel zoom, pan by dragging empty frame space and verify the submitted raw coordinate remains exact. |
| CAL-E2E-05 | Place a hidden corner outside the captured image with numeric adjustment and the line-intersection helper. | The submitted raw coordinate remains outside the image bounds and the resulting wireframe is evaluated normally.                                                                                                                                                                                                                                               |
| CAL-E2E-06 | Solve a healthy three-frame calibration.                                                                   | The returned wireframe overlays every returned line in raw pixels on the exact seeded frame, clipped to its visible bounds and highlighted yellow over painted court lines; quality and per-line diagnostics are visible.                                                                                                                                      |
| CAL-E2E-07 | Produce poor quality, camera movement, non-convergence, or fewer than two usable frames.                   | The affected camera is blocked with a recovery action; it does not appear eligible for official monitoring.                                                                                                                                                                                                                                                    |
| CAL-E2E-08 | Calibrate both cameras with complementary court coverage.                                                  | Readiness reports both eligible and allows monitoring only after both current calibrations pass.                                                                                                                                                                                                                                                               |
| CAL-E2E-09 | Open the live URL directly with a missing or unsafe calibration.                                           | The browser returns to readiness and cannot bypass the calibration gate.                                                                                                                                                                                                                                                                                       |
| CAL-E2E-10 | Test a line that neither camera resolves once server thresholds exist.                                     | Rig-level readiness blocks the setup and directs the operator to move a camera rather than recalibrate.                                                                                                                                                                                                                                                        |

## Evidence to retain

Record test date, court, devices, camera positions, network, versions,
pass/fail outcome, quality values, line errors, and any recovery result.
Redact image content when required and never retain signed URLs, checksums tied
to private media, tokens, or credentials in public evidence.

## External gaps

The End A match field, signed-upload URL renewal contract, configurable
resolution thresholds, worst-line backend enforcement, and solve idempotency
remain external dependencies. Their ownership is recorded in the active work
archive's backend-dependencies record.
