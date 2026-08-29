import type {
  AuthenticatedOperator,
  AuthService,
  RegistrationInput,
  SignInInput,
} from "../../services";

type SessionSource = "normal" | "demo";

/**
 * Keeps production authentication and the anonymous demo on separate service
 * boundaries while presenting one application-facing authentication service.
 */
export class HybridAuthService implements AuthService {
  private activeSource: SessionSource | null = null;

  constructor(
    private readonly normal: AuthService,
    private readonly demo: AuthService,
  ) {}

  async getCurrentSession(): Promise<AuthenticatedOperator | null> {
    const normalIdentity = await this.normal.getCurrentSession();
    if (normalIdentity) {
      this.activeSource = "normal";
      return normalIdentity;
    }

    const demoIdentity = await this.demo.getCurrentSession();
    if (demoIdentity?.session.mode === "demo") {
      this.activeSource = "demo";
      return demoIdentity;
    }

    this.activeSource = null;
    return null;
  }

  async register(input: RegistrationInput): Promise<AuthenticatedOperator> {
    const identity = await this.normal.register(input);
    this.activeSource = "normal";
    return identity;
  }

  async signIn(input: SignInInput): Promise<AuthenticatedOperator> {
    const identity = await this.normal.signIn(input);
    this.activeSource = "normal";
    return identity;
  }

  async continueAsDemo(): Promise<AuthenticatedOperator> {
    const identity = await this.demo.continueAsDemo();
    this.activeSource = "demo";
    return identity;
  }

  assignDemoMatch(matchId: string): Promise<AuthenticatedOperator> {
    return this.demo.assignDemoMatch(matchId);
  }

  startDemoTrial(): Promise<AuthenticatedOperator> {
    return this.demo.startDemoTrial();
  }

  async signOut(): Promise<void> {
    const source = this.activeSource;
    if (source === "normal") await this.normal.signOut();
    else if (source === "demo") await this.demo.signOut();
    else await Promise.all([this.normal.signOut(), this.demo.signOut()]);
    this.activeSource = null;
  }

  onSessionInvalidated(listener: () => void): () => void {
    return this.normal.onSessionInvalidated?.(listener) ?? (() => undefined);
  }
}

export function createHybridAuthService(
  normal: AuthService,
  demo: AuthService,
): AuthService {
  return new HybridAuthService(normal, demo);
}
