import { describe, expect, it } from "vitest";
import type { CalibrationResult } from "../../services";
import { calibrationSafety } from "./safety";

const result = (partial: Partial<CalibrationResult>): CalibrationResult => ({
  id: "d1000000-0000-4000-8000-000000000001",
  cameraId: "d1000000-0000-4000-8000-000000000002",
  engineVersion: "test",
  seedPoints: [],
  homography: [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ],
  distortion: null,
  lineErrorsCm: { BASELINE_NEAR: 1 },
  resolutionCmPerPx: { BASELINE_NEAR: 1 },
  reprojectionErrorCm: 1,
  straightnessBeforePx: 1,
  straightnessAfterPx: 1,
  framesUsed: 3,
  framesRejected: 0,
  sampleCount: 3,
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
  ...partial,
});

describe("calibrationSafety", () => {
  it("blocks unsafe calibration independently of the mean error", () => {
    expect(calibrationSafety(result({ quality: "poor" })).blocksCamera).toBe(
      true,
    );
  });
  it("keeps acceptable calibration usable with a clear warning", () => {
    const safety = calibrationSafety(
      result({ quality: "acceptable", framesRejected: 1 }),
    );
    expect(safety.blocksCamera).toBe(false);
    expect(safety.warnings).toHaveLength(2);
  });
});
