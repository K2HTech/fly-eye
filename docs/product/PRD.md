# Fly Eye Product Requirements

Status: Current product baseline with approved implementation gaps

## Product problem and value

Officials and match operators need a fast, consistent way to review a close
line call. Fly Eye is an operator console for preparing a match, monitoring
play, inspecting synchronized evidence, and recording the resulting call. Its
value is a clear review journey that helps an operator reach and explain a
decision without relying on an informal replay process.

The current product is a production-oriented UI demonstration. It makes the
operator journey concrete while keeping device processing and account services
replaceable until their external contracts are defined.

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
match review. The current release includes local, replaceable adapters so the
journey can be exercised without a remote service or connected camera system.

The following are outside the current product boundary:

- Camera capture, calibration, tracking, shuttle/ball inference, and any other
  physical-device or processing implementation.
- A remote authentication service, account security boundary, or backend match
  synchronization.
- Tournament structure, brackets, scheduling, venues, officials, rosters, and
  bulk match creation.

The UI must distinguish simulated states and evidence from real hardware or
inference. Local adapters are demonstration infrastructure, not production
security or data-integrity guarantees.

## Major capabilities

- Introduce Fly Eye and offer account-shaped sign-up, returning-user sign-in,
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

Normal registration and sign-in are local simulations in this release. A
registration creates an account-shaped local operator profile and session;
sign-in starts a simulated session subject to the local profile rules. The UI
must not imply that a secure remote account has been created or that a password
has been securely verified. Passwords, hashes, tokens, and other authentication
secrets are never persisted.

### Demo access

Demo access does not require registration. Demo setup is untimed: the trial
clock starts only when the operator confirms **Start monitoring**, and the
trial lasts no more than 15 minutes. A demo session is visibly identified and
is locked to one generated match; it cannot be used to create or work on a
second match. After expiry, the operator must leave the demo or sign up to
continue.

### Match lifecycle

The initial product handles standalone matches. Its normal progression is
`draft` to `ready` to `live` to `completed`; returning from readiness setup may
move a ready match back to draft. Readiness requires both cameras and a selected
calibration profile to report ready, even though those checks are simulated in
the current UI. Other invalid status transitions are not permitted.

Singles has one participant per side; doubles has two. The selected scoring
format remains explicit for the match. Match length is either one game or best
of three games; the per-game point target is independently either 15 or 21.

Normal match lists are scoped to the signed-in operator. One operator must not
see another operator's matches merely because they use the same computer. Demo
matches remain isolated from every normal operator account.

A match becomes completed only through a deliberate **End match** action. One
line-call decision does not end the match because the operator may return to
monitoring for later rallies. Umpire-controlled scoring and automatic game or
match completion are deferred.

## Success criteria

The product baseline is successful when an operator can understand the value
of Fly Eye and complete the full entry-to-decision journey in the UI; when a
new demo user can begin without registration and is constrained by the stated
trial rules; when a normal local session can create and resume standalone
matches; and when simulated hardware and evidence are clearly presented as
simulated rather than claimed as live processing.

The interface must remain usable with keyboard navigation and accessible
labels and status communication, and must work consistently in the browser and
the Tauri desktop webview.

## Current limitations and deferred integrations

The current UI does not capture camera input, calibrate physical devices,
track objects, infer line calls, or connect to a remote backend. Monitoring,
review evidence, and recorded results therefore represent the operator journey
and simulated data rather than a production adjudication system.

Three approved product rules are not yet implemented: match length and point
target are still coupled into best-of-three presets, local match records are
still workstation-wide rather than separated by operator, and the live
workspace does not yet provide **End match**. These are implementation gaps,
not changes to the approved product rules above.

Future work may replace the local adapters with backend authentication,
authorization and ownership rules; synchronize matches and results; and add
real camera, calibration, tracking, and inference integrations. Network DTOs,
token handling, retries, synchronization policy, and recovery semantics remain
undefined until those external contracts exist.

Tournament management and additional user roles remain deferred. Backend
integration must preserve operator-separated match lists while defining the
eventual organization, venue, and tournament ownership model.

## Evidence

The current implementation and behavioral tests provide evidence for this
baseline, including the [authentication and demo surfaces](../../src/features/auth/WelcomePage.tsx),
[demo trial rules](../../src/domain/demoTrial.ts),
[match transition rules](../../src/domain/matchTransitions.ts), and
[local-service behavior](../../src/infrastructure/local/localAppServices.ts).
