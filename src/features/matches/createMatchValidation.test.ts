import { describe, expect, it } from "vitest";

import {
  firstInvalidField,
  toCreateMatchInput,
  validateMatchDetails,
  validateMatchParticipants,
  type MatchFormValues,
} from "./createMatchValidation";

const validValues: MatchFormValues = {
  eventName: " Fly Eye Open ",
  court: " Court 2 ",
  competitionType: "singles",
  bestOfGames: 3,
  pointsToWin: 21,
  sideAPlayer1: " Nguyen ",
  sideAPlayer2: " Pham ",
  sideBPlayer1: " Tran ",
  sideBPlayer2: " Le ",
};

describe("create-match validation", () => {
  it("requires match details in visual order", () => {
    const errors = validateMatchDetails({
      ...validValues,
      eventName: " ",
      court: "",
    });

    expect(errors).toEqual({
      eventName: "Enter an event or match name.",
      court: "Enter a court name or number.",
    });
    expect(firstInvalidField(errors, "details")).toBe("eventName");
  });

  it("requires one player per side for singles", () => {
    const errors = validateMatchParticipants({
      ...validValues,
      sideAPlayer1: "",
      sideBPlayer1: "",
    });

    expect(errors.sideAPlayer1).toMatch(/first side A player/i);
    expect(errors.sideBPlayer1).toMatch(/first side B player/i);
    expect(errors.sideAPlayer2).toBeUndefined();
    expect(errors.sideBPlayer2).toBeUndefined();
  });

  it("requires both players on each side for doubles", () => {
    const errors = validateMatchParticipants({
      ...validValues,
      competitionType: "doubles",
      sideAPlayer2: "",
      sideBPlayer2: "",
    });

    expect(errors.sideAPlayer2).toMatch(/second side A player/i);
    expect(errors.sideBPlayer2).toMatch(/second side B player/i);
  });

  it("normalizes a backend-ready input without leaking hidden singles values", () => {
    expect(toCreateMatchInput(validValues)).toEqual({
      eventName: "Fly Eye Open",
      court: "Court 2",
      competitionType: "singles",
      sideA: { displayName: "Nguyen", players: ["Nguyen"] },
      sideB: { displayName: "Tran", players: ["Tran"] },
      format: { bestOfGames: 3, pointsToWin: 21 },
    });
  });

  it("derives doubles display names from both retained players", () => {
    const input = toCreateMatchInput({
      ...validValues,
      competitionType: "doubles",
    });

    expect(input.sideA).toEqual({
      displayName: "Nguyen / Pham",
      players: ["Nguyen", "Pham"],
    });
    expect(input.sideB).toEqual({
      displayName: "Tran / Le",
      players: ["Tran", "Le"],
    });
  });

  it.each([
    [1, 15],
    [1, 21],
    [3, 15],
    [3, 21],
  ] as const)(
    "maps %s game(s) and %s points independently to the match format",
    (bestOfGames, pointsToWin) => {
      expect(
        toCreateMatchInput({
          ...validValues,
          bestOfGames,
          pointsToWin,
        }).format,
      ).toEqual({ bestOfGames, pointsToWin });
    },
  );
});
