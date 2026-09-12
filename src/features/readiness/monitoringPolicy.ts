import type { CalibrationResult, CameraRecord } from "../../services";

import { calibrationSafety } from "../calibration/safety";

export interface MonitoringPolicyInput {
  readonly cameraRecords: readonly CameraRecord[];
  readonly calibrations: readonly (CalibrationResult | null)[];
  readonly hasLeftPreview: boolean;
  readonly hasRightPreview: boolean;
  readonly mode: string;
}

export function canOpenNormalMonitoring({
  cameraRecords,
  calibrations,
  hasLeftPreview,
  hasRightPreview,
  mode,
}: MonitoringPolicyInput): boolean {
  if (mode !== "production") return hasLeftPreview || hasRightPreview;

  const hasBothRoles =
    cameraRecords.length === 2 &&
    cameraRecords.some((camera) => camera.role === "SIDELINE_LEFT") &&
    cameraRecords.some((camera) => camera.role === "SIDELINE_RIGHT");
  const hasEligibleCalibrations =
    calibrations.length === 2 &&
    calibrations.every(
      (calibration) =>
        calibration?.isCurrent && !calibrationSafety(calibration).blocksCamera,
    );
  return (
    hasBothRoles && hasLeftPreview && hasRightPreview && hasEligibleCalibrations
  );
}
