import { describe, expect, it, vi } from "vitest";

import type { AuthenticatedOperator, AuthService } from "../../services";
import { createHybridAuthService } from "./hybridAuthService";

const normalIdentity: AuthenticatedOperator = {
  profile: {
    id: "normal-user",
    displayName: "operator@example.com",
    email: "operator@example.com",
    createdAt: "2026-08-29T00:00:00.000Z",
  },
  session: {
    profileId: "normal-user",
    mode: "backend",
    startedAt: "2026-08-29T00:00:00.000Z",
  },
};

const demoIdentity: AuthenticatedOperator = {
  profile: {
    id: "demo-user",
    displayName: "Demo Operator",
    email: "demo@fly-eye.local",
    createdAt: "2026-08-29T00:00:00.000Z",
  },
  session: {
    profileId: "demo-user",
    mode: "demo",
    startedAt: "2026-08-29T00:00:00.000Z",
  },
};

function authService(
  overrides: Partial<AuthService> = {},
): AuthService & Record<string, ReturnType<typeof vi.fn>> {
  return {
    getCurrentSession: vi.fn(async () => null),
    register: vi.fn(async () => normalIdentity),
    signIn: vi.fn(async () => normalIdentity),
    continueAsDemo: vi.fn(async () => demoIdentity),
    assignDemoMatch: vi.fn(async () => demoIdentity),
    startDemoTrial: vi.fn(async () => demoIdentity),
    signOut: vi.fn(async () => undefined),
    ...overrides,
  } as AuthService & Record<string, ReturnType<typeof vi.fn>>;
}

describe("HybridAuthService", () => {
  it("prefers an in-memory normal session over a persisted demo", async () => {
    const normal = authService({
      getCurrentSession: vi.fn(async () => normalIdentity),
    });
    const demo = authService({
      getCurrentSession: vi.fn(async () => demoIdentity),
    });

    await expect(
      createHybridAuthService(normal, demo).getCurrentSession(),
    ).resolves.toEqual(normalIdentity);
    expect(demo.getCurrentSession).not.toHaveBeenCalled();
  });

  it("restores only a real demo session from the local adapter", async () => {
    const staleLocalNormal = {
      ...normalIdentity,
      session: { ...normalIdentity.session, mode: "simulated" as const },
    };
    const service = createHybridAuthService(
      authService(),
      authService({
        getCurrentSession: vi.fn(async () => staleLocalNormal),
      }),
    );

    await expect(service.getCurrentSession()).resolves.toBeNull();
  });

  it("routes normal credentials only to backend authentication", async () => {
    const normal = authService();
    const demo = authService();
    const service = createHybridAuthService(normal, demo);
    const registration = {
      email: "operator@example.com",
      password: "secure-password",
      passwordConfirmation: "secure-password",
    };

    await service.register(registration);
    await service.signIn(registration);

    expect(normal.register).toHaveBeenCalledWith(registration);
    expect(normal.signIn).toHaveBeenCalledWith({
      email: registration.email,
      password: registration.password,
      passwordConfirmation: registration.passwordConfirmation,
    });
    expect(demo.register).not.toHaveBeenCalled();
    expect(demo.signIn).not.toHaveBeenCalled();
  });

  it("keeps demo operations and sign-out on the local adapter", async () => {
    const normal = authService();
    const demo = authService();
    const service = createHybridAuthService(normal, demo);

    await service.continueAsDemo();
    await service.assignDemoMatch("demo-match");
    await service.startDemoTrial();
    await service.signOut();

    expect(demo.continueAsDemo).toHaveBeenCalledOnce();
    expect(demo.assignDemoMatch).toHaveBeenCalledWith("demo-match");
    expect(demo.startDemoTrial).toHaveBeenCalledOnce();
    expect(demo.signOut).toHaveBeenCalledOnce();
    expect(normal.signOut).not.toHaveBeenCalled();
  });
});
