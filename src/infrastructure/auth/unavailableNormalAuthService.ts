import type { AuthenticatedOperator, AuthService } from "../../services";

export class UnavailableNormalAuthService implements AuthService {
  constructor(
    private readonly message = "Backend authentication is unavailable.",
  ) {}

  async getCurrentSession(): Promise<null> {
    return null;
  }

  async register(): Promise<AuthenticatedOperator> {
    throw new Error(this.message);
  }

  async signIn(): Promise<AuthenticatedOperator> {
    throw new Error(this.message);
  }

  async signOut(): Promise<void> {}

  async continueAsDemo(): Promise<AuthenticatedOperator> {
    throw new Error("Demo authentication is owned by the local service.");
  }

  async assignDemoMatch(): Promise<AuthenticatedOperator> {
    throw new Error("Demo authentication is owned by the local service.");
  }

  async startDemoTrial(): Promise<AuthenticatedOperator> {
    throw new Error("Demo authentication is owned by the local service.");
  }
}
