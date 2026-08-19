import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import "./ReviewTransport.css";

export interface ReviewTransportProps {
  /** The first frame represented by the timeline. Defaults to 0. */
  minFrame?: number;
  /** The last frame represented by the timeline. Defaults to endFrame. */
  maxFrame?: number;
  currentFrame: number;
  startFrame: number;
  endFrame: number;
  /** An optional model-detected landing/impact frame. */
  impactFrame?: number;
  frameRate?: number;
  playbackRate?: number;
  /** When supplied, playback is controlled by the parent. */
  isPlaying?: boolean;
  defaultPlaying?: boolean;
  active?: boolean;
  onCurrentFrameChange: (frame: number) => void;
  onStartFrameChange: (frame: number) => void;
  onEndFrameChange: (frame: number) => void;
  onPlayingChange?: (playing: boolean) => void;
}

const clamp = (value: number, low: number, high: number) =>
  Math.min(Math.max(value, low), high);

const formatSpeed = (speed: number) => {
  const text = speed.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  return `${text}×`;
};

export function ReviewTransport({
  minFrame = 0,
  maxFrame: maxFrameProp,
  currentFrame,
  startFrame,
  endFrame,
  impactFrame,
  frameRate = 120,
  playbackRate = 0.25,
  isPlaying,
  defaultPlaying = false,
  active = true,
  onCurrentFrameChange,
  onStartFrameChange,
  onEndFrameChange,
  onPlayingChange,
}: ReviewTransportProps) {
  const maxFrame = Math.max(maxFrameProp ?? endFrame, minFrame);
  const rangeStart = Math.min(minFrame, maxFrame);
  const rangeEnd = Math.max(maxFrame, rangeStart + 1);
  const [internalPlaying, setInternalPlaying] = useState(defaultPlaying);
  const playing = isPlaying ?? internalPlaying;
  const currentRef = useRef(currentFrame);
  const playingRef = useRef(playing);

  useEffect(() => {
    currentRef.current = currentFrame;
  }, [currentFrame]);

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  const setPlaying = useCallback(
    (next: boolean) => {
      if (isPlaying === undefined) setInternalPlaying(next);
      onPlayingChange?.(next);
    },
    [isPlaying, onPlayingChange],
  );

  const moveTo = useCallback(
    (frame: number) => {
      const next = clamp(Math.round(frame), rangeStart, rangeEnd);
      onCurrentFrameChange(next);
      return next;
    },
    [onCurrentFrameChange, rangeEnd, rangeStart],
  );

  const step = useCallback(
    (amount: number) => {
      const next = moveTo(currentRef.current + amount);
      if (amount > 0 && next >= rangeEnd && playingRef.current)
        setPlaying(false);
      if (amount < 0 && playingRef.current) setPlaying(false);
    },
    [moveTo, rangeEnd, setPlaying],
  );

  useEffect(() => {
    if (!active || !playing) return;

    const interval = window.setInterval(
      () => {
        const next = clamp(currentRef.current + 1, rangeStart, rangeEnd);
        onCurrentFrameChange(next);
        if (next >= rangeEnd) setPlaying(false);
      },
      1000 / Math.max(frameRate * playbackRate, 1),
    );

    return () => window.clearInterval(interval);
  }, [
    active,
    frameRate,
    onCurrentFrameChange,
    playbackRate,
    rangeEnd,
    rangeStart,
    setPlaying,
    playing,
  ]);

  useEffect(() => {
    if (!active) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
      ) {
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        step(-1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        step(1);
      } else if (event.key === "[") {
        event.preventDefault();
        onStartFrameChange(clamp(currentRef.current, rangeStart, rangeEnd));
      } else if (event.key === "]") {
        event.preventDefault();
        onEndFrameChange(clamp(currentRef.current, rangeStart, rangeEnd));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    active,
    onEndFrameChange,
    onStartFrameChange,
    rangeEnd,
    rangeStart,
    step,
  ]);

  const percentage = useCallback(
    (frame: number) =>
      `${((clamp(frame, rangeStart, rangeEnd) - rangeStart) / (rangeEnd - rangeStart)) * 100}%`,
    [rangeEnd, rangeStart],
  );

  const markerLabels = useMemo(
    () => ({
      start: `Start frame ${startFrame}`,
      end: `End frame ${endFrame}`,
      current: `Current frame ${currentFrame}`,
      impact: impactFrame === undefined ? "" : `Impact frame ${impactFrame}`,
    }),
    [currentFrame, endFrame, impactFrame, startFrame],
  );

  const handleTimelineClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    moveTo(
      rangeStart +
        ((event.clientX - bounds.left) / Math.max(bounds.width, 1)) *
          (rangeEnd - rangeStart),
    );
  };

  return (
    <section className="review-transport" aria-label="Clip transport">
      <div className="review-transport__timeline-wrap">
        <div
          className="review-transport__timeline"
          onClick={handleTimelineClick}
          role="presentation"
        >
          <div
            className="review-transport__selection"
            style={{
              left: percentage(startFrame),
              width: `calc(${percentage(endFrame)} - ${percentage(startFrame)})`,
            }}
            aria-hidden="true"
          />
          <span
            className="review-transport__marker review-transport__marker--start"
            style={{ left: percentage(startFrame) }}
            aria-label={markerLabels.start}
          />
          <span
            className="review-transport__marker review-transport__marker--end"
            style={{ left: percentage(endFrame) }}
            aria-label={markerLabels.end}
          />
          {impactFrame !== undefined && (
            <span
              className="review-transport__marker review-transport__marker--impact"
              style={{ left: percentage(impactFrame) }}
              aria-label={markerLabels.impact}
            />
          )}
          <span
            className="review-transport__marker review-transport__marker--current"
            style={{ left: percentage(currentFrame) }}
            aria-label={markerLabels.current}
          />
          <input
            className="review-transport__range"
            type="range"
            min={rangeStart}
            max={rangeEnd}
            step={1}
            value={clamp(currentFrame, rangeStart, rangeEnd)}
            onChange={(event) => moveTo(Number(event.target.value))}
            aria-label="Current frame"
          />
        </div>
      </div>
      <div className="review-transport__controls">
        <button
          type="button"
          onClick={() => moveTo(startFrame)}
          aria-label={`Go to start frame ${startFrame}`}
        >
          ⏮ <span>start</span>
        </button>
        <button
          type="button"
          onClick={() => step(-10)}
          aria-label="Step backward 10 frames"
        >
          ◀◀ <span>10f</span>
        </button>
        <button
          type="button"
          onClick={() => step(-1)}
          aria-label="Step backward 1 frame"
        >
          ◀ <span>1f</span>
        </button>
        <button
          type="button"
          className="review-transport__play"
          onClick={() => setPlaying(!playing)}
          aria-label={playing ? "Pause playback" : "Play clip"}
          aria-pressed={playing}
        >
          {playing ? "⏸ pause" : "▶ play"}
        </button>
        <button
          type="button"
          onClick={() => step(1)}
          aria-label="Step forward 1 frame"
        >
          <span>1f</span> ▶
        </button>
        <button
          type="button"
          onClick={() => step(10)}
          aria-label="Step forward 10 frames"
        >
          <span>10f</span> ▶▶
        </button>
        <button
          type="button"
          onClick={() => moveTo(endFrame)}
          aria-label={`Go to end frame ${endFrame}`}
        >
          <span>end</span> ⏭
        </button>
        <span className="review-transport__speed">
          SPEED <b>{formatSpeed(playbackRate)}</b>
        </span>
        <span className="review-transport__hint">
          <kbd>[</kbd> start <kbd>]</kbd> end&nbsp;&nbsp; <kbd>←</kbd>
          <kbd>→</kbd> step frame
        </span>
      </div>
    </section>
  );
}
