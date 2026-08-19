import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { CourtScene } from "./CourtScene";

afterEach(cleanup);

describe("CourtScene", () => {
  it("renders an accessible sideline scene with a trajectory, landing point, and player", () => {
    render(<CourtScene />);

    const scene = screen.getByRole("img", {
      name: "Sideline camera view of a badminton court",
    });

    expect(scene).toHaveAttribute("data-variant", "sideline");
    expect(within(scene).getByTestId("shuttle-trajectory")).toBeTruthy();
    expect(within(scene).getByTestId("landing-point")).toBeTruthy();
    expect(within(scene).getByTestId("player")).toBeTruthy();
    expect(within(scene).queryByTestId("detection-box")).toBeNull();
  });

  it("renders the baseline detection box without a player", () => {
    render(<CourtScene variant="baseline" />);

    const scene = screen.getByRole("img", {
      name: "Baseline camera view of a badminton court",
    });

    expect(within(scene).getByTestId("shuttle-trajectory")).toBeTruthy();
    expect(within(scene).getByTestId("landing-point")).toBeTruthy();
    expect(within(scene).getByTestId("detection-box")).toBeTruthy();
    expect(within(scene).queryByTestId("player")).toBeNull();
  });

  it("supports custom accessible labeling and descriptions", () => {
    render(
      <CourtScene
        variant="baseline"
        ariaLabel="Baseline evidence frame"
        description="A dashed box surrounds the detected shuttle near the back line."
      />,
    );

    const scene = screen.getByRole("img", { name: "Baseline evidence frame" });
    expect(scene).toHaveAccessibleDescription(
      "A dashed box surrounds the detected shuttle near the back line.",
    );
  });

  it("can be marked decorative when nearby text provides the context", () => {
    const { container } = render(
      <CourtScene variant="sideline" decorative ariaLabel="Ignored label" />,
    );

    const scene = container.querySelector("svg");
    expect(scene).toHaveAttribute("aria-hidden", "true");
    expect(scene).not.toHaveAttribute("role");
    expect(container.querySelector('[role="img"]')).toBeNull();
  });
});
