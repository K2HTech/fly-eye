# DecisionScreen

Status: Current backend-result behavior with simulated demo decision

- Route: `#/matches/:matchId/decision`
- Primary source: [`DecisionScreen.tsx`](../../src/features/decision/DecisionScreen.tsx)
- Relevant behavioral tests:
  [`DecisionScreen.test.tsx`](../../src/features/decision/DecisionScreen.test.tsx),
  [`workflowNavigation.integration.test.tsx`](../../src/app/workflowNavigation.integration.test.tsx)

## Purpose

The decision screen presents the outcome of a reviewed line call together with
the evidence context an operator needs to understand and communicate the
result. It also provides explicit return, rerun, and clip-save actions.

## Approved actors and entry conditions

- A signed-in operator enters after requesting a call from clip review or when
  resuming a completed match.
- A demo operator may view decisions only for the match assigned to that demo
  session.
- The ordered review, decision, and return stages belong to the
  [line-call review workflow](../workflows/LineCallReviewWorkflow.md).

These are the intended conditions. The current route does not yet validate the
requested match's existence, ownership, and status completely; that shared gap
is owned by the line-call review workflow.

## Business rules and current boundaries

- A decision is a line-call result for one reviewed rally. It is not a match
  completion event; the operator may return to live monitoring and review later
  rallies.
- The only approved line-call results are **IN** and **OUT**. Evidence and
  confidence information help the umpire make the call; the umpire retains
  final authority.
- For a normal backend analysis, the verdict, confidence, nearest-line
  distance, per-camera diagnostics, explanation, and top-down overlay are
  backend-owned values. The UI displays them without adjusting or substituting
  an inference result.
- Backend `IN` and `OUT` responses are displayed as line-call verdicts.
  Backend `INCONCLUSIVE` is displayed with its reason and evidence but is not
  presented or recorded as a third line-call verdict; the umpire decides the
  call manually.
- The top-down overlay is retrieved through the authorized backend endpoint at
  display time. Its short-lived storage URL is never persisted or exposed by
  the UI.
- Demo values and the demo reconstruction illustration remain simulated; they
  do not establish accuracy, confidence, calibration, or evidence guarantees.
- Saving a clip currently shows only a simulated queued acknowledgment. It does
  not create a durable queue, store media, export a file, or integrate with a
  backend match folder.
- The approved **End match** action is not yet implemented. A decision must not
  silently transition the match to completed.

## Meaningful states

- **Backend decision presented:** The operator can inspect the backend result
  and its available evidence context.
- **Backend inconclusive:** The backend has completed successfully but the
  umpire must decide manually.
- **Rerun requested:** The operator returns to clip review to inspect or
  reconstruct the rally again.
- **Back to live:** The operator returns to monitoring without completing the
  match.
- **Save acknowledged:** The UI acknowledges a simulated request; no durable
  queue or external persistence is established.
- **Evidence unavailable:** Missing evidence or failed processing requires a
  recovery path and must not be recorded as a third verdict.

## Actions and consequences

| Action                    | Business consequence                                    |
| ------------------------- | ------------------------------------------------------- |
| Back to live or Escape    | Returns to monitoring for the same match.               |
| Run it again              | Returns to clip review for another review attempt.      |
| Save clip to match folder | Shows a simulated acknowledgment without storing media. |
| End match                 | Approved product action, not yet available here.        |

## Navigation

- Entry is from `#/matches/:matchId/review` or a completed-match resume path.
- Back to live returns to `#/matches/:matchId/live`.
- Run it again returns to `#/matches/:matchId/review`.
- Returning to live does not complete the match; only a future deliberate
  end-match action may do so.

## Related workflow

- [Line-call review](../workflows/LineCallReviewWorkflow.md)
- [Match preparation](../workflows/MatchPreparationWorkflow.md)
- [Isolated demo trial](../workflows/DemoTrialWorkflow.md)

## Related technical validation

- [Real rally analysis validation](../technical/REAL-RALLY-ANALYSIS-VALIDATION.md)
