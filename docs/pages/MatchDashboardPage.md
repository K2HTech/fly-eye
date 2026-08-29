# MatchDashboardPage

Status: Current behavior with an approved implementation gap

- Route: `#/matches`
- Primary source: [`MatchDashboardPage.tsx`](../../src/features/matches/MatchDashboardPage.tsx)
- Relevant behavioral tests:
  [`dashboard.integration.test.tsx`](../../src/features/matches/dashboard.integration.test.tsx),
  [`matchNavigation.test.ts`](../../src/features/matches/matchNavigation.test.ts)

## Purpose

The match dashboard is the normal authenticated operator's workspace for
starting a match review and returning to recent work. It makes the first-run
empty state useful and gives an operator a safe continuation point for matches
already in progress or completed.

## Actors and entry conditions

- A normal authenticated operator may enter the dashboard.
- An anonymous visitor is redirected to public onboarding by the
  [authentication workflow](../workflows/AuthenticationWorkflow.md).
- A demo operator cannot enter the normal dashboard; demo access is restricted
  by the [isolated demo-trial workflow](../workflows/DemoTrialWorkflow.md).

## Business rules

- When no matches exist, the dashboard offers creation of the operator's first
  standalone match.
- When matches exist, the dashboard presents recent locally available matches
  as resumable workspaces. The match's current state determines the safe
  continuation action; lifecycle and readiness rules belong to the
  [match-preparation workflow](../workflows/MatchPreparationWorkflow.md).
- Creating a match is the normal path into preparation. Sign-out is an access
  action, not a request to delete the operator's backend account or matches.
- A normal operator's match list is private to that operator. Another local
  profile on the same computer must have a separate list. Future backend
  organization rules may grant additional explicitly authorized visibility.

## Meaningful states

- **Loading:** The workspace is restoring its available matches.
- **Empty:** No matches are available, so the first-match creation action is
  the primary next step.
- **Recent matches:** Existing matches show enough context to distinguish the
  event, participants, court, competition, format, and continuation state.
- **Unavailable:** A failed match retrieval is reported with a retry path; it
  must not be presented as an empty workspace.

## Actions and consequences

| Action             | Business consequence                                      |
| ------------------ | --------------------------------------------------------- |
| Create match       | Enters standalone match preparation.                      |
| Create first match | Enters standalone match preparation from the empty state. |
| Resume a match     | Opens the safe continuation surface for that match.       |
| Sign out           | Ends the session and returns to public onboarding.        |

## Navigation

- `Create match` continues to `#/matches/new`.
- A draft or ready match continues through readiness; a live match resumes
  monitoring; a completed match opens its decision view. The canonical
  mapping is owned by the match-preparation workflow.
- The authenticated shell provides the sign-out path; session access rules are
  owned by the [authentication workflow](../workflows/AuthenticationWorkflow.md).

## Related workflow

- [Match preparation](../workflows/MatchPreparationWorkflow.md)
- [Authentication and sessions](../workflows/AuthenticationWorkflow.md)
- [Isolated demo trial](../workflows/DemoTrialWorkflow.md)

## Approved implementation gap

The current local repository returns a workstation-wide match collection. It
must associate normal matches with their creating operator before the dashboard
can enforce the approved separate-list rule. Demo isolation already has its own
access boundary.

## Open questions

The eventual backend must define authorized sharing across organizations,
venues, and tournaments without weakening the default operator separation.
