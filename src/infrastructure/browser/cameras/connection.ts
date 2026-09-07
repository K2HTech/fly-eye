import type {
  CameraConnection,
  CameraConnectionCallbacks,
  CameraConnectionFactory,
  CameraRecord,
} from "../../../services";
import type {
  IceServer,
  PairingSession,
  SignalingCandidate,
  SignalingDescription,
  ViewerSignalingMessage,
} from "../../../features/cameras";
import { BrowserPeerConnection } from "./peerConnection";
import { BackendPairingClient } from "./pairingClient";
import {
  BrowserViewerSignalingTransport,
  type ViewerSignalingTransport,
} from "./signalingTransport";

interface PeerController {
  start(sessionId: string, iceServers: readonly IceServer[]): void;
  acceptOffer(description: SignalingDescription): Promise<void>;
  addCandidate(candidate: SignalingCandidate | null): Promise<void>;
  close(): void;
}

interface ConnectionDependencies {
  createTransport(): ViewerSignalingTransport;
  createPeer(
    transport: ViewerSignalingTransport,
    callbacks: ConstructorParameters<typeof BrowserPeerConnection>[1],
  ): PeerController;
  setTimeout(callback: () => void, delay: number): number;
  clearTimeout(timer: number): void;
}

const defaultDependencies: ConnectionDependencies = {
  createTransport: () =>
    new BrowserViewerSignalingTransport({
      create: (url) => new WebSocket(url),
    }),
  createPeer: (transport, callbacks) =>
    new BrowserPeerConnection(transport, callbacks),
  setTimeout: (callback, delay) => window.setTimeout(callback, delay),
  clearTimeout: (timer) => window.clearTimeout(timer),
};

export class BrowserCameraConnection implements CameraConnection {
  private pairing: PairingSession | null = null;
  private transport: ViewerSignalingTransport | null = null;
  private peer: PeerController | null = null;
  private iceServers: readonly IceServer[] = [];
  private recoveryTimer: number | null = null;
  private closed = false;

  constructor(
    private readonly pairingClient: BackendPairingClient,
    private readonly callbacks: CameraConnectionCallbacks,
    private readonly dependencies: ConnectionDependencies = defaultDependencies,
  ) {}

  async begin(matchId: string, camera: CameraRecord): Promise<PairingSession> {
    this.close();
    this.closed = false;
    const pairing = await this.pairingClient.create(matchId, camera.id);
    if (pairing.cameraRole !== camera.role)
      throw new Error("The pairing camera role is invalid.");
    this.pairing = pairing;
    const transport = this.dependencies.createTransport();
    this.transport = transport;
    try {
      await transport.connect(
        pairing,
        (message) => void this.handle(message),
        () => {
          if (!this.closed) this.callbacks.onState("error");
        },
      );
      if (this.closed || this.pairing?.sessionId !== pairing.sessionId)
        throw new Error("Camera pairing was cancelled.");
      this.callbacks.onPairing(pairing);
    } catch (error) {
      const wasClosed = this.closed;
      this.close();
      if (!wasClosed) this.callbacks.onError();
      throw error;
    }
    return pairing;
  }

  close(): void {
    this.closed = true;
    this.stopRecoveryTimer();
    const pairing = this.pairing;
    this.pairing = null;
    this.peer?.close();
    this.peer = null;
    this.transport?.close();
    this.transport = null;
    this.iceServers = [];
    if (pairing) void this.pairingClient.cancel(pairing.sessionId);
  }

  private async handle(message: ViewerSignalingMessage): Promise<void> {
    if (!this.pairing || message.sessionId !== this.pairing.sessionId) return;
    if (message.type === "authenticated") {
      if (
        message.cameraId !== this.pairing.cameraId ||
        message.cameraRole !== this.pairing.cameraRole
      ) {
        this.callbacks.onError();
        return;
      }
      this.iceServers = message.iceServers;
      this.ensurePeer(message.sessionId);
    } else if (message.type === "camera-joined") {
      if (
        message.cameraId !== this.pairing.cameraId ||
        message.cameraRole !== this.pairing.cameraRole
      ) {
        this.callbacks.onError();
        return;
      }
      this.stopRecoveryTimer();
      this.ensurePeer(message.sessionId);
      this.callbacks.onState("negotiating");
    } else if (message.type === "offer") {
      await this.peer?.acceptOffer(message.description);
    } else if (message.type === "ice-candidate") {
      await this.peer?.addCandidate(message.candidate);
    } else if (message.type === "camera-left") {
      if (message.retryable) this.beginRecovery();
      else this.callbacks.onState("error");
    } else if (message.type === "error") {
      if (message.retryable) this.beginRecovery();
      else this.callbacks.onState("error");
    }
  }

  private ensurePeer(sessionId: string): void {
    if (this.peer || !this.transport || this.closed) return;
    this.peer = this.dependencies.createPeer(this.transport, {
      onVideoStream: (stream) => this.callbacks.onStream(stream),
      onConnectionState: (state) => {
        if (state === "connected") {
          this.stopRecoveryTimer();
          this.callbacks.onState("connected");
        } else if (state === "disconnected" || state === "failed") {
          this.beginRecovery();
        }
      },
      onCameraControl: () => undefined,
      onProtocolError: () => this.callbacks.onError(),
    });
    this.peer.start(sessionId, this.iceServers);
  }

  private beginRecovery(): void {
    if (!this.pairing || this.closed) return;
    this.peer?.close();
    this.peer = null;
    this.callbacks.onState("reconnecting");
    if (this.recoveryTimer !== null) return;
    this.recoveryTimer = this.dependencies.setTimeout(() => {
      this.recoveryTimer = null;
      if (!this.closed) this.callbacks.onState("error");
    }, 60_000);
  }

  private stopRecoveryTimer(): void {
    if (this.recoveryTimer === null) return;
    this.dependencies.clearTimeout(this.recoveryTimer);
    this.recoveryTimer = null;
  }
}

export class BrowserCameraConnectionFactory implements CameraConnectionFactory {
  constructor(private readonly pairingClient: BackendPairingClient) {}

  create(callbacks: CameraConnectionCallbacks): CameraConnection {
    return new BrowserCameraConnection(this.pairingClient, callbacks);
  }
}
