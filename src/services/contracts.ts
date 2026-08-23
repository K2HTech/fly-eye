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

export interface AuthenticatedOperator {
  profile: OperatorProfile;
  session: Session;
}

// Credential fields are transient inputs. They must never be passed to a
// persistence adapter or included in a persistence-safe domain model.
export interface RegistrationInput {
  displayName: string;
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

export interface AppServices {
  auth: AuthService;
  matches: MatchRepository;
  readiness: ReadinessService;
}
