import { describe, expect, it } from "vitest";

import {
  InvalidPersistencePayloadError,
  LocalPersistenceError,
} from "../../../services";
import { MemoryStorage } from "../../../test/MemoryStorage";
import {
  DEFAULT_SUPPLEMENTAL_SCORING,
  LocalSupplementalScoringStore,
  SUPPLEMENTAL_SCORING_STORAGE_KEY,
  type SupplementalScoringStore,
} from "./supplementalScoring";

const now = () => "2026-08-29T10:00:00.000Z";

function createStore(storage = new MemoryStorage()): SupplementalScoringStore {
  return new LocalSupplementalScoringStore(storage, { now });
}

describe("LocalSupplementalScoringStore", () => {
  it("defaults a backend match to best-of-three and 21 points", () => {
    const store = createStore();

    expect(store.get("backend-match-1")).toEqual(DEFAULT_SUPPLEMENTAL_SCORING);
  });

  it("saves and retrieves independent scoring values by match ID", () => {
    const storage = new MemoryStorage();
    const store = createStore(storage);

    store.save("backend-match-1", { bestOfGames: 1, pointsToWin: 15 });

    expect(store.get("backend-match-1")).toEqual({
      bestOfGames: 1,
      pointsToWin: 15,
    });
    expect(store.get("backend-match-2")).toEqual(DEFAULT_SUPPLEMENTAL_SCORING);
    expect(
      JSON.parse(storage.getItem(SUPPLEMENTAL_SCORING_STORAGE_KEY)!),
    ).toEqual({
      schemaVersion: 1,
      savedAt: now(),
      payload: {
        "backend-match-1": { bestOfGames: 1, pointsToWin: 15 },
      },
    });
  });

  it("returns copy-safe values and supports removal", () => {
    const store = createStore();
    store.save("backend-match-1", { bestOfGames: 3, pointsToWin: 15 });

    const value = store.get("backend-match-1");
    value.pointsToWin = 21;
    expect(store.get("backend-match-1")).toEqual({
      bestOfGames: 3,
      pointsToWin: 15,
    });

    store.remove("backend-match-1");
    expect(store.get("backend-match-1")).toEqual(DEFAULT_SUPPLEMENTAL_SCORING);
  });

  it.each([
    { bestOfGames: 2, pointsToWin: 21 },
    { bestOfGames: 3, pointsToWin: 11 },
    { bestOfGames: 3, pointsToWin: 21, extra: true },
  ])("rejects an invalid format before persistence", (format) => {
    const storage = new MemoryStorage();
    const store = createStore(storage);

    expect(() => store.save("backend-match-1", format as never)).toThrow(
      InvalidPersistencePayloadError,
    );
    expect(storage.getItem(SUPPLEMENTAL_SCORING_STORAGE_KEY)).toBeNull();
  });

  it("clears an invalid persisted payload and falls back to the default", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      SUPPLEMENTAL_SCORING_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 1,
        savedAt: now(),
        payload: {
          "backend-match-1": { bestOfGames: 3, pointsToWin: 21, token: "x" },
        },
      }),
    );
    const store = createStore(storage);

    expect(store.get("backend-match-1")).toEqual(DEFAULT_SUPPLEMENTAL_SCORING);
    expect(storage.getItem(SUPPLEMENTAL_SCORING_STORAGE_KEY)).toBeNull();
  });

  it("sanitizes storage failures", () => {
    const storage = new MemoryStorage();
    const store = new LocalSupplementalScoringStore({
      getItem: () => {
        throw new Error("secret scoring data");
      },
      removeItem: () => undefined,
      setItem: () => undefined,
    });

    expect(() => store.get("backend-match-1")).toThrow(LocalPersistenceError);
    expect(() => store.get("backend-match-1")).toThrow(
      "Unable to read application data.",
    );
    expect(storage.getItem(SUPPLEMENTAL_SCORING_STORAGE_KEY)).toBeNull();
  });
});
