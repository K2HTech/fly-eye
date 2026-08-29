import type { BackendHttpClient, CryptoLike } from "../httpClient";
import type {
  CameraRecord,
  CameraRegistry,
  CameraRole,
  PreparedCameraPair,
} from "../../../services";

export type {
  CameraRecord,
  CameraRegistry,
  CameraRole,
  PreparedCameraPair,
} from "../../../services";

export type CameraRegistryErrorCode =
  | "INVALID_CAMERA_RESPONSE"
  | "UNSUPPORTED_CAMERA_SET"
  | "INCOMPATIBLE_CAMERA"
  | "SECURE_RANDOMNESS_UNAVAILABLE";

export class CameraRegistryError extends Error {
  readonly code: CameraRegistryErrorCode;

  constructor(code: CameraRegistryErrorCode, message: string) {
    super(message);
    this.name = "CameraRegistryError";
    this.code = code;
  }
}

interface BackendCameraDto {
  readonly id: string;
  readonly matchId: string;
  readonly name: string;
  readonly role: CameraRole | "BASELINE_NEAR" | "BASELINE_FAR";
  readonly sourceType: "device" | "rtsp" | "mjpeg";
  readonly sourceRef: string;
  readonly resolution: { readonly w: number; readonly h: number };
  readonly targetFps: number;
  readonly isActive: boolean;
  readonly calibration: Record<string, unknown> | null;
  readonly createdAt: string;
}

const cameraRoles = new Set([
  "SIDELINE_LEFT",
  "SIDELINE_RIGHT",
  "BASELINE_NEAR",
  "BASELINE_FAR",
]);
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const approvedRoles: readonly CameraRole[] = [
  "SIDELINE_LEFT",
  "SIDELINE_RIGHT",
];
const cameraNames: Record<CameraRole, string> = {
  SIDELINE_LEFT: "Left sideline",
  SIDELINE_RIGHT: "Right sideline",
};

function object(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw invalidResponse();
  }
  return value as Record<string, unknown>;
}

function nonEmptyString(body: Record<string, unknown>, key: string): string {
  const value = body[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw invalidResponse();
  }
  return value;
}

function uuid(body: Record<string, unknown>, key: string): string {
  const value = nonEmptyString(body, key);
  if (!uuidPattern.test(value)) throw invalidResponse();
  return value;
}

function positiveInteger(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw invalidResponse();
  }
  return value;
}

function positiveNumber(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw invalidResponse();
  }
  return value;
}

function invalidResponse(): CameraRegistryError {
  return new CameraRegistryError(
    "INVALID_CAMERA_RESPONSE",
    "The Fly Eye service returned an invalid camera response.",
  );
}

function parseCamera(
  value: unknown,
  expectedMatchId: string,
): BackendCameraDto {
  const body = object(value);
  const id = uuid(body, "id");
  const matchId = uuid(body, "matchId");
  if (matchId !== expectedMatchId) throw invalidResponse();

  const name = nonEmptyString(body, "name");
  const role = nonEmptyString(body, "role");
  if (!cameraRoles.has(role)) throw invalidResponse();
  const sourceType = nonEmptyString(body, "sourceType");
  if (
    sourceType !== "device" &&
    sourceType !== "rtsp" &&
    sourceType !== "mjpeg"
  )
    throw invalidResponse();
  const sourceRef = nonEmptyString(body, "sourceRef");
  const resolutionBody = object(body.resolution);
  const resolution = {
    w: positiveInteger(resolutionBody.w),
    h: positiveInteger(resolutionBody.h),
  };
  const targetFps = positiveNumber(body.targetFps);
  if (typeof body.isActive !== "boolean") throw invalidResponse();
  const calibrationValue = body.calibration;
  if (
    calibrationValue !== null &&
    (typeof calibrationValue !== "object" || Array.isArray(calibrationValue))
  )
    throw invalidResponse();
  const createdAt = nonEmptyString(body, "createdAt");
  if (!Number.isFinite(Date.parse(createdAt))) throw invalidResponse();

  return {
    id,
    matchId,
    name,
    role: role as BackendCameraDto["role"],
    sourceType: sourceType as BackendCameraDto["sourceType"],
    sourceRef,
    resolution,
    targetFps,
    isActive: body.isActive,
    calibration: calibrationValue as Record<string, unknown> | null,
    createdAt,
  };
}

function toCameraRecord(camera: BackendCameraDto): CameraRecord {
  if (camera.role !== "SIDELINE_LEFT" && camera.role !== "SIDELINE_RIGHT") {
    throw new CameraRegistryError(
      "UNSUPPORTED_CAMERA_SET",
      "The match contains an unsupported camera role; remove it before continuing.",
    );
  }
  if (camera.sourceType !== "device") {
    throw new CameraRegistryError(
      "INCOMPATIBLE_CAMERA",
      `The ${camera.role === "SIDELINE_LEFT" ? "left" : "right"} camera is not a device camera.`,
    );
  }
  return {
    id: camera.id,
    matchId: camera.matchId,
    name: camera.name,
    role: camera.role,
    sourceType: camera.sourceType,
    sourceRef: camera.sourceRef,
    resolution: {
      width: camera.resolution.w,
      height: camera.resolution.h,
    },
    targetFps: camera.targetFps,
    isActive: camera.isActive,
    calibration: camera.calibration,
    createdAt: camera.createdAt,
  };
}

function assertCompatible(camera: CameraRecord): void {
  if (
    !camera.isActive ||
    camera.sourceType !== "device" ||
    camera.resolution.width !== 1280 ||
    camera.resolution.height !== 720 ||
    camera.targetFps !== 30
  ) {
    const direction = camera.role === "SIDELINE_LEFT" ? "left" : "right";
    throw new CameraRegistryError(
      "INCOMPATIBLE_CAMERA",
      `The existing ${direction} camera is inactive or incompatible with the Fly Eye preview target.`,
    );
  }
}

function createUuid(crypto: CryptoLike | undefined): string {
  const source = crypto ?? globalThis.crypto;
  if (typeof source?.randomUUID === "function") return source.randomUUID();
  if (typeof source?.getRandomValues === "function") {
    const bytes = source.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0"));
    return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex
      .slice(6, 8)
      .join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
  }
  throw new CameraRegistryError(
    "SECURE_RANDOMNESS_UNAVAILABLE",
    "Secure camera identifiers are unavailable in this browser.",
  );
}

function assertMatchId(matchId: string): void {
  if (typeof matchId !== "string" || matchId.trim().length === 0) {
    throw new CameraRegistryError(
      "UNSUPPORTED_CAMERA_SET",
      "A match is required to prepare cameras.",
    );
  }
}

export interface BackendCameraRegistryOptions {
  readonly client: BackendHttpClient;
  readonly crypto?: CryptoLike;
}

export class BackendCameraRegistry implements CameraRegistry {
  private readonly client: BackendHttpClient;
  private readonly crypto: CryptoLike | undefined;
  private readonly requestIds = new Map<string, Map<CameraRole, string>>();
  private readonly sourceRefs = new Map<string, Map<CameraRole, string>>();

  constructor(options: BackendCameraRegistryOptions) {
    this.client = options.client;
    this.crypto = options.crypto;
  }

  async list(matchId: string): Promise<CameraRecord[]> {
    return (await this.fetchCameras(matchId)).map(toCameraRecord);
  }

  async prepare(matchId: string): Promise<PreparedCameraPair> {
    const rawCameras = await this.fetchCameras(matchId);
    if (rawCameras.length > 2) {
      throw new CameraRegistryError(
        "UNSUPPORTED_CAMERA_SET",
        "This match has more than the two supported cameras.",
      );
    }
    const cameras = rawCameras.map(toCameraRecord);

    const byRole = new Map<CameraRole, CameraRecord>();
    for (const camera of cameras) {
      if (byRole.has(camera.role)) {
        throw new CameraRegistryError(
          "UNSUPPORTED_CAMERA_SET",
          "This match contains duplicate camera roles; panel identity is ambiguous.",
        );
      }
      assertCompatible(camera);
      byRole.set(camera.role, camera);
    }

    for (const role of approvedRoles) {
      if (!byRole.has(role)) {
        const created = await this.createCamera(matchId, role);
        assertCompatible(created);
        byRole.set(role, created);
      }
    }

    const left = byRole.get("SIDELINE_LEFT");
    const right = byRole.get("SIDELINE_RIGHT");
    if (!left || !right) {
      throw new CameraRegistryError(
        "UNSUPPORTED_CAMERA_SET",
        "The match does not have both supported camera roles.",
      );
    }
    return { left, right };
  }

  private async fetchCameras(matchId: string): Promise<BackendCameraDto[]> {
    assertMatchId(matchId);
    const raw = await this.client.request<unknown>(
      `matches/${encodeURIComponent(matchId)}/cameras`,
    );
    if (!Array.isArray(raw)) throw invalidResponse();
    return raw.map((value) => parseCamera(value, matchId));
  }

  private stableValue(
    values: Map<string, Map<CameraRole, string>>,
    matchId: string,
    role: CameraRole,
  ): string {
    let matchValues = values.get(matchId);
    if (!matchValues) {
      matchValues = new Map();
      values.set(matchId, matchValues);
    }
    const existing = matchValues.get(role);
    if (existing) return existing;
    const value = createUuid(this.crypto);
    matchValues.set(role, value);
    return value;
  }

  private async createCamera(
    matchId: string,
    role: CameraRole,
  ): Promise<CameraRecord> {
    const clientRequestId = this.stableValue(this.requestIds, matchId, role);
    const sourceRef = this.stableValue(this.sourceRefs, matchId, role);
    const raw = await this.client.request<unknown>(
      `matches/${encodeURIComponent(matchId)}/cameras`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: cameraNames[role],
          role,
          sourceType: "device",
          sourceRef: `fly-eye-device-${sourceRef}`,
          resolution: { w: 1280, h: 720 },
          targetFps: 30,
          clientRequestId,
        }),
      },
    );
    const camera = toCameraRecord(parseCamera(raw, matchId));
    if (camera.role !== role) {
      throw new CameraRegistryError(
        "UNSUPPORTED_CAMERA_SET",
        "The Fly Eye service returned a camera for the wrong role.",
      );
    }
    return camera;
  }
}

export function createBackendCameraRegistry(
  options: BackendCameraRegistryOptions,
): BackendCameraRegistry {
  return new BackendCameraRegistry(options);
}
