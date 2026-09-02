# Mobile Camera Recovery Handoff

Status: Contract for Flutter implementation and cross-client testing

This document defines how the Fly Eye Flutter camera application recovers a
temporary connection loss. It follows the implemented backend WebSocket
contract. It does not authorize a different signaling protocol or persistent
storage of pairing credentials.

## Goal

For a temporary network interruption, the camera app reconnects to the same
in-memory pairing session without another QR scan. A deliberate operator or
camera-user disconnect ends the session and requires a new QR pairing.

## Shared operator wording

Both applications use these terms with the same meanings. Do not substitute
_disconnect_, _connection lost_, or _failed_ for one another in operator-facing
copy.

| Situation                                                    | Shared state text            | Meaning and next action                                                                |
| ------------------------------------------------------------ | ---------------------------- | -------------------------------------------------------------------------------------- |
| Camera is delivering a current preview                       | **Live**                     | Normal operation.                                                                      |
| A network or WebRTC failure is being recovered automatically | **Reconnecting camera…**     | Keep the app open; the mobile app retries within 60 seconds.                           |
| The user tapped Disconnect on the phone                      | **Camera disconnected**      | Intentional terminal state. Scan a new QR to connect again; never retry automatically. |
| Recovery expires or cannot be completed                      | **Camera connection failed** | Pair a phone again with a new QR.                                                      |
| No phone has been paired yet                                 | **Disconnected**             | Pair a phone. This is not a failure.                                                   |

Use **Disconnect camera** for the explicit mobile action and **Pair phone** for
the web action. Web UI can use **Reconnect a camera** as a page heading only
when it is asking the operator to pair again; it is not the transient recovery
state.

## State kept only in memory

After a successful `joined` message, retain these values only while the camera
app process is active:

- `sessionId`
- `cameraId`
- `signalingUrl`
- `peerToken` returned in `joined.payload.peerToken`

Never store the QR `pairingToken`, `peerToken`, SDP, ICE candidates, or TURN
credentials on disk, in shared preferences, logs, analytics, screenshots, or
crash reports. The QR `pairingToken` is consumed by the initial join and is
not used for recovery.

## Normal initial connection

1. Scan the QR and validate its protocol/version, expiry, `cameraId`, and
   `signalingUrl`.
2. Connect to `signalingUrl`.
3. Send the initial `join` message with QR `cameraId` and `pairingToken`.
4. Receive `joined`; retain its `peerToken` in memory and use its `iceServers`.
5. Wait for `viewer-ready`.
6. Create the WebRTC peer connection, add one video track and the
   `fly-eye-control-v1` data channel, then send an SDP `offer` and trickle ICE
   candidates.

## Temporary network loss: automatic recovery

Treat a WebSocket close, WebRTC `disconnected`/`failed` state, or a sustained
media stall as a temporary loss unless the user explicitly selected
Disconnect.

1. Show **Reconnecting camera…** in the mobile UI. Do not ask the user to scan
   another QR yet.
2. Close the failed signaling socket and peer connection. Create a fresh peer
   connection for recovery; do not reuse a failed connection.
3. Retry the signaling socket with bounded backoff for no more than 60 seconds
   from the first loss.
4. Immediately after the new socket opens, send this as its first message:

```json
{
  "version": 1,
  "type": "resume",
  "sessionId": "<in-memory sessionId>",
  "payload": {
    "role": "camera",
    "peerToken": "<in-memory peerToken>"
  }
}
```

5. On `joined`, use the returned `iceServers`. Wait for `viewer-ready`, then
   send a fresh offer and trickle ICE candidates exactly as in the normal flow.
6. When WebRTC reaches `connected` and video is flowing, show **Live** again.

The backend accepts resume only during its recovery window (currently 60
seconds). It validates the session and `peerToken`; the mobile app must not
send `cameraId`, `cameraRole`, or the original `pairingToken` in `resume`.

## Heartbeat

The backend closes an idle signaling binding after 45 seconds. After every
successful `joined` message—both initial join and resumed join—send this
application heartbeat every 20 seconds while the signaling socket is open:

```json
{
  "version": 1,
  "type": "ping",
  "sessionId": "<in-memory sessionId>",
  "payload": {}
}
```

Accept `pong` as transport health confirmation. Continue heartbeats while
media flows; WebRTC media packets do not refresh signaling-session idle time.

## Explicit user disconnect

When the camera-user intentionally taps Disconnect:

1. Stop capture and close the peer connection/data channel.
2. If the signaling socket is open, send `leave` with an empty payload.
3. Close the signaling socket and stop heartbeat/retry timers.
4. Clear all in-memory pairing state, including `peerToken`.
5. Show **Camera disconnected — scan a new QR to reconnect**.

An explicit disconnect must never silently resume. The operator creates a new
pairing QR from Fly Eye when ready. The signaling server must forward this to
React as `camera-left` with `{"retryable":false}` so the monitor clears the
preview and displays **Camera disconnected** instead of presenting a temporary
recovery state. The currently deployed backend reports every socket departure
as retryable; backend must make this distinction before explicit-disconnect UX
is considered complete. Until then, React treats a server-closed viewer socket
as a generic connection error and returns the operator to camera setup; it
cannot reliably identify that the phone user chose Disconnect.

## Recovery failures

Stop automatic retries and tell the camera-user to request a new QR when the
backend returns `SESSION_EXPIRED`, `SESSION_NOT_FOUND`, `TOKEN_INVALID`, or
`TOKEN_CONSUMED`, or when the 60-second recovery window elapses. Do not retry
indefinitely.

## React dependency and acceptance test

Fly Eye keeps the viewer signaling binding alive with its own heartbeat. When
the backend reports a retryable `camera-left`, it keeps the last preview only
behind a visible **Reconnecting camera…** overlay, disposes the failed browser
peer, and waits up to 60 seconds for the mobile `resume` flow. The mobile's
subsequent `camera-joined` and offer create a fresh browser peer and restore
the live preview without a new QR.

For cross-client acceptance once both clients implement recovery:

1. Pair one phone and confirm live video for at least 70 seconds.
2. Disable phone Wi-Fi for 5 seconds, then restore it.
3. Confirm the phone sends `resume`, receives `joined` and `viewer-ready`, and
   sends a new offer.
4. Confirm Fly Eye renders a live preview again without a QR scan.
5. Repeat with an explicit mobile Disconnect and verify no automatic resume
   occurs.
