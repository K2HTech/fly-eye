import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import App from "../App";
import { matchRoutes } from "./paths";
import { createAppMemoryRouter } from "./router";
import { createLocalAppServices } from "../infrastructure/local";
import { MemoryStorage } from "../test/MemoryStorage";

async function renderWorkflow(pathFor: (matchId: string) => string) {
  const services = createLocalAppServices(new MemoryStorage(), {
    createId: (prefix) => `${prefix}-42`,
    now: () => new Date().toISOString(),
  });
  await services.auth.register({
    displayName: "Test Operator",
    email: "operator@example.com",
    password: "test-password",
    passwordConfirmation: "test-password",
  });
  const match = await services.matches.create({
    eventName: "Fly Eye Open",
    court: "Court 2",
    competitionType: "singles",
    sideA: { displayName: "Nguyen", players: ["Nguyen"] },
    sideB: { displayName: "Tran", players: ["Tran"] },
    format: { bestOfGames: 3, pointsToWin: 21 },
  });
  const router = createAppMemoryRouter([pathFor(match.id)]);
  render(<App router={router} services={services} />);
  return router;
}

describe("operator workflow navigation", () => {
  it.each([
    ["live monitor", matchRoutes.live, /^live monitor$/i],
    ["clip review", matchRoutes.review, /clip review/i],
    ["decision", matchRoutes.decision, /the call/i],
  ] as const)(
    "returns from %s directly to the match dashboard",
    async (_screenName, pathFor, headingName) => {
      const user = userEvent.setup();
      const router = await renderWorkflow(pathFor);
      await screen.findByRole("heading", { name: headingName });

      await user.click(screen.getByRole("link", { name: /^matches$/i }));

      expect(
        await screen.findByRole("heading", { name: /match dashboard/i }),
      ).toBeVisible();
      expect(router.state.location.pathname).toBe("/matches");
    },
  );

  it("returns from a decision to the live monitor for the same match", async () => {
    const user = userEvent.setup();
    const router = await renderWorkflow(matchRoutes.decision);
    await screen.findByRole("heading", { name: /the call/i });

    await user.click(screen.getByRole("button", { name: /back to live/i }));

    expect(
      await screen.findByRole("heading", { name: /^live monitor$/i }),
    ).toBeVisible();
    expect(router.state.location.pathname).toBe("/matches/match-42/live");
  });
});
