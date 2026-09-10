import type { CalibrationPoint, CalibrationSeedPoint } from "../../services";

export interface CourtLandmark {
  readonly id: "A" | "B" | "C" | "D";
  readonly court: CalibrationPoint;
}

/** Fixed match-level court frame. These labels are never camera-relative. */
export const doublesCorners: readonly CourtLandmark[] = [
  { id: "A", court: { x: -3.05, y: 6.7 } },
  { id: "B", court: { x: 3.05, y: 6.7 } },
  { id: "C", court: { x: 3.05, y: -6.7 } },
  { id: "D", court: { x: -3.05, y: -6.7 } },
];

export function initialSeeds(
  width: number,
  height: number,
): CalibrationSeedPoint[] {
  return doublesCorners.map(({ court }) => ({
    court,
    image: { x: width / 2, y: height / 2 },
  }));
}

export function nudgeSeed(
  seeds: readonly CalibrationSeedPoint[],
  index: number,
  axis: "x" | "y",
  delta: number,
): CalibrationSeedPoint[] {
  return seeds.map((seed, seedIndex) =>
    seedIndex === index
      ? { ...seed, image: { ...seed.image, [axis]: seed.image[axis] + delta } }
      : seed,
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
