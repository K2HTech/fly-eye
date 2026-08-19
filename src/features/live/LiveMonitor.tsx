import { useEffect } from "react";

import "./live-monitor.css";

import {
  simulatedBuffer,
  simulatedCameras,
  simulatedMatch,
} from "./live-monitor.data";

export type CameraId = "A" | "B";

export interface CameraFeed {
  id: CameraId;
  name: string;
  position: "sideline" | "baseline";
  resolution: string;
  frameRate: number;
  latencyMs: number;
  status: "online" | "offline";
}

export interface MatchState {
  court: string;
  leftTeam: string;
  leftScore: number;
  rightTeam: string;
  rightScore: number;
  game: number;
  elapsed: string;
}

export interface BufferSegment {
  startSeconds: number;
  durationSeconds: number;
}

export interface RollingBuffer {
  durationSeconds: number;
  segments: readonly BufferSegment[];
}

export interface LiveMonitorProps {
  onReview: () => void;
  match?: MatchState;
  cameras?: readonly CameraFeed[];
  buffer?: RollingBuffer;
}

function CourtView({ camera }: { camera: CameraFeed }) {
  const isSideline = camera.id === "A";

  return (
    <svg
      className="live-monitor__court"
      viewBox="0 0 320 180"
      role="img"
      aria-label={`${camera.name} ${camera.position} camera view of a badminton court`}
    >
      <rect width="320" height="180" fill="#0b1a11" />
      {isSideline ? (
        <>
          <path d="M38 172 L118 58 L214 58 L302 172 Z" fill="#17402a" />
          <g fill="none" stroke="#f2f4f0" strokeWidth="1.4" opacity=".92">
            <path d="M38 172 L118 58 L214 58 L302 172 Z" />
            <path d="M62 138 L278 138" />
            <path d="M95 95 L242 95" />
            <path d="M108 76 L228 76" />
            <path d="M170 172 L166 58" strokeDasharray="3 4" opacity=".6" />
          </g>
          <g fill="none" stroke="#f2f4f0" strokeWidth="2" opacity=".45">
            <path d="M68 58 L68 122 M266 58 L266 122" />
            <path d="M68 86 L266 86" />
          </g>
          <path
            d="M244 34 Q216 88 196 128"
            fill="none"
            stroke="#e8a33d"
            strokeDasharray="5 4"
            strokeWidth="1.8"
          />
          <circle cx="196" cy="128" r="4" fill="#f2f4f0" />
          <ellipse cx="118" cy="148" rx="10" ry="4" fill="#000" opacity=".35" />
          <path
            d="M118 148 v-24 l-8 -13 M118 124 l9 -14"
            fill="none"
            stroke="#d6e0f0"
            strokeLinecap="round"
            strokeWidth="3.2"
          />
          <circle cx="118" cy="106" r="5" fill="#d6e0f0" />
        </>
      ) : (
        <>
          <path d="M18 176 L94 44 L226 44 L302 176 Z" fill="#17402a" />
          <g fill="none" stroke="#f2f4f0" strokeWidth="1.4" opacity=".92">
            <path d="M18 176 L94 44 L226 44 L302 176 Z" />
            <path d="M42 132 L278 132" />
            <path d="M72 82 L248 82" />
            <path d="M160 176 L160 44" strokeDasharray="3 4" opacity=".6" />
          </g>
          <path d="M38 142 L282 142" stroke="#f2f4f0" strokeWidth="3" />
          <path
            d="M238 50 Q220 106 205 150"
            fill="none"
            stroke="#e8a33d"
            strokeDasharray="5 4"
            strokeWidth="1.8"
          />
          <circle cx="205" cy="150" r="4.5" fill="#f2f4f0" />
          <rect
            x="186"
            y="130"
            width="44"
            height="36"
            fill="none"
            stroke="#4c8dff"
            strokeDasharray="4 3"
            strokeWidth="1.4"
          />
        </>
      )}
    </svg>
  );
}

function CameraCard({ camera }: { camera: CameraFeed }) {
  const statusLabel = camera.status === "online" ? "Live" : "Offline";

  return (
    <article
      className="live-monitor__feed"
      aria-labelledby={`camera-${camera.id}`}
    >
      <header className="live-monitor__feed-bar">
        <h2 id={`camera-${camera.id}`} className="live-monitor__feed-name">
          <span
            className={`live-monitor__record-dot live-monitor__record-dot--${camera.status}`}
            aria-hidden="true"
          />
          {camera.name} — {camera.position}
        </h2>
        <span className="live-monitor__feed-meta">
          {camera.resolution} · {camera.latencyMs.toFixed(1)} ms
        </span>
      </header>
      <div className="live-monitor__well">
        <CourtView camera={camera} />
        <span
          className={`live-monitor__feed-tag live-monitor__feed-tag--${camera.status}`}
          aria-label={`${camera.name} status: ${statusLabel}`}
        >
          {statusLabel}
        </span>
      </div>
    </article>
  );
}

function BufferTrack({ buffer }: { buffer: RollingBuffer }) {
  const duration = Math.max(buffer.durationSeconds, 1);

  return (
    <div className="live-monitor__buffer" aria-label="Rolling buffer">
      <p className="live-monitor__eyebrow">
        Rolling buffer — last {buffer.durationSeconds} s is always recorded
      </p>
      <div
        className="live-monitor__track"
        role="img"
        aria-label={`Last ${buffer.durationSeconds} seconds recorded with ${buffer.segments.length} detected rallies`}
      >
        <div className="live-monitor__track-fill" aria-hidden="true" />
        {buffer.segments.map((segment, index) => (
          <span
            className="live-monitor__rally"
            key={`${segment.startSeconds}-${segment.durationSeconds}-${index}`}
            style={{
              left: `${(segment.startSeconds / duration) * 100}%`,
              width: `${(segment.durationSeconds / duration) * 100}%`,
            }}
            aria-hidden="true"
          />
        ))}
        <span className="live-monitor__now" aria-hidden="true" />
      </div>
      <div className="live-monitor__ticks" aria-hidden="true">
        <span>−{buffer.durationSeconds} s</span>
        <span>−20 s</span>
        <span>−10 s</span>
        <span>NOW</span>
      </div>
    </div>
  );
}

export function LiveMonitor({
  onReview,
  match = simulatedMatch,
  cameras = simulatedCameras,
  buffer = simulatedBuffer,
}: LiveMonitorProps) {
  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (event.key === "F1" && !event.repeat) {
        event.preventDefault();
        onReview();
      }
    };

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [onReview]);

  return (
    <section className="live-monitor" aria-labelledby="live-monitor-title">
      <header className="live-monitor__topbar">
        <h1 id="live-monitor-title" className="live-monitor__sr-only">
          Live monitor
        </h1>
        <div className="live-monitor__brand" aria-label="FLY EYE">
          <span className="live-monitor__brand-mark" aria-hidden="true">
            ◎
          </span>
          <span>FLY EYE</span>
        </div>
        <div className="live-monitor__scoreboard">
          <span className="live-monitor__court-label">{match.court}</span>
          <span className="live-monitor__team">{match.leftTeam}</span>
          <span className="live-monitor__points">{match.leftScore}</span>
          <span aria-hidden="true">—</span>
          <span className="live-monitor__points">{match.rightScore}</span>
          <span className="live-monitor__team">{match.rightTeam}</span>
          <span className="live-monitor__game">Game {match.game}</span>
        </div>
        <div
          className="live-monitor__chips"
          role="group"
          aria-label="System status"
        >
          {cameras.map((camera) => (
            <span
              className={`live-monitor__chip live-monitor__chip--${camera.status}`}
              key={camera.id}
              role="status"
            >
              ● CAM {camera.id} · {camera.frameRate} fps
            </span>
          ))}
          <span
            className="live-monitor__chip live-monitor__chip--online"
            role="status"
          >
            CALIBRATED
          </span>
          <time className="live-monitor__clock">{match.elapsed}</time>
        </div>
      </header>

      <div
        className="live-monitor__feeds"
        role="region"
        aria-label="Camera feeds"
      >
        {cameras.map((camera) => (
          <CameraCard camera={camera} key={camera.id} />
        ))}
      </div>

      <footer className="live-monitor__deck">
        <BufferTrack buffer={buffer} />
        <button
          className="live-monitor__review"
          type="button"
          onClick={onReview}
        >
          Review last rally <kbd aria-hidden="true">F1</kbd>
        </button>
      </footer>
    </section>
  );
}

export default LiveMonitor;
