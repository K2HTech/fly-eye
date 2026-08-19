import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ClipReview } from "./ClipReview";

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
});
