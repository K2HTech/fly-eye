# RegisterPage

Status: Current

- Route: `#/register`
- Primary source: [`RegisterPage.tsx`](../../src/features/auth/RegisterPage.tsx)
- Relevant behavioral tests:
  [`onboarding.integration.test.tsx`](../../src/features/auth/onboarding.integration.test.tsx),
  [`authValidation.test.ts`](../../src/features/auth/authValidation.test.ts)

## Purpose

The registration page lets a new operator create the backend account used to
create and manage matches.

## Actors and entry conditions

- An anonymous prospective operator may open the page.
- A returning operator may switch to sign-in instead.
- An operator with an active session proceeds to the match workspace rather
  than creating another identity from the public route.

## Business rules

- Registration collects an email address, password, and password confirmation.
- The backend owns account creation and credential verification. The browser
  sends only the email and password required by the backend registration
  contract; password confirmation is a transient client-side guard.
- The backend requires passwords from 12 through 128 characters. The page
  validates the minimum before making a request.
- A successful registration is followed by backend login so registration and
  sign-in produce the same authenticated workspace state.
- No backend display-name field exists. Normal operator identity is presented
  using the authenticated email address.
- Password input and confirmation are cleared after a rejected submission and
  are never persisted, logged, or included in public error details.
- Shared registration and session rules are owned by the
  [authentication workflow](../workflows/AuthenticationWorkflow.md).

## Meaningful states

- **Ready:** The prospective operator can enter account details or choose
  sign-in.
- **Invalid input:** The first actionable problem is identified without an
  account or session being created.
- **Registration rejected:** The operator remains signed out, safe non-secret
  input remains recoverable, password fields are cleared, and a sanitized
  error is announced.
- **Submitting:** Duplicate account-creation requests are prevented.

## Actions and consequences

| Action         | Business consequence                                                  |
| -------------- | --------------------------------------------------------------------- |
| Create account | Creates the backend account and starts a session when accepted.       |
| Sign in        | Leaves new-account entry and opens returning-operator authentication. |

## Navigation

- Successful registration continues to `#/matches`.
- Sign-in continues to `#/sign-in`.
- Anonymous cancellation through the shared authentication shell returns to
  `#/welcome`.

## Open questions

- Account recovery, email verification, and subscription entitlements are not
  part of the current registration journey.
