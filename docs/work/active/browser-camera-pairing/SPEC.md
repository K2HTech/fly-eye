# Browser Camera Pairing Specification

Status: Approved on 2026-08-29

## 1. Summary

Fly Eye will connect its normal authenticated operator flow to the Fly Eye
backend and replace simulated camera checks with a browser pairing flow for two
Flutter camera applications. The operator signs in, creates or resumes a
backend-owned match, prepares its two backend camera records, displays a
short-lived QR code for each camera, and asks the corresponding phone to scan
it. Each phone then sends one live video track directly to the operator's
browser through WebRTC.

This repository owns the React authentication adapter, backend match/camera
adapter, pairing, connection-state, health, and video-receiver experience. It
does not own the Flutter application, backend APIs, signaling service,
STUN/TURN infrastructure, recording, synchronization, calibration, or
line-call processing.

The first release targets the React application in a normal desktop browser.
Tauri runtime validation and packaging are explicitly deferred.

The approved court topology places the operator laptop and both phones on the
same Wi-Fi network while React and signaling are served from the VPS. WebRTC
should select a direct local path when that network permits device-to-device
traffic. TURN on the VPS is a fallback, not the normal media route.

## 2. Problem and outcome

The current readiness page advances hard-coded simulated camera states, and the
live monitor displays drawn badminton courts. Those fixtures demonstrate the
workflow but cannot prove that an operator can pair and observe two real phone
cameras.

The approved outcome is:

1. A normal operator registers or signs in through the real backend.
2. Normal match creation/listing uses backend match UUIDs while preserving the
   current scoring selection as explicitly local supplemental data.
3. Hardware readiness creates or reuses the match's two backend camera
   records, ordered by `SIDELINE_LEFT` and `SIDELINE_RIGHT`.
4. The operator pairs one phone to each backend camera record.
5. Fly Eye shows the state and health of each connection independently.
6. Monitoring remains blocked until both phones are delivering a visible live
   video track and a calibration profile is selected.
7. Normal navigation into the live workspace preserves both peer connections.
8. The live workspace renders the two real preview streams and clearly
   distinguishes them from the still-simulated rolling-buffer and review
   workflow.

## 3. Actors and systems

### Operator

A normal operator authenticates with the backend, prepares a backend-owned
match, and controls pairing from the Fly Eye website. Anonymous demo behavior
remains on its existing simulated path and is not part of real-camera
acceptance.

### Flutter camera application

One phone represents exactly one backend camera during a connection. It scans
the QR code, acts as the WebRTC offerer, sends one video track with no audio,
opens the approved data channel, and reports camera status.

The mobile behavior and contract are implemented outside this repository.

### Signaling service

An external service on the Fly Eye VPS creates short-lived pairing sessions
through HTTPS and relays SDP and ICE messages through secure WebSocket. It
never receives application video during a direct connection. It also provides
temporary ICE server configuration, including TURN credentials when required.

The signaling service is a prerequisite owned by backend/shared
infrastructure. This React feature cannot provide a scannable end-to-end
connection without a compatible signaling deployment.

### Authentication, match, and camera APIs

The Fly Eye backend authenticates normal operators, owns their matches and
camera resources, and authorizes pairing creation. React follows the frozen
contracts in `fly-eye-backend/docs/api-contract.md` and the backend frontend
integration guides. Backend DTOs are mapped at the adapter boundary rather
than becoming route-component state shapes.

### React application

The React application requests and displays server-created pairing data,
answers the phone's WebRTC offer, renders received streams, exposes connection
health, and closes connections safely. Browser APIs and network transports
remain behind a replaceable application boundary rather than being embedded in
route-level components.

## 4. Scope

### Included

- Real backend registration, sign-in, token refresh, session lookup, and
  logout for normal operators.
- In-memory access and refresh tokens for the browser-only phase.
- Backend-backed normal match creation, listing, retrieval, and lifecycle
  updates.
- Local supplemental storage for `bestOfGames` and `pointsToWin`, keyed by the
  backend match UUID because those approved product fields are absent from the
  backend contract.
- Creation or reuse of exactly two backend device-camera records with roles
  `SIDELINE_LEFT` and `SIDELINE_RIGHT`.
- Pairing from the existing hardware-readiness route.
- A separate, expiring QR session for each backend camera UUID.
- Browser WebSocket signaling using the version-one contract below.
- One independent `RTCPeerConnection` per camera.
- One incoming video track per camera and no audio.
- A reliable ordered WebRTC data channel for status and simple controls.
- Live connection state, camera metadata, and recoverable error presentation.
- Explicit disconnect, replacement, QR regeneration, and retry behavior.
- An application-level camera-session owner that survives navigation between
  readiness, live monitor, clip review, and decision for the same match.
- Real video rendering in the live monitor.
- Runtime protocol validation and sanitized public errors.
- Browser feature detection and a clear unsupported-browser state.
- Automated unit, integration, accessibility, and production-build checks.
- A manual Chrome smoke test with the Flutter application and signaling
  service.

### Excluded

- Implementing or hosting the signaling service, STUN, or TURN.
- Implementing or modifying the Flutter application.
- Tauri WebRTC support or Tauri-specific camera behavior.
- Audio capture or playback.
- Capturing, recording, uploading, or retaining frames or clips.
- A real rolling buffer, synchronized replay, calibration, tracking,
  triangulation, inference, or evidence provenance.
- 120/240 FPS capture or claims that the preview is high-speed evidence.
- Persisting access tokens, refresh tokens, passwords, or other authentication
  secrets in browser storage.
- Real-camera pairing for the anonymous demo flow.
- Synchronizing supplemental scoring settings between computers.
- Adding scoring fields to the backend contract.
- More than the two approved sideline camera roles, phone-to-phone media, or
  multi-view simulcast.
- Background mobile capture or remote mobile-app administration.
- Replacing the current simulated clip-review and decision evidence.

## 5. Product rules

### 5.1 Authentication and backend ownership

- A normal operator registers and signs in through `/api/v1/auth`.
- Registration is followed by login so a successful registration enters the
  normal workspace consistently with current product behavior.
- Access and refresh tokens remain in memory only. A browser refresh loses the
  normal session and requires sign-in again.
- Protected requests send the access token as a bearer token.
- Concurrent `401` responses share at most one refresh operation. A successful
  refresh rotates both tokens and retries each request once; failure clears the
  normal session.
- Logout is attempted with the current refresh token before local in-memory
  credentials are cleared; offline logout is best effort.
- Passwords never enter persistence-safe models, logs, URLs, or environment
  variables.
- The backend user has no display-name field, so normal operator identity is
  presented by email. Anonymous demo retains its existing demo label.
- Backend ownership and authorization errors fail closed and are not replaced
  with local access checks.

### 5.2 Backend matches and supplemental scoring

- The backend is authoritative for a normal match's ID, title, venue,
  singles/doubles format, schedule, participants, lifecycle, and cameras.
- React maps the current event name to backend `title`, court to `venue`,
  competition type to backend `format`, and sides/players to backend player
  records.
- New matches use the current timestamp as `scheduledAt` until scheduling is a
  product input.
- Match creation and camera creation use stable cryptographic UUID
  `clientRequestId` values for safe retry.
- Backend `draft`, `live`, and `finished` map to the approved UI lifecycle.
  Readiness remains an application gate rather than a backend match status.
- `bestOfGames` and `pointsToWin` remain in local supplemental storage keyed by
  backend match UUID. They are not claimed to synchronize across browsers.
- A backend match without local supplemental scoring displays an explicit
  default of best-of-three, 21 points for this POC; the operator may edit it
  only through a separately approved feature.

### 5.3 Pairing belongs to a backend camera

- A pairing session belongs to one authenticated backend match UUID and one
  backend camera UUID.
- The left panel uses the camera whose backend role is `SIDELINE_LEFT`; the
  right panel uses `SIDELINE_RIGHT`.
- Fly Eye displays those backend direction labels without claiming another
  fixed physical court placement.
- Hardware setup creates missing records with `sourceType: "device"`,
  non-secret opaque `sourceRef` values, and the approved initial resolution/FPS
  targets. It reuses compatible existing records instead of duplicating them.
- An unexpected role, duplicate role, more than two cameras, or inaccessible
  camera blocks readiness with an actionable error rather than guessing panel
  identity.
- A phone cannot occupy both backend camera sessions simultaneously in one
  browser match session.
- Pairing or losing one camera must not reset or interrupt the other camera.

### 5.4 Pairing is temporary and operator initiated

- The operator explicitly requests a QR code for one backend camera role.
- Only one pairing dialog is open at a time.
- A QR code expires two minutes after the signaling service accepts the
  session.
- The UI shows the remaining validity and offers regeneration after expiry.
- Closing or cancelling an unpaired dialog invalidates its pending session.
- Regeneration invalidates the previous session and token for that camera.
- Pairing tokens, peer credentials, SDP, ICE candidates, and TURN credentials
  remain in memory only and are never placed in browser storage.

### 5.5 Camera readiness is real and ephemeral

- A camera becomes ready only after the peer connection is connected, one
  remote video track is live, and the browser has received a decodable frame.
- A signaling connection by itself is not camera readiness.
- A saved or previously simulated readiness value cannot substitute for a
  currently active stream.
- Camera connection state is ephemeral and is not restored from local storage
  after a page refresh, sign-out, browser close, or application restart.
- Calibration remains the existing explicitly simulated selection until a
  separate calibration integration is approved.
- Monitoring requires both current camera connections plus the selected
  calibration profile.

### 5.6 Match and demo behavior

- The real backend and real-camera path applies only to normal authenticated
  operators in this feature.
- Anonymous demo entry, local demo match isolation, timer behavior, and
  simulated cameras remain unchanged.
- The development camera simulator is explicitly labelled, disabled in
  production, and cannot satisfy normal production readiness.
- A live match that no longer has two active camera connections cannot silently
  bypass readiness. The operator is offered a return to camera setup before
  resuming useful monitoring.

### 5.7 Preview is not recorded evidence

- Received WebRTC streams are live previews only.
- The UI must not claim that the browser is recording, buffering,
  synchronizing, calibrating, tracking, or analyzing those streams.
- The current rolling-buffer, clip-review, and decision evidence remain
  simulations and must be visibly identified as such whenever they appear
  beside or after real camera previews.
- A lost camera is a connection failure, not line-call evidence and not an
  `INCONCLUSIVE` verdict.

## 6. Operator experience

### 6.1 Hardware readiness

Each backend camera card exposes one of these meaningful states:

| State         | Meaning                                                 | Primary action                         |
| ------------- | ------------------------------------------------------- | -------------------------------------- |
| Unsupported   | Required browser APIs or secure context are unavailable | Explain how to use a supported browser |
| Disconnected  | No active or pending session exists                     | Pair camera                            |
| Creating      | Fly Eye is requesting a signaling session               | Cancel                                 |
| Awaiting scan | A valid QR code is available                            | Cancel or regenerate                   |
| Negotiating   | The phone joined and WebRTC is connecting               | Cancel                                 |
| Connected     | A live video frame has been received                    | Disconnect or replace                  |
| Reconnecting  | A previously connected peer is recovering               | Disconnect                             |
| Error         | A recoverable pairing or media failure occurred         | Retry or generate a new code           |

The pairing dialog must:

- Identify the selected backend role and camera name.
- Render the QR locally as SVG; no external QR-generation service receives the
  payload.
- Show a textual expiry countdown and status announcements.
- Provide cancel and regenerate actions.
- Move keyboard focus into the dialog, close on Escape when safe, restore focus
  to the invoking camera card, and prevent interaction with the page behind it.
- Never show the pairing token as ordinary visible text or expose a copy action
  for the secret payload.

After connection, the camera card shows available, non-sensitive information:

- Connected/health state.
- Actual received resolution and frame rate when available.
- Direct or relayed candidate type when determinable.
- Mobile-reported battery, charging, network, app version, and torch state when
  supplied.
- A compact live thumbnail or first-frame confirmation.

Unavailable optional fields display as unavailable rather than fabricated
values.

### 6.2 Live monitor

- `SIDELINE_LEFT` and `SIDELINE_RIGHT` render into left and right muted,
  autoplaying, inline video elements.
- Each video retains an accessible name and visible backend direction label.
- Status chips report actual connection state and measured frame rate when
  available; hard-coded latency and FPS values are removed.
- Loss of one camera is announced without removing the healthy camera.
- During temporary recovery the last rendered frame may remain visible with a
  clear reconnecting overlay; it must not be labelled live.
- A persistent action returns the operator to hardware readiness to repair a
  missing feed.
- The existing simulated review action remains available for demonstrating the
  later workflow, but its surrounding copy must state that review evidence is
  simulated and is not captured from the connected phones.

### 6.3 Connection cleanup

- Normal navigation among readiness, live, review, and decision for the same
  match preserves camera connections.
- Signing out, switching to a different match, leaving the protected match
  workflow, closing the browser, or deliberately disconnecting closes tracks,
  data channels, peer connections, and signaling sessions.
- React development `StrictMode` must not create duplicate live sessions.

## 7. QR pairing contract

React requests a pairing session from the VPS over HTTPS. The server generates
separate high-entropy mobile and viewer tokens and returns the server-accepted
expiry. React retains the viewer token in memory and renders only the mobile
token in the QR.

The QR contains UTF-8 JSON with this exact implemented version-one shape:

```json
{
  "protocol": "fly-eye-camera-pairing",
  "version": 1,
  "sessionId": "01K...",
  "cameraId": "00000000-0000-0000-0000-000000000002",
  "cameraRole": "SIDELINE_LEFT",
  "signalingUrl": "wss://signal.fly-eye.example/api/v1/signal",
  "pairingToken": "temporary-one-time-token",
  "expiresAt": "2026-08-25T10:30:00Z"
}
```

Rules:

- `protocol`, `version`, `sessionId`, `cameraId`, `cameraRole`,
  `signalingUrl`, `pairingToken`, and `expiresAt` are required.
- Optional display text is not identity or authorization evidence.
- Production uses `wss://`; a deliberate development configuration may allow
  `ws://` for a private LAN address.
- The server, not React, generates the session ID, mobile token, viewer token,
  and server-accepted expiry.
- The viewer token never appears in the QR.
- Unsupported versions fail closed.

## 8. Signaling contract

The implemented backend contract in `fly-eye-backend/docs/api-contract.md` is
the integration source of truth. The original
[signaling-server handoff](SIGNALING-SERVER-HANDOFF.md) records the request but
does not override the implemented contract. The summary below defines the
React boundary.

React creates a pairing session with `POST /api/v1/camera-pairings`, bearer
authentication, and `{version, matchId, cameraId}`. The response contains
`sessionId`, `matchId`, `cameraId`, `cameraRole`, `expiresAt`, `signalingUrl`,
`mobileToken`, and `viewerToken`. React builds the approved QR locally, maps
`mobileToken` to `pairingToken`, keeps `viewerToken` only in memory, and then
opens the returned signaling WebSocket.

Every WebSocket message is JSON with this envelope:

```json
{
  "version": 1,
  "type": "authenticate",
  "sessionId": "01K...",
  "payload": {}
}
```

### React to signaling service

- `authenticate`: authenticates the viewer socket with the in-memory viewer
  token as its first message.
- `answer`: relays the browser SDP answer to the joined camera.
- `ice-candidate`: relays a trickled browser ICE candidate.
- `leave`: invalidates the session and notifies the camera.
- `ping`: checks signaling liveness.

### Signaling service to React

- `authenticated`: confirms the viewer, accepted expiry, and temporary ICE
  server configuration.
- `camera-joined`: confirms that the QR token was accepted for the expected
  backend camera.
- `offer`: carries the Flutter peer's SDP offer.
- `ice-candidate`: carries a trickled Flutter ICE candidate.
- `camera-left`: reports intentional or unexpected departure.
- `error`: carries a stable public code and sanitized message.
- `pong`: confirms signaling liveness.

### Flutter messages already expected by the mobile contract

The signaling service must also support the previously agreed mobile messages:
`join`, `resume`, `offer`, `ice-candidate`, `leave`, and `ping`, and return
`joined`, `viewer-ready`, `answer`, `ice-candidate`, `peer-left`, `error`, and
`pong`.

Protocol behavior:

- Flutter is the WebRTC offerer; React is the answerer.
- The mobile pairing token is single-use. A successful join may return an
  in-memory peer token for signaling reconnection during the active session.
- Both sides use trickle ICE and queue candidates received before the remote
  description is installed.
- The server rejects an expired, consumed, mismatched, or already-occupied
  session.
- ICE server credentials are temporary and supplied by
  `authenticated`/`joined`; the frontend does not hard-code production
  credentials.
- Unknown message types, invalid payload shapes, and cross-session messages
  fail closed and never mutate active connection state.
- Stable WebSocket error codes are `AUTHENTICATION_REQUIRED`,
  `SESSION_NOT_FOUND`, `SESSION_EXPIRED`, `SESSION_OCCUPIED`,
  `CAMERA_MISMATCH`, `TOKEN_INVALID`, `TOKEN_CONSUMED`,
  `VIEWER_NOT_CONNECTED`, `SIGNALING_UNAVAILABLE`, `MESSAGE_INVALID`, and
  `RATE_LIMITED`.

Test doubles are not evidence that the React adapter conforms to the deployed
backend; final acceptance includes a contract smoke test against that backend.

## 9. WebRTC and data-channel contract

### Media

- React creates one peer connection per backend camera using ICE servers
  received from signaling.
- React receives one video transceiver/track and does not request or play
  audio.
- Flutter offers 1280x720 at 30 FPS initially, preferring hardware H.264 with
  normal WebRTC negotiation and VP8 fallback.
- React does not rewrite SDP to force a codec in version one.
- Video is attached through `HTMLVideoElement.srcObject`; object URLs and frame
  copies are not used.
- The connection permits direct host/server-reflexive paths and TURN relay
  fallback.

### Control channel

Flutter creates a reliable, ordered data channel named
`fly-eye-control-v1`. Messages use this envelope:

```json
{
  "version": 1,
  "type": "camera.status",
  "timestamp": "2026-08-25T10:30:00.000Z",
  "requestId": "optional-correlation-id",
  "payload": {}
}
```

React receives:

- `camera.capabilities`
- `camera.status`
- `camera.error`
- `camera.heartbeat`
- `command.succeeded`
- `command.failed`

React may send:

- `camera.request-status`
- `camera.set-torch`
- `camera.identify`
- `camera.disconnect`

All incoming payloads receive runtime validation. Unknown optional fields are
ignored; invalid required fields do not enter UI state. The UI does not invent
health information the phone did not report.

## 10. Resilience and recovery

- Signaling and peer/media failures remain distinguishable in public state.
- Public errors are actionable and sanitized; SDP, ICE addresses, credentials,
  tokens, and raw exceptions are excluded.
- The browser uses bounded retry with backoff for an established signaling
  session. An expired or rejected session requires a newly generated QR.
- A brief network interruption moves a connected camera to reconnecting rather
  than immediately marking it ready or permanently failed.
- Recovery must not create duplicate peer connections or apply stale async
  events after a session was replaced, cancelled, or associated with another
  match.
- If the browser refreshes, ephemeral peer state is lost. A live route with no
  active streams explains the loss and returns the operator to readiness for
  re-pairing.
- One backend camera failure never tears down the other camera.

## 11. Security and privacy

- Production pairing requires a secure browser context, HTTPS page delivery,
  and WSS signaling.
- Development-only insecure signaling is opt-in and visibly identified.
- The VPS generates session IDs, viewer tokens, mobile tokens, and resume tokens
  with at least 128 bits of cryptographic randomness. React never substitutes
  locally generated weak identifiers if pairing creation fails.
- Pairing and ICE credentials exist only in memory.
- Backend access and refresh tokens exist only in memory for the browser phase.
- Passwords and tokens are never sourced from Vite environment variables.
- No component writes pairing or connection data directly to browser storage.
- The QR is generated locally; no third-party QR endpoint receives its value.
- Release logs exclude secrets, SDP, ICE candidates, device identifiers, and
  raw external errors.
- The React UI accepts no permanent mobile-device identifier.
- Remote video is not recorded, uploaded, analyzed, or retained by this
  feature.
- Normal WebRTC DTLS-SRTP transport encryption is required; the UI makes no
  stronger end-to-end-security claim.
- The backend JWT authorizes normal match/camera and pairing API calls. Pairing
  tokens provide temporary possession of one camera session and do not replace
  that operator authorization.

## 12. Accessibility and responsive behavior

- Every state and action is available by keyboard and has an accessible name.
- QR status, expiry, connection, disconnection, and errors are communicated in
  appropriate status or alert regions without relying on color.
- The QR SVG has an accessible description, while nearby text explains which
  backend camera role should scan it.
- Pairing-dialog focus is contained and restored correctly.
- Video elements have stable accessible labels and do not autoplay audio.
- Motion respects `prefers-reduced-motion`.
- Hardware readiness remains usable at the existing supported desktop widths;
  narrow layouts stack camera cards and dialog content without horizontal
  overflow.

## 13. Performance and observability targets

For the version-one manual acceptance environment:

- QR scan to first visible video frame: at most 10 seconds on the same LAN.
- Same-LAN glass-to-glass latency: at most 500 ms, with 250 ms as the preferred
  target.
- Two 1280x720, 30 FPS previews remain connected for a 15-minute run without a
  frontend crash or unbounded resource growth.
- A short recoverable Wi-Fi interruption returns to connected state within 15
  seconds when the external services and credentials remain valid.

The browser samples `RTCPeerConnection.getStats()` at a bounded interval to
derive received dimensions, frames per second, packet-loss information, and
selected candidate type. Stats collection is diagnostic and must not perform
per-frame React state updates.

Glass-to-glass latency is measured manually by filming a millisecond timer and
comparing the physical scene to the browser-rendered frame. Automated JSDOM
tests cannot prove media latency or browser interoperability.

## 14. Configuration

- `VITE_API_BASE_URL` supplies the public backend base URL without a trailing
  API operation path.
- `VITE_SIGNALING_URL` supplies the expected public signaling endpoint. React
  still uses the server-returned `signalingUrl`, but rejects an unexpected
  endpoint rather than sending tokens to another origin.
- `VITE_CAMERA_SIMULATOR_ENABLED` enables simulator controls only when both its
  value is `true` and Vite is running in development mode. Production builds
  ignore or reject it.
- A committed `.env.example` documents names without values. Real public URLs
  belong in deployment configuration or ignored `.env.local` files.
- No password, JWT, pairing token, TURN credential, or other secret is a Vite
  environment variable because every `VITE_*` value is public browser code.
- Production builds reject a non-secure signaling URL.
- Development builds may allow a private-network `ws://` URL only through an
  explicit development flag.
- STUN/TURN URLs and credentials come from signaling responses, never from the
  committed frontend bundle.
- Missing or invalid configuration produces an unavailable state rather than a
  simulated successful pairing.

## 15. Acceptance criteria

The React feature is accepted when:

1. Normal registration/sign-in uses the backend, protected requests refresh
   once safely on `401`, and sign-out clears all in-memory credentials.
2. Normal match creation/listing uses backend UUIDs and preserves supplemental
   scoring locally without claiming cross-device synchronization.
3. Hardware readiness creates or reuses one `SIDELINE_LEFT` and one
   `SIDELINE_RIGHT` backend camera and orders them left/right.
4. A supported Chrome browser can create separate expiring QR sessions for the
   two backend camera UUIDs.
5. Scanning each QR with the Flutter application results in the correct phone
   video appearing in the correct readiness and live-monitor panels.
6. Both real streams plus the existing calibration selection are required
   before a normal match can start monitoring.
7. Anonymous demo behavior remains unchanged and does not call protected
   pairing APIs.
8. Cancelling, expiry, invalid messages, duplicate attempts, network loss,
   replacement, sign-out, refresh, and backend authorization failures produce
   safe, understandable behavior.
9. Connections survive normal same-match route navigation and close when the
   session or match context is abandoned.
10. The live page does not present hard-coded camera FPS or latency as real
    data, and simulated review/buffer behavior is visibly distinguished.
11. Passwords, tokens, pairing secrets, and connection details are absent from
    persistence, browser configuration, and public errors/logs.
12. Automated format, lint, strict TypeScript, unit/integration/accessibility
    tests, and production build checks pass.
13. The documented Chrome manual test passes for one camera, two cameras,
    same-LAN direct connectivity, TURN relay fallback, and a 15-minute run.

## 16. External prerequisites and approval decisions

The backend and Flutter implementation exist. End-to-end execution waits only
for environment-specific API/WSS URLs, an allowed React origin, valid test-user
credentials entered through the UI, and reachable STUN/TURN configuration.

Approval of this specification confirms the browser-only scope, backend-backed
normal flow, unchanged anonymous demo, local supplemental scoring, backend
left/right camera-role mapping, VPS signaling dependency, same-Wi-Fi court
topology, ephemeral readiness, and continued simulation of recording/review
behavior.
