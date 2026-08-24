# Match Preparation Workflow

Status: Current behavior with approved implementation gaps

This workflow owns how an operator selects or creates a standalone match,
prepares its hardware state, and enters monitoring. Page-specific behavior is
documented by [MatchDashboardPage](../pages/MatchDashboardPage.md),
[CreateMatchPage](../pages/CreateMatchPage.md), and
[HardwareReadinessPage](../pages/HardwareReadinessPage.md).

## Actors and entry conditions

- A normal signed-in operator enters through the match dashboard and may create
  or resume locally available matches.
- A demo operator bypasses the dashboard and receives one automatically
  generated match. Its ownership and restrictions are defined by the
  [demo-trial workflow](DemoTrialWorkflow.md).
- The current product prepares standalone matches only. Tournament scheduling,
  brackets, rosters, officials, and bulk creation are outside this workflow.

## Normal match preparation

1. The dashboard presents locally available matches or a first-match entry
   when none exist.
2. The operator may resume an existing match according to its current status or
   begin creating a new standalone match.
3. Match creation establishes the event, court, competition type,
   participants, and scoring format before anything is persisted.
4. Successful creation stores a draft match and continues to hardware
   readiness. Cancellation before creation returns to the dashboard without
   creating a match.
5. The operator completes both camera checks and selects a calibration profile.
   Each successful readiness update is retained independently.
6. Monitoring remains blocked until the complete readiness gate succeeds.
7. Starting monitoring advances the match through valid ready and live states,
   then opens its live workspace.

## Match rules

- Singles requires one participant on each side; doubles requires two on each
  side.
- Match length is independently one game or best of three games. The per-game
  point target is independently 15 or 21.
- A normal match belongs to the operator who created it, and normal operators
  using the same computer have separate match lists. A demo match belongs only
  to its isolated demo session.
- Readiness requires both camera paths and one applicable calibration profile.
- Simulated readiness must not be interpreted as connected physical hardware.

## Match status and resume behavior

The normal progression is:

```text
draft -> ready -> live -> completed
           |
           +-> draft when readiness setup must be reopened
```

Same-status updates are harmless. Other transitions are rejected.

The transition to completed requires an explicit **End match** action. A
line-call result does not complete the match. Umpire score control and automatic
completion based on games won are deferred.

| Status    | Safe resume destination                                   |
| --------- | --------------------------------------------------------- |
| Draft     | Hardware readiness to continue setup                      |
| Ready     | Hardware readiness to confirm or recover monitoring entry |
| Live      | Live monitor                                              |
| Completed | Decision view                                             |

## Recovery behavior

- Failure to create a match leaves the operator's entries available for retry
  and does not create a partial match.
- Failure to save one readiness control does not discard other saved readiness
  progress.
- Failure to enter monitoring leaves the operator at readiness with an
  actionable retry path.
- A missing local match returns a normal operator to the dashboard rather than
  opening a mismatched workspace.

## Approved implementation gaps

- The current creation form couples match length and point target into 3x21 and
  3x15 presets.
- The current local match repository is workstation-wide rather than separated
  by operator.
- The current live workspace has no **End match** action.

These gaps require a separate approved feature specification; they are not
silently implemented as part of this documentation batch.

## Deferred ownership

The future backend must preserve operator ownership while defining how
organizations, venues, and tournaments may share access; who may create, edit,
resume, or close a match; how local records synchronize; and what happens when
local and remote state disagree. Until that contract exists, local availability
must not be presented as production authorization.

The future end-match feature must also decide whether completion immediately
opens a match summary, returns to the dashboard, or remains on the live
workspace with a completed state.

## Evidence

The workflow is evidenced by [match creation integration
tests](../../src/features/matches/createMatch.integration.test.tsx), [dashboard
integration tests](../../src/features/matches/dashboard.integration.test.tsx),
[readiness integration
tests](../../src/features/readiness/HardwareReadinessPage.integration.test.tsx),
and [match transition rules](../../src/domain/matchTransitions.ts).
