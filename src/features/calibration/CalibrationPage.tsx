import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";

import { useCameraSessions } from "../../app/cameraContext";
import { matchRoutes } from "../../app/paths";
import { useSession } from "../../app/sessionContext";
import { useAppServices } from "../../app/servicesContext";
import type {
  CalibrationFrameUpload,
  CameraRole,
  CapturedCalibrationFrame,
} from "../../services";
import "./calibration.css";

type FrameStatus = "captured" | "uploading" | "uploaded" | "error";
interface FrameState {
  readonly captured: CapturedCalibrationFrame;
  readonly target?: CalibrationFrameUpload;
  readonly status: FrameStatus;
}

export function CalibrationPage() {
  const { matchId = "", cameraId = "" } = useParams();
  const navigate = useNavigate();
  const session = useSession();
  const services = useAppServices();
  const cameraSessions = useCameraSessions();
  const [role, setRole] = useState<CameraRole | null>(null);
  const [frames, setFrames] = useState<readonly FrameState[]>([]);
  const [loading, setLoading] = useState(() =>
    Boolean(services.cameras && cameraId),
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!services.cameras || !cameraId) {
      return undefined;
    }
    services.cameras
      .list(matchId)
      .then(
        (cameras) =>
          active &&
          setRole(
            cameras.find((camera) => camera.id === cameraId)?.role ?? null,
          ),
        () =>
          active &&
          setMessage(
            "Camera details could not be loaded. Return to readiness and try again.",
          ),
      )
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [cameraId, matchId, services.cameras]);

  const stream = role ? cameraSessions.streams[role] : null;
  const uploaded = useMemo(
    () => frames.filter((frame) => frame.status === "uploaded").length,
    [frames],
  );
  const available = Boolean(
    cameraId &&
    services.calibration &&
    services.calibrationFrames &&
    services.cameras,
  );
  const capture = async () => {
    if (!stream || !services.calibrationFrames || frames.length >= 5) return;
    setBusy(true);
    setMessage(null);
    try {
      const captured = await services.calibrationFrames.capture(stream);
      setFrames((current) => [...current, { captured, status: "captured" }]);
    } catch {
      setMessage(
        "A calibration frame could not be captured. Keep the preview stable and try again.",
      );
    } finally {
      setBusy(false);
    }
  };
  const uploadOne = async (index: number, target: CalibrationFrameUpload) => {
    const captured = frames[index]?.captured;
    if (!captured || !services.calibrationFrames) return;
    setFrames((current) =>
      current.map((frame, i) =>
        i === index ? { ...frame, target, status: "uploading" } : frame,
      ),
    );
    try {
      await services.calibrationFrames.upload(target, captured.bytes);
      setFrames((current) =>
        current.map((frame, i) =>
          i === index ? { ...frame, target, status: "uploaded" } : frame,
        ),
      );
    } catch {
      setFrames((current) =>
        current.map((frame, i) =>
          i === index ? { ...frame, target, status: "error" } : frame,
        ),
      );
    }
  };
  const upload = async () => {
    if (!services.calibration || frames.length < 3) return;
    setBusy(true);
    setMessage(null);
    try {
      const targets = await services.calibration.createFrameUploads(
        cameraId,
        frames.map((frame) => frame.captured.declaration),
      );
      if (targets.length !== frames.length) {
        throw new Error("The service did not prepare each captured frame.");
      }
      await Promise.all(
        targets.map((target, index) => uploadOne(index, target)),
      );
    } catch {
      setMessage(
        "Fly Eye could not prepare uploads. Captured frames remain available; try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  if (session.identity?.session.mode !== "backend")
    return <Navigate replace to={matchRoutes.readiness(matchId)} />;
  return (
    <main className="calibration" aria-labelledby="calibration-title">
      <header className="calibration__header">
        <div>
          <p className="calibration__eyebrow">COURT GEOMETRY</p>
          <h1 id="calibration-title">Calibrate court</h1>
          <p>
            Capture three to five stable frames from this camera before placing
            court landmarks.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate(matchRoutes.readiness(matchId))}
        >
          Return to readiness
        </button>
      </header>
      {!available || loading ? (
        <p role={loading ? "status" : "alert"} className="calibration__notice">
          {loading
            ? "Checking the selected camera."
            : "Calibration is unavailable. Check the backend camera configuration and return to hardware readiness."}
        </p>
      ) : !role || !stream ? (
        <p role="alert" className="calibration__notice">
          Connect this camera and wait for its live preview before capturing
          calibration frames.
        </p>
      ) : (
        <section
          className="calibration__capture"
          aria-labelledby="capture-title"
        >
          <div className="calibration__capture-heading">
            <div>
              <p className="calibration__eyebrow">STEP 1 OF 3</p>
              <h2 id="capture-title">Capture stable court frames</h2>
            </div>
            <span aria-live="polite">
              {frames.length} / 5 captured · {uploaded} uploaded
            </span>
          </div>
          <p>
            Keep the full doubles court visible and avoid players or shuttle
            motion. Three frames are required; up to two more can improve the
            solve.
          </p>
          {message && (
            <p role="alert" className="calibration__error">
              {message}
            </p>
          )}
          <div className="calibration__actions">
            <button
              type="button"
              onClick={capture}
              disabled={busy || frames.length >= 5}
            >
              {busy
                ? "Working…"
                : frames.length
                  ? "Capture another frame"
                  : "Capture first frame"}
            </button>
            <button
              type="button"
              onClick={upload}
              disabled={
                busy ||
                frames.length < 3 ||
                frames.some((frame) => frame.status === "uploading")
              }
            >
              Upload captured frames
            </button>
          </div>
          <div className="calibration__frames" aria-live="polite">
            {frames.map((frame, index) => (
              <article
                key={`${frame.captured.declaration.checksumSha256}-${index}`}
                className={`calibration__frame calibration__frame--${frame.status}`}
              >
                <img
                  src={frame.captured.previewDataUrl}
                  alt={`Captured calibration frame ${index + 1}`}
                />
                <div>
                  <strong>Frame {index + 1}</strong>
                  <span>
                    {frame.status === "uploaded"
                      ? "Uploaded"
                      : frame.status === "uploading"
                        ? "Uploading"
                        : frame.status === "error"
                          ? "Upload failed"
                          : "Ready to upload"}
                  </span>
                  {frame.status === "error" && (
                    <>
                      <p>
                        This frame upload failed or expired. Retry only this
                        frame.
                      </p>
                      <button
                        type="button"
                        onClick={() => void uploadOne(index, frame.target!)}
                      >
                        Retry this frame
                      </button>
                    </>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
