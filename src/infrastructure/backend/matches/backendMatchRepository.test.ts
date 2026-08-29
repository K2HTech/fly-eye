import { describe, expect, it, vi } from "vitest";

import type { HardwareReadiness } from "../../../domain";
import type { BackendHttpClient } from "../httpClient";
import { BackendMatchRepository } from "./backendMatchRepository";
import { parseBackendMatch, parseBackendMatchList } from "./dtos";

const id = "13baea66-22e3-41a5-96f7-8481672888dc";
const response = (overrides: Record<string, unknown> = {}) => ({
  id,
  title: "Club final",
  venue: "Court 1",
  format: "singles",
  scheduledAt: "2026-08-25T03:00:00Z",
  status: "draft",
  players: [
    { name: "Ari", team: "A" },
    { name: "Bao", team: "B" },
  ],
  cameras: [],
  stats: { clipCount: 0, callCount: 0, inconclusiveCount: 0 },
  createdAt: "2026-08-25T03:00:00Z",
  updatedAt: "2026-08-25T03:00:00Z",
  ...overrides,
});
const ready: HardwareReadiness = {
  matchId: id,
  cameraA: { status: "ready", simulated: false },
  cameraB: { status: "ready", simulated: false },
  calibrationProfile: { id: "cal", name: "Court", simulated: false },
};

function client(request: BackendHttpClient["request"]): BackendHttpClient {
  return { request };
}

describe("backend match DTOs", () => {
  it("maps backend players into sides and validates required fields", () => {
    const dto = parseBackendMatch(response());
    expect(dto.players).toHaveLength(2);
    expect(
      parseBackendMatchList({ items: [response()], nextCursor: null }).items,
    ).toHaveLength(1);
    expect(() => parseBackendMatch({ ...response(), status: "ready" })).toThrow(
      "Invalid backend response",
    );
  });
});

describe("BackendMatchRepository", () => {
  it("maps create fields and generates one stable idempotency UUID", async () => {
    const request = vi.fn().mockResolvedValue(response());
    const repository = new BackendMatchRepository({
      client: client(request),
      now: () => "2026-08-25T03:00:00Z",
      clientRequestIdFactory: () => "3d97d35b-e83f-477b-9344-17c84ca6f076",
    });
    await repository.create({
      eventName: "Club final",
      court: "Court 1",
      competitionType: "singles",
      sideA: { displayName: "Ari", players: ["Ari"] },
      sideB: { displayName: "Bao", players: ["Bao"] },
      format: { bestOfGames: 3, pointsToWin: 21 },
    });
    const init = request.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(String(init.body))).toMatchObject({
      title: "Club final",
      players: [
        { name: "Ari", team: "A" },
        { name: "Bao", team: "B" },
      ],
      clientRequestId: "3d97d35b-e83f-477b-9344-17c84ca6f076",
    });
  });

  it("uses injected supplemental scoring and defaults when it is absent", async () => {
    const request = vi.fn().mockResolvedValue(response());
    const repository = new BackendMatchRepository({
      client: client(request),
      scoring: {
        get: vi.fn().mockResolvedValue({ bestOfGames: 1, pointsToWin: 15 }),
        save: vi.fn(),
      },
    });
    await expect(repository.get(id)).resolves.toMatchObject({
      format: { bestOfGames: 1, pointsToWin: 15 },
    });
    const fallback = new BackendMatchRepository({
      client: client(vi.fn().mockResolvedValue(response())),
    });
    await expect(fallback.get(id)).resolves.toMatchObject({
      format: { bestOfGames: 3, pointsToWin: 21 },
    });
  });

  it("walks every cursor page and restores ready from persisted readiness", async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce({ items: [response()], nextCursor: "next" })
      .mockResolvedValueOnce({
        items: [response({ id: "13baea66-22e3-41a5-96f7-8481672888dd" })],
        nextCursor: null,
      });
    const repository = new BackendMatchRepository({
      client: client(request),
      readiness: { get: vi.fn().mockResolvedValue(ready), save: vi.fn() },
    });
    await expect(repository.list()).resolves.toEqual([
      expect.objectContaining({
        id,
        status: "ready",
        sideA: { displayName: "Ari", players: ["Ari"] },
      }),
      expect.objectContaining({ status: "ready" }),
    ]);
    expect(request).toHaveBeenCalledWith("matches?limit=100");
    expect(request).toHaveBeenCalledWith("matches?limit=100&cursor=next");
  });

  it("rejects a repeated cursor instead of looping", async () => {
    const request = vi
      .fn()
      .mockResolvedValue({ items: [], nextCursor: "same" });
    const repository = new BackendMatchRepository({ client: client(request) });
    await expect(repository.list()).rejects.toThrow("Invalid backend response");
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("keeps ready local and patches live then finished", async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(response())
      .mockResolvedValueOnce(response())
      .mockResolvedValueOnce(response({ status: "live" }))
      .mockResolvedValueOnce(response({ status: "live" }))
      .mockResolvedValueOnce(response({ status: "finished" }));
    const repository = new BackendMatchRepository({
      client: client(request),
      readiness: { get: vi.fn().mockResolvedValue(ready), save: vi.fn() },
    });
    await expect(repository.updateStatus(id, "ready")).resolves.toMatchObject({
      status: "ready",
    });
    await expect(repository.updateStatus(id, "live")).resolves.toMatchObject({
      status: "live",
    });
    await expect(
      repository.updateStatus(id, "completed"),
    ).resolves.toMatchObject({ status: "completed" });
    expect(
      JSON.parse(String((request.mock.calls[2][1] as RequestInit).body)),
    ).toEqual({ status: "live" });
    expect(
      JSON.parse(String((request.mock.calls[4][1] as RequestInit).body)),
    ).toEqual({ status: "finished" });
  });

  it("enforces the readiness gate and domain transition", async () => {
    const request = vi.fn().mockResolvedValue(response());
    const repository = new BackendMatchRepository({
      client: client(request),
      readiness: {
        get: vi.fn().mockResolvedValue({ ...ready, calibrationProfile: null }),
        save: vi.fn(),
      },
    });
    await expect(repository.updateStatus(id, "ready")).rejects.toThrow(
      "Both cameras",
    );
    await expect(repository.updateStatus(id, "completed")).rejects.toThrow(
      "Invalid match status transition",
    );
    expect(request).toHaveBeenCalledTimes(2);
  });
});
