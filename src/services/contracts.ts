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

export interface CameraUpdateInput {
  readonly resolution?: { readonly w: number; readonly h: number };
  readonly targetFps?: number;
}

export interface CameraRegistry {
  list(matchId: string): Promise<CameraRecord[]>;
  provision(matchId: string, role: CameraRole): Promise<CameraRecord>;
  update(
    matchId: string,
    cameraId: string,
    input: CameraUpdateInput,
  ): Promise<CameraRecord>;
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

/** An in-memory JPEG captured from a live camera preview. */
export interface CapturedCalibrationFrame {
  readonly bytes: Blob;
  readonly previewDataUrl: string;
  readonly width: number;
  readonly height: number;
  readonly declaration: CalibrationFrameDeclaration;
}

/** Browser/media boundary used by the calibration route; nothing is persisted. */
export interface CalibrationFrameCaptureService {
  capture(stream: MediaStream): Promise<CapturedCalibrationFrame>;
  upload(target: CalibrationFrameUpload, bytes: Blob): Promise<void>;
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
  readonly straightnessBeforePx: number | null;
  readonly straightnessAfterPx: number | null;
  readonly framesUsed: number;
  readonly framesRejected: number;
  readonly sampleCount: number;
  readonly converged: boolean;
  readonly cameraStable: boolean;
  readonly quality: "good" | "acceptable" | "poor";
  readonly courtOutlineImage: readonly CalibrationPoint[];
  readonly wireframeImage: Readonly<
    Record<string, readonly CalibrationPoint[]>
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

export interface RallyClipAssetDeclaration {
  readonly cameraId: string;
  readonly contentType: "video/mp4";
  readonly codec: "h264";
  readonly fps: number;
  readonly frameCount: number;
  readonly startTsUs: number;
  readonly endTsUs: number;
  readonly sizeBytes: number;
  readonly checksumSha256: string;
}

export interface RallyClipUploadTarget {
  readonly cameraId: string;
  readonly assetId: string;
  readonly url: string;
  readonly method: "PUT";
  readonly headers: Readonly<Record<string, string>>;
  readonly expiresAt: string;
}

export interface RallyClip {
  readonly id: string;
  readonly matchId: string;
  readonly capturedAt: string;
  readonly durationMs: number;
  readonly status: "uploading" | "ready" | "failed";
  readonly assets: readonly RallyClipAssetDeclaration[];
}

export interface CreateRallyClipInput {
  readonly capturedAt: string;
  readonly durationMs: number;
  readonly note?: string | null;
  readonly assets: readonly RallyClipAssetDeclaration[];
}

export interface CreatedRallyClip {
  readonly clip: RallyClip;
  readonly uploads: readonly RallyClipUploadTarget[];
}

export interface RallyClipService {
  create(
    matchId: string,
    input: CreateRallyClipInput,
  ): Promise<CreatedRallyClip>;
  upload(target: RallyClipUploadTarget, bytes: Blob): Promise<void>;
  complete(clipId: string): Promise<RallyClip>;
}

export type AnalysisStatus = "queued" | "running" | "done" | "failed";
export type AnalysisVerdict = "IN" | "OUT" | "INCONCLUSIVE";

export interface RallyAnalysis {
  readonly id: string;
  readonly clipId: string;
  readonly status: AnalysisStatus;
  readonly progress: number;
  readonly stage: string;
  readonly verdict: AnalysisVerdict | null;
  readonly confidence: number | null;
  readonly landing: CalibrationPoint | null;
  readonly uncertaintyCm: number | null;
  readonly nearestLine: string | null;
  readonly distanceToLineCm: number | null;
  readonly reasonCode: string | null;
  readonly reasonText: string | null;
  readonly perCamera:
    | readonly {
        readonly cameraId: string;
        readonly trackPoints: number;
        readonly landing: CalibrationPoint | null;
        readonly trajectoryResidual: number;
        readonly occlusionScore: number;
        readonly usable: boolean;
      }[]
    | null;
  readonly overlays: Readonly<{
    frame: string | null;
    topdown: string | null;
    trajectory: string | null;
  }>;
  readonly error: Readonly<{ code: string; message: string }> | null;
}

export interface RallyAnalysisService {
  submit(clipId: string, force?: boolean): Promise<{ analysisId: string }>;
  get(analysisId: string): Promise<RallyAnalysis>;
  /** Resolves an authenticated, short-lived backend overlay endpoint to bytes. */
  getOverlay(path: string): Promise<Blob>;
}

export interface RallyCaptureSnapshot {
  readonly role: CameraRole;
  readonly bytes: Blob;
  readonly contentType: "video/mp4";
  readonly codec: "h264";
  readonly fps: number;
  readonly frameCount: number;
  readonly startTsUs: number;
  readonly endTsUs: number;
}

export interface RallyCaptureService {
  start(role: CameraRole, stream: MediaStream, fps: number): void;
  stop(role: CameraRole): void;
  stopAll(): void;
  snapshot(
    roles: readonly CameraRole[],
  ): Promise<readonly RallyCaptureSnapshot[]>;
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
  calibrationFrames?: CalibrationFrameCaptureService;
  clips?: RallyClipService;
  analyses?: RallyAnalysisService;
  rallyCapture?: RallyCaptureService;
}
