export interface CredentialPair {
  readonly accessToken: string;
  readonly refreshToken: string;
}

export interface CredentialStore {
  get(): CredentialPair | null;
  set(credentials: CredentialPair): void;
  clear(): void;
  onCleared?(listener: () => void): () => void;
}

export class MemoryCredentialStore implements CredentialStore {
  private credentials: CredentialPair | null = null;
  private readonly clearedListeners = new Set<() => void>();

  get(): CredentialPair | null {
    return this.credentials ? { ...this.credentials } : null;
  }

  set(credentials: CredentialPair): void {
    this.credentials = { ...credentials };
  }

  clear(): void {
    const hadCredentials = this.credentials !== null;
    this.credentials = null;
    if (hadCredentials) {
      for (const listener of this.clearedListeners) listener();
    }
  }

  onCleared(listener: () => void): () => void {
    this.clearedListeners.add(listener);
    return () => this.clearedListeners.delete(listener);
  }
}
