# CreateMatchPage

Status: Current

- Route: `#/matches/new`
- Primary source: [`CreateMatchPage.tsx`](../../src/features/matches/CreateMatchPage.tsx)
- Relevant behavioral tests:
  [`createMatch.integration.test.tsx`](../../src/features/matches/createMatch.integration.test.tsx),
  [`createMatchValidation.test.ts`](../../src/features/matches/createMatchValidation.test.ts)

## Purpose

The create-match page establishes the match context an operator needs before
camera readiness and monitoring. It captures the event, court, participants,
competition type, and scoring format as one explicit standalone match record.

## Actors and entry conditions

- A normal authenticated operator enters from the match dashboard.
- Anonymous visitors are redirected to public onboarding.
- Demo operators do not use this page; their generated match is assigned by
  the [isolated demo-trial workflow](../workflows/DemoTrialWorkflow.md).

## Business rules

- The first product version creates standalone matches only. Tournament
  structure, brackets, scheduling, venues, officials, rosters, and bulk match
  creation are deferred.
- A match identifies an event or match name and a court name or number.
- Singles means one player on each side. Doubles means two players on each
  side; the two players remain meaningful participants rather than an
  implementation-only label.
- Competition type and scoring format are independent. Singles/doubles chooses
  the number of players per side; it does not choose the number of games.
- The operator independently selects a one-game or best-of-three match and a
  15-point or 21-point target for each game. Both choices travel with the match
  and are not inferred later.
- Successful creation produces a draft match and continues to hardware
  readiness. Match lifecycle and readiness gates are owned by the
  [match-preparation workflow](../workflows/MatchPreparationWorkflow.md), not
  by this page.
- Normal match identity, participants, competition type, and lifecycle are
  backend-owned. The selected match length and point target are saved locally
  against the returned backend match UUID because the current backend contract
  has no scoring fields. An existing backend match without that local record
  uses the clearly documented best-of-three/21 fallback.
- Canceling leaves the preparation journey without creating or persisting a
  draft. A failure while saving leaves the entered information available for a
  retry rather than claiming that a match exists.

## Meaningful states

- **Details:** The operator establishes the event, court, and competition
  context before naming participants.
- **Participants and format:** The operator records the correct number of
  players for each side and selects the scoring rules.
- **Creation failure:** The match was not created; the operator can retry with
  the information still available.
- **Canceled:** The operator returns to the dashboard with no new match.

## Actions and consequences

| Action                    | Business consequence                               |
| ------------------------- | -------------------------------------------------- |
| Continue to players       | Proceeds after the match context is established.   |
| Back                      | Returns to the prior creation step without saving. |
| Create match and continue | Creates a draft and opens hardware readiness.      |
| Cancel                    | Returns to the dashboard without persistence.      |

## Navigation

- The normal entry point is `#/matches`.
- Successful creation continues to `#/matches/:matchId/readiness`.
- Cancel returns to `#/matches`.
- Subsequent status transitions and readiness requirements belong to the
  match-preparation workflow.

## Related workflow

- [Match preparation](../workflows/MatchPreparationWorkflow.md)
- [Authentication and sessions](../workflows/AuthenticationWorkflow.md)
- [Isolated demo trial](../workflows/DemoTrialWorkflow.md)

## Open questions

The product owner must confirm how a future backend represents event identity,
participant identity, and ownership when tournament and organization support is
introduced.
