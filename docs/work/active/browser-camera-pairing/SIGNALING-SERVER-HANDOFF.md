# Fly Eye Signaling Server — Backend Handoff

Status: Historical implementation request; superseded by the implemented
backend contract

Audience: Backend engineer implementing the VPS pairing and signaling service

Related product contract: [Browser camera pairing specification](SPEC.md)

> Do not implement a client from this handoff alone. The integration source of
> truth is `fly-eye-backend/docs/api-contract.md` plus its frontend integration
> guides. The implemented backend uses authenticated `/api/v1` HTTP endpoints,
> backend camera UUIDs/roles, and the frozen message/error schema recorded
> there. This document remains only as rationale and an audit of the original
> request.

## 1. Purpose

Fly Eye uses two Flutter phones as live cameras and a React website on one
operator laptop. The signaling server introduces one phone to one browser
camera slot so they can establish a WebRTC connection.

The signaling server is a control-plane relay. It does not decode, transcode,
record, inspect, or normally carry video.

```text
                       Fly Eye VPS
              HTTPS pairing + WSS signaling
                   ▲                  ▲
                   │ metadata         │ metadata
                   │                  │
Court Wi-Fi:       │                  │
Flutter Phone A ═════════════════ React browser
Flutter Phone B ═════════════════ React browser
                  direct WebRTC video
```

All three court devices use the same Wi-Fi. ICE should select a direct local
path when the network allows device-to-device traffic. A VPS TURN service is a
fallback when direct connectivity fails.

## 2. Ownership boundary

The backend service owns:

- Creating and expiring pairing sessions.
- Generating server-owned session IDs and tokens.
- Authenticating the viewer and camera into the correct session and slot.
- Relaying SDP offers, SDP answers, and trickled ICE candidates.
- Providing temporary STUN/TURN configuration.
- Enforcing session isolation, limits, cleanup, and stable error codes.
- Health checks, metrics, and sanitized operational logging.

The backend service does not own:

- Camera capture or encoding.
- WebRTC peer-connection creation.
- Video transport when peers connect directly.
- Flutter or React user interfaces.
- Recording, rolling buffers, synchronization, calibration, inference, or
  line-call decisions.
- Permanent mobile-device registration.

## 3. Version-one topology and assumptions

- React is served as a production HTTPS website.
- The signaling API is served over HTTPS from the VPS.
- Signaling WebSockets use WSS.
- Flutter is the WebRTC offerer; React is the answerer.
- One pairing session represents one match and one camera slot.
- Supported slots are `A` and `B` only.
- Camera A means sideline; Camera B means baseline.
- A session admits exactly one viewer socket and one camera socket.
- React uses a separate session and peer connection for each slot.
- QR pairing expires after 120 seconds if the phone has not joined.
- Pairing tokens and WebRTC state are ephemeral.
- The current React authentication is simulated. Production user
  authorization must be added when the real authentication backend is ready.

## 4. Transport overview

The service exposes:

```text
POST   /v1/camera-pairings
DELETE /v1/camera-pairings/:sessionId
GET    /healthz
WSS    /v1/signal
```

`POST` creates a server-owned session. React then connects to `/v1/signal` and
authenticates as the viewer. Flutter scans the QR, connects to the same WSS
endpoint, and joins as the camera.

## 5. Create-pairing API

### Request

```http
POST /v1/camera-pairings HTTP/1.1
Content-Type: application/json
Origin: https://app.fly-eye.example
```

```json
{
  "version": 1,
  "matchId": "match-123",
  "cameraSlot": "A"
}
```

Validation:

- `version` must equal `1`.
- `matchId` must be a non-empty opaque string within the agreed length limit.
- `cameraSlot` must be exactly `A` or `B`.
- Unknown fields are rejected for version one.
- The request body is size limited.
- Only one non-closed session may exist for the same match and slot. A new
  request may replace an unjoined expired session, but it must not silently
  replace an active camera.

### Authentication phases

POC phase:

- The endpoint may be temporarily unauthenticated because the current React
  identity is explicitly simulated.
- Apply strict origin validation, IP rate limiting, short TTLs, and global
  capacity limits.
- This mode must not be represented as production authorization.

Production phase:

- Require the operator's backend access token.
- Verify that the operator may prepare the requested match and slot.
- Do not accept a client-supplied operator ID as authorization evidence.

### Success response

```http
HTTP/1.1 201 Created
Content-Type: application/json
Cache-Control: no-store
```

```json
{
  "protocol": "fly-eye-camera-pairing",
  "version": 1,
  "sessionId": "01K5Y2J6Z7H8K9M0N1P2Q3R4S5",
  "cameraSlot": "A",
  "expiresAt": "2026-08-25T10:30:00.000Z",
  "signalingUrl": "wss://signal.fly-eye.example/v1/signal",
  "mobileToken": "server-generated-mobile-token",
  "viewerToken": "server-generated-viewer-token"
}
```

Rules:

- Generate `sessionId`, `mobileToken`, and `viewerToken` on the server using a
  cryptographically secure random source.
- Each token contains at least 128 bits of entropy; 256 bits is recommended.
- Mobile and viewer tokens must be different.
- Persist only token hashes, never raw tokens.
- Return raw tokens only in this `no-store` response.
- The accepted expiry is server time plus 120 seconds.
- `signalingUrl` is server configuration, not derived from request headers
  without a trusted-proxy policy.
- React retains `viewerToken` in memory and encodes `mobileToken` as
  `pairingToken` in the QR.

### Error response

```json
{
  "error": {
    "code": "SLOT_OCCUPIED",
    "message": "Camera A already has an active pairing session.",
    "requestId": "request-correlation-id"
  }
}
```

Public errors contain a stable code and sanitized message. They never contain
tokens, token hashes, SDP, ICE candidates, stack traces, database keys, or raw
exceptions.

Recommended HTTP mapping:

| Code                      | HTTP |
| ------------------------- | ---: |
| `REQUEST_INVALID`         |  400 |
| `AUTHENTICATION_REQUIRED` |  401 |
| `MATCH_FORBIDDEN`         |  403 |
| `MATCH_NOT_FOUND`         |  404 |
| `SLOT_OCCUPIED`           |  409 |
| `VERSION_UNSUPPORTED`     |  422 |
| `RATE_LIMITED`            |  429 |
| `SERVICE_UNAVAILABLE`     |  503 |

## 6. QR payload produced by React

The backend does not render the QR. React locally encodes this UTF-8 JSON using
the successful response:

```json
{
  "protocol": "fly-eye-camera-pairing",
  "version": 1,
  "sessionId": "01K5Y2J6Z7H8K9M0N1P2Q3R4S5",
  "cameraSlot": "A",
  "signalingUrl": "wss://signal.fly-eye.example/v1/signal",
  "pairingToken": "server-generated-mobile-token",
  "expiresAt": "2026-08-25T10:30:00.000Z",
  "matchName": "Fly Eye Open — Court 2"
}
```

`matchName` is optional display data added by React. The backend must not use
it for authorization or session identity.

## 7. WebSocket envelope

Every client and server message is a UTF-8 JSON text frame:

```json
{
  "version": 1,
  "type": "offer",
  "sessionId": "01K5Y2J6Z7H8K9M0N1P2Q3R4S5",
  "payload": {}
}
```

Envelope rules:

- `version`, `type`, `sessionId`, and `payload` are required.
- `version` must equal `1`.
- Reject unknown required fields and invalid payload shapes.
- After authentication, a socket may send messages only for its bound session
  and role.
- Never route a message by a client-supplied target socket or user ID.
- Preserve message order per socket.
- Use WebSocket text frames only in version one.
- Disable WebSocket message compression unless representative load testing
  proves it is needed.
- Recommended maximum message size: 64 KiB.

## 8. Viewer authentication

Immediately after opening WSS, React sends:

```json
{
  "version": 1,
  "type": "authenticate",
  "sessionId": "01K5Y2J6Z7H8K9M0N1P2Q3R4S5",
  "payload": {
    "role": "viewer",
    "token": "server-generated-viewer-token"
  }
}
```

The token is sent in the first message instead of the URL so reverse-proxy and
access logs do not capture it.

On success:

```json
{
  "version": 1,
  "type": "authenticated",
  "sessionId": "01K5Y2J6Z7H8K9M0N1P2Q3R4S5",
  "payload": {
    "role": "viewer",
    "cameraSlot": "A",
    "expiresAt": "2026-08-25T10:30:00.000Z",
    "iceServers": [
      {
        "urls": ["stun:turn.fly-eye.example:3478"]
      },
      {
        "urls": [
          "turn:turn.fly-eye.example:3478?transport=udp",
          "turns:turn.fly-eye.example:5349?transport=tcp"
        ],
        "username": "temporary-turn-user",
        "credential": "temporary-turn-password"
      }
    ]
  }
}
```

The server must authenticate the socket before accepting any SDP, ICE, leave,
or heartbeat message.

## 9. Mobile join and resume

Flutter opens the same WSS endpoint and sends:

```json
{
  "version": 1,
  "type": "join",
  "sessionId": "01K5Y2J6Z7H8K9M0N1P2Q3R4S5",
  "payload": {
    "role": "camera",
    "cameraSlot": "A",
    "pairingToken": "server-generated-mobile-token"
  }
}
```

The server verifies:

- The session exists and is not expired or closed.
- The token hash matches using a timing-safe comparison.
- The requested slot matches the session.
- A viewer is connected.
- No camera already occupies the session.
- The token has not already been consumed.

On success, consume the pairing token and return:

```json
{
  "version": 1,
  "type": "joined",
  "sessionId": "01K5Y2J6Z7H8K9M0N1P2Q3R4S5",
  "payload": {
    "role": "camera",
    "cameraSlot": "A",
    "peerToken": "temporary-in-memory-resume-token",
    "iceServers": []
  }
}
```

`iceServers` has the same structure as the viewer response. Flutter keeps
`peerToken` only in process memory. If its signaling socket drops while the app
remains active, it may reconnect with:

```json
{
  "version": 1,
  "type": "resume",
  "sessionId": "01K5Y2J6Z7H8K9M0N1P2Q3R4S5",
  "payload": {
    "role": "camera",
    "peerToken": "temporary-in-memory-resume-token"
  }
}
```

If the app process loses the peer token, the operator generates a new QR.

## 10. Negotiation sequence

After mobile join succeeds:

1. Send `camera-joined` to React.
2. Send `viewer-ready` to Flutter.
3. Flutter creates its peer connection using `iceServers`.
4. Flutter adds one video track and the `fly-eye-control-v1` data channel.
5. Flutter sends `offer`.
6. Server relays `offer` only to the bound viewer.
7. React installs the offer, creates/installs an answer, and sends `answer`.
8. Server relays `answer` only to the bound camera.
9. Both peers send trickled `ice-candidate` messages, which the server relays
   only to the other bound role.
10. Media flows directly between peers when ICE finds a usable local path.

Offer:

```json
{
  "version": 1,
  "type": "offer",
  "sessionId": "01K5Y2J6Z7H8K9M0N1P2Q3R4S5",
  "payload": {
    "description": {
      "type": "offer",
      "sdp": "v=0..."
    }
  }
}
```

Answer uses the same shape with `type: "answer"`.

ICE candidate:

```json
{
  "version": 1,
  "type": "ice-candidate",
  "sessionId": "01K5Y2J6Z7H8K9M0N1P2Q3R4S5",
  "payload": {
    "candidate": {
      "candidate": "candidate:...",
      "sdpMid": "0",
      "sdpMLineIndex": 0,
      "usernameFragment": null
    }
  }
}
```

An empty/end-of-candidates value may be represented with `candidate: null`.
The server relays SDP and ICE as opaque validated-size payloads. It must not
rewrite SDP or candidates.

## 11. Remaining message types

### Browser receives

- `authenticated`
- `camera-joined`
- `offer`
- `ice-candidate`
- `camera-left`
- `error`
- `pong`

### Browser sends

- `authenticate`
- `answer`
- `ice-candidate`
- `leave`
- `ping`

### Flutter receives

- `joined`
- `viewer-ready`
- `answer`
- `ice-candidate`
- `peer-left`
- `error`
- `pong`

### Flutter sends

- `join`
- `resume`
- `offer`
- `ice-candidate`
- `leave`
- `ping`

The WebRTC data-channel messages such as `camera.status` do not pass through
signaling after the peer connection opens.

## 12. Heartbeat and cleanup

- Use protocol-level WebSocket ping/pong where supported for transport health.
- Clients also send the versioned application `ping` message because browser
  JavaScript cannot originate protocol-level WebSocket ping frames.
- Recommended application heartbeat interval: 20 seconds.
- Recommended idle timeout: 45 seconds.
- On timeout, detach the socket and notify the remaining peer.
- An authenticated viewer may reconnect with its unexpired viewer token.
- A joined camera may reconnect with its in-memory peer token.
- `leave` closes the role. Viewer leave invalidates the entire pairing session.
- `DELETE /v1/camera-pairings/:sessionId` provides idempotent HTTP cleanup for
  a viewer that cannot use its WebSocket. Production requires viewer/operator
  authorization.
- Expiry before camera join invalidates the session automatically.
- After camera join, pairing expiry no longer terminates healthy media. The
  active session ends on explicit leave, configured active-session TTL, or
  both peers remaining disconnected beyond the recovery window.
- Delete socket references, token hashes, ICE credentials, and session state on
  final close.

## 13. Session state model

Recommended states:

```text
created
  -> viewer-connected
  -> camera-joined
  -> negotiating
  -> active
  -> closed

created/viewer-connected -> expired
any non-final state       -> failed/closed
```

Minimum in-memory record:

```text
sessionId
matchId
cameraSlot
viewerTokenHash
mobileTokenHash
peerTokenHash (after join)
createdAt
pairingExpiresAt
activeExpiresAt
status
viewerSocket reference
cameraSocket reference
```

Do not store SDP or ICE history. Relay and discard it.

For one VPS process, an in-memory map with an expiry sweep is acceptable for
the POC. It intentionally loses sessions on restart, causing clients to pair
again. If the service runs multiple instances, use sticky routing plus a shared
ephemeral store/pub-sub mechanism such as Redis, or keep each session on one
designated instance.

## 14. Stable signaling error codes

WebSocket error message:

```json
{
  "version": 1,
  "type": "error",
  "sessionId": "01K5Y2J6Z7H8K9M0N1P2Q3R4S5",
  "payload": {
    "code": "SESSION_EXPIRED",
    "message": "This pairing code has expired. Generate a new code.",
    "retryable": false,
    "requestId": "request-correlation-id"
  }
}
```

Required codes:

- `AUTHENTICATION_REQUIRED`
- `SESSION_NOT_FOUND`
- `SESSION_EXPIRED`
- `SESSION_OCCUPIED`
- `SLOT_MISMATCH`
- `TOKEN_INVALID`
- `TOKEN_CONSUMED`
- `VERSION_UNSUPPORTED`
- `MESSAGE_INVALID`
- `VIEWER_NOT_CONNECTED`
- `SIGNALING_UNAVAILABLE`
- `NEGOTIATION_FAILED`
- `RATE_LIMITED`
- `INTERNAL_ERROR`

Clients must branch on `code`, not on message text.

## 15. Security requirements

- HTTPS and WSS only in production.
- `Cache-Control: no-store` on every token-bearing HTTP response.
- Cryptographically secure, independent, high-entropy tokens.
- Store token hashes and compare them in constant/timing-safe form.
- Single-use mobile pairing tokens.
- Short-lived resume and TURN credentials.
- Strict JSON shape, string length, enum, and message-size validation.
- Validate the HTTP CORS origin and WebSocket `Origin` header against the Fly
  Eye production origins.
- Rate-limit pairing creation, connection attempts, token failures, and
  messages per socket.
- Bind each authenticated socket to one role and one session.
- Never broadcast offers, answers, candidates, or errors to unrelated sockets.
- Redact authorization headers, query strings, tokens, SDP, ICE candidates,
  TURN credentials, and raw request bodies from logs.
- Do not place access tokens in WebSocket URLs.
- Use trusted-proxy configuration explicitly before relying on forwarded IP or
  scheme headers.
- Set finite HTTP, upgrade, authentication, idle, and shutdown timeouts.
- Graceful shutdown closes sockets with a retryable service-restart reason.
- Dependency vulnerability and secret scanning must run in backend CI.

## 16. Rate and capacity defaults for the POC

These are starting limits, not measured production capacity:

- Pairing creation: 20 requests per minute per source IP.
- Failed token joins: 10 per minute per source IP.
- Concurrent sessions: configurable hard limit; start with 100 on the POC VPS.
- One viewer and one camera per session.
- WebSocket messages: 30 per second per socket with a short burst allowance.
- Message size: 64 KiB maximum.
- Pairing TTL: 120 seconds before camera join.
- Recovery window after socket loss: 60 seconds.
- Heartbeat interval: 20 seconds; idle timeout: 45 seconds.

Return `RATE_LIMITED`/HTTP 429 rather than silently dropping legitimate client
requests. Revisit limits using observed metrics before production rollout.

## 17. STUN and TURN

TURN is separate from the signaling process even if both run on the same VPS.
Use a maintained TURN implementation such as Coturn.

Requirements:

- Prefer direct ICE candidates; do not force `relay` transport by default.
- Supply both STUN and TURN entries to both peers.
- Prefer TURN/UDP and provide TURN/TLS-over-TCP fallback.
- Generate temporary credentials using the TURN REST shared-secret mechanism.
- Credentials must outlive the intended match/test connection and recovery
  window, not merely the two-minute QR lifetime.
- Never commit the Coturn shared secret or permanent TURN passwords to either
  client.
- Monitor relay allocations and bandwidth because TURN carries both camera
  streams only when direct connectivity fails.

## 18. Observability

Provide:

- `GET /healthz` for process health without secret details.
- Structured logs with request/session correlation IDs, but hash or truncate
  session IDs if operational policy requires it.
- Counts for sessions created, joined, expired, rejected, active, and closed.
- WebSocket connection and authentication failure counts by stable reason.
- Negotiation message counts without payload bodies.
- Direct-versus-relay media path is observed by the clients through WebRTC
  stats; the signaling server should not claim it knows the selected pair.
- TURN allocation, bandwidth, and failure metrics from the TURN service.
- No player video, SDP, ICE body, or token in logs or traces.

## 19. Required backend tests

### Unit/contract tests

- Successful session creation for A and B.
- Invalid version, slot, match ID, body shape, and unknown fields.
- Cryptographically independent mobile/viewer tokens.
- Token hashes stored instead of raw values.
- Expiry uses server time and is enforced.
- Viewer authentication succeeds once valid and fails safely otherwise.
- Mobile join consumes the correct token.
- Reuse, wrong slot, wrong session, expired token, and occupied slot fail.
- Cross-session and cross-role messages are rejected.
- Offer, answer, and ICE are delivered only to the correct peer.
- Early ICE order is preserved by the relay.
- Disconnect, resume, idle timeout, HTTP delete, and process cleanup.
- Rate, message-size, and capacity limits.
- Logs and public errors contain no secrets or raw signaling bodies.

### Integration tests

- React test client + Flutter test client complete offer/answer and ICE relay.
- One match pairs A and B independently.
- Two matches cannot see each other's signaling.
- Same-Wi-Fi clients establish a direct candidate path.
- Forced relay establishes through TURN.
- Signaling restart produces the approved recovery behavior.
- Fifteen-minute two-camera test does not leak unbounded sessions or sockets.

## 20. Backend delivery checklist

Provide the frontend/mobile developers with:

- Public or staging HTTPS API base URL.
- Public or staging WSS signaling URL.
- Allowed React origins.
- The finalized version-one request/response and WebSocket schemas.
- Stable error-code list.
- STUN/TURN response shape and credential lifetime.
- A test session endpoint or staging environment.
- Deployment/restart behavior.
- Known rate limits.
- A contract-test command or collection.
- One named backend contact for protocol changes.

Any breaking schema change requires a new protocol version. Do not silently
reuse version `1` with incompatible fields or semantics.

## 21. Recommended POC implementation

The backend language is not prescribed. If the team wants a standalone
Node/TypeScript service, a minimal implementation can use:

- The platform HTTP server or the team's existing HTTP framework.
- The `ws` library for WebSocket server support.
- Runtime schema validation using the backend team's standard validator.
- An in-memory map plus deterministic TTL cleanup for the first deployment.
- Coturn as a separate VPS process/container.

Socket.IO is unnecessary for this contract. React uses the browser's native
`WebSocket`; Flutter uses a standard WebSocket client. Raw WebSocket keeps the
wire contract portable across backend languages.

## 22. Open production integration

The POC may start before real backend authentication exists, but production
release remains blocked until the backend defines:

- Operator authentication and match authorization.
- Organization/tournament ownership.
- Abuse protection for public pairing creation.
- Multi-instance session routing.
- Deployment availability and incident-recovery targets.
- Data-retention and security-monitoring policy.

These decisions must not be inferred from the current locally simulated React
session.
