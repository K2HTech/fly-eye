# RegisterPage

Status: Current

- Route: `#/register`
- Primary source: [`RegisterPage.tsx`](../../src/features/auth/RegisterPage.tsx)
- Relevant behavioral tests:
  [`onboarding.integration.test.tsx`](../../src/features/auth/onboarding.integration.test.tsx),
  [`authValidation.test.ts`](../../src/features/auth/authValidation.test.ts)

## Purpose

The registration page lets a new operator establish the account identity used
to create and manage matches.

## Actors and entry conditions

- An anonymous prospective operator may open the page.
- A returning operator may switch to sign-in instead.
- An operator with an active session proceeds to the match workspace rather
  than creating another identity from the public route.

## Business rules

- Registration collects the operator's display name, email, password, and
  password confirmation.
- The current UI-only implementation creates a local operator identity; the
  future backend will own real account creation and credential verification.
- Credential handling and secret-persistence invariants are owned by the
  [authentication workflow](../workflows/AuthenticationWorkflow.md).
- Registration starts an operator session only after the active registration
  provider accepts the submission.
- Shared registration and session rules are owned by the
  [authentication workflow](../workflows/AuthenticationWorkflow.md).

## Meaningful states

- **Ready:** The prospective operator can enter account details or choose
  sign-in.
- **Invalid input:** The first actionable problem is identified without an
  account or session being created.
- **Registration rejected:** The operator remains signed out, non-secret input
  remains recoverable where safe, and password fields are cleared.
- **Submitting:** Duplicate account-creation requests are prevented.

## Actions and consequences

| Action         | Business consequence                                                  |
| -------------- | --------------------------------------------------------------------- |
| Create account | Creates the operator identity and starts a session when accepted.     |
| Sign in        | Leaves new-account entry and opens returning-operator authentication. |

## Navigation

- Successful registration continues to `#/matches`.
- Sign-in continues to `#/sign-in`.
- Anonymous cancellation through the shared authentication shell returns to
  `#/welcome`.

## Open questions

- The local adapter currently reuses an existing email and updates its display
  name instead of reporting that the account already exists. Production
  duplicate-account behavior must be specified with backend integration.
