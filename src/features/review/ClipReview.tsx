import { useEffect, useState } from "react";

import { CourtScene } from "../../components/CourtScene";
import { ClipInspector, type ClipDecision } from "./ClipInspector";
import "./ClipReview.css";
import { ReviewTransport } from "./ReviewTransport";

export interface ClipReviewProps {
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
}

function ReviewCamera({ id, position, frame }: ReviewCameraProps) {
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
        <CourtScene
          variant={position}
          ariaLabel={`Paused camera ${id} ${position} view at frame ${frame}`}
        />
        <span className="clip-review__paused" role="status" aria-label="PAUSED">
          PAUSED
        </span>
      </div>
    </article>
  );
}

export function ClipReview({ onBack, onDecision }: ClipReviewProps) {
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

  return (
    <section className="clip-review" aria-labelledby="clip-review-title">
      <header className="clip-review__topbar">
        <div className="clip-review__brand" aria-label="FLY EYE">
          <span aria-hidden="true">◎</span> FLY EYE
        </div>
        <h1 id="clip-review-title">
          Clip review — mark the moment the shuttle lands
        </h1>
        <div
          className="clip-review__status"
          role="status"
          aria-label="Camera synchronization status"
          aria-live="polite"
        >
          <span aria-hidden="true">SYNC ±1 FRAME</span>
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
          <ReviewCamera id="A" position="sideline" frame={currentFrame} />
          <ReviewCamera id="B" position="baseline" frame={currentFrame} />
        </div>
        <ClipInspector landingFrame={currentFrame} onDecision={onDecision} />
      </div>

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
    </section>
  );
}

export default ClipReview;
