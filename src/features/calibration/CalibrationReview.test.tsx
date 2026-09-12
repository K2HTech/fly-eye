import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type {
  CalibrationResult,
  CapturedCalibrationFrame,
} from "../../services";
import { CalibrationReview } from "./CalibrationReview";

const frame: CapturedCalibrationFrame = {
  bytes: new Blob(["frame"], { type: "image/jpeg" }),
  previewDataUrl: "data:image/jpeg;base64,ZmFrZQ==",
  width: 1280,
  height: 720,
  declaration: {
    contentType: "image/jpeg",
    sizeBytes: 5,
    checksumSha256: "a".repeat(64),
  },
};

const result: CalibrationResult = {
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
    { x: 10, y: 20 },
    { x: 1270, y: 20 },
    { x: 1270, y: 700 },
    { x: 10, y: 700 },
  ],
  wireframeImage: {
    BASELINE_NEAR: [
      { x: 10, y: 20 },
      { x: 1270, y: 20 },
    ],
  },
  isCurrent: true,
  createdAt: "2026-09-12T00:00:00.000Z",
};

describe("CalibrationReview", () => {
  it("locks the detected-line overlay to the captured frame coordinate space", () => {
    const { container } = render(
      <CalibrationReview frame={frame} result={result} onRedo={vi.fn()} />,
    );

    expect(
      screen.getByRole("img", {
        name: "Captured frame with detected court lines",
      }),
    ).toBeInTheDocument();
    expect(
      container.querySelector(".calibration__wireframe-frame"),
    ).toHaveStyle({ aspectRatio: "1280 / 720" });
    expect(container.querySelector("svg")).toHaveAttribute(
      "viewBox",
      "0 0 1280 720",
    );
    expect(container.querySelector("svg")).toHaveAttribute(
      "preserveAspectRatio",
      "none",
    );
    expect(container.querySelector("polygon")).not.toBeInTheDocument();
    expect(
      container.querySelectorAll(".calibration__detected-lines line"),
    ).toHaveLength(1);
  });
});
