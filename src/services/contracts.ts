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

export interface CalibrationPoint {
  readonly x: number;
  readonly y: number;
}

export interface CalibrationSeedPoint {
  readonly image: CalibrationPoint;
  readonly court: CalibrationPoint;
}

export interface CalibrationFrameDeclaration {
  readonly contentType: "image/jpeg";
  readonly sizeBytes: number;
  readonly checksumSha256: string;
}

export interface CalibrationFrameUpload {
  readonly assetId: string;
  readonly url: string;
  readonly method: "PUT";
  readonly headers: Readonly<Record<string, string>>;
  readonly expiresAt: string;
}

export interface CalibrationResult {
  readonly id: string;
  readonly cameraId: string;
  readonly engineVersion: string;
  readonly seedPoints: readonly CalibrationSeedPoint[];
  readonly homography: readonly [
    readonly [number, number, number],
    readonly [number, number, number],
    readonly [number, number, number],
  ];
  readonly distortion: {
    readonly k1: number;
    readonly cx: number;
    readonly cy: number;
    readonly scale: number;
  } | null;
  readonly lineErrorsCm: Readonly<Record<string, number>>;
  readonly resolutionCmPerPx: Readonly<Record<string, number>>;
  readonly reprojectionErrorCm: number;
  readonly straightnessBeforePx: number;
  readonly straightnessAfterPx: number;
  readonly framesUsed: number;
  readonly framesRejected: number;
  readonly sampleCount: number;
  readonly converged: boolean;
  readonly cameraStable: boolean;
  readonly quality: "good" | "acceptable" | "poor";
  readonly courtOutlineImage: readonly CalibrationPoint[];
  readonly wireframeImage: Readonly<
    Record<string, readonly [CalibrationPoint, CalibrationPoint]>
  >;
  readonly isCurrent: boolean;
  readonly createdAt: string;
}

export interface CalibrationSolveInput {
  readonly frameAssetIds: readonly string[];
  readonly seedPoints: readonly CalibrationSeedPoint[];
  readonly frameSize: { readonly w: number; readonly h: number };
}

export interface CalibrationService {
  createFrameUploads(
    cameraId: string,
    frames: readonly CalibrationFrameDeclaration[],
  ): Promise<readonly CalibrationFrameUpload[]>;
  getCurrent(cameraId: string): Promise<CalibrationResult | null>;
  solve(
    cameraId: string,
    input: CalibrationSolveInput,
  ): Promise<CalibrationResult>;
}

export interface CameraConnectionCallbacks {
  onPairing(pairing: PairingSession): void;
  onStream(stream: MediaStream): void;
  onState(state: "negotiating" | "connected" | "reconnecting" | "error"): void;
  onError(): void;
}

export interface CameraConnection {
  begin(matchId: string, camera: CameraRecord): Promise<PairingSession>;
  close(): void;
}

export interface CameraConnectionFactory {
  create(callbacks: CameraConnectionCallbacks): CameraConnection;
}

export interface AppServices {
  auth: AuthService;
  matches: MatchRepository;
  readiness: ReadinessService;
  /** Present when the normal backend camera boundary is configured. */
  cameras?: CameraRegistry;
  pairing?: PairingService;
  cameraConnections?: CameraConnectionFactory;
  calibration?: CalibrationService;
}
