# DecisionScreen

Status: Current simulated decision behavior with approved implementation gap

- Route: `#/matches/:matchId/decision`
- Primary source: [`DecisionScreen.tsx`](../../src/features/decision/DecisionScreen.tsx)
- Relevant behavioral tests:
  [`DecisionScreen.test.tsx`](../../src/features/decision/DecisionScreen.test.tsx),
  [`workflowNavigation.integration.test.tsx`](../../src/app/workflowNavigation.integration.test.tsx)

## Purpose

The decision screen presents the outcome of a reviewed line call together with
the evidence context an operator needs to understand and communicate the
result. It also provides explicit return, rerun, and clip-save actions.

## Actors and entry conditions

- A signed-in operator enters after requesting a call from clip review or when
  resuming a completed match.
- A demo operator may view decisions only for the match assigned to that demo
  session.
- The ordered review, decision, and return stages belong to the
  [line-call review workflow](../workflows/LineCallReviewWorkflow.md).

## Business rules and current boundaries

- A decision is a line-call result for one reviewed rally. It is not a match
  completion event; the operator may return to live monitoring and review later
  rallies.
- The only approved line-call results are **IN** and **OUT**. Evidence and
  confidence information help the umpire make the call; the umpire retains
  final authority.
- The current verdict, margin, line, landing frame, cameras used,
  reprojection error, calibration age, confidence, score, and game shown by the
  screen are hard-coded or supplied demonstration values. They must not be
  treated as approved scoring, accuracy, confidence, calibration, or evidence
  requirements.
- The top-down landing reconstruction and evidence legend communicate the
  intended explanation of a result, but the current reconstruction is
  simulated and does not establish real tracking or inference output.
- Saving a clip currently shows only a simulated queued acknowledgment. It does
  not create a durable queue, store media, export a file, or integrate with a
  backend match folder.
- The approved **End match** action is not yet implemented. A decision must not
  silently transition the match to completed.

## Meaningful states

- **Decision presented:** The operator can inspect the result and its simulated
  evidence context.
- **Rerun requested:** The operator returns to clip review to inspect or
  reconstruct the rally again.
- **Back to live:** The operator returns to monitoring without completing the
  match.
- **Save acknowledged:** The UI acknowledges a simulated request; no durable
  queue or external persistence is established.
- **Evidence unavailable:** Missing evidence or failed processing requires a
  recovery path and must not be recorded as an `INCONCLUSIVE` verdict.

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

## Open questions

The product owner must define authoritative result provenance, confidence
meaning, processing-failure recovery, durable clip ownership/export behavior,
and the destination and confirmation behavior of the future End match action.
