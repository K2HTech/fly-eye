import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import type { MatchRecord, MatchStatus } from "../domain";
import {
  NoActiveSessionError,
  type CreateMatchInput,
  type UpdateMatchInput,
} from "../services";
import {
  MatchContext,
  type MatchCollectionStatus,
  type MatchContextValue,
} from "./matchContext";
import { useAppServices } from "./servicesContext";
import { useSession } from "./sessionContext";

interface MatchProviderProps {
  children: ReactNode;
}

export function MatchProvider({ children }: MatchProviderProps) {
  const { matches: repository } = useAppServices();
  const session = useSession();
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [status, setStatus] = useState<MatchCollectionStatus>("idle");
  const [error, setError] = useState<Error | null>(null);
  const requestVersion = useRef(0);

  const refresh = useCallback(async () => {
    const request = ++requestVersion.current;
    if (session.status !== "authenticated") {
      setMatches([]);
      setStatus("idle");
      setError(null);
      return;
    }

    setStatus("loading");
    try {
      const records = await repository.list();
      if (request !== requestVersion.current) return;
      setMatches(records);
      setStatus("ready");
      setError(null);
    } catch (cause) {
      if (request !== requestVersion.current) return;
      setStatus("error");
      setError(
        cause instanceof Error ? cause : new Error("Unable to load matches."),
      );
    }
  }, [repository, session.status]);

  useEffect(() => {
    let active = true;
    const request = ++requestVersion.current;

    if (session.status === "authenticated") {
      void repository
        .list()
        .then((records) => {
          if (!active || request !== requestVersion.current) return;
          setMatches(records);
          setStatus("ready");
          setError(null);
        })
        .catch((cause: unknown) => {
          if (!active || request !== requestVersion.current) return;
          setStatus("error");
          setError(
            cause instanceof Error
              ? cause
              : new Error("Unable to load matches."),
          );
        });
    } else {
      queueMicrotask(() => {
        if (!active || request !== requestVersion.current) return;
        setMatches([]);
        setStatus("idle");
        setError(null);
      });
    }

    return () => {
      active = false;
      requestVersion.current += 1;
    };
  }, [repository, session.identity?.profile.id, session.status]);

  const requireSession = useCallback(() => {
    if (session.status !== "authenticated") throw new NoActiveSessionError();
  }, [session.status]);

  const remember = useCallback((record: MatchRecord) => {
    setMatches((current) => {
      const index = current.findIndex((match) => match.id === record.id);
      if (index === -1) return [record, ...current];
      const next = [...current];
      next[index] = record;
      return next;
    });
    setStatus("ready");
    setError(null);
    return record;
  }, []);

  const runMutation = useCallback(
    async (operation: () => Promise<MatchRecord>) => {
      requireSession();
      const request = ++requestVersion.current;
      try {
        const record = await operation();
        return request === requestVersion.current ? remember(record) : record;
      } catch (cause) {
        if (request === requestVersion.current) {
          setError(
            cause instanceof Error
              ? cause
              : new Error("Unable to update the match."),
          );
        }
        throw cause;
      }
    },
    [remember, requireSession],
  );

  const create = useCallback(
    (input: CreateMatchInput) => runMutation(() => repository.create(input)),
    [repository, runMutation],
  );
  const update = useCallback(
    (id: string, input: UpdateMatchInput) =>
      runMutation(() => repository.update(id, input)),
    [repository, runMutation],
  );
  const updateStatus = useCallback(
    (id: string, nextStatus: MatchStatus) =>
      runMutation(() => repository.updateStatus(id, nextStatus)),
    [repository, runMutation],
  );

  const value = useMemo<MatchContextValue>(
    () => ({
      matches,
      status,
      error,
      refresh,
      create,
      update,
      updateStatus,
    }),
    [matches, status, error, refresh, create, update, updateStatus],
  );

  return (
    <MatchContext.Provider value={value}>{children}</MatchContext.Provider>
  );
}
