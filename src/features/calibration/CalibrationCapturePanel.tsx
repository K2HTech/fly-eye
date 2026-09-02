import { useEffect, useMemo, useRef, useState } from "react";

import type { CalibrationSeedPoint } from "../../services";
import { captureVideoStill, type CapturedCalibrationFrame } from "./capture";
import {
  courtCornerPrompts,
  createCourtSeedPoints,
  imagePointFromDisplayPosition,
  type CourtCornerId,
} from "./courtPoints";

import "./calibration-capture.css";

export interface PreparedCalibrationCapture {
  readonly frames: readonly CapturedCalibrationFrame[];
  readonly referenceFrameIndex: number;
  readonly seedPoints: readonly CalibrationSeedPoint[];
}

export interface CalibrationCapturePanelProps {
  readonly cameraName: string;
  readonly stream: MediaStream;
  readonly onCancel: () => void;
  readonly onPrepared: (capture: PreparedCalibrationCapture) => void;
}

type PointMap = Partial<Record<CourtCornerId, { x: number; y: number }>>;
type CoordinateDrafts = Partial<
  Record<CourtCornerId, { x: string; y: string }>
>;

function PreviewImage({ frame }: { frame: CapturedCalibrationFrame }) {
  const url = useMemo(() => URL.createObjectURL(frame.blob), [frame.blob]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  return <img src={url} alt="Selected calibration reference image" />;
}

export function CalibrationCapturePanel({
  cameraName,
  stream,
  onCancel,
  onPrepared,
}: CalibrationCapturePanelProps) {
  const video = useRef<HTMLVideoElement>(null);
  const marker = useRef<HTMLButtonElement>(null);
  const [frames, setFrames] = useState<readonly CapturedCalibrationFrame[]>([]);
  const [referenceFrameIndex, setReferenceFrameIndex] = useState(0);
  const [points, setPoints] = useState<PointMap>({});
  const [coordinateDrafts, setCoordinateDrafts] = useState<CoordinateDrafts>(
    {},
  );
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    const preview = video.current;
    if (preview) preview.srcObject = stream;
    return () => {
      if (preview) preview.srcObject = null;
    };
  }, [stream]);

  const referenceFrame = frames[referenceFrameIndex] ?? null;
  const nextPrompt = courtCornerPrompts.find((prompt) => !points[prompt.id]);
  const canCapture = frames.length < 5 && !isCapturing;

  const capture = async () => {
    if (!video.current || !canCapture) return;
    setCaptureError(null);
    setIsCapturing(true);
    try {
      const frame = await captureVideoStill(video.current);
      setFrames((current) => [...current, frame]);
    } catch (error) {
      setCaptureError(
        error instanceof Error
          ? error.message
          : "The calibration image could not be captured. Please try again.",
      );
    } finally {
      setIsCapturing(false);
    }
  };

  const markPoint = (clientX: number, clientY: number) => {
    if (!nextPrompt || !referenceFrame || !marker.current) return;
    const rect = marker.current.getBoundingClientRect();
    try {
      const point = imagePointFromDisplayPosition(
        clientX,
        clientY,
        rect,
        referenceFrame.width,
        referenceFrame.height,
      );
      setPoints((current) => ({ ...current, [nextPrompt.id]: point }));
    } catch (error) {
      setCaptureError(
        error instanceof Error
          ? error.message
          : "The court point could not be marked.",
      );
    }
  };

  const setCoordinate = (
    corner: CourtCornerId,
    axis: "x" | "y",
    value: string,
  ) => {
    const existing = coordinateDrafts[corner] ?? {
      x: points[corner]?.x.toString() ?? "",
      y: points[corner]?.y.toString() ?? "",
    };
    const next = { ...existing, [axis]: value };
    setCoordinateDrafts((current) => ({ ...current, [corner]: next }));
    const x = Number(next.x);
    const y = Number(next.y);
    if (
      !referenceFrame ||
      !Number.isFinite(x) ||
      !Number.isFinite(y) ||
      x < 0 ||
      y < 0 ||
      x >= referenceFrame.width ||
      y >= referenceFrame.height
    ) {
      setPoints((current) => {
        const remaining = { ...current };
        delete remaining[corner];
        return remaining;
      });
      return;
    }
    setPoints((current) => ({ ...current, [corner]: { x, y } }));
  };

  const complete = () => {
    try {
      onPrepared({
        frames,
        referenceFrameIndex,
        seedPoints: createCourtSeedPoints(points),
      });
    } catch (error) {
      setCaptureError(
        error instanceof Error
          ? error.message
          : "Complete court marking before continuing.",
      );
    }
  };

  return (
    <section
      className="calibration-capture"
      aria-labelledby="calibration-capture-title"
    >
      <header>
        <p className="calibration-capture__eyebrow">Court calibration</p>
        <h2 id="calibration-capture-title">Calibrate {cameraName}</h2>
        <p>
          Keep the phone fixed. Capture three to five still images before
          marking the court.
        </p>
      </header>

      {captureError && <p role="alert">{captureError}</p>}

      <video
        ref={video}
        className="calibration-capture__live-preview"
        aria-label={`${cameraName} live preview for calibration capture`}
        autoPlay
        muted
        playsInline
      />
      <div className="calibration-capture__actions">
        <button
          type="button"
          disabled={!canCapture}
          onClick={() => void capture()}
        >
          {isCapturing
            ? "Capturing image…"
            : `Capture image (${frames.length}/5)`}
        </button>
        <button type="button" onClick={onCancel}>
          Cancel calibration
        </button>
      </div>

      {frames.length >= 3 && (
        <section aria-labelledby="calibration-mark-title">
          <h3 id="calibration-mark-title">Mark the four outer court corners</h3>
          <p aria-live="polite">
            {nextPrompt
              ? `Next: ${nextPrompt.label}. Click it in the image or enter its pixel coordinates below.`
              : "All four court corners are marked. Review them, then continue."}
          </p>
          <div
            className="calibration-capture__reference-picker"
            role="group"
            aria-label="Reference calibration image"
          >
            {frames.map((frame, index) => (
              <button
                type="button"
                key={`${frame.width}x${frame.height}-${index}`}
                aria-pressed={referenceFrameIndex === index}
                onClick={() => {
                  setReferenceFrameIndex(index);
                  setPoints({});
                  setCoordinateDrafts({});
                }}
              >
                Image {index + 1}
              </button>
            ))}
          </div>
          {referenceFrame && (
            <button
              ref={marker}
              type="button"
              className="calibration-capture__marker"
              aria-label={
                nextPrompt
                  ? `Mark ${nextPrompt.label} on the reference image`
                  : "Reference image with all court corners marked"
              }
              onClick={(event) => markPoint(event.clientX, event.clientY)}
            >
              <PreviewImage frame={referenceFrame} />
              {courtCornerPrompts.map((prompt) => {
                const point = points[prompt.id];
                return point ? (
                  <span
                    className="calibration-capture__point"
                    key={prompt.id}
                    style={{
                      left: `${(point.x / referenceFrame.width) * 100}%`,
                      top: `${(point.y / referenceFrame.height) * 100}%`,
                    }}
                    aria-hidden="true"
                  >
                    {courtCornerPrompts.indexOf(prompt) + 1}
                  </span>
                ) : null;
              })}
            </button>
          )}
          <fieldset className="calibration-capture__coordinates">
            <legend>Keyboard point entry</legend>
            {courtCornerPrompts.map((prompt) => (
              <div key={prompt.id}>
                <span>{prompt.label}</span>
                <label>
                  X pixel
                  <input
                    type="number"
                    min="0"
                    value={
                      coordinateDrafts[prompt.id]?.x ??
                      points[prompt.id]?.x ??
                      ""
                    }
                    onChange={(event) =>
                      setCoordinate(prompt.id, "x", event.target.value)
                    }
                  />
                </label>
                <label>
                  Y pixel
                  <input
                    type="number"
                    min="0"
                    value={
                      coordinateDrafts[prompt.id]?.y ??
                      points[prompt.id]?.y ??
                      ""
                    }
                    onChange={(event) =>
                      setCoordinate(prompt.id, "y", event.target.value)
                    }
                  />
                </label>
              </div>
            ))}
          </fieldset>
          <button
            type="button"
            disabled={frames.length < 3 || Boolean(nextPrompt)}
            onClick={complete}
          >
            Use these calibration images
          </button>
        </section>
      )}
    </section>
  );
}
