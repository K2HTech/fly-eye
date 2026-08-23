import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DecisionPanel } from "./DecisionPanel";

afterEach(cleanup);

describe("DecisionPanel", () => {
  it("renders the default verdict and decision facts accessibly", () => {
    render(<DecisionPanel />);

    expect(
      screen.getByRole("heading", { name: "Decision result and actions" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("status", { name: "Shuttle was OUT" }),
    ).toBeVisible();
    expect(screen.getByText("SHUTTLE WAS")).toBeVisible();
    expect(screen.getByText("OUT")).toBeVisible();
    expect(screen.getByText(/by/)).toHaveTextContent(
      "by 24 mm · back boundary",
    );
    expect(screen.getByText("1284")).toBeVisible();
    expect(screen.getByText("A + B")).toBeVisible();
    expect(screen.getByText("1.8 px")).toBeVisible();
    expect(screen.getByText("42 min")).toBeVisible();
  });

  it("renders supplied result details and keeps the verdict status named", () => {
    render(
      <DecisionPanel
        result={{
          verdict: "IN",
          marginMm: 7,
          line: "Side boundary",
          landingFrame: 1300,
        }}
      />,
    );

    expect(
      screen.getByRole("status", { name: "Shuttle was IN" }),
    ).toBeVisible();
    expect(screen.getByText("IN")).toBeVisible();
    expect(screen.getByText(/by/)).toHaveTextContent("by 7 mm · side boundary");
    expect(screen.getByText("1300")).toBeVisible();
    expect(screen.getByText("A + B")).toBeVisible();
  });

  it("routes each action to its typed callback", () => {
    const callbacks = {
      onRunAgain: vi.fn(),
      onSaveClip: vi.fn(),
      onBackToLive: vi.fn(),
    };
    render(<DecisionPanel {...callbacks} />);

    fireEvent.click(screen.getByRole("button", { name: "Run it again" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Save clip to match folder" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Back to live" }));

    expect(callbacks.onRunAgain).toHaveBeenCalledOnce();
    expect(callbacks.onSaveClip).toHaveBeenCalledOnce();
    expect(callbacks.onBackToLive).toHaveBeenCalledOnce();
  });

  it("routes Escape to back-to-live once and removes the listener on unmount", () => {
    const onBackToLive = vi.fn();
    const { unmount } = render(<DecisionPanel onBackToLive={onBackToLive} />);

    fireEvent.keyDown(window, { key: "Escape" });
    fireEvent.keyDown(window, { key: "Escape", repeat: true });
    expect(onBackToLive).toHaveBeenCalledOnce();

    unmount();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onBackToLive).toHaveBeenCalledOnce();
  });
});
