import { describe, expect, it } from "vitest";

import {
  assertValidMatchStatusTransition,
  canTransitionMatchStatus,
  InvalidMatchStatusTransitionError,
  isHardwareReady,
} from "./index";
import type { HardwareReadiness, MatchStatus } from "./index";

const statuses: readonly MatchStatus[] = [
  "draft",
  "ready",
  "live",
  "completed",
];

const readyHardware: HardwareReadiness = {
  matchId: "match-1",
  cameraA: { status: "ready", simulated: true },
  cameraB: { status: "ready", simulated: true },
  calibrationProfile: {
    id: "calibration-1",
    name: "Known-good court profile",
    simulated: true,
  },
};

describe("match status transitions", () => {
  it.each([
    ["draft", "ready"],
    ["ready", "draft"],
    ["ready", "live"],
    ["live", "completed"],
  ] as const)("allows %s -> %s", (from, to) => {
    expect(canTransitionMatchStatus(from, to)).toBe(true);
    expect(() => assertValidMatchStatusTransition(from, to)).not.toThrow();
  });

  it.each(statuses)("allows an idempotent %s -> %s update", (status) => {
    expect(canTransitionMatchStatus(status, status)).toBe(true);
  });

  it.each([
    ["draft", "live"],
    ["draft", "completed"],
    ["ready", "completed"],
    ["live", "draft"],
    ["completed", "draft"],
    ["completed", "ready"],
    ["completed", "live"],
  ] as const)("rejects %s -> %s", (from, to) => {
    expect(canTransitionMatchStatus(from, to)).toBe(false);
    expect(() => assertValidMatchStatusTransition(from, to)).toThrow(
      InvalidMatchStatusTransitionError,
    );
  });

  it("includes the attempted statuses in the domain error", () => {
    expect(() => assertValidMatchStatusTransition("draft", "live")).toThrow(
      "Invalid match status transition: draft -> live",
    );
  });
});

describe("hardware readiness", () => {
  it("requires both cameras and a calibration profile", () => {
    expect(isHardwareReady(readyHardware)).toBe(true);
  });

  it.each([
    [
      "cameraA",
      { ...readyHardware, cameraA: { status: "error", simulated: true } },
    ],
    [
      "cameraB",
      { ...readyHardware, cameraB: { status: "connecting", simulated: true } },
    ],
    ["calibration", { ...readyHardware, calibrationProfile: null }],
  ] as const)("rejects readiness when %s is incomplete", (_part, readiness) => {
    expect(isHardwareReady(readiness)).toBe(false);
  });
});
