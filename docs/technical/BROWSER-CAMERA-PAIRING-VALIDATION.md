# Browser Camera Pairing Validation Checklist

Status: Required, deferred manual validation

This checklist preserves the real-environment acceptance work that cannot be
proven by the automated browser test suite. It applies to normal authenticated
operator sessions only; the isolated demo remains a separate simulated path.

Run it before declaring browser camera pairing ready for operational use, after
any material change to the Flutter camera application, signaling service,
STUN/TURN infrastructure, browser camera adapter, or deployed frontend origin.

## Preconditions

- Use a current supported Chrome build on the operator laptop and compatible
  Flutter builds on one or two phones.
- Put the laptop and phones on the intended court Wi-Fi network.
- Configure reachable public API and WSS signaling endpoints, with the exact
  frontend origin allowed by HTTP and WebSocket origin policy.
- Sign in with a normal test operator; never place account credentials in an
  environment file or QR payload.
- Create or select a draft match with its left and right backend camera
  records.

## Required acceptance matrix

| ID         | Scenario                                                                                                                  | Expected result                                                                                                                                                                                                              |
| ---------- | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CAM-E2E-01 | Pair one phone to either camera role and wait for a first frame.                                                          | The matching readiness and live-monitor panel shows the phone's live video within 10 seconds of QR scan. Monitoring can start with that one decoded preview.                                                                 |
| CAM-E2E-02 | Pair a second phone to the remaining role.                                                                                | Both panels display the correct role's independent live video; replacing or losing one does not remove the other.                                                                                                            |
| CAM-E2E-03 | Let a QR code expire, then regenerate it.                                                                                 | The expired code cannot pair; a newly generated code creates a usable replacement session.                                                                                                                                   |
| CAM-E2E-04 | Scan the same QR twice, or attempt to attach an already-used role.                                                        | The service rejects the duplicate safely; the existing healthy preview remains unaffected.                                                                                                                                   |
| CAM-E2E-05 | Use the mobile application's explicit **Disconnect camera** action.                                                       | The phone stops capture and leaves its session. The web UI reports **Camera disconnected** and returns to camera setup only when no other preview remains. It must not claim automatic recovery for this intentional action. |
| CAM-E2E-06 | Interrupt phone Wi-Fi briefly, then restore it before the mobile resume window expires.                                   | The UI reports **Reconnecting camera…** while the previous frame is not labelled live, then receives a new offer and returns to **Live** within 15 seconds when infrastructure is healthy.                                   |
| CAM-E2E-07 | Leave the network interrupted or force WebRTC failure.                                                                    | The UI exposes an actionable repair path without leaking SDP, ICE addresses, tokens, or raw transport exceptions.                                                                                                            |
| CAM-E2E-08 | Refresh, sign out, change match, or leave the protected workflow while connected.                                         | Browser-owned peers close. A later normal session requires fresh pairing and cannot present a stale stream as live.                                                                                                          |
| CAM-E2E-09 | Confirm the selected candidate pair on the same court Wi-Fi.                                                              | WebRTC chooses a direct host/local path when the network permits it; record the result and any network condition that prevents direct connectivity.                                                                          |
| CAM-E2E-10 | Block direct peer connectivity while keeping the public service reachable.                                                | Media succeeds through configured TURN fallback, or the failure is recorded as an infrastructure issue rather than a UI success.                                                                                             |
| CAM-E2E-11 | Keep one and then two 1280×720/30-FPS previews active for 15 minutes.                                                     | No browser crash, unbounded memory/resource growth, or unintended connection loss occurs. Record received FPS and packet loss where diagnostics provide them.                                                                |
| CAM-E2E-12 | Measure glass-to-glass latency on the same LAN using a visible time source captured by the phone and shown on the laptop. | Record method, network, phone/browser models, and result. The approved target is at most 500 ms, with 250 ms preferred.                                                                                                      |
| CAM-E2E-13 | Inspect browser storage, visible errors, and release logs after the above cases.                                          | Passwords, JWTs, pairing tokens, TURN credentials, SDP, and ICE details are absent.                                                                                                                                          |

## Evidence to retain

For every run, record the application versions, API/signaling deployment,
network topology, device/browser models, test date, pass/fail outcome, and a
short failure description. Attach screenshots or logs only after removing
secrets and network credentials.

The checklist does not make Tauri runtime support, recording, synchronization,
calibration, or line-call processing claims; those capabilities require their
own validation when implemented.
