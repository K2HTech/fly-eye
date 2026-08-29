import { describe, expect, it, vi } from "vitest";

import { MemoryCredentialStore } from "./credentials";
import { createBackendHttpClient } from "./httpClient";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
const tokenPair = {
  access_token: "access-2",
  refresh_token: "refresh-2",
  token_type: "bearer",
};

describe("backend HTTP client", () => {
  it("adds bearer and request correlation headers", async () => {
    const credentials = new MemoryCredentialStore();
    credentials.set({ accessToken: "access-1", refreshToken: "refresh-1" });
    const fetchImpl = vi.fn().mockResolvedValue(json({ ok: true }));
    const client = createBackendHttpClient({
      baseUrl: "https://api.test/api/v1",
      credentials,
      fetchImpl,
      requestIdFactory: () => "request-1",
    });

    await expect(client.request("matches")).resolves.toEqual({ ok: true });
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.test/api/v1/matches",
      expect.objectContaining({ headers: expect.any(Headers) }),
    );
    const headers = fetchImpl.mock.calls[0][1].headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer access-1");
    expect(headers.get("X-Request-ID")).toBe("request-1");
  });

  it("allows secure request ID generation to be injected", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(json({ ok: true }));
    const client = createBackendHttpClient({
      baseUrl: "https://api.test/api/v1",
      credentials: new MemoryCredentialStore(),
      fetchImpl,
      crypto: { randomUUID: () => "00000000-0000-0000-0000-000000000000" },
    });

    await client.request("health");
    const headers = fetchImpl.mock.calls[0][1].headers as Headers;
    expect(headers.get("X-Request-ID")).toBe(
      "00000000-0000-0000-0000-000000000000",
    );
  });

  it("shares one refresh across concurrent 401s and replays each request once", async () => {
    const credentials = new MemoryCredentialStore();
    credentials.set({ accessToken: "access-1", refreshToken: "refresh-1" });
    let refreshCalls = 0;
    const fetchImpl = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.endsWith("/auth/refresh")) {
          refreshCalls += 1;
          await new Promise((resolve) => setTimeout(resolve, 1));
          return json(tokenPair);
        }
        if (url.endsWith("/one") || url.endsWith("/two")) {
          const auth = init?.headers as Headers;
          if (auth.get("Authorization") === "Bearer access-1")
            return json({ detail: "expired" }, 401);
          return json({ path: url.split("/").at(-1) });
        }
        return json({ ok: true });
      },
    );
    const client = createBackendHttpClient({
      baseUrl: "https://api.test/api/v1",
      credentials,
      fetchImpl,
      requestIdFactory: () => "request",
    });

    await expect(
      Promise.all([client.request("one"), client.request("two")]),
    ).resolves.toEqual([{ path: "one" }, { path: "two" }]);
    expect(refreshCalls).toBe(1);
    expect(credentials.get()).toEqual({
      accessToken: "access-2",
      refreshToken: "refresh-2",
    });
  });

  it("clears credentials when refresh fails", async () => {
    const credentials = new MemoryCredentialStore();
    const invalidated = vi.fn();
    credentials.onCleared(invalidated);
    credentials.set({ accessToken: "access-1", refreshToken: "refresh-1" });
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(json({}, 401))
      .mockResolvedValueOnce(
        json({ detail: { error: { code: "INVALID_REFRESH_TOKEN" } } }, 401),
      );
    const client = createBackendHttpClient({
      baseUrl: "https://api.test/api/v1",
      credentials,
      fetchImpl,
      requestIdFactory: () => "request",
    });

    await expect(client.request("matches")).rejects.toMatchObject({
      status: 401,
      code: "INVALID_REFRESH_TOKEN",
    });
    expect(credentials.get()).toBeNull();
    expect(invalidated).toHaveBeenCalledOnce();
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("does not rotate twice when a late 401 used the already replaced token", async () => {
    const credentials = new MemoryCredentialStore();
    credentials.set({ accessToken: "access-1", refreshToken: "refresh-1" });
    let firstResolve!: (response: Response) => void;
    let secondResolve!: (response: Response) => void;
    const first = new Promise<Response>((resolve) => {
      firstResolve = resolve;
    });
    const second = new Promise<Response>((resolve) => {
      secondResolve = resolve;
    });
    let protectedCall = 0;
    const fetchImpl = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        if (String(input).endsWith("/auth/refresh")) return json(tokenPair);
        const authorization = (init?.headers as Headers).get("Authorization");
        if (authorization === "Bearer access-2") return json({ ok: true });
        protectedCall += 1;
        return protectedCall === 1 ? first : second;
      },
    );
    const client = createBackendHttpClient({
      baseUrl: "https://api.test/api/v1",
      credentials,
      fetchImpl,
      requestIdFactory: () => "request",
    });
    const one = client.request("one");
    const two = client.request("two");

    firstResolve(json({}, 401));
    await expect(one).resolves.toEqual({ ok: true });
    secondResolve(json({}, 401));
    await expect(two).resolves.toEqual({ ok: true });

    expect(
      fetchImpl.mock.calls.filter(([input]) =>
        String(input).endsWith("/auth/refresh"),
      ),
    ).toHaveLength(1);
  });

  it("replays an unauthorized request at most once", async () => {
    const credentials = new MemoryCredentialStore();
    credentials.set({ accessToken: "access-1", refreshToken: "refresh-1" });
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(json({}, 401))
      .mockResolvedValueOnce(json(tokenPair))
      .mockResolvedValueOnce(
        json({ detail: { error: { code: "UNAUTHORIZED" } } }, 401),
      );
    const client = createBackendHttpClient({
      baseUrl: "https://api.test/api/v1",
      credentials,
      fetchImpl,
      requestIdFactory: () => "request",
    });

    await expect(client.request("matches")).rejects.toMatchObject({
      status: 401,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(credentials.get()).toBeNull();
  });
});
