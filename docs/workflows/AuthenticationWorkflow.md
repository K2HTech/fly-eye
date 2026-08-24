# Authentication and Session Workflow

Status: Current

This workflow owns access across public onboarding and protected operator
surfaces. The entry-page documents own the purpose and page-specific states of
the [welcome](../pages/WelcomePage.md), [sign-in](../pages/SignInPage.md), and
[registration](../pages/RegisterPage.md) surfaces.

## Actors and entry conditions

- An anonymous visitor may enter through welcome, registration, or sign-in.
- A visitor may use the demo path without creating an account; that journey is
  owned by the [demo-trial workflow](DemoTrialWorkflow.md).
- A restored active session may enter the protected match workspace.
- A session restoration decision must complete before protected content is
  shown, so protected content does not flash for an anonymous visitor.

## Public and protected access

Welcome, registration, and sign-in are public entry points. The match
workspace and its match-specific preparation, monitoring, review, and decision
surfaces require an active session.

An anonymous request for protected content returns to welcome. An active
session that visits a public onboarding surface proceeds to the match
workspace rather than creating a second concurrent entry flow. Unknown
locations return an active operator to the workspace and an anonymous visitor
to welcome.

These access rules apply in both the browser and the Tauri desktop application.

## Normal registration and sign-in

1. A prospective operator submits the registration information described by
   [RegisterPage](../pages/RegisterPage.md). Accepted registration creates an
   operator identity and starts a simulated session.
2. A returning operator submits the sign-in information described by
   [SignInPage](../pages/SignInPage.md). Accepted sign-in starts a simulated
   session for the matching local operator identity.
3. Either successful path enters the match workspace. Invalid input or a
   rejected operation leaves the visitor anonymous and allows a safe retry.
4. Sign-out ends the session and returns to welcome. It does not delete the
   local operator profile or that profile's locally available matches.

The current local adapter normalizes email for matching. Its account-shaped
registration behavior may update an existing local profile with the same email;
duplicate-account policy is intentionally deferred to the future backend.

## Authentication boundary

The current provider is a local simulation for exercising the product journey,
not production authentication. It does not establish a remote account or
securely verify a production credential. A future backend provider will own
credential verification, account recovery, authorization, and remote failure
semantics behind the same replaceable application boundary.

The [PRD's product-wide security invariant](../product/PRD.md#sessions-and-authentication)
applies throughout this workflow. In particular, rejected operations must not
create a session, and password input must be discarded after rejection.

## Recovery and unresolved integration work

If restored session data is absent, invalid, expired, or no longer has a local
profile, the application treats the visitor as anonymous and returns to public
entry. A sign-out failure leaves the session visible so the operator can retry
and does not silently claim that access ended.

The backend integration must define real credential and duplicate-account
behavior, account recovery, authorization and ownership, token handling, and
network error recovery before local simulation can be replaced.

## Evidence

Current access and session behavior is covered by the [onboarding integration
tests](../../src/features/auth/onboarding.integration.test.tsx), [route access
logic](../../src/app/RouteScreens.tsx), and [local authentication
service](../../src/infrastructure/local/localAppServices.ts).
