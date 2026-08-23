import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DecisionScreen } from "./DecisionScreen";

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
});
