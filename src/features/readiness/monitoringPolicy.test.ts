import { describe, expect, it } from "vitest";

import type { CalibrationResult, CameraRecord } from "../../services";

import { canOpenNormalMonitoring } from "./monitoringPolicy";

const left: CameraRecord = {
  id: "00000000-0000-4000-8000-000000000001",
  matchId: "00000000-0000-4000-8000-000000000002",
  name: "Left sideline",
  role: "SIDELINE_LEFT",
  sourceType: "device",
  sourceRef: "left",
  resolution: { width: 1280, height: 720 },
  targetFps: 30,
  isActive: true,
  calibration: null,
  createdAt: "2026-09-01T00:00:00.000Z",
};

const eligibleCalibration: CalibrationResult = {
  id: "00000000-0000-4000-8000-000000000003",
  cameraId: left.id,
  engineVersion: "test",
  seedPoints: [],
  homography: [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ],
  distortion: null,
  lineErrorsCm: {},
  resolutionCmPerPx: {},
  reprojectionErrorCm: 1,
  straightnessBeforePx: null,
  straightnessAfterPx: null,
  framesUsed: 2,
  framesRejected: 0,
  sampleCount: 2,
  converged: true,
  cameraStable: true,
  isCurrent: true,
  quality: "good",
  courtOutlineImage: [],
  wireframeImage: {},
  createdAt: "2026-09-01T00:00:00.000Z",
};

describe("normal monitoring policy", () => {
  it("allows a development monitor with one decoded preview and no calibration", () => {
    expect(
      canOpenNormalMonitoring({
        cameraRecords: [left],
        calibrations: [],
        hasLeftPreview: true,
        hasRightPreview: false,
        mode: "development",
      }),
    ).toBe(true);
  });

  it("requires both roles, previews, and eligible calibrations in production", () => {
    expect(
      canOpenNormalMonitoring({
        cameraRecords: [left],
        calibrations: [eligibleCalibration],
        hasLeftPreview: true,
        hasRightPreview: false,
        mode: "production",
      }),
    ).toBe(false);
  });
});
