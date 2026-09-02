import {
  Navigate,
  Outlet,
  useLocation,
  useNavigate,
  useParams,
  type Location,
} from "react-router-dom";

import { DecisionScreen, type DecisionResult } from "../features/decision";
import { isUsableCalibration } from "../features/calibration";
import { LiveMonitor, type CameraFeed } from "../features/live";
import { simulatedCameras } from "../features/live/live-monitor.data";
import { useCameraSessions } from "./cameraContext";
import { ClipReview, type ClipDecision } from "../features/review";
import { matchRoutes, routePaths } from "./paths";
import { useRouteAccess } from "./routeAccess";
import { useSession } from "./sessionContext";
import { AuthenticatedShell } from "./AuthenticatedShell";
import { useAppServices } from "./servicesContext";
import { useEffect, useState } from "react";

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
  const location = useLocation();
  const isStartingDemo =
    typeof location.state === "object" &&
    location.state !== null &&
    "startingDemo" in location.state &&
    location.state.startingDemo === true;

  if (access.status === "restoring") return <RestorationScreen />;
  if (access.status === "authenticated" && !isStartingDemo) {
    return <Navigate replace to={routePaths.matches} />;
  }

  return <Outlet />;
}

export function RequireSession() {
  const access = useRouteAccess();
  const location = useLocation();
  const session = useSession();

  if (access.status === "restoring") return <RestorationScreen />;
  if (access.status === "anonymous") {
    return <Navigate replace to={routePaths.welcome} />;
  }

  const identity = session.identity;
  if (identity?.session.mode === "demo") {
    const demoMatchId = identity.session.demoMatchId;
    const demoMatchPrefix = demoMatchId
      ? `/matches/${encodeURIComponent(demoMatchId)}/`
      : null;
    if (!demoMatchPrefix || !location.pathname.startsWith(demoMatchPrefix)) {
      return (
        <Navigate
          replace
          state={demoMatchId ? undefined : { startingDemo: true }}
          to={
            demoMatchId
              ? matchRoutes.readiness(demoMatchId)
              : routePaths.welcome
          }
        />
      );
    }
  }

  return <AuthenticatedShell />;
}

function useMatchId(): string {
  const { matchId } = useParams();
  return matchId ?? "";
}

type CalibrationGate = "loading" | "ready" | "required";

function useCalibrationGate(
  matchId: string,
  isBackendSession: boolean,
): CalibrationGate {
  const services = useAppServices();
  const [result, setResult] = useState<{
    readonly matchId: string;
    readonly gate: CalibrationGate;
  } | null>(null);

  useEffect(() => {
    if (!isBackendSession || !services.cameras || !services.calibration) return;
    const cameras = services.cameras;
    const calibration = services.calibration;
    let active = true;
    void cameras
      .list(matchId)
      .then(async (records) => {
        const left = records.find((camera) => camera.role === "SIDELINE_LEFT");
        const right = records.find(
          (camera) => camera.role === "SIDELINE_RIGHT",
        );
        if (!left || !right) return { left: null, right: null };
        return {
          left: await calibration.getCurrent(left.id),
          right: await calibration.getCurrent(right.id),
        };
      })
      .then(({ left, right }) => {
        if (active)
          setResult({
            matchId,
            gate:
              isUsableCalibration(left) && isUsableCalibration(right)
                ? "ready"
                : "required",
          });
      })
      .catch(() => {
        if (active) setResult({ matchId, gate: "required" });
      });
    return () => {
      active = false;
    };
  }, [isBackendSession, matchId, services.calibration, services.cameras]);

  if (!isBackendSession) return "ready";
  if (!services.cameras || !services.calibration) return "required";
  return result?.matchId === matchId ? result.gate : "loading";
}

export function LiveRoute() {
  const matchId = useMatchId();
  const navigate = useNavigate();
  const location = useLocation();
  const session = useSession();
  const { sessions, streams } = useCameraSessions();
  const isBackendSession = session.identity?.session.mode === "backend";
  const isTestPreview =
    isBackendSession &&
    new URLSearchParams(location.search).get("mode") === "test";
  const calibrationGate = useCalibrationGate(matchId, isBackendSession);
  const cameras = isBackendSession
    ? simulatedCameras.map((camera, index) => {
        const stream =
          index === 0 ? streams.SIDELINE_LEFT : streams.SIDELINE_RIGHT;
        const sessionState =
          index === 0
            ? sessions.SIDELINE_LEFT.state
            : sessions.SIDELINE_RIGHT.state;
        const status: CameraFeed["status"] =
          sessionState === "reconnecting"
            ? "reconnecting"
            : stream
              ? "online"
              : "offline";
        return stream
          ? { ...camera, stream, status, frameRate: 30 }
          : { ...camera, status };
      })
    : simulatedCameras;
  const hasNormalLivePreview =
    streams.SIDELINE_LEFT !== null || streams.SIDELINE_RIGHT !== null;

  if (isBackendSession && !hasNormalLivePreview) {
    return (
      <Navigate
        replace
        state={{ message: "Pair a camera before opening the live monitor." }}
        to={matchRoutes.readiness(matchId)}
      />
    );
  }

  return (
    <LiveMonitor
      cameras={cameras}
      onReview={() => navigate(matchRoutes.review(matchId))}
      mode={isTestPreview ? "test" : "official"}
      reviewEnabled={
        !isBackendSession || (!isTestPreview && calibrationGate === "ready")
      }
      reviewUnavailableMessage={
        isTestPreview
          ? "Rally review is unavailable in test camera preview. Calibrate both cameras, then start official monitoring."
          : calibrationGate === "loading"
            ? "Checking both camera calibrations before rally review is available."
            : "Calibrate both cameras with good or acceptable quality before rally review is available."
      }
      onReturnToSetup={
        isBackendSession
          ? () => navigate(matchRoutes.readiness(matchId))
          : undefined
      }
    />
  );
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
