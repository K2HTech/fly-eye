import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DecisionScreen } from "./DecisionScreen";
import type { RallyAnalysis } from "../../services";

const inconclusiveAnalysis: RallyAnalysis = {
  id: "00000000-0000-4000-8000-000000000001",
  clipId: "00000000-0000-4000-8000-000000000002",
  status: "done",
  progress: 1,
  stage: "done",
  verdict: "INCONCLUSIVE",
  confidence: 0.42,
  landing: null,
  uncertaintyCm: null,
  nearestLine: null,
  distanceToLineCm: null,
  reasonCode: "INSUFFICIENT_EVIDENCE",
  reasonText: "The shuttle could not be tracked reliably.",
  perCamera: null,
  overlays: { frame: null, topdown: null, trajectory: null },
  error: null,
};

describe("DecisionScreen", () => {
  it("combines the verdict, confidence, facts, and visual evidence", () => {
    render(<DecisionScreen onRunAgain={vi.fn()} onBackToLive={vi.fn()} />);

    expect(screen.getByRole("heading", { name: /the call/i })).toBeVisible();
    expect(screen.getByText("Confidence 96%")).toBeVisible();
    expect(
      screen.getByRole("status", { name: "Decision confidence 96%" }),
    ).toBeVisible();
    expect(
      screen.getByRole("status", { name: "Shuttle was OUT" }),
    ).toBeVisible();
    expect(
      screen.getByRole("img", { name: /24 millimetres OUT/i }),
    ).toBeVisible();
    expect(
      screen.getByRole("group", { name: "Evidence legend" }),
    ).toBeVisible();
  });

  it("provides feedback for clip saving", () => {
    render(<DecisionScreen onRunAgain={vi.fn()} onBackToLive={vi.fn()} />);

    expect(
      screen.queryByRole("button", { name: /show on court screen/i }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /save clip/i }));
    expect(screen.getByText(/clip added to the save queue/i)).toBeVisible();
  });

  it("shows an inconclusive backend response without presenting a third official verdict", () => {
    render(
      <DecisionScreen
        analysis={inconclusiveAnalysis}
        onRunAgain={vi.fn()}
        onBackToLive={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: "INCONCLUSIVE" })).toBeVisible();
    expect(
      screen.getByText("The shuttle could not be tracked reliably."),
    ).toBeVisible();
    expect(
      screen.getByText("The umpire must decide this call manually."),
    ).toBeVisible();
    expect(
      screen.queryByRole("status", { name: /Shuttle was/i }),
    ).not.toBeInTheDocument();
  });
});
