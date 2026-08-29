import {
  parseCameraControlMessage,
  type IceServer,
  type SignalingCandidate,
} from "../../../features/cameras";
import type { ViewerSignalingTransport } from "./signalingTransport";

export interface PeerDataChannel {
  label: string;
  onmessage: ((event: MessageEvent<unknown>) => void) | null;
  close(): void;
}

export interface PeerConnectionLike {
  connectionState: RTCPeerConnectionState;
  remoteDescription: RTCSessionDescription | null;
  onicecandidate: ((event: RTCPeerConnectionIceEvent) => void) | null;
  ontrack: ((event: RTCTrackEvent) => void) | null;
  onconnectionstatechange: ((event: Event) => void) | null;
  ondatachannel: ((event: RTCDataChannelEvent) => void) | null;
  setRemoteDescription(description: RTCSessionDescriptionInit): Promise<void>;
  createAnswer(): Promise<RTCSessionDescriptionInit>;
  setLocalDescription(description: RTCSessionDescriptionInit): Promise<void>;
  addIceCandidate(candidate: RTCIceCandidateInit | null): Promise<void>;
  getStats(): Promise<RTCStatsReport>;
  close(): void;
}

export interface PeerConnectionFactory {
  create(configuration: RTCConfiguration): PeerConnectionLike;
}

export interface CameraDiagnostics {
  readonly width: number | null;
  readonly height: number | null;
  readonly framesPerSecond: number | null;
  readonly packetsLost: number | null;
  readonly candidateType: "direct" | "relay" | null;
}

export interface PeerConnectionCallbacks {
  onVideoStream(stream: MediaStream): void;
  onConnectionState(state: RTCPeerConnectionState): void;
  onCameraControl(message: ReturnType<typeof parseCameraControlMessage>): void;
  onProtocolError(): void;
}

function toIceConfiguration(servers: readonly IceServer[]): RTCConfiguration {
  return {
    iceServers: servers.map((server) => ({
      urls: [...server.urls],
      ...(server.username ? { username: server.username } : {}),
      ...(server.credential ? { credential: server.credential } : {}),
    })),
  };
}

function toCandidate(
  candidate: SignalingCandidate | null,
): RTCIceCandidateInit | null {
  if (candidate === null) return null;
  return {
    candidate: candidate.candidate,
    sdpMid: candidate.sdpMid,
    sdpMLineIndex: candidate.sdpMLineIndex,
    usernameFragment: candidate.usernameFragment,
  };
}

export class BrowserPeerConnection {
  private peer: PeerConnectionLike | null = null;
  private channel: PeerDataChannel | null = null;
  private sessionId: string | null = null;
  private pendingCandidates: (RTCIceCandidateInit | null)[] = [];
  private closed = false;

  constructor(
    private readonly transport: ViewerSignalingTransport,
    private readonly callbacks: PeerConnectionCallbacks,
    private readonly factory: PeerConnectionFactory = {
      create: (configuration) => new RTCPeerConnection(configuration),
    },
  ) {}

  start(sessionId: string, iceServers: readonly IceServer[]): void {
    this.close();
    this.closed = false;
    this.sessionId = sessionId;
    const peer = this.factory.create(toIceConfiguration(iceServers));
    this.peer = peer;
    peer.onicecandidate = (event) => {
      if (!this.isCurrent(peer)) return;
      try {
        this.transport.sendCandidate(
          sessionId,
          event.candidate?.toJSON() ?? null,
        );
      } catch {
        this.callbacks.onProtocolError();
      }
    };
    peer.ontrack = (event) => {
      if (!this.isCurrent(peer) || event.track.kind !== "video") return;
      const stream = event.streams[0];
      if (stream) this.callbacks.onVideoStream(stream);
    };
    peer.onconnectionstatechange = () => {
      if (this.isCurrent(peer))
        this.callbacks.onConnectionState(peer.connectionState);
    };
    peer.ondatachannel = (event) => {
      if (!this.isCurrent(peer) || event.channel.label !== "fly-eye-control-v1")
        return;
      this.channel?.close();
      this.channel = event.channel as unknown as PeerDataChannel;
      this.channel.onmessage = (message) => {
        if (!this.isCurrent(peer) || typeof message.data !== "string") return;
        try {
          this.callbacks.onCameraControl(
            parseCameraControlMessage(JSON.parse(message.data) as unknown),
          );
        } catch {
          this.callbacks.onProtocolError();
        }
      };
    };
  }

  async acceptOffer(description: RTCSessionDescriptionInit): Promise<void> {
    const peer = this.requirePeer();
    if (description.type !== "offer" || typeof description.sdp !== "string") {
      throw new Error("Fly Eye received an invalid camera offer.");
    }
    await peer.setRemoteDescription(description);
    for (const candidate of this.pendingCandidates)
      await peer.addIceCandidate(candidate);
    this.pendingCandidates = [];
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);
    if (!this.sessionId || !this.isCurrent(peer)) return;
    this.transport.sendAnswer(this.sessionId, answer);
  }

  async addCandidate(candidate: SignalingCandidate | null): Promise<void> {
    const peer = this.requirePeer();
    const normalized = toCandidate(candidate);
    if (!peer.remoteDescription) {
      this.pendingCandidates.push(normalized);
      return;
    }
    await peer.addIceCandidate(normalized);
  }

  async diagnostics(): Promise<CameraDiagnostics> {
    const peer = this.requirePeer();
    const stats = await peer.getStats();
    let width: number | null = null;
    let height: number | null = null;
    let framesPerSecond: number | null = null;
    let packetsLost: number | null = null;
    let candidateType: CameraDiagnostics["candidateType"] = null;
    stats.forEach((report) => {
      if (report.type === "inbound-rtp" && report.kind === "video") {
        width =
          typeof report.frameWidth === "number" ? report.frameWidth : null;
        height =
          typeof report.frameHeight === "number" ? report.frameHeight : null;
        framesPerSecond =
          typeof report.framesPerSecond === "number"
            ? report.framesPerSecond
            : null;
        packetsLost =
          typeof report.packetsLost === "number" ? report.packetsLost : null;
      }
      if (report.type === "candidate-pair" && report.selected === true) {
        candidateType =
          report.localCandidateType === "relay" ? "relay" : "direct";
      }
    });
    return { width, height, framesPerSecond, packetsLost, candidateType };
  }

  close(): void {
    this.closed = true;
    this.pendingCandidates = [];
    this.channel?.close();
    this.channel = null;
    this.peer?.close();
    this.peer = null;
    this.sessionId = null;
  }

  private requirePeer(): PeerConnectionLike {
    if (!this.peer || this.closed)
      throw new Error("Camera peer connection is not active.");
    return this.peer;
  }

  private isCurrent(peer: PeerConnectionLike): boolean {
    return !this.closed && this.peer === peer;
  }
}
