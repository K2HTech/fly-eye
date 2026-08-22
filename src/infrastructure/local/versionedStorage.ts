import {
  InvalidPersistencePayloadError,
  LocalPersistenceError,
} from "../../services";

export const LOCAL_SCHEMA_VERSION = 1 as const;

export interface StorageLike {
  getItem(key: string): string | null;
  removeItem(key: string): void;
  setItem(key: string, value: string): void;
}

interface StorageEnvelope<T> {
  schemaVersion: typeof LOCAL_SCHEMA_VERSION;
  savedAt: string;
  payload: T;
}

type Validator<T> = (value: unknown) => value is T;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export class VersionedLocalStorage<T> {
  constructor(
    private readonly storage: StorageLike,
    readonly key: string,
    private readonly isPayload: Validator<T>,
    private readonly defaultValue: () => T,
    private readonly now: () => string,
  ) {}

  read(): T {
    let rawValue: string | null;

    try {
      rawValue = this.storage.getItem(this.key);
    } catch {
      throw new LocalPersistenceError("read", this.key);
    }

    if (rawValue === null) return this.defaultValue();

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawValue) as unknown;
    } catch {
      this.clearInvalidValue();
      return this.defaultValue();
    }

    if (!this.isEnvelope(parsed)) {
      this.clearInvalidValue();
      return this.defaultValue();
    }

    return parsed.payload;
  }

  write(payload: T): void {
    if (!this.isPayload(payload)) {
      throw new InvalidPersistencePayloadError(this.key);
    }

    const envelope: StorageEnvelope<T> = {
      schemaVersion: LOCAL_SCHEMA_VERSION,
      savedAt: this.now(),
      payload,
    };

    let serialized: string;
    try {
      serialized = JSON.stringify(envelope);
      this.storage.setItem(this.key, serialized);
    } catch {
      throw new LocalPersistenceError("write", this.key);
    }
  }

  clear(): void {
    try {
      this.storage.removeItem(this.key);
    } catch {
      throw new LocalPersistenceError("remove", this.key);
    }
  }

  private clearInvalidValue(): void {
    this.clear();
  }

  private isEnvelope(value: unknown): value is StorageEnvelope<T> {
    return (
      isRecord(value) &&
      Object.keys(value).every((key) =>
        ["schemaVersion", "savedAt", "payload"].includes(key),
      ) &&
      value.schemaVersion === LOCAL_SCHEMA_VERSION &&
      typeof value.savedAt === "string" &&
      this.isPayload(value.payload)
    );
  }
}
