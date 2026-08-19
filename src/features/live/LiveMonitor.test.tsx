import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LiveMonitor } from "./LiveMonitor";

describe("LiveMonitor", () => {
  afterEach(cleanup);

  it("exposes the match, camera, and buffer information accessibly", () => {
    render(<LiveMonitor onReview={vi.fn()} />);

    expect(screen.getByRole("region", { name: /live monitor/i })).toBeVisible();
    expect(screen.getByText("FLY EYE")).toBeVisible();
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
});
