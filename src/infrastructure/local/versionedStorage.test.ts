import { describe, expect, it } from "vitest";

import {
  InvalidPersistencePayloadError,
  LocalPersistenceError,
} from "../../services";
import { MemoryStorage } from "../../test/MemoryStorage";
import {
  LOCAL_SCHEMA_VERSION,
  VersionedLocalStorage,
  type StorageLike,
} from "./versionedStorage";

const now = () => "2026-08-22T10:00:00.000Z";
const isStringList = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

function createStore(storage: StorageLike) {
  return new VersionedLocalStorage(
    storage,
    "fly-eye/test",
    isStringList,
    () => [],
    now,
  );
}

describe("VersionedLocalStorage", () => {
  it("returns an independent safe default when data is missing", () => {
    const store = createStore(new MemoryStorage());
    const first = store.read();
    first.push("changed");

    expect(store.read()).toEqual([]);
  });

  it("round-trips a valid versioned envelope", () => {
    const storage = new MemoryStorage();
    const store = createStore(storage);

    store.write(["match-1"]);

    expect(store.read()).toEqual(["match-1"]);
    expect(JSON.parse(storage.getItem(store.key) ?? "{}")).toEqual({
      schemaVersion: LOCAL_SCHEMA_VERSION,
      savedAt: now(),
      payload: ["match-1"],
    });
  });

  it("rejects invalid payloads before writing anything", () => {
    const storage = new MemoryStorage();
    const store = createStore(storage);

    expect(() =>
      store.write([{ token: "must-not-survive" }] as unknown as string[]),
    ).toThrow(InvalidPersistencePayloadError);
    expect(storage.getItem(store.key)).toBeNull();
  });

  it.each([
    ["malformed JSON", "{"],
    [
      "an incompatible schema",
      JSON.stringify({ schemaVersion: 2, savedAt: now(), payload: [] }),
    ],
    [
      "an invalid payload",
      JSON.stringify({
        schemaVersion: LOCAL_SCHEMA_VERSION,
        savedAt: now(),
        payload: [42],
      }),
    ],
    [
      "an envelope with unknown fields",
      JSON.stringify({
        schemaVersion: LOCAL_SCHEMA_VERSION,
        savedAt: now(),
        payload: [],
        token: "must-not-survive",
      }),
    ],
  ])("clears %s and returns a safe default", (_case, rawValue) => {
    const storage = new MemoryStorage();
    storage.setItem("fly-eye/test", rawValue);

    expect(createStore(storage).read()).toEqual([]);
    expect(storage.getItem("fly-eye/test")).toBeNull();
  });

  it.each(["read", "write", "remove"] as const)(
    "wraps a storage %s failure without exposing stored data",
    (operation) => {
      const storage: StorageLike = {
        getItem: () => {
          if (operation === "read") throw new Error("secret raw value");
          return null;
        },
        setItem: () => {
          if (operation === "write") throw new Error("secret raw value");
        },
        removeItem: () => {
          if (operation === "remove") throw new Error("secret raw value");
        },
      };
      const store = createStore(storage);
      const action =
        operation === "read"
          ? () => store.read()
          : operation === "write"
            ? () => store.write([])
            : () => store.clear();

      expect(action).toThrow(LocalPersistenceError);
      try {
        action();
      } catch (error) {
        expect(error).toMatchObject({ operation, key: "fly-eye/test" });
        expect(String(error)).not.toContain("secret raw value");
        expect((error as Error & { cause?: unknown }).cause).toBeUndefined();
      }
    },
  );
});
