import type { CompetitionType } from "../../domain";
import type { CreateMatchInput } from "../../services";

export type MatchFormField =
  | "eventName"
  | "court"
  | "sideAPlayer1"
  | "sideAPlayer2"
  | "sideBPlayer1"
  | "sideBPlayer2";

export type MatchLength = 1 | 3;
export type PointsToWin = 15 | 21;

export interface MatchFormValues {
  eventName: string;
  court: string;
  competitionType: CompetitionType;
  bestOfGames: MatchLength;
  pointsToWin: PointsToWin;
  sideAPlayer1: string;
  sideAPlayer2: string;
  sideBPlayer1: string;
  sideBPlayer2: string;
}

export type MatchFormErrors = Partial<Record<MatchFormField, string>>;

const detailFields = ["eventName", "court"] as const;
const participantFields = [
  "sideAPlayer1",
  "sideAPlayer2",
  "sideBPlayer1",
  "sideBPlayer2",
] as const;

function required(value: string, message: string): string | undefined {
  return value.trim() ? undefined : message;
}

export function validateMatchDetails(values: MatchFormValues): MatchFormErrors {
  return {
    eventName: required(values.eventName, "Enter an event or match name."),
    court: required(values.court, "Enter a court name or number."),
  };
}

export function validateMatchParticipants(
  values: MatchFormValues,
): MatchFormErrors {
  const errors: MatchFormErrors = {
    sideAPlayer1: required(
      values.sideAPlayer1,
      "Enter the first side A player.",
    ),
    sideBPlayer1: required(
      values.sideBPlayer1,
      "Enter the first side B player.",
    ),
  };

  if (values.competitionType === "doubles") {
    errors.sideAPlayer2 = required(
      values.sideAPlayer2,
      "Enter the second side A player.",
    );
    errors.sideBPlayer2 = required(
      values.sideBPlayer2,
      "Enter the second side B player.",
    );
  }

  return errors;
}

export function firstInvalidField(
  errors: MatchFormErrors,
  section: "details" | "participants",
): MatchFormField | undefined {
  const fields = section === "details" ? detailFields : participantFields;
  return fields.find((field) => errors[field]);
}

function playersForSide(
  primary: string,
  secondary: string,
  type: CompetitionType,
) {
  const players = [primary.trim()];
  if (type === "doubles") players.push(secondary.trim());
  return players;
}

function displayName(players: string[]): string {
  return players.join(" / ");
}

export function toCreateMatchInput(values: MatchFormValues): CreateMatchInput {
  const sideAPlayers = playersForSide(
    values.sideAPlayer1,
    values.sideAPlayer2,
    values.competitionType,
  );
  const sideBPlayers = playersForSide(
    values.sideBPlayer1,
    values.sideBPlayer2,
    values.competitionType,
  );

  return {
    eventName: values.eventName.trim(),
    court: values.court.trim(),
    competitionType: values.competitionType,
    sideA: { displayName: displayName(sideAPlayers), players: sideAPlayers },
    sideB: { displayName: displayName(sideBPlayers), players: sideBPlayers },
    format: {
      bestOfGames: values.bestOfGames,
      pointsToWin: values.pointsToWin,
    },
  };
}
