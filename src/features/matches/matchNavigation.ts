import type { MatchRecord, MatchStatus } from "../../domain";
import { matchRoutes } from "../../app/paths";

const resumeLabels: Record<MatchStatus, string> = {
  draft: "Continue setup",
  ready: "Open readiness",
  live: "Resume live monitor",
  completed: "Review decision",
};

export function matchResumeLabel(status: MatchStatus): string {
  return resumeLabels[status];
}

export function matchResumePath(match: Pick<MatchRecord, "id" | "status">) {
  switch (match.status) {
    case "draft":
    case "ready":
      return matchRoutes.readiness(match.id);
    case "live":
      return matchRoutes.live(match.id);
    case "completed":
      return matchRoutes.decision(match.id);
  }
}
