import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useLocation } from "react-router-dom";

import {
  initialCameraSession,
  reduceCameraSession,
  type CameraSessionSnapshot,
} from "../features/cameras";
import type { CameraRole } from "../services";
import { CameraContext } from "./cameraContext";
import { useSession } from "./sessionContext";

interface CameraProviderProps {
  children: ReactNode;
}

function snapshots(): Record<CameraRole, CameraSessionSnapshot> {
  return {
    SIDELINE_LEFT: initialCameraSession("SIDELINE_LEFT"),
    SIDELINE_RIGHT: initialCameraSession("SIDELINE_RIGHT"),
  };
}

function activeMatchId(pathname: string): string | null {
  const match = /^\/matches\/([^/]+)\/(readiness|live|review|decision)$/.exec(
    pathname,
  );
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Owns ephemeral camera snapshots above route screens. Actual pairing actions
 * arrive in Batch 6; this lifecycle prevents route navigation from becoming a
 * persistence mechanism for a future peer connection.
 */
export function CameraProvider({ children }: CameraProviderProps) {
  const location = useLocation();
  const session = useSession();
  const [sessions, setSessions] = useState(snapshots);
  const currentMatch = activeMatchId(location.pathname);
  const ownedMatch = useRef<string | null>(null);

  const disconnectAll = useCallback(() => {
    ownedMatch.current = null;
    setSessions(snapshots());
  }, []);

  const disconnect = useCallback((role: CameraRole) => {
    setSessions((current) => ({
      ...current,
      [role]: reduceCameraSession(current[role], { type: "disconnect" }),
    }));
  }, []);

  useEffect(() => {
    if (
      session.status !== "authenticated" ||
      session.identity?.session.mode !== "backend"
    ) {
      queueMicrotask(disconnectAll);
      return;
    }
    if (!currentMatch) {
      queueMicrotask(disconnectAll);
      return;
    }
    if (ownedMatch.current && ownedMatch.current !== currentMatch) {
      queueMicrotask(disconnectAll);
    }
    ownedMatch.current = currentMatch;
  }, [
    currentMatch,
    disconnectAll,
    session.identity?.session.mode,
    session.status,
  ]);

  useEffect(() => () => disconnectAll(), [disconnectAll]);

  const value = useMemo(
    () => ({ sessions, disconnect, disconnectAll }),
    [disconnect, disconnectAll, sessions],
  );
  return (
    <CameraContext.Provider value={value}>{children}</CameraContext.Provider>
  );
}
