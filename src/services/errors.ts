export type PersistenceOperation = "read" | "write" | "remove";

export class LocalPersistenceError extends Error {
  readonly key: string;
  readonly operation: PersistenceOperation;

  constructor(operation: PersistenceOperation, key: string) {
    super(`Unable to ${operation} application data.`);
    this.name = "LocalPersistenceError";
    this.operation = operation;
    this.key = key;
  }
}

export class InvalidPersistencePayloadError extends Error {
  readonly key: string;

  constructor(key: string) {
    super("Refused invalid application data.");
    this.name = "InvalidPersistencePayloadError";
    this.key = key;
  }
}

export class RecordNotFoundError extends Error {
  readonly recordId: string;

  constructor(recordType: string, recordId: string) {
    super(`${recordType} ${recordId} was not found.`);
    this.name = "RecordNotFoundError";
    this.recordId = recordId;
  }
}

export class DemoAuthenticationError extends Error {
  readonly code: "profile-not-found" | "email-mismatch" | "demo-match-locked";

  constructor(code: DemoAuthenticationError["code"], message: string) {
    super(message);
    this.name = "DemoAuthenticationError";
    this.code = code;
  }
}

export class NoActiveSessionError extends Error {
  constructor() {
    super("An active session is required.");
    this.name = "NoActiveSessionError";
  }
}

export class HardwareNotReadyError extends Error {
  readonly matchId: string;

  constructor(matchId: string) {
    super(
      `Match ${matchId} cannot become ready until all hardware checks pass.`,
    );
    this.name = "HardwareNotReadyError";
    this.matchId = matchId;
  }
}
