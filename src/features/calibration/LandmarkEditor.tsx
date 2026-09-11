import { useState, type KeyboardEvent, type MouseEvent } from "react";

import type {
  CalibrationPoint,
  CapturedCalibrationFrame,
} from "../../services";
import {
  lineIntersection,
  nudgeLandmark,
  type LandmarkPlacement,
} from "./landmarks";

interface LandmarkEditorProps {
  readonly frame: CapturedCalibrationFrame;
  readonly landmarks: readonly LandmarkPlacement[];
  onChange(landmarks: readonly LandmarkPlacement[]): void;
}

function number(value: string): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function emptyPoint(): CalibrationPoint {
  return { x: 0, y: 0 };
}

export function LandmarkEditor({
  frame,
  landmarks,
  onChange,
}: LandmarkEditorProps) {
  const [selected, setSelected] = useState(0);
  const [helper, setHelper] = useState(false);
  const [lines, setLines] = useState([
    emptyPoint(),
    emptyPoint(),
    emptyPoint(),
  ]);
  const update = (
    index: number,
    image: CalibrationPoint,
    selectNext = false,
  ) => {
    const next = landmarks.map((landmark, landmarkIndex) =>
      landmarkIndex === index ? { ...landmark, image } : landmark,
    );
    onChange(next);
    if (selectNext) {
      const nextUnplaced = next.findIndex(
        (landmark, landmarkIndex) => landmarkIndex > index && !landmark.image,
      );
      if (nextUnplaced >= 0) setSelected(nextUnplaced);
    }
  };
  const moveFromClick = (event: MouseEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    update(
      selected,
      {
        x: ((event.clientX - bounds.left) / bounds.width) * frame.width,
        y: ((event.clientY - bounds.top) / bounds.height) * frame.height,
      },
      true,
    );
  };
  const keyMove = (event: KeyboardEvent<HTMLButtonElement>) => {
    const delta = event.shiftKey ? 10 : 1;
    const axis =
      event.key === "ArrowLeft" || event.key === "ArrowRight"
        ? "x"
        : event.key === "ArrowUp" || event.key === "ArrowDown"
          ? "y"
          : null;
    if (!axis) return;
    event.preventDefault();
    onChange(
      nudgeLandmark(
        landmarks,
        selected,
        axis,
        event.key === "ArrowLeft" || event.key === "ArrowUp" ? -delta : delta,
      ),
    );
  };
  const intersect = () => {
    const point = lineIntersection(lines[0], lines[1], lines[2], lines[3]);
    if (point) update(selected, point, true);
  };

  return (
    <section className="calibration__seeding" aria-labelledby="seed-title">
      <div>
        <p className="calibration__eyebrow">STEP 2 OF 3</p>
        <h2 id="seed-title">Place doubles-court markers</h2>
        <p>
          Select A–D in order, then click its exact painted-line intersection.
          Coordinates are raw pixels; off-frame coordinates are valid.
        </p>
      </div>
      <div className="calibration__seed-grid">
        <div>
          <div
            className="calibration__image"
            onClick={moveFromClick}
            role="application"
            aria-label="Captured frame marker canvas"
          >
            <img
              src={frame.previewDataUrl}
              alt="Selected captured calibration frame"
            />
            {landmarks.map(
              (landmark, index) =>
                landmark.image && (
                  <button
                    key={landmark.id}
                    type="button"
                    className={`calibration__marker ${selected === index ? "is-selected" : ""}`}
                    style={{
                      left: `${(landmark.image.x / frame.width) * 100}%`,
                      top: `${(landmark.image.y / frame.height) * 100}%`,
                    }}
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelected(index);
                    }}
                    onKeyDown={keyMove}
                    aria-label={`Marker ${landmark.id}, image x ${landmark.image.x}, y ${landmark.image.y}`}
                  >
                    <span aria-hidden="true" />
                  </button>
                ),
            )}
          </div>
          <p className="calibration__hint">
            The thin reticle center is the submitted point. Select a placed
            reticle and use Arrow keys for 1 px, or Shift + Arrow for 10 px.
          </p>
        </div>
        <aside
          className="calibration__landmark-list"
          aria-label="Court landmarks"
        >
          <ol>
            {landmarks.map((landmark, index) => (
              <li key={landmark.id}>
                <button
                  type="button"
                  onClick={() => setSelected(index)}
                  className={selected === index ? "is-selected" : ""}
                >
                  Marker {landmark.id}{" "}
                  <span>
                    ({landmark.court.x}, {landmark.court.y})
                  </span>
                </button>
                {landmark.image ? (
                  <>
                    <label>
                      Image X
                      <input
                        type="number"
                        value={landmark.image.x}
                        onChange={(event) => {
                          const value = number(event.target.value);
                          if (value !== null)
                            update(index, { ...landmark.image!, x: value });
                        }}
                      />
                    </label>
                    <label>
                      Image Y
                      <input
                        type="number"
                        value={landmark.image.y}
                        onChange={(event) => {
                          const value = number(event.target.value);
                          if (value !== null)
                            update(index, { ...landmark.image!, y: value });
                        }}
                      />
                    </label>
                  </>
                ) : (
                  <p className="calibration__unplaced" role="status">
                    Not placed
                  </p>
                )}
              </li>
            ))}
          </ol>
          <button type="button" onClick={() => setHelper(!helper)}>
            Extend two court lines
          </button>
          {helper && (
            <div className="calibration__intersection">
              <p>
                Enter two visible points on each line. Their intersection places
                the selected marker.
              </p>
              {lines.map((point, index) => (
                <fieldset key={index}>
                  <legend>
                    Line {index < 2 ? "one" : "two"}, point {(index % 2) + 1}
                  </legend>
                  <label>
                    X
                    <input
                      type="number"
                      value={point.x}
                      onChange={(event) => {
                        const value = number(event.target.value);
                        if (value !== null)
                          setLines((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, x: value }
                                : item,
                            ),
                          );
                      }}
                    />
                  </label>
                  <label>
                    Y
                    <input
                      type="number"
                      value={point.y}
                      onChange={(event) => {
                        const value = number(event.target.value);
                        if (value !== null)
                          setLines((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, y: value }
                                : item,
                            ),
                          );
                      }}
                    />
                  </label>
                </fieldset>
              ))}
              <button type="button" onClick={intersect}>
                Set intersection
              </button>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
