# Browser Camera Pairing Implementation Plan

Status: Approved on 2026-08-29

This plan implements the approved React responsibilities from
[SPEC.md](SPEC.md). Each batch stops for product-owner review. An approved batch
is committed separately before the next batch begins, and no push occurs
without immediate explicit permission.

The existing uncommitted welcome-page copy correction is unrelated work. It
must be approved and committed separately before the first implementation batch
so it is never mixed into camera commits.

## Dependency graph

```text
Batch 0: specification and plan
  -> Batch 1: backend configuration and normal authentication
     -> Batch 2: backend normal matches and camera records
        -> Batch 3: pairing protocol and session model
           -> Batch 4: browser signaling/WebRTC adapter
              -> Batch 5: application camera lifecycle
                 -> Batch 6: readiness pairing experience
                    -> Batch 7: live-monitor video integration
                       -> Batch 8: acceptance and closeout
```

The sequence is intentionally strict because later UI batches consume the
contracts and lifecycle established earlier. Parallel work is used only within
a batch when agents can own disjoint files.

## Batch 0 — Lock the feature

### Outcome

The product owner can review the complete React scope, mobile/signaling
interoperability contract, failure behavior, security constraints, and
implementation order before code changes begin.

### Files owned

- `docs/work/active/browser-camera-pairing/SPEC.md`
- `docs/work/active/browser-camera-pairing/PLAN.md`
- `docs/work/active/browser-camera-pairing/SIGNALING-SERVER-HANDOFF.md`
- `docs/work/README.md`
- `docs/README.md`

### Validation

- Run Prettier on the active feature documents and documentation maps.
- Run `git diff --check`.
- Verify that unrelated welcome-page changes are unchanged.

### Review evidence

- Product-owner approval of both `SPEC.md` and `PLAN.md`.
- Confirmation that the specification matches the implemented backend and
  Flutter contract.

### Proposed commit

`docs(camera): specify browser camera pairing`

## Batch 1 — Backend configuration and normal authentication

### Outcome

Normal registration, sign-in, refresh, session lookup, and logout use the
implemented backend contract. Browser configuration contains public endpoint
values only, authentication secrets remain in memory, and anonymous demo keeps
its existing local behavior.

### Work

- Add `.env.example` with empty `VITE_API_BASE_URL`,
  `VITE_SIGNALING_URL`, and `VITE_CAMERA_SIMULATOR_ENABLED` values.
- Add strict frontend configuration parsing that rejects missing/invalid
  production URLs and prevents the simulator in production.
- Define runtime-validated backend auth DTOs and sanitized HTTP errors.
- Implement an HTTP client with bearer injection, request correlation IDs,
  one shared refresh operation for concurrent `401` responses, and one replay
  maximum.
- Implement backend register, token, refresh, logout, and current-user calls.
- Keep access/refresh tokens in a process-memory credential store and clear
  them on refresh failure, sign-out, or application teardown.
- Compose backend normal auth with the unchanged local anonymous-demo path.
- Present backend email as the normal operator identity; remove unsupported
  display-name registration behavior for normal accounts.
- Update sign-in/register/session tests for success, validation, sanitized
  errors, refresh rotation, duplicate `401`, logout, and browser reload.
- Update canonical authentication product/page/workflow documentation in the
  same batch because normal authentication stops being simulated.

### Expected file ownership

- One owner: backend configuration, HTTP/auth adapters, and focused tests.
- One owner: auth service composition/provider changes and integration tests.
- One owner: sign-in/register UI adjustments and canonical auth documents.

No two owners edit the same service export or provider file.

### Validation

- Focused auth/config/HTTP tests.
- Existing onboarding, session-provider, route-access, and accessibility
  tests.
- `task check:quality`.

### Review evidence

- Normal sign-in enters the app using controlled backend responses.
- Refresh rotation and retry behavior are demonstrated by tests.
- Browser storage contains no password, access token, or refresh token.
- Demo entry behaves as before and makes no backend auth request.

### Proposed commit

`feat(auth): connect normal sessions to backend`

## Batch 2 — Backend normal matches and camera records

### Outcome

Normal users create, list, and resume backend-owned matches. The existing
scoring selection remains an explicitly local supplement keyed by the backend
UUID. Hardware setup obtains exactly one `SIDELINE_LEFT` and one
`SIDELINE_RIGHT` backend camera UUID for later pairing. Demo matches remain
local and unchanged.

### Work

- Define runtime-validated backend match/camera DTOs and mapping functions.
- Map event/court/competition/participants to backend
  title/venue/format/players and set `scheduledAt` to creation time.
- Generate stable UUID `clientRequestId` values for match and camera retries.
- Implement backend normal match list/get/create/update/status operations,
  cursor handling needed by the current dashboard, and sanitized error mapping.
- Map backend `draft`, `live`, and `finished` to the UI lifecycle while keeping
  readiness as an application gate.
- Add a versioned local supplemental-scoring adapter containing only
  `bestOfGames` and `pointsToWin` keyed by backend match UUID.
- Default backend matches without local scoring to best-of-three/21 and label
  the non-synchronized limitation where relevant.
- Compose backend normal matches with the unchanged local demo repository.
- Add a backend camera-registry service that lists existing camera records,
  creates missing `SIDELINE_LEFT`/`SIDELINE_RIGHT` device records, rejects
  ambiguous/unsupported sets, and never duplicates compatible records.
- Use non-secret opaque `sourceRef` values and 1280x720/30 FPS preview targets;
  do not claim these targets satisfy later analysis capture requirements.
- Update normal create/dashboard/readiness integration tests and canonical
  match-preparation documentation.

### Expected file ownership

- One owner: backend match adapter/mappers and focused tests.
- One owner: supplemental-scoring adapter and focused tests.
- One owner: backend camera registry and focused tests.
- The orchestrator owns shared service contracts, composition, and integration
  tests after the disjoint adapters are ready.

### Validation

- Focused match/camera/scoring adapter tests.
- Existing create-match, dashboard, match-provider, readiness, and storage
  tests.
- `task check:quality`.

### Review evidence

- A normal match response retains its backend UUID through dashboard and
  readiness navigation.
- A 15- or 21-point selection is restored locally for the same UUID, while an
  unknown backend match receives the documented default.
- Reopening readiness reuses the same two backend cameras in left/right role
  order.
- Demo flow remains entirely local.

### Proposed commit

`feat(matches): connect normal setup to backend`

## Batch 3 — Protocol and ephemeral session model

### Outcome

The repository has framework-light, runtime-validated contracts for QR
pairing, signaling envelopes, mobile status/control messages, backend camera
roles, connection states, and public errors. A deterministic state machine
rejects stale or cross-session events before browser networking or UI is
introduced.

### Work

- Define the version-one QR payload and serializer.
- Define and validate the implemented backend pairing-session response without
  generating server-owned identifiers or tokens in React.
- Define signaling and data-channel message discriminated unions plus runtime
  validators.
- Define ephemeral camera-session snapshots and allowed state transitions.
- Define sanitized public error codes/messages.
- Keep tokens and ICE details out of persistence-safe domain models.
- Add exhaustive tests for valid contracts, malformed/unknown fields,
  unsupported versions, expiry, stale events, camera mismatch, malformed
  server-owned credentials, and error sanitization.

### Expected file ownership

- One owner: new camera protocol/domain modules under `src/features/cameras/`.
- A separate owner may write their corresponding test files after public types
  are fixed; no implementation file is shared.

No existing route component is edited in this batch.

### Validation

- Focused camera protocol/domain tests.
- `npm run typecheck`.
- `npm run lint`.
- `npm run format:check`.

### Review evidence

- Tests demonstrating that secrets are ephemeral and invalid external data
  cannot enter session state.
- No visible application behavior changes.

### Proposed commit

`feat(camera): define pairing protocol and session model`

## Batch 4 — Browser signaling and WebRTC adapter

### Outcome

A replaceable browser adapter can create a signaling session, answer a Flutter
offer, exchange trickle ICE, receive a video track/data channel, expose bounded
stats, and close every resource. Tests use controlled browser/WebSocket fakes;
route components remain unaware of transport mechanics.

### Work

- Define the UI-facing camera connection service/factory contract.
- Implement the authenticated HTTPS pairing-session client against
  `POST /api/v1/camera-pairings` and sanitize its failures.
- Implement the WebSocket signaling transport with runtime message validation,
  heartbeat, bounded retry, stale-event guards, and cancellation.
- Implement one peer connection per service session.
- Queue early ICE candidates until the remote description is installed.
- Receive one video track, reject/ignore audio, and accept the approved control
  data channel.
- Validate camera status and command-result messages.
- Sample `getStats()` at a bounded interval and derive safe diagnostics.
- Classify direct versus relayed selected candidates where available.
- Implement idempotent cleanup for cancel, replacement, peer departure,
  connection failure, and browser unload.
- Detect missing secure context, WebSocket, `RTCPeerConnection`, media-stream,
  or `srcObject` support.

### Expected file ownership

- One owner: service contracts and camera feature interfaces.
- One owner: browser signaling transport.
- One owner: browser peer connection/stats adapter and its tests.

Shared exports are assigned to one owner and changed only after the other work
is ready to integrate.

### Validation

- Focused adapter tests covering offer/answer, early ICE, invalid messages,
  timeout/retry, data-channel validation, stats, and cleanup.
- `npm run typecheck`.
- `npm run lint`.
- `npm run format:check`.

### Review evidence

- A test transcript/state sequence showing successful connection and teardown.
- Evidence that no secret or raw external error enters public state.
- No visible application behavior changes.

### Proposed commit

`feat(camera): add browser WebRTC connection adapter`

## Batch 5 — Application camera lifecycle

### Outcome

An application-level provider owns the `SIDELINE_LEFT` and `SIDELINE_RIGHT`
connections independently across same-match route changes. It prevents
duplicate StrictMode sessions, disconnects on sign-out or match switch, and
presents a stable hook to readiness and live surfaces.

### Work

- Compose the browser camera adapter at the application boundary.
- Add a provider/controller above match workflow routes, not inside individual
  page cards.
- Expose independent role-keyed snapshots, media streams, pairing actions,
  control actions, and cleanup through a narrow context.
- Tie sessions to the current match without persisting them.
- Preserve connections across readiness/live/review/decision navigation for
  the same match.
- Close connections on sign-out, match switch, protected-workflow exit,
  provider teardown, and browser unload.
- Guard every async callback with session identity/versioning so replaced
  sessions cannot update current state.
- Supply injected fakes for integration tests.

### Expected file ownership

- One owner: provider/context and composition changes.
- One owner: provider lifecycle tests and test doubles.

### Validation

- Focused provider tests for independent roles, StrictMode, navigation
  preservation, stale events, sign-out, match switch, and teardown.
- Existing provider and route-access tests.
- `npm run typecheck`.
- `npm run lint`.
- `npm run format:check`.

### Review evidence

- Tests showing same-match preservation and cleanup at every approved boundary.
- No camera session data in local storage or persisted domain models.

### Proposed commit

`feat(camera): manage match camera sessions`

## Batch 6 — Hardware-readiness pairing experience

### Outcome

The operator can generate an accessible QR code for either camera, observe the
pairing lifecycle, recover from expiry/errors, inspect live health, and
disconnect or replace a phone. The monitoring gate uses actual active video
readiness rather than simulated camera status.

### Work

- Add the audited, locally rendered SVG QR dependency and lockfile update.
- Replace simulated camera status cycling with real pairing actions and states.
- Add the accessible pairing dialog, expiry countdown, cancel, regenerate,
  retry, and focus behavior.
- Show connected metadata and a compact video/first-frame confirmation without
  fabricated values.
- Keep calibration visibly simulated and independently persisted.
- Derive the monitoring gate from two current ready streams plus calibration.
- Keep the anonymous demo on its existing simulated path; it does not consume
  the real-camera provider or protected pairing API.
- Prevent a live match with missing ephemeral cameras from bypassing setup.
- Add responsive styles, reduced-motion behavior, component/integration tests,
  and an Axe scan for readiness.

### Expected file ownership

- One owner: pairing dialog/card React components.
- One owner: readiness page integration and behavioral tests.
- One owner: readiness/pairing CSS and responsive states.

The lockfile/dependency manifest has one designated owner.

### Validation

- Focused readiness and pairing tests.
- Accessibility scan for all meaningful readiness states.
- Existing demo-isolation, demo-timer, and match-transition tests.
- `task check:quality`.
- Manual visual review at wide and narrow desktop widths using injected camera
  states.

### Review evidence

- Screenshots or operator-run UI for disconnected, awaiting scan, negotiating,
  connected, expired, and error states.
- Demonstration that demo behavior is unchanged and isolated from protected
  pairing.

### Proposed commit

`feat(camera): pair phones from hardware readiness`

## Batch 7 — Real live-monitor previews

### Outcome

The live monitor renders `SIDELINE_LEFT` and `SIDELINE_RIGHT` streams in the
left and right panels with actual health and diagnostics. Hard-coded camera
court images and fabricated camera performance values no longer represent
connected feeds, while simulated review behavior is explicitly labelled.

### Work

- Introduce a reusable video-surface component that attaches/detaches
  `MediaStream` through `srcObject` without copying frames into React state.
- Feed current match camera sessions into the live route and monitor.
- Replace connected court SVG fixtures with muted, autoplaying, inline video.
- Render disconnected/reconnecting/error overlays independently by backend
  camera role.
- Use real reported/measured resolution, FPS, and connection-path data when
  available; show unavailable otherwise.
- Add a persistent route back to readiness when repair is required.
- Label rolling-buffer and review behavior as simulated and unrelated to the
  phone preview.
- Preserve F1/review navigation and same-match camera sessions.
- Add rendering, stream-attachment, loss, recovery, navigation, and
  accessibility tests.

### Expected file ownership

- One owner: reusable video surface and unit tests.
- One owner: live-monitor React integration and tests.
- One owner: live-monitor styling and responsive states.

### Validation

- Focused live-monitor and workflow-navigation tests.
- Existing operator accessibility suite plus new live states.
- `task check:quality`.
- Manual browser test using synthetic/injected `MediaStream` where supported.

### Review evidence

- Side-by-side left/right live-state UI labelled with backend camera roles.
- Independent camera-loss and return-to-readiness behavior.
- Visible simulation disclosure around the review workflow.

### Proposed commit

`feat(camera): render live phone previews`

## Batch 8 — End-to-end hardening and closeout

### Outcome

The React implementation is exercised against the real Flutter application and
signaling infrastructure, documented as current behavior, and closed out
without overstating Tauri, recording, synchronization, or adjudication support.

This batch requires the deployed backend/signaling environment, compatible
Flutter builds, and two test phones described in the specification.

### Work

- Confirm the deployed signaling behavior against the implemented backend
  contract and fix integration-only mismatches without changing product rules
  silently.
- Run one-phone, two-phone, expiry, duplicate-camera, disconnect, reconnection,
  same-LAN direct, TURN relay, and 15-minute stability checks in Chrome.
- Measure QR-to-first-frame and glass-to-glass latency using the approved
  methods.
- Verify secrets are absent from browser storage, release logs, and visible
  errors.
- Update the PRD, hardware-readiness page, live-monitor page,
  match-preparation workflow, architecture, and quality requirements with
  durable delivered behavior.
- Add an architecture decision describing direct browser WebRTC, external
  signaling, ephemeral connection ownership, and deferred Tauri support.
- Record any accepted deviations in `SPEC.md`.
- Mark the specification implemented, archive it under
  `docs/work/archive/2026/browser-camera-pairing/SPEC.md`, delete `PLAN.md`, and
  remove the empty active directory.

### Expected file ownership

- One owner: integration fixes and automated tests.
- One owner: canonical product/page/workflow documentation.
- One owner: architecture decision and technical/quality documentation.

Any contract change affecting both code and documentation is coordinated by
the orchestrator before parallel edits begin.

### Validation

- `task check`.
- Manual Chrome acceptance matrix recorded in the review handoff.
- Link and documentation-map review.
- `git diff --check`.

### Review evidence

- Exact automated check results.
- Manual device/browser/network matrix and measured latency/stability results.
- Explicit list of remaining environment and deferred boundaries.

### Proposed commit

`docs(camera): complete browser pairing integration`

## Environment prerequisites

The backend and Flutter implementations now exist. Batches 1–7 can be built
and reviewed with controlled test doubles before deployment values are
provided. End-to-end acceptance in Batch 8 additionally requires:

- public API and signaling URLs supplied through local environment
  configuration;
- the React origin allowed by backend CORS and WebSocket-origin policy;
- a reachable deployed backend/signaling service and its STUN/TURN
  configuration;
- two compatible Flutter builds and two phones on the approved network; and
- test-account credentials entered through the sign-in UI, never stored in
  frontend environment files.

If the deployed implementation changes approved user behavior or the frozen
contract, work stops and the specification/plan returns to product-owner
review before the affected batch proceeds.
