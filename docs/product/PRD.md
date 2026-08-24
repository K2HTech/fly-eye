# Fly Eye Product Requirements

Status: Current product baseline

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
- Support the current 3-by-21 and 3-by-15 best-of-three scoring formats,
  with 3-by-21 as the default during the transition period.
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
format remains explicit for the match and is either best-of-three games to 21
or best-of-three games to 15.

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

Future work may replace the local adapters with backend authentication,
authorization and ownership rules; synchronize matches and results; and add
real camera, calibration, tracking, and inference integrations. Network DTOs,
token handling, retries, synchronization policy, and recovery semantics remain
undefined until those external contracts exist.

Tournament management and additional user roles remain deferred. The product
owner should decide the eventual organization, venue, and match-ownership
model before backend integration is specified.

## Evidence

The current implementation and behavioral tests provide evidence for this
baseline, including the [authentication and demo surfaces](../../src/features/auth/WelcomePage.tsx),
[demo trial rules](../../src/domain/demoTrial.ts),
[match transition rules](../../src/domain/matchTransitions.ts), and
[local-service behavior](../../src/infrastructure/local/localAppServices.ts).
