import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import App from "./App";

afterEach(() => vi.useRealTimers());

describe("App", () => {
  it("opens on the live operator monitor", () => {
    render(<App />);

    expect(screen.getByRole("region", { name: "Live monitor" })).toBeVisible();
    expect(screen.getByText("FLY EYE")).toBeVisible();
    expect(screen.getAllByText(/120 fps/i)).toHaveLength(2);
    expect(
      screen.getByRole("button", { name: /review last rally/i }),
    ).toBeEnabled();
  });

  it("moves between the live monitor and synchronized clip review", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /review last rally/i }));
    expect(screen.getByRole("heading", { name: /clip review/i })).toBeVisible();
    expect(screen.getAllByText("f 1284")).toHaveLength(2);

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.getByRole("region", { name: "Live monitor" })).toBeVisible();
  });

  it("completes the simulated review and supports decision exit routes", () => {
    vi.useFakeTimers();
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /review last rally/i }));
    fireEvent.click(screen.getByRole("button", { name: /get the call/i }));
    act(() => vi.advanceTimersByTime(600));

    expect(screen.getByRole("heading", { name: /the call/i })).toBeVisible();
    expect(
      screen.getByRole("status", { name: /shuttle was out/i }),
    ).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: /run it again/i }));
    expect(screen.getByRole("heading", { name: /clip review/i })).toBeVisible();
  });
});
