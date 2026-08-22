import { createContext, useContext } from "react";

import type { MatchRecord, MatchStatus } from "../domain";
import type { CreateMatchInput, UpdateMatchInput } from "../services";

export type MatchCollectionStatus = "idle" | "loading" | "ready" | "error";

export interface MatchContextValue {
  matches: MatchRecord[];
  status: MatchCollectionStatus;
  error: Error | null;
  refresh(): Promise<void>;
  create(input: CreateMatchInput): Promise<MatchRecord>;
  update(id: string, input: UpdateMatchInput): Promise<MatchRecord>;
  updateStatus(id: string, status: MatchStatus): Promise<MatchRecord>;
}

export const MatchContext = createContext<MatchContextValue | null>(null);

export function useMatches(): MatchContextValue {
  const matches = useContext(MatchContext);
  if (!matches) {
    throw new Error("useMatches must be used within MatchProvider");
  }
  return matches;
}
