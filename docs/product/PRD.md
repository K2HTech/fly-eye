# Fly Eye Product Requirements

Status: Current product baseline with approved implementation gaps

## Product problem and value

Officials and match operators need a fast, consistent way to review a close
line call. Fly Eye is an operator console for preparing a match, monitoring
play, inspecting synchronized evidence, and recording the resulting call. Its
value is a clear review journey that helps an operator reach and explain a
decision without relying on an informal replay process.

The current product is a production-oriented UI with replaceable service
adapters. The backend owns normal accounts and normal matches, while device
processing remains outside this repository until its external contracts are
implemented.

## Target operator

The initial user is a match operator who prepares a court, confirms that the
camera setup is ready, monitors play, reviews a rally, and records a decision.
The product is designed for a desktop or native desktop-like operating
environment used during a match.

Admin, referee, tournament-organizer, and spectator roles are not exposed in
the current product. The model should remain extensible for those roles, but
their permissions and workflows are not yet product requirements.

## Product scope and boundaries

Fly Eye owns the operator-facing interface and the journey from entry through
match review. Normal accounts and standalone matches use replaceable
remote-backend adapters. The anonymous demo, readiness progress, and UI-only
scoring supplements use local adapters until their approved integration
batches are delivered.

The following are outside the current product boundary:

- Camera capture, calibration, tracking, shuttle/ball inference, and any other
  physical-device or processing implementation.
- The backend services themselves. Fly Eye consumes authentication, matches,
  and camera records through application adapters; later batches add pairing
  without moving server ownership into this repository.
- Tournament structure, brackets, scheduling, venues, officials, rosters, and
  bulk match creation.

The UI must distinguish simulated states and evidence from real hardware or
inference. Local adapters are demonstration infrastructure, not production
security or data-integrity guarantees.

## Major capabilities

- Introduce Fly Eye and offer backend account sign-up, returning-user sign-in,
  or an isolated demo entry.
- Let an operator create and revisit standalone matches for singles or doubles
  competition.
- Let the operator choose match length independently as one game or best of
  three games, and choose a 15-point or 21-point target for each game.
- Guide the operator through camera and calibration readiness before
  monitoring can begin.
- Present the live-monitoring, synchronized clip-review, evidence, and
  decision-recording journey for a line call.
- Preserve local UI state across an application restart while keeping the
  storage and service seams replaceable.

## Product-wide rules

### Sessions and authentication

Normal registration and sign-in use the backend authentication service. A
registration sends an email and 12-to-128-character password, then signs in to
establish the normal session. Sign-in verifies the same credentials through the
backend. The browser keeps access and refresh tokens in memory only; a browser
refresh requires sign-in again during this browser-only phase. Passwords,
hashes, tokens, and other authentication secrets are never persisted, logged,
or exposed in UI errors. The backend user has no display name, so the
authenticated email is the normal operator identity.

The local authentication adapter remains only for the isolated anonymous demo
path and must not be presented as secure remote authentication.

### Demo access

Demo access does not require registration. Demo setup is untimed: the trial
clock starts only when the operator confirms **Start monitoring**, and the
trial lasts no more than 15 minutes. A demo session is visibly identified and
is locked to one generated match; it cannot be used to create or work on a
second match. After expiry, the operator must leave the demo or sign up to
continue.

Continued production access is expected to require a subscription, but plans,
billing, entitlements, and enforcement are not defined or implemented in the
current UI.

### Match lifecycle

The initial product handles standalone matches. Its normal progression is
`draft` to `ready` to `live` to `completed`; returning from readiness setup may
move a ready match back to draft. Readiness requires both cameras and a selected
calibration profile to report ready, even though those checks are simulated in
the current UI. Other invalid status transitions are not permitted.

Singles has one participant per side; doubles has two. The selected scoring
format remains explicit for the match. Match length is either one game or best
of three games; the per-game point target is independently either 15 or 21.

Normal match lists are backend-scoped to the signed-in operator. One operator
must not see another operator's matches merely because they use the same
computer. Demo matches remain isolated from every normal operator account.

The backend match contract does not yet store match length or the point target.
The UI stores only those two selected scoring values locally, keyed by the
backend match UUID. An unknown backend match uses best-of-three/21 locally;
this is a temporary non-synchronized limitation, not a claim about the
match's official rules.

A match becomes completed only through a deliberate **End match** action. One
line-call decision does not end the match because the operator may return to
monitoring for later rallies. Umpire-controlled scoring and automatic game or
match completion are deferred.

### Line-call authority

Fly Eye supports two line-call results: **IN** and **OUT**. The system presents
the available evidence and confidence information to help the umpire reach a
decision, but the umpire retains final authority over the call.

`INCONCLUSIVE` is not an approved line-call result. Missing evidence or a
processing failure is a workflow failure that must offer a clear recovery
path; it must not be recorded as a third verdict.

## Success criteria

The product baseline is successful when an operator can understand the value
of Fly Eye and complete the full entry-to-decision journey in the UI; when a
new demo user can begin without registration and is constrained by the stated
trial rules; when a normal backend session can create and resume standalone
matches; and when simulated hardware and evidence are clearly presented as
simulated rather than claimed as live processing.

The interface must remain usable with keyboard navigation and accessible
labels and status communication, and must work consistently in the browser and
the Tauri desktop webview.

## Current limitations and deferred integrations

The current UI does not capture camera input, calibrate physical devices,
track objects, infer line calls, record evidence, or provide a production
adjudication system. Monitoring, review evidence, and recorded results still
represent the operator journey and simulated data until those integrations are
implemented.

The live workspace does not yet provide **End match**. This is an
implementation gap, not a change to the approved product rules above.

Future work may add account recovery, email verification, subscription
entitlements, result synchronization, and real camera, calibration, tracking,
and inference integrations. Network retries, synchronization policy, and
processing recovery semantics remain subject to their external contracts.

Tournament management and additional user roles remain deferred. Backend
integration must preserve operator-separated match lists while defining the
eventual organization, venue, and tournament ownership model.

## Evidence

The current implementation and behavioral tests provide evidence for this
baseline, including the [authentication and demo surfaces](../../src/features/auth/WelcomePage.tsx),
[backend authentication adapter](../../src/infrastructure/backend/auth.ts),
[demo trial rules](../../src/domain/demoTrial.ts),
[match transition rules](../../src/domain/matchTransitions.ts), and
[local-service behavior](../../src/infrastructure/local/localAppServices.ts).
