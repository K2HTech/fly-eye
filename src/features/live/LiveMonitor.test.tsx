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
        name: /simulated 30-second review buffer with 3 displayed rallies/i,
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

  it("disables rally review and its F1 shortcut when camera testing is active", () => {
    const onReview = vi.fn();
    render(
      <LiveMonitor
        mode="test"
        onReview={onReview}
        reviewEnabled={false}
        reviewUnavailableMessage="Rally review is unavailable in test camera preview."
      />,
    );

    const review = screen.getByRole("button", { name: /review last rally/i });
    expect(review).toBeDisabled();
    expect(review).toHaveAccessibleDescription(
      /rally review is unavailable in test camera preview/i,
    );
    fireEvent.keyDown(window, { key: "F1" });

    expect(onReview).not.toHaveBeenCalled();
  });

  it("exposes camera feeds and system chips as named regions/statuses", () => {
    render(<LiveMonitor onReview={vi.fn()} />);

    expect(screen.getByRole("region", { name: "Camera feeds" })).toBeVisible();
    expect(screen.getAllByRole("status")).toHaveLength(3);
  });

  it("renders a live preview and offers setup recovery only when requested", () => {
    const onReturnToSetup = vi.fn();
    render(
      <LiveMonitor
        cameras={[
          {
            id: "A",
            name: "Cam A",
            position: "sideline",
            resolution: "1280×720",
            frameRate: 30,
            latencyMs: 0,
            status: "online",
            stream: {} as MediaStream,
          },
          {
            id: "B",
            name: "Cam B",
            position: "baseline",
            resolution: "1280×720",
            frameRate: 30,
            latencyMs: 0,
            status: "offline",
          },
        ]}
        onReturnToSetup={onReturnToSetup}
        onReview={vi.fn()}
      />,
    );

    expect(screen.getByLabelText(/cam a live camera preview/i)).toBeVisible();
    fireEvent.click(
      screen.getByRole("button", { name: /return to camera setup/i }),
    );
    expect(onReturnToSetup).toHaveBeenCalledOnce();
  });
});
