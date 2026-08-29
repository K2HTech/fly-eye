import type {
  CompetitionType,
  MatchRecord,
  MatchSide,
  MatchStatus,
} from "../../../domain";

export type BackendMatchStatus = "draft" | "live" | "finished";

export interface BackendPlayerDto {
  name: string;
  team: "A" | "B";
}

export interface BackendMatchDto {
  id: string;
  title: string;
  venue: string;
  format: CompetitionType;
  scheduledAt: string;
  status: BackendMatchStatus;
  players: BackendPlayerDto[];
  cameras: unknown[];
  stats: {
    clipCount: number;
    callCount: number;
    inconclusiveCount: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface BackendMatchListDto {
  items: BackendMatchDto[];
  nextCursor: string | null;
}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function object(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    throw new Error("Invalid backend response.");
  return value as Record<string, unknown>;
}

function requiredString(body: Record<string, unknown>, key: string): string {
  const value = body[key];
  if (typeof value !== "string" || value.trim().length === 0)
    throw new Error("Invalid backend response.");
  return value;
}

function requiredDate(body: Record<string, unknown>, key: string): string {
  const value = requiredString(body, key);
  if (!Number.isFinite(Date.parse(value)))
    throw new Error("Invalid backend response.");
  return value;
}

function nonNegativeInteger(
  body: Record<string, unknown>,
  key: string,
): number {
  const value = body[key];
  if (!Number.isInteger(value) || (value as number) < 0)
    throw new Error("Invalid backend response.");
  return value as number;
}

function parsePlayer(value: unknown): BackendPlayerDto {
  const body = object(value);
  const name = requiredString(body, "name");
  const team = body.team;
  if (team !== "A" && team !== "B")
    throw new Error("Invalid backend response.");
  return { name, team };
}

function parseMatch(value: unknown): BackendMatchDto {
  const body = object(value);
  const id = requiredString(body, "id");
  const format = body.format;
  const status = body.status;
  const players = body.players;
  const cameras = body.cameras;
  const stats = object(body.stats);
  if (
    !uuidPattern.test(id) ||
    (format !== "singles" && format !== "doubles") ||
    (status !== "draft" && status !== "live" && status !== "finished") ||
    !Array.isArray(players) ||
    players.length > 4 ||
    !Array.isArray(cameras) ||
    cameras.some(
      (camera) =>
        typeof camera !== "object" || camera === null || Array.isArray(camera),
    )
  )
    throw new Error("Invalid backend response.");
  return {
    id,
    title: requiredString(body, "title"),
    venue: requiredString(body, "venue"),
    format,
    scheduledAt: requiredDate(body, "scheduledAt"),
    status,
    players: players.map(parsePlayer),
    cameras,
    stats: {
      clipCount: nonNegativeInteger(stats, "clipCount"),
      callCount: nonNegativeInteger(stats, "callCount"),
      inconclusiveCount: nonNegativeInteger(stats, "inconclusiveCount"),
    },
    createdAt: requiredDate(body, "createdAt"),
    updatedAt: requiredDate(body, "updatedAt"),
  };
}

export function parseBackendMatch(value: unknown): BackendMatchDto {
  return parseMatch(value);
}

export function parseBackendMatchList(value: unknown): BackendMatchListDto {
  const body = object(value);
  if (!Array.isArray(body.items)) throw new Error("Invalid backend response.");
  const cursor = body.nextCursor;
  if (cursor !== null && (typeof cursor !== "string" || cursor.length === 0))
    throw new Error("Invalid backend response.");
  return {
    items: body.items.map(parseMatch),
    nextCursor: cursor,
  };
}

export function mapMatchPlayers(
  sideA: MatchSide,
  sideB: MatchSide,
): BackendPlayerDto[] {
  return [
    ...sideA.players.map((name) => ({ name, team: "A" as const })),
    ...sideB.players.map((name) => ({ name, team: "B" as const })),
  ];
}

function mapStatus(status: BackendMatchStatus): Exclude<MatchStatus, "ready"> {
  return status === "finished" ? "completed" : status;
}

function mapSide(players: BackendPlayerDto[], team: "A" | "B"): MatchSide {
  const names = players
    .filter((player) => player.team === team)
    .map((player) => player.name);
  return { displayName: names.join(" / "), players: names };
}

export function mapBackendMatch(
  dto: BackendMatchDto,
  status: MatchStatus = mapStatus(dto.status),
): MatchRecord {
  return {
    id: dto.id,
    eventName: dto.title,
    court: dto.venue,
    competitionType: dto.format,
    sideA: mapSide(dto.players, "A"),
    sideB: mapSide(dto.players, "B"),
    format: { bestOfGames: 3, pointsToWin: 21 },
    status,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

export function mapStatusToBackend(status: MatchStatus): BackendMatchStatus {
  if (status === "completed") return "finished";
  if (status === "draft" || status === "live") return status;
  throw new Error("The ready match state is local and has no backend status.");
}
