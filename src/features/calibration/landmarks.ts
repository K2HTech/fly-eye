import type { CalibrationPoint, CalibrationSeedPoint } from "../../services";

export interface CourtLandmark {
  readonly id: "A" | "B" | "C" | "D";
  readonly court: CalibrationPoint;
}

export interface LandmarkPlacement extends CourtLandmark {
  /** Undefined until the operator explicitly places this landmark. */
  readonly image?: CalibrationPoint;
}

/** Fixed match-level court frame. These labels are never camera-relative. */
export const doublesCorners: readonly CourtLandmark[] = [
  { id: "A", court: { x: -3.05, y: 6.7 } },
  { id: "B", court: { x: 3.05, y: 6.7 } },
  { id: "C", court: { x: 3.05, y: -6.7 } },
  { id: "D", court: { x: -3.05, y: -6.7 } },
];

export function initialLandmarks(): LandmarkPlacement[] {
  return doublesCorners.map(({ id, court }) => ({ id, court }));
}

export function completeSeeds(
  landmarks: readonly LandmarkPlacement[],
): CalibrationSeedPoint[] | null {
  if (
    landmarks.length !== doublesCorners.length ||
    landmarks.some((landmark) => !landmark.image)
  )
    return null;
  return landmarks.map(({ court, image }) => ({ court, image: image! }));
}

export function nudgeLandmark(
  landmarks: readonly LandmarkPlacement[],
  index: number,
  axis: "x" | "y",
  delta: number,
): LandmarkPlacement[] {
  return landmarks.map((landmark, landmarkIndex) =>
    landmarkIndex === index && landmark.image
      ? {
          ...landmark,
          image: {
            ...landmark.image,
            [axis]: landmark.image[axis] + delta,
          },
        }
      : landmark,
  );
}

export function lineIntersection(
  firstA: CalibrationPoint,
  firstB: CalibrationPoint,
  secondA: CalibrationPoint,
  secondB: CalibrationPoint,
): CalibrationPoint | null {
  const denominator =
    (firstA.x - firstB.x) * (secondA.y - secondB.y) -
    (firstA.y - firstB.y) * (secondA.x - secondB.x);
  if (denominator === 0) return null;
  const first = firstA.x * firstB.y - firstA.y * firstB.x;
  const second = secondA.x * secondB.y - secondA.y * secondB.x;
  return {
    x:
      (first * (secondA.x - secondB.x) - (firstA.x - firstB.x) * second) /
      denominator,
    y:
      (first * (secondA.y - secondB.y) - (firstA.y - firstB.y) * second) /
      denominator,
  };
}
