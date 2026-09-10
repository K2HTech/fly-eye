import { useState, type KeyboardEvent } from "react";
import type {
  CalibrationPoint,
  CalibrationSeedPoint,
  CapturedCalibrationFrame,
} from "../../services";
import { doublesCorners, lineIntersection, nudgeSeed } from "./landmarks";

interface LandmarkEditorProps {
  readonly frame: CapturedCalibrationFrame;
  readonly seeds: readonly CalibrationSeedPoint[];
  onChange(seeds: readonly CalibrationSeedPoint[]): void;
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
  seeds,
  onChange,
}: LandmarkEditorProps) {
  const [selected, setSelected] = useState(0);
  const [helper, setHelper] = useState(false);
  const [lines, setLines] = useState([
    emptyPoint(),
    emptyPoint(),
    emptyPoint(),
    emptyPoint(),
  ]);
  const update = (index: number, image: CalibrationPoint) =>
    onChange(
      seeds.map((seed, seedIndex) =>
        seedIndex === index ? { ...seed, image } : seed,
      ),
    );
  const moveFromClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    update(selected, {
      x: ((event.clientX - bounds.left) / bounds.width) * frame.width,
      y: ((event.clientY - bounds.top) / bounds.height) * frame.height,
    });
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
      nudgeSeed(
        seeds,
        selected,
        axis,
        event.key === "ArrowLeft" || event.key === "ArrowUp" ? -delta : delta,
      ),
    );
  };
  const intersect = () => {
    const value = lineIntersection(lines[0], lines[1], lines[2], lines[3]);
    if (value) update(selected, value);
  };
  return (
    <section className="calibration__seeding" aria-labelledby="seed-title">
      <div>
        <p className="calibration__eyebrow">STEP 2 OF 3</p>
        <h2 id="seed-title">Place doubles-court markers</h2>
        <p>
          Use the same fixed A–D court frame for every camera. Coordinates are
          raw pixels; values outside the image are valid.
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
            {seeds.map((seed, index) => (
              <button
                key={doublesCorners[index].id}
                type="button"
                className={`calibration__marker ${selected === index ? "is-selected" : ""}`}
                style={{
                  left: `${(seed.image.x / frame.width) * 100}%`,
                  top: `${(seed.image.y / frame.height) * 100}%`,
                }}
                onClick={(event) => {
                  event.stopPropagation();
                  setSelected(index);
                }}
                onKeyDown={keyMove}
                aria-label={`Marker ${doublesCorners[index].id}, image x ${seed.image.x}, y ${seed.image.y}`}
              >
                {doublesCorners[index].id}
              </button>
            ))}
          </div>
          <p className="calibration__hint">
            Click the frame to move the selected marker. Arrow keys move it 1
            px; Shift + Arrow moves 10 px.
          </p>
        </div>
        <aside
          className="calibration__landmark-list"
          aria-label="Court landmarks"
        >
          <CourtDiagram selected={selected} />
          <ol>
            {seeds.map((seed, index) => (
              <li key={doublesCorners[index].id}>
                <button
                  type="button"
                  onClick={() => setSelected(index)}
                  className={selected === index ? "is-selected" : ""}
                >
                  Marker {doublesCorners[index].id}{" "}
                  <span>
                    ({doublesCorners[index].court.x},{" "}
                    {doublesCorners[index].court.y})
                  </span>
                </button>
                <label>
                  Image X
                  <input
                    type="number"
                    value={seed.image.x}
                    onChange={(event) => {
                      const value = number(event.target.value);
                      if (value !== null)
                        update(index, { ...seed.image, x: value });
                    }}
                  />
                </label>
                <label>
                  Image Y
                  <input
                    type="number"
                    value={seed.image.y}
                    onChange={(event) => {
                      const value = number(event.target.value);
                      if (value !== null)
                        update(index, { ...seed.image, y: value });
                    }}
                  />
                </label>
              </li>
            ))}
          </ol>
          <button type="button" onClick={() => setHelper(!helper)}>
            Extend two court lines
          </button>
          {helper && (
            <div className="calibration__intersection">
              <p>
                Enter two visible points on each line. Their intersection
                becomes the selected marker.
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
