# Line-Call Review Workflow

Status: Current normal-backend analysis workflow with simulated demo review

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
- Normal matches retain recent browser-decoded video in memory and consume the
  backend clip/analysis contract. The backend and engine remain responsible for
  verification, tracking, calibration use, verdict generation, and overlays.
  The demo route remains simulated.

## Review journey

1. The normal live workspace retains at most 30 seconds of each active decoded
   camera stream in browser memory.
2. After a disputed rally, the operator chooses **Review last rally**. Fly Eye
   snapshots the final 12 seconds, keeps live capture running, and declares,
   uploads, completes, and submits the available calibrated camera assets.
3. Clip review shows the submitted captured video and backend-owned coarse
   analysis progress. It polls until `done` or `failed`.
4. A completed analysis opens the decision view, which presents the backend
   verdict, diagnostics, reason values, and authorized generated overlay.
5. A failed analysis returns a recovery message; a successful `INCONCLUSIVE`
   result requires a manual umpire decision rather than creating a third
   line-call verdict.
6. The operator may run the review again, request that the clip be saved, or
   return to live monitoring for the same match.

One line-call decision does not complete the match. The operator can repeat this
journey for later rallies until the umpire deliberately uses the approved
future **End match** action.

The only approved line-call results are **IN** and **OUT**. Fly Eye presents
evidence and confidence information to assist the umpire, who retains final
authority. Missing evidence or failed processing is a workflow failure, not an
additional line-call result.

## Interaction invariants

- Normal review snapshots the final 12-second window at operator action and
  does not stop live capture while upload or analysis is in progress.
- A submitted normal camera requires a current eligible calibration. Development
  may submit one such camera; production submits both calibrated camera assets.
- Browser recording must be supported as backend-compatible MP4/H.264 or the
  operator receives a clear failure rather than an unsupported upload.
- A normal analysis request cannot create a duplicate while upload/submission
  is in progress.
- Returning from review or decision preserves the current match identifier.
- Trial expiry removes a demo operator's protected access across every stage;
  the [demo-trial workflow](DemoTrialWorkflow.md) owns timing and expiry.
- A decision result is evidence for one reviewed landing, not a match result or
  score update.

## Operator exits

| Action            | Destination or consequence                                                       |
| ----------------- | -------------------------------------------------------------------------------- |
| Review last rally | Snapshots and submits the recent calibrated rally, then opens review             |
| Leave clip review | Live monitor for the same match                                                  |
| Backend done      | Decision view with the backend result                                            |
| Run it again      | Clip review for another review attempt                                           |
| Back to live      | Live monitor for the same match                                                  |
| Save clip         | Requests clip retention; current UI only acknowledges a simulated queue          |
| Matches           | Normal operators may return to the match dashboard; demo access remains isolated |
| End match         | Approved future action that marks the whole match completed                      |

## Approved implementation gaps

- The live, review, and decision routes do not yet validate that the requested
  match exists, belongs to the operator, or has the required status.
- The live workspace still uses fixed match, score, camera, and buffer fixtures
  instead of the selected match and processing services.
- Normal review must still receive real-browser/device validation for
  MP4/H.264 browser capture, object-storage acceptance, and an engine worker.
- Demo review frames, reconstruction progress, decision evidence, and verdict
  values remain deterministic UI fixtures.
- **Save clip** does not yet persist media or associate a saved artifact with
  the match.
- The live workspace does not yet offer the approved **End match** action.
- Umpire score controls and automatic game/match completion are deferred.

These gaps require separate approved feature specifications; they are not
silently implemented as part of this documentation batch.

## Open questions

- The backend/engine must continue to define detection semantics,
  synchronization tolerance, confidence meaning, and evidence provenance.
- The end-match feature must decide its immediate destination and confirmation
  behavior when it is specified.

## Evidence

The current journey is evidenced by [workflow navigation
tests](../../src/app/workflowNavigation.integration.test.tsx), [live-monitor
tests](../../src/features/live/LiveMonitor.test.tsx), [clip-review
tests](../../src/features/review/ClipReview.test.tsx), and [decision-screen
tests](../../src/features/decision/DecisionScreen.test.tsx).
