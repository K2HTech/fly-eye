import { useCallback, useEffect, useRef, useState } from "react";

import "./ClipInspector.css";

export type ClipSelectionMode = "automatic" | "manual";

export interface ClipDecision {
  selectionMode: ClipSelectionMode;
  landingFrame: number | string;
}

export interface ClipInspectorProps {
  clipStart?: string;
  clipEnd?: string;
  clipLength?: string;
  trackedFrames?: string;
  landingFrame?: number | string;
  lineQuestion?: string;
  onDecision?: (decision: ClipDecision) => void;
}

const DEFAULTS = {
  clipStart: "00:11.42",
  clipEnd: "00:13.08",
  clipLength: "1.66 s · 199 f",
  trackedFrames: "186 / 199",
  landingFrame: 1284,
  lineQuestion: "Back boundary",
} as const;

const PROGRESS_STEPS = [25, 48, 68, 100] as const;
const PROGRESS_STEP_MS = 120;

/**
 * The review sidebar is intentionally self-contained. The reconstruction is
 * simulated for now; a transport/service can replace the callback later.
 */
export function ClipInspector({
  clipStart = DEFAULTS.clipStart,
  clipEnd = DEFAULTS.clipEnd,
  clipLength = DEFAULTS.clipLength,
  trackedFrames = DEFAULTS.trackedFrames,
  landingFrame = DEFAULTS.landingFrame,
  lineQuestion = DEFAULTS.lineQuestion,
  onDecision,
}: ClipInspectorProps) {
  const [selectionMode, setSelectionMode] =
    useState<ClipSelectionMode>("automatic");
  // The mockup shows the inspector mid-reconstruction before the user asks
  // for a call; pressing the action starts a fresh deterministic run.
  const [progress, setProgress] = useState(68);
  const [isRunning, setIsRunning] = useState(false);
  const timerRef = useRef<ReturnType<typeof window.setInterval> | null>(null);
  const onDecisionRef = useRef(onDecision);

  useEffect(() => {
    onDecisionRef.current = onDecision;
  }, [onDecision]);

  const clearProgressTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => clearProgressTimer, [clearProgressTimer]);

  const startReconstruction = useCallback(() => {
    // A running reconstruction owns the one timer. This also guards the
    // button + Enter keydown pair from scheduling duplicate work.
    if (timerRef.current !== null) return;

    setIsRunning(true);
    setProgress(0);
    let step = 0;
    timerRef.current = window.setInterval(() => {
      const nextProgress = PROGRESS_STEPS[step];
      setProgress(nextProgress);
      step += 1;

      if (nextProgress === 100) {
        clearProgressTimer();
        setIsRunning(false);
        onDecisionRef.current?.({ selectionMode, landingFrame });
      }
    }, PROGRESS_STEP_MS);
  }, [clearProgressTimer, landingFrame, selectionMode]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      startReconstruction();
    };

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [startReconstruction]);

  return (
    <aside className="clip-inspector" aria-labelledby="clip-inspector-title">
      <h2 id="clip-inspector-title" className="clip-inspector__title">
        Clip
      </h2>

      <div className="clip-inspector__kv">
        <span>Start</span>
        <b>{clipStart}</b>
      </div>
      <div className="clip-inspector__kv">
        <span>End</span>
        <b>{clipEnd}</b>
      </div>
      <div className="clip-inspector__kv">
        <span>Length</span>
        <b className="clip-inspector__value--highlight">{clipLength}</b>
      </div>

      <div className="clip-inspector__rule" />

      <h2 className="clip-inspector__title">Shuttle</h2>
      <div className="clip-inspector__kv">
        <span>Tracked frames</span>
        <b className="clip-inspector__value--good">{trackedFrames}</b>
      </div>
      <div className="clip-inspector__kv">
        <span>Landing frame</span>
        <b>{landingFrame}</b>
      </div>
      <div className="clip-inspector__kv">
        <span>Line in question</span>
        <b>{lineQuestion}</b>
      </div>

      <div
        className="clip-inspector__segmented"
        role="group"
        aria-label="Landing frame selection"
      >
        <button
          type="button"
          aria-pressed={selectionMode === "automatic"}
          onClick={() => setSelectionMode("automatic")}
        >
          Find it for me
        </button>
        <button
          type="button"
          aria-pressed={selectionMode === "manual"}
          onClick={() => setSelectionMode("manual")}
        >
          I'll pick it
        </button>
      </div>

      <div className="clip-inspector__rule" />

      <button
        className="clip-inspector__run"
        type="button"
        onClick={startReconstruction}
        aria-busy={isRunning}
        disabled={isRunning}
      >
        Get the call <kbd aria-hidden="true">↵</kbd>
      </button>
      <div
        className="clip-inspector__meter"
        role="progressbar"
        aria-label="Trajectory reconstruction progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
      >
        <i style={{ width: `${progress}%` }} />
      </div>
      <div className="clip-inspector__meter-label" aria-live="polite">
        {progress === 100
          ? "Trajectory reconstructed — 100%"
          : `Reconstructing trajectory — ${progress}%`}
      </div>
    </aside>
  );
}

export default ClipInspector;
