import { describe, expect, it, vi } from "vitest";

import { MemoryCredentialStore } from "./credentials";
import { BackendAuthService } from "./auth";
import type { BackendHttpClient } from "./httpClient";

const user = {
  id: "00000000-0000-4000-8000-000000000001",
  email: "operator@example.test",
  created_at: "2026-08-29T00:00:00Z",
};
const pair = {
  access_token: "access-1",
  refresh_token: "refresh-1",
  token_type: "bearer",
};

function client(request: BackendHttpClient["request"]): BackendHttpClient {
  return { request };
}

describe("BackendAuthService", () => {
  it("registers, signs in, then resolves the backend profile", async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(user)
      .mockResolvedValueOnce(pair)
      .mockResolvedValueOnce(user);
    const credentials = new MemoryCredentialStore();
    const service = new BackendAuthService({
      client: client(request),
      credentials,
      now: () => "2026-08-29T01:00:00Z",
    });

    await expect(
      service.register({
        email: " OPERATOR@example.test ",
        password: "long-password",
        passwordConfirmation: "long-password",
      }),
    ).resolves.toEqual({
      profile: {
        id: "00000000-0000-4000-8000-000000000001",
        email: "operator@example.test",
        displayName: "operator@example.test",
        createdAt: user.created_at,
      },
      session: {
        profileId: "00000000-0000-4000-8000-000000000001",
        mode: "backend",
        startedAt: "2026-08-29T01:00:00Z",
      },
    });
    expect(request.mock.calls[0][0]).toBe("auth/register");
    expect(JSON.parse(request.mock.calls[0][1].body)).toEqual({
      email: "operator@example.test",
      password: "long-password",
    });
    expect(credentials.get()).toEqual({
      accessToken: "access-1",
      refreshToken: "refresh-1",
    });
  });

  it("signs out best-effort and always clears memory credentials", async () => {
    const request = vi.fn().mockRejectedValue(new Error("offline"));
    const credentials = new MemoryCredentialStore();
    credentials.set({ accessToken: "access", refreshToken: "refresh" });
    const service = new BackendAuthService({
      client: client(request),
      credentials,
    });

    await expect(service.signOut()).resolves.toBeUndefined();
    expect(credentials.get()).toBeNull();
  });

  it("does not create a session without memory credentials", async () => {
    const request = vi.fn();
    const service = new BackendAuthService({
      client: client(request),
      credentials: new MemoryCredentialStore(),
    });
    await expect(service.getCurrentSession()).resolves.toBeNull();
    expect(request).not.toHaveBeenCalled();
  });
});
