import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { describe, expect, it } from "vitest";

import App from "../../App";
import { matchRoutes } from "../../app/paths";
import { createAppMemoryRouter } from "../../app/router";
import { createLocalAppServices } from "../../infrastructure/local";
import type {
  AppServices,
  AuthenticatedOperator,
  RegistrationInput,
  SignInInput,
} from "../../services";
import { MemoryStorage } from "../../test/MemoryStorage";

function renderApp(path: string, storage = new MemoryStorage()) {
  const services = createLocalAppServices(storage);
  const router = createAppMemoryRouter([path]);
  render(<App router={router} services={services} />);
  return { router, services, storage };
}

function createBackendAuthTestServices(storage = new MemoryStorage()) {
  const local = createLocalAppServices(storage);
  const accounts = new Set<string>();
  let identity: AuthenticatedOperator | null = null;
  const authenticate = (email: string): AuthenticatedOperator => {
    identity = {
      profile: {
        id: `backend-${email}`,
        displayName: email,
        email,
        createdAt: "2026-08-29T00:00:00.000Z",
      },
      session: {
        profileId: `backend-${email}`,
        mode: "backend",
        startedAt: "2026-08-29T00:00:00.000Z",
      },
    };
    return identity;
  };
  const services: AppServices = {
    ...local,
    auth: {
      getCurrentSession: async () => identity,
      register: async (input: RegistrationInput) => {
        accounts.add(input.email);
        return authenticate(input.email);
      },
      signIn: async (input: SignInInput) => {
        if (!accounts.has(input.email)) {
          throw new Error("The email or password is incorrect.");
        }
        return authenticate(input.email);
      },
      continueAsDemo: () => local.auth.continueAsDemo(),
      assignDemoMatch: (matchId) => local.auth.assignDemoMatch(matchId),
      startDemoTrial: () => local.auth.startDemoTrial(),
      signOut: async () => {
        identity = null;
      },
    },
  };
  return { accounts, services, storage };
}

function renderBackendAuthApp(path: string, storage = new MemoryStorage()) {
  const testServices = createBackendAuthTestServices(storage);
  const router = createAppMemoryRouter([path]);
  render(<App router={router} services={testServices.services} />);
  return { ...testServices, router };
}

async function waitForWelcome() {
  expect(
    await screen.findByRole("heading", { name: /see the line/i }),
  ).toBeVisible();
}

async function waitForDashboard() {
  expect(
    await screen.findByRole("heading", { name: /match dashboard/i }),
  ).toBeVisible();
}

async function expectNoPublicAccessibilityViolations(path: string) {
  renderApp(path);
  if (path === "/welcome") await waitForWelcome();
  else await waitForAuthPage(path);
  const result = await axe.run(document.body, {
    rules: {
      // JSDOM has no layout/paint engine, so contrast is checked visually.
      "color-contrast": { enabled: false },
    },
  });
  expect(result.violations).toEqual([]);
}

async function waitForAuthPage(path: string) {
  expect(
    await screen.findByRole("heading", {
      name:
        path === "/register"
          ? /create your account/i
          : /resume your workspace/i,
    }),
  ).toBeVisible();
}

describe("onboarding integration", () => {
  it("offers sign-up, sign-in, and live demo actions", async () => {
    renderApp("/welcome");
    await waitForWelcome();

    expect(screen.getAllByRole("link", { name: /sign up/i })).toHaveLength(2);
    for (const link of screen.getAllByRole("link", {
      name: /sign up/i,
    })) {
      expect(link).toHaveAttribute("href", "/register");
    }
    for (const link of screen.getAllByRole("link", { name: /^sign in$/i })) {
      expect(link).toHaveAttribute("href", "/sign-in");
    }
    expect(
      screen.getByRole("button", { name: /run the live demo/i }),
    ).toBeEnabled();
    expect(screen.getByText(/no signup · real match footage/i)).toBeVisible();
    expect(
      screen.getByRole("link", { name: /sign in to your console/i }),
    ).toHaveAttribute("href", "/sign-in");
    expect(
      screen.getByRole("heading", { name: /setup to verdict/i }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: /evidence first/i }),
    ).toBeVisible();
    expect(
      screen.getByText(/umpire make the final in or out call/i),
    ).toBeVisible();
    expect(screen.queryByText(/inconclusive/i)).not.toBeInTheDocument();
  });

  it("starts a temporary demo match at camera readiness", async () => {
    const user = userEvent.setup();
    const { router, services } = renderApp("/welcome");
    await waitForWelcome();

    await user.click(
      screen.getByRole("button", { name: /run the live demo/i }),
    );

    expect(
      await screen.findByRole("heading", { name: /hardware readiness/i }),
    ).toBeVisible();
    expect(router.state.location.pathname).toMatch(
      /^\/matches\/match-[^/]+\/readiness$/,
    );
    expect(screen.queryByRole("timer")).not.toBeInTheDocument();
    await expect(services.matches.list()).resolves.toEqual([
      expect.objectContaining({ eventName: "FLY EYE Live Demo" }),
    ]);
  });

  it("confines a demo operator to the assigned demo match", async () => {
    const user = userEvent.setup();
    const { router, services } = renderApp("/welcome");
    const otherMatch = await services.matches.create({
      eventName: "Private match",
      court: "Court 1",
      competitionType: "singles",
      sideA: { displayName: "Player A", players: ["Player A"] },
      sideB: { displayName: "Player B", players: ["Player B"] },
      format: { bestOfGames: 3, pointsToWin: 21 },
    });
    await waitForWelcome();

    await user.click(
      screen.getByRole("button", { name: /run the live demo/i }),
    );
    await screen.findByRole("heading", { name: /hardware readiness/i });
    const demoPath = router.state.location.pathname;

    expect(screen.queryByRole("link", { name: /^matches$/i })).toBeNull();
    expect(screen.getByText(/live demo workspace/i)).toBeVisible();

    await router.navigate("/matches");
    await waitFor(() => expect(router.state.location.pathname).toBe(demoPath));

    await router.navigate(matchRoutes.live(otherMatch.id));
    await waitFor(() => expect(router.state.location.pathname).toBe(demoPath));
    expect(screen.queryByText("Private match")).not.toBeInTheDocument();
  });

  it("lets an authenticated operator sign out", async () => {
    const user = userEvent.setup();
    const { services } = createBackendAuthTestServices();
    await services.auth.register({
      email: "khoa@example.com",
      password: "secure-password",
      passwordConfirmation: "secure-password",
    });
    const router = createAppMemoryRouter(["/matches"]);
    render(<App router={router} services={services} />);
    await waitForDashboard();
    expect(screen.getByText("Signed in")).toBeVisible();
    expect(router.state.location.pathname).toBe("/matches");

    await user.click(screen.getByRole("button", { name: /^sign out$/i }));
    await waitForWelcome();
    expect(router.state.location.pathname).toBe("/welcome");
  });

  it("focuses the first invalid registration field and associates its message", async () => {
    const user = userEvent.setup();
    renderApp("/register");
    expect(
      await screen.findByRole("heading", {
        name: /create your account/i,
      }),
    ).toBeVisible();

    await user.click(screen.getByRole("button", { name: /create account/i }));

    const email = screen.getByLabelText("Email");
    expect(email).toHaveFocus();
    expect(email).toHaveAttribute("aria-invalid", "true");
    expect(email).toHaveAttribute("aria-describedby", "email-error");
    expect(screen.getByText("Enter your email address.")).toBeVisible();
    expect(screen.queryByLabelText("Display name")).not.toBeInTheDocument();
  });

  it("registers an account without persisting the submitted password", async () => {
    const user = userEvent.setup();
    const { router, storage } = renderBackendAuthApp("/register");
    await screen.findByRole("heading", { name: /create your account/i });

    await user.type(screen.getByLabelText("Email"), " KHOA@example.com ");
    await user.type(screen.getByLabelText("Password"), "demo-secret-123");
    await user.type(
      screen.getByLabelText("Confirm password"),
      "demo-secret-123",
    );
    await user.click(screen.getByRole("button", { name: /create account/i }));

    await waitForDashboard();
    expect(router.state.location.pathname).toBe("/matches");
    expect(screen.getByText("khoa@example.com")).toBeVisible();
    const persisted = [...storage.entries()].flat().join("\n");
    expect(persisted).not.toContain("demo-secret-123");
    expect(persisted).not.toMatch(/password|confirmation|token|hash/i);
  });

  it("signs in an existing account with normalized email", async () => {
    const { services } = createBackendAuthTestServices();
    await services.auth.register({
      email: "operator@example.com",
      password: "discarded-demo-passphrase",
      passwordConfirmation: "discarded-demo-passphrase",
    });
    await services.auth.signOut();

    const user = userEvent.setup();
    const router = createAppMemoryRouter(["/sign-in"]);
    render(<App router={router} services={services} />);
    await screen.findByRole("heading", { name: /resume your workspace/i });

    await user.type(screen.getByLabelText("Email"), " OPERATOR@EXAMPLE.COM ");
    await user.type(
      screen.getByLabelText("Password"),
      "another-demo-passphrase",
    );
    await user.click(screen.getByRole("button", { name: /^sign in$/i }));

    await waitForDashboard();
    expect(router.state.location.pathname).toBe("/matches");
    expect(screen.getByText("Signed in")).toBeVisible();
  });

  it("clears the password after a rejected sign-in", async () => {
    const user = userEvent.setup();
    renderBackendAuthApp("/sign-in");
    await screen.findByRole("heading", { name: /resume your workspace/i });

    await user.type(screen.getByLabelText("Email"), "missing@example.com");
    const password = screen.getByLabelText("Password");
    await user.type(password, "discard-this-password");
    await user.click(screen.getByRole("button", { name: /^sign in$/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /email or password is incorrect/i,
    );
    expect(password).toHaveValue("");
  });

  it.each(["/welcome", "/register", "/sign-in"])(
    "has no axe violations on %s",
    async (path) => {
      await expectNoPublicAccessibilityViolations(path);
    },
  );
});
