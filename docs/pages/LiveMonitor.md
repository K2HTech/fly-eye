# LiveMonitor

Status: Current behavior with approved implementation gap

- Route: `#/matches/:matchId/live`
- Primary source: [`LiveMonitor.tsx`](../../src/features/live/LiveMonitor.tsx)
- Relevant behavioral tests:
  [`LiveMonitor.test.tsx`](../../src/features/live/LiveMonitor.test.tsx),
  [`workflowNavigation.integration.test.tsx`](../../src/app/workflowNavigation.integration.test.tsx)

## Purpose

The live monitor is the operator's active match workspace. It keeps the
operator oriented to the selected court and current play while providing a
rapid path to inspect the most recent rally when a line call needs review.

## Actors and entry conditions

- A signed-in operator may enter for a match that has passed hardware
  readiness and entered live monitoring.
- A demo operator may enter only the match assigned to the demo session, under
  the [isolated demo-trial workflow](../workflows/DemoTrialWorkflow.md).
- Resuming a live match from the dashboard and entering after readiness are
  owned by the [match-preparation workflow](../workflows/MatchPreparationWorkflow.md).

## Business rules and current boundaries

- The two camera perspectives and their synchronization represent the intended
  review context, but the current views are simulated court imagery. They are
  not evidence that cameras are capturing, calibrated, or processing physical
  play.
- The rolling buffer communicates the product concept of retaining recent play
  so the operator can review a rally after it occurs. Its duration, detected
  rally segments, frame rate, latency, score, court, teams, and elapsed time in
  the current screen are simulated fixtures, not match or system requirements.
- A line-call review is a separate operator action. One resulting decision
  does not complete the match; the operator may return to monitoring for later
  rallies.
- The approved **End match** action is not yet implemented. Completion must be
  deliberate and is not inferred from a line-call decision.

## Meaningful states

- **Monitoring active:** The operator can see the simulated camera context and
  select the most recent rally for review.
- **Review requested:** The selected rally opens the clip-review workflow.
- **Feed or processing failure:** No product-level recovery state is currently
  defined by this page; real device-health and processing failures must be
  specified with the hardware and backend integrations.

## Actions and consequences

| Action            | Business consequence                                       |
| ----------------- | ---------------------------------------------------------- |
| Review last rally | Opens synchronized clip review for operator inspection.    |
| F1                | Keyboard equivalent of requesting the latest rally review. |
| End match         | Approved product action, not yet available on this page.   |

## Navigation

- Review continues to `#/matches/:matchId/review`.
- The review and decision surfaces provide deliberate paths back to this
  live workspace.
- The completed-match transition and eventual end-match destination belong to
  the match-preparation and line-call workflows.

## Related workflow

- [Line-call review](../workflows/LineCallReviewWorkflow.md)
- [Match preparation](../workflows/MatchPreparationWorkflow.md)
- [Isolated demo trial](../workflows/DemoTrialWorkflow.md)

## Open questions

The product owner must define how real camera loss, synchronization drift,
buffer retention, and processing failure affect the operator's ability to call
or revisit a rally. The current UI does not establish those device or inference
policies.
