import type {
  CalibrationProfile,
  CameraReadiness,
  HardwareReadiness,
  MatchFormat,
  MatchRecord,
  MatchSide,
  OperatorProfile,
  Session,
} from "../../domain";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(
  value: Record<string, unknown>,
  allowedKeys: readonly string[],
): boolean {
  return Object.keys(value).every((key) => allowedKeys.includes(key));
}

function hasOnlyStrings(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
}

function isMatchSide(value: unknown): value is MatchSide {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ["displayName", "players"]) &&
    typeof value.displayName === "string" &&
    hasOnlyStrings(value.players)
  );
}

function isMatchFormat(value: unknown): value is MatchFormat {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ["bestOfGames", "pointsToWin"]) &&
    Number.isInteger(value.bestOfGames) &&
    Number.isInteger(value.pointsToWin) &&
    Number(value.bestOfGames) > 0 &&
    Number(value.pointsToWin) > 0
  );
}

function isCalibrationProfile(value: unknown): value is CalibrationProfile {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ["id", "name", "simulated"]) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.simulated === "boolean"
  );
}

function isCameraReadiness(value: unknown): value is CameraReadiness {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ["status", "simulated", "message"]) &&
    ["disconnected", "connecting", "ready", "error"].includes(
      String(value.status),
    ) &&
    typeof value.simulated === "boolean" &&
    (value.message === undefined || typeof value.message === "string")
  );
}

export function isOperatorProfile(value: unknown): value is OperatorProfile {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ["id", "displayName", "email", "createdAt"]) &&
    typeof value.id === "string" &&
    typeof value.displayName === "string" &&
    typeof value.email === "string" &&
    typeof value.createdAt === "string"
  );
}

export function isNullableOperatorProfile(
  value: unknown,
): value is OperatorProfile | null {
  return value === null || isOperatorProfile(value);
}

export function isOperatorProfileList(
  value: unknown,
): value is OperatorProfile[] {
  return Array.isArray(value) && value.every(isOperatorProfile);
}

export function isSession(value: unknown): value is Session {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, [
      "profileId",
      "mode",
      "startedAt",
      "demoMatchId",
      "demoTrialStartedAt",
    ]) &&
    typeof value.profileId === "string" &&
    (value.mode === "simulated" || value.mode === "demo") &&
    typeof value.startedAt === "string" &&
    (value.demoMatchId === undefined ||
      typeof value.demoMatchId === "string") &&
    (value.demoTrialStartedAt === undefined ||
      typeof value.demoTrialStartedAt === "string")
  );
}

export function isNullableSession(value: unknown): value is Session | null {
  return value === null || isSession(value);
}

export function isMatchRecord(value: unknown): value is MatchRecord {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, [
      "id",
      "eventName",
      "court",
      "competitionType",
      "sideA",
      "sideB",
      "format",
      "status",
      "createdAt",
      "updatedAt",
    ]) &&
    typeof value.id === "string" &&
    typeof value.eventName === "string" &&
    typeof value.court === "string" &&
    (value.competitionType === "singles" ||
      value.competitionType === "doubles") &&
    isMatchSide(value.sideA) &&
    isMatchSide(value.sideB) &&
    isMatchFormat(value.format) &&
    ["draft", "ready", "live", "completed"].includes(String(value.status)) &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string"
  );
}

export function isMatchRecordList(value: unknown): value is MatchRecord[] {
  return Array.isArray(value) && value.every(isMatchRecord);
}

export function isHardwareReadiness(
  value: unknown,
): value is HardwareReadiness {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, [
      "matchId",
      "cameraA",
      "cameraB",
      "calibrationProfile",
    ]) &&
    typeof value.matchId === "string" &&
    isCameraReadiness(value.cameraA) &&
    isCameraReadiness(value.cameraB) &&
    (value.calibrationProfile === null ||
      isCalibrationProfile(value.calibrationProfile))
  );
}

export function isHardwareReadinessList(
  value: unknown,
): value is HardwareReadiness[] {
  return Array.isArray(value) && value.every(isHardwareReadiness);
}
