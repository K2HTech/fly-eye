import {
  PairingProtocolError,
  parseViewerSignalingMessage,
  type PairingSession,
  type ViewerSignalingMessage,
} from "../../../features/cameras";

export interface WebSocketLike {
  readonly readyState: number;
  onopen: ((event: Event) => void) | null;
  onmessage: ((event: MessageEvent<unknown>) => void) | null;
  onerror: ((event: Event) => void) | null;
  onclose: ((event: CloseEvent) => void) | null;
  send(data: string): void;
  close(code?: number, reason?: string): void;
}

export interface WebSocketFactory {
  create(url: string): WebSocketLike;
}

export class SignalingTransportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SignalingTransportError";
  }
}

export interface ViewerSignalingTransport {
  connect(
    pairing: PairingSession,
    listener: (message: ViewerSignalingMessage) => void,
  ): Promise<void>;
  sendAnswer(sessionId: string, description: RTCSessionDescriptionInit): void;
  sendCandidate(sessionId: string, candidate: RTCIceCandidateInit | null): void;
  leave(sessionId: string): void;
  close(): void;
}

function safeDescription(description: RTCSessionDescriptionInit) {
  if (description.type !== "answer" || typeof description.sdp !== "string") {
    throw new SignalingTransportError(
      "Unable to send an invalid WebRTC answer.",
    );
  }
  return { type: "answer", sdp: description.sdp };
}

function safeCandidate(candidate: RTCIceCandidateInit | null) {
  if (candidate === null) return null;
  if (typeof candidate.candidate !== "string") {
    throw new SignalingTransportError(
      "Unable to send an invalid ICE candidate.",
    );
  }
  return {
    candidate: candidate.candidate,
    sdpMid: candidate.sdpMid ?? null,
    sdpMLineIndex: candidate.sdpMLineIndex ?? null,
    usernameFragment: candidate.usernameFragment ?? null,
  };
}

export class BrowserViewerSignalingTransport implements ViewerSignalingTransport {
  private socket: WebSocketLike | null = null;
  private sessionId: string | null = null;

  constructor(private readonly factory: WebSocketFactory) {}

  connect(
    pairing: PairingSession,
    listener: (message: ViewerSignalingMessage) => void,
  ): Promise<void> {
    this.close();
    const socket = this.factory.create(pairing.signalingUrl);
    this.socket = socket;
    this.sessionId = pairing.sessionId;
    return new Promise((resolve, reject) => {
      let settled = false;
      const fail = (message: string) => {
        if (settled) return;
        settled = true;
        reject(new SignalingTransportError(message));
      };
      socket.onopen = () => {
        try {
          socket.send(
            JSON.stringify({
              version: 1,
              type: "authenticate",
              sessionId: pairing.sessionId,
              payload: { role: "viewer", token: pairing.viewerToken },
            }),
          );
          if (!settled) {
            settled = true;
            resolve();
          }
        } catch {
          fail("Unable to authenticate the camera signaling session.");
        }
      };
      socket.onmessage = (event) => {
        if (typeof event.data !== "string") return;
        try {
          listener(
            parseViewerSignalingMessage(
              JSON.parse(event.data) as unknown,
              pairing.sessionId,
            ),
          );
        } catch (error) {
          if (error instanceof PairingProtocolError) {
            fail("Fly Eye received an invalid camera signaling message.");
          }
        }
      };
      socket.onerror = () => fail("Unable to connect to camera signaling.");
      socket.onclose = (event) => {
        if (!settled) fail("Camera signaling closed before pairing completed.");
        if (this.socket === socket) this.socket = null;
        if (this.sessionId === pairing.sessionId) this.sessionId = null;
        if (event.code !== 1000 && event.code !== 1001) {
          /* The connection owner classifies recovery after it observes closure. */
        }
      };
    });
  }

  sendAnswer(sessionId: string, description: RTCSessionDescriptionInit): void {
    this.send(sessionId, "answer", {
      description: safeDescription(description),
    });
  }

  sendCandidate(
    sessionId: string,
    candidate: RTCIceCandidateInit | null,
  ): void {
    this.send(sessionId, "ice-candidate", {
      candidate: safeCandidate(candidate),
    });
  }

  leave(sessionId: string): void {
    this.send(sessionId, "leave", {});
  }

  close(): void {
    const socket = this.socket;
    this.socket = null;
    this.sessionId = null;
    if (socket) socket.close(1000, "Fly Eye camera session closed");
  }

  private send(sessionId: string, type: string, payload: object): void {
    if (
      !this.socket ||
      this.sessionId !== sessionId ||
      this.socket.readyState !== 1
    ) {
      throw new SignalingTransportError("Camera signaling is not connected.");
    }
    this.socket.send(JSON.stringify({ version: 1, type, sessionId, payload }));
  }
}

export function createBrowserViewerSignalingTransport(
  factory: WebSocketFactory = { create: (url) => new WebSocket(url) },
): BrowserViewerSignalingTransport {
  return new BrowserViewerSignalingTransport(factory);
}
