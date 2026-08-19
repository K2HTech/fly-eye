import { render } from "@testing-library/react";
import axe from "axe-core";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { DecisionScreen } from "./features/decision";
import { LiveMonitor } from "./features/live";
import { ClipReview } from "./features/review";

async function expectNoAccessibilityViolations(ui: ReactNode) {
  const { container } = render(ui);
  const result = await axe.run(container, {
    rules: {
      // JSDOM has no layout/paint engine; contrast is reviewed in the visual
      // palette and cannot be measured meaningfully in this test environment.
      "color-contrast": { enabled: false },
    },
  });

  expect(result.violations).toEqual([]);
}

describe("operator screens", () => {
  it("has no automated accessibility violations on the live monitor", async () => {
    await expectNoAccessibilityViolations(<LiveMonitor onReview={vi.fn()} />);
  });

  it("has no automated accessibility violations in clip review", async () => {
    await expectNoAccessibilityViolations(
      <ClipReview onBack={vi.fn()} onDecision={vi.fn()} />,
    );
  });

  it("has no automated accessibility violations on the decision screen", async () => {
    await expectNoAccessibilityViolations(
      <DecisionScreen onRunAgain={vi.fn()} onBackToLive={vi.fn()} />,
    );
  });
});
