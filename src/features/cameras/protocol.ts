import type { CameraRole } from "../../services";

export const CAMERA_PAIRING_PROTOCOL = "fly-eye-camera-pairing" as const;
export const CAMERA_PAIRING_VERSION = 1 as const;

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const sessionIdPattern = /^[A-Za-z0-9_-]{16,128}$/;
const tokenPattern = /^.{32,256}$/;
const signalingCodes = new Set([
  "AUTHENTICATION_REQUIRED",
  "SESSION_NOT_FOUND",
  "SESSION_EXPIRED",
  "SESSION_OCCUPIED",
  "CAMERA_MISMATCH",
  "TOKEN_INVALID",
  "TOKEN_CONSUMED",
  "VIEWER_NOT_CONNECTED",
  "SIGNALING_UNAVAILABLE",
  "MESSAGE_INVALID",
  "RATE_LIMITED",
]);

export type SignalingErrorCode =
  | "AUTHENTICATION_REQUIRED"
  | "SESSION_NOT_FOUND"
  | "SESSION_EXPIRED"
  | "SESSION_OCCUPIED"
  | "CAMERA_MISMATCH"
  | "TOKEN_INVALID"
  | "TOKEN_CONSUMED"
  | "VIEWER_NOT_CONNECTED"
  | "SIGNALING_UNAVAILABLE"
  | "MESSAGE_INVALID"
  | "RATE_LIMITED";

export type PairingProtocolErrorCode =
  | "INVALID_PAIRING_RESPONSE"
  | "INVALID_QR_PAYLOAD"
  | "INVALID_SIGNALING_MESSAGE"
  | "INVALID_CAMERA_MESSAGE"
  | "SESSION_MISMATCH"
  | "UNSUPPORTED_PROTOCOL";

export class PairingProtocolError extends Error {
  readonly code: PairingProtocolErrorCode;

  constructor(code: PairingProtocolErrorCode, message: string) {
    super(message);
    this.name = "PairingProtocolError";
    this.code = code;
  }
}

export interface PairingQrPayload {
  readonly protocol: typeof CAMERA_PAIRING_PROTOCOL;
  readonly version: typeof CAMERA_PAIRING_VERSION;
  readonly sessionId: string;
  readonly cameraId: string;
  readonly cameraRole: CameraRole;
  readonly signalingUrl: string;
  readonly pairingToken: string;
  readonly expiresAt: string;
}

/** Ephemeral credentials. Do not put this object in route state or storage. */
export interface PairingSession {
  readonly protocol: typeof CAMERA_PAIRING_PROTOCOL;
  readonly version: typeof CAMERA_PAIRING_VERSION;
  readonly sessionId: string;
  readonly matchId: string;
  readonly cameraId: string;
  readonly cameraRole: CameraRole;
  readonly expiresAt: string;
  readonly signalingUrl: string;
  readonly mobileToken: string;
  readonly viewerToken: string;
}

export interface IceServer {
  readonly urls: readonly string[];
  readonly username?: string;
  readonly credential?: string;
}

export interface SignalingDescription {
  readonly type: "offer" | "answer";
  readonly sdp: string;
}

export interface SignalingCandidate {
  readonly candidate: string;
  readonly sdpMid: string | null;
  readonly sdpMLineIndex: number | null;
  readonly usernameFragment: string | null;
}

export type ViewerSignalingMessage =
  | {
      readonly type: "authenticated";
      readonly sessionId: string;
      readonly cameraId: string;
      readonly cameraRole: CameraRole;
      readonly expiresAt: string;
      readonly iceServers: readonly IceServer[];
    }
  | { readonly type: "camera-joined"; readonly sessionId: string }
  | {
      readonly type: "offer";
      readonly sessionId: string;
      readonly description: SignalingDescription;
    }
  | {
      readonly type: "ice-candidate";
      readonly sessionId: string;
      readonly candidate: SignalingCandidate | null;
    }
  | {
      readonly type: "camera-left";
      readonly sessionId: string;
      readonly retryable: boolean;
    }
  | {
      readonly type: "error";
      readonly sessionId: string;
      readonly code: SignalingErrorCode;
      readonly retryable: boolean;
    }
  | { readonly type: "pong"; readonly sessionId: string };

export type CameraControlMessage =
  | {
      readonly type: "camera.capabilities";
      readonly timestamp: string;
      readonly requestId?: string;
      readonly payload: Record<string, unknown>;
    }
  | {
      readonly type: "camera.status";
      readonly timestamp: string;
      readonly requestId?: string;
      readonly payload: Record<string, unknown>;
    }
  | {
      readonly type: "camera.error";
      readonly timestamp: string;
      readonly requestId?: string;
      readonly code: string;
    }
  | {
      readonly type: "camera.heartbeat";
      readonly timestamp: string;
      readonly requestId?: string;
    }
  | {
      readonly type: "command.succeeded" | "command.failed";
      readonly timestamp: string;
      readonly requestId: string;
    };

function protocolError(
  code: PairingProtocolErrorCode,
  message: string,
): PairingProtocolError {
  return new PairingProtocolError(code, message);
}

function object(value: unknown, code: PairingProtocolErrorCode) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw protocolError(code, "Fly Eye received an invalid camera message.");
  }
  return value as Record<string, unknown>;
}

function exactKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
  code: PairingProtocolErrorCode,
): void {
  if (
    Object.keys(value).length !== keys.length ||
    !Object.keys(value).every((key) => keys.includes(key))
  ) {
    throw protocolError(code, "Fly Eye received an invalid camera message.");
  }
}

function string(
  value: unknown,
  code: PairingProtocolErrorCode,
  maxLength = 1024,
): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > maxLength
  ) {
    throw protocolError(code, "Fly Eye received an invalid camera message.");
  }
  return value;
}

function uuid(value: unknown, code: PairingProtocolErrorCode): string {
  const parsed = string(value, code, 36);
  if (!uuidPattern.test(parsed)) {
    throw protocolError(code, "Fly Eye received an invalid camera message.");
  }
  return parsed;
}

function sessionId(value: unknown, code: PairingProtocolErrorCode): string {
  const parsed = string(value, code, 128);
  if (!sessionIdPattern.test(parsed)) {
    throw protocolError(code, "Fly Eye received an invalid camera message.");
  }
  return parsed;
}

function token(value: unknown, code: PairingProtocolErrorCode): string {
  const parsed = string(value, code, 256);
  if (!tokenPattern.test(parsed)) {
    throw protocolError(code, "Fly Eye received an invalid camera message.");
  }
  return parsed;
}

function date(value: unknown, code: PairingProtocolErrorCode): string {
  const parsed = string(value, code, 64);
  if (!Number.isFinite(Date.parse(parsed))) {
    throw protocolError(code, "Fly Eye received an invalid camera message.");
  }
  return parsed;
}

function role(value: unknown, code: PairingProtocolErrorCode): CameraRole {
  if (value === "SIDELINE_LEFT" || value === "SIDELINE_RIGHT") return value;
  throw protocolError(code, "Fly Eye received an invalid camera message.");
}

function signalingUrl(value: unknown, code: PairingProtocolErrorCode): string {
  const parsed = string(value, code, 2048);
  let url: URL;
  try {
    url = new URL(parsed);
  } catch {
    throw protocolError(code, "Fly Eye received an invalid camera message.");
  }
  if (url.protocol !== "wss:" && url.protocol !== "ws:") {
    throw protocolError(code, "Fly Eye received an invalid camera message.");
  }
  return parsed;
}

export function parsePairingSession(value: unknown): PairingSession {
  const code = "INVALID_PAIRING_RESPONSE" as const;
  const body = object(value, code);
  exactKeys(
    body,
    [
      "protocol",
      "version",
      "sessionId",
      "matchId",
      "cameraId",
      "cameraRole",
      "expiresAt",
      "signalingUrl",
      "mobileToken",
      "viewerToken",
    ],
    code,
  );
  if (
    body.protocol !== CAMERA_PAIRING_PROTOCOL ||
    body.version !== CAMERA_PAIRING_VERSION
  ) {
    throw protocolError(
      "UNSUPPORTED_PROTOCOL",
      "This camera pairing version is unsupported.",
    );
  }
  return {
    protocol: CAMERA_PAIRING_PROTOCOL,
    version: CAMERA_PAIRING_VERSION,
    sessionId: sessionId(body.sessionId, code),
    matchId: uuid(body.matchId, code),
    cameraId: uuid(body.cameraId, code),
    cameraRole: role(body.cameraRole, code),
    expiresAt: date(body.expiresAt, code),
    signalingUrl: signalingUrl(body.signalingUrl, code),
    mobileToken: token(body.mobileToken, code),
    viewerToken: token(body.viewerToken, code),
  };
}

export function toPairingQrPayload(session: PairingSession): PairingQrPayload {
  return {
    protocol: session.protocol,
    version: session.version,
    sessionId: session.sessionId,
    cameraId: session.cameraId,
    cameraRole: session.cameraRole,
    signalingUrl: session.signalingUrl,
    pairingToken: session.mobileToken,
    expiresAt: session.expiresAt,
  };
}

export function serializePairingQrPayload(session: PairingSession): string {
  return JSON.stringify(toPairingQrPayload(session));
}

export function parsePairingQrPayload(value: unknown): PairingQrPayload {
  const code = "INVALID_QR_PAYLOAD" as const;
  const body = object(value, code);
  exactKeys(
    body,
    [
      "protocol",
      "version",
      "sessionId",
      "cameraId",
      "cameraRole",
      "signalingUrl",
      "pairingToken",
      "expiresAt",
    ],
    code,
  );
  if (
    body.protocol !== CAMERA_PAIRING_PROTOCOL ||
    body.version !== CAMERA_PAIRING_VERSION
  ) {
    throw protocolError(
      "UNSUPPORTED_PROTOCOL",
      "This camera pairing version is unsupported.",
    );
  }
  return {
    protocol: CAMERA_PAIRING_PROTOCOL,
    version: CAMERA_PAIRING_VERSION,
    sessionId: sessionId(body.sessionId, code),
    cameraId: uuid(body.cameraId, code),
    cameraRole: role(body.cameraRole, code),
    signalingUrl: signalingUrl(body.signalingUrl, code),
    pairingToken: token(body.pairingToken, code),
    expiresAt: date(body.expiresAt, code),
  };
}

function parseIceServers(value: unknown): readonly IceServer[] {
  if (!Array.isArray(value))
    throw protocolError(
      "INVALID_SIGNALING_MESSAGE",
      "Fly Eye received an invalid camera message.",
    );
  return value.map((candidate) => {
    const body = object(candidate, "INVALID_SIGNALING_MESSAGE");
    if (
      !Object.keys(body).every((key) =>
        ["urls", "username", "credential"].includes(key),
      )
    ) {
      throw protocolError(
        "INVALID_SIGNALING_MESSAGE",
        "Fly Eye received an invalid camera message.",
      );
    }
    if (!Array.isArray(body.urls) || body.urls.length === 0) {
      throw protocolError(
        "INVALID_SIGNALING_MESSAGE",
        "Fly Eye received an invalid camera message.",
      );
    }
    const urls = body.urls.map((url) =>
      string(url, "INVALID_SIGNALING_MESSAGE", 2048),
    );
    const username =
      body.username === undefined
        ? undefined
        : string(body.username, "INVALID_SIGNALING_MESSAGE", 512);
    const credential =
      body.credential === undefined
        ? undefined
        : string(body.credential, "INVALID_SIGNALING_MESSAGE", 512);
    return {
      urls,
      ...(username ? { username } : {}),
      ...(credential ? { credential } : {}),
    };
  });
}

function parseCandidate(value: unknown): SignalingCandidate | null {
  if (value === null) return null;
  const body = object(value, "INVALID_SIGNALING_MESSAGE");
  exactKeys(
    body,
    ["candidate", "sdpMid", "sdpMLineIndex", "usernameFragment"],
    "INVALID_SIGNALING_MESSAGE",
  );
  const nullableString = (candidate: unknown, maxLength: number) =>
    candidate === null
      ? null
      : string(candidate, "INVALID_SIGNALING_MESSAGE", maxLength);
  if (
    body.sdpMLineIndex !== null &&
    (!Number.isInteger(body.sdpMLineIndex) ||
      (body.sdpMLineIndex as number) < 0)
  ) {
    throw protocolError(
      "INVALID_SIGNALING_MESSAGE",
      "Fly Eye received an invalid camera message.",
    );
  }
  return {
    candidate: string(body.candidate, "INVALID_SIGNALING_MESSAGE", 16384),
    sdpMid: nullableString(body.sdpMid, 256),
    sdpMLineIndex: body.sdpMLineIndex as number | null,
    usernameFragment: nullableString(body.usernameFragment, 256),
  };
}

export function parseViewerSignalingMessage(
  value: unknown,
  expectedSessionId: string,
): ViewerSignalingMessage {
  const code = "INVALID_SIGNALING_MESSAGE" as const;
  const body = object(value, code);
  exactKeys(body, ["version", "type", "sessionId", "payload"], code);
  if (body.version !== CAMERA_PAIRING_VERSION) {
    throw protocolError(
      "UNSUPPORTED_PROTOCOL",
      "This camera signaling version is unsupported.",
    );
  }
  const receivedSessionId = sessionId(body.sessionId, code);
  if (receivedSessionId !== expectedSessionId) {
    throw protocolError(
      "SESSION_MISMATCH",
      "The camera message belongs to a different pairing session.",
    );
  }
  const payload = object(body.payload, code);
  switch (body.type) {
    case "authenticated":
      exactKeys(
        payload,
        ["role", "cameraId", "cameraRole", "expiresAt", "iceServers"],
        code,
      );
      if (payload.role !== "viewer")
        throw protocolError(
          code,
          "Fly Eye received an invalid camera message.",
        );
      return {
        type: "authenticated",
        sessionId: receivedSessionId,
        cameraId: uuid(payload.cameraId, code),
        cameraRole: role(payload.cameraRole, code),
        expiresAt: date(payload.expiresAt, code),
        iceServers: parseIceServers(payload.iceServers),
      };
    case "camera-joined":
      exactKeys(payload, [], code);
      return { type: "camera-joined", sessionId: receivedSessionId };
    case "offer": {
      exactKeys(payload, ["description"], code);
      const description = object(payload.description, code);
      exactKeys(description, ["type", "sdp"], code);
      if (description.type !== "offer")
        throw protocolError(
          code,
          "Fly Eye received an invalid camera message.",
        );
      return {
        type: "offer",
        sessionId: receivedSessionId,
        description: {
          type: "offer",
          sdp: string(description.sdp, code, 62000),
        },
      };
    }
    case "ice-candidate":
      exactKeys(payload, ["candidate"], code);
      return {
        type: "ice-candidate",
        sessionId: receivedSessionId,
        candidate: parseCandidate(payload.candidate),
      };
    case "camera-left":
      exactKeys(payload, ["retryable"], code);
      if (typeof payload.retryable !== "boolean")
        throw protocolError(
          code,
          "Fly Eye received an invalid camera message.",
        );
      return {
        type: "camera-left",
        sessionId: receivedSessionId,
        retryable: payload.retryable,
      };
    case "error": {
      exactKeys(payload, ["code", "message", "retryable", "requestId"], code);
      const errorCode = string(payload.code, code, 64);
      if (
        !signalingCodes.has(errorCode) ||
        typeof payload.retryable !== "boolean"
      )
        throw protocolError(
          code,
          "Fly Eye received an invalid camera message.",
        );
      if (payload.requestId !== null && typeof payload.requestId !== "string")
        throw protocolError(
          code,
          "Fly Eye received an invalid camera message.",
        );
      string(payload.message, code, 1024);
      return {
        type: "error",
        sessionId: receivedSessionId,
        code: errorCode as SignalingErrorCode,
        retryable: payload.retryable,
      };
    }
    case "pong":
      exactKeys(payload, [], code);
      return { type: "pong", sessionId: receivedSessionId };
    default:
      throw protocolError(
        code,
        "Fly Eye received an unsupported camera message.",
      );
  }
}

export function parseCameraControlMessage(
  value: unknown,
): CameraControlMessage {
  const code = "INVALID_CAMERA_MESSAGE" as const;
  const body = object(value, code);
  if (body.version !== CAMERA_PAIRING_VERSION) {
    throw protocolError(
      "UNSUPPORTED_PROTOCOL",
      "This camera control version is unsupported.",
    );
  }
  const type = string(body.type, code, 64);
  const timestamp = date(body.timestamp, code);
  const requestId =
    body.requestId === undefined
      ? undefined
      : string(body.requestId, code, 128);
  const payload =
    body.payload === undefined ? undefined : object(body.payload, code);
  switch (type) {
    case "camera.capabilities":
    case "camera.status":
      if (!payload)
        throw protocolError(
          code,
          "Fly Eye received an invalid camera message.",
        );
      return { type, timestamp, ...(requestId ? { requestId } : {}), payload };
    case "camera.error": {
      if (!payload || typeof payload.code !== "string")
        throw protocolError(
          code,
          "Fly Eye received an invalid camera message.",
        );
      return {
        type,
        timestamp,
        ...(requestId ? { requestId } : {}),
        code: payload.code,
      };
    }
    case "camera.heartbeat":
      if (payload && Object.keys(payload).length !== 0)
        throw protocolError(
          code,
          "Fly Eye received an invalid camera message.",
        );
      return { type, timestamp, ...(requestId ? { requestId } : {}) };
    case "command.succeeded":
    case "command.failed":
      if (!requestId)
        throw protocolError(
          code,
          "Fly Eye received an invalid camera message.",
        );
      return { type, timestamp, requestId };
    default:
      throw protocolError(
        code,
        "Fly Eye received an unsupported camera message.",
      );
  }
}
