import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ClipInspector } from "./ClipInspector";

describe("ClipInspector", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("renders the clip facts and accessible selection control", () => {
    render(<ClipInspector />);

    expect(screen.getByRole("complementary", { name: "Clip" })).toBeVisible();
    expect(screen.getByText("00:11.42")).toBeVisible();
    expect(screen.getByText("00:13.08")).toBeVisible();
    expect(screen.getByText("1.66 s · 199 f")).toBeVisible();
    expect(screen.getByText("186 / 199")).toBeVisible();
    expect(screen.getByText("1284")).toBeVisible();
    expect(screen.getByText("Back boundary")).toBeVisible();
    expect(screen.getByText("Reconstructing trajectory — 68%")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Find it for me" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("switches between automatic and manual landing-frame selection", () => {
    render(<ClipInspector />);
    const automatic = screen.getByRole("button", { name: "Find it for me" });
    const manual = screen.getByRole("button", { name: "I'll pick it" });

    fireEvent.click(manual);

    expect(manual).toHaveAttribute("aria-pressed", "true");
    expect(automatic).toHaveAttribute("aria-pressed", "false");
  });

  it("runs the deterministic reconstruction and calls onDecision once", () => {
    const onDecision = vi.fn();
    render(<ClipInspector onDecision={onDecision} />);

    fireEvent.click(screen.getByRole("button", { name: /get the call/i }));
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "0",
    );

    act(() => vi.advanceTimersByTime(120));
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "25",
    );
    act(() => vi.advanceTimersByTime(360));

    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "100",
    );
    expect(onDecision).toHaveBeenCalledTimes(1);
    expect(onDecision).toHaveBeenCalledWith({
      selectionMode: "automatic",
      landingFrame: 1284,
    });

    act(() => vi.runAllTimers());
    expect(onDecision).toHaveBeenCalledTimes(1);
  });

  it("accepts Enter as the hardware shortcut without a duplicate run", () => {
    const onDecision = vi.fn();
    render(<ClipInspector onDecision={onDecision} />);

    fireEvent.keyDown(window, { key: "Enter" });
    fireEvent.keyDown(window, { key: "Enter" });
    act(() => vi.runAllTimers());

    expect(onDecision).toHaveBeenCalledTimes(1);
  });

  it("cleans up an in-flight reconstruction when unmounted", () => {
    const onDecision = vi.fn();
    const { unmount } = render(<ClipInspector onDecision={onDecision} />);

    fireEvent.click(screen.getByRole("button", { name: /get the call/i }));
    unmount();
    act(() => vi.runAllTimers());

    expect(onDecision).not.toHaveBeenCalled();
  });
});
