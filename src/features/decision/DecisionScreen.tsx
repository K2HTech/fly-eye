import { useState } from "react";

import { DecisionEvidence } from "./DecisionEvidence";
import { DecisionPanel, type DecisionResult } from "./DecisionPanel";
import type { RallyAnalysis } from "../../services";
import "./DecisionScreen.css";

export interface DecisionScreenProps {
  analysis?: RallyAnalysis;
  overlayUrl?: string | null;
  overlayError?: string | null;
  result?: Partial<DecisionResult>;
  onRunAgain: () => void;
  onBackToLive: () => void;
}

export function DecisionScreen({
  analysis,
  overlayUrl,
  overlayError,
  result,
  onRunAgain,
  onBackToLive,
}: DecisionScreenProps) {
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const backendVerdict = analysis?.verdict;
  const verdict =
    backendVerdict === "IN" || backendVerdict === "OUT"
      ? backendVerdict
      : (result?.verdict ?? "OUT");
  const marginMm = analysis?.distanceToLineCm
    ? Math.round(Math.abs(analysis.distanceToLineCm) * 10)
    : (result?.marginMm ?? 24);
  const camerasUsed = analysis?.perCamera
    ? `${analysis.perCamera.filter((camera) => camera.usable).length} usable camera${analysis.perCamera.filter((camera) => camera.usable).length === 1 ? "" : "s"}`
    : (result?.camerasUsed ?? "A + B");
  const confidence =
    analysis?.confidence !== null && analysis?.confidence !== undefined
      ? Math.round(analysis.confidence * 100)
      : (result?.confidence ?? 96);
  const backendResult: Partial<DecisionResult> | undefined = analysis
    ? {
        verdict,
        marginMm,
        line: analysis.nearestLine ?? "Backend result",
        landingFrame: "Backend result",
        camerasUsed,
        reprojectionError: "Provided by backend",
        calibrationAge: "Submission snapshot",
        confidence,
      }
    : result;
  const isInconclusive = backendVerdict === "INCONCLUSIVE";

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
        {isInconclusive ? (
          <section
            className="decision-screen__inconclusive"
            aria-labelledby="inconclusive-title"
          >
            <p className="decision-screen__eyebrow">BACKEND RESULT</p>
            <h2 id="inconclusive-title">INCONCLUSIVE</h2>
            <p>
              {analysis?.reasonText ??
                "The backend could not produce an official line-call result."}
            </p>
            {analysis?.reasonCode && (
              <p className="decision-screen__reason">
                Reason: {analysis.reasonCode}
              </p>
            )}
            <p className="decision-screen__manual">
              The umpire must decide this call manually.
            </p>
            <div
              className="decision-panel__actions"
              aria-label="Decision actions"
            >
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
            </div>
          </section>
        ) : (
          <DecisionPanel
            result={backendResult}
            onRunAgain={onRunAgain}
            onSaveClip={() => setActionMessage("Clip added to the save queue.")}
            onBackToLive={onBackToLive}
          />
        )}

        <section
          className="decision-screen__plan"
          aria-labelledby="decision-evidence-title"
        >
          <h2 id="decision-evidence-title">
            {analysis
              ? "Backend top-down analysis overlay"
              : "Top-down reconstruction — landing zone magnified 8×"}
          </h2>
          {analysis ? (
            overlayUrl ? (
              <img
                className="decision-screen__overlay"
                src={overlayUrl}
                alt="Backend-generated top-down analysis overlay"
              />
            ) : (
              <p
                className="decision-screen__evidence-message"
                role={overlayError ? "alert" : undefined}
              >
                {overlayError ??
                  "The backend did not provide a top-down overlay."}
              </p>
            )
          ) : (
            <>
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
            </>
          )}
          {analysis?.perCamera && (
            <dl
              className="decision-screen__diagnostics"
              aria-label="Per-camera diagnostics"
            >
              {analysis.perCamera.map((camera) => (
                <div key={camera.cameraId}>
                  <dt>
                    {camera.usable ? "Usable camera" : "Unavailable camera"}
                  </dt>
                  <dd>{camera.trackPoints} tracked points</dd>
                </div>
              ))}
            </dl>
          )}
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
