import { describe, expect, it } from "vitest";

import {
  CourtPointError,
  courtCornerPrompts,
  createCourtSeedPoints,
  imagePointFromDisplayPosition,
} from "./courtPoints";

describe("court calibration points", () => {
  it("maps a displayed-image click back to source-image pixels", () => {
    expect(
      imagePointFromDisplayPosition(
        330,
        200,
        { left: 10, top: 20, width: 640, height: 360 },
        1280,
        720,
      ),
    ).toEqual({ x: 640, y: 360 });
  });

  it("keeps edge clicks within backend-valid source image bounds", () => {
    const point = imagePointFromDisplayPosition(
      650,
      380,
      { left: 10, top: 20, width: 640, height: 360 },
      1280,
      720,
    );

    expect(point.x).toBeLessThan(1280);
    expect(point.y).toBeLessThan(720);
  });

  it("creates the four seed points in the approved court-corner order", () => {
    const seeds = createCourtSeedPoints({
      "near-left": { x: 10, y: 700 },
      "near-right": { x: 1270, y: 700 },
      "far-right": { x: 1200, y: 10 },
      "far-left": { x: 50, y: 10 },
    });

    expect(seeds.map((seed) => seed.court)).toEqual(
      courtCornerPrompts.map((prompt) => prompt.court),
    );
    expect(seeds.map((seed) => seed.image)).toEqual([
      { x: 10, y: 700 },
      { x: 1270, y: 700 },
      { x: 1200, y: 10 },
      { x: 50, y: 10 },
    ]);
  });

  it("rejects incomplete or invalid point marking", () => {
    expect(() =>
      createCourtSeedPoints({ "near-left": { x: 1, y: 1 } }),
    ).toThrow(CourtPointError);
    expect(() =>
      imagePointFromDisplayPosition(
        1,
        1,
        { left: 0, top: 0, width: 0, height: 1 },
        1280,
        720,
      ),
    ).toThrow(CourtPointError);
  });
});
