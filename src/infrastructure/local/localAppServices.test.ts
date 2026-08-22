import { describe, expect, it } from "vitest";

import { InvalidMatchStatusTransitionError } from "../../domain";
import {
  DemoAuthenticationError,
  HardwareNotReadyError,
  RecordNotFoundError,
  type CreateMatchInput,
} from "../../services";
import { MemoryStorage } from "../../test/MemoryStorage";
import {
  createLocalAppServices,
  defaultHardwareReadiness,
  localStorageKeys,
} from "./localAppServices";

const timestamp = "2026-08-22T10:00:00.000Z";
const matchInput: CreateMatchInput = {
  eventName: "Fly Eye Open",
  court: "Court 2",
  competitionType: "singles",
  sideA: { displayName: "Nguyen", players: ["Nguyen"] },
  sideB: { displayName: "Tran", players: ["Tran"] },
  format: { bestOfGames: 3, pointsToWin: 21 },
};

function setup() {
  const storage = new MemoryStorage();
  let id = 0;
  const services = createLocalAppServices(storage, {
    now: () => timestamp,
    createId: (prefix) => `${prefix}-${++id}`,
  });
  return { services, storage };
}

describe("local authentication service", () => {
  it("registers and restores only persistence-safe identity data", async () => {
    const { services, storage } = setup();
    const identity = await services.auth.register({
      displayName: "Khoa Tran",
      email: " KHOA@example.com ",
      password: "NeverStoreThis!",
      passwordConfirmation: "NeverStoreThis!",
    });

    expect(identity.profile).toMatchObject({
      displayName: "Khoa Tran",
      email: "khoa@example.com",
    });
    expect(await services.auth.getCurrentSession()).toEqual(identity);

    const persisted = storage.entries().map((entry) => entry.join(":"));
    expect(persisted.join("\n")).not.toMatch(
      /NeverStoreThis|password|confirmation|token|hash/i,
    );
  });

  it("signs out without deleting profiles or matches", async () => {
    const { services, storage } = setup();
    await services.auth.register({
      displayName: "Khoa Tran",
      email: "khoa@example.com",
      password: "temporary",
      passwordConfirmation: "temporary",
    });
    await services.matches.create(matchInput);

    await services.auth.signOut();

    expect(await services.auth.getCurrentSession()).toBeNull();
    expect(storage.getItem(localStorageKeys.profiles)).not.toBeNull();
    expect(await services.matches.list()).toHaveLength(1);
    await expect(
      services.auth.signIn({
        email: "khoa@example.com",
        password: "discarded",
      }),
    ).resolves.toMatchObject({ profile: { email: "khoa@example.com" } });
  });

  it("restores identity and matches through a new service composition", async () => {
    const { services, storage } = setup();
    await services.auth.continueAsDemo();
    await services.matches.create(matchInput);

    const restarted = createLocalAppServices(storage);

    await expect(restarted.auth.getCurrentSession()).resolves.toMatchObject({
      session: { mode: "demo" },
    });
    await expect(restarted.matches.list()).resolves.toHaveLength(1);
  });

  it("creates a visibly identifiable demo identity", async () => {
    const { services } = setup();

    await expect(services.auth.continueAsDemo()).resolves.toMatchObject({
      profile: { displayName: "Demo Operator" },
      session: { mode: "demo" },
    });
  });

  it("rejects an email that does not match a local profile", async () => {
    const { services } = setup();
    await services.auth.register({
      displayName: "Khoa",
      email: "khoa@example.com",
      password: "temporary",
      passwordConfirmation: "temporary",
    });

    await expect(
      services.auth.signIn({ email: "other@example.com", password: "unused" }),
    ).rejects.toBeInstanceOf(DemoAuthenticationError);
  });

  it("invalidates a session whose profile is missing", async () => {
    const { services, storage } = setup();
    await services.auth.continueAsDemo();
    storage.removeItem(localStorageKeys.profiles);

    expect(await services.auth.getCurrentSession()).toBeNull();
    expect(storage.getItem(localStorageKeys.session)).toBeNull();
  });

  it("rejects persisted profile objects containing unknown secret fields", async () => {
    const { services, storage } = setup();
    storage.setItem(
      localStorageKeys.profiles,
      JSON.stringify({
        schemaVersion: 1,
        savedAt: timestamp,
        payload: [
          {
            id: "operator-1",
            displayName: "Unsafe profile",
            email: "unsafe@example.com",
            createdAt: timestamp,
            token: "must-not-survive",
          },
        ],
      }),
    );

    await expect(
      services.auth.signIn({
        email: "unsafe@example.com",
        password: "discarded",
      }),
    ).rejects.toBeInstanceOf(DemoAuthenticationError);
    expect(storage.getItem(localStorageKeys.profiles)).toBeNull();
  });

  it("recovers a profile left by an interrupted registration", async () => {
    class SessionWriteFailsOnce extends MemoryStorage {
      private shouldFail = true;

      override setItem(key: string, value: string): void {
        if (key === localStorageKeys.session && this.shouldFail) {
          this.shouldFail = false;
          throw new Error("Simulated quota interruption");
        }
        super.setItem(key, value);
      }
    }

    const storage = new SessionWriteFailsOnce();
    const services = createLocalAppServices(storage, {
      now: () => timestamp,
      createId: (prefix) => `${prefix}-1`,
    });
    await expect(
      services.auth.register({
        displayName: "Khoa",
        email: "khoa@example.com",
        password: "discarded",
        passwordConfirmation: "discarded",
      }),
    ).rejects.toThrow(/unable to write local demo data/i);

    await expect(
      services.auth.signIn({
        email: "khoa@example.com",
        password: "discarded",
      }),
    ).resolves.toMatchObject({ profile: { displayName: "Khoa" } });
  });

  it("clears a malformed session independently", async () => {
    const { services, storage } = setup();
    storage.setItem(
      localStorageKeys.session,
      JSON.stringify({
        schemaVersion: 1,
        savedAt: timestamp,
        payload: { profileId: "operator-1", startedAt: timestamp },
      }),
    );

    await expect(services.auth.getCurrentSession()).resolves.toBeNull();
    expect(storage.getItem(localStorageKeys.session)).toBeNull();
  });
});

describe("local match repository", () => {
  it("creates, copies, updates, and retrieves a draft", async () => {
    const { services } = setup();
    const created = await services.matches.create(matchInput);
    created.sideA.players[0] = "Mutated outside repository";

    expect(await services.matches.get(created.id)).toMatchObject({
      eventName: "Fly Eye Open",
      status: "draft",
      sideA: { players: ["Nguyen"] },
    });
    await expect(
      services.matches.update(created.id, { court: "Court 3" }),
    ).resolves.toMatchObject({ court: "Court 3" });
  });

  it("enforces valid status transitions without mutating rejected records", async () => {
    const { services } = setup();
    const match = await services.matches.create(matchInput);

    await expect(
      services.matches.updateStatus(match.id, "live"),
    ).rejects.toBeInstanceOf(InvalidMatchStatusTransitionError);
    expect(await services.matches.get(match.id)).toMatchObject({
      status: "draft",
    });

    await expect(
      services.matches.updateStatus(match.id, "ready"),
    ).rejects.toBeInstanceOf(HardwareNotReadyError);
    await services.readiness.save(match.id, {
      cameraA: { status: "ready", simulated: true },
      cameraB: { status: "ready", simulated: true },
      calibrationProfile: {
        id: "calibration-1",
        name: "Court 2 known-good profile",
        simulated: true,
      },
    });
    await expect(
      services.matches.updateStatus(match.id, "ready"),
    ).resolves.toMatchObject({ status: "ready" });
    await expect(
      services.matches.updateStatus(match.id, "live"),
    ).resolves.toMatchObject({ status: "live" });
    await expect(
      services.matches.updateStatus(match.id, "completed"),
    ).resolves.toMatchObject({ status: "completed" });
  });

  it("reports missing records consistently", async () => {
    const { services } = setup();

    await expect(
      services.matches.update("missing", { court: "Court 4" }),
    ).rejects.toBeInstanceOf(RecordNotFoundError);
    await expect(
      services.matches.updateStatus("missing", "ready"),
    ).rejects.toBeInstanceOf(RecordNotFoundError);
  });

  it("recovers an invalid match envelope independently", async () => {
    const { services, storage } = setup();
    storage.setItem(localStorageKeys.matches, "not-json");

    await expect(services.matches.list()).resolves.toEqual([]);
    expect(storage.getItem(localStorageKeys.matches)).toBeNull();
  });
});

describe("local readiness service", () => {
  it("starts disconnected and merges partial simulated updates", async () => {
    const { services } = setup();

    expect(await services.readiness.get("match-1")).toEqual(
      defaultHardwareReadiness("match-1"),
    );
    await services.readiness.save("match-1", {
      cameraA: { status: "ready", simulated: true },
    });
    const updated = await services.readiness.save("match-1", {
      calibrationProfile: {
        id: "calibration-1",
        name: "Court 2 known-good profile",
        simulated: true,
      },
    });

    expect(updated).toMatchObject({
      matchId: "match-1",
      cameraA: { status: "ready" },
      cameraB: { status: "disconnected" },
      calibrationProfile: { id: "calibration-1" },
    });
  });

  it("clears malformed readiness without affecting other stores", async () => {
    const { services, storage } = setup();
    await services.matches.create(matchInput);
    storage.setItem(
      localStorageKeys.readiness,
      JSON.stringify({
        schemaVersion: 1,
        savedAt: timestamp,
        payload: [{ matchId: "match-1", token: "unsafe" }],
      }),
    );

    await expect(services.readiness.get("match-1")).resolves.toEqual(
      defaultHardwareReadiness("match-1"),
    );
    expect(storage.getItem(localStorageKeys.readiness)).toBeNull();
    await expect(services.matches.list()).resolves.toHaveLength(1);
  });
});
