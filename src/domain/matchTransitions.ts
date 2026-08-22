import type { HardwareReadiness, MatchStatus } from "./models";

const allowedTransitions: Readonly<
  Record<MatchStatus, readonly MatchStatus[]>
> = {
  draft: ["ready"],
  ready: ["draft", "live"],
  live: ["completed"],
  completed: [],
};

/** Same-status updates are idempotent and therefore valid. */
export function canTransitionMatchStatus(
  from: MatchStatus,
  to: MatchStatus,
): boolean {
  return from === to || allowedTransitions[from].includes(to);
}

export class InvalidMatchStatusTransitionError extends Error {
  readonly from: MatchStatus;
  readonly to: MatchStatus;

  constructor(from: MatchStatus, to: MatchStatus) {
    super(`Invalid match status transition: ${from} -> ${to}`);
    this.name = "InvalidMatchStatusTransitionError";
    this.from = from;
    this.to = to;
  }
}

/** Throws when a requested status change is outside the domain state machine. */
export function assertValidMatchStatusTransition(
  from: MatchStatus,
  to: MatchStatus,
): void {
  if (!canTransitionMatchStatus(from, to)) {
    throw new InvalidMatchStatusTransitionError(from, to);
  }
}

/**
 * A match may become ready only after both simulated/real camera checks report
 * ready and an applicable calibration profile has been selected.
 */
export function isHardwareReady(readiness: HardwareReadiness): boolean {
  return (
    readiness.cameraA.status === "ready" &&
    readiness.cameraB.status === "ready" &&
    readiness.calibrationProfile !== null
  );
}
