import { describe, expect, it } from "vitest";
import {
  completeSeeds,
  doublesCorners,
  initialLandmarks,
  lineIntersection,
  nudgeLandmark,
} from "./landmarks";

describe("calibration landmarks", () => {
  it("uses the fixed A–D doubles court frame", () => {
    expect(doublesCorners.map((landmark) => landmark.court)).toEqual([
      { x: -3.05, y: 6.7 },
      { x: 3.05, y: 6.7 },
      { x: 3.05, y: -6.7 },
      { x: -3.05, y: -6.7 },
    ]);
  });
  it("starts every landmark unplaced and refuses to create solve seeds", () => {
    expect(initialLandmarks()).toEqual(doublesCorners);
    expect(completeSeeds(initialLandmarks())).toBeNull();
  });
  it("allows a placed point to move beyond a frame edge", () => {
    const landmarks = initialLandmarks().map((landmark, index) =>
      index === 0 ? { ...landmark, image: { x: 50, y: 50 } } : landmark,
    );
    expect(nudgeLandmark(landmarks, 0, "x", -100)[0].image?.x).toBe(-50);
  });
  it("finds a hidden corner from two visible court-line segments", () => {
    expect(
      lineIntersection(
        { x: 20, y: 0 },
        { x: 20, y: 100 },
        { x: 0, y: 30 },
        { x: 100, y: 30 },
      ),
    ).toEqual({ x: 20, y: 30 });
  });
});
