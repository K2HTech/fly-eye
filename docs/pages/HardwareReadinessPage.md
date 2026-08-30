# HardwareReadinessPage

Status: Current

- Route: `#/matches/:matchId/readiness`
- Primary source:
  [`HardwareReadinessPage.tsx`](../../src/features/readiness/HardwareReadinessPage.tsx)
- Relevant behavioral tests:
  [`HardwareReadinessPage.integration.test.tsx`](../../src/features/readiness/HardwareReadinessPage.integration.test.tsx)

## Purpose

The hardware-readiness page prepares camera paths before monitoring. For the
current POC, one healthy live camera path is sufficient to start.

## Actors and entry conditions

- A signed-in operator may prepare a backend-authorized match.
- A demo operator may prepare only the match assigned to that demo session.
- The requested match and its saved readiness state must be available on the
  current device.
- Match access and status progression are owned by the
  [match-preparation workflow](../workflows/MatchPreparationWorkflow.md).

## Business rules

- For normal POC matches, monitoring cannot start until at least one paired
  camera has a current decoded live preview. The other camera may be added or
  repaired later.
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
- The demo path retains its clearly simulated camera checks. Calibration stays
  visible as a simulated known-good selection but does not gate this POC.
- For normal POC matches, starting from draft advances the backend directly to
  live after the page verifies one decoded preview. Demo retains its local
  ready stage before live monitoring.
- A live normal match only returns to its monitor after at least one current
  decoded preview is present in this browser session. After sign-in, refresh,
  or restart, the operator must pair a phone again before returning. A
  completed match opens its decision evidence instead of beginning another
  monitoring session.
- A demo operator must explicitly confirm the timed trial before monitoring
  starts. Timing and expiry are owned by the
  [demo-trial workflow](../workflows/DemoTrialWorkflow.md).

## Meaningful states

- **Loading:** The saved match and readiness state are being restored.
- **Unavailable:** The match does not exist locally or its readiness data
  cannot be loaded; the operator receives a safe route back to the match
  workspace.
- **Incomplete:** One or more required checks remain and monitoring is blocked.
- **Ready:** At least one normal camera has a decoded live preview, or the
  demo path satisfies its existing simulated gate.
- **Live:** The match has already started and can return to monitoring.
- **Completed:** The match is closed and can open its decision view.
- **Action failure:** A readiness update or monitoring transition failed; the
  operator remains on the page and can retry without losing unrelated saved
  progress.

## Actions and consequences

| Action                           | Business consequence                                                                                           |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Pair phone                       | Creates a short-lived code for one backend camera and waits for its independent live preview.                  |
| Advance or retry a camera check  | Demo-only simulated action; updates only that camera's saved readiness state.                                  |
| Reset a camera before monitoring | Demo-only simulated action; makes the readiness gate incomplete again.                                         |
| Select or clear calibration      | Updates the saved court-profile requirement.                                                                   |
| Start monitoring                 | For normal POC matches, enters live monitoring with at least one decoded preview and a valid match transition. |
| Confirm demo start               | Starts monitoring and begins the single 15-minute demo trial.                                                  |
| Keep configuring                 | Closes the demo confirmation without starting the timer.                                                       |

## Navigation

- Successful start continues to `#/matches/:matchId/live`.
- A previously live match returns to `#/matches/:matchId/live`.
- A completed match continues to `#/matches/:matchId/decision`.
- A missing or unavailable normal match can return to `#/matches`.

## Open questions

Calibration-profile applicability, measured camera health diagnostics,
permissions, and recovery after a browser refresh remain to be specified.
