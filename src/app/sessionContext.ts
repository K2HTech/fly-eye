import { createContext, useContext } from "react";

import type {
  AuthenticatedOperator,
  RegistrationInput,
  SignInInput,
} from "../services";

export type SessionStatus = "restoring" | "authenticated" | "anonymous";

export interface SessionContextValue {
  status: SessionStatus;
  identity: AuthenticatedOperator | null;
  error: Error | null;
  refresh(): Promise<void>;
  register(input: RegistrationInput): Promise<AuthenticatedOperator>;
  signIn(input: SignInInput): Promise<AuthenticatedOperator>;
  continueAsDemo(): Promise<AuthenticatedOperator>;
  assignDemoMatch(matchId: string): Promise<AuthenticatedOperator>;
  startDemoTrial(): Promise<AuthenticatedOperator>;
  signOut(): Promise<void>;
}

export const SessionContext = createContext<SessionContextValue | null>(null);

export function useSession(): SessionContextValue {
  const session = useContext(SessionContext);
  if (!session) {
    throw new Error("useSession must be used within SessionProvider");
  }
  return session;
}
