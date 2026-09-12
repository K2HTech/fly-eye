import { useEffect, useState } from "react";

import { CourtScene } from "../../components/CourtScene";
import { ClipInspector, type ClipDecision } from "./ClipInspector";
import "./ClipReview.css";
import { ReviewTransport } from "./ReviewTransport";
import type { CameraRole, RallyAnalysis } from "../../services";

export interface ClipReviewProps {
  analysis?: RallyAnalysis | null;
  analysisError?: string | null;
  media?: readonly { role: CameraRole; url: string }[];
  onBack: () => void;
  onDecision: (decision: ClipDecision) => void;
}

const TIMELINE_START = 1185;
const TIMELINE_END = 1383;
const LANDING_FRAME = 1284;

interface ReviewCameraProps {
  id: "A" | "B";
  position: "sideline" | "baseline";
  frame: number;
  videoUrl?: string;
}

function ReviewCamera({ id, position, frame, videoUrl }: ReviewCameraProps) {
  const titleId = `review-camera-${id}`;

  return (
    <article className="clip-review__feed" aria-labelledby={titleId}>
      <header className="clip-review__feed-bar">
        <h2 id={titleId}>
          Cam {id} — {position}
        </h2>
        <span>f {frame}</span>
      </header>
      <div className="clip-review__well">
        {videoUrl ? (
          <video
            className="clip-review__video"
            controls
            preload="metadata"
            src={videoUrl}
            aria-label={`Captured camera ${id} ${position} review video`}
          />
        ) : (
          <CourtScene
            variant={position}
            ariaLabel={`Paused camera ${id} ${position} view at frame ${frame}`}
          />
        )}
        <span className="clip-review__paused" role="status" aria-label="PAUSED">
          PAUSED
        </span>
      </div>
    </article>
  );
}

export function ClipReview({
  analysis,
  analysisError,
  media,
  onBack,
  onDecision,
}: ClipReviewProps) {
  const [currentFrame, setCurrentFrame] = useState(LANDING_FRAME);
  const [startFrame, setStartFrame] = useState(1249);
  const [endFrame, setEndFrame] = useState(1317);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onBack();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onBack]);

  const updateStartFrame = (frame: number) => {
    setStartFrame(Math.min(frame, endFrame));
  };

  const updateEndFrame = (frame: number) => {
    setEndFrame(Math.max(frame, startFrame));
  };

  const isBackendAnalysis = analysis !== undefined || media !== undefined;
  const isProcessing =
    analysis?.status === "queued" || analysis?.status === "running";
  const isFailed = analysis?.status === "failed";
  const statusText = analysis
    ? isProcessing
      ? `Analysis ${analysis.stage} ${Math.round(analysis.progress * 100)}%`
      : isFailed
        ? "Analysis failed"
        : "Analysis complete"
    : "SYNC ±1 FRAME";
  const failureMessage =
    analysisError ??
    analysis?.error?.message ??
    (isFailed ? "The rally analysis could not be completed." : null);
  const leftVideo = media?.find((entry) => entry.role === "SIDELINE_LEFT")?.url;
  const rightVideo = media?.find(
    (entry) => entry.role === "SIDELINE_RIGHT",
  )?.url;

  return (
    <section className="clip-review" aria-labelledby="clip-review-title">
      <header className="clip-review__topbar">
        <h1 id="clip-review-title">
          Clip review — mark the moment the shuttle lands
        </h1>
        <div
          className="clip-review__status"
          role="status"
          aria-label={
            isBackendAnalysis
              ? "Rally analysis status"
              : "Camera synchronization status"
          }
          aria-live="polite"
        >
          <span aria-hidden="true">{statusText}</span>
          <output aria-label="Current synchronized frame">
            frame {currentFrame}
          </output>
        </div>
      </header>

      <div className="clip-review__workspace">
        <div
          className="clip-review__feeds"
          aria-label="Synchronized camera frames"
        >
          <ReviewCamera
            id="A"
            position="sideline"
            frame={currentFrame}
            videoUrl={leftVideo}
          />
          <ReviewCamera
            id="B"
            position="baseline"
            frame={currentFrame}
            videoUrl={rightVideo}
          />
        </div>
        {isBackendAnalysis ? (
          <aside className="clip-review__analysis" aria-live="polite">
            <h2>Backend analysis</h2>
            {failureMessage ? (
              <p role="alert">{failureMessage}</p>
            ) : (
              <p>
                {isProcessing
                  ? "Fly Eye is processing the submitted rally."
                  : "Opening the backend result…"}
              </p>
            )}
            <button type="button" onClick={onBack}>
              Return to live monitor
            </button>
          </aside>
        ) : (
          <ClipInspector landingFrame={currentFrame} onDecision={onDecision} />
        )}
      </div>

      {!isBackendAnalysis && (
        <ReviewTransport
          minFrame={TIMELINE_START}
          maxFrame={TIMELINE_END}
          currentFrame={currentFrame}
          startFrame={startFrame}
          endFrame={endFrame}
          impactFrame={LANDING_FRAME}
          frameRate={120}
          playbackRate={0.25}
          onCurrentFrameChange={setCurrentFrame}
          onStartFrameChange={updateStartFrame}
          onEndFrameChange={updateEndFrame}
        />
      )}
    </section>
  );
}

export default ClipReview;
