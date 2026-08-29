# SignInPage

Status: Current

- Route: `#/sign-in`
- Primary source: [`SignInPage.tsx`](../../src/features/auth/SignInPage.tsx)
- Relevant behavioral tests:
  [`onboarding.integration.test.tsx`](../../src/features/auth/onboarding.integration.test.tsx),
  [`authValidation.test.ts`](../../src/features/auth/authValidation.test.ts)

## Purpose

The sign-in page lets a returning operator authenticate with the Fly Eye
backend and resume their match workspace.

## Actors and entry conditions

- An anonymous returning operator may open the page.
- An operator who needs a new identity may switch to registration.
- An operator with an active session proceeds to the match workspace rather
  than opening the sign-in form again.

## Business rules

- Sign-in collects an email address and password.
- The backend normalizes email addresses and verifies credentials. The page
  performs client-side validation before making a request.
- The backend requires passwords from 12 through 128 characters.
- A successful sign-in establishes an in-memory access/refresh-token session;
  tokens are not persisted in browser storage.
- After a browser refresh, the normal session is unavailable and the operator
  must sign in again during this browser-only phase.
- Password input is cleared after a rejected submission and is never persisted,
  logged, or included in public error details.
- Credential handling and rejected-attempt invariants are owned by the
  [authentication workflow](../workflows/AuthenticationWorkflow.md).

## Meaningful states

- **Ready:** The returning operator can submit credentials or choose sign-up.
- **Invalid input:** The operator receives actionable field guidance without a
  session being created.
- **Authentication rejected:** The operator remains signed out, receives a
  sanitized non-sensitive error, and can retry.
- **Submitting:** Duplicate sign-in attempts are prevented.

## Actions and consequences

| Action  | Business consequence                                                                        |
| ------- | ------------------------------------------------------------------------------------------- |
| Sign in | Starts an operator session when the active authentication provider accepts the credentials. |
| Sign up | Leaves returning-operator entry and opens registration.                                     |

## Navigation

- Successful sign-in continues to `#/matches`.
- Sign-up continues to `#/register`.
- Anonymous cancellation through the shared authentication shell returns to
  `#/welcome`.

## Open questions

- Account recovery and email verification are not part of the current sign-in
  journey.
