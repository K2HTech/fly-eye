import type {
  CalibrationResult,
  CapturedCalibrationFrame,
} from "../../services";
import { calibrationSafety } from "./safety";

interface CalibrationReviewProps {
  readonly frame: CapturedCalibrationFrame;
  readonly result: CalibrationResult;
  onRedo(): void;
}

export function CalibrationReview({
  frame,
  result,
  onRedo,
}: CalibrationReviewProps) {
  const safety = calibrationSafety(result);
  return (
    <section className="calibration__review" aria-labelledby="review-title">
      <div>
        <p className="calibration__eyebrow">STEP 3 OF 3</p>
        <h2 id="review-title">Review court geometry</h2>
      </div>
      <div className="calibration__review-grid">
        <div className="calibration__wireframe">
          <img
            src={frame.previewDataUrl}
            alt="Captured frame with solved court geometry"
          />
          <svg
            viewBox={`0 0 ${frame.width} ${frame.height}`}
            aria-hidden="true"
          >
            <polygon
              points={result.courtOutlineImage
                .map((point) => `${point.x},${point.y}`)
                .join(" ")}
            />
            {Object.entries(result.wireframeImage).map(
              ([name, [start, end]]) => (
                <line
                  key={name}
                  x1={start.x}
                  y1={start.y}
                  x2={end.x}
                  y2={end.y}
                />
              ),
            )}
          </svg>
        </div>
        <aside
          className={`calibration__result calibration__result--${result.quality}`}
        >
          <strong>
            {result.quality === "good"
              ? "Ready"
              : result.quality === "acceptable"
                ? "Usable, reduced accuracy"
                : "Line calls will fail"}
          </strong>
          <p>
            Wireframe coordinates are displayed directly over the frame used for
            seeding.
          </p>
          {safety.blocksCamera ? (
            <div role="alert">
              <h3>This camera is blocked</h3>
              <ul>
                {safety.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
              <p>
                Re-place markers if the wireframe misses paint; recapture only
                if the camera moved, the frame is unclear, or refinement did not
                converge.
              </p>
            </div>
          ) : (
            <p role="status">
              This camera can proceed to rig-level readiness checks.
            </p>
          )}
          {safety.warnings.length > 0 && (
            <ul>
              {safety.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          )}
          <dl>
            <dt>Usable frames</dt>
            <dd>{result.framesUsed}</dd>
            <dt>Mean reprojection error</dt>
            <dd>{result.reprojectionErrorCm.toFixed(2)} cm</dd>
            {Object.entries(result.lineErrorsCm).map(([line, error]) => (
              <>
                <dt key={`${line}-label`}>{line}</dt>
                <dd key={`${line}-value`}>{error.toFixed(2)} cm</dd>
              </>
            ))}
          </dl>
          <button type="button" onClick={onRedo}>
            Adjust markers and solve again
          </button>
        </aside>
      </div>
    </section>
  );
}
