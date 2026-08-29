import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { describe, expect, it, vi } from "vitest";

import App from "../../App";
import { createAppMemoryRouter } from "../../app/router";
import { createLocalAppServices } from "../../infrastructure/local";
import type { AppServices } from "../../services";
import { MemoryStorage } from "../../test/MemoryStorage";

async function renderWizard(services?: AppServices) {
  const appServices =
    services ??
    createLocalAppServices(new MemoryStorage(), {
      createId: (prefix) => `${prefix}-42`,
      now: () => new Date().toISOString(),
    });
  await appServices.auth.register({
    email: "operator@example.com",
    password: "test-password",
    passwordConfirmation: "test-password",
  });
  const router = createAppMemoryRouter(["/matches/new"]);
  const result = render(<App router={router} services={appServices} />);
  await screen.findByRole("heading", { name: /create match/i });
  return { ...result, router, services: appServices };
}

async function completeDetails(
  user: ReturnType<typeof userEvent.setup>,
  type: "singles" | "doubles" = "singles",
) {
  await user.type(
    screen.getByRole("textbox", { name: /event or match name/i }),
    "Fly Eye Open",
  );
  await user.type(
    screen.getByRole("textbox", { name: /court name or number/i }),
    "Court 2",
  );
  if (type === "doubles") {
    await user.click(screen.getByRole("radio", { name: /doubles/i }));
  }
  await user.click(
    screen.getByRole("button", { name: /continue to players/i }),
  );
  await screen.findByRole("heading", { name: /players & format/i });
}

describe("create-match workflow", () => {
  it("validates the details step and focuses the first invalid field", async () => {
    const user = userEvent.setup();
    await renderWizard();

    await user.click(
      screen.getByRole("button", { name: /continue to players/i }),
    );

    const eventName = screen.getByRole("textbox", {
      name: /event or match name/i,
    });
    expect(eventName).toHaveFocus();
    expect(eventName).toHaveAccessibleErrorMessage(
      /enter an event or match name/i,
    );
    expect(
      screen.getByRole("textbox", { name: /court name or number/i }),
    ).toHaveAccessibleErrorMessage(/enter a court name or number/i);
  });

  it("creates and persists a singles draft before opening readiness", async () => {
    const user = userEvent.setup();
    const { router, services } = await renderWizard();
    await completeDetails(user);

    const players = screen.getAllByRole("textbox", { name: /player name/i });
    await user.type(players[0], "Nguyen");
    await user.type(players[1], "Tran");
    await user.click(
      screen.getByRole("button", { name: /create match & continue/i }),
    );

    expect(
      await screen.findByRole("heading", { name: /hardware readiness/i }),
    ).toBeVisible();
    expect(router.state.location.pathname).toBe("/matches/match-42/readiness");
    await expect(services.matches.list()).resolves.toEqual([
      expect.objectContaining({
        eventName: "Fly Eye Open",
        court: "Court 2",
        competitionType: "singles",
        sideA: { displayName: "Nguyen", players: ["Nguyen"] },
        sideB: { displayName: "Tran", players: ["Tran"] },
        format: { bestOfGames: 3, pointsToWin: 21 },
        status: "draft",
      }),
    ]);
  });

  it("creates a doubles draft with two players on each side", async () => {
    const user = userEvent.setup();
    const { services } = await renderWizard();
    await completeDetails(user, "doubles");

    const playerOnes = screen.getAllByRole("textbox", { name: /player 1/i });
    const playerTwos = screen.getAllByRole("textbox", { name: /player 2/i });
    await user.click(screen.getByRole("radio", { name: /one game/i }));
    await user.click(screen.getByRole("radio", { name: /15 points/i }));
    await user.type(playerOnes[0], "Nguyen");
    await user.type(playerTwos[0], "Pham");
    await user.type(playerOnes[1], "Tran");
    await user.type(playerTwos[1], "Le");
    await user.click(
      screen.getByRole("button", { name: /create match & continue/i }),
    );

    await waitFor(async () => {
      await expect(services.matches.list()).resolves.toEqual([
        expect.objectContaining({
          competitionType: "doubles",
          sideA: {
            displayName: "Nguyen / Pham",
            players: ["Nguyen", "Pham"],
          },
          sideB: {
            displayName: "Tran / Le",
            players: ["Tran", "Le"],
          },
          format: { bestOfGames: 1, pointsToWin: 15 },
        }),
      ]);
    });
  });

  it("retains doubles player values while switching competition types", async () => {
    const user = userEvent.setup();
    await renderWizard();
    await completeDetails(user, "doubles");

    const playerTwos = screen.getAllByRole("textbox", { name: /player 2/i });
    await user.type(playerTwos[0], "Pham");
    await user.type(playerTwos[1], "Le");
    await user.click(screen.getByRole("button", { name: /^back$/i }));
    await user.click(screen.getByRole("radio", { name: /singles/i }));
    await user.click(screen.getByRole("radio", { name: /doubles/i }));
    await user.click(
      screen.getByRole("button", { name: /continue to players/i }),
    );

    const restored = screen.getAllByRole("textbox", { name: /player 2/i });
    expect(restored[0]).toHaveValue("Pham");
    expect(restored[1]).toHaveValue("Le");
  });

  it("cancels without creating a draft", async () => {
    const user = userEvent.setup();
    const { router, services } = await renderWizard();

    await user.type(
      screen.getByRole("textbox", { name: /event or match name/i }),
      "Discarded match",
    );
    await user.click(screen.getByRole("button", { name: /^cancel$/i }));

    expect(
      await screen.findByRole("heading", { name: /match dashboard/i }),
    ).toBeVisible();
    expect(router.state.location.pathname).toBe("/matches");
    await expect(services.matches.list()).resolves.toEqual([]);
  });

  it("keeps entered values and reports repository failures", async () => {
    const base = createLocalAppServices(new MemoryStorage());
    const services: AppServices = {
      ...base,
      matches: {
        list: () => base.matches.list(),
        get: (id) => base.matches.get(id),
        create: async () => {
          throw new Error("Storage is unavailable.");
        },
        update: (id, input) => base.matches.update(id, input),
        updateStatus: (id, status) => base.matches.updateStatus(id, status),
      },
    };
    const user = userEvent.setup();
    await renderWizard(services);
    await completeDetails(user);
    const players = screen.getAllByRole("textbox", { name: /player name/i });
    await user.type(players[0], "Nguyen");
    await user.type(players[1], "Tran");

    await user.click(
      screen.getByRole("button", { name: /create match & continue/i }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /unable to save this match/i,
    );
    expect(players[0]).toHaveValue("Nguyen");
    expect(players[1]).toHaveValue("Tran");
  });

  it("prevents duplicate drafts while creation is pending", async () => {
    const base = createLocalAppServices(new MemoryStorage());
    let resolveCreate!: (
      match: Awaited<ReturnType<typeof base.matches.create>>,
    ) => void;
    const pendingCreate = new Promise<
      Awaited<ReturnType<typeof base.matches.create>>
    >((resolve) => {
      resolveCreate = resolve;
    });
    const create = vi.fn(() => pendingCreate);
    const services: AppServices = {
      ...base,
      matches: {
        list: () => base.matches.list(),
        get: (id) => base.matches.get(id),
        create,
        update: (id, input) => base.matches.update(id, input),
        updateStatus: (id, status) => base.matches.updateStatus(id, status),
      },
    };
    const user = userEvent.setup();
    await renderWizard(services);
    await completeDetails(user);
    const players = screen.getAllByRole("textbox", { name: /player name/i });
    await user.type(players[0], "Nguyen");
    await user.type(players[1], "Tran");
    const submit = screen.getByRole("button", {
      name: /create match & continue/i,
    });

    await user.click(submit);
    expect(
      screen.getByRole("button", { name: /creating match/i }),
    ).toBeDisabled();
    await user.click(screen.getByRole("button", { name: /creating match/i }));
    expect(create).toHaveBeenCalledOnce();

    resolveCreate(
      await base.matches.create({
        eventName: "Fly Eye Open",
        court: "Court 2",
        competitionType: "singles",
        sideA: { displayName: "Nguyen", players: ["Nguyen"] },
        sideB: { displayName: "Tran", players: ["Tran"] },
        format: { bestOfGames: 3, pointsToWin: 21 },
      }),
    );
    expect(
      await screen.findByRole("heading", { name: /hardware readiness/i }),
    ).toBeVisible();
  });

  it("has no automated accessibility violations on both steps", async () => {
    const user = userEvent.setup();
    const { container } = await renderWizard();
    const axeOptions = {
      rules: { "color-contrast": { enabled: false } },
    };

    expect((await axe.run(container, axeOptions)).violations).toEqual([]);
    await completeDetails(user, "doubles");
    expect((await axe.run(container, axeOptions)).violations).toEqual([]);
  });
});
