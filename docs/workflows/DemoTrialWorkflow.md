# Isolated Demo Trial Workflow

Status: Current

This workflow owns the restrictions and timing of the no-registration demo.
The [WelcomePage](../pages/WelcomePage.md) owns the entry action and its
failure state; the [PRD](../product/PRD.md) owns the product-wide demo rule.

## Entry and automatic assignment

1. An anonymous visitor chooses the demo entry from welcome.
2. The application creates a visibly identified demo session without asking
   for registration.
3. It automatically creates one generated demonstration match and assigns
   that match to the session.
4. The visitor enters that match's hardware-readiness step.

If setup fails, the incomplete demo session is cleared and the visitor remains
anonymous at welcome so they can retry. Demo setup itself has no countdown.

## Isolation rules

A demo session is restricted to its assigned match. It does not expose the
normal match dashboard, the create-match action, or any other match. Attempts
to navigate to the dashboard or another match return to the assigned match's
readiness step.

The assignment is immutable for the life of the session. A second assignment
is rejected rather than replacing the original match. These restrictions are
access rules, not merely visual differences in the workspace.

## Starting and running the trial

The operator may complete demo setup without time pressure. The trial begins
only after the operator confirms **Start monitoring** from a valid readiness
state. At that point the assigned match enters monitoring and the 15-minute
trial clock starts.

The duration is capped at 15 minutes. While active, the remaining time is
visible to the operator and applies across the demo monitoring, review, and
decision journey. Returning to readiness or reloading the application does not
reset the start time.

## Expiry and exit

At expiry, the demo session ends and protected access is removed. The operator
is returned to welcome with a message explaining that the demo ended and that
sign-up is required to continue. A failure while signing out is surfaced as a
retryable error rather than silently pretending the trial ended.

The operator may sign out before expiry. This ends the session and returns to
welcome; it does not turn the demo into a normal account session.

## Current limitations

The generated match, camera readiness, monitoring views, review evidence, and
decision values are simulated UI behavior. The demo does not prove camera
capture, calibration, inference, or production adjudication. The local
session/profile and match data are temporary local infrastructure pending
backend ownership and synchronization rules.

## Open questions

The future product must define whether a demo's locally retained generated
match can be converted into a normal account workspace after sign-up. It must
also define backend enforcement, rate limits, and any cross-device policy for
the trial; none is established by the current UI-only implementation.

## Evidence

The workflow is evidenced by [demo onboarding integration
tests](../../src/features/auth/onboarding.integration.test.tsx), [demo trial
tests](../../src/infrastructure/local/localAppServices.test.ts), [route
restriction logic](../../src/app/RouteScreens.tsx), and [trial duration
logic](../../src/domain/demoTrial.ts).
