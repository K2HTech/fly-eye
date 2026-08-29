import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { describe, expect, it, vi } from "vitest";

import App from "../../App";
import { createAppMemoryRouter } from "../../app/router";
import type { CameraStatus, MatchStatus } from "../../domain";
import { createLocalAppServices } from "../../infrastructure/local";
import type { AppServices, CreateMatchInput } from "../../services";
import { MemoryStorage } from "../../test/MemoryStorage";

const matchInput: CreateMatchInput = {
  eventName: "Fly Eye Open",
  court: "Court 2",
  competitionType: "singles",
  sideA: { displayName: "Nguyen", players: ["Nguyen"] },
  sideB: { displayName: "Tran", players: ["Tran"] },
  format: { bestOfGames: 3, pointsToWin: 15 },
};

const profile = {
  id: "demo-known-good-court-profile",
  name: "Known-good badminton court profile",
  simulated: true,
} as const;

async function readinessApp(options?: {
  services?: AppServices;
  ready?: boolean;
  status?: Exclude<MatchStatus, "draft">;
  cameraAStatus?: CameraStatus;
  demo?: boolean;
}) {
  const services =
    options?.services ??
    createLocalAppServices(new MemoryStorage(), {
      createId: (prefix) => `${prefix}-42`,
      now: () => new Date().toISOString(),
    });
  if (options?.demo) {
    await services.auth.continueAsDemo();
  } else {
    await services.auth.register({
      email: "operator@example.com",
      password: "test-password",
      passwordConfirmation: "test-password",
    });
  }
  const match = await services.matches.create(matchInput);
  if (options?.demo) await services.auth.assignDemoMatch(match.id);
  if (options?.cameraAStatus) {
    await services.readiness.save(match.id, {
      cameraA: { status: options.cameraAStatus, simulated: true },
    });
  }
  if (options?.ready || options?.status) {
    await services.readiness.save(match.id, {
      cameraA: { status: "ready", simulated: true },
      cameraB: { status: "ready", simulated: true },
      calibrationProfile: profile,
    });
  }
  if (options?.status) {
    await services.matches.updateStatus(match.id, "ready");
    if (options.status === "live" || options.status === "completed") {
      await services.matches.updateStatus(match.id, "live");
    }
    if (options.status === "completed") {
      await services.matches.updateStatus(match.id, "completed");
    }
  }
  const router = createAppMemoryRouter([`/matches/${match.id}/readiness`]);
  const result = render(<App router={router} services={services} />);
  await screen.findByRole("heading", { name: /hardware readiness/i });
  return { ...result, match, router, services };
}

function camera(name: "Camera A" | "Camera B") {
  return screen.getByRole("article", { name });
}

async function completeCamera(
  user: ReturnType<typeof userEvent.setup>,
  name: "Camera A" | "Camera B",
) {
  const card = camera(name);
  await user.click(
    within(card).getByRole("button", { name: /connect camera/i }),
  );
  await within(card).findByText(/checking connection/i);
  await user.click(
    within(card).getByRole("button", { name: /complete health check/i }),
  );
  await within(card).findByText(/^ready$/i);
}

describe("hardware readiness", () => {
  it("loads disconnected defaults and explains the disabled gate", async () => {
    await readinessApp();

    expect(within(camera("Camera A")).getByText(/disconnected/i)).toBeVisible();
    expect(within(camera("Camera B")).getByText(/disconnected/i)).toBeVisible();
    expect(screen.getByText(/camera a health check/i)).toBeVisible();
    expect(screen.getByText(/camera b health check/i)).toBeVisible();
    const start = screen.getByRole("button", { name: /start monitoring/i });
    expect(start).toBeDisabled();
    expect(start).toHaveAccessibleDescription(/complete both camera/i);
  });

  it("persists camera progress independently and supports error recovery", async () => {
    const user = userEvent.setup();
    const { match, services } = await readinessApp({
      cameraAStatus: "error",
    });
    const cameraA = camera("Camera A");

    expect(await within(cameraA).findByText(/check failed/i)).toBeVisible();
    expect((await services.readiness.get(match.id)).cameraA.status).toBe(
      "error",
    );
    expect((await services.readiness.get(match.id)).cameraB.status).toBe(
      "disconnected",
    );

    await user.click(
      within(cameraA).getByRole("button", { name: /retry check/i }),
    );
    await user.click(
      await within(cameraA).findByRole("button", {
        name: /complete health check/i,
      }),
    );
    expect(await within(cameraA).findByText(/^ready$/i)).toBeVisible();
    expect((await services.readiness.get(match.id)).cameraA.status).toBe(
      "ready",
    );
  });

  it("persists all checks, transitions draft to ready to live, and opens monitoring", async () => {
    const user = userEvent.setup();
    const { match, router, services } = await readinessApp();

    await completeCamera(user, "Camera A");
    await completeCamera(user, "Camera B");
    await user.selectOptions(
      screen.getByRole("combobox", { name: /court profile/i }),
      profile.id,
    );

    expect(
      await screen.findByRole("heading", { name: /ready to monitor/i }),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: /start monitoring/i }));

    await waitFor(() =>
      expect(router.state.location.pathname).toBe(`/matches/${match.id}/live`),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: /^live monitor$/i }),
      ).toBeInTheDocument(),
    );
    await expect(services.matches.get(match.id)).resolves.toMatchObject({
      status: "live",
    });
    await expect(services.readiness.get(match.id)).resolves.toMatchObject({
      cameraA: { status: "ready" },
      cameraB: { status: "ready" },
      calibrationProfile: { id: profile.id },
    });
  });

  it("starts the demo timer only after the operator confirms monitoring", async () => {
    const user = userEvent.setup();
    const { match, router, services } = await readinessApp({
      demo: true,
      ready: true,
    });

    expect(screen.queryByRole("timer")).not.toBeInTheDocument();
    expect(
      (await services.auth.getCurrentSession())?.session.demoTrialStartedAt,
    ).toBeUndefined();

    await user.click(screen.getByRole("button", { name: /start monitoring/i }));

    expect(
      screen.getByRole("dialog", { name: /start your 15-minute live demo/i }),
    ).toBeVisible();
    expect(screen.getByText(/camera setup time does not count/i)).toBeVisible();
    expect(screen.queryByRole("timer")).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /start 15-minute demo/i }),
    );

    await waitFor(() =>
      expect(router.state.location.pathname).toBe(`/matches/${match.id}/live`),
    );
    expect(await screen.findByRole("timer")).toHaveAccessibleName(
      /demo time remaining 1[45]:[0-5][0-9]/i,
    );
    await expect(services.auth.getCurrentSession()).resolves.toMatchObject({
      session: { mode: "demo", demoTrialStartedAt: expect.any(String) },
    });
  });

  it("restores saved checks after the page is remounted", async () => {
    const first = await readinessApp({ ready: true });
    first.unmount();

    const router = createAppMemoryRouter([
      `/matches/${first.match.id}/readiness`,
    ]);
    render(<App router={router} services={first.services} />);

    await screen.findByRole("heading", { name: /ready to monitor/i });
    expect(within(camera("Camera A")).getByText(/^ready$/i)).toBeVisible();
    expect(within(camera("Camera B")).getByText(/^ready$/i)).toBeVisible();
    expect(
      screen.getByRole("combobox", { name: /court profile/i }),
    ).toHaveValue(profile.id);
  });

  it("reports save failures without presenting the requested state as saved", async () => {
    const base = createLocalAppServices(new MemoryStorage());
    const services: AppServices = {
      ...base,
      readiness: {
        get: (id) => base.readiness.get(id),
        save: async () => {
          throw new Error("Private backend detail");
        },
      },
    };
    const user = userEvent.setup();
    await readinessApp({ services });
    const cameraA = camera("Camera A");

    await user.click(
      within(cameraA).getByRole("button", {
        name: /connect camera/i,
      }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /unable to save the camera state/i,
    );
    expect(within(cameraA).getByText(/disconnected/i)).toBeVisible();
    expect(
      screen.queryByText(/private backend detail/i),
    ).not.toBeInTheDocument();
  });

  it("prevents duplicate status transitions while monitoring startup is pending", async () => {
    const base = createLocalAppServices(new MemoryStorage());
    let resolveReady!: (
      match: Awaited<ReturnType<typeof base.matches.updateStatus>>,
    ) => void;
    const pendingReady = new Promise<
      Awaited<ReturnType<typeof base.matches.updateStatus>>
    >((resolve) => {
      resolveReady = resolve;
    });
    const updateStatus = vi.fn(
      (id: string, status: Parameters<typeof base.matches.updateStatus>[1]) =>
        status === "ready"
          ? pendingReady
          : base.matches.updateStatus(id, status),
    );
    const services: AppServices = {
      ...base,
      matches: {
        list: () => base.matches.list(),
        get: (id) => base.matches.get(id),
        create: (input) => base.matches.create(input),
        update: (id, input) => base.matches.update(id, input),
        updateStatus,
      },
    };
    const user = userEvent.setup();
    const { match } = await readinessApp({ services });
    await completeCamera(user, "Camera A");
    await completeCamera(user, "Camera B");
    await user.selectOptions(
      screen.getByRole("combobox", { name: /court profile/i }),
      profile.id,
    );
    const start = await screen.findByRole("button", {
      name: /start monitoring/i,
    });

    await user.click(start);
    const pendingButton = screen.getByRole("button", {
      name: /starting monitor/i,
    });
    expect(pendingButton).toBeDisabled();
    await user.click(pendingButton);
    expect(updateStatus).toHaveBeenCalledOnce();

    resolveReady(await base.matches.updateStatus(match.id, "ready"));
    await screen.findByRole("heading", { name: /^live monitor$/i });
    expect(updateStatus).toHaveBeenCalledTimes(2);
    expect(updateStatus.mock.calls.map((call) => call[1])).toEqual([
      "ready",
      "live",
    ]);
  });

  it("stays on readiness and reports an authoritative transition failure", async () => {
    const base = createLocalAppServices(new MemoryStorage());
    const services: AppServices = {
      ...base,
      matches: {
        list: () => base.matches.list(),
        get: (id) => base.matches.get(id),
        create: (input) => base.matches.create(input),
        update: (id, input) => base.matches.update(id, input),
        updateStatus: async () => {
          throw new Error("Private transition detail");
        },
      },
    };
    const user = userEvent.setup();
    const { match, router } = await readinessApp({ services, ready: true });

    await user.click(screen.getByRole("button", { name: /start monitoring/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /monitoring could not start/i,
    );
    expect(
      screen.queryByText(/private transition detail/i),
    ).not.toBeInTheDocument();
    expect(router.state.location.pathname).toBe(
      `/matches/${match.id}/readiness`,
    );
    expect(
      screen.getByRole("button", { name: /start monitoring/i }),
    ).toBeEnabled();
  });

  it("routes completed matches to their decision instead of reopening live", async () => {
    const user = userEvent.setup();
    const { match, router } = await readinessApp({ status: "completed" });

    expect(
      screen.getByRole("heading", { name: /review completed decision/i }),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: /view decision/i }));

    expect(
      await screen.findByRole("region", { name: /the call/i }),
    ).toBeVisible();
    expect(router.state.location.pathname).toBe(
      `/matches/${match.id}/decision`,
    );
  });

  it("shows a recoverable state for an unknown match", async () => {
    const services = createLocalAppServices(new MemoryStorage());
    await services.auth.register({
      email: "operator@example.com",
      password: "test-password",
      passwordConfirmation: "test-password",
    });
    const router = createAppMemoryRouter(["/matches/missing/readiness"]);
    const user = userEvent.setup();
    render(<App router={router} services={services} />);

    expect(
      await screen.findByRole("heading", { name: /match not found/i }),
    ).toBeVisible();
    await user.click(
      screen.getByRole("button", { name: /return to match dashboard/i }),
    );
    expect(
      await screen.findByRole("heading", { name: /match dashboard/i }),
    ).toBeVisible();
  });

  it("has no automated accessibility violations when incomplete or ready", async () => {
    const user = userEvent.setup();
    const { container } = await readinessApp();
    const options = { rules: { "color-contrast": { enabled: false } } };

    expect((await axe.run(container, options)).violations).toEqual([]);
    await completeCamera(user, "Camera A");
    await completeCamera(user, "Camera B");
    await user.selectOptions(
      screen.getByRole("combobox", { name: /court profile/i }),
      profile.id,
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /start monitoring/i }),
      ).toBeEnabled(),
    );
    expect((await axe.run(container, options)).violations).toEqual([]);
  });
});
