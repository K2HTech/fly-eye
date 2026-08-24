# ClipReview

Status: Current simulated review behavior

- Route: `#/matches/:matchId/review`
- Primary source: [`ClipReview.tsx`](../../src/features/review/ClipReview.tsx)
- Relevant behavioral tests:
  [`ClipReview.test.tsx`](../../src/features/review/ClipReview.test.tsx),
  [`workflowNavigation.integration.test.tsx`](../../src/app/workflowNavigation.integration.test.tsx)

## Purpose

Clip review lets the operator inspect a disputed rally frame by frame, keep
the two camera perspectives aligned, and identify the landing moment before
requesting a line-call result.

## Approved actors and entry conditions

- A signed-in operator enters from a live match or resumes a live match through
  the match workspace.
- A demo operator may review only the assigned demo match.
- The cross-page stages and access restrictions are owned by the
  [line-call review workflow](../workflows/LineCallReviewWorkflow.md) and the
  [isolated demo-trial workflow](../workflows/DemoTrialWorkflow.md).

These are the intended conditions. The current route does not yet validate the
requested match's existence, ownership, and status completely; that shared gap
is owned by the line-call review workflow.

## Business rules and current boundaries

- Both camera views are intended to represent synchronized evidence. The
  current paused court scenes and the `SYNC ±1 FRAME` indicator are simulated;
  they do not establish a physical synchronization tolerance.
- Frame transport allows the operator to inspect a bounded clip, constrain its
  start and end, and choose either an automatic landing selection or a manual
  selection. The current frame numbers, timeline bounds, landing frame,
  duration, tracked-frame count, and “Back boundary” question are hard-coded
  demonstration values, not product rules.
- **Get the call** requests reconstruction of the selected clip and proceeds
  only after the simulated reconstruction completes. The current progress
  meter and deterministic callback model are UI behavior, not a claim about
  inference latency or algorithm output.

## Meaningful states

- **Paused and synchronized:** Both views show the same selected frame for
  inspection.
- **Automatic selection:** The review service is asked to identify the
  landing moment.
- **Manual selection:** The operator's selected landing frame is used.
- **Reconstructing:** A call request is in progress and duplicate requests are
  prevented.
- **Decision ready:** Reconstruction opens the decision surface with the
  selected landing context.
- **Processing failure:** Real reconstruction failure, missing frames, and
  unavailable evidence have no finalized product recovery behavior yet.

## Actions and consequences

| Action              | Business consequence                                        |
| ------------------- | ----------------------------------------------------------- |
| Move through frames | Inspects synchronized views of the rally.                   |
| Set clip bounds     | Defines the portion of the rally to review.                 |
| Find it for me      | Chooses automatic landing-frame selection.                  |
| I'll pick it        | Chooses manual landing-frame selection.                     |
| Get the call        | Requests reconstruction and, when complete, opens decision. |
| Back or Escape      | Returns to the live monitor without ending the match.       |

## Navigation

- Entry is from `#/matches/:matchId/live`.
- A completed reconstruction continues to `#/matches/:matchId/decision`.
- Back and Escape return to the same match's live monitor.
- A decision does not complete the match; the operator can return to live
  monitoring for another rally.

## Related workflow

- [Line-call review](../workflows/LineCallReviewWorkflow.md)
- [Match preparation](../workflows/MatchPreparationWorkflow.md)
- [Isolated demo trial](../workflows/DemoTrialWorkflow.md)

## Open questions

The product owner must define the real clip source, capture-window policy,
landing-selection semantics, missing-tracking behavior, and the operator
recovery path when reconstruction cannot produce a call. A processing failure
is not a third line-call result.
