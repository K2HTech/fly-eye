import { describe, expect, it, vi } from "vitest";

import type { AvailableEnvironment } from "../config/environment";
import { MemoryStorage } from "../test/MemoryStorage";
import { createBrowserAppServices } from "./createBrowserAppServices";

const environment: AvailableEnvironment = {
  status: "available",
  apiBaseUrl: "https://api.fly-eye.example/api/v1",
  signalingUrl: "wss://api.fly-eye.example/api/v1/signal",
  cameraSimulatorEnabled: false,
  insecurePublicSignalingAllowed: false,
};

const user = {
  id: "00000000-0000-4000-8000-000000000001",
  email: "operator@example.com",
  created_at: "2026-08-29T00:00:00.000Z",
};

describe("browser app service composition", () => {
  it("uses backend auth for normal registration without persisting secrets", async () => {
    const storage = new MemoryStorage();
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(user), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            access_token: "access-secret",
            refresh_token: "refresh-secret",
            token_type: "bearer",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(user), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    const services = createBrowserAppServices(storage, {
      environment,
      fetchImpl,
      now: () => "2026-08-29T00:00:01.000Z",
    });

    await expect(
      services.auth.register({
        email: "operator@example.com",
        password: "password-secret",
        passwordConfirmation: "password-secret",
      }),
    ).resolves.toMatchObject({
      profile: {
        displayName: "operator@example.com",
        email: "operator@example.com",
      },
      session: { mode: "backend" },
    });

    const registerBody = JSON.parse(
      String(fetchImpl.mock.calls[0]?.[1]?.body),
    ) as Record<string, unknown>;
    expect(registerBody).toEqual({
      email: "operator@example.com",
      password: "password-secret",
    });
    expect(registerBody).not.toHaveProperty("passwordConfirmation");
    expect(fetchImpl.mock.calls[2]?.[1]?.headers).toBeInstanceOf(Headers);
    expect(
      (fetchImpl.mock.calls[2]?.[1]?.headers as Headers).get("Authorization"),
    ).toBe("Bearer access-secret");
    expect([...storage.entries()].flat().join("\n")).not.toMatch(
      /password-secret|access-secret|refresh-secret/i,
    );
  });

  it("does not restore a normal backend session after browser composition restarts", async () => {
    const storage = new MemoryStorage();
    const fetchImpl = vi.fn();
    const restarted = createBrowserAppServices(storage, {
      environment,
      fetchImpl,
    });

    await expect(restarted.auth.getCurrentSession()).resolves.toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("keeps the local demo available when backend configuration is missing", async () => {
    const storage = new MemoryStorage();
    const services = createBrowserAppServices(storage, {
      environment: {
        status: "unavailable",
        issues: ["VITE_API_BASE_URL is missing."],
      },
    });

    await expect(services.auth.continueAsDemo()).resolves.toMatchObject({
      profile: { displayName: "Demo Operator" },
      session: { mode: "demo" },
    });
    await expect(
      services.auth.signIn({
        email: "operator@example.com",
        password: "password-secret",
      }),
    ).rejects.toThrow(/backend authentication is unavailable/i);
  });
});
