import {
  Navigate,
  Outlet,
  useLocation,
  useNavigate,
  useParams,
  type Location,
} from "react-router-dom";
import { useEffect, useState } from "react";

import { DecisionScreen, type DecisionResult } from "../features/decision";
import { LiveMonitor, type CameraFeed } from "../features/live";
import { simulatedCameras } from "../features/live/live-monitor.data";
import { useCameraSessions } from "./cameraContext";
import { ClipReview, type ClipDecision } from "../features/review";
import { matchRoutes, routePaths } from "./paths";
import { useRouteAccess } from "./routeAccess";
import { useSession } from "./sessionContext";
import { useAppServices } from "./servicesContext";
import { AuthenticatedShell } from "./AuthenticatedShell";
import { canOpenNormalMonitoring } from "../features/readiness/monitoringPolicy";
import { calibrationSafety } from "../features/calibration/safety";
import { sha256Hex } from "../infrastructure/browser/calibration/sha256";

interface RouteMessageState {
  message?: string;
}

interface DecisionRouteState {
  landingFrame?: number | string;
  analysis?: import("../services").RallyAnalysis;
}

interface ReviewRouteState {
  analysisId?: string;
  media?: readonly { role: import("../services").CameraRole; url: string }[];
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

function decisionAnalysis(
  location: Location,
): import("../services").RallyAnalysis | undefined {
  if (typeof location.state !== "object" || location.state === null) {
    return undefined;
  }
  const { analysis } = location.state as DecisionRouteState;
  return analysis;
}

function reviewState(location: Location): ReviewRouteState {
  if (typeof location.state !== "object" || location.state === null) return {};
  return location.state as ReviewRouteState;
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

export function LiveRoute() {
  const matchId = useMatchId();
  const navigate = useNavigate();
  const session = useSession();
  const services = useAppServices();
  const { sessions, streams, cameraRecords } = useCameraSessions();
  const isBackendSession = session.identity?.session.mode === "backend";
  const developmentMode = import.meta.env.MODE !== "production";
  const [calibrationGate, setCalibrationGate] = useState<
    "checking" | "eligible" | "blocked"
  >(() => (isBackendSession && !developmentMode ? "checking" : "eligible"));
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewMessage, setReviewMessage] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    if (
      !isBackendSession ||
      developmentMode ||
      !services.cameras ||
      !services.calibration
    )
      return undefined;
    void services.cameras
      .list(matchId)
      .then((cameraRecords) =>
        Promise.all(
          cameraRecords.map((camera) =>
            services.calibration!.getCurrent(camera.id),
          ),
        ).then((results) => ({ cameraRecords, results })),
      )
      .then(({ cameraRecords, results }) => {
        if (!active) return;
        setCalibrationGate(
          canOpenNormalMonitoring({
            cameraRecords,
            calibrations: results,
            hasLeftPreview: true,
            hasRightPreview: true,
            mode: "production",
          })
            ? "eligible"
            : "blocked",
        );
      })
      .catch(() => active && setCalibrationGate("blocked"));
    return () => {
      active = false;
    };
  }, [
    developmentMode,
    isBackendSession,
    matchId,
    services.calibration,
    services.cameras,
  ]);
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
  const hasBothNormalLivePreviews =
    streams.SIDELINE_LEFT !== null && streams.SIDELINE_RIGHT !== null;

  const requestReview = async () => {
    if (!isBackendSession) {
      navigate(matchRoutes.review(matchId));
      return;
    }
    if (
      !services.rallyCapture ||
      !services.clips ||
      !services.analyses ||
      !services.calibration
    ) {
      setReviewMessage("Rally analysis is unavailable in this configuration.");
      return;
    }
    const roles = (Object.keys(streams) as (keyof typeof streams)[]).filter(
      (role) => streams[role] !== null,
    );
    const records = roles.map((role) => cameraRecords[role]);
    if (records.some((record) => record === null)) {
      setReviewMessage(
        "Pair the active camera again before requesting review.",
      );
      return;
    }
    setReviewBusy(true);
    setReviewMessage(null);
    try {
      const activeRecords = records.filter(
        (record): record is NonNullable<typeof record> => record !== null,
      );
      const calibrations = await Promise.all(
        activeRecords.map((record) =>
          services.calibration!.getCurrent(record.id),
        ),
      );
      if (
        calibrations.some(
          (calibration) =>
            !calibration ||
            !calibration.isCurrent ||
            calibrationSafety(calibration).blocksCamera,
        )
      )
        throw new Error(
          "Calibrate every active camera before submitting a rally for analysis.",
        );
      const snapshots = await services.rallyCapture.snapshot(roles);
      const assets = await Promise.all(
        snapshots.map(async (snapshot) => ({
          cameraId: cameraRecords[snapshot.role]!.id,
          contentType: snapshot.contentType,
          codec: snapshot.codec,
          fps: snapshot.fps,
          frameCount: snapshot.frameCount,
          startTsUs: snapshot.startTsUs,
          endTsUs: snapshot.endTsUs,
          sizeBytes: snapshot.bytes.size,
          checksumSha256: sha256Hex(
            new Uint8Array(await snapshot.bytes.arrayBuffer()),
          ),
        })),
      );
      const durationMs = Math.min(
        ...snapshots.map((snapshot) =>
          Math.round((snapshot.endTsUs - snapshot.startTsUs) / 1_000),
        ),
      );
      const created = await services.clips.create(matchId, {
        capturedAt: new Date().toISOString(),
        durationMs,
        note: "Line-call capture",
        assets,
      });
      await Promise.all(
        created.uploads.map((target) => {
          const snapshot = snapshots.find(
            (candidate) =>
              cameraRecords[candidate.role]?.id === target.cameraId,
          );
          if (!snapshot) throw new Error("Clip asset mismatch.");
          return services.clips!.upload(target, snapshot.bytes);
        }),
      );
      await services.clips.complete(created.clip.id);
      const submitted = await services.analyses.submit(created.clip.id);
      navigate(matchRoutes.review(matchId), {
        state: {
          analysisId: submitted.analysisId,
          media: snapshots.map((snapshot) => ({
            role: snapshot.role,
            url: URL.createObjectURL(snapshot.bytes),
          })),
        },
      });
    } catch (error) {
      setReviewMessage(
        error instanceof Error
          ? error.message
          : "Unable to submit the rally for analysis. Please try again.",
      );
    } finally {
      setReviewBusy(false);
    }
  };

  if (
    isBackendSession &&
    (developmentMode ? !hasNormalLivePreview : !hasBothNormalLivePreviews)
  ) {
    return (
      <Navigate
        replace
        state={{
          message: developmentMode
            ? "Pair a camera before opening the live monitor."
            : "Pair both cameras before opening the live monitor.",
        }}
        to={matchRoutes.readiness(matchId)}
      />
    );
  }
  if (isBackendSession && !developmentMode && calibrationGate === "checking")
    return <RestorationScreen />;
  if (isBackendSession && !developmentMode && calibrationGate === "blocked") {
    return (
      <Navigate
        replace
        state={{
          message: "Calibrate both cameras before opening the live monitor.",
        }}
        to={matchRoutes.readiness(matchId)}
      />
    );
  }

  return (
    <LiveMonitor
      cameras={cameras}
      onReview={() => void requestReview()}
      reviewBusy={reviewBusy}
      reviewMessage={reviewMessage}
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
  const location = useLocation();
  const services = useAppServices();
  const { analysisId, media } = reviewState(location);
  const [analysis, setAnalysis] = useState<
    import("../services").RallyAnalysis | null
  >(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  useEffect(() => {
    if (!analysisId || !services.analyses) return undefined;
    let active = true;
    let timer: number | undefined;
    const poll = async () => {
      try {
        const result = await services.analyses!.get(analysisId);
        if (!active) return;
        setAnalysis(result);
        if (result.status === "queued" || result.status === "running") {
          timer = window.setTimeout(() => void poll(), 1_000);
        }
      } catch {
        if (active) setAnalysisError("Unable to retrieve the rally analysis.");
      }
    };
    void poll();
    return () => {
      active = false;
      if (timer) window.clearTimeout(timer);
    };
  }, [analysisId, services.analyses]);

  useEffect(
    () => () => media?.forEach((entry) => URL.revokeObjectURL(entry.url)),
    [media],
  );

  const openDecision = (decision: ClipDecision) => {
    navigate(matchRoutes.decision(matchId), {
      state: { landingFrame: decision.landingFrame },
    });
  };

  useEffect(() => {
    if (!analysis || analysis.status !== "done") return;
    navigate(matchRoutes.decision(matchId), {
      replace: true,
      state: { analysis },
    });
  }, [analysis, matchId, navigate]);

  return (
    <ClipReview
      analysis={analysisId ? analysis : undefined}
      analysisError={analysisId ? analysisError : undefined}
      media={media}
      onBack={() => navigate(matchRoutes.live(matchId))}
      onDecision={openDecision}
    />
  );
}

export function DecisionRoute() {
  const matchId = useMatchId();
  const location = useLocation();
  const navigate = useNavigate();
  const services = useAppServices();
  const analysis = decisionAnalysis(location);
  const [overlayUrl, setOverlayUrl] = useState<string | null>(null);
  const [overlayError, setOverlayError] = useState<string | null>(null);

  useEffect(() => {
    const overlayPath = analysis?.overlays.topdown;
    if (!overlayPath || !services.analyses) return undefined;
    let active = true;
    let objectUrl: string | null = null;
    void services.analyses
      .getOverlay(overlayPath)
      .then((bytes) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(bytes);
        setOverlayUrl(objectUrl);
      })
      .catch(() => {
        if (active)
          setOverlayError("Unable to retrieve the backend analysis overlay.");
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [analysis?.overlays.topdown, services.analyses]);

  return (
    <DecisionScreen
      analysis={analysis}
      overlayUrl={overlayUrl}
      overlayError={overlayError}
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
