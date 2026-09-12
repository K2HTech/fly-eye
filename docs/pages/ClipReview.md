# ClipReview

Status: Current backend-analysis behavior with simulated demo review

- Route: `#/matches/:matchId/review`
- Primary source: [`ClipReview.tsx`](../../src/features/review/ClipReview.tsx)
- Relevant behavioral tests:
  [`ClipReview.test.tsx`](../../src/features/review/ClipReview.test.tsx),
  [`workflowNavigation.integration.test.tsx`](../../src/app/workflowNavigation.integration.test.tsx)

## Purpose

For a normal backend match, clip review lets the operator see the submitted
rally while backend analysis progresses. The backend result then opens the
decision view. The older frame-by-frame controls remain the visibly simulated
demo review experience.

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

- Normal review receives a final 12-second snapshot from the live browser
  buffer and displays the available captured camera video while the backend
  reports `queued` or `running` progress. It has no frontend landing-frame
  selection or frontend inference.
- The review surface polls the backend once per second until a terminal result.
  A terminal failure states the backend message and lets the operator return to
  monitoring; it is not a line-call outcome.
- The demo frame transport, selection controls, and deterministic **Get the
  call** behavior are simulated-only UI. Their frame numbers and evidence do
  not establish a synchronization or inference requirement.

## Meaningful states

- **Analysis in progress:** The submitted captured media is available while
  the backend reports coarse stage and progress.
- **Analysis failed:** The backend failure is visible and the operator can
  return to live monitoring without recording a result.
- **Result ready:** A terminal backend result opens the decision surface.
- **Paused and synchronized:** Demo-only simulated views show the same
  selected frame for inspection.

## Actions and consequences

| Action                   | Business consequence                               |
| ------------------------ | -------------------------------------------------- |
| Return to live or Escape | Leaves processing/review without ending the match. |
| Demo frame controls      | Inspect simulated synchronized evidence only.      |

## Navigation

- Entry is from `#/matches/:matchId/live`.
- A completed backend analysis continues to `#/matches/:matchId/decision`.
- Back and Escape return to the same match's live monitor.
- A decision does not complete the match; the operator can return to live
  monitoring for another rally.

## Related workflow

- [Line-call review](../workflows/LineCallReviewWorkflow.md)
- [Match preparation](../workflows/MatchPreparationWorkflow.md)
- [Isolated demo trial](../workflows/DemoTrialWorkflow.md)

## Related technical validation

- [Real rally analysis validation](../technical/REAL-RALLY-ANALYSIS-VALIDATION.md)
