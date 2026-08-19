import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ReviewTransport } from "./ReviewTransport";

const renderTransport = (
  overrides: Partial<React.ComponentProps<typeof ReviewTransport>> = {},
) => {
  const props = {
    minFrame: 100,
    maxFrame: 200,
    currentFrame: 150,
    startFrame: 120,
    endFrame: 180,
    impactFrame: 164,
    onCurrentFrameChange: vi.fn(),
    onStartFrameChange: vi.fn(),
    onEndFrameChange: vi.fn(),
    ...overrides,
  };
  return { ...render(<ReviewTransport {...props} />), props };
};

describe("ReviewTransport", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("renders an accessible timeline and speed label", () => {
    renderTransport({ playbackRate: 0.5 });
    expect(screen.getByRole("slider", { name: "Current frame" })).toHaveValue(
      "150",
    );
    expect(screen.getByText("0.5×")).toBeInTheDocument();
    expect(screen.getByLabelText("Start frame 120")).toBeInTheDocument();
    expect(screen.getByLabelText("Impact frame 164")).toBeInTheDocument();
  });

  it("calls the parent for transport controls", () => {
    const { props } = renderTransport();
    fireEvent.click(
      screen.getByRole("button", { name: "Step backward 10 frames" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Step forward 1 frame" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Go to end frame 180" }),
    );
    expect(props.onCurrentFrameChange).toHaveBeenNthCalledWith(1, 140);
    expect(props.onCurrentFrameChange).toHaveBeenNthCalledWith(2, 151);
    expect(props.onCurrentFrameChange).toHaveBeenNthCalledWith(3, 180);
  });

  it("supports frame stepping and marking from the keyboard", () => {
    const { props } = renderTransport();
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    fireEvent.keyDown(window, { key: "ArrowRight" });
    fireEvent.keyDown(window, { key: "[" });
    fireEvent.keyDown(window, { key: "]" });
    expect(props.onCurrentFrameChange).toHaveBeenNthCalledWith(1, 149);
    expect(props.onCurrentFrameChange).toHaveBeenNthCalledWith(2, 151);
    expect(props.onStartFrameChange).toHaveBeenCalledWith(150);
    expect(props.onEndFrameChange).toHaveBeenCalledWith(150);
  });

  it("advances while playing and cleans up its timer", () => {
    const { props, unmount } = renderTransport({
      defaultPlaying: true,
      frameRate: 10,
      playbackRate: 1,
    });
    act(() => vi.advanceTimersByTime(100));
    expect(props.onCurrentFrameChange).toHaveBeenCalledWith(151);
    unmount();
    act(() => vi.advanceTimersByTime(500));
    expect(props.onCurrentFrameChange).toHaveBeenCalledTimes(1);
  });
});
