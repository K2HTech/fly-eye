import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { describe, expect, it } from "vitest";

import App from "../../App";
import { createAppMemoryRouter } from "../../app/router";
import { createLocalAppServices } from "../../infrastructure/local";
import { MemoryStorage } from "../../test/MemoryStorage";

const draftInput = {
  eventName: "Fly Eye Open",
  court: "Court 2",
  competitionType: "singles" as const,
  sideA: { displayName: "Nguyen", players: ["Nguyen"] },
  sideB: { displayName: "Tran", players: ["Tran"] },
  format: { bestOfGames: 3, pointsToWin: 21 },
};

async function authenticatedApp(withDraft = false) {
  const services = createLocalAppServices(new MemoryStorage(), {
    createId: (prefix) => `${prefix}-42`,
    now: () => "2026-08-22T10:00:00.000Z",
  });
  await services.auth.continueAsDemo();
  if (withDraft) await services.matches.create(draftInput);
  const router = createAppMemoryRouter(["/matches"]);
  const result = render(<App router={router} services={services} />);
  await screen.findByRole("heading", { name: /match dashboard/i });
  return { ...result, router };
}

describe("match dashboard integration", () => {
  it("shows the normal first-run empty state and opens match creation", async () => {
    const user = userEvent.setup();
    const { router } = await authenticatedApp();

    expect(screen.getByText(/no matches yet/i)).toBeVisible();
    await user.click(
      screen.getByRole("button", { name: /create your first match/i }),
    );

    expect(
      await screen.findByRole("heading", { name: /create match/i }),
    ).toBeVisible();
    expect(router.state.location.pathname).toBe("/matches/new");
  });

  it("loads a persisted draft and resumes it at readiness", async () => {
    const user = userEvent.setup();
    const { router } = await authenticatedApp(true);

    expect(await screen.findByText("Fly Eye Open")).toBeVisible();
    expect(screen.getByText("Nguyen vs Tran")).toBeVisible();
    await user.click(screen.getByRole("button", { name: /continue setup/i }));

    expect(
      await screen.findByRole("heading", { name: /hardware readiness/i }),
    ).toBeVisible();
    expect(router.state.location.pathname).toBe("/matches/match-42/readiness");
  });

  it("has no automated accessibility violations in the empty state", async () => {
    const { container } = await authenticatedApp();
    const result = await axe.run(container, {
      rules: {
        // JSDOM cannot calculate the rendered palette contrast.
        "color-contrast": { enabled: false },
      },
    });

    expect(result.violations).toEqual([]);
  });
});
