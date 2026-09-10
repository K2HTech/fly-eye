import { useEffect, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { useMatches } from "../../app/matchContext";
import { useCameraSessions } from "../../app/cameraContext";
import { matchRoutes, routePaths } from "../../app/paths";
import { useSession } from "../../app/sessionContext";
import { useAppServices } from "../../app/servicesContext";
import { BackendRequestError } from "../../infrastructure/backend";
import {
  PairingClientError,
  SignalingTransportError,
} from "../../infrastructure/browser/cameras";
import {
  isHardwareReady,
  type CalibrationProfile,
  type CameraReadiness,
  type CameraStatus,
  type HardwareReadiness,
  type MatchRecord,
} from "../../domain";
import type { CameraRecord, PreparedCameraPair } from "../../services";
import type { CameraConnectionState, PairingSession } from "../cameras";
import { CameraPairingDialog } from "./CameraPairingDialog";
import "./hardware-readiness.css";

const knownGoodCalibrationProfile: CalibrationProfile = {
  id: "demo-known-good-court-profile",
  name: "Known-good badminton court profile",
  simulated: true,
};

type CameraKey = "cameraA" | "cameraB";
type LoadingState = "loading" | "ready" | "not-found" | "error";

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

function pairingFailureMessage(error: unknown): string {
  if (
    error instanceof BackendRequestError ||
    error instanceof PairingClientError ||
    error instanceof SignalingTransportError
  )
    return error.message;
  return "Unable to create a camera pairing code. Please try again.";
}

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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pendingControl, setPendingControl] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showDemoTrialDialog, setShowDemoTrialDialog] = useState(false);
  const [pairing, setPairing] = useState<PairingSession | null>(null);
  const isBackendSession = session.identity?.session.mode === "backend";
  const hasNormalLivePreview =
    cameraSessions.streams.SIDELINE_LEFT !== null ||
    cameraSessions.streams.SIDELINE_RIGHT !== null;
  const monitoringReady = isBackendSession
    ? hasNormalLivePreview
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
      .then(([record, savedReadiness, pair]) => {
        if (!active) return;
        if (!record) {
          setLoadingState("not-found");
          return;
        }
        setMatch(record);
        setReadiness(savedReadiness);
        setCameraPair(pair);
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
    } catch (error) {
      setActionError(pairingFailureMessage(error));
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
      if (!isBackendSession || hasNormalLivePreview) {
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
  const ready = monitoringReady;
  const missing = isBackendSession
    ? hasNormalLivePreview
      ? []
      : ["One decoded live camera preview"]
    : missingRequirements(currentReadiness);
  const isBusy = pendingControl !== null;
  const isLive = match.status === "live";
  const isCompleted = match.status === "completed";
  const workflowResolved =
    isCompleted || (isLive && (!isBackendSession || hasNormalLivePreview));
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
              Verify both camera paths and apply the known-good calibration
              before opening the live monitor.
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
            calibrateDisabled={!leftCameraPreview || !services.calibration}
            onCalibrate={
              cameraPair?.left
                ? () =>
                    navigate(
                      matchRoutes.calibration(matchId, cameraPair.left.id),
                    )
                : undefined
            }
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
            calibrateDisabled={!rightCameraPreview || !services.calibration}
            onCalibrate={
              cameraPair?.right
                ? () =>
                    navigate(
                      matchRoutes.calibration(matchId, cameraPair.right.id),
                    )
                : undefined
            }
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
          <CalibrationCard
            profile={readiness.calibrationProfile}
            pending={pendingControl === "calibration"}
            disabled={isBusy}
            onChange={(profile) => void saveCalibration(profile)}
          />
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
    </section>
  );
}

interface CameraCardProps {
  camera: CameraKey;
  cameraRecord?: CameraRecord;
  calibrateDisabled: boolean;
  disabled: boolean;
  label: string;
  location: string;
  pending: boolean;
  readiness: CameraReadiness;
  showSimulatorControls: boolean;
  onChange: (status: CameraStatus) => void;
  onCalibrate?: () => void;
  onPair?: () => void;
}

function CameraCard({
  camera,
  cameraRecord,
  calibrateDisabled,
  disabled,
  label,
  location,
  pending,
  readiness,
  showSimulatorControls,
  onChange,
  onCalibrate,
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
        {onCalibrate && (
          <button
            type="button"
            disabled={disabled || calibrateDisabled}
            onClick={onCalibrate}
          >
            Calibrate court
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
