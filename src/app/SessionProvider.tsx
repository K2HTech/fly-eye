import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import type {
  AuthenticatedOperator,
  RegistrationInput,
  SignInInput,
} from "../services";
import { useAppServices } from "./servicesContext";
import {
  SessionContext,
  type SessionContextValue,
  type SessionStatus,
} from "./sessionContext";

interface SessionProviderProps {
  children: ReactNode;
}

interface SessionSnapshot {
  status: SessionStatus;
  identity: AuthenticatedOperator | null;
  error: Error | null;
}

const restoring: SessionSnapshot = {
  status: "restoring",
  identity: null,
  error: null,
};

export function SessionProvider({ children }: SessionProviderProps) {
  const { auth } = useAppServices();
  const [snapshot, setSnapshot] = useState<SessionSnapshot>(restoring);
  const requestVersion = useRef(0);

  const restore = useCallback(async () => {
    const request = ++requestVersion.current;
    setSnapshot(restoring);
    try {
      const identity = await auth.getCurrentSession();
      if (request !== requestVersion.current) return;
      setSnapshot({
        status: identity ? "authenticated" : "anonymous",
        identity,
        error: null,
      });
    } catch (error) {
      if (request !== requestVersion.current) return;
      setSnapshot({
        status: "anonymous",
        identity: null,
        error: error instanceof Error ? error : new Error("Session failed."),
      });
    }
  }, [auth]);

  useEffect(() => {
    void restore();
    return () => {
      requestVersion.current += 1;
    };
  }, [restore]);

  const completeAuthentication = useCallback(
    async (
      operation: () => Promise<AuthenticatedOperator>,
    ): Promise<AuthenticatedOperator> => {
      const request = ++requestVersion.current;
      try {
        const identity = await operation();
        if (request === requestVersion.current) {
          setSnapshot({ status: "authenticated", identity, error: null });
        }
        return identity;
      } catch (error) {
        if (request === requestVersion.current) {
          setSnapshot((current) => ({
            ...current,
            error:
              error instanceof Error
                ? error
                : new Error("Authentication failed."),
          }));
        }
        throw error;
      }
    },
    [],
  );

  const register = useCallback(
    (input: RegistrationInput) =>
      completeAuthentication(() => auth.register(input)),
    [auth, completeAuthentication],
  );
  const signIn = useCallback(
    (input: SignInInput) => completeAuthentication(() => auth.signIn(input)),
    [auth, completeAuthentication],
  );
  const continueAsDemo = useCallback(
    () => completeAuthentication(() => auth.continueAsDemo()),
    [auth, completeAuthentication],
  );
  const startDemoTrial = useCallback(
    () => completeAuthentication(() => auth.startDemoTrial()),
    [auth, completeAuthentication],
  );
  const assignDemoMatch = useCallback(
    (matchId: string) =>
      completeAuthentication(() => auth.assignDemoMatch(matchId)),
    [auth, completeAuthentication],
  );
  const signOut = useCallback(async () => {
    const request = ++requestVersion.current;
    try {
      await auth.signOut();
      if (request === requestVersion.current) {
        setSnapshot({ status: "anonymous", identity: null, error: null });
      }
    } catch (error) {
      if (request === requestVersion.current) {
        setSnapshot((current) => ({
          ...current,
          error: error instanceof Error ? error : new Error("Sign-out failed."),
        }));
      }
      throw error;
    }
  }, [auth]);

  const value = useMemo<SessionContextValue>(
    () => ({
      ...snapshot,
      refresh: restore,
      register,
      signIn,
      continueAsDemo,
      assignDemoMatch,
      startDemoTrial,
      signOut,
    }),
    [
      snapshot,
      restore,
      register,
      signIn,
      continueAsDemo,
      assignDemoMatch,
      startDemoTrial,
      signOut,
    ],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}
