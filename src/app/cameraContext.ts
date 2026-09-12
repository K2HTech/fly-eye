import { createContext, useContext } from "react";

import type { CameraSessionSnapshot } from "../features/cameras";
import type { CameraRecord, CameraRole } from "../services";
import type { PairingSession } from "../features/cameras";

export interface CameraContextValue {
  readonly sessions: Readonly<Record<CameraRole, CameraSessionSnapshot>>;
  disconnect(role: CameraRole): void;
  disconnectAll(): void;
  begin(
    role: CameraRole,
    matchId: string,
    camera: CameraRecord,
  ): Promise<PairingSession>;
  streams: Readonly<Record<CameraRole, MediaStream | null>>;
  cameraRecords: Readonly<Record<CameraRole, CameraRecord | null>>;
}

export const CameraContext = createContext<CameraContextValue | null>(null);

export function useCameraSessions(): CameraContextValue {
  const value = useContext(CameraContext);
  if (!value)
    throw new Error("useCameraSessions must be used within CameraProvider");
  return value;
}
