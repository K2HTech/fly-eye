import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DecisionScreen } from "./DecisionScreen";

describe("DecisionScreen", () => {
  it("combines the verdict, confidence, facts, and visual evidence", () => {
    render(<DecisionScreen onRunAgain={vi.fn()} onBackToLive={vi.fn()} />);

    expect(screen.getByRole("heading", { name: /the call/i })).toBeVisible();
    expect(screen.getByText("Confidence 96%")).toBeVisible();
    expect(
      screen.getByRole("status", { name: "Shuttle was OUT" }),
    ).toBeVisible();
    expect(
      screen.getByRole("img", { name: /24 millimetres OUT/i }),
    ).toBeVisible();
  });

  it("provides honest simulated feedback for external UI actions", () => {
    render(<DecisionScreen onRunAgain={vi.fn()} onBackToLive={vi.fn()} />);

    fireEvent.click(
      screen.getByRole("button", { name: /show on court screen/i }),
    );
    expect(screen.getByText(/court-screen preview ready/i)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: /save clip/i }));
    expect(screen.getByText(/clip save queued/i)).toBeVisible();
  });
});
