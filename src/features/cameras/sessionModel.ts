import type { CameraRole } from "../../services";
import type { PairingSession, SignalingErrorCode } from "./protocol";

export type CameraConnectionState =
  | "disconnected"
  | "creating"
  | "awaiting-scan"
  | "negotiating"
  | "connected"
  | "reconnecting"
  | "error";

export interface CameraSessionSnapshot {
  readonly role: CameraRole;
  readonly state: CameraConnectionState;
  readonly sessionId: string | null;
  readonly cameraId: string | null;
  readonly expiresAt: string | null;
  readonly error: CameraSessionError | null;
}

export interface CameraSessionError {
  readonly code:
    | SignalingErrorCode
    | "PAIRING_EXPIRED"
    | "PAIRING_CANCELLED"
    | "CONNECTION_FAILED";
  readonly message: string;
  readonly retryable: boolean;
}

export type CameraSessionEvent =
  | { readonly type: "create" }
  | { readonly type: "created"; readonly pairing: PairingSession }
  | { readonly type: "camera-joined"; readonly sessionId: string }
  | { readonly type: "connected"; readonly sessionId: string }
  | { readonly type: "connection-lost"; readonly sessionId: string }
  | {
      readonly type: "failed";
      readonly sessionId: string;
      readonly error: CameraSessionError;
    }
  | { readonly type: "expired"; readonly sessionId: string }
  | { readonly type: "cancel"; readonly sessionId?: string }
  | { readonly type: "disconnect"; readonly sessionId?: string };

export function initialCameraSession(role: CameraRole): CameraSessionSnapshot {
  return {
    role,
    state: "disconnected",
    sessionId: null,
    cameraId: null,
    expiresAt: null,
    error: null,
  };
}

function disconnected(role: CameraRole): CameraSessionSnapshot {
  return initialCameraSession(role);
}

function isCurrent(
  snapshot: CameraSessionSnapshot,
  sessionId: string | undefined,
): boolean {
  return sessionId !== undefined && snapshot.sessionId === sessionId;
}

function pairingError(
  code: CameraSessionError["code"],
  message: string,
  retryable: boolean,
): CameraSessionError {
  return { code, message, retryable };
}

/**
 * Reduces only current-session events. The caller can safely ignore an
 * unchanged reference when an old peer, QR, or socket reports late.
 */
export function reduceCameraSession(
  snapshot: CameraSessionSnapshot,
  event: CameraSessionEvent,
): CameraSessionSnapshot {
  switch (event.type) {
    case "create":
      if (
        snapshot.state !== "disconnected" &&
        snapshot.state !== "error" &&
        snapshot.state !== "awaiting-scan"
      ) {
        return snapshot;
      }
      return { ...disconnected(snapshot.role), state: "creating" };
    case "created":
      if (
        snapshot.state !== "creating" ||
        event.pairing.cameraRole !== snapshot.role
      ) {
        return snapshot;
      }
      return {
        role: snapshot.role,
        state: "awaiting-scan",
        sessionId: event.pairing.sessionId,
        cameraId: event.pairing.cameraId,
        expiresAt: event.pairing.expiresAt,
        error: null,
      };
    case "camera-joined":
      if (
        !isCurrent(snapshot, event.sessionId) ||
        snapshot.state !== "awaiting-scan"
      ) {
        return snapshot;
      }
      return { ...snapshot, state: "negotiating" };
    case "connected":
      if (
        !isCurrent(snapshot, event.sessionId) ||
        (snapshot.state !== "negotiating" && snapshot.state !== "reconnecting")
      ) {
        return snapshot;
      }
      return { ...snapshot, state: "connected", error: null };
    case "connection-lost":
      if (
        !isCurrent(snapshot, event.sessionId) ||
        snapshot.state !== "connected"
      ) {
        return snapshot;
      }
      return { ...snapshot, state: "reconnecting" };
    case "failed":
      if (!isCurrent(snapshot, event.sessionId)) return snapshot;
      return { ...snapshot, state: "error", error: event.error };
    case "expired":
      if (!isCurrent(snapshot, event.sessionId)) return snapshot;
      return {
        ...snapshot,
        state: "error",
        error: pairingError(
          "PAIRING_EXPIRED",
          "The camera pairing code expired. Generate a new code to continue.",
          true,
        ),
      };
    case "cancel":
      if (event.sessionId && !isCurrent(snapshot, event.sessionId))
        return snapshot;
      if (snapshot.state !== "creating" && snapshot.state !== "awaiting-scan") {
        return snapshot;
      }
      return disconnected(snapshot.role);
    case "disconnect":
      if (event.sessionId && !isCurrent(snapshot, event.sessionId))
        return snapshot;
      return disconnected(snapshot.role);
  }
}

export function publicSignalingError(
  code: SignalingErrorCode,
  retryable: boolean,
): CameraSessionError {
  const messageByCode: Record<SignalingErrorCode, string> = {
    AUTHENTICATION_REQUIRED:
      "Pairing authorization is no longer valid. Generate a new code.",
    SESSION_NOT_FOUND:
      "The camera pairing session is unavailable. Generate a new code.",
    SESSION_EXPIRED:
      "The camera pairing code expired. Generate a new code to continue.",
    SESSION_OCCUPIED:
      "This camera is already paired in another active session.",
    CAMERA_MISMATCH: "This phone does not match the selected camera.",
    TOKEN_INVALID: "The camera pairing code is invalid. Generate a new code.",
    TOKEN_CONSUMED:
      "The camera pairing code has already been used. Generate a new code.",
    VIEWER_NOT_CONNECTED: "Keep Fly Eye open while the phone scans the code.",
    SIGNALING_UNAVAILABLE:
      "Camera signaling is temporarily unavailable. Try again.",
    MESSAGE_INVALID:
      "Fly Eye could not accept a camera message. Generate a new code.",
    RATE_LIMITED:
      "Too many pairing attempts were made. Wait before trying again.",
  };
  return { code, message: messageByCode[code], retryable };
}
