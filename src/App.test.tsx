import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import App from "./App";

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
});
