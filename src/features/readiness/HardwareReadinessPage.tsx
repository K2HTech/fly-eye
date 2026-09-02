import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { useMatches } from "../../app/matchContext";
import { useCameraSessions } from "../../app/cameraContext";
import { matchRoutes, routePaths } from "../../app/paths";
import { useSession } from "../../app/sessionContext";
import { useAppServices } from "../../app/servicesContext";
import {
  isHardwareReady,
  type CalibrationProfile,
  type CameraReadiness,
  type CameraStatus,
  type HardwareReadiness,
  type MatchRecord,
} from "../../domain";
import type {
  CameraCalibration,
  CameraRecord,
  CameraRole,
  PreparedCameraPair,
} from "../../services";
import type { CameraConnectionState, PairingSession } from "../cameras";
import {
  CalibrationCapturePanel,
  isUsableCalibration,
  type CapturedCalibrationFrame,
  type PreparedCalibrationCapture,
} from "../calibration";
import { CameraPairingDialog } from "./CameraPairingDialog";
import "./hardware-readiness.css";

const knownGoodCalibrationProfile: CalibrationProfile = {
  id: "demo-known-good-court-profile",
  name: "Known-good badminton court profile",
  simulated: true,
};

type CameraKey = "cameraA" | "cameraB";
type LoadingState = "loading" | "ready" | "not-found" | "error";
type CalibrationMap = Record<CameraRole, CameraCalibration | null>;
type CalibrationReferenceMap = Record<
  CameraRole,
  CapturedCalibrationFrame | null
>;

const statusLabels: Record<CameraStatus, string> = {
  disconnected: "Disconnected",
  connecting: "Checking connection",
  ready: "Ready",
  error: "Check failed",
};

const statusDescriptions: Record<CameraStatus, string> = {
  disconnected: "No camera connection has been started.",
  connecting: "The connection is waiting for its health check.",
  ready: "Connection, frame timing, and health checks passed.",
  error: "The camera reported a recoverable connection error.",
};

function nextCameraStatus(status: CameraStatus): CameraStatus {
  switch (status) {
    case "disconnected":
    case "error":
      return "connecting";
    case "connecting":
      return "ready";
    case "ready":
      return "disconnected";
  }
}

function cameraActionLabel(status: CameraStatus): string {
  switch (status) {
    case "disconnected":
      return "Connect camera";
    case "connecting":
      return "Complete health check";
    case "ready":
      return "Reset camera";
    case "error":
      return "Retry check";
  }
}

function missingRequirements(readiness: HardwareReadiness): string[] {
  const missing: string[] = [];
  if (readiness.cameraA.status !== "ready")
    missing.push("Camera A health check");
  if (readiness.cameraB.status !== "ready")
    missing.push("Camera B health check");
  if (!readiness.calibrationProfile) missing.push("Calibration profile");
  return missing;
}

export function HardwareReadinessPage() {
  const { matchId = "" } = useParams();
  return <HardwareReadinessWorkspace key={matchId} matchId={matchId} />;
}

function HardwareReadinessWorkspace({ matchId }: { matchId: string }) {
  const navigate = useNavigate();
  const services = useAppServices();
  const session = useSession();
  const matches = useMatches();
  const cameraSessions = useCameraSessions();
  const [loadingState, setLoadingState] = useState<LoadingState>("loading");
  const [match, setMatch] = useState<MatchRecord | null>(null);
  const [readiness, setReadiness] = useState<HardwareReadiness | null>(null);
  const [cameraPair, setCameraPair] = useState<PreparedCameraPair | null>(null);
  const [calibrations, setCalibrations] = useState<CalibrationMap | null>(null);
  const [calibrationReferences, setCalibrationReferences] =
    useState<CalibrationReferenceMap>({
      SIDELINE_LEFT: null,
      SIDELINE_RIGHT: null,
    });
  const [calibratingCamera, setCalibratingCamera] =
    useState<CameraRecord | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pendingControl, setPendingControl] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showDemoTrialDialog, setShowDemoTrialDialog] = useState(false);
  const [pairing, setPairing] = useState<PairingSession | null>(null);
  const isBackendSession = session.identity?.session.mode === "backend";
  const hasNormalLivePreview =
    cameraSessions.streams.SIDELINE_LEFT !== null ||
    cameraSessions.streams.SIDELINE_RIGHT !== null;
  const normalCalibrationReady =
    calibrations !== null &&
    isUsableCalibration(calibrations.SIDELINE_LEFT) &&
    isUsableCalibration(calibrations.SIDELINE_RIGHT);
  const monitoringReady = isBackendSession
    ? hasNormalLivePreview && normalCalibrationReady
    : readiness !== null && isHardwareReady(readiness);

  useEffect(() => {
    let active = true;

    const isBackendSession = session.identity?.session.mode === "backend";
    const preparedCameras = isBackendSession
      ? services.cameras
        ? services.cameras.prepare(matchId)
        : Promise.reject(
            new Error(
              "Camera setup is unavailable. Check the public endpoint configuration.",
            ),
          )
      : Promise.resolve(null);

    void Promise.all([
      services.matches.get(matchId),
      services.readiness.get(matchId),
      preparedCameras,
    ])
      .then(async ([record, savedReadiness, pair]) => {
        if (!active) return;
        if (!record) {
          setLoadingState("not-found");
          return;
        }
        const results =
          isBackendSession && pair && services.calibration
            ? await Promise.all([
                services.calibration.getCurrent(pair.left.id),
                services.calibration.getCurrent(pair.right.id),
              ])
            : null;
        if (!active) return;
        setMatch(record);
        setReadiness(savedReadiness);
        setCameraPair(pair);
        setCalibrations(
          results
            ? { SIDELINE_LEFT: results[0], SIDELINE_RIGHT: results[1] }
            : null,
        );
        setLoadError(null);
        setLoadingState("ready");
      })
      .catch((error: unknown) => {
        if (!active) return;
        setLoadError(
          error instanceof Error
            ? error.message
            : "The saved match setup could not be loaded.",
        );
        setLoadingState("error");
      });

    return () => {
      active = false;
    };
  }, [
    matchId,
    services.cameras,
    services.calibration,
    services.matches,
    services.readiness,
    session.identity?.session.mode,
  ]);

  const saveCamera = async (camera: CameraKey, status: CameraStatus) => {
    if (!readiness || pendingControl) return;
    setPendingControl(camera);
    setActionError(null);
    const update: CameraReadiness = {
      status,
      simulated: true,
      message:
        status === "error" ? "Signal timeout. Retry is available." : undefined,
    };
    try {
      const saved = await services.readiness.save(matchId, {
        [camera]: update,
      });
      setReadiness(saved);
    } catch {
      setActionError("Unable to save the camera state. Please try again.");
    } finally {
      setPendingControl(null);
    }
  };

  const saveCalibration = async (profile: CalibrationProfile | null) => {
    if (!readiness || pendingControl) return;
    setPendingControl("calibration");
    setActionError(null);
    try {
      const saved = await services.readiness.save(matchId, {
        calibrationProfile: profile,
      });
      setReadiness(saved);
    } catch {
      setActionError(
        "Unable to save the calibration selection. Please try again.",
      );
    } finally {
      setPendingControl(null);
    }
  };

  const openPairing = async (camera: CameraRecord) => {
    if (pendingControl) return;
    setPendingControl(camera.id);
    setActionError(null);
    try {
      setPairing(await cameraSessions.begin(camera.role, matchId, camera));
    } catch {
      setActionError(
        "Unable to create a camera pairing code. Please try again.",
      );
    } finally {
      setPendingControl(null);
    }
  };

  const cancelPairing = async () => {
    const current = pairing;
    setPairing(null);
    if (!current) return;
    try {
      cameraSessions.disconnect(current.cameraRole);
    } catch {
      setActionError(
        "The pairing code could not be cancelled. It will expire shortly.",
      );
    }
  };

  const startMonitoring = async () => {
    if (!match || !readiness || pendingControl) return;
    if (match.status === "live") {
      if (!isBackendSession || monitoringReady) {
        navigate(matchRoutes.live(match.id));
      }
      return;
    }
    if (match.status === "completed") {
      navigate(matchRoutes.decision(match.id));
      return;
    }
    if (!monitoringReady) return;

    setPendingControl("start");
    setActionError(null);
    try {
      let current = match;
      if (current.status === "draft") {
        current = await matches.updateStatus(
          current.id,
          isBackendSession ? "live" : "ready",
        );
        setMatch(current);
      }
      if (current.status === "ready") {
        current = await matches.updateStatus(current.id, "live");
        setMatch(current);
      }
      if (
        session.identity?.session.mode === "demo" &&
        !session.identity.session.demoTrialStartedAt
      ) {
        await session.startDemoTrial();
      }
      navigate(matchRoutes.live(current.id), { replace: true });
    } catch {
      setActionError(
        "Monitoring could not start. Recheck the available camera preview and try again.",
      );
    } finally {
      setPendingControl(null);
    }
  };

  const openTestPreview = () => {
    if (!match || !hasNormalLivePreview) return;
    navigate(matchRoutes.live(match.id, "test"));
  };

  const submitCalibration = async (capture: PreparedCalibrationCapture) => {
    const camera = calibratingCamera;
    if (!camera || !services.calibration || pendingControl) return;
    const reference = capture.frames[capture.referenceFrameIndex];
    if (
      capture.frames.some(
        (frame) =>
          frame.width !== camera.resolution.width ||
          frame.height !== camera.resolution.height,
      )
    ) {
      setActionError(
        "Captured images do not match this camera's registered resolution. Capture them again from the current preview.",
      );
      return;
    }
    setPendingControl(`calibration-${camera.role}`);
    setActionError(null);
    try {
      const calibration = await services.calibration.submit({
        cameraId: camera.id,
        frames: capture.frames,
        seedPoints: capture.seedPoints,
        frameSize: camera.resolution,
      });
      setCalibrations((current) => ({
        SIDELINE_LEFT: current?.SIDELINE_LEFT ?? null,
        SIDELINE_RIGHT: current?.SIDELINE_RIGHT ?? null,
        [camera.role]: calibration,
      }));
      setCalibrationReferences((current) => ({
        ...current,
        [camera.role]: reference,
      }));
      setCalibratingCamera(null);
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Calibration could not be completed. Please try again.",
      );
    } finally {
      setPendingControl(null);
    }
  };

  const requestMonitoringStart = () => {
    if (
      session.identity?.session.mode === "demo" &&
      !session.identity.session.demoTrialStartedAt &&
      match?.status !== "live" &&
      match?.status !== "completed"
    ) {
      setShowDemoTrialDialog(true);
      return;
    }
    void startMonitoring();
  };

  if (loadingState === "loading") {
    return (
      <ReadinessMessage title="Loading readiness" status>
        Restoring the saved hardware state…
      </ReadinessMessage>
    );
  }

  if (loadingState === "not-found") {
    return (
      <ReadinessMessage title="Match not found">
        The requested match is unavailable on this device.
        <button type="button" onClick={() => navigate(routePaths.matches)}>
          Return to match dashboard
        </button>
      </ReadinessMessage>
    );
  }

  if (loadingState === "error" || !match || !readiness) {
    return (
      <ReadinessMessage title="Readiness unavailable">
        {loadError ?? "The saved match setup could not be loaded."}
        <button type="button" onClick={() => navigate(routePaths.matches)}>
          Return to match dashboard
        </button>
      </ReadinessMessage>
    );
  }

  const leftCameraPreview = cameraSessions.streams.SIDELINE_LEFT !== null;
  const rightCameraPreview = cameraSessions.streams.SIDELINE_RIGHT !== null;
  const calibrationStream = calibratingCamera
    ? cameraSessions.streams[calibratingCamera.role]
    : null;
  const currentReadiness: HardwareReadiness = isBackendSession
    ? {
        ...readiness,
        cameraA: {
          status: cameraStatus(
            cameraSessions.sessions.SIDELINE_LEFT.state,
            leftCameraPreview,
          ),
          simulated: false,
          message: cameraMessage(
            cameraSessions.sessions.SIDELINE_LEFT.state,
            leftCameraPreview,
          ),
        },
        cameraB: {
          status: cameraStatus(
            cameraSessions.sessions.SIDELINE_RIGHT.state,
            rightCameraPreview,
          ),
          simulated: false,
          message: cameraMessage(
            cameraSessions.sessions.SIDELINE_RIGHT.state,
            rightCameraPreview,
          ),
        },
      }
    : readiness;
  const ready = isBackendSession
    ? hasNormalLivePreview && normalCalibrationReady
    : monitoringReady;
  const missing = isBackendSession
    ? [
        ...(hasNormalLivePreview ? [] : ["One decoded live camera preview"]),
        ...(isUsableCalibration(calibrations?.SIDELINE_LEFT)
          ? []
          : ["Left camera calibration"]),
        ...(isUsableCalibration(calibrations?.SIDELINE_RIGHT)
          ? []
          : ["Right camera calibration"]),
      ]
    : missingRequirements(currentReadiness);
  const isBusy = pendingControl !== null;
  const isLive = match.status === "live";
  const isCompleted = match.status === "completed";
  const workflowResolved =
    isCompleted ||
    (isLive &&
      (!isBackendSession || (hasNormalLivePreview && normalCalibrationReady)));
  const resumingLiveWithoutPreview = isLive && !workflowResolved;
  const gatePositive = ready || workflowResolved;
  const gateEyebrow = isCompleted
    ? "Match complete"
    : resumingLiveWithoutPreview
      ? "Camera connection required"
      : isLive
        ? "Monitoring active"
        : ready
          ? "All checks passed"
          : "Setup incomplete";
  const gateTitle = isCompleted
    ? "Review completed decision"
    : resumingLiveWithoutPreview
      ? "Reconnect a camera"
      : isLive
        ? "Live monitor is active"
        : ready
          ? "Ready to monitor"
          : "Complete hardware checks";
  const primaryLabel = isCompleted
    ? "View decision"
    : isLive && workflowResolved
      ? "Return to live monitor"
      : isLive
        ? "Pair a camera to resume"
        : "Start monitoring";

  return (
    <section className="readiness" aria-labelledby="readiness-title">
      <header className="readiness__header">
        <strong className="readiness__context">System setup</strong>
        <div className="readiness__match-summary">
          <span>{match.eventName}</span>
          <strong>
            {match.sideA.displayName} <b>vs</b> {match.sideB.displayName}
          </strong>
          <small>{match.court}</small>
        </div>
      </header>

      <div className="readiness__content">
        <div className="readiness__heading">
          <div>
            <p className="readiness__eyebrow">System setup</p>
            <h1 id="readiness-title">Hardware readiness</h1>
            <p>
              Verify each camera path, then calibrate both court views before
              starting official monitoring.
            </p>
          </div>
        </div>

        {actionError && (
          <p className="readiness__error" role="alert">
            {actionError}
          </p>
        )}

        <div className="readiness__grid">
          <CameraCard
            camera="cameraA"
            label={cameraPair ? "Left camera" : "Camera A"}
            location={cameraPair ? "Sideline left" : "Sideline"}
            cameraRecord={cameraPair?.left}
            onPair={
              cameraPair?.left
                ? () => void openPairing(cameraPair.left)
                : undefined
            }
            pending={pendingControl === "cameraA"}
            readiness={currentReadiness.cameraA}
            disabled={isBusy}
            showSimulatorControls={!isBackendSession}
            onChange={(status) => void saveCamera("cameraA", status)}
          />
          <CameraCard
            camera="cameraB"
            label={cameraPair ? "Right camera" : "Camera B"}
            location={cameraPair ? "Sideline right" : "Baseline"}
            cameraRecord={cameraPair?.right}
            onPair={
              cameraPair?.right
                ? () => void openPairing(cameraPair.right)
                : undefined
            }
            pending={pendingControl === "cameraB"}
            readiness={currentReadiness.cameraB}
            disabled={isBusy}
            showSimulatorControls={!isBackendSession}
            onChange={(status) => void saveCamera("cameraB", status)}
          />
          {isBackendSession && cameraPair && calibrations ? (
            <NormalCalibrationCard
              calibrations={calibrations}
              cameraPair={cameraPair}
              references={calibrationReferences}
              disabled={isBusy}
              livePreviews={{
                SIDELINE_LEFT: leftCameraPreview,
                SIDELINE_RIGHT: rightCameraPreview,
              }}
              onCalibrate={setCalibratingCamera}
            />
          ) : (
            <CalibrationCard
              profile={readiness.calibrationProfile}
              pending={pendingControl === "calibration"}
              disabled={isBusy}
              onChange={(profile) => void saveCalibration(profile)}
            />
          )}
        </div>

        <section
          className={`readiness__gate${gatePositive ? " readiness__gate--ready" : ""}`}
          aria-labelledby="readiness-gate-title"
        >
          <div className="readiness__gate-status" aria-hidden="true">
            {gatePositive ? "✓" : "!"}
          </div>
          <div>
            <p className="readiness__eyebrow">{gateEyebrow}</p>
            <h2 id="readiness-gate-title">{gateTitle}</h2>
            {isCompleted ? (
              <p>This match is closed. Open its recorded decision evidence.</p>
            ) : isLive && workflowResolved ? (
              <p>This match is already running in the live monitor.</p>
            ) : isLive ? (
              <p>Pair a phone again before returning to live monitoring.</p>
            ) : ready ? (
              <p>
                {isBackendSession
                  ? "At least one live camera preview is ready for this POC."
                  : "Both cameras and the calibration profile are saved."}
              </p>
            ) : (
              <p>
                Remaining: <span>{missing.join(" · ")}</span>
              </p>
            )}
          </div>
          <button
            type="button"
            disabled={(!ready && !workflowResolved) || isBusy}
            aria-describedby={
              !ready && !workflowResolved ? "readiness-start-help" : undefined
            }
            onClick={requestMonitoringStart}
          >
            {pendingControl === "start" ? "Starting monitor…" : primaryLabel}
            {pendingControl !== "start" && <span aria-hidden="true">→</span>}
          </button>
          {isBackendSession && !isLive && !isCompleted && (
            <button
              type="button"
              className="readiness__test-preview"
              disabled={!hasNormalLivePreview || isBusy}
              onClick={openTestPreview}
            >
              Test camera preview
            </button>
          )}
          {!ready && !workflowResolved && (
            <span id="readiness-start-help" className="readiness__sr-only">
              Pair a phone and wait for a decoded live preview before returning
              to monitoring.
            </span>
          )}
        </section>
      </div>

      {showDemoTrialDialog && (
        <div className="readiness__dialog-backdrop" role="presentation">
          <section
            className="readiness__dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="demo-trial-title"
            aria-describedby="demo-trial-description"
            onKeyDown={(event) => {
              if (event.key === "Escape") setShowDemoTrialDialog(false);
            }}
          >
            <p className="readiness__eyebrow">Demo trial</p>
            <h2 id="demo-trial-title">Start your 15-minute live demo?</h2>
            <p id="demo-trial-description">
              Your trial timer begins when monitoring starts. Camera setup time
              does not count toward the limit.
            </p>
            <div className="readiness__dialog-actions">
              <button
                type="button"
                autoFocus
                onClick={() => setShowDemoTrialDialog(false)}
              >
                Keep configuring
              </button>
              <button
                type="button"
                className="readiness__dialog-primary"
                onClick={() => {
                  setShowDemoTrialDialog(false);
                  void startMonitoring();
                }}
              >
                Start 15-minute demo
              </button>
            </div>
          </section>
        </div>
      )}
      {pairing && (
        <CameraPairingDialog
          pairing={pairing}
          stream={cameraSessions.streams[pairing.cameraRole]}
          onCancel={() => void cancelPairing()}
          onPreviewReady={() => setPairing(null)}
          onRegenerate={() => {
            const camera =
              cameraPair?.left.id === pairing.cameraId
                ? cameraPair.left
                : cameraPair?.right;
            void cancelPairing().then(() => camera && openPairing(camera));
          }}
        />
      )}
      {calibratingCamera && calibrationStream && (
        <div className="readiness__dialog-backdrop">
          <section
            className="readiness__calibration-dialog"
            role="dialog"
            aria-modal="true"
            aria-label={`Calibrate ${calibratingCamera.name}`}
          >
            <CalibrationCapturePanel
              cameraName={calibratingCamera.name}
              stream={calibrationStream}
              onCancel={() => setCalibratingCamera(null)}
              onPrepared={(capture) => void submitCalibration(capture)}
            />
          </section>
        </div>
      )}
    </section>
  );
}

interface CameraCardProps {
  camera: CameraKey;
  cameraRecord?: CameraRecord;
  disabled: boolean;
  label: string;
  location: string;
  pending: boolean;
  readiness: CameraReadiness;
  showSimulatorControls: boolean;
  onChange: (status: CameraStatus) => void;
  onPair?: () => void;
}

function CameraCard({
  camera,
  cameraRecord,
  disabled,
  label,
  location,
  pending,
  readiness,
  showSimulatorControls,
  onChange,
  onPair,
}: CameraCardProps) {
  return (
    <article
      className={`readiness__device readiness__device--${readiness.status}`}
      aria-labelledby={`${camera}-title`}
    >
      <header>
        <div>
          <span>Camera input</span>
          <h2 id={`${camera}-title`}>{label}</h2>
        </div>
        <span className="readiness__device-status" aria-live="polite">
          <i aria-hidden="true" /> {statusLabels[readiness.status]}
        </span>
      </header>
      <dl>
        <div>
          <dt>Position</dt>
          <dd>{location}</dd>
        </div>
        <div>
          <dt>Target stream</dt>
          <dd>
            {cameraRecord
              ? `${cameraRecord.resolution.width}×${cameraRecord.resolution.height} · ${cameraRecord.targetFps} fps`
              : "1280×720 · 120 fps"}
          </dd>
        </div>
      </dl>
      <p>
        {readiness.message ?? statusDescriptions[readiness.status]}
        {cameraRecord &&
          !showSimulatorControls &&
          " Pair this phone and keep its live preview connected before monitoring can start."}
      </p>
      <div className="readiness__device-actions">
        {onPair && (
          <button type="button" disabled={disabled} onClick={onPair}>
            Pair phone
          </button>
        )}
        {showSimulatorControls && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange(nextCameraStatus(readiness.status))}
          >
            {pending ? "Saving state…" : cameraActionLabel(readiness.status)}
          </button>
        )}
      </div>
    </article>
  );
}

function cameraMessage(
  state: CameraConnectionState,
  hasStream: boolean,
): string {
  if (hasStream) return "Live camera preview is connected.";
  if (state === "awaiting-scan")
    return "Waiting for the phone to scan the pairing code.";
  if (state === "negotiating")
    return "Phone connected. Establishing the live preview…";
  if (state === "reconnecting")
    return "Live preview was lost. Pair this phone again.";
  if (state === "error")
    return "Camera connection failed. Generate a new pairing code.";
  return "Pair a phone to verify its live preview.";
}

function cameraStatus(
  state: CameraConnectionState,
  hasStream: boolean,
): CameraStatus {
  if (hasStream) return "ready";
  if (state === "error") return "error";
  if (state === "disconnected") return "disconnected";
  return "connecting";
}

interface CalibrationCardProps {
  disabled: boolean;
  pending: boolean;
  profile: CalibrationProfile | null;
  onChange: (profile: CalibrationProfile | null) => void;
}

interface NormalCalibrationCardProps {
  readonly calibrations: CalibrationMap;
  readonly cameraPair: PreparedCameraPair;
  readonly disabled: boolean;
  readonly livePreviews: Readonly<Record<CameraRole, boolean>>;
  readonly references: CalibrationReferenceMap;
  readonly onCalibrate: (camera: CameraRecord) => void;
}

function CalibrationReference({
  calibration,
  frame,
}: {
  calibration: CameraCalibration;
  frame: CapturedCalibrationFrame;
}) {
  const url = useMemo(() => URL.createObjectURL(frame.blob), [frame.blob]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  const pointList = (points: readonly { x: number; y: number }[]) =>
    points.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <div className="readiness__calibration-overlay">
      <img alt="Calibration reference image" src={url} />
      <svg
        aria-label="Returned court calibration overlay"
        role="img"
        viewBox={`0 0 ${frame.width} ${frame.height}`}
      >
        <polygon points={pointList(calibration.courtOutlineImage)} />
        {Object.entries(calibration.wireframeImage).map(([name, points]) => (
          <polyline key={name} points={pointList(points)} />
        ))}
      </svg>
    </div>
  );
}

function NormalCalibrationCard({
  calibrations,
  cameraPair,
  disabled,
  livePreviews,
  references,
  onCalibrate,
}: NormalCalibrationCardProps) {
  const cards: readonly [CameraRole, CameraRecord][] = [
    ["SIDELINE_LEFT", cameraPair.left],
    ["SIDELINE_RIGHT", cameraPair.right],
  ];

  return (
    <article
      className="readiness__calibration readiness__calibration--normal"
      aria-labelledby="calibration-title"
    >
      <header>
        <div>
          <span>Court geometry</span>
          <h2 id="calibration-title">Camera calibration</h2>
        </div>
        <span
          className={
            isUsableCalibration(calibrations.SIDELINE_LEFT) &&
            isUsableCalibration(calibrations.SIDELINE_RIGHT)
              ? "is-selected"
              : ""
          }
        >
          <i aria-hidden="true" />
          {isUsableCalibration(calibrations.SIDELINE_LEFT) &&
          isUsableCalibration(calibrations.SIDELINE_RIGHT)
            ? "Ready"
            : "Action required"}
        </span>
      </header>
      <p>
        Calibrate both fixed camera views with good or acceptable quality before
        official monitoring can start.
      </p>
      <div className="readiness__calibration-cameras">
        {cards.map(([role, camera]) => {
          const calibration = calibrations[role];
          const usable = isUsableCalibration(calibration);
          const quality = calibration
            ? calibration.quality[0].toUpperCase() +
              calibration.quality.slice(1)
            : "Not calibrated";
          return (
            <section key={role} aria-labelledby={`calibration-${role}`}>
              <div>
                <h3 id={`calibration-${role}`}>{camera.name}</h3>
                <span className={usable ? "is-selected" : ""}>{quality}</span>
              </div>
              <p>
                {!livePreviews[role]
                  ? "Pair this phone and wait for its live preview before capturing calibration images."
                  : calibration?.quality === "poor"
                    ? "This result is saved, but reposition or re-mark the court before recalibrating."
                    : usable
                      ? "Current calibration is usable for official monitoring."
                      : "Capture fixed-camera images and mark the outer court corners."}
              </p>
              {calibration && references[role] && (
                <CalibrationReference
                  calibration={calibration}
                  frame={references[role]}
                />
              )}
              <button
                type="button"
                disabled={disabled || !livePreviews[role]}
                onClick={() => onCalibrate(camera)}
              >
                {calibration ? "Recalibrate camera" : "Calibrate camera"}
              </button>
            </section>
          );
        })}
      </div>
    </article>
  );
}

function CalibrationCard({
  disabled,
  pending,
  profile,
  onChange,
}: CalibrationCardProps) {
  return (
    <article
      className="readiness__calibration"
      aria-labelledby="calibration-title"
    >
      <header>
        <div>
          <span>Court geometry</span>
          <h2 id="calibration-title">Calibration profile</h2>
        </div>
        <span className={profile ? "is-selected" : ""}>
          <i aria-hidden="true" /> {profile ? "Selected" : "Required"}
        </span>
      </header>
      <label htmlFor="calibration-profile">Court profile</label>
      <select
        id="calibration-profile"
        value={profile?.id ?? ""}
        disabled={disabled}
        onChange={(event) =>
          onChange(event.target.value ? knownGoodCalibrationProfile : null)
        }
      >
        <option value="">Select a calibration profile</option>
        <option value={knownGoodCalibrationProfile.id}>
          {knownGoodCalibrationProfile.name}
        </option>
      </select>
      <p>
        A known-good profile maps the camera views to the badminton court
        geometry.
      </p>
      <small aria-live="polite">
        {pending
          ? "Saving profile…"
          : profile
            ? `${profile.name} is active.`
            : "No profile selected."}
      </small>
    </article>
  );
}

interface ReadinessMessageProps {
  children: ReactNode;
  status?: boolean;
  title: string;
}

function ReadinessMessage({
  children,
  status = false,
  title,
}: ReadinessMessageProps) {
  return (
    <section
      className="readiness-message"
      aria-labelledby="readiness-message-title"
    >
      <p>FLY EYE</p>
      <h1 id="readiness-message-title">{title}</h1>
      <div role={status ? "status" : undefined}>{children}</div>
    </section>
  );
}
