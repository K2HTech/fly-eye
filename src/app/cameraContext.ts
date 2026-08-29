import { createContext, useContext } from "react";

import type { CameraSessionSnapshot } from "../features/cameras";
import type { CameraRole } from "../services";

export interface CameraContextValue {
  readonly sessions: Readonly<Record<CameraRole, CameraSessionSnapshot>>;
  disconnect(role: CameraRole): void;
  disconnectAll(): void;
}

export const CameraContext = createContext<CameraContextValue | null>(null);

export function useCameraSessions(): CameraContextValue {
  const value = useContext(CameraContext);
  if (!value)
    throw new Error("useCameraSessions must be used within CameraProvider");
  return value;
}
