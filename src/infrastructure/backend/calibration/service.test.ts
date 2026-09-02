import { describe, expect, it, vi } from "vitest";

import type { BackendHttpClient } from "../httpClient";
import { BackendRequestError } from "../errors";
import { BackendCalibrationService } from "./service";

const cameraId = "00000000-0000-4000-8000-000000000011";
const assetIds = [
  "00000000-0000-4000-8000-000000000101",
  "00000000-0000-4000-8000-000000000102",
  "00000000-0000-4000-8000-000000000103",
];

const seedPoints = [
  { image: { x: 10, y: 100 }, court: { x: -3.05, y: -6.7 } },
  { image: { x: 200, y: 100 }, court: { x: 3.05, y: -6.7 } },
  { image: { x: 200, y: 10 }, court: { x: 3.05, y: 6.7 } },
  { image: { x: 10, y: 10 }, court: { x: -3.05, y: 6.7 } },
];

function calibration(overrides: Record<string, unknown> = {}) {
  return {
    id: "00000000-0000-4000-8000-000000000201",
    cameraId,
    engineVersion: "engine-1.0.0",
    seedPoints,
    homography: [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ],
    distortion: null,
    lineErrorsCm: { BASELINE_NEAR: 0.4 },
    resolutionCmPerPx: { BASELINE_NEAR: 0.3 },
    reprojectionErrorCm: 1.2,
    straightnessBeforePx: null,
    straightnessAfterPx: null,
    framesUsed: 3,
    framesRejected: 0,
    sampleCount: 20,
    converged: true,
    cameraStable: true,
    quality: "good",
    courtOutlineImage: [
      { x: 10, y: 100 },
      { x: 200, y: 100 },
      { x: 200, y: 10 },
      { x: 10, y: 10 },
    ],
    wireframeImage: {
      baseline: [
        { x: 10, y: 100 },
        { x: 200, y: 100 },
      ],
    },
    isCurrent: true,
    createdAt: "2026-09-02T00:00:00.000Z",
    ...overrides,
  };
}

function frames() {
  return Array.from(
    { length: 3 },
    () => new Blob(["frame"], { type: "image/jpeg" }),
  ).map((blob) => ({ blob }));
}

function digest(): Pick<SubtleCrypto, "digest"> {
  return {
    digest: vi.fn().mockResolvedValue(new Uint8Array([0xab, 0xcd]).buffer),
  };
}

describe("BackendCalibrationService", () => {
  it("declares, uploads, and submits captured frames without authorizing storage requests", async () => {
    const request = vi.fn<BackendHttpClient["request"]>();
    request.mockImplementation(async (path) => {
      if (path.endsWith("calibration-frames")) {
        return {
          uploads: assetIds.map((assetId) => ({
            assetId,
            url: `https://storage.example/${assetId}`,
            method: "PUT",
            headers: {
              "Content-Type": "image/jpeg",
              "x-amz-meta-sha256": "abcd",
            },
            expiresAt: "2026-09-02T01:00:00.000Z",
          })),
        };
      }
      return calibration();
    });
    const upload = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 200 }));
    const service = new BackendCalibrationService({
      client: { request } as BackendHttpClient,
      fetchImpl: upload,
      crypto: digest(),
      now: () => Date.parse("2026-09-02T00:00:00.000Z"),
    });

    await expect(
      service.submit({
        cameraId,
        frames: frames(),
        seedPoints,
        frameSize: { width: 1280, height: 720 },
      }),
    ).resolves.toMatchObject({ cameraId, quality: "good" });

    const declaration = JSON.parse(String(request.mock.calls[0][1]?.body));
    expect(declaration.frames).toEqual([
      { contentType: "image/jpeg", sizeBytes: 5, checksumSha256: "abcd" },
      { contentType: "image/jpeg", sizeBytes: 5, checksumSha256: "abcd" },
      { contentType: "image/jpeg", sizeBytes: 5, checksumSha256: "abcd" },
    ]);
    expect(upload).toHaveBeenCalledTimes(3);
    expect(upload.mock.calls[0][0]).toBe(
      `https://storage.example/${assetIds[0]}`,
    );
    expect(upload.mock.calls[0][1]).toMatchObject({
      method: "PUT",
      headers: {
        "Content-Type": "image/jpeg",
        "x-amz-meta-sha256": "abcd",
      },
    });
    const solve = JSON.parse(String(request.mock.calls[1][1]?.body));
    expect(solve.frameAssetIds).toEqual(assetIds);
    expect(solve.frameSize).toEqual({ w: 1280, h: 720 });
    expect(solve.seedPoints).toEqual(seedPoints);
  });

  it("returns null only when the backend reports that current calibration is missing", async () => {
    const request = vi.fn<BackendHttpClient["request"]>().mockRejectedValue(
      new BackendRequestError("not found", {
        status: 404,
        code: "CALIBRATION_MISSING",
        requestId: "request-1",
      }),
    );
    const service = new BackendCalibrationService({
      client: { request } as BackendHttpClient,
      crypto: digest(),
    });

    await expect(service.getCurrent(cameraId)).resolves.toBeNull();
  });

  it("maps a degenerate solve to a safe actionable error", async () => {
    const request = vi.fn<BackendHttpClient["request"]>();
    request.mockImplementation(async (path) => {
      if (path.endsWith("calibration-frames")) {
        return {
          uploads: assetIds.map((assetId) => ({
            assetId,
            url: `https://storage.example/${assetId}`,
            method: "PUT",
            headers: { "Content-Type": "image/jpeg" },
            expiresAt: "2026-09-02T01:00:00.000Z",
          })),
        };
      }
      throw new BackendRequestError("geometry failed", {
        status: 400,
        code: "CALIBRATION_DEGENERATE",
        requestId: "request-2",
      });
    });
    const service = new BackendCalibrationService({
      client: { request } as BackendHttpClient,
      fetchImpl: vi.fn().mockResolvedValue(new Response(null, { status: 200 })),
      crypto: digest(),
      now: () => Date.parse("2026-09-02T00:00:00.000Z"),
    });

    await expect(
      service.submit({
        cameraId,
        frames: frames(),
        seedPoints,
        frameSize: { width: 1280, height: 720 },
      }),
    ).rejects.toMatchObject({
      code: "DEGENERATE",
      message: "geometry failed",
    });
  });

  it("rejects expired upload targets before sending a frame", async () => {
    const request = vi.fn<BackendHttpClient["request"]>().mockResolvedValue({
      uploads: assetIds.map((assetId) => ({
        assetId,
        url: `https://storage.example/${assetId}`,
        method: "PUT",
        headers: { "Content-Type": "image/jpeg" },
        expiresAt: "2026-09-01T01:00:00.000Z",
      })),
    });
    const upload = vi.fn();
    const service = new BackendCalibrationService({
      client: { request } as BackendHttpClient,
      fetchImpl: upload,
      crypto: digest(),
      now: () => Date.parse("2026-09-02T00:00:00.000Z"),
    });

    await expect(
      service.submit({
        cameraId,
        frames: frames(),
        seedPoints,
        frameSize: { width: 1280, height: 720 },
      }),
    ).rejects.toMatchObject({
      code: "UPLOAD_EXPIRED",
    });
    expect(upload).not.toHaveBeenCalled();
  });

  it("rejects malformed calibration results instead of admitting them to application state", async () => {
    const request = vi
      .fn<BackendHttpClient["request"]>()
      .mockResolvedValue(calibration({ quality: "unknown" }));
    const service = new BackendCalibrationService({
      client: { request } as BackendHttpClient,
      crypto: digest(),
    });

    await expect(service.getCurrent(cameraId)).rejects.toMatchObject({
      code: "INVALID_RESPONSE",
    });
  });
});
