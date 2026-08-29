import { describe, expect, it, vi } from "vitest";

import type { MatchRecord } from "../../domain";
import type { MatchRepository } from "../../services";
import type { ActiveSessionMode } from "../auth";
import { HybridMatchRepository } from "./hybridMatchRepository";

const record = (id: string): MatchRecord => ({
  id,
  eventName: id,
  court: "Court 1",
  competitionType: "singles",
  sideA: { displayName: "A", players: ["A"] },
  sideB: { displayName: "B", players: ["B"] },
  format: { bestOfGames: 3, pointsToWin: 21 },
  status: "draft",
  createdAt: "2026-08-29T00:00:00.000Z",
  updatedAt: "2026-08-29T00:00:00.000Z",
});

function repository(id: string): MatchRepository {
  return {
    list: vi.fn(async () => [record(id)]),
    get: vi.fn(async () => record(id)),
    create: vi.fn(async () => record(id)),
    update: vi.fn(async () => record(id)),
    updateStatus: vi.fn(async () => record(id)),
  };
}

describe("HybridMatchRepository", () => {
  it.each([
    ["backend", "normal"],
    ["demo", "demo"],
  ] as const)("routes %s sessions to the %s repository", async (mode, id) => {
    const normal = repository("normal");
    const demo = repository("demo");
    const hybrid = new HybridMatchRepository(normal, demo, () => mode);

    await expect(hybrid.list()).resolves.toMatchObject([{ id }]);

    expect(normal.list).toHaveBeenCalledTimes(mode === "backend" ? 1 : 0);
    expect(demo.list).toHaveBeenCalledTimes(mode === "demo" ? 1 : 0);
  });

  it("fails closed without an active session", async () => {
    let mode: ActiveSessionMode | null = null;
    const hybrid = new HybridMatchRepository(
      repository("normal"),
      repository("demo"),
      () => mode,
    );

    await expect(hybrid.list()).rejects.toThrow(/active session is required/i);
    mode = "backend";
    await expect(hybrid.list()).resolves.toMatchObject([{ id: "normal" }]);
  });
});
