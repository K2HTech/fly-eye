import {
  assertValidMatchStatusTransition,
  isHardwareReady,
} from "../../../domain/matchTransitions";
import type { MatchStatus } from "../../../domain";
import type { MatchFormat } from "../../../domain";
import type {
  CreateMatchInput,
  MatchRepository,
  ReadinessService,
  UpdateMatchInput,
} from "../../../services";
import type { BackendHttpClient } from "../httpClient";
import type { CryptoLike } from "../httpClient";
import { BackendRequestError } from "../errors";
import {
  mapBackendMatch,
  mapMatchPlayers,
  mapStatusToBackend,
  parseBackendMatch,
  parseBackendMatchList,
} from "./dtos";

export interface BackendMatchRepositoryOptions {
  client: BackendHttpClient;
  readiness?: ReadinessService;
  scoring?: SupplementalScoring;
  now?: () => string;
  crypto?: CryptoLike;
  clientRequestIdFactory?: () => string;
}

/**
 * The backend has no scoring fields. Composition may provide the local,
 * versioned supplement without making this adapter own its persistence.
 */
export interface SupplementalScoring {
  get(matchId: string): Promise<MatchFormat | null> | MatchFormat | null;
  save(matchId: string, format: MatchFormat): Promise<void> | void;
}

function secureUuid(
  crypto: CryptoLike | undefined = globalThis.crypto,
): string {
  if (typeof crypto?.randomUUID === "function") return crypto.randomUUID();
  if (typeof crypto?.getRandomValues === "function") {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0"));
    return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex
      .slice(6, 8)
      .join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
  }
  throw new Error("Secure match request IDs are unavailable.");
}

export class BackendMatchRepository implements MatchRepository {
  private readonly client: BackendHttpClient;
  private readonly readiness?: ReadinessService;
  private readonly scoring?: SupplementalScoring;
  private readonly now: () => string;
  private readonly clientRequestIdFactory: () => string;

  constructor(options: BackendMatchRepositoryOptions) {
    this.client = options.client;
    this.readiness = options.readiness;
    this.scoring = options.scoring;
    this.now = options.now ?? (() => new Date().toISOString());
    this.clientRequestIdFactory =
      options.clientRequestIdFactory ?? (() => secureUuid(options.crypto));
  }

  private async map(dto: ReturnType<typeof parseBackendMatch>) {
    let status: MatchStatus | undefined;
    if (dto.status === "draft" && this.readiness) {
      try {
        const readiness = await this.readiness.get(dto.id);
        status = isHardwareReady(readiness) ? "ready" : "draft";
      } catch {
        status = "draft";
      }
    }
    let format: MatchFormat | undefined;
    try {
      format = (await this.scoring?.get(dto.id)) ?? undefined;
    } catch {
      format = undefined;
    }
    return {
      ...mapBackendMatch(dto, status),
      format: format ?? { bestOfGames: 3, pointsToWin: 21 },
    };
  }

  async list(): Promise<Awaited<ReturnType<typeof this.map>>[]> {
    const matches: Awaited<ReturnType<typeof this.map>>[] = [];
    const seenCursors = new Set<string>();
    let cursor: string | null = null;
    for (let page = 0; page < 1000; page += 1) {
      const query = new URLSearchParams({ limit: "100" });
      if (cursor) query.set("cursor", cursor);
      const dto = parseBackendMatchList(
        await this.client.request<unknown>(`matches?${query.toString()}`),
      );
      matches.push(
        ...(await Promise.all(dto.items.map((item) => this.map(item)))),
      );
      if (!dto.nextCursor) return matches;
      if (seenCursors.has(dto.nextCursor))
        throw new Error("Invalid backend response.");
      seenCursors.add(dto.nextCursor);
      cursor = dto.nextCursor;
    }
    throw new Error("The Fly Eye service returned too many match pages.");
  }

  async get(id: string) {
    try {
      return await this.map(
        parseBackendMatch(
          await this.client.request<unknown>(
            `matches/${encodeURIComponent(id)}`,
          ),
        ),
      );
    } catch (error) {
      if (error instanceof BackendRequestError && error.status === 404)
        return null;
      throw error;
    }
  }

  async create(input: CreateMatchInput) {
    const dto = parseBackendMatch(
      await this.client.request<unknown>("matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: input.eventName,
          venue: input.court,
          format: input.competitionType,
          scheduledAt: this.now(),
          players: mapMatchPlayers(input.sideA, input.sideB),
          clientRequestId: this.clientRequestIdFactory(),
        }),
      }),
    );
    await this.scoring?.save(dto.id, input.format);
    return this.map(dto);
  }

  async update(id: string, input: UpdateMatchInput) {
    const body: Record<string, unknown> = {};
    if (input.eventName !== undefined) body.title = input.eventName;
    if (input.court !== undefined) body.venue = input.court;
    if (input.competitionType !== undefined)
      body.format = input.competitionType;
    if (input.sideA !== undefined || input.sideB !== undefined) {
      const current = await this.get(id);
      if (!current) throw new Error("The requested match was not found.");
      body.players = mapMatchPlayers(
        input.sideA ?? current.sideA,
        input.sideB ?? current.sideB,
      );
    }
    const dto = parseBackendMatch(
      await this.client.request<unknown>(`matches/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    );
    return this.map(dto);
  }

  async updateStatus(id: string, status: MatchStatus) {
    const current = await this.get(id);
    if (!current) throw new Error("The requested match was not found.");
    const directBackendStart = current.status === "draft" && status === "live";
    if (!directBackendStart)
      assertValidMatchStatusTransition(current.status, status);
    if (status === "ready") {
      if (!this.readiness || !isHardwareReady(await this.readiness.get(id)))
        throw new Error("Both cameras and calibration must be ready first.");
      return { ...current, status: "ready" as MatchStatus };
    }
    const dto = parseBackendMatch(
      await this.client.request<unknown>(`matches/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: mapStatusToBackend(status) }),
      }),
    );
    return this.map(dto);
  }
}

export function createBackendMatchRepository(
  options: BackendMatchRepositoryOptions,
): BackendMatchRepository {
  return new BackendMatchRepository(options);
}
