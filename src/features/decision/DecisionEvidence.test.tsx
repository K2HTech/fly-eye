import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DecisionEvidence } from "./DecisionEvidence";

describe("DecisionEvidence", () => {
  it("renders the default OUT evidence with an accessible description", () => {
    render(<DecisionEvidence />);

    expect(
      screen.getByRole("img", { name: /top-down court reconstruction/i }),
    ).toHaveAttribute(
      "aria-label",
      expect.stringContaining("24 millimetres OUT"),
    );
    expect(screen.getByText("24 mm OUT")).toBeInTheDocument();
    expect(screen.getByText("CAM A + CAM B")).toBeInTheDocument();
  });

  it("accepts an IN verdict, distance, and camera label", () => {
    render(<DecisionEvidence verdict="IN" distanceMm={7} cameraLabel="B" />);

    expect(screen.getByText("7 mm IN")).toBeInTheDocument();
    expect(screen.getByText("CAM B")).toBeInTheDocument();
    expect(screen.getByRole("img")).toHaveAttribute(
      "aria-label",
      expect.stringContaining("using cameras B"),
    );
  });
});
