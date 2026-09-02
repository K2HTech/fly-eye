import type { CameraCalibration } from "../../services";

export function isUsableCalibration(
  calibration: CameraCalibration | null | undefined,
): boolean {
  return (
    calibration?.isCurrent === true &&
    (calibration.quality === "good" || calibration.quality === "acceptable")
  );
}
