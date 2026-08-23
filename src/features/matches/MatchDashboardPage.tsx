import { useState } from "react";
import { useLocation, useNavigate, type Location } from "react-router-dom";

import { useMatches } from "../../app/matchContext";
import { routePaths } from "../../app/paths";
import { useSession } from "../../app/sessionContext";
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
  const session = useSession();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [actionError, setActionError] = useState<string | undefined>();
  const identity = session.identity;

  if (!identity) return null;

  const signOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    setActionError(undefined);
    try {
      await session.signOut();
    } catch (cause) {
      setActionError(
        cause instanceof Error ? cause.message : "Unable to sign out.",
      );
      setIsSigningOut(false);
    }
  };

  return (
    <MatchDashboard
      identity={identity}
      matches={collection.matches}
      status={collection.status}
      error={collection.error}
      actionError={actionError}
      notice={routeMessage(location)}
      isSigningOut={isSigningOut}
      onCreateMatch={() => navigate(routePaths.newMatch)}
      onResumeMatch={(match) => navigate(matchResumePath(match))}
      onRetry={() => void collection.refresh()}
      onSignOut={() => void signOut()}
    />
  );
}
