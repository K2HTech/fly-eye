import { describe, expect, it } from "vitest";

import type { PairingSession } from "./protocol";
import {
  initialCameraSession,
  publicSignalingError,
  reduceCameraSession,
} from "./sessionModel";

const pairing: PairingSession = {
  protocol: "fly-eye-camera-pairing",
  version: 1,
  sessionId: "session_0123456789abcdef",
  matchId: "00000000-0000-4000-8000-000000000001",
  cameraId: "00000000-0000-4000-8000-000000000002",
  cameraRole: "SIDELINE_LEFT",
  expiresAt: "2026-08-29T12:02:00.000Z",
  signalingUrl: "wss://signal.fly-eye.example/api/v1/signal",
  mobileToken: "a".repeat(32),
  viewerToken: "b".repeat(32),
};

describe("camera session state model", () => {
  it("moves a current camera through the permitted pairing lifecycle", () => {
    let snapshot = initialCameraSession("SIDELINE_LEFT");
    snapshot = reduceCameraSession(snapshot, { type: "create" });
    snapshot = reduceCameraSession(snapshot, { type: "created", pairing });
    snapshot = reduceCameraSession(snapshot, {
      type: "camera-joined",
      sessionId: pairing.sessionId,
    });
    snapshot = reduceCameraSession(snapshot, {
      type: "connected",
      sessionId: pairing.sessionId,
    });
    expect(snapshot).toMatchObject({
      state: "connected",
      cameraId: pairing.cameraId,
    });
    expect(JSON.stringify(snapshot)).not.toContain(pairing.mobileToken);
    expect(JSON.stringify(snapshot)).not.toContain(pairing.viewerToken);
  });

  it("rejects stale, cross-session, and cross-role events", () => {
    const creating = reduceCameraSession(
      initialCameraSession("SIDELINE_LEFT"),
      {
        type: "create",
      },
    );
    expect(
      reduceCameraSession(creating, {
        type: "created",
        pairing: { ...pairing, cameraRole: "SIDELINE_RIGHT" },
      }),
    ).toBe(creating);
    const awaiting = reduceCameraSession(creating, {
      type: "created",
      pairing,
    });
    expect(
      reduceCameraSession(awaiting, {
        type: "camera-joined",
        sessionId: "session_other_0123456789",
      }),
    ).toBe(awaiting);
  });

  it("turns expiry into a safe retryable public error and disconnects only on request", () => {
    let snapshot = reduceCameraSession(initialCameraSession("SIDELINE_LEFT"), {
      type: "create",
    });
    snapshot = reduceCameraSession(snapshot, { type: "created", pairing });
    snapshot = reduceCameraSession(snapshot, {
      type: "expired",
      sessionId: pairing.sessionId,
    });
    expect(snapshot).toMatchObject({
      state: "error",
      error: { code: "PAIRING_EXPIRED", retryable: true },
    });
    const disconnected = reduceCameraSession(snapshot, {
      type: "disconnect",
      sessionId: pairing.sessionId,
    });
    expect(disconnected).toMatchObject({
      state: "disconnected",
      sessionId: null,
    });
  });

  it("maps stable server errors without retaining raw remote text", () => {
    expect(publicSignalingError("TOKEN_INVALID", false)).toEqual({
      code: "TOKEN_INVALID",
      message: "The camera pairing code is invalid. Generate a new code.",
      retryable: false,
    });
  });
});
