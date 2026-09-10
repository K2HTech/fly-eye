import type { CalibrationResult } from "../../services";

export interface CalibrationSafety {
  readonly blocksCamera: boolean;
  readonly reasons: readonly string[];
  readonly warnings: readonly string[];
}

export function calibrationSafety(
  result: CalibrationResult,
): CalibrationSafety {
  const reasons: string[] = [];
  const warnings: string[] = [];
  if (result.quality === "poor")
    reasons.push(
      "The worst boundary line is over 5 cm from the painted court line.",
    );
  if (!result.cameraStable)
    reasons.push("The camera moved between captured frames.");
  if (!result.converged)
    reasons.push("Court-line refinement did not converge.");
  if (result.framesUsed < 2)
    reasons.push(
      "Only one usable frame remained, so Fly Eye cannot cross-check the calibration.",
    );
  if (result.quality === "acceptable")
    warnings.push("Usable with reduced accuracy.");
  if (result.framesRejected > 0)
    warnings.push(
      `${result.framesRejected} captured frame${result.framesRejected === 1 ? " was" : "s were"} dropped because it disagreed with the others.`,
    );
  return { blocksCamera: reasons.length > 0, reasons, warnings };
}
