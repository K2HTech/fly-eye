import { describe, expect, it, vi } from "vitest";

import type { BackendHttpClient } from "./httpClient";
import { BackendRequestError } from "./errors";
import {
  BackendCalibrationService,
  CalibrationServiceError,
} from "./calibration";

const cameraId = "00000000-0000-4000-8000-000000000001";
const calibrationId = "00000000-0000-4000-8000-000000000002";
const frameId = "00000000-0000-4000-8000-000000000003";

function calibration() {
  return {
    id: calibrationId,
    cameraId,
    engineVersion: "engine-1",
    seedPoints: [
      { image: { x: 1, y: 2 }, court: { x: -3.05, y: 6.7 } },
      { image: { x: 3, y: 4 }, court: { x: 3.05, y: 6.7 } },
      { image: { x: 5, y: 6 }, court: { x: 3.05, y: -6.7 } },
      { image: { x: 7, y: 8 }, court: { x: -3.05, y: -6.7 } },
    ],
    homography: [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ],
    distortion: null,
    lineErrorsCm: { BASELINE_NEAR: 0.4 },
    resolutionCmPerPx: { BASELINE_NEAR: 0.3 },
    reprojectionErrorCm: 0.4,
    straightnessBeforePx: 1,
    straightnessAfterPx: 0.1,
    framesUsed: 3,
    framesRejected: 0,
    sampleCount: 240,
    converged: true,
    cameraStable: true,
    quality: "good",
    courtOutlineImage: [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ],
    wireframeImage: {
      BASELINE_NEAR: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
      ],
    },
    isCurrent: true,
    createdAt: "2026-09-10T00:00:00.000Z",
  };
}

function clientReturning(value: unknown) {
  const request = vi
    .fn<BackendHttpClient["request"]>()
    .mockResolvedValue(value);
  return { request, client: { request } as BackendHttpClient };
}

describe("BackendCalibrationService", () => {
  it("requests validated upload targets for exactly declared JPEG frames", async () => {
    const { client, request } = clientReturning({
      uploads: [
        {
          assetId: frameId,
          url: "https://storage.example/upload",
          method: "PUT",
          headers: {
            "Content-Type": "image/jpeg",
            "x-amz-meta-sha256": "a".repeat(64),
          },
          expiresAt: "2026-09-10T00:10:00.000Z",
        },
      ],
    });
    const service = new BackendCalibrationService(client);
    const frames = Array.from({ length: 3 }, () => ({
      contentType: "image/jpeg" as const,
      sizeBytes: 100,
      checksumSha256: "a".repeat(64),
    }));

    await expect(
      service.createFrameUploads(cameraId, frames),
    ).resolves.toHaveLength(1);
    expect(request).toHaveBeenCalledWith(
      `cameras/${cameraId}/calibration-frames`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ frames }),
      },
    );
  });

  it("rejects invalid local frame declarations before requesting upload targets", async () => {
    const { client, request } = clientReturning({});
    const service = new BackendCalibrationService(client);

    await expect(
      service.createFrameUploads(cameraId, []),
    ).rejects.toBeInstanceOf(CalibrationServiceError);
    expect(request).not.toHaveBeenCalled();
  });

  it("parses a current calibration and posts raw solve input unchanged", async () => {
    const { client, request } = clientReturning(calibration());
    const service = new BackendCalibrationService(client);
    const input = {
      frameAssetIds: [frameId, frameId, frameId],
      seedPoints: calibration().seedPoints,
      frameSize: { w: 1280, h: 720 },
    };

    await expect(service.solve(cameraId, input)).resolves.toMatchObject({
      id: calibrationId,
      quality: "good",
      framesRejected: 0,
    });
    expect(request).toHaveBeenCalledWith(`cameras/${cameraId}/calibration`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  });

  it("treats a missing current calibration as absent and rejects malformed results", async () => {
    const missing = new BackendRequestError("not found", {
      status: 404,
      code: "NOT_FOUND",
      requestId: null,
    });
    const missingClient = clientReturning(undefined);
    missingClient.request.mockRejectedValueOnce(missing);
    await expect(
      new BackendCalibrationService(missingClient.client).getCurrent(cameraId),
    ).resolves.toBeNull();

    const malformed = clientReturning({ ...calibration(), quality: "unknown" });
    await expect(
      new BackendCalibrationService(malformed.client).getCurrent(cameraId),
    ).rejects.toBeInstanceOf(CalibrationServiceError);
  });

  it("accepts a calibration with empty diagnostics, zero samples, and null straightness", async () => {
    const { client } = clientReturning({
      ...calibration(),
      lineErrorsCm: {},
      resolutionCmPerPx: {},
      wireframeImage: {},
      courtOutlineImage: [],
      straightnessBeforePx: null,
      straightnessAfterPx: null,
      framesUsed: 0,
      sampleCount: 0,
    });
    const service = new BackendCalibrationService(client);

    await expect(service.getCurrent(cameraId)).resolves.toMatchObject({
      id: calibrationId,
      straightnessBeforePx: null,
      straightnessAfterPx: null,
      framesUsed: 0,
      sampleCount: 0,
      lineErrorsCm: {},
      resolutionCmPerPx: {},
      courtOutlineImage: [],
      wireframeImage: {},
    });
  });

  it("accepts wireframe entries that carry more than two points", async () => {
    const { client } = clientReturning({
      ...calibration(),
      wireframeImage: {
        COURT_OUTLINE: [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
          { x: 100, y: 200 },
          { x: 0, y: 200 },
        ],
        BASELINE_NEAR: [
          { x: 0, y: 100 },
          { x: 100, y: 100 },
        ],
      },
    });
    const service = new BackendCalibrationService(client);

    await expect(service.getCurrent(cameraId)).resolves.toMatchObject({
      wireframeImage: {
        COURT_OUTLINE: [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
          { x: 100, y: 200 },
          { x: 0, y: 200 },
        ],
        BASELINE_NEAR: [
          { x: 0, y: 100 },
          { x: 100, y: 100 },
        ],
      },
    });
  });
});
