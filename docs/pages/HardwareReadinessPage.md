# HardwareReadinessPage

Status: Current

- Route: `#/matches/:matchId/readiness`
- Primary source:
  [`HardwareReadinessPage.tsx`](../../src/features/readiness/HardwareReadinessPage.tsx)
- Relevant behavioral tests:
  [`HardwareReadinessPage.integration.test.tsx`](../../src/features/readiness/HardwareReadinessPage.integration.test.tsx)

## Purpose

The hardware-readiness page prevents an operator from starting monitoring
until the selected match has two healthy camera paths and an applicable court
calibration.

## Actors and entry conditions

- A signed-in operator may prepare a locally available match.
- A demo operator may prepare only the match assigned to that demo session.
- The requested match and its saved readiness state must be available on the
  current device.
- Match access and status progression are owned by the
  [match-preparation workflow](../workflows/MatchPreparationWorkflow.md).

## Business rules

- Monitoring cannot start until Camera A, Camera B, and a calibration profile
  are all ready.
- Camera and calibration progress is saved independently so successful work is
  not lost when another check fails or the page is reopened.
- The current camera checks and calibration profile are simulated. Their
  simulated status must remain clear and must not be represented as proof of
  physical hardware readiness.
- Starting an eligible draft match moves it through ready status and into live
  monitoring.
- A match already in live monitoring returns to its monitor; a completed match
  opens its decision evidence instead of beginning another monitoring session.
- A demo operator must explicitly confirm the timed trial before monitoring
  starts. Timing and expiry are owned by the
  [demo-trial workflow](../workflows/DemoTrialWorkflow.md).

## Meaningful states

- **Loading:** The saved match and readiness state are being restored.
- **Unavailable:** The match does not exist locally or its readiness data
  cannot be loaded; the operator receives a safe route back to the match
  workspace.
- **Incomplete:** One or more required checks remain and monitoring is blocked.
- **Ready:** Both camera paths and calibration satisfy the monitoring gate.
- **Live:** The match has already started and can return to monitoring.
- **Completed:** The match is closed and can open its decision view.
- **Action failure:** A readiness update or monitoring transition failed; the
  operator remains on the page and can retry without losing unrelated saved
  progress.

## Actions and consequences

| Action                           | Business consequence                                                                             |
| -------------------------------- | ------------------------------------------------------------------------------------------------ |
| Advance or retry a camera check  | Updates only that camera's saved readiness state.                                                |
| Reset a camera before monitoring | Makes the readiness gate incomplete again.                                                       |
| Select or clear calibration      | Updates the saved court-profile requirement.                                                     |
| Start monitoring                 | Enters live monitoring only when all readiness requirements and valid match transitions succeed. |
| Confirm demo start               | Starts monitoring and begins the single 15-minute demo trial.                                    |
| Keep configuring                 | Closes the demo confirmation without starting the timer.                                         |

## Navigation

- Successful start continues to `#/matches/:matchId/live`.
- A previously live match returns to `#/matches/:matchId/live`.
- A completed match continues to `#/matches/:matchId/decision`.
- A missing or unavailable normal match can return to `#/matches`.

## Open questions

Real device discovery, health criteria, calibration-profile applicability,
permissions, and recovery behavior must be specified with the hardware
integration. The current simulated sequence does not define those contracts.
