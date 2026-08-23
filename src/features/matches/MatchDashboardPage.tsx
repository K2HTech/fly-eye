import { useLocation, useNavigate, type Location } from "react-router-dom";

import { useMatches } from "../../app/matchContext";
import { routePaths } from "../../app/paths";
import { MatchDashboard } from "./MatchDashboard";
import { matchResumePath } from "./matchNavigation";

interface RouteMessageState {
  message?: string;
}

function routeMessage(location: Location): string | undefined {
  if (typeof location.state !== "object" || location.state === null) {
    return undefined;
  }

  const { message } = location.state as RouteMessageState;
  return typeof message === "string" ? message : undefined;
}

export function MatchDashboardPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const collection = useMatches();
  return (
    <MatchDashboard
      matches={collection.matches}
      status={collection.status}
      error={collection.error}
      notice={routeMessage(location)}
      onCreateMatch={() => navigate(routePaths.newMatch)}
      onResumeMatch={(match) => navigate(matchResumePath(match))}
      onRetry={() => void collection.refresh()}
    />
  );
}
