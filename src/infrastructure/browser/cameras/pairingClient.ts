import {
  PairingProtocolError,
  parsePairingSession,
  type PairingSession,
} from "../../../features/cameras";
import type { BackendHttpClient } from "../../backend";
import { BackendRequestError } from "../../backend";

export class PairingClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PairingClientError";
  }
}

function normalizeUrl(value: string): string {
  return new URL(value).toString().replace(/\/$/, "");
}

export class BackendPairingClient {
  constructor(
    private readonly client: BackendHttpClient,
    private readonly expectedSignalingUrl: string,
  ) {}

  async create(matchId: string, cameraId: string): Promise<PairingSession> {
    try {
      const session = parsePairingSession(
        await this.client.request<unknown>("camera-pairings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ version: 1, matchId, cameraId }),
        }),
      );
      if (session.matchId !== matchId || session.cameraId !== cameraId) {
        throw new PairingClientError(
          "The Fly Eye service returned a pairing for the wrong camera.",
        );
      }
      if (
        normalizeUrl(session.signalingUrl) !==
        normalizeUrl(this.expectedSignalingUrl)
      ) {
        throw new PairingClientError(
          "The Fly Eye service returned an unexpected signaling endpoint.",
        );
      }
      return session;
    } catch (error) {
      if (error instanceof PairingProtocolError) {
        throw new PairingClientError(
          "The Fly Eye service returned an invalid pairing session.",
        );
      }
      throw error;
    }
  }

  async cancel(sessionId: string): Promise<void> {
    try {
      await this.client.request<void>(
        `camera-pairings/${encodeURIComponent(sessionId)}`,
        { method: "DELETE" },
      );
    } catch (error) {
      if (error instanceof BackendRequestError && error.status === 404) return;
      throw error;
    }
  }
}

export function createBackendPairingClient(
  client: BackendHttpClient,
  expectedSignalingUrl: string,
): BackendPairingClient {
  return new BackendPairingClient(client, expectedSignalingUrl);
}
