import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LiveMonitor } from "./LiveMonitor";

describe("LiveMonitor", () => {
  afterEach(cleanup);

  it("exposes the match, camera, and buffer information accessibly", () => {
    render(<LiveMonitor onReview={vi.fn()} />);

    expect(screen.getByRole("region", { name: /live monitor/i })).toBeVisible();
    expect(screen.getByText("Nguyen / Tran")).toBeVisible();
    expect(
      screen.getByRole("heading", { name: /cam a — sideline/i }),
    ).toBeVisible();
    expect(
      screen.getByRole("img", { name: /cam b baseline camera view/i }),
    ).toBeVisible();
    expect(
      screen.getByRole("img", {
        name: /last 30 seconds recorded with 3 detected rallies/i,
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: /review last rally/i }),
    ).toBeVisible();
  });

  it("calls onReview from the primary button and F1 shortcut", () => {
    const onReview = vi.fn();
    render(<LiveMonitor onReview={onReview} />);

    fireEvent.click(screen.getByRole("button", { name: /review last rally/i }));
    fireEvent.keyDown(window, { key: "F1" });

    expect(onReview).toHaveBeenCalledTimes(2);
  });

  it("does not repeat the F1 action while the key is held", () => {
    const onReview = vi.fn();
    render(<LiveMonitor onReview={onReview} />);

    fireEvent.keyDown(window, { key: "F1", repeat: true });

    expect(onReview).not.toHaveBeenCalled();
  });

  it("exposes camera feeds and system chips as named regions/statuses", () => {
    render(<LiveMonitor onReview={vi.fn()} />);

    expect(screen.getByRole("region", { name: "Camera feeds" })).toBeVisible();
    expect(screen.getAllByRole("status")).toHaveLength(3);
  });
});
