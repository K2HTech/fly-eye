import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { CapturedCalibrationFrame } from "../../services";
import { LandmarkEditor } from "./LandmarkEditor";
import { initialLandmarks } from "./landmarks";

const frame: CapturedCalibrationFrame = {
  bytes: new Blob(["frame"], { type: "image/jpeg" }),
  previewDataUrl: "data:image/jpeg;base64,ZmFrZQ==",
  width: 200,
  height: 200,
  declaration: {
    contentType: "image/jpeg",
    sizeBytes: 5,
    checksumSha256: "a".repeat(64),
  },
};

describe("LandmarkEditor", () => {
  it("does not render a fabricated marker before the operator places it", () => {
    render(
      <LandmarkEditor
        frame={frame}
        landmarks={initialLandmarks()}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getAllByText("Not placed")).toHaveLength(4);
    expect(screen.queryByLabelText(/Marker D, image/i)).not.toBeInTheDocument();
  });

  it("converts a frame click to the exact raw-frame coordinate", () => {
    const onChange = vi.fn();
    render(
      <LandmarkEditor
        frame={frame}
        landmarks={initialLandmarks()}
        onChange={onChange}
      />,
    );
    const canvas = screen.getByRole("application");
    vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 0,
      width: 100,
      height: 50,
      top: 0,
      right: 100,
      bottom: 50,
      left: 0,
      toJSON: () => ({}),
    });

    fireEvent.click(canvas, { clientX: 50, clientY: 25 });

    expect(onChange).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: "A", image: { x: 100, y: 100 } }),
      ]),
    );
  });

  it("keeps the selected marker active until the operator chooses another", () => {
    const onChange = vi.fn();
    const landmarks = initialLandmarks().map((landmark, index) =>
      index === 0 ? { ...landmark, image: { x: 20, y: 20 } } : landmark,
    );
    render(
      <LandmarkEditor
        frame={frame}
        landmarks={landmarks}
        onChange={onChange}
      />,
    );
    const canvas = screen.getByRole("application");
    vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      top: 0,
      right: 100,
      bottom: 100,
      left: 0,
      toJSON: () => ({}),
    });

    fireEvent.click(canvas, { clientX: 25, clientY: 75 });

    const next = onChange.mock.calls[0][0];
    expect(next[0].image).toEqual({ x: 50, y: 150 });
    expect(next[1].image).toBeUndefined();
  });

  it("only enables coordinate editing for the selected marker", () => {
    const landmarks = initialLandmarks().map((landmark, index) => ({
      ...landmark,
      image: { x: 20 + index, y: 30 + index },
    }));
    render(
      <LandmarkEditor frame={frame} landmarks={landmarks} onChange={vi.fn()} />,
    );

    const imageX = screen.getAllByLabelText("Image X");
    expect(imageX[0]).toBeEnabled();
    expect(imageX[1]).toBeDisabled();

    fireEvent.click(screen.getAllByRole("button", { name: /Marker B/i })[1]);

    expect(screen.getAllByLabelText("Image X")[0]).toBeDisabled();
    expect(screen.getAllByLabelText("Image X")[1]).toBeEnabled();
  });

  it("preserves raw coordinates after zooming and panning the frame", () => {
    const onChange = vi.fn();
    render(
      <LandmarkEditor
        frame={frame}
        landmarks={initialLandmarks()}
        onChange={onChange}
      />,
    );
    const viewport = screen.getByLabelText(
      "Zoomable captured calibration frame",
    );
    vi.spyOn(viewport, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      top: 0,
      right: 100,
      bottom: 100,
      left: 0,
      toJSON: () => ({}),
    });
    fireEvent.wheel(viewport, { clientX: 50, clientY: 50, deltaY: -1000 });
    const canvas = screen.getByRole("application");
    expect(canvas).not.toHaveStyle({ width: "100%" });
    vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue({
      x: -300,
      y: -100,
      width: 400,
      height: 400,
      top: -100,
      right: 100,
      bottom: 300,
      left: -300,
      toJSON: () => ({}),
    });

    fireEvent.click(canvas, { clientX: -100, clientY: 100 });

    expect(onChange).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: "A", image: { x: 100, y: 100 } }),
      ]),
    );
  });

  it("zooms with the mouse wheel without placing a marker", () => {
    const onChange = vi.fn();
    render(
      <LandmarkEditor
        frame={frame}
        landmarks={initialLandmarks()}
        onChange={onChange}
      />,
    );

    const viewport = screen.getByLabelText(
      "Zoomable captured calibration frame",
    );
    vi.spyOn(viewport, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      top: 0,
      right: 100,
      bottom: 100,
      left: 0,
      toJSON: () => ({}),
    });

    fireEvent.wheel(viewport, { clientX: 50, clientY: 50, deltaY: -300 });

    expect(screen.getByRole("application")).not.toHaveStyle({ width: "100%" });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("cancels browser scrolling for wheel input inside the frame", () => {
    render(
      <LandmarkEditor
        frame={frame}
        landmarks={initialLandmarks()}
        onChange={vi.fn()}
      />,
    );
    const viewport = screen.getByLabelText(
      "Zoomable captured calibration frame",
    );
    vi.spyOn(viewport, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      top: 0,
      right: 100,
      bottom: 100,
      left: 0,
      toJSON: () => ({}),
    });
    const event = new WheelEvent("wheel", {
      bubbles: true,
      cancelable: true,
      clientX: 50,
      clientY: 50,
      deltaY: -200,
    });

    viewport.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });
});
