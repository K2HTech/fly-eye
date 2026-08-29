import { describe, expect, it, vi } from "vitest";

import type { BackendHttpClient } from "../../backend";
import { BackendRequestError } from "../../backend";
import { BackendPairingClient } from "./pairingClient";

const matchId = "00000000-0000-4000-8000-000000000001";
const cameraId = "00000000-0000-4000-8000-000000000002";
const session = {
  protocol: "fly-eye-camera-pairing",
  version: 1,
  sessionId: "session_0123456789abcdef",
  matchId,
  cameraId,
  cameraRole: "SIDELINE_LEFT",
  expiresAt: "2026-08-29T12:02:00.000Z",
  signalingUrl: "wss://signal.example/api/v1/signal",
  mobileToken: "a".repeat(32),
  viewerToken: "b".repeat(32),
};

function client(request: BackendHttpClient["request"]): BackendHttpClient {
  return { request };
}

describe("BackendPairingClient", () => {
  it("creates only a matching pairing at the configured signaling endpoint", async () => {
    const request = vi.fn().mockResolvedValue(session);
    const pairing = new BackendPairingClient(
      client(request),
      "wss://signal.example/api/v1/signal",
    );

    await expect(pairing.create(matchId, cameraId)).resolves.toMatchObject({
      sessionId: session.sessionId,
    });
    expect(request).toHaveBeenCalledWith("camera-pairings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ version: 1, matchId, cameraId }),
    });
  });

  it.each([
    ["another match", { ...session, matchId: cameraId }],
    ["another camera", { ...session, cameraId: matchId }],
    [
      "another signaling endpoint",
      { ...session, signalingUrl: "wss://unexpected.example/api/v1/signal" },
    ],
    ["invalid external data", { ...session, viewerToken: "short" }],
  ])("fails closed for %s", async (_label, response) => {
    const pairing = new BackendPairingClient(
      client(vi.fn().mockResolvedValue(response)),
      "wss://signal.example/api/v1/signal",
    );
    await expect(pairing.create(matchId, cameraId)).rejects.toThrow(
      /pairing|signaling|camera/i,
    );
  });

  it("treats an already-cleaned pairing as canceled", async () => {
    const request = vi.fn().mockRejectedValue(
      new BackendRequestError("not found", {
        status: 404,
        code: "NOT_FOUND",
        requestId: null,
      }),
    );
    const pairing = new BackendPairingClient(
      client(request),
      "wss://signal.example/api/v1/signal",
    );
    await expect(pairing.cancel(session.sessionId)).resolves.toBeUndefined();
  });
});
