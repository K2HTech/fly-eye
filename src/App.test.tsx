import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AppRouter } from "./App";
import { AppServicesProvider } from "./app/AppServicesProvider";
import { MatchContext, type MatchContextValue } from "./app/matchContext";
import { matchRoutes, routePaths } from "./app/paths";
import { createAppHashRouter, createAppMemoryRouter } from "./app/router";
import type { RouteAccessState } from "./app/routeAccess";
import { SessionContext, type SessionContextValue } from "./app/sessionContext";
import { createLocalAppServices } from "./infrastructure/local";
import { MemoryStorage } from "./test/MemoryStorage";

const authenticated: RouteAccessState = { status: "authenticated" };
const anonymous: RouteAccessState = { status: "anonymous" };

const testIdentity = {
  profile: {
    id: "operator-test",
    displayName: "Test Operator",
    email: "operator@example.com",
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  session: {
    profileId: "operator-test",
    mode: "simulated" as const,
    startedAt: "2026-01-01T00:00:00.000Z",
  },
};

function sessionValue(access: RouteAccessState): SessionContextValue {
  return {
    status: access.status,
    identity: access.status === "authenticated" ? testIdentity : null,
    error: null,
    refresh: vi.fn(async () => undefined),
    register: vi.fn(async () => testIdentity),
    signIn: vi.fn(async () => testIdentity),
    continueAsDemo: vi.fn(async () => testIdentity),
    assignDemoMatch: vi.fn(async () => testIdentity),
    startDemoTrial: vi.fn(async () => testIdentity),
    signOut: vi.fn(async () => undefined),
  };
}

const emptyMatches: MatchContextValue = {
  matches: [],
  status: "ready",
  error: null,
  refresh: vi.fn(async () => undefined),
  create: vi.fn(),
  update: vi.fn(),
  updateStatus: vi.fn(),
};

function renderRoute(path: string, access: RouteAccessState = authenticated) {
  const router = createAppMemoryRouter([path]);
  const services = createLocalAppServices(new MemoryStorage());
  render(
    <AppServicesProvider services={services}>
      <SessionContext.Provider value={sessionValue(access)}>
        <MatchContext.Provider value={emptyMatches}>
          <AppRouter access={access} router={router} />
        </MatchContext.Provider>
      </SessionContext.Provider>
    </AppServicesProvider>,
  );
  return router;
}

afterEach(() => {
  vi.useRealTimers();
  window.location.hash = "";
});

describe("application routing", () => {
  it("sends an anonymous launch to the welcome route", async () => {
    const router = renderRoute(routePaths.root, anonymous);

    expect(
      await screen.findByRole("heading", { name: /see the line/i }),
    ).toBeVisible();
    expect(router.state.location.pathname).toBe(routePaths.welcome);
  });

  it("does not flash protected content while restoring a session", () => {
    renderRoute(matchRoutes.live("match-42"), { status: "restoring" });

    expect(screen.getByRole("status")).toHaveTextContent(
      /preparing your operator workspace/i,
    );
    expect(
      screen.queryByRole("region", { name: /live monitor/i }),
    ).not.toBeInTheDocument();
  });

  it("guards a protected route", async () => {
    const router = renderRoute(matchRoutes.review("match-42"), anonymous);

    expect(
      await screen.findByRole("heading", { name: /see the line/i }),
    ).toBeVisible();
    expect(
      screen.queryByText(/sign in to open that workspace/i),
    ).not.toBeInTheDocument();
    expect(router.state.location.pathname).toBe(routePaths.welcome);
  });

  it("opens an authenticated hash route directly", async () => {
    window.location.hash = `#${matchRoutes.live("match-42")}`;
    const router = createAppHashRouter();
    const services = createLocalAppServices(new MemoryStorage());
    render(
      <AppServicesProvider services={services}>
        <SessionContext.Provider value={sessionValue(authenticated)}>
          <MatchContext.Provider value={emptyMatches}>
            <AppRouter access={authenticated} router={router} />
          </MatchContext.Provider>
        </SessionContext.Provider>
      </AppServicesProvider>,
    );

    expect(
      await screen.findByRole("region", { name: "Live monitor" }),
    ).toBeVisible();
    expect(router.state.location.pathname).toBe(matchRoutes.live("match-42"));
  });

  it("moves through the match-aware monitor workflow", () => {
    vi.useFakeTimers();
    const router = renderRoute(matchRoutes.live("match-42"));

    fireEvent.click(screen.getByRole("button", { name: /review last rally/i }));
    expect(screen.getByRole("heading", { name: /clip review/i })).toBeVisible();
    expect(router.state.location.pathname).toBe(matchRoutes.review("match-42"));

    fireEvent.click(screen.getByRole("button", { name: /get the call/i }));
    act(() => vi.advanceTimersByTime(600));

    expect(screen.getByRole("heading", { name: /the call/i })).toBeVisible();
    expect(router.state.location.pathname).toBe(
      matchRoutes.decision("match-42"),
    );

    fireEvent.click(screen.getByRole("button", { name: /run it again/i }));
    expect(screen.getByRole("heading", { name: /clip review/i })).toBeVisible();
    expect(router.state.location.pathname).toBe(matchRoutes.review("match-42"));
  });

  it("supports a direct decision route without navigation state", () => {
    renderRoute(matchRoutes.decision("match-42"));

    expect(screen.getByRole("heading", { name: /the call/i })).toBeVisible();
    expect(
      screen.getByText("Landing frame").nextElementSibling,
    ).toHaveTextContent("1284");
  });

  it("redirects an unknown authenticated route with an explanation", async () => {
    const router = renderRoute("/not-a-real-page");

    expect(
      await screen.findByRole("heading", { name: /match dashboard/i }),
    ).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent(/page was not found/i);
    expect(router.state.location.pathname).toBe(routePaths.matches);
  });
});
