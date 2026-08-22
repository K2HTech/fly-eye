import { useState } from "react";
import {
  Navigate,
  Outlet,
  useLocation,
  useNavigate,
  useParams,
  type Location,
} from "react-router-dom";

import { DecisionScreen, type DecisionResult } from "../features/decision";
import { LiveMonitor } from "../features/live";
import { ClipReview, type ClipDecision } from "../features/review";
import { matchRoutes, routePaths } from "./paths";
import { useRouteAccess } from "./routeAccess";
import { useSession } from "./sessionContext";

interface RouteMessageState {
  message?: string;
}

interface DecisionRouteState {
  landingFrame?: number | string;
}

function routeMessage(location: Location): string | undefined {
  if (typeof location.state !== "object" || location.state === null) {
    return undefined;
  }

  const { message } = location.state as RouteMessageState;
  return typeof message === "string" ? message : undefined;
}

function decisionResult(
  location: Location,
): Partial<DecisionResult> | undefined {
  if (typeof location.state !== "object" || location.state === null) {
    return undefined;
  }

  const { landingFrame } = location.state as DecisionRouteState;
  return typeof landingFrame === "number" || typeof landingFrame === "string"
    ? { landingFrame }
    : undefined;
}

export function RestorationScreen() {
  return (
    <section className="route-placeholder" aria-labelledby="restoring-title">
      <p className="route-placeholder__eyebrow">FLY EYE</p>
      <h1 id="restoring-title">Restoring session…</h1>
      <p role="status">Preparing your operator workspace.</p>
    </section>
  );
}

export interface PlaceholderProps {
  description: string;
  eyebrow: string;
  title: string;
}

export function Placeholder({ description, eyebrow, title }: PlaceholderProps) {
  const location = useLocation();
  const message = routeMessage(location);

  return (
    <section className="route-placeholder" aria-labelledby="route-title">
      <p className="route-placeholder__eyebrow">{eyebrow}</p>
      <h1 id="route-title">{title}</h1>
      <p>{description}</p>
      {message && (
        <p className="route-placeholder__notice" role="status">
          {message}
        </p>
      )}
    </section>
  );
}

export function MatchDashboardPlaceholder() {
  const session = useSession();
  const location = useLocation();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const identity = session.identity;

  const signOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    setError(null);
    try {
      await session.signOut();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to sign out.");
      setIsSigningOut(false);
    }
  };

  return (
    <section className="route-placeholder" aria-labelledby="dashboard-title">
      <p className="route-placeholder__eyebrow">Match operations</p>
      <h1 id="dashboard-title">Match dashboard</h1>
      <p>The full operator dashboard arrives in Batch 4.</p>
      {routeMessage(location) && (
        <p className="route-placeholder__notice" role="status">
          {routeMessage(location)}
        </p>
      )}
      {identity && (
        <div className="route-placeholder__session">
          <span>
            {identity.session.mode === "demo"
              ? "Demo session"
              : "Local prototype profile"}
          </span>
          <strong>{identity.profile.displayName}</strong>
          <small>{identity.profile.email}</small>
        </div>
      )}
      {error && (
        <p className="route-placeholder__notice" role="alert">
          {error}
        </p>
      )}
      <button
        className="route-placeholder__action"
        type="button"
        disabled={isSigningOut}
        onClick={() => void signOut()}
      >
        {isSigningOut ? "Signing out…" : "Sign out"}
      </button>
    </section>
  );
}

export function RootRoute() {
  const access = useRouteAccess();

  if (access.status === "restoring") return <RestorationScreen />;

  return (
    <Navigate
      replace
      to={
        access.status === "authenticated"
          ? routePaths.matches
          : routePaths.welcome
      }
    />
  );
}

export function PublicOnlyRoute() {
  const access = useRouteAccess();

  if (access.status === "restoring") return <RestorationScreen />;
  if (access.status === "authenticated") {
    return <Navigate replace to={routePaths.matches} />;
  }

  return <Outlet />;
}

export function RequireSession() {
  const access = useRouteAccess();
  const location = useLocation();

  if (access.status === "restoring") return <RestorationScreen />;
  if (access.status === "anonymous") {
    return (
      <Navigate
        replace
        state={{
          from: `${location.pathname}${location.search}`,
          message: "Sign in or continue as demo to open that workspace.",
        }}
        to={routePaths.welcome}
      />
    );
  }

  return <Outlet />;
}

function useMatchId(): string {
  const { matchId } = useParams();
  return matchId ?? "";
}

export function LiveRoute() {
  const matchId = useMatchId();
  const navigate = useNavigate();

  return <LiveMonitor onReview={() => navigate(matchRoutes.review(matchId))} />;
}

export function ReviewRoute() {
  const matchId = useMatchId();
  const navigate = useNavigate();

  const openDecision = (decision: ClipDecision) => {
    navigate(matchRoutes.decision(matchId), {
      state: { landingFrame: decision.landingFrame },
    });
  };

  return (
    <ClipReview
      onBack={() => navigate(matchRoutes.live(matchId))}
      onDecision={openDecision}
    />
  );
}

export function DecisionRoute() {
  const matchId = useMatchId();
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <DecisionScreen
      result={decisionResult(location)}
      onRunAgain={() => navigate(matchRoutes.review(matchId))}
      onBackToLive={() => navigate(matchRoutes.live(matchId))}
    />
  );
}

export function UnknownRoute() {
  const access = useRouteAccess();

  if (access.status === "restoring") return <RestorationScreen />;

  return (
    <Navigate
      replace
      state={{ message: "That page was not found. You have been redirected." }}
      to={
        access.status === "authenticated"
          ? routePaths.matches
          : routePaths.welcome
      }
    />
  );
}
