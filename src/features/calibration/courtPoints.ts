import type { CalibrationPoint, CalibrationSeedPoint } from "../../services";

export type CourtCornerId =
  "near-left" | "near-right" | "far-right" | "far-left";

export interface CourtCornerPrompt {
  readonly id: CourtCornerId;
  readonly label: string;
  readonly court: CalibrationPoint;
}

export const courtCornerPrompts: readonly CourtCornerPrompt[] = [
  {
    id: "near-left",
    label: "Near-left outer corner",
    court: { x: -3.05, y: -6.7 },
  },
  {
    id: "near-right",
    label: "Near-right outer corner",
    court: { x: 3.05, y: -6.7 },
  },
  {
    id: "far-right",
    label: "Far-right outer corner",
    court: { x: 3.05, y: 6.7 },
  },
  {
    id: "far-left",
    label: "Far-left outer corner",
    court: { x: -3.05, y: 6.7 },
  },
];

export interface DisplayBounds {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

export class CourtPointError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CourtPointError";
  }
}

function validDimension(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

export function imagePointFromDisplayPosition(
  clientX: number,
  clientY: number,
  bounds: DisplayBounds,
  imageWidth: number,
  imageHeight: number,
): CalibrationPoint {
  if (
    !validDimension(bounds.width) ||
    !validDimension(bounds.height) ||
    !Number.isInteger(imageWidth) ||
    !Number.isInteger(imageHeight) ||
    imageWidth <= 0 ||
    imageHeight <= 0
  ) {
    throw new CourtPointError(
      "The calibration image is not ready for marking.",
    );
  }
  if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) {
    throw new CourtPointError("Choose a point on the calibration image.");
  }
  const normalizedX = Math.min(
    Math.max((clientX - bounds.left) / bounds.width, 0),
    1 - Number.EPSILON,
  );
  const normalizedY = Math.min(
    Math.max((clientY - bounds.top) / bounds.height, 0),
    1 - Number.EPSILON,
  );
  return {
    x: normalizedX * imageWidth,
    y: normalizedY * imageHeight,
  };
}

export function createCourtSeedPoints(
  imagePoints: Readonly<Partial<Record<CourtCornerId, CalibrationPoint>>>,
): readonly CalibrationSeedPoint[] {
  return courtCornerPrompts.map((prompt) => {
    const image = imagePoints[prompt.id];
    if (
      !image ||
      !Number.isFinite(image.x) ||
      !Number.isFinite(image.y) ||
      image.x < 0 ||
      image.y < 0
    ) {
      throw new CourtPointError(
        "Mark all four outer court corners before continuing.",
      );
    }
    return { image, court: prompt.court };
  });
}
