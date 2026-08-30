# LiveMonitor

Status: Current

- Route: `#/matches/:matchId/live`
- Primary source: [`LiveMonitor.tsx`](../../src/features/live/LiveMonitor.tsx)
- Relevant behavioral tests:
  [`LiveMonitor.test.tsx`](../../src/features/live/LiveMonitor.test.tsx),
  [`workflowNavigation.integration.test.tsx`](../../src/app/workflowNavigation.integration.test.tsx)

## Purpose

The live monitor is the operator's active match workspace. It keeps the
operator oriented to the selected court and current play while providing a
rapid path to inspect the most recent rally when a line call needs review.

## Approved actors and entry conditions

- A signed-in operator may enter for a match that has passed hardware
  readiness and entered live monitoring.
- A demo operator may enter only the match assigned to the demo session, under
  the [isolated demo-trial workflow](../workflows/DemoTrialWorkflow.md).
- Resuming a live match from the dashboard and entering after readiness are
  owned by the [match-preparation workflow](../workflows/MatchPreparationWorkflow.md).

These are the intended conditions. The current route does not yet validate the
requested match's existence, ownership, and status completely; that shared gap
is owned by the [line-call review workflow](../workflows/LineCallReviewWorkflow.md).

## Business rules and current boundaries

- For normal paired matches, the left and right panels render the current live
  WebRTC video previews for `SIDELINE_LEFT` and `SIDELINE_RIGHT`. Without any
  current preview, Fly Eye redirects directly to camera setup for a fresh
  pairing. A missing secondary preview is a connection failure, not evidence
  or a line-call result, and the monitor offers camera setup repair.
- In the demo path or without a current preview, the court imagery remains a
  visible simulation and does not represent physical capture, calibration, or
  processing.
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

- **Monitoring active:** The operator can see two current previews when both
  phones are connected, or clearly marked simulated context where applicable,
  and select the most recent rally for review.
- **Review requested:** The selected rally opens the clip-review workflow.
- **All feeds unavailable:** The normal operator returns to camera setup for a
  fresh pairing. With one remaining preview, the operator is told the affected
  secondary preview is unavailable and can repair it from camera setup. The
  simulated review controls do not turn that failure into evidence.

Camera status uses the shared operator wording: **Live** has a red activity
indicator, **Reconnecting camera…** is temporary recovery, and **Offline** is
unavailable. The compact Camera setup action appears in the monitor header
only when a normal camera requires repair.

## Actions and consequences

| Action                 | Business consequence                                         |
| ---------------------- | ------------------------------------------------------------ |
| Review last rally      | Opens synchronized clip review for operator inspection.      |
| F1                     | Keyboard equivalent of requesting the latest rally review.   |
| Return to camera setup | Opens readiness when a required live preview is unavailable. |
| End match              | Approved product action, not yet available on this page.     |

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

The product owner must define synchronization drift, buffer retention, and
processing failure policies for decisions. The current UI does not establish
those device or inference policies.
