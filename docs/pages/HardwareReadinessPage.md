# HardwareReadinessPage

Status: Current

- Route: `#/matches/:matchId/readiness`
- Primary source:
  [`HardwareReadinessPage.tsx`](../../src/features/readiness/HardwareReadinessPage.tsx)
- Relevant behavioral tests:
  [`HardwareReadinessPage.integration.test.tsx`](../../src/features/readiness/HardwareReadinessPage.integration.test.tsx)

## Purpose

The hardware-readiness page prepares camera paths and their court geometry
before monitoring.

## Actors and entry conditions

- A signed-in operator may prepare a backend-authorized match.
- A demo operator may prepare only the match assigned to that demo session.
- The requested match and its saved readiness state must be available on the
  current device.
- Match access and status progression are owned by the
  [match-preparation workflow](../workflows/MatchPreparationWorkflow.md).

## Business rules

- Development monitoring cannot start until at least one paired camera has a
  current decoded live preview. Calibration is available for validation but is
  not a development entry requirement.
- Production monitoring requires the two supported camera roles, a current
  decoded preview from both, and a current safe calibration for both. A poor,
  moved, non-converged, or single-frame calibration is ineligible.
- Camera and calibration progress is saved independently so successful work is
  not lost when another check fails or the page is reopened.
- For normal matches, opening readiness only reads existing backend camera
  records. Selecting **Pair phone** creates or reuses that role's device-camera
  record immediately before the QR pairing session. The left and right cards
  remain visible even when a role has not yet been provisioned. A freshly
  created record starts with a placeholder resolution/FPS that is reconciled
  with the phone's actual decoded stream before calibration.
  Unexpected, duplicate, inactive, or non-device records block setup with an
  actionable error rather than being guessed at.
- For normal backend matches, each camera becomes ready only when its paired
  phone has a connected peer and a current live video preview. Saved or
  simulated camera-check values cannot satisfy this gate. Pairing, loss, and
  replacement remain independent for the two roles.
- The demo path retains its clearly simulated camera checks and calibration
  selection; it does not call the real calibration boundary.
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
- **Ready:** In development, a normal match has one decoded live preview. In
  production, it has both decoded previews and eligible current calibrations.
  The demo path instead satisfies its simulated gate.
- **Live:** The match has already started and can return to monitoring.
- **Completed:** The match is closed and can open its decision view.
- **Action failure:** A readiness update or monitoring transition failed; the
  operator remains on the page and can retry without losing unrelated saved
  progress.

## Actions and consequences

| Action                           | Business consequence                                                                                 |
| -------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Pair phone                       | Creates or reuses the selected role's backend record, then creates a short-lived pairing code.       |
| Advance or retry a camera check  | Demo-only simulated action; updates only that camera's saved readiness state.                        |
| Reset a camera before monitoring | Demo-only simulated action; makes the readiness gate incomplete again.                               |
| Calibrate court                  | Opens the selected connected camera's real captured-frame calibration workflow.                      |
| Select or clear calibration      | Demo-only: updates the simulated court-profile requirement.                                          |
| Start monitoring                 | In development, enters with one decoded preview; production requires both previews and calibrations. |
| Confirm demo start               | Starts monitoring and begins the single 15-minute demo trial.                                        |
| Keep configuring                 | Closes the demo confirmation without starting the timer.                                             |

## Navigation

- Successful start continues to `#/matches/:matchId/live`.
- A previously live match returns to `#/matches/:matchId/live`.
- A completed match continues to `#/matches/:matchId/decision`.
- A missing or unavailable normal match can return to `#/matches`.

## Open questions

Rig-level line-resolution thresholds, End A match setup, permissions, and
recovery after a browser refresh remain to be specified.
