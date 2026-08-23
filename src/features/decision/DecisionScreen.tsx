import { useState } from "react";

import { DecisionEvidence } from "./DecisionEvidence";
import { DecisionPanel, type DecisionResult } from "./DecisionPanel";
import "./DecisionScreen.css";

export interface DecisionScreenProps {
  result?: Partial<DecisionResult>;
  onRunAgain: () => void;
  onBackToLive: () => void;
}

export function DecisionScreen({
  result,
  onRunAgain,
  onBackToLive,
}: DecisionScreenProps) {
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const verdict = result?.verdict ?? "OUT";
  const marginMm = result?.marginMm ?? 24;
  const camerasUsed = result?.camerasUsed ?? "A + B";
  const confidence = result?.confidence ?? 96;

  return (
    <section
      className="decision-screen"
      aria-labelledby="decision-screen-title"
    >
      <header className="decision-screen__topbar">
        <h1 id="decision-screen-title">The call — Court 2 · Game 3 · 21–18</h1>
        <span
          className="decision-screen__confidence"
          role="status"
          aria-label={`Decision confidence ${confidence}%`}
        >
          Confidence {confidence}%
        </span>
      </header>

      <div className="decision-screen__workspace">
        <DecisionPanel
          result={result}
          onRunAgain={onRunAgain}
          onSaveClip={() => setActionMessage("Clip added to the save queue.")}
          onBackToLive={onBackToLive}
        />

        <section
          className="decision-screen__plan"
          aria-labelledby="decision-evidence-title"
        >
          <h2 id="decision-evidence-title">
            Top-down reconstruction — landing zone magnified 8×
          </h2>
          <DecisionEvidence
            verdict={verdict}
            distanceMm={marginMm}
            cameraLabel={camerasUsed.replaceAll(" ", "")}
          />
          <div
            className="decision-screen__legend"
            role="group"
            aria-label="Evidence legend"
          >
            <span>
              <i className="decision-screen__swatch--trajectory" />
              Shuttle path
            </span>
            <span>
              <i className="decision-screen__swatch--landing" />
              Landing point
            </span>
            <span>
              <i className="decision-screen__swatch--line" />
              Line edge
            </span>
          </div>
          {actionMessage && (
            <output className="decision-screen__notice" aria-live="polite">
              {actionMessage}
            </output>
          )}
        </section>
      </div>
    </section>
  );
}

export default DecisionScreen;
