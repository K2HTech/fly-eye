import type {
  CalibrationProfile,
  CameraReadiness,
  CompetitionType,
  HardwareReadiness,
  MatchFormat,
  MatchRecord,
  MatchSide,
  MatchStatus,
  OperatorProfile,
  Session,
} from "../domain";
import type { PairingSession } from "../features/cameras";

export interface AuthenticatedOperator {
  profile: OperatorProfile;
  session: Session;
}

// Credential fields are transient inputs. They must never be passed to a
// persistence adapter or included in a persistence-safe domain model.
export interface RegistrationInput {
  email: string;
  password: string;
  passwordConfirmation: string;
}

export interface SignInInput {
  email: string;
  password: string;
}

export interface AuthService {
  getCurrentSession(): Promise<AuthenticatedOperator | null>;
  register(input: RegistrationInput): Promise<AuthenticatedOperator>;
  signIn(input: SignInInput): Promise<AuthenticatedOperator>;
  continueAsDemo(): Promise<AuthenticatedOperator>;
  assignDemoMatch(matchId: string): Promise<AuthenticatedOperator>;
  startDemoTrial(): Promise<AuthenticatedOperator>;
  signOut(): Promise<void>;
  onSessionInvalidated?(listener: () => void): () => void;
}

export interface CreateMatchInput {
  eventName: string;
  court: string;
  competitionType: CompetitionType;
  sideA: MatchSide;
  sideB: MatchSide;
  format: MatchFormat;
}

export interface UpdateMatchInput {
  eventName?: string;
  court?: string;
  competitionType?: CompetitionType;
  sideA?: MatchSide;
  sideB?: MatchSide;
  format?: MatchFormat;
}

export interface MatchRepository {
  list(): Promise<MatchRecord[]>;
  get(id: string): Promise<MatchRecord | null>;
  create(input: CreateMatchInput): Promise<MatchRecord>;
  update(id: string, input: UpdateMatchInput): Promise<MatchRecord>;
  updateStatus(id: string, status: MatchStatus): Promise<MatchRecord>;
}

export interface UpdateReadinessInput {
  cameraA?: CameraReadiness;
  cameraB?: CameraReadiness;
  calibrationProfile?: CalibrationProfile | null;
}

export interface ReadinessService {
  get(matchId: string): Promise<HardwareReadiness>;
  save(
    matchId: string,
    input: UpdateReadinessInput,
  ): Promise<HardwareReadiness>;
}

export type CameraRole = "SIDELINE_LEFT" | "SIDELINE_RIGHT";

export interface CameraRecord {
  readonly id: string;
  readonly matchId: string;
  readonly name: string;
  readonly role: CameraRole;
  readonly sourceType: "device";
  readonly sourceRef: string;
  readonly resolution: {
    readonly width: number;
    readonly height: number;
  };
  readonly targetFps: number;
  readonly isActive: boolean;
  readonly calibration: Record<string, unknown> | null;
  readonly createdAt: string;
}

export interface PreparedCameraPair {
  readonly left: CameraRecord;
  readonly right: CameraRecord;
}

export interface CameraRegistry {
  list(matchId: string): Promise<CameraRecord[]>;
  prepare(matchId: string): Promise<PreparedCameraPair>;
}

export interface PairingService {
  create(matchId: string, cameraId: string): Promise<PairingSession>;
  cancel(sessionId: string): Promise<void>;
}

export interface AppServices {
  auth: AuthService;
  matches: MatchRepository;
  readiness: ReadinessService;
  /** Present when the normal backend camera boundary is configured. */
  cameras?: CameraRegistry;
  pairing?: PairingService;
}
