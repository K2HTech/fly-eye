import type { BackendHttpClient } from "./httpClient";
import { BackendRequestError } from "./errors";
import type {
  CalibrationFrameDeclaration,
  CalibrationFrameUpload,
  CalibrationPoint,
  CalibrationResult,
  CalibrationSeedPoint,
  CalibrationService,
  CalibrationSolveInput,
} from "../../services";

export class CalibrationServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CalibrationServiceError";
  }
}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const checksumPattern = /^[0-9a-f]{64}$/i;

function invalid(): CalibrationServiceError {
  return new CalibrationServiceError(
    "The Fly Eye service returned an invalid calibration response.",
  );
}

function object(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    throw invalid();
  return value as Record<string, unknown>;
}

function array(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw invalid();
  return value;
}

function string(body: Record<string, unknown>, key: string): string {
  const value = body[key];
  if (typeof value !== "string" || value.trim().length === 0) throw invalid();
  return value;
}

function finite(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw invalid();
  return value;
}

function nullableFinite(value: unknown): number | null {
  if (value === null) return null;
  return finite(value);
}

function positiveInteger(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0)
    throw invalid();
  return value;
}

function nonNegativeInteger(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0)
    throw invalid();
  return value;
}

function date(body: Record<string, unknown>, key: string): string {
  const value = string(body, key);
  if (!Number.isFinite(Date.parse(value))) throw invalid();
  return value;
}

function id(body: Record<string, unknown>, key: string): string {
  const value = string(body, key);
  if (!uuidPattern.test(value)) throw invalid();
  return value;
}

function point(value: unknown): CalibrationPoint {
  const body = object(value);
  return { x: finite(body.x), y: finite(body.y) };
}

function seedPoint(value: unknown): CalibrationSeedPoint {
  const body = object(value);
  return { image: point(body.image), court: point(body.court) };
}

function numberMap(value: unknown): Readonly<Record<string, number>> {
  const body = object(value);
  const entries = Object.entries(body);
  if (entries.some(([, entry]) => !Number.isFinite(entry))) throw invalid();
  return Object.fromEntries(entries) as Readonly<Record<string, number>>;
}

function wireframe(
  value: unknown,
): Readonly<Record<string, readonly [CalibrationPoint, CalibrationPoint]>> {
  const body = object(value);
  return Object.fromEntries(
    Object.entries(body).map(([key, entry]) => {
      const endpoints = array(entry);
      if (endpoints.length !== 2) throw invalid();
      return [key, [point(endpoints[0]), point(endpoints[1])]];
    }),
  ) as Readonly<Record<string, readonly [CalibrationPoint, CalibrationPoint]>>;
}

function matrix(value: unknown): CalibrationResult["homography"] {
  const rows = array(value);
  if (rows.length !== 3) throw invalid();
  const parsed = rows.map((row) => {
    const cells = array(row);
    if (cells.length !== 3) throw invalid();
    return [finite(cells[0]), finite(cells[1]), finite(cells[2])] as const;
  });
  return [parsed[0], parsed[1], parsed[2]];
}

function distortion(value: unknown): CalibrationResult["distortion"] {
  if (value === null) return null;
  const body = object(value);
  return {
    k1: finite(body.k1),
    cx: finite(body.cx),
    cy: finite(body.cy),
    scale: finite(body.scale),
  };
}

export function parseCalibration(value: unknown): CalibrationResult {
  const body = object(value);
  const quality = string(body, "quality");
  if (quality !== "good" && quality !== "acceptable" && quality !== "poor")
    throw invalid();
  if (
    typeof body.converged !== "boolean" ||
    typeof body.cameraStable !== "boolean"
  )
    throw invalid();
  const outline = array(body.courtOutlineImage).map(point);
  if (outline.length !== 4) throw invalid();
  return {
    id: id(body, "id"),
    cameraId: id(body, "cameraId"),
    engineVersion: string(body, "engineVersion"),
    seedPoints: array(body.seedPoints).map(seedPoint),
    homography: matrix(body.homography),
    distortion: distortion(body.distortion),
    lineErrorsCm: numberMap(body.lineErrorsCm),
    resolutionCmPerPx: numberMap(body.resolutionCmPerPx),
    reprojectionErrorCm: finite(body.reprojectionErrorCm),
    straightnessBeforePx: nullableFinite(body.straightnessBeforePx),
    straightnessAfterPx: nullableFinite(body.straightnessAfterPx),
    framesUsed: positiveInteger(body.framesUsed),
    framesRejected: nonNegativeInteger(body.framesRejected),
    sampleCount: nonNegativeInteger(body.sampleCount),
    converged: body.converged,
    cameraStable: body.cameraStable,
    quality,
    courtOutlineImage: outline,
    wireframeImage: wireframe(body.wireframeImage),
    isCurrent: body.isCurrent === true,
    createdAt: date(body, "createdAt"),
  };
}

function parseUploads(value: unknown): readonly CalibrationFrameUpload[] {
  const body = object(value);
  return array(body.uploads).map((entry) => {
    const upload = object(entry);
    const method = string(upload, "method");
    if (method !== "PUT") throw invalid();
    const headers = object(upload.headers);
    if (Object.values(headers).some((header) => typeof header !== "string"))
      throw invalid();
    return {
      assetId: id(upload, "assetId"),
      url: string(upload, "url"),
      method,
      headers: headers as Readonly<Record<string, string>>,
      expiresAt: date(upload, "expiresAt"),
    };
  });
}

function validCameraId(cameraId: string): void {
  if (!uuidPattern.test(cameraId)) {
    throw new CalibrationServiceError(
      "A valid camera is required for calibration.",
    );
  }
}

export class BackendCalibrationService implements CalibrationService {
  constructor(private readonly client: BackendHttpClient) {}

  async createFrameUploads(
    cameraId: string,
    frames: readonly CalibrationFrameDeclaration[],
  ) {
    validCameraId(cameraId);
    if (frames.length < 3 || frames.length > 5) {
      throw new CalibrationServiceError(
        "Capture between three and five calibration frames.",
      );
    }
    if (
      frames.some(
        (frame) =>
          frame.contentType !== "image/jpeg" ||
          !Number.isInteger(frame.sizeBytes) ||
          frame.sizeBytes <= 0 ||
          !checksumPattern.test(frame.checksumSha256),
      )
    )
      throw new CalibrationServiceError(
        "A calibration frame declaration is invalid.",
      );
    const uploads = parseUploads(
      await this.client.request<unknown>(
        `cameras/${cameraId}/calibration-frames`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ frames }),
        },
      ),
    );
    return uploads;
  }

  async getCurrent(cameraId: string): Promise<CalibrationResult | null> {
    validCameraId(cameraId);
    try {
      return parseCalibration(
        await this.client.request<unknown>(`cameras/${cameraId}/calibration`),
      );
    } catch (error) {
      if (error instanceof BackendRequestError && error.status === 404)
        return null;
      throw error;
    }
  }

  async solve(
    cameraId: string,
    input: CalibrationSolveInput,
  ): Promise<CalibrationResult> {
    validCameraId(cameraId);
    return parseCalibration(
      await this.client.request<unknown>(`cameras/${cameraId}/calibration`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    );
  }
}

export function createBackendCalibrationService(
  client: BackendHttpClient,
): CalibrationService {
  return new BackendCalibrationService(client);
}
