import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ClipReview } from "./ClipReview";
import type { RallyAnalysis } from "../../services";

const runningAnalysis: RallyAnalysis = {
  id: "00000000-0000-4000-8000-000000000001",
  clipId: "00000000-0000-4000-8000-000000000002",
  status: "running",
  progress: 0.4,
  stage: "analyzing",
  verdict: null,
  confidence: null,
  landing: null,
  uncertaintyCm: null,
  nearestLine: null,
  distanceToLineCm: null,
  reasonCode: null,
  reasonText: null,
  perCamera: null,
  overlays: { frame: null, topdown: null, trajectory: null },
  error: null,
};

afterEach(cleanup);

describe("ClipReview", () => {
  it("keeps both paused cameras synchronized to transport changes", () => {
    render(<ClipReview onBack={vi.fn()} onDecision={vi.fn()} />);

    expect(screen.getAllByText("f 1284")).toHaveLength(2);
    fireEvent.click(
      screen.getByRole("button", { name: "Step forward 1 frame" }),
    );

    expect(screen.getAllByText("f 1285")).toHaveLength(2);
    expect(
      screen.getByLabelText("Current synchronized frame"),
    ).toHaveTextContent("frame 1285");
  });

  it("returns to live with Escape", () => {
    const onBack = vi.fn();
    render(<ClipReview onBack={onBack} onDecision={vi.fn()} />);

    fireEvent.keyDown(window, { key: "Escape" });

    expect(onBack).toHaveBeenCalledOnce();
  });

  it("names the synchronized status and paused camera states", () => {
    render(<ClipReview onBack={vi.fn()} onDecision={vi.fn()} />);

    expect(
      screen.getByRole("status", { name: /camera synchronization status/i }),
    ).toBeVisible();
    expect(screen.getAllByRole("status", { name: "PAUSED" })).toHaveLength(2);
  });

  it("shows backend progress and captured video instead of simulated review controls", () => {
    render(
      <ClipReview
        analysis={runningAnalysis}
        media={[{ role: "SIDELINE_LEFT", url: "blob:camera-a" }]}
        onBack={vi.fn()}
        onDecision={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("status", { name: "Rally analysis status" }),
    ).toHaveTextContent("Analysis analyzing 40%");
    expect(
      screen.getByLabelText("Captured camera A sideline review video"),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Get the call" }),
    ).not.toBeInTheDocument();
  });
});
