import type { MatchFormat } from "../../../domain";
import { InvalidPersistencePayloadError } from "../../../services";
import { type StorageLike, VersionedLocalStorage } from "../versionedStorage";

export const SUPPLEMENTAL_SCORING_STORAGE_KEY = "fly-eye/scoring/supplemental";

export const DEFAULT_SUPPLEMENTAL_SCORING: MatchFormat = {
  bestOfGames: 3,
  pointsToWin: 21,
};

type SupplementalScoringRecords = Record<string, MatchFormat>;

export interface SupplementalScoringStore {
  get(matchId: string): MatchFormat;
  save(matchId: string, format: MatchFormat): void;
  remove(matchId: string): void;
}

interface SupplementalScoringStoreOptions {
  now?: () => string;
  key?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
): boolean {
  return Object.keys(value).every((key) => keys.includes(key));
}

function isMatchFormat(value: unknown): value is MatchFormat {
  if (!isRecord(value) || !hasOnlyKeys(value, ["bestOfGames", "pointsToWin"])) {
    return false;
  }

  return (
    Object.keys(value).length === 2 &&
    (value.bestOfGames === 1 || value.bestOfGames === 3) &&
    (value.pointsToWin === 15 || value.pointsToWin === 21)
  );
}

function isSupplementalScoringRecords(
  value: unknown,
): value is SupplementalScoringRecords {
  if (!isRecord(value)) return false;
  return Object.entries(value).every(
    ([matchId, format]) => matchId.trim().length > 0 && isMatchFormat(format),
  );
}

function copyFormat(format: MatchFormat): MatchFormat {
  return { ...format };
}

function assertMatchId(matchId: string, key: string): void {
  if (typeof matchId !== "string" || matchId.trim().length === 0) {
    throw new InvalidPersistencePayloadError(key);
  }
}

/**
 * Stores only the scoring fields missing from the backend match contract.
 * Values are versioned and kept keyed by backend match ID; no match metadata
 * or authentication material crosses this persistence boundary.
 */
export class LocalSupplementalScoringStore implements SupplementalScoringStore {
  private readonly store: VersionedLocalStorage<SupplementalScoringRecords>;

  constructor(
    storage: StorageLike,
    options: SupplementalScoringStoreOptions = {},
  ) {
    const key = options.key ?? SUPPLEMENTAL_SCORING_STORAGE_KEY;
    this.store = new VersionedLocalStorage(
      storage,
      key,
      isSupplementalScoringRecords,
      () => ({}),
      options.now ?? (() => new Date().toISOString()),
    );
  }

  get(matchId: string): MatchFormat {
    assertMatchId(matchId, this.store.key);
    const format = this.store.read()[matchId.trim()];
    return copyFormat(format ?? DEFAULT_SUPPLEMENTAL_SCORING);
  }

  save(matchId: string, format: MatchFormat): void {
    assertMatchId(matchId, this.store.key);
    if (!isMatchFormat(format)) {
      throw new InvalidPersistencePayloadError(this.store.key);
    }

    const records = this.store.read();
    records[matchId.trim()] = copyFormat(format);
    this.store.write(records);
  }

  remove(matchId: string): void {
    assertMatchId(matchId, this.store.key);
    const records = this.store.read();
    delete records[matchId.trim()];
    this.store.write(records);
  }
}

export function createSupplementalScoringStore(
  storage: StorageLike,
  options: SupplementalScoringStoreOptions = {},
): SupplementalScoringStore {
  return new LocalSupplementalScoringStore(storage, options);
}
