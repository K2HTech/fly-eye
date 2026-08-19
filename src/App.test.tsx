import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import App from "./App";

describe("App", () => {
  it("welcomes the operator to the ready workspace foundation", () => {
    render(<App />);

    expect(screen.getByRole("banner")).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: /operator workspace is ready/i }),
    ).toBeTruthy();
    expect(
      screen.getByRole("status", { name: /workspace status: ready/i }),
    ).toBeTruthy();
    expect(
      screen.getByText(/monitoring and review surfaces will be added/i),
    ).toBeTruthy();
  });
});
