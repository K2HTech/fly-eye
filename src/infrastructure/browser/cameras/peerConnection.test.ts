import { describe, expect, it, vi } from "vitest";

import type { IceServer, SignalingCandidate } from "../../../features/cameras";
import {
  BrowserPeerConnection,
  type PeerConnectionLike,
} from "./peerConnection";
import type { ViewerSignalingTransport } from "./signalingTransport";

const sessionId = "session_0123456789abcdef";
const candidate: SignalingCandidate = {
  candidate: "candidate:1",
  sdpMid: "0",
  sdpMLineIndex: 0,
  usernameFragment: null,
};

class FakePeer implements PeerConnectionLike {
  connectionState: RTCPeerConnectionState = "new";
  remoteDescription: RTCSessionDescription | null = null;
  onicecandidate: ((event: RTCPeerConnectionIceEvent) => void) | null = null;
  ontrack: ((event: RTCTrackEvent) => void) | null = null;
  onconnectionstatechange: ((event: Event) => void) | null = null;
  ondatachannel: ((event: RTCDataChannelEvent) => void) | null = null;
  readonly candidates: (RTCIceCandidateInit | null)[] = [];
  readonly setRemoteDescription = vi.fn(
    async (description: RTCSessionDescriptionInit) => {
      this.remoteDescription = description as RTCSessionDescription;
    },
  );
  readonly createAnswer = vi.fn(async () => ({
    type: "answer" as const,
    sdp: "v=0",
  }));
  readonly setLocalDescription = vi.fn(async () => undefined);
  readonly addIceCandidate = vi.fn(
    async (value: RTCIceCandidateInit | null) => {
      this.candidates.push(value);
    },
  );
  readonly getStats = vi.fn(async () => {
    const reports = [
      {
        type: "inbound-rtp",
        kind: "video",
        frameWidth: 1280,
        frameHeight: 720,
        framesPerSecond: 30,
        packetsLost: 1,
      },
      { type: "candidate-pair", selected: true, localCandidateType: "host" },
    ];
    return {
      forEach: (callback: (report: Record<string, unknown>) => void) =>
        reports.forEach(callback),
    } as unknown as RTCStatsReport;
  });
  readonly close = vi.fn();
}

function transport(): ViewerSignalingTransport {
  return {
    connect: vi.fn(),
    sendAnswer: vi.fn(),
    sendCandidate: vi.fn(),
    leave: vi.fn(),
    close: vi.fn(),
  };
}

describe("BrowserPeerConnection", () => {
  it("queues early ICE, answers the Flutter offer, and exposes bounded diagnostics", async () => {
    const peer = new FakePeer();
    const signaling = transport();
    const connection = new BrowserPeerConnection(
      signaling,
      {
        onVideoStream: vi.fn(),
        onConnectionState: vi.fn(),
        onCameraControl: vi.fn(),
        onProtocolError: vi.fn(),
      },
      { create: vi.fn(() => peer) },
    );
    const iceServers: readonly IceServer[] = [{ urls: ["stun:stun.example"] }];
    connection.start(sessionId, iceServers);
    await connection.addCandidate(candidate);
    expect(peer.candidates).toEqual([]);

    await connection.acceptOffer({ type: "offer", sdp: "v=0" });
    expect(peer.candidates).toEqual([
      {
        candidate: "candidate:1",
        sdpMid: "0",
        sdpMLineIndex: 0,
        usernameFragment: null,
      },
    ]);
    expect(signaling.sendAnswer).toHaveBeenCalledWith(sessionId, {
      type: "answer",
      sdp: "v=0",
    });
    await expect(connection.diagnostics()).resolves.toEqual({
      width: 1280,
      height: 720,
      framesPerSecond: 30,
      packetsLost: 1,
      candidateType: "direct",
    });
  });

  it("closes resources idempotently and rejects stale work after cleanup", async () => {
    const peer = new FakePeer();
    const connection = new BrowserPeerConnection(
      transport(),
      {
        onVideoStream: vi.fn(),
        onConnectionState: vi.fn(),
        onCameraControl: vi.fn(),
        onProtocolError: vi.fn(),
      },
      { create: () => peer },
    );
    connection.start(sessionId, []);
    connection.close();
    connection.close();
    expect(peer.close).toHaveBeenCalledTimes(1);
    await expect(connection.addCandidate(candidate)).rejects.toThrow(
      /not active/i,
    );
  });
});
