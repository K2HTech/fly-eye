# WelcomePage

Status: Current

- Route: `#/welcome`
- Primary source: [`WelcomePage.tsx`](../../src/features/auth/WelcomePage.tsx)
- Relevant behavioral tests:
  [`onboarding.integration.test.tsx`](../../src/features/auth/onboarding.integration.test.tsx),
  [`App.test.tsx`](../../src/App.test.tsx)

## Purpose

The welcome page introduces Fly Eye to a prospective operator and provides the
three supported ways to enter the product: create an account, sign in, or try a
time-limited live demo without registration.

## Actors and entry conditions

- An anonymous visitor may open the page directly.
- An anonymous visitor who attempts to open protected operator content returns
  here rather than seeing that content.
- An operator with an active non-demo session proceeds to the match workspace
  instead of re-entering the public onboarding flow.

## Business rules

- Sign-up and sign-in are the normal account entry paths.
- **Run the live demo** remains available without registration so a prospective
  operator can experience the product before subscribing.
- Entering the demo creates one isolated demonstration match and opens its
  hardware-readiness step. It does not expose the normal match dashboard or
  another match.
- Demo duration and access restrictions are owned by the
  [demo-trial workflow](../workflows/DemoTrialWorkflow.md).
- Product claims on the page must distinguish demonstrated UI behavior,
  product targets, and capabilities delivered by future hardware or processing
  integrations.

## Meaningful states

- **Ready:** Account entry and demo actions are available.
- **Opening demo:** Repeated demo requests are prevented while the isolated
  workspace is prepared.
- **Demo failure:** The incomplete demo session is cleared, the visitor remains
  on the welcome page, and retry remains possible.
- **Redirect notice:** A visitor returned from an invalid or protected location
  may receive a plain-language explanation.

## Actions and consequences

| Action            | Business consequence                                                       |
| ----------------- | -------------------------------------------------------------------------- |
| Sign up           | Opens account registration.                                                |
| Sign in           | Opens returning-operator authentication.                                   |
| Run the live demo | Creates an isolated demo session and match, then opens hardware readiness. |

## Navigation

- Sign-up continues to `#/register`.
- Sign-in continues to `#/sign-in`.
- A successfully prepared demo continues to its generated
  `#/matches/:matchId/readiness` route.
- The [authentication workflow](../workflows/AuthenticationWorkflow.md) owns
  public-route and active-session navigation rules.

## Open questions

- The current landing copy refers to real match footage while the implemented
  monitor uses simulated court imagery. The approved wording must be resolved
  before production release.
- Frame-rate, capture-window, confidence, and accuracy values shown as product
  claims need confirmation as requirements or explicit illustrative targets.
