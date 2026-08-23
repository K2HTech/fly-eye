import { useEffect, useRef } from "react";

import "./DecisionPanel.css";

export type DecisionVerdict = "IN" | "OUT";

export interface DecisionResult {
  verdict: DecisionVerdict;
  marginMm: number;
  line: string;
  landingFrame: number | string;
  camerasUsed: string;
  reprojectionError: string;
  calibrationAge: string;
  confidence: number;
}

export interface DecisionPanelProps {
  /** A complete result may be supplied by the reconstruction service. */
  result?: Partial<DecisionResult>;
  onRunAgain?: () => void;
  onSaveClip?: () => void;
  onBackToLive?: () => void;
}

const DEFAULT_DECISION_RESULT: DecisionResult = {
  verdict: "OUT",
  marginMm: 24,
  line: "Back boundary",
  landingFrame: 1284,
  camerasUsed: "A + B",
  reprojectionError: "1.8 px",
  calibrationAge: "42 min",
  confidence: 96,
};

function Fact({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="decision-panel__fact">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export function DecisionPanel({
  result: suppliedResult,
  onRunAgain,
  onSaveClip,
  onBackToLive,
}: DecisionPanelProps) {
  const result = { ...DEFAULT_DECISION_RESULT, ...suppliedResult };
  const backToLiveRef = useRef(onBackToLive);

  useEffect(() => {
    backToLiveRef.current = onBackToLive;
  }, [onBackToLive]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.repeat) return;
      event.preventDefault();
      backToLiveRef.current?.();
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  const verdictClass = result.verdict.toLowerCase();

  return (
    <section className="decision-panel" aria-labelledby="decision-panel-title">
      <h2 id="decision-panel-title" className="decision-panel__sr-only">
        Decision result and actions
      </h2>

      <div
        className={`decision-panel__verdict decision-panel__verdict--${verdictClass}`}
        role="status"
        aria-label={`Shuttle was ${result.verdict}`}
      >
        <div className="decision-panel__verdict-label">SHUTTLE WAS</div>
        <div className="decision-panel__verdict-word" aria-hidden="true">
          {result.verdict}
        </div>
        <div className="decision-panel__verdict-by">
          by <b>{result.marginMm} mm</b> · {result.line.toLowerCase()}
        </div>
      </div>

      <dl className="decision-panel__factbox" aria-label="Decision facts">
        <Fact label="Landing frame" value={result.landingFrame} />
        <Fact label="Cameras used" value={result.camerasUsed} />
        <Fact label="Reprojection error" value={result.reprojectionError} />
        <Fact label="Calibration age" value={result.calibrationAge} />
      </dl>

      <div className="decision-panel__actions" aria-label="Decision actions">
        <button
          className="decision-panel__primary"
          type="button"
          onClick={onBackToLive}
        >
          Back to live <kbd aria-hidden="true">Esc</kbd>
        </button>
        <button
          className="decision-panel__ghost"
          type="button"
          onClick={onRunAgain}
        >
          Run it again
        </button>
        <button
          className="decision-panel__ghost"
          type="button"
          onClick={onSaveClip}
        >
          Save clip to match folder
        </button>
      </div>
    </section>
  );
}

export default DecisionPanel;
