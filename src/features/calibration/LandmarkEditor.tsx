import {
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from "react";

import type {
  CalibrationPoint,
  CapturedCalibrationFrame,
} from "../../services";
import {
  doublesCorners,
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
  const [dragging, setDragging] = useState<number | null>(null);
  const [helper, setHelper] = useState(false);
  const [lines, setLines] = useState([
    emptyPoint(),
    emptyPoint(),
    emptyPoint(),
  ]);
  const update = (index: number, image: CalibrationPoint) =>
    onChange(
      landmarks.map((landmark, landmarkIndex) =>
        landmarkIndex === index ? { ...landmark, image } : landmark,
      ),
    );
  const imagePoint = (
    bounds: DOMRect,
    clientX: number,
    clientY: number,
  ): CalibrationPoint => ({
    x: ((clientX - bounds.left) / bounds.width) * frame.width,
    y: ((clientY - bounds.top) / bounds.height) * frame.height,
  });
  const moveFromClick = (event: MouseEvent<HTMLDivElement>) => {
    if (dragging !== null) return;
    update(
      selected,
      imagePoint(
        event.currentTarget.getBoundingClientRect(),
        event.clientX,
        event.clientY,
      ),
    );
  };
  const drag = (event: PointerEvent<HTMLDivElement>) => {
    if (dragging === null) return;
    update(
      dragging,
      imagePoint(
        event.currentTarget.getBoundingClientRect(),
        event.clientX,
        event.clientY,
      ),
    );
  };
  const keyMove = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
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
        index,
        axis,
        event.key === "ArrowLeft" || event.key === "ArrowUp" ? -delta : delta,
      ),
    );
  };
  const intersect = () => {
    const point = lineIntersection(lines[0], lines[1], lines[2], lines[3]);
    if (point) update(selected, point);
  };

  return (
    <section className="calibration__seeding" aria-labelledby="seed-title">
      <div>
        <p className="calibration__eyebrow">STEP 2 OF 3</p>
        <h2 id="seed-title">Place doubles-court markers</h2>
        <p>
          Select A–D from the list, then click its exact painted-line
          intersection. The selection remains active until you choose another.
        </p>
      </div>
      <div className="calibration__seed-grid">
        <div>
          <div
            className="calibration__image"
            onClick={moveFromClick}
            onPointerMove={drag}
            onPointerUp={() => setDragging(null)}
            onPointerCancel={() => setDragging(null)}
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
                    onClick={(event) => event.stopPropagation()}
                    onPointerDown={(event) => {
                      event.stopPropagation();
                      event.currentTarget.setPointerCapture(event.pointerId);
                      setDragging(index);
                    }}
                    onKeyDown={(event) => keyMove(event, index)}
                    aria-label={`Marker ${landmark.id}, image x ${landmark.image.x}, y ${landmark.image.y}`}
                  >
                    <span aria-hidden="true" />
                  </button>
                ),
            )}
          </div>
          <p className="calibration__hint">
            The thin reticle center is the submitted point. Drag a placed
            reticle to refine it; Arrow keys move its focused reticle by 1 px,
            or Shift + Arrow by 10 px.
          </p>
        </div>
        <aside
          className="calibration__landmark-list"
          aria-label="Court landmarks"
        >
          <CourtDiagram selected={selected} />
          <ol>
            {landmarks.map((landmark, index) => (
              <li key={landmark.id}>
                <button
                  type="button"
                  onClick={() => setSelected(index)}
                  className={selected === index ? "is-selected" : ""}
                >
                  Marker {landmark.id}{" "}
                  <span
                    className={
                      landmark.image
                        ? "calibration__landmark-status is-placed"
                        : "calibration__landmark-status"
                    }
                  >
                    {landmark.image ? "Placed" : "Required"}
                  </span>
                </button>
                <small>
                  Court ({landmark.court.x}, {landmark.court.y})
                </small>
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

function CourtDiagram({ selected }: { selected: number }) {
  return (
    <svg
      className="calibration__court"
      viewBox="0 0 305 670"
      role="img"
      aria-label="Fixed A to D doubles court reference diagram"
    >
      <rect x="2" y="2" width="301" height="666" />
      <path d="M2 335h301M2 236h301M2 434h301M75 2v666M230 2v666" />
      {doublesCorners.map((landmark, index) => (
        <text
          key={landmark.id}
          className={selected === index ? "is-selected" : ""}
          x={landmark.id === "A" || landmark.id === "D" ? 15 : 275}
          y={landmark.id === "A" || landmark.id === "B" ? 30 : 655}
        >
          {landmark.id}
        </text>
      ))}
    </svg>
  );
}
