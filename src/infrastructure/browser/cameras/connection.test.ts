import { describe, expect, it, vi } from "vitest";

import type {
  IceServer,
  PairingSession,
  ViewerSignalingMessage,
} from "../../../features/cameras";
import type {
  CameraConnectionCallbacks,
  CameraRecord,
} from "../../../services";
import { BrowserCameraConnection } from "./connection";
import type { ViewerSignalingTransport } from "./signalingTransport";
import type { BackendPairingClient } from "./pairingClient";

const pairing: PairingSession = {
  protocol: "fly-eye-camera-pairing",
  version: 1,
  sessionId: "session_0123456789abcdef",
  matchId: "00000000-0000-4000-8000-0000-000000000001",
  cameraId: "00000000-0000-4000-8000-0000-000000000002",
  cameraRole: "SIDELINE_LEFT",
  expiresAt: "2026-08-30T12:02:00.000Z",
  signalingUrl: "wss://signal.example/api/v1/signal",
  mobileToken: "a".repeat(32),
  viewerToken: "b".repeat(32),
};

const camera: CameraRecord = {
  id: pairing.cameraId,
  matchId: pairing.matchId,
  name: "Sideline left",
  role: "SIDELINE_LEFT",
  sourceType: "device",
  sourceRef: "device-left",
  resolution: { width: 1280, height: 720 },
  targetFps: 30,
  isActive: true,
  calibration: null,
  createdAt: "2026-08-30T12:00:00.000Z",
};

class FakeTransport implements ViewerSignalingTransport {
  listener: ((message: ViewerSignalingMessage) => void) | null = null;
  onClosedByServer: (() => void) | undefined;
  readonly close = vi.fn();
  readonly sendAnswer = vi.fn();
  readonly sendCandidate = vi.fn();
  readonly leave = vi.fn();

  async connect(
    _pairing: PairingSession,
    listener: (message: ViewerSignalingMessage) => void,
    onClosedByServer?: () => void,
  ) {
    this.listener = listener;
    this.onClosedByServer = onClosedByServer;
  }

  emit(message: ViewerSignalingMessage) {
    this.listener?.(message);
  }

  closeUnexpectedly() {
    this.onClosedByServer?.();
  }
}

interface FakePeer {
  start(sessionId: string, iceServers: readonly IceServer[]): void;
  acceptOffer(description: { type: "offer"; sdp: string }): Promise<void>;
  addCandidate(candidate: unknown): Promise<void>;
  close(): void;
  state(state: RTCPeerConnectionState): void;
}

function authenticated(iceServers: readonly IceServer[] = []) {
  return {
    type: "authenticated" as const,
    sessionId: pairing.sessionId,
    cameraId: pairing.cameraId,
    cameraRole: pairing.cameraRole,
    expiresAt: pairing.expiresAt,
    iceServers,
  };
}

describe("BrowserCameraConnection", () => {
  it("replaces a lost peer only after the phone rejoins and offers again", async () => {
    const transport = new FakeTransport();
    const callbacks: CameraConnectionCallbacks = {
      onPairing: vi.fn(),
      onStream: vi.fn(),
      onState: vi.fn(),
      onError: vi.fn(),
    };
    const peers: FakePeer[] = [];
    const connection = new BrowserCameraConnection(
      {
        create: vi.fn(async () => pairing),
        cancel: vi.fn(async () => undefined),
      } as unknown as BackendPairingClient,
      callbacks,
      {
        createTransport: () => transport,
        createPeer: (_transport, peerCallbacks) => {
          const peer: FakePeer = {
            start: vi.fn(),
            acceptOffer: vi.fn(async () => undefined),
            addCandidate: vi.fn(async () => undefined),
            close: vi.fn(),
            state: (state) => peerCallbacks.onConnectionState(state),
          };
          peers.push(peer);
          return peer;
        },
        setTimeout: () => 1,
        clearTimeout: vi.fn(),
      },
    );

    await connection.begin(pairing.matchId, camera);
    transport.emit(authenticated([{ urls: ["stun:stun.example"] }]));
    transport.emit({
      type: "camera-joined",
      sessionId: pairing.sessionId,
      cameraId: pairing.cameraId,
      cameraRole: pairing.cameraRole,
    });
    peers[0].state("connected");

    transport.emit({
      type: "camera-left",
      sessionId: pairing.sessionId,
      retryable: true,
    });
    expect(peers[0].close).toHaveBeenCalledOnce();
    expect(callbacks.onState).toHaveBeenLastCalledWith("reconnecting");

    transport.emit({
      type: "camera-joined",
      sessionId: pairing.sessionId,
      cameraId: pairing.cameraId,
      cameraRole: pairing.cameraRole,
    });
    transport.emit({
      type: "offer",
      sessionId: pairing.sessionId,
      description: { type: "offer", sdp: "v=0" },
    });

    expect(peers).toHaveLength(2);
    expect(peers[1].start).toHaveBeenCalledWith(pairing.sessionId, [
      { urls: ["stun:stun.example"] },
    ]);
    expect(peers[1].acceptOffer).toHaveBeenCalledWith({
      type: "offer",
      sdp: "v=0",
    });
  });

  it("clears the camera when the signaling server closes its viewer socket", async () => {
    const transport = new FakeTransport();
    const callbacks: CameraConnectionCallbacks = {
      onPairing: vi.fn(),
      onStream: vi.fn(),
      onState: vi.fn(),
      onError: vi.fn(),
    };
    const connection = new BrowserCameraConnection(
      {
        create: vi.fn(async () => pairing),
        cancel: vi.fn(async () => undefined),
      } as unknown as BackendPairingClient,
      callbacks,
      {
        createTransport: () => transport,
        createPeer: () => ({
          start: () => undefined,
          acceptOffer: async () => undefined,
          addCandidate: async () => undefined,
          close: () => undefined,
        }),
        setTimeout: () => 1,
        clearTimeout: vi.fn(),
      },
    );

    await connection.begin(pairing.matchId, camera);
    transport.closeUnexpectedly();

    expect(callbacks.onState).toHaveBeenCalledWith("error");
  });
});
