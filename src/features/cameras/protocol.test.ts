import { describe, expect, it } from "vitest";

import {
  CAMERA_PAIRING_PROTOCOL,
  PairingProtocolError,
  parseCameraControlMessage,
  parsePairingQrPayload,
  parsePairingSession,
  parseViewerSignalingMessage,
  serializePairingQrPayload,
} from "./protocol";

const sessionId = "session_0123456789abcdef";
const matchId = "00000000-0000-4000-8000-000000000001";
const cameraId = "00000000-0000-4000-8000-000000000002";
const expiresAt = "2026-08-29T12:02:00.000Z";
const token = "a".repeat(32);

function pairingResponse(overrides: Record<string, unknown> = {}) {
  return {
    protocol: CAMERA_PAIRING_PROTOCOL,
    version: 1,
    sessionId,
    matchId,
    cameraId,
    cameraRole: "SIDELINE_LEFT",
    expiresAt,
    signalingUrl: "wss://signal.fly-eye.example/api/v1/signal",
    mobileToken: token,
    viewerToken: "b".repeat(32),
    ...overrides,
  };
}

describe("pairing protocol", () => {
  it("maps the server pairing session to a QR without exposing the viewer token", () => {
    const session = parsePairingSession(pairingResponse());
    const payload = JSON.parse(serializePairingQrPayload(session)) as Record<
      string,
      unknown
    >;

    expect(payload).toEqual({
      protocol: CAMERA_PAIRING_PROTOCOL,
      version: 1,
      sessionId,
      cameraId,
      cameraRole: "SIDELINE_LEFT",
      signalingUrl: "wss://signal.fly-eye.example/api/v1/signal",
      pairingToken: token,
      expiresAt,
    });
    expect(JSON.stringify(payload)).not.toContain("b".repeat(32));
    expect(parsePairingQrPayload(payload)).toEqual(payload);
  });

  it.each([
    ["unknown property", pairingResponse({ unexpected: true })],
    ["wrong version", pairingResponse({ version: 2 })],
    ["invalid camera ID", pairingResponse({ cameraId: "not-a-uuid" })],
    ["short token", pairingResponse({ mobileToken: "short" })],
    ["invalid expiry", pairingResponse({ expiresAt: "tomorrow" })],
    [
      "non-websocket URL",
      pairingResponse({ signalingUrl: "https://example.com" }),
    ],
  ])("rejects a pairing response with %s", (_label, value) => {
    expect(() => parsePairingSession(value)).toThrow(PairingProtocolError);
  });

  it("rejects QR secrets or unsupported versions with invalid structure", () => {
    const session = parsePairingSession(pairingResponse());
    const payload = JSON.parse(serializePairingQrPayload(session)) as Record<
      string,
      unknown
    >;
    expect(() => parsePairingQrPayload({ ...payload, version: 2 })).toThrow(
      /unsupported/i,
    );
    expect(() =>
      parsePairingQrPayload({ ...payload, viewerToken: "b".repeat(32) }),
    ).toThrow(PairingProtocolError);
  });
});

describe("viewer signaling protocol", () => {
  const envelope = (type: string, payload: object, id = sessionId) => ({
    version: 1,
    type,
    sessionId: id,
    payload,
  });

  it("validates known viewer messages and normalizes opaque transport details", () => {
    expect(
      parseViewerSignalingMessage(
        envelope("authenticated", {
          role: "viewer",
          cameraId,
          cameraRole: "SIDELINE_LEFT",
          expiresAt,
          iceServers: [{ urls: ["stun:stun.example"] }],
        }),
        sessionId,
      ),
    ).toMatchObject({ type: "authenticated", cameraId });
    expect(
      parseViewerSignalingMessage(
        envelope("camera-joined", {
          cameraId,
          cameraRole: "SIDELINE_LEFT",
        }),
        sessionId,
      ),
    ).toMatchObject({ type: "camera-joined", cameraId });
    expect(
      parseViewerSignalingMessage(
        envelope("offer", {
          description: { type: "offer", sdp: "v=0" },
        }),
        sessionId,
      ),
    ).toMatchObject({ type: "offer" });
    expect(
      parseViewerSignalingMessage(
        envelope("ice-candidate", { candidate: null }),
        sessionId,
      ),
    ).toMatchObject({ type: "ice-candidate", candidate: null });
  });

  it.each([
    ["another session", envelope("pong", {}, "session_other_0123456789")],
    ["unknown type", envelope("surprise", {})],
    ["malformed candidate", envelope("ice-candidate", { candidate: {} })],
    ["camera join without camera identity", envelope("camera-joined", {})],
    [
      "unknown error code",
      envelope("error", {
        code: "RAW_SERVER_ERROR",
        message: "secret",
        retryable: false,
        requestId: null,
      }),
    ],
    ["additional payload key", envelope("pong", { extra: true })],
  ])("rejects %s without producing a state message", (_label, value) => {
    expect(() => parseViewerSignalingMessage(value, sessionId)).toThrow(
      PairingProtocolError,
    );
  });
});

describe("camera control protocol", () => {
  it("allows only known inbound control messages", () => {
    expect(
      parseCameraControlMessage({
        version: 1,
        type: "camera.status",
        timestamp: expiresAt,
        payload: { batteryPercent: 80 },
      }),
    ).toMatchObject({ type: "camera.status" });
    expect(
      parseCameraControlMessage({
        version: 1,
        type: "command.succeeded",
        timestamp: expiresAt,
        requestId: "command-1",
      }),
    ).toMatchObject({ type: "command.succeeded", requestId: "command-1" });
  });

  it.each([
    { version: 1, type: "camera.unknown", timestamp: expiresAt, payload: {} },
    { version: 1, type: "camera.status", timestamp: "invalid", payload: {} },
    { version: 1, type: "command.failed", timestamp: expiresAt },
    { version: 2, type: "camera.heartbeat", timestamp: expiresAt, payload: {} },
  ])("fails closed for invalid camera control data", (value) => {
    expect(() => parseCameraControlMessage(value)).toThrow(
      PairingProtocolError,
    );
  });
});
