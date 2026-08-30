import { afterEach, describe, expect, it, vi } from "vitest";

import type { PairingSession } from "../../../features/cameras";
import {
  BrowserViewerSignalingTransport,
  type WebSocketLike,
} from "./signalingTransport";

const pairing: PairingSession = {
  protocol: "fly-eye-camera-pairing",
  version: 1,
  sessionId: "session_0123456789abcdef",
  matchId: "00000000-0000-4000-8000-000000000001",
  cameraId: "00000000-0000-4000-8000-000000000002",
  cameraRole: "SIDELINE_LEFT",
  expiresAt: "2026-08-29T12:02:00.000Z",
  signalingUrl: "wss://signal.example/api/v1/signal",
  mobileToken: "a".repeat(32),
  viewerToken: "b".repeat(32),
};

class FakeSocket implements WebSocketLike {
  readyState = 0;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent<unknown>) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  readonly sent: string[] = [];

  send(data: string) {
    this.sent.push(data);
  }

  close() {
    this.readyState = 3;
  }

  closeFromServer(code = 1006) {
    this.readyState = 3;
    this.onclose?.({ code } as CloseEvent);
  }

  open() {
    this.readyState = 1;
    this.onopen?.(new Event("open"));
  }

  message(value: unknown) {
    this.onmessage?.(
      new MessageEvent("message", { data: JSON.stringify(value) }),
    );
  }
}

describe("BrowserViewerSignalingTransport", () => {
  afterEach(() => vi.useRealTimers());

  it("authenticates first, validates messages, and sends only supported outbound envelopes", async () => {
    const socket = new FakeSocket();
    const transport = new BrowserViewerSignalingTransport({
      create: () => socket,
    });
    const messages: string[] = [];
    const connected = transport.connect(pairing, (message) =>
      messages.push(message.type),
    );
    socket.open();
    await connected;

    expect(JSON.parse(socket.sent[0])).toEqual({
      version: 1,
      type: "authenticate",
      sessionId: pairing.sessionId,
      payload: { role: "viewer", token: pairing.viewerToken },
    });
    socket.message({
      version: 1,
      type: "camera-joined",
      sessionId: pairing.sessionId,
      payload: {
        cameraId: pairing.cameraId,
        cameraRole: pairing.cameraRole,
      },
    });
    expect(messages).toEqual(["camera-joined"]);

    transport.sendAnswer(pairing.sessionId, { type: "answer", sdp: "v=0" });
    transport.sendCandidate(pairing.sessionId, null);
    transport.leave(pairing.sessionId);
    expect(socket.sent.map((value) => JSON.parse(value).type)).toEqual([
      "authenticate",
      "answer",
      "ice-candidate",
      "leave",
    ]);
  });

  it("fails closed for an invalid or cross-session inbound message", async () => {
    const socket = new FakeSocket();
    const transport = new BrowserViewerSignalingTransport({
      create: () => socket,
    });
    const connected = transport.connect(pairing, () => undefined);
    socket.open();
    await connected;
    socket.message({
      version: 1,
      type: "pong",
      sessionId: "session_other_0123456789",
      payload: {},
    });
    expect(() =>
      transport.sendAnswer(pairing.sessionId, { type: "offer", sdp: "v=0" }),
    ).toThrow(/invalid WebRTC answer/i);
  });

  it("does not send after cleanup", async () => {
    const socket = new FakeSocket();
    const transport = new BrowserViewerSignalingTransport({
      create: () => socket,
    });
    const connected = transport.connect(pairing, () => undefined);
    socket.open();
    await connected;
    transport.close();
    expect(() => transport.leave(pairing.sessionId)).toThrow(/not connected/i);
  });

  it("keeps an authenticated viewer session alive with heartbeats", async () => {
    vi.useFakeTimers();
    const socket = new FakeSocket();
    const transport = new BrowserViewerSignalingTransport({
      create: () => socket,
    });
    const connected = transport.connect(pairing, () => undefined);
    socket.open();
    await connected;
    socket.message({
      version: 1,
      type: "authenticated",
      sessionId: pairing.sessionId,
      payload: {
        role: "viewer",
        cameraId: pairing.cameraId,
        cameraRole: pairing.cameraRole,
        expiresAt: pairing.expiresAt,
        iceServers: [],
      },
    });

    vi.advanceTimersByTime(20_000);
    expect(JSON.parse(socket.sent.at(-1) ?? "{}")).toEqual({
      version: 1,
      type: "ping",
      sessionId: pairing.sessionId,
      payload: {},
    });

    transport.close();
    vi.advanceTimersByTime(20_000);
    expect(socket.sent).toHaveLength(2);
  });

  it("notifies its owner when the server closes the viewer socket", async () => {
    const socket = new FakeSocket();
    const transport = new BrowserViewerSignalingTransport({
      create: () => socket,
    });
    const onClosedByServer = vi.fn();
    const connected = transport.connect(
      pairing,
      () => undefined,
      onClosedByServer,
    );
    socket.open();
    await connected;

    socket.closeFromServer(1000);

    expect(onClosedByServer).toHaveBeenCalledOnce();
  });
});
