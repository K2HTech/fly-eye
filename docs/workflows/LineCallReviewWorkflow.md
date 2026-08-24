# Line-Call Review Workflow

Status: Current simulated behavior with approved implementation gaps

This workflow owns the operator journey from live monitoring through a disputed
landing review, decision evidence, and return to play. Page-specific behavior is
documented by [LiveMonitor](../pages/LiveMonitor.md),
[ClipReview](../pages/ClipReview.md), and
[DecisionScreen](../pages/DecisionScreen.md).

## Actors and entry conditions

- A normal signed-in operator enters after the selected match passes hardware
  readiness and becomes live.
- A demo operator follows the same review journey for the one assigned demo
  match while the trial remains active.
- The [match-preparation workflow](MatchPreparationWorkflow.md) owns readiness,
  match access, status transitions, and match completion.
- Camera capture, rally detection, synchronized media, reconstruction, and
  verdict generation are simulated in the current UI and do not establish
  production processing behavior.

## Review journey

1. The live workspace presents the active match context, two camera views, and
   a conceptual recent-footage buffer.
2. After a disputed rally, the operator chooses **Review last rally** to open a
   synchronized clip review for the same match.
3. The operator inspects both views at one shared frame, adjusts the review
   range, and chooses automatic or manual landing-frame selection.
4. **Get the call** starts the current simulated reconstruction. A completed
   run carries the selected landing frame into the decision view.
5. The decision view presents a verdict, confidence, supporting facts, and a
   top-down evidence illustration.
6. The operator may run the review again, request that the clip be saved, or
   return to live monitoring for the same match.

One line-call decision does not complete the match. The operator can repeat this
journey for later rallies until the umpire deliberately uses the approved
future **End match** action.

The only approved line-call results are **IN** and **OUT**. Fly Eye presents
evidence and confidence information to assist the umpire, who retains final
authority. Missing evidence or failed processing is a workflow failure, not an
`INCONCLUSIVE` verdict.

## Interaction invariants

- Both review views remain on the same current frame.
- The selected review start cannot move after its end, and the end cannot move
  before its start.
- Automatic and manual landing selection are mutually exclusive choices.
- A reconstruction request cannot start a duplicate run while one is active.
- Returning from review or decision preserves the current match identifier.
- Trial expiry removes a demo operator's protected access across every stage;
  the [demo-trial workflow](DemoTrialWorkflow.md) owns timing and expiry.
- A decision result is evidence for one reviewed landing, not a match result or
  score update.

## Operator exits

| Action            | Destination or consequence                                                       |
| ----------------- | -------------------------------------------------------------------------------- |
| Review last rally | Clip review for the same match                                                   |
| Leave clip review | Live monitor for the same match                                                  |
| Get the call      | Decision view after reconstruction completes                                     |
| Run it again      | Clip review for the same match                                                   |
| Back to live      | Live monitor for the same match                                                  |
| Save clip         | Requests clip retention; current UI only acknowledges a simulated queue          |
| Matches           | Normal operators may return to the match dashboard; demo access remains isolated |
| End match         | Approved future action that marks the whole match completed                      |

## Approved implementation gaps

- The live, review, and decision routes do not yet validate that the requested
  match exists, belongs to the operator, or has the required status.
- The live workspace still uses fixed match, score, camera, and buffer fixtures
  instead of the selected match and processing services.
- Review frames, reconstruction progress, decision evidence, and verdict values
  are deterministic UI fixtures rather than media-backed results.
- **Save clip** does not yet persist media or associate a saved artifact with
  the match.
- The live workspace does not yet offer the approved **End match** action.
- Umpire score controls and automatic game/match completion are deferred.

These gaps require separate approved feature specifications; they are not
silently implemented as part of this documentation batch.

## Open questions

- Real processing must define what constitutes the “last rally,” how much media
  is retained, when a buffer segment is safe to review, synchronization
  tolerance, reconstruction failure behavior, confidence meaning, and evidence
  provenance.
- The end-match feature must decide its immediate destination and confirmation
  behavior when it is specified.

## Evidence

The current journey is evidenced by [workflow navigation
tests](../../src/app/workflowNavigation.integration.test.tsx), [live-monitor
tests](../../src/features/live/LiveMonitor.test.tsx), [clip-review
tests](../../src/features/review/ClipReview.test.tsx), and [decision-screen
tests](../../src/features/decision/DecisionScreen.test.tsx).
