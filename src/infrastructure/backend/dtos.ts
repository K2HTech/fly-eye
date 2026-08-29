import type { OperatorProfile, Session } from "../../domain";

export interface BackendUserDto {
  id: string;
  email: string;
  created_at: string;
}
export interface BackendTokenPairDto {
  access_token: string;
  refresh_token: string;
  token_type: "bearer";
}

function object(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    throw new Error("Invalid backend response.");
  return value as Record<string, unknown>;
}

function stringField(value: Record<string, unknown>, key: string): string {
  if (typeof value[key] !== "string" || value[key].length === 0)
    throw new Error("Invalid backend response.");
  return value[key];
}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseBackendUser(value: unknown): BackendUserDto {
  const body = object(value);
  const id = stringField(body, "id");
  const email = stringField(body, "email");
  const createdAt = stringField(body, "created_at");
  if (
    !uuidPattern.test(id) ||
    !emailPattern.test(email) ||
    !Number.isFinite(Date.parse(createdAt))
  ) {
    throw new Error("Invalid backend response.");
  }
  return {
    id,
    email,
    created_at: createdAt,
  };
}

export function parseBackendTokenPair(value: unknown): BackendTokenPairDto {
  const body = object(value);
  const tokenType = stringField(body, "token_type");
  if (tokenType.toLowerCase() !== "bearer")
    throw new Error("Invalid backend response.");
  return {
    access_token: stringField(body, "access_token"),
    refresh_token: stringField(body, "refresh_token"),
    token_type: "bearer",
  };
}

export function mapBackendUser(
  user: BackendUserDto,
  now = () => new Date().toISOString(),
): { profile: OperatorProfile; session: Session } {
  return {
    profile: {
      id: user.id,
      email: user.email,
      displayName: user.email,
      createdAt: user.created_at,
    },
    session: { profileId: user.id, mode: "backend", startedAt: now() },
  };
}
