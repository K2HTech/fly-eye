# HardwareReadinessPage

Status: Current

- Route: `#/matches/:matchId/readiness`
- Primary source:
  [`HardwareReadinessPage.tsx`](../../src/features/readiness/HardwareReadinessPage.tsx)
- Relevant behavioral tests:
  [`HardwareReadinessPage.integration.test.tsx`](../../src/features/readiness/HardwareReadinessPage.integration.test.tsx)

## Purpose

The hardware-readiness page prepares the two camera paths and their court
geometry before official monitoring. It also provides a safe test-preview path
for checking a paired camera before calibration is complete.

## Actors and entry conditions

- A signed-in operator may prepare a backend-authorized match.
- A demo operator may prepare only the match assigned to that demo session.
- The requested match and its saved readiness state must be available on the
  current device.
- Match access and status progression are owned by the
  [match-preparation workflow](../workflows/MatchPreparationWorkflow.md).

## Business rules

- For normal POC matches, official monitoring cannot start until at least one
  paired camera has a current decoded live preview **and** both the left and
  right cameras have a current backend calibration of `good` or `acceptable`
  quality. A `poor`, absent, invalidated, loading, or failed result does not
  satisfy the calibration requirement.
- Camera and calibration progress is saved independently so successful work is
  not lost when another check fails or the page is reopened.
- For normal matches, opening readiness obtains exactly one backend
  `SIDELINE_LEFT` and one `SIDELINE_RIGHT` device-camera record. The left and
  right cards use those role directions and their backend 1280x720/30-FPS
  preview metadata. Unexpected, duplicate, inactive, or incompatible records
  block setup with an actionable error rather than being guessed at.
- For normal backend matches, each camera becomes ready only when its paired
  phone has a connected peer and a current live video preview. Saved or
  simulated camera-check values cannot satisfy this gate. Pairing, loss, and
  replacement remain independent for the two roles.
- A normal operator can open **Test camera preview** as soon as at least one
  decoded preview is available. This opens the live workspace in a visibly
  test-only mode where rally review is disabled; it does not bypass official
  monitoring requirements.
- The demo path retains its clearly simulated camera checks and known-good
  profile selector. It never calls protected calibration APIs.
- For normal POC matches, starting from draft advances the backend directly to
  live after the page verifies the official preview and calibration gate. Demo
  retains its local ready stage before live monitoring.
- A live normal match only returns to its official monitor after at least one
  current decoded preview and both usable current calibrations are present in
  this browser session. After sign-in, refresh, or restart, the operator must
  pair a phone again before returning. A completed match opens its decision
  evidence instead of beginning another monitoring session.
- A demo operator must explicitly confirm the timed trial before monitoring
  starts. Timing and expiry are owned by the
  [demo-trial workflow](../workflows/DemoTrialWorkflow.md).

## Meaningful states

- **Loading:** The saved match and readiness state are being restored.
- **Unavailable:** The match does not exist locally or its readiness data
  cannot be loaded; the operator receives a safe route back to the match
  workspace.
- **Incomplete:** One or more required checks remain and monitoring is blocked.
- **Ready:** A normal session has at least one decoded live preview plus usable
  calibration for both required cameras, or the demo path satisfies its
  existing simulated gate.
- **Test preview:** At least one normal camera has a decoded live preview; the
  operator can inspect framing, but rally review remains unavailable.
- **Live:** The match has already started and can return to monitoring.
- **Completed:** The match is closed and can open its decision view.
- **Action failure:** A readiness update or monitoring transition failed; the
  operator remains on the page and can retry without losing unrelated saved
  progress.

## Actions and consequences

| Action                           | Business consequence                                                                                                                 |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Pair phone                       | Creates a short-lived code for one backend camera and waits for its independent live preview.                                        |
| Advance or retry a camera check  | Demo-only simulated action; updates only that camera's saved readiness state.                                                        |
| Reset a camera before monitoring | Demo-only simulated action; makes the readiness gate incomplete again.                                                               |
| Calibrate or recalibrate camera  | Captures stills from that role's current preview, marks court corners, and requests a backend calibration solve.                     |
| Test camera preview              | Opens a test-only live workspace when one current preview exists; rally review stays disabled.                                       |
| Select or clear calibration      | Demo-only action; updates the simulated saved court-profile requirement.                                                             |
| Start monitoring                 | For normal POC matches, enters official monitoring with both usable calibrations, one decoded preview, and a valid match transition. |
| Confirm demo start               | Starts monitoring and begins the single 15-minute demo trial.                                                                        |
| Keep configuring                 | Closes the demo confirmation without starting the timer.                                                                             |

## Navigation

- Successful official start continues to `#/matches/:matchId/live`; test
  preview continues to `#/matches/:matchId/live?mode=test`.
- A previously live match returns to `#/matches/:matchId/live`.
- A completed match continues to `#/matches/:matchId/decision`.
- A missing or unavailable normal match can return to `#/matches`.

## Open questions

Measured camera health diagnostics, permissions, and calibration recovery after
a browser refresh remain to be specified.
