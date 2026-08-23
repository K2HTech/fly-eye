import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { describe, expect, it } from "vitest";

import App from "../../App";
import { createAppMemoryRouter } from "../../app/router";
import { createLocalAppServices } from "../../infrastructure/local";
import { MemoryStorage } from "../../test/MemoryStorage";

function renderApp(path: string, storage = new MemoryStorage()) {
  const services = createLocalAppServices(storage);
  const router = createAppMemoryRouter([path]);
  render(<App router={router} services={services} />);
  return { router, services, storage };
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
          ? /create your local profile/i
          : /resume your workspace/i,
    }),
  ).toBeVisible();
}

describe("onboarding integration", () => {
  it("offers registration, sign-in, and demo entry choices", async () => {
    renderApp("/welcome");
    await waitForWelcome();

    expect(screen.getAllByRole("link", { name: /sign up/i })).toHaveLength(2);
    for (const link of screen.getAllByRole("link", {
      name: /sign up/i,
    })) {
      expect(link).toHaveAttribute("href", "/register");
    }
    expect(screen.getByRole("link", { name: /^sign in$/i })).toHaveAttribute(
      "href",
      "/sign-in",
    );
    expect(
      screen.getByRole("button", { name: /continue as demo/i }),
    ).toBeEnabled();
    expect(
      screen.getByRole("button", { name: /open demo workspace/i }),
    ).toBeEnabled();
    expect(
      screen.getByRole("heading", { name: /setup to verdict/i }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: /evidence first/i }),
    ).toBeVisible();
  });

  it("enters demo mode, reaches the dashboard, and signs out", async () => {
    const user = userEvent.setup();
    const { router, storage } = renderApp("/welcome");
    await waitForWelcome();

    await user.click(screen.getByRole("button", { name: /continue as demo/i }));
    await waitForDashboard();
    expect(screen.getByText("Demo session")).toBeVisible();
    expect(router.state.location.pathname).toBe("/matches");

    await user.click(screen.getByRole("button", { name: /^sign out$/i }));
    await waitForWelcome();
    expect(router.state.location.pathname).toBe("/welcome");
    expect(storage.getItem("fly-eye/demo/session")).toBeNull();
    expect(storage.getItem("fly-eye/demo/profiles")).not.toBeNull();
  });

  it("focuses the first invalid registration field and associates its message", async () => {
    const user = userEvent.setup();
    renderApp("/register");
    expect(
      await screen.findByRole("heading", {
        name: /create your local profile/i,
      }),
    ).toBeVisible();

    await user.click(screen.getByRole("button", { name: /create profile/i }));

    const displayName = screen.getByLabelText("Display name");
    expect(displayName).toHaveFocus();
    expect(displayName).toHaveAttribute("aria-invalid", "true");
    expect(displayName).toHaveAttribute(
      "aria-describedby",
      "displayName-error",
    );
    expect(screen.getByText("Enter your display name.")).toBeVisible();
  });

  it("registers locally and never persists the demo passphrase", async () => {
    const user = userEvent.setup();
    const { router, storage } = renderApp("/register");
    await screen.findByRole("heading", { name: /create your local profile/i });

    await user.type(screen.getByLabelText("Display name"), "Khoa Tran");
    await user.type(screen.getByLabelText("Email"), " KHOA@example.com ");
    await user.type(
      screen.getByLabelText("Demo passphrase"),
      "demo-secret-123",
    );
    await user.type(
      screen.getByLabelText("Confirm demo passphrase"),
      "demo-secret-123",
    );
    await user.click(screen.getByRole("button", { name: /create profile/i }));

    await waitForDashboard();
    expect(router.state.location.pathname).toBe("/matches");
    expect(screen.getByText("Khoa Tran")).toBeVisible();
    const persisted = [...storage.entries()].flat().join("\n");
    expect(persisted).not.toContain("demo-secret-123");
    expect(persisted).not.toMatch(/password|confirmation|token|hash/i);
  });

  it("signs in an existing local profile with normalized email", async () => {
    const storage = new MemoryStorage();
    const services = createLocalAppServices(storage);
    await services.auth.register({
      displayName: "Local Operator",
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
      screen.getByLabelText("Demo passphrase"),
      "another-demo-passphrase",
    );
    await user.click(screen.getByRole("button", { name: /sign in locally/i }));

    await waitForDashboard();
    expect(router.state.location.pathname).toBe("/matches");
    expect(screen.getByText("Local profile")).toBeVisible();
  });

  it("clears the passphrase after a rejected local sign-in", async () => {
    const user = userEvent.setup();
    renderApp("/sign-in");
    await screen.findByRole("heading", { name: /resume your workspace/i });

    await user.type(screen.getByLabelText("Email"), "missing@example.com");
    const passphrase = screen.getByLabelText("Demo passphrase");
    await user.type(passphrase, "discard-this-passphrase");
    await user.click(screen.getByRole("button", { name: /sign in locally/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /create a local prototype profile/i,
    );
    expect(passphrase).toHaveValue("");
  });

  it.each(["/welcome", "/register", "/sign-in"])(
    "has no axe violations on %s",
    async (path) => {
      await expectNoPublicAccessibilityViolations(path);
    },
  );
});
