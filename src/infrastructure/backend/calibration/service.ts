import type {
  CalibrationFrame,
  CalibrationPoint,
  CalibrationQuality,
  CalibrationSeedPoint,
  CalibrationService,
  CameraCalibration,
  SubmitCalibrationInput,
} from "../../../services";
import type { BackendHttpClient } from "../httpClient";
import { BackendRequestError } from "../errors";

type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

type DigestCrypto = Pick<SubtleCrypto, "digest">;

interface UploadTarget {
  readonly assetId: string;
  readonly url: string;
  readonly method: "PUT";
  readonly headers: Readonly<Record<string, string>>;
  readonly expiresAt: string;
}

export type CalibrationServiceErrorCode =
  | "INVALID_INPUT"
  | "INVALID_RESPONSE"
  | "NETWORK"
  | "FRAME_INCOMPLETE"
  | "FRAME_INVALID"
  | "DEGENERATE"
  | "ENGINE"
  | "UPLOAD_FAILED"
  | "UPLOAD_EXPIRED";

export class CalibrationServiceError extends Error {
  readonly code: CalibrationServiceErrorCode;

  constructor(code: CalibrationServiceErrorCode, message: string) {
    super(message);
    this.name = "CalibrationServiceError";
    this.code = code;
  }
}

export interface BackendCalibrationServiceOptions {
  readonly client: BackendHttpClient;
  readonly fetchImpl?: FetchLike;
  readonly crypto?: DigestCrypto;
  readonly now?: () => number;
}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const supportedContentTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function invalidResponse(): CalibrationServiceError {
  return new CalibrationServiceError(
    "INVALID_RESPONSE",
    "The Fly Eye service returned an invalid calibration response.",
  );
}

function invalidInput(message: string): CalibrationServiceError {
  return new CalibrationServiceError("INVALID_INPUT", message);
}

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

function finiteNumber(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw invalidResponse();
  }
  return value;
}

function nonNegativeInteger(value: unknown): number {
  if (!Number.isInteger(value) || (value as number) < 0) {
    throw invalidResponse();
  }
  return value as number;
}

function date(value: unknown): string {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) {
    throw invalidResponse();
  }
  return value;
}

function point(value: unknown): CalibrationPoint {
  const body = object(value);
  return { x: finiteNumber(body.x), y: finiteNumber(body.y) };
}

function seedPoint(value: unknown): CalibrationSeedPoint {
  const body = object(value);
  return { image: point(body.image), court: point(body.court) };
}

function numericRecord(value: unknown): Readonly<Record<string, number>> {
  const body = object(value);
  return Object.fromEntries(
    Object.entries(body).map(([key, item]) => [key, finiteNumber(item)]),
  );
}

function wireframe(
  value: unknown,
): Readonly<Record<string, readonly CalibrationPoint[]>> {
  const body = object(value);
  return Object.fromEntries(
    Object.entries(body).map(([key, item]) => {
      if (!Array.isArray(item)) throw invalidResponse();
      return [key, item.map(point)];
    }),
  );
}

function parseCalibration(
  value: unknown,
  expectedCameraId?: string,
): CameraCalibration {
  const body = object(value);
  const cameraId = uuid(body, "cameraId");
  if (expectedCameraId && cameraId !== expectedCameraId)
    throw invalidResponse();
  if (!Array.isArray(body.seedPoints) || body.seedPoints.length < 4) {
    throw invalidResponse();
  }
  if (
    !Array.isArray(body.homography) ||
    body.homography.length !== 3 ||
    body.homography.some(
      (row) =>
        !Array.isArray(row) ||
        row.length !== 3 ||
        row.some((item) => typeof item !== "number" || !Number.isFinite(item)),
    )
  ) {
    throw invalidResponse();
  }
  const quality = body.quality;
  if (quality !== "good" && quality !== "acceptable" && quality !== "poor") {
    throw invalidResponse();
  }
  if (!Array.isArray(body.courtOutlineImage)) throw invalidResponse();
  const distortion = body.distortion;
  if (distortion !== null) {
    const parsed = object(distortion);
    if (finiteNumber(parsed.scale) <= 0) throw invalidResponse();
  }
  if (
    typeof body.converged !== "boolean" ||
    typeof body.cameraStable !== "boolean" ||
    typeof body.isCurrent !== "boolean"
  ) {
    throw invalidResponse();
  }
  const nullableNumber = (item: unknown): number | null => {
    if (item === null) return null;
    const parsed = finiteNumber(item);
    if (parsed < 0) throw invalidResponse();
    return parsed;
  };
  const parsedDistortion =
    distortion === null
      ? null
      : {
          k1: finiteNumber(object(distortion).k1),
          cx: finiteNumber(object(distortion).cx),
          cy: finiteNumber(object(distortion).cy),
          scale: finiteNumber(object(distortion).scale),
        };
  return {
    id: uuid(body, "id"),
    cameraId,
    engineVersion: nonEmptyString(body, "engineVersion"),
    seedPoints: body.seedPoints.map(seedPoint),
    homography: body.homography.map((row) => row.map(finiteNumber)),
    distortion: parsedDistortion,
    lineErrorsCm: numericRecord(body.lineErrorsCm),
    resolutionCmPerPx: numericRecord(body.resolutionCmPerPx),
    reprojectionErrorCm: (() => {
      const parsed = finiteNumber(body.reprojectionErrorCm);
      if (parsed < 0) throw invalidResponse();
      return parsed;
    })(),
    straightnessBeforePx: nullableNumber(body.straightnessBeforePx),
    straightnessAfterPx: nullableNumber(body.straightnessAfterPx),
    framesUsed: nonNegativeInteger(body.framesUsed),
    framesRejected: nonNegativeInteger(body.framesRejected),
    sampleCount: nonNegativeInteger(body.sampleCount),
    converged: body.converged,
    cameraStable: body.cameraStable,
    quality: quality as CalibrationQuality,
    courtOutlineImage: body.courtOutlineImage.map(point),
    wireframeImage: wireframe(body.wireframeImage),
    isCurrent: body.isCurrent,
    createdAt: date(body.createdAt),
  };
}

function parseUploadTargets(value: unknown): readonly UploadTarget[] {
  const body = object(value);
  if (
    !Array.isArray(body.uploads) ||
    body.uploads.length < 3 ||
    body.uploads.length > 5
  ) {
    throw invalidResponse();
  }
  return body.uploads.map((item) => {
    const upload = object(item);
    const url = nonEmptyString(upload, "url");
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      throw invalidResponse();
    }
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      throw invalidResponse();
    }
    const headers = object(upload.headers);
    const parsedHeaders = Object.fromEntries(
      Object.entries(headers).map(([key, header]) => {
        if (typeof header !== "string") throw invalidResponse();
        return [key, header];
      }),
    );
    if (upload.method !== "PUT") throw invalidResponse();
    return {
      assetId: uuid(upload, "assetId"),
      url,
      method: "PUT",
      headers: parsedHeaders,
      expiresAt: date(upload.expiresAt),
    };
  });
}

function errorFor(error: unknown): CalibrationServiceError {
  if (!(error instanceof BackendRequestError)) {
    return new CalibrationServiceError(
      "NETWORK",
      "Unable to reach the Fly Eye service.",
    );
  }
  switch (error.code) {
    case "CALIBRATION_FRAME_INCOMPLETE":
      return new CalibrationServiceError("FRAME_INCOMPLETE", error.message);
    case "CALIBRATION_FRAME_INVALID":
      return new CalibrationServiceError("FRAME_INVALID", error.message);
    case "CALIBRATION_DEGENERATE":
      return new CalibrationServiceError("DEGENERATE", error.message);
    case "ENGINE_ERROR":
      return new CalibrationServiceError("ENGINE", error.message);
    default:
      return new CalibrationServiceError("NETWORK", error.message);
  }
}

function assertCameraId(cameraId: string): void {
  if (!uuidPattern.test(cameraId)) {
    throw invalidInput("A valid camera is required for calibration.");
  }
}

function assertSubmission(input: SubmitCalibrationInput): void {
  assertCameraId(input.cameraId);
  if (input.frames.length < 3 || input.frames.length > 5) {
    throw invalidInput("Capture between three and five calibration images.");
  }
  if (input.seedPoints.length < 4) {
    throw invalidInput("Mark all required court points before calibration.");
  }
  if (
    !Number.isInteger(input.frameSize.width) ||
    !Number.isInteger(input.frameSize.height) ||
    input.frameSize.width <= 0 ||
    input.frameSize.height <= 0
  ) {
    throw invalidInput(
      "A valid camera frame size is required for calibration.",
    );
  }
  for (const frame of input.frames) {
    const type = frame.blob.type.toLowerCase();
    if (!supportedContentTypes.has(type) || frame.blob.size <= 0) {
      throw invalidInput(
        "Captured calibration images must be valid JPEG, PNG, or WebP files.",
      );
    }
  }
}

async function checksum(
  frame: CalibrationFrame,
  crypto: DigestCrypto,
): Promise<string> {
  const digest = await crypto.digest("SHA-256", await frame.blob.arrayBuffer());
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export class BackendCalibrationService implements CalibrationService {
  private readonly client: BackendHttpClient;
  private readonly fetchImpl: FetchLike;
  private readonly crypto: DigestCrypto | undefined;
  private readonly now: () => number;

  constructor(options: BackendCalibrationServiceOptions) {
    this.client = options.client;
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
    this.crypto = options.crypto ?? globalThis.crypto?.subtle;
    this.now = options.now ?? Date.now;
  }

  async getCurrent(cameraId: string): Promise<CameraCalibration | null> {
    assertCameraId(cameraId);
    try {
      const result = await this.client.request<unknown>(
        `cameras/${encodeURIComponent(cameraId)}/calibration`,
      );
      return parseCalibration(result, cameraId);
    } catch (error) {
      if (
        error instanceof BackendRequestError &&
        error.status === 404 &&
        error.code === "CALIBRATION_MISSING"
      ) {
        return null;
      }
      if (error instanceof CalibrationServiceError) throw error;
      throw errorFor(error);
    }
  }

  async submit(input: SubmitCalibrationInput): Promise<CameraCalibration> {
    assertSubmission(input);
    if (!this.crypto || typeof this.crypto.digest !== "function") {
      throw new CalibrationServiceError(
        "INVALID_INPUT",
        "This browser cannot securely prepare calibration images.",
      );
    }
    try {
      const frames = await Promise.all(
        input.frames.map(async (frame) => ({
          contentType: frame.blob.type.toLowerCase(),
          sizeBytes: frame.blob.size,
          checksumSha256: await checksum(frame, this.crypto as DigestCrypto),
        })),
      );
      const targets = parseUploadTargets(
        await this.client.request<unknown>(
          `cameras/${encodeURIComponent(input.cameraId)}/calibration-frames`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ frames }),
          },
        ),
      );
      if (targets.length !== input.frames.length) throw invalidResponse();
      await Promise.all(
        targets.map((target, index) =>
          this.upload(target, input.frames[index].blob),
        ),
      );
      const result = await this.client.request<unknown>(
        `cameras/${encodeURIComponent(input.cameraId)}/calibration`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            frameAssetIds: targets.map((target) => target.assetId),
            seedPoints: input.seedPoints.map((point) => ({
              image: point.image,
              court: point.court,
            })),
            frameSize: { w: input.frameSize.width, h: input.frameSize.height },
          }),
        },
      );
      return parseCalibration(result, input.cameraId);
    } catch (error) {
      if (error instanceof CalibrationServiceError) throw error;
      throw errorFor(error);
    }
  }

  private async upload(target: UploadTarget, blob: Blob): Promise<void> {
    if (Date.parse(target.expiresAt) <= this.now()) {
      throw new CalibrationServiceError(
        "UPLOAD_EXPIRED",
        "The calibration upload window expired. Request new upload targets.",
      );
    }
    let response: Response;
    try {
      response = await this.fetchImpl(target.url, {
        method: target.method,
        headers: target.headers,
        body: blob,
      });
    } catch {
      throw new CalibrationServiceError(
        "UPLOAD_FAILED",
        "A calibration image could not be uploaded. Please try again.",
      );
    }
    if (!response.ok) {
      throw new CalibrationServiceError(
        "UPLOAD_FAILED",
        "A calibration image could not be uploaded. Please try again.",
      );
    }
  }
}

export function createBackendCalibrationService(
  options: BackendCalibrationServiceOptions,
): CalibrationService {
  return new BackendCalibrationService(options);
}
