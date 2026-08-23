import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { describe, expect, it } from "vitest";

import App from "../App";
import {
  createLocalAppServices,
  type StorageLike,
} from "../infrastructure/local";
import type {
  AppServices,
  AuthenticatedOperator,
  CreateMatchInput,
} from "../services";
import { MemoryStorage } from "../test/MemoryStorage";
import { AppServicesProvider } from "./AppServicesProvider";
import { MatchProvider } from "./MatchProvider";
import { createAppMemoryRouter } from "./router";
import { SessionProvider } from "./SessionProvider";
import { useMatches } from "./matchContext";
import { useSession } from "./sessionContext";

const matchInput: CreateMatchInput = {
  eventName: "Fly Eye Open",
  court: "Court 2",
  competitionType: "singles",
  sideA: { displayName: "Nguyen", players: ["Nguyen"] },
  sideB: { displayName: "Tran", players: ["Tran"] },
  format: { bestOfGames: 3, pointsToWin: 21 },
};

function ProviderProbe() {
  const session = useSession();
  const matches = useMatches();

  return (
    <div>
      <output aria-label="Session status">{session.status}</output>
      <output aria-label="Session error">
        {session.error?.message ?? "none"}
      </output>
      <output aria-label="Match status">{matches.status}</output>
      <output aria-label="Match count">{matches.matches.length}</output>
      <button type="button" onClick={() => void session.continueAsDemo()}>
        Enter demo
      </button>
      <button type="button" onClick={() => void matches.create(matchInput)}>
        Create match
      </button>
      <button type="button" onClick={() => void matches.refresh()}>
        Refresh matches
      </button>
      <button type="button" onClick={() => void session.signOut()}>
        Sign out
      </button>
    </div>
  );
}

function renderProviders(services: AppServices) {
  return render(
    <AppServicesProvider services={services}>
      <SessionProvider>
        <MatchProvider>
          <ProviderProbe />
        </MatchProvider>
      </SessionProvider>
    </AppServicesProvider>,
  );
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}

describe("application providers", () => {
  it("routes through restoration before an anonymous welcome", async () => {
    const services = createLocalAppServices(new MemoryStorage());
    const router = createAppMemoryRouter(["/"]);

    render(<App router={router} services={services} />);

    expect(screen.getByRole("status")).toHaveTextContent(/preparing/i);
    expect(
      await screen.findByRole("heading", { name: /see the line/i }),
    ).toBeVisible();
  });

  it("restores a persisted session before rendering a protected route", async () => {
    const services = createLocalAppServices(new MemoryStorage());
    await services.auth.continueAsDemo();
    await services.auth.assignDemoMatch("match-1");
    const router = createAppMemoryRouter(["/matches/match-1/live"]);

    render(<App router={router} services={services} />);

    expect(
      await screen.findByRole("region", { name: /live monitor/i }),
    ).toBeVisible();
  });

  it("makes session and match operations available through providers", async () => {
    const services = createLocalAppServices(new MemoryStorage());
    renderProviders(services);

    expect(await screen.findByLabelText("Session status")).toHaveTextContent(
      "anonymous",
    );
    fireEvent.click(screen.getByRole("button", { name: /enter demo/i }));

    expect(await screen.findByLabelText("Session status")).toHaveTextContent(
      "authenticated",
    );
    await waitFor(() =>
      expect(screen.getByLabelText("Match status")).toHaveTextContent("ready"),
    );
    fireEvent.click(screen.getByRole("button", { name: /create match/i }));

    expect(await screen.findByLabelText("Match count")).toHaveTextContent("1");
  });

  it("surfaces storage restoration failures without opening protected state", async () => {
    const brokenStorage: StorageLike = {
      getItem: () => {
        throw new Error("Storage unavailable");
      },
      setItem: () => undefined,
      removeItem: () => undefined,
    };

    renderProviders(createLocalAppServices(brokenStorage));

    expect(await screen.findByLabelText("Session status")).toHaveTextContent(
      "anonymous",
    );
    expect(screen.getByLabelText("Session error")).toHaveTextContent(
      /unable to read application data/i,
    );
  });

  it("does not let a stale restore overwrite a newer demo session", async () => {
    const base = createLocalAppServices(new MemoryStorage());
    const identity = await base.auth.continueAsDemo();
    await base.auth.signOut();
    const pendingRestore = deferred<AuthenticatedOperator | null>();
    const services: AppServices = {
      ...base,
      auth: {
        getCurrentSession: () => pendingRestore.promise,
        register: (input) => base.auth.register(input),
        signIn: (input) => base.auth.signIn(input),
        continueAsDemo: async () => identity,
        assignDemoMatch: (matchId) => base.auth.assignDemoMatch(matchId),
        startDemoTrial: () => base.auth.startDemoTrial(),
        signOut: () => base.auth.signOut(),
      },
    };
    renderProviders(services);

    expect(screen.getByLabelText("Session status")).toHaveTextContent(
      "restoring",
    );
    fireEvent.click(screen.getByRole("button", { name: /enter demo/i }));
    expect(await screen.findByLabelText("Session status")).toHaveTextContent(
      "authenticated",
    );

    await act(async () => pendingRestore.resolve(null));
    expect(screen.getByLabelText("Session status")).toHaveTextContent(
      "authenticated",
    );
  });

  it("does not repopulate matches when a refresh resolves after sign-out", async () => {
    const base = createLocalAppServices(new MemoryStorage());
    await base.auth.continueAsDemo();
    const pendingRefresh =
      deferred<Awaited<ReturnType<typeof base.matches.list>>>();
    let deferList = false;
    const services: AppServices = {
      ...base,
      matches: {
        ...base.matches,
        list: () => (deferList ? pendingRefresh.promise : base.matches.list()),
        get: (id) => base.matches.get(id),
        create: (input) => base.matches.create(input),
        update: (id, input) => base.matches.update(id, input),
        updateStatus: (id, status) => base.matches.updateStatus(id, status),
      },
    };
    renderProviders(services);
    await waitFor(() =>
      expect(screen.getByLabelText("Match status")).toHaveTextContent("ready"),
    );

    deferList = true;
    fireEvent.click(screen.getByRole("button", { name: /refresh matches/i }));
    fireEvent.click(screen.getByRole("button", { name: /sign out/i }));
    expect(await screen.findByLabelText("Session status")).toHaveTextContent(
      "anonymous",
    );

    await act(async () => pendingRefresh.resolve([]));
    await waitFor(() => {
      expect(screen.getByLabelText("Match status")).toHaveTextContent("idle");
      expect(screen.getByLabelText("Match count")).toHaveTextContent("0");
    });
  });
});
