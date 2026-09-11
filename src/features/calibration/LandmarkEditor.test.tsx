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
});
