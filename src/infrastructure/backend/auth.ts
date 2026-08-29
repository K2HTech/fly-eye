import type {
  AuthenticatedOperator,
  AuthService,
  RegistrationInput,
  SignInInput,
} from "../../services";
import type { BackendHttpClient } from "./httpClient";
import { MemoryCredentialStore, type CredentialStore } from "./credentials";
import {
  mapBackendUser,
  parseBackendTokenPair,
  parseBackendUser,
} from "./dtos";

export interface BackendAuthServiceOptions {
  client: BackendHttpClient;
  credentials?: CredentialStore;
  now?: () => string;
}

export class BackendAuthService implements AuthService {
  readonly credentials: CredentialStore;
  private readonly client: BackendHttpClient;
  private readonly now: () => string;

  constructor(options: BackendAuthServiceOptions) {
    this.client = options.client;
    this.credentials = options.credentials ?? new MemoryCredentialStore();
    this.now = options.now ?? (() => new Date().toISOString());
  }

  private async authenticate(
    email: string,
    password: string,
  ): Promise<AuthenticatedOperator> {
    const raw = await this.client.request<unknown>("auth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const pair = parseBackendTokenPair(raw);
    this.credentials.set({
      accessToken: pair.access_token,
      refreshToken: pair.refresh_token,
    });
    try {
      return await this.current();
    } catch (error) {
      this.credentials.clear();
      throw error;
    }
  }

  private async current(): Promise<AuthenticatedOperator> {
    const user = parseBackendUser(
      await this.client.request<unknown>("auth/me"),
    );
    return mapBackendUser(user, this.now);
  }

  async register(input: RegistrationInput): Promise<AuthenticatedOperator> {
    parseBackendUser(
      await this.client.request<unknown>("auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: input.email.trim().toLowerCase(),
          password: input.password,
        }),
      }),
    );
    return this.authenticate(input.email, input.password);
  }

  signIn(input: SignInInput): Promise<AuthenticatedOperator> {
    return this.authenticate(input.email, input.password);
  }

  async getCurrentSession(): Promise<AuthenticatedOperator | null> {
    if (!this.credentials.get()) return null;
    try {
      return await this.current();
    } catch (error) {
      this.credentials.clear();
      throw error;
    }
  }

  async signOut(): Promise<void> {
    const current = this.credentials.get();
    try {
      if (current)
        await this.client.request<void>("auth/logout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: current.refreshToken }),
        });
    } catch {
      /* Logout is best effort when the service is unavailable. */
    } finally {
      this.credentials.clear();
    }
  }

  onSessionInvalidated(listener: () => void): () => void {
    return this.credentials.onCleared?.(listener) ?? (() => undefined);
  }

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

export function createBackendAuthService(
  options: Omit<BackendAuthServiceOptions, "client"> & {
    client: BackendHttpClient;
  },
): BackendAuthService {
  return new BackendAuthService(options);
}
