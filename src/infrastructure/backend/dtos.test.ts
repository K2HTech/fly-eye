import { describe, expect, it } from "vitest";

import {
  mapBackendUser,
  parseBackendTokenPair,
  parseBackendUser,
} from "./dtos";

describe("backend DTO boundaries", () => {
  it("maps backend identity to an application backend session", () => {
    expect(
      mapBackendUser(
        { id: "1", email: "a@test", created_at: "now" },
        () => "started",
      ),
    ).toEqual({
      profile: {
        id: "1",
        email: "a@test",
        displayName: "a@test",
        createdAt: "now",
      },
      session: { profileId: "1", mode: "backend", startedAt: "started" },
    });
  });

  it("rejects malformed users and token pairs", () => {
    expect(() => parseBackendUser({ id: "1" })).toThrow(
      "Invalid backend response.",
    );
    expect(() =>
      parseBackendTokenPair({
        access_token: "a",
        refresh_token: "r",
        token_type: "basic",
      }),
    ).toThrow("Invalid backend response.");
  });

  it.each([
    {
      id: "not-a-uuid",
      email: "operator@example.com",
      created_at: "2026-08-29T00:00:00Z",
    },
    {
      id: "00000000-0000-4000-8000-000000000001",
      email: "not-an-email",
      created_at: "2026-08-29T00:00:00Z",
    },
    {
      id: "00000000-0000-4000-8000-000000000001",
      email: "operator@example.com",
      created_at: "not-a-date",
    },
  ])("rejects an invalid backend user field", (value) => {
    expect(() => parseBackendUser(value)).toThrow("Invalid backend response.");
  });
});
