import { describe, expect, it } from "vitest";

import type { CameraCalibration } from "../../services";
import { isUsableCalibration } from "./quality";

function calibration(
  quality: CameraCalibration["quality"],
  isCurrent = true,
): CameraCalibration {
  return { quality, isCurrent } as CameraCalibration;
}

describe("isUsableCalibration", () => {
  it.each(["good", "acceptable"] as const)(
    "accepts current %s calibration",
    (quality) => {
      expect(isUsableCalibration(calibration(quality))).toBe(true);
    },
  );

  it("rejects poor, historical, and missing calibration", () => {
    expect(isUsableCalibration(calibration("poor"))).toBe(false);
    expect(isUsableCalibration(calibration("good", false))).toBe(false);
    expect(isUsableCalibration(null)).toBe(false);
  });
});
