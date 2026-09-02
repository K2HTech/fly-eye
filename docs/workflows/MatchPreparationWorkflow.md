# Match Preparation Workflow

Status: Current behavior with approved implementation gaps

This workflow owns how an operator selects or creates a standalone match,
prepares its hardware state, and enters monitoring. Page-specific behavior is
documented by [MatchDashboardPage](../pages/MatchDashboardPage.md),
[CreateMatchPage](../pages/CreateMatchPage.md), and
[HardwareReadinessPage](../pages/HardwareReadinessPage.md).

## Actors and entry conditions

- A normal signed-in operator enters through the match dashboard and may create
  or resume backend-authorized matches.
- A demo operator bypasses the dashboard and receives one automatically
  generated match. Its ownership and restrictions are defined by the
  [demo-trial workflow](DemoTrialWorkflow.md).
- The current product prepares standalone matches only. Tournament scheduling,
  brackets, rosters, officials, and bulk creation are outside this workflow.

## Normal match preparation

1. The dashboard presents backend-owned matches or a first-match entry
   when none exist.
2. The operator may resume an existing match according to its current status or
   begin creating a new standalone match.
3. Match creation establishes the event, court, competition type,
   participants, and scoring format before anything is persisted.
4. Successful creation creates a backend draft match and continues to hardware
   readiness. Cancellation before creation returns to the dashboard without
   creating a match.
5. Readiness obtains exactly one backend left-sideline and one right-sideline
   device-camera record. The operator pairs the fixed phones, captures stills,
   and calibrates each view against the four outer court corners.
6. A test camera preview is available with at least one decoded live preview.
   It allows framing verification only and does not enable rally review.
7. Official monitoring remains blocked until at least one decoded live preview
   exists and both required camera roles hold a current `good` or `acceptable`
   backend calibration.
8. Starting an eligible normal match advances its backend status directly to
   live, then opens its official live workspace. Demo retains the local ready
   stage before live.
9. A normal live match reopened without a current preview or both usable
   calibrations returns to hardware readiness because browser camera
   connections are ephemeral and backend calibration validity is authoritative.

## Match rules

- Singles requires one participant on each side; doubles requires two on each
  side.
- Match length is independently one game or best of three games. The per-game
  point target is independently 15 or 21.
- A normal match belongs to the backend-authorized operator. A demo match
  belongs only to its isolated demo session.
- The backend does not yet store scoring fields. The UI locally supplements a
  backend UUID with match length and point target; an unknown backend match
  defaults to best-of-three/21 until backend scoring synchronization is added.
- Normal official readiness requires at least one decoded live preview and
  current `good` or `acceptable` calibration for both backend camera roles.
  The test-preview route only requires the current preview and cannot request
  a rally review.
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

| Status    | Safe resume destination                                                 |
| --------- | ----------------------------------------------------------------------- |
| Draft     | Hardware readiness to continue setup                                    |
| Ready     | Hardware readiness to confirm or recover monitoring entry               |
| Live      | Hardware readiness until a current preview is paired; then live monitor |
| Completed | Decision view                                                           |

## Recovery behavior

- Failure to create a match leaves the operator's entries available for retry
  and does not create a partial match.
- Failure to save one readiness control does not discard other saved readiness
  progress.
- Failure to enter monitoring leaves the operator at readiness with an
  actionable retry path.
- A missing or unavailable backend match returns a normal operator to the dashboard rather than
  opening a mismatched workspace.

## Approved implementation gaps

- The current live workspace has no **End match** action.

These gaps require a separate approved feature specification; they are not
silently implemented as part of this documentation batch.

## Deferred ownership

The backend must continue to preserve operator ownership while defining how
organizations, venues, and tournaments may share access; who may create, edit,
resume, or close a match; how the local scoring supplement synchronizes; and
what happens when local and remote state disagree.

The future end-match feature must also decide whether completion immediately
opens a match summary, returns to the dashboard, or remains on the live
workspace with a completed state. Future score-control work must define
win-by-two, point-cap, and game-completion rules; the current match format does
not establish them.

## Evidence

The workflow is evidenced by [match creation integration
tests](../../src/features/matches/createMatch.integration.test.tsx), [dashboard
integration tests](../../src/features/matches/dashboard.integration.test.tsx),
[readiness integration
tests](../../src/features/readiness/HardwareReadinessPage.integration.test.tsx),
and [match transition rules](../../src/domain/matchTransitions.ts).
