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

1. A prospective operator submits the email and password information described
   by [RegisterPage](../pages/RegisterPage.md). The backend creates the account,
   then the client signs in to establish the normal session.
2. A returning operator submits the email and password information described by
   [SignInPage](../pages/SignInPage.md). The backend verifies the credentials and
   issues the normal session tokens.
3. Either successful path enters the match workspace. Invalid input or a
   rejected operation leaves the visitor anonymous and allows a safe retry.
4. Sign-out revokes the refresh token on a best-effort basis, clears the
   in-memory credentials, and returns to welcome.

The backend normalizes email addresses and rejects duplicate registration with a
structured error. The browser-only client keeps access and refresh tokens in
memory; refreshing or closing the browser requires the operator to sign in
again.

## Authentication boundary

Normal registration and sign-in use the backend authentication provider. It
owns account creation, credential verification, authorization, refresh-token
rotation, and remote failure semantics behind the replaceable application
boundary. The local provider remains for the isolated anonymous demo journey
and must not be presented as secure authentication.

Protected requests use the in-memory access token. Concurrent unauthorized
responses share one refresh operation; a successful rotation replaces both
tokens and retries each request once. A failed refresh clears credentials and
returns the operator to public entry.

The [PRD's product-wide security invariant](../product/PRD.md#sessions-and-authentication)
applies throughout this workflow. In particular, rejected operations must not
create a session, and password input must be discarded after rejection.

## Recovery and unresolved integration work

If the in-memory normal credentials are absent, expired, invalid, or rejected
by the backend, the application treats the visitor as anonymous and returns to
public entry. A logout network failure is best effort: local credentials are
still cleared and the operator returns to welcome without exposing raw response
details. Passwords and tokens are never persisted or logged.

Account recovery, email verification, and subscription entitlements remain
outside this workflow.

## Evidence

Current access and session behavior is covered by the [onboarding integration
tests](../../src/features/auth/onboarding.integration.test.tsx), [route access
logic](../../src/app/RouteScreens.tsx), [backend authentication
adapter](../../src/infrastructure/backend/auth.ts), and [local demo
service](../../src/infrastructure/local/localAppServices.ts).
