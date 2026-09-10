import { useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";

import { matchRoutes } from "../../app/paths";
import { useSession } from "../../app/sessionContext";
import { useAppServices } from "../../app/servicesContext";

/** Route foundation for the real-camera calibration workflow. */
export function CalibrationPage() {
  const { matchId = "", cameraId = "" } = useParams();
  const navigate = useNavigate();
  const session = useSession();
  const services = useAppServices();
  const [started, setStarted] = useState(false);

  if (session.identity?.session.mode !== "backend") {
    return <Navigate replace to={matchRoutes.readiness(matchId)} />;
  }

  const available = Boolean(
    cameraId && services.calibration && services.cameras,
  );
  return (
    <main className="route-placeholder" aria-labelledby="calibration-title">
      <p className="route-placeholder__eyebrow">COURT GEOMETRY</p>
      <h1 id="calibration-title">Court calibration</h1>
      {available ? (
        <>
          <p role="status">
            {started
              ? "Preparing the captured-frame workspace."
              : "Use a stable live camera preview before starting calibration."}
          </p>
          <button type="button" onClick={() => setStarted(true)}>
            Start calibration
          </button>
        </>
      ) : (
        <p role="alert">
          Calibration is unavailable. Check the backend camera configuration and
          return to hardware readiness.
        </p>
      )}
      <button
        type="button"
        onClick={() => navigate(matchRoutes.readiness(matchId))}
      >
        Return to hardware readiness
      </button>
    </main>
  );
}
