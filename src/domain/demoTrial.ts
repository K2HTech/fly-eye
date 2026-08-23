import type { Session } from "./models";

export const DEMO_TRIAL_DURATION_MS = 15 * 60 * 1000;

export function demoTrialRemainingMs(
  session: Session,
  nowMs = Date.now(),
): number | null {
  if (session.mode !== "demo") return null;
  if (!session.demoTrialStartedAt) return null;
  const startedAt = Date.parse(session.demoTrialStartedAt);
  if (!Number.isFinite(startedAt)) return 0;
  return Math.max(0, startedAt + DEMO_TRIAL_DURATION_MS - nowMs);
}

export function isDemoTrialExpired(
  session: Session,
  nowMs = Date.now(),
): boolean {
  return demoTrialRemainingMs(session, nowMs) === 0;
}
