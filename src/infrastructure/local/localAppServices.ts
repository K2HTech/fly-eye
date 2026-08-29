import {
  assertValidMatchStatusTransition,
  isDemoTrialExpired,
  isHardwareReady,
  type HardwareReadiness,
  type MatchRecord,
  type OperatorProfile,
  type Session,
} from "../../domain";
import {
  DemoAuthenticationError,
  HardwareNotReadyError,
  RecordNotFoundError,
  type AppServices,
  type AuthenticatedOperator,
  type AuthService,
  type CreateMatchInput,
  type MatchRepository,
  type ReadinessService,
  type RegistrationInput,
  type SignInInput,
  type UpdateMatchInput,
  type UpdateReadinessInput,
} from "../../services";
import {
  isHardwareReadinessList,
  isMatchRecordList,
  isNullableSession,
  isOperatorProfileList,
} from "./validators";
import { type StorageLike, VersionedLocalStorage } from "./versionedStorage";

export const localStorageKeys = {
  profiles: "fly-eye/demo/profiles",
  session: "fly-eye/demo/session",
  matches: "fly-eye/demo/matches",
  readiness: "fly-eye/demo/readiness",
} as const;

interface LocalServiceOptions {
  createId?: (prefix: string) => string;
  now?: () => string;
}

interface LocalStores {
  profiles: VersionedLocalStorage<OperatorProfile[]>;
  session: VersionedLocalStorage<Session | null>;
  matches: VersionedLocalStorage<MatchRecord[]>;
  readiness: VersionedLocalStorage<HardwareReadiness[]>;
}

function secureUuidV4(): string {
  const crypto = globalThis.crypto;
  if (typeof crypto?.randomUUID === "function") return crypto.randomUUID();
  if (typeof crypto?.getRandomValues !== "function") {
    throw new Error("Secure random ID generation is unavailable.");
  }

  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0"));

  return [
    hex.slice(0, 4).join(""),
    hex.slice(4, 6).join(""),
    hex.slice(6, 8).join(""),
    hex.slice(8, 10).join(""),
    hex.slice(10, 16).join(""),
  ].join("-");
}

function defaultId(prefix: string): string {
  return `${prefix}-${secureUuidV4()}`;
}

function defaultNow(): string {
  return new Date().toISOString();
}

function normalizedEmail(email: string): string {
  return email.trim().toLowerCase();
}

function copyMatch(record: MatchRecord): MatchRecord {
  return {
    ...record,
    sideA: { ...record.sideA, players: [...record.sideA.players] },
    sideB: { ...record.sideB, players: [...record.sideB.players] },
    format: { ...record.format },
  };
}

function copyReadiness(readiness: HardwareReadiness): HardwareReadiness {
  return {
    ...readiness,
    cameraA: { ...readiness.cameraA },
    cameraB: { ...readiness.cameraB },
    calibrationProfile: readiness.calibrationProfile
      ? { ...readiness.calibrationProfile }
      : null,
  };
}

export function defaultHardwareReadiness(matchId: string): HardwareReadiness {
  return {
    matchId,
    cameraA: { status: "disconnected", simulated: true },
    cameraB: { status: "disconnected", simulated: true },
    calibrationProfile: null,
  };
}

class LocalAuthService implements AuthService {
  constructor(
    private readonly stores: Pick<LocalStores, "profiles" | "session">,
    private readonly createId: (prefix: string) => string,
    private readonly now: () => string,
  ) {}

  async getCurrentSession(): Promise<AuthenticatedOperator | null> {
    const session = this.stores.session.read();
    if (!session) return null;

    if (isDemoTrialExpired(session, Date.parse(this.now()))) {
      this.stores.session.clear();
      return null;
    }

    const profile = this.stores.profiles
      .read()
      .find((candidate) => candidate.id === session.profileId);

    if (!profile) {
      this.stores.session.clear();
      return null;
    }

    return { profile, session };
  }

  async register(input: RegistrationInput): Promise<AuthenticatedOperator> {
    const profiles = this.stores.profiles.read();
    const email = normalizedEmail(input.email);
    const existing = profiles.find(
      (profile) => normalizedEmail(profile.email) === email,
    );
    const profile: OperatorProfile = existing
      ? { ...existing, displayName: email, email }
      : {
          id: this.createId("operator"),
          displayName: email,
          email,
          createdAt: this.now(),
        };
    const nextProfiles = existing
      ? profiles.map((candidate) =>
          candidate.id === profile.id ? profile : candidate,
        )
      : [...profiles, profile];
    const session: Session = {
      profileId: profile.id,
      mode: "simulated",
      startedAt: this.now(),
    };

    // Only explicitly constructed persistence-safe values cross this boundary.
    this.stores.profiles.write(nextProfiles);
    this.stores.session.write(session);
    return { profile, session };
  }

  async signIn(input: SignInInput): Promise<AuthenticatedOperator> {
    const profiles = this.stores.profiles.read();
    if (profiles.length === 0) {
      throw new DemoAuthenticationError(
        "profile-not-found",
        "Create an account before signing in.",
      );
    }

    const email = normalizedEmail(input.email);
    const profile = profiles.find(
      (candidate) => normalizedEmail(candidate.email) === email,
    );
    if (!profile) {
      throw new DemoAuthenticationError(
        "email-mismatch",
        "The email or password is incorrect.",
      );
    }

    const session: Session = {
      profileId: profile.id,
      mode: "simulated",
      startedAt: this.now(),
    };
    this.stores.session.write(session);
    return { profile, session };
  }

  async continueAsDemo(): Promise<AuthenticatedOperator> {
    const profiles = this.stores.profiles.read();
    const existing = profiles.find(
      (profile) => profile.email === "demo@fly-eye.local",
    );
    const profile: OperatorProfile =
      existing ??
      ({
        id: this.createId("demo"),
        displayName: "Demo Operator",
        email: "demo@fly-eye.local",
        createdAt: this.now(),
      } satisfies OperatorProfile);
    const session: Session = {
      profileId: profile.id,
      mode: "demo",
      startedAt: this.now(),
    };

    if (!existing) this.stores.profiles.write([...profiles, profile]);
    this.stores.session.write(session);
    return { profile, session };
  }

  async startDemoTrial(): Promise<AuthenticatedOperator> {
    const identity = await this.getCurrentSession();
    if (!identity) {
      throw new DemoAuthenticationError(
        "profile-not-found",
        "Start a demo session before monitoring.",
      );
    }
    if (identity.session.mode !== "demo") return identity;
    if (identity.session.demoTrialStartedAt) return identity;

    const session: Session = {
      ...identity.session,
      demoTrialStartedAt: this.now(),
    };
    this.stores.session.write(session);
    return { profile: identity.profile, session };
  }

  async assignDemoMatch(matchId: string): Promise<AuthenticatedOperator> {
    const identity = await this.getCurrentSession();
    if (!identity || identity.session.mode !== "demo") {
      throw new DemoAuthenticationError(
        "profile-not-found",
        "Start a demo session before assigning its match.",
      );
    }
    if (
      identity.session.demoMatchId &&
      identity.session.demoMatchId !== matchId
    ) {
      throw new DemoAuthenticationError(
        "demo-match-locked",
        "This demo session is already assigned to another match.",
      );
    }
    if (identity.session.demoMatchId === matchId) return identity;

    const session: Session = { ...identity.session, demoMatchId: matchId };
    this.stores.session.write(session);
    return { profile: identity.profile, session };
  }

  async signOut(): Promise<void> {
    this.stores.session.clear();
  }
}

class LocalMatchRepository implements MatchRepository {
  constructor(
    private readonly store: LocalStores["matches"],
    private readonly readiness: ReadinessService,
    private readonly createId: (prefix: string) => string,
    private readonly now: () => string,
  ) {}

  async list(): Promise<MatchRecord[]> {
    return this.store.read().map(copyMatch);
  }

  async get(id: string): Promise<MatchRecord | null> {
    const record = this.store.read().find((match) => match.id === id);
    return record ? copyMatch(record) : null;
  }

  async create(input: CreateMatchInput): Promise<MatchRecord> {
    const timestamp = this.now();
    const record: MatchRecord = {
      id: this.createId("match"),
      eventName: input.eventName,
      court: input.court,
      competitionType: input.competitionType,
      sideA: { ...input.sideA, players: [...input.sideA.players] },
      sideB: { ...input.sideB, players: [...input.sideB.players] },
      format: { ...input.format },
      status: "draft",
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    this.store.write([...this.store.read(), record]);
    return copyMatch(record);
  }

  async update(id: string, input: UpdateMatchInput): Promise<MatchRecord> {
    const records = this.store.read();
    const index = records.findIndex((record) => record.id === id);
    if (index === -1) throw new RecordNotFoundError("Match", id);

    const current = records[index];
    const updated: MatchRecord = {
      ...current,
      eventName: input.eventName ?? current.eventName,
      court: input.court ?? current.court,
      competitionType: input.competitionType ?? current.competitionType,
      sideA: input.sideA
        ? { ...input.sideA, players: [...input.sideA.players] }
        : current.sideA,
      sideB: input.sideB
        ? { ...input.sideB, players: [...input.sideB.players] }
        : current.sideB,
      format: input.format ? { ...input.format } : current.format,
      updatedAt: this.now(),
    };
    const nextRecords = [...records];
    nextRecords[index] = updated;
    this.store.write(nextRecords);
    return copyMatch(updated);
  }

  async updateStatus(
    id: string,
    status: MatchRecord["status"],
  ): Promise<MatchRecord> {
    const records = this.store.read();
    const index = records.findIndex((record) => record.id === id);
    if (index === -1) throw new RecordNotFoundError("Match", id);

    const current = records[index];
    assertValidMatchStatusTransition(current.status, status);
    if (current.status === status) return copyMatch(current);
    if (current.status === "draft" && status === "ready") {
      const readiness = await this.readiness.get(id);
      if (!isHardwareReady(readiness)) throw new HardwareNotReadyError(id);
    }

    const updated = { ...current, status, updatedAt: this.now() };
    const nextRecords = [...records];
    nextRecords[index] = updated;
    this.store.write(nextRecords);
    return copyMatch(updated);
  }
}

class LocalReadinessService implements ReadinessService {
  constructor(private readonly store: LocalStores["readiness"]) {}

  async get(matchId: string): Promise<HardwareReadiness> {
    const readiness = this.store
      .read()
      .find((candidate) => candidate.matchId === matchId);
    return copyReadiness(readiness ?? defaultHardwareReadiness(matchId));
  }

  async save(
    matchId: string,
    input: UpdateReadinessInput,
  ): Promise<HardwareReadiness> {
    const records = this.store.read();
    const index = records.findIndex((record) => record.matchId === matchId);
    const current =
      index === -1 ? defaultHardwareReadiness(matchId) : records[index];
    const updated: HardwareReadiness = {
      matchId,
      cameraA: input.cameraA ? { ...input.cameraA } : current.cameraA,
      cameraB: input.cameraB ? { ...input.cameraB } : current.cameraB,
      calibrationProfile:
        "calibrationProfile" in input
          ? input.calibrationProfile
            ? { ...input.calibrationProfile }
            : null
          : current.calibrationProfile,
    };
    const nextRecords = [...records];
    if (index === -1) nextRecords.push(updated);
    else nextRecords[index] = updated;
    this.store.write(nextRecords);
    return copyReadiness(updated);
  }
}

export function createLocalAppServices(
  storage: StorageLike,
  options: LocalServiceOptions = {},
): AppServices {
  const now = options.now ?? defaultNow;
  const createId = options.createId ?? defaultId;
  const stores: LocalStores = {
    profiles: new VersionedLocalStorage(
      storage,
      localStorageKeys.profiles,
      isOperatorProfileList,
      () => [],
      now,
    ),
    session: new VersionedLocalStorage(
      storage,
      localStorageKeys.session,
      isNullableSession,
      () => null,
      now,
    ),
    matches: new VersionedLocalStorage(
      storage,
      localStorageKeys.matches,
      isMatchRecordList,
      () => [],
      now,
    ),
    readiness: new VersionedLocalStorage(
      storage,
      localStorageKeys.readiness,
      isHardwareReadinessList,
      () => [],
      now,
    ),
  };

  const readiness = new LocalReadinessService(stores.readiness);
  return {
    auth: new LocalAuthService(stores, createId, now),
    matches: new LocalMatchRepository(stores.matches, readiness, createId, now),
    readiness,
  };
}
