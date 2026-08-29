/**
 * Persistence-safe domain models for the local prototype.
 *
 * These types intentionally contain no passwords, tokens, hashes, or other
 * authentication secrets. Transient credential input must stay in the auth
 * adapter boundary and must never be represented by a persisted model.
 */

export type SessionMode = "backend" | "simulated" | "demo";
export type MatchStatus = "draft" | "ready" | "live" | "completed";
export type CompetitionType = "singles" | "doubles";
export type CameraStatus = "disconnected" | "connecting" | "ready" | "error";

export interface OperatorProfile {
  id: string;
  displayName: string;
  email: string;
  createdAt: string;
}

export interface Session {
  profileId: string;
  mode: SessionMode;
  startedAt: string;
  demoMatchId?: string;
  demoTrialStartedAt?: string;
}

/**
 * The displayName is the visible side/team label. For singles it can be the
 * sole player's name; for doubles it may be a team label separate from the
 * two player names.
 */
export interface MatchSide {
  displayName: string;
  players: string[];
}

export interface MatchFormat {
  bestOfGames: number;
  pointsToWin: number;
}

export interface MatchRecord {
  id: string;
  eventName: string;
  court: string;
  competitionType: CompetitionType;
  sideA: MatchSide;
  sideB: MatchSide;
  format: MatchFormat;
  status: MatchStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CameraReadiness {
  status: CameraStatus;
  simulated: boolean;
  message?: string;
}

export interface CalibrationProfile {
  id: string;
  name: string;
  simulated: boolean;
}

export interface HardwareReadiness {
  matchId: string;
  cameraA: CameraReadiness;
  cameraB: CameraReadiness;
  calibrationProfile: CalibrationProfile | null;
}
