# Fly Eye Pre-Match Experience Specification

## 1. Purpose

Fly Eye currently begins inside the live match-monitoring workflow. This feature
adds the journey an operator needs before monitoring starts:

```text
Welcome -> Register or Sign in -> Match Dashboard -> Create Match
        -> Hardware Readiness -> Live Monitor -> Clip Review -> Decision
```

This iteration is a UI-first demonstration. It must feel complete to a user,
while keeping authentication, match storage, and hardware access replaceable by
the backend and device integrations planned for the future.

## 2. Product Decisions

- The application remains UI-only in this iteration.
- Registration and sign-in are simulated locally.
- A secondary "Continue as demo" path is available.
- The operator profile, session, and matches persist in browser/Tauri local
  storage so the demonstration survives an application restart.
- Passwords, password hashes, tokens, and other secrets are never persisted.
- Camera discovery and calibration checks are simulated.
- Hardware readiness is required before entering the live monitor.
- The initial product creates standalone matches. Multiple recent matches may
  exist, but tournament grouping and management are explicitly deferred.
- Local demo matches belong to the workstation workspace and remain available
  across local profile changes. A future backend adapter will apply its own
  user, organization, or venue ownership rules.
- The product name shown throughout the application is **FLY EYE**.

## 3. Users and Roles

The initial user is a match operator who prepares a court, confirms that the
camera system is ready, monitors play, reviews a rally, and records a decision.

Admin, referee, tournament organizer, and spectator roles are outside this
iteration. The model should not prevent those roles from being introduced
later, but the UI does not expose role management now.

## 4. Information Architecture

The application uses hash-based routes so navigation works consistently in a
Tauri webview and in a normal development browser.

| Route                          | Purpose                                   | Session required |
| ------------------------------ | ----------------------------------------- | ---------------- |
| `#/welcome`                    | Product introduction and entry actions    | No               |
| `#/register`                   | Create a simulated local operator profile | No               |
| `#/sign-in`                    | Start a simulated local session           | No               |
| `#/matches`                    | Match dashboard                           | Yes              |
| `#/matches/new`                | Create a match                            | Yes              |
| `#/matches/:matchId/readiness` | Camera and calibration preflight          | Yes              |
| `#/matches/:matchId/live`      | Existing live monitor                     | Yes              |
| `#/matches/:matchId/review`    | Existing clip review                      | Yes              |
| `#/matches/:matchId/decision`  | Existing decision screen                  | Yes              |

Unknown routes return to the appropriate safe entry point: the dashboard for
an active session, otherwise the welcome page. Protected routes redirect an
unauthenticated user to the welcome page.

## 5. Functional Requirements

### 5.1 Welcome

The welcome page must:

- Introduce FLY EYE as a two-camera line-call review system.
- Make "Create account" the primary action.
- Offer "Sign in" as a normal returning-user action.
- Offer "Continue as demo" as a visually secondary development/demo action.
- Preserve the existing dark, high-contrast sports-console visual identity.

Continuing as a demo creates an ephemeral demo session and opens the match
dashboard. Demo-created matches may be stored locally, but the interface must
identify the session as a demo.

### 5.2 Registration

The registration form collects:

- Display name
- Email address
- Password
- Password confirmation

It provides accessible labels, inline validation, useful error messages, and a
link to sign in. On valid submission, it stores only the operator profile,
discards both password values, starts a simulated session, and opens the match
dashboard.

The interface must clearly describe this as demo behavior. It must not imply
that a secure remote account has been created, and it must tell users not to
enter a password they use elsewhere.

### 5.3 Sign-in

The sign-in form collects email and a demo password and provides a link to
register. In prototype mode, a syntactically valid form starts a simulated
session. When a local operator profile exists, the entered email must match
that profile. The demo password exists only to demonstrate the interaction and
is immediately discarded.

An explanatory message prevents this behavior from being mistaken for
production authentication and tells users not to enter a real password.

### 5.4 Match Dashboard

The dashboard must:

- Greet the current operator or identify the demo session.
- Make "Create match" the primary action.
- Show a realistic empty state when no matches exist.
- List locally created recent matches after they exist.
- Allow a draft match to resume at match setup or readiness.
- Allow a ready or live match to resume at the correct workflow screen.
- Provide sign-out, which clears the session but does not delete the local
  operator profile or matches.

Development fixtures may create sample matches for tests or isolated component
previews, but normal first launch must show the empty state.

### 5.5 Create Match

The first version collects:

- Event name
- Court name or number
- Competition type: singles or doubles
- Side A player/team names
- Side B player/team names
- Match format

Singles requires one player name per side. Doubles requires two player names
per side. The default badminton match format is best of three games to 21
points. The format remains explicit in the data model so alternatives can be
added later.

The form must support validation, cancel back to dashboard, and successful
creation. Successful creation stores a draft match and moves to hardware
readiness.

Tournament structure, brackets, scheduling, venues, officials, rosters, and
bulk match creation are deferred.

### 5.6 Hardware Readiness

The readiness screen presents:

- Camera A connection and health
- Camera B connection and health
- Selected calibration profile
- An overall readiness state

For this iteration, controls simulate connecting cameras and selecting a known
calibration profile. "Start monitoring" remains disabled until both cameras
and calibration are ready. The UI must make simulated states unmistakable.

Starting monitoring updates the match status and opens the live monitor.

### 5.7 Existing Match Workflow

The live monitor, clip review, and decision screens retain their existing core
behavior and visual design. They receive the selected match through application
state instead of relying exclusively on hard-coded match labels.

Completing or leaving the workflow must provide a deliberate path back to the
match dashboard. Existing development-only direct-screen support may remain if
it does not bypass production navigation or route guards.

## 6. Data Model

The exact TypeScript names may evolve during implementation, but the domain
contract must represent at least the following information.

```ts
type SessionMode = "simulated" | "demo";
type MatchStatus = "draft" | "ready" | "live" | "completed";
type CompetitionType = "singles" | "doubles";
type CameraStatus = "disconnected" | "connecting" | "ready" | "error";

interface OperatorProfile {
  id: string;
  displayName: string;
  email: string;
  createdAt: string;
}

interface Session {
  profileId: string;
  mode: SessionMode;
  startedAt: string;
}

interface MatchSide {
  displayName: string;
  players: string[];
}

interface MatchFormat {
  bestOfGames: number;
  pointsToWin: number;
}

interface MatchRecord {
  id: string;
  eventName: string;
  court: string;
  competitionType: CompetitionType;
  sideA: MatchSide;
  sideB: MatchSide;
  format: MatchFormat;
  status: MatchStatus;
  createdAt: string;
  updatedAt: string;
}

interface HardwareReadiness {
  matchId: string;
  cameraA: CameraReadiness;
  cameraB: CameraReadiness;
  calibrationProfile: CalibrationProfile | null;
}

interface CameraReadiness {
  status: CameraStatus;
  simulated: boolean;
  message?: string;
}

interface CalibrationProfile {
  id: string;
  name: string;
  simulated: boolean;
}
```

Stored objects must include a storage schema version so incompatible future
changes can be migrated or safely cleared.

Valid match progression is `draft -> ready -> live -> completed`. Returning to
setup can move a ready match back to draft, but other invalid transitions must
be rejected by the application service.

## 7. Backend Integration Boundary

React pages and components must not call `localStorage` directly. They depend
on small application service contracts such as:

```ts
interface AuthService {
  getSession(): Promise<Session | null>;
  register(input: RegistrationInput): Promise<Session>;
  signIn(input: SignInInput): Promise<Session>;
  continueAsDemo(): Promise<Session>;
  signOut(): Promise<void>;
}

interface MatchRepository {
  list(): Promise<MatchRecord[]>;
  get(id: string): Promise<MatchRecord | null>;
  create(input: CreateMatchInput): Promise<MatchRecord>;
  update(id: string, input: UpdateMatchInput): Promise<MatchRecord>;
  updateStatus(id: string, status: MatchStatus): Promise<MatchRecord>;
}

interface ReadinessService {
  get(matchId: string): Promise<HardwareReadiness>;
  save(
    matchId: string,
    input: UpdateReadinessInput,
  ): Promise<HardwareReadiness>;
}
```

This iteration supplies local adapters. A later backend integration can provide
HTTP/Tauri adapters behind the same contracts. Backend DTO mapping, token
storage, retries, network errors, and synchronization policies will be defined
when the backend API is available.

The local adapters are disposable prototype infrastructure, not an
authentication or security boundary.

Local runtime validators enforce persistence structure and reject unknown
fields. User-facing semantic rules such as required non-empty names and valid
email formatting are enforced by the onboarding and match forms.

## 8. State and Navigation Architecture

- React Router manages application routes with hash history.
- Session restoration has an explicit loading state so protected content does
  not flash before a redirect decision is known.
- A session provider owns authentication state.
- A match provider or focused application service owns match operations.
- Form state remains local to each form unless another screen needs it.
- Shared domain state uses React Context and reducers/hooks; Redux is not
  required for this scope.
- Domain services are injected or imported through a single composition layer,
  making local adapters replaceable in tests and during backend integration.
- Route components remain thin and delegate reusable UI to feature components.

## 9. Accessibility and Interaction

- Every form control has a visible label.
- Validation messages are associated with their fields and announced when
  appropriate.
- Every flow is operable by keyboard.
- Focus moves predictably after navigation and validation failure.
- Disabled readiness actions explain what remains incomplete.
- Color is not the only indicator of state.
- New screens pass the repository's automated accessibility checks.
- Layouts remain usable at the configured 1100 x 700 desktop minimum and the
  default 1440 x 900 window size.

## 10. Error and Recovery Behavior

- Invalid or corrupt local data falls back safely without crashing the app.
- Storage failures show an actionable message and preserve entered form data
  when possible.
- Missing match IDs return the operator to the dashboard with an explanation.
- Refreshing/reopening the app restores the last persisted session and match
  records, but does not automatically enter an active monitor without an
  explicit user action.
- Sign-out returns to welcome and prevents protected route access.
- Unknown routes and missing match IDs return to the dashboard or welcome page
  with an explanation instead of failing silently.

## 11. Out of Scope

- Production authentication or authorization
- Backend API integration
- Password or token persistence
- Cloud synchronization or multi-device sessions
- Real camera discovery, streaming, or health monitoring
- Calibration creation or calibration mathematics
- Tournament, bracket, schedule, venue, or roster management
- Multiple user roles and permissions
- Billing, subscriptions, or organization management

## 12. Acceptance Criteria

The feature is complete when:

1. A first-time user can launch the app, understand its purpose, and choose
   registration, sign-in, or demo mode.
2. Valid registration and sign-in lead to the match dashboard without storing
   a password.
3. A new user sees an empty dashboard and can create a singles or doubles
   match with validation.
4. The created match persists locally and appears on the dashboard after an
   application reload.
5. The operator cannot start monitoring until both simulated cameras and a
   calibration profile are ready.
6. Starting monitoring carries the created match identity into the existing
   live, review, and decision flow.
7. Protected screens cannot be opened without a simulated/demo session.
8. The UI provides clear dashboard, cancel, back, and sign-out paths.
9. Unit, interaction, routing, persistence, and accessibility tests pass.
10. Formatting, linting, type checking, production build, and security checks
    remain green.
11. Persisted storage contains no password, password confirmation, token, or
    other secret—even immediately after form submission.
12. Demo status is visible on the welcome, dashboard, readiness, and live
    screens whenever a demo session is active.
13. Direct reload of a valid hash route restores the session before rendering
    protected content; an invalid route or match ID redirects with a message.
14. Simulated camera and calibration states are identified with text, not only
    color.
15. Match status transitions reject invalid progression.
16. The existing development `?screen=` shortcut is replaced by testable hash
    routes and intentionally removed when the routing batch lands.
