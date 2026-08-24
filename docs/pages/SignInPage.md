# SignInPage

Status: Current

- Route: `#/sign-in`
- Primary source: [`SignInPage.tsx`](../../src/features/auth/SignInPage.tsx)
- Relevant behavioral tests:
  [`onboarding.integration.test.tsx`](../../src/features/auth/onboarding.integration.test.tsx),
  [`authValidation.test.ts`](../../src/features/auth/authValidation.test.ts)

## Purpose

The sign-in page lets a returning operator resume their match workspace using
the standard email-and-password interaction expected by the future production
service.

## Actors and entry conditions

- An anonymous returning operator may open the page.
- An operator who needs a new identity may switch to registration.
- An operator with an active session proceeds to the match workspace rather
  than opening the sign-in form again.

## Business rules

- Email and password are required as the intended production authentication
  credentials.
- The current UI-only implementation uses a local operator profile and does not
  provide production authentication. This boundary is owned by the
  [authentication workflow](../workflows/AuthenticationWorkflow.md).
- Credential handling and rejected-attempt invariants are owned by the
  [authentication workflow](../workflows/AuthenticationWorkflow.md).

## Meaningful states

- **Ready:** The returning operator can submit credentials or choose sign-up.
- **Invalid input:** The operator receives actionable field guidance without a
  session being created.
- **Authentication rejected:** The operator remains signed out, receives a
  non-sensitive error, and can retry.
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

No page-specific product questions are currently open. Production credential
verification, account recovery, and remote errors will be specified with the
backend authentication integration.
