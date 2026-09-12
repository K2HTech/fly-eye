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
  publicSignalingError,
  reduceCameraSession,
  type CameraSessionSnapshot,
} from "../features/cameras";
import type { CameraConnection, CameraRecord, CameraRole } from "../services";
import type { PairingSession } from "../features/cameras";
import { CameraContext } from "./cameraContext";
import { useSession } from "./sessionContext";
import { useAppServices } from "./servicesContext";

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
  const match =
    /^\/matches\/([^/]+)\/(?:readiness|live|review|decision|cameras\/[^/]+\/calibration)$/.exec(
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
  const services = useAppServices();
  const [sessions, setSessions] = useState(snapshots);
  const currentMatch = activeMatchId(location.pathname);
  const ownedMatch = useRef<string | null>(null);
  const connections = useRef<Partial<Record<CameraRole, CameraConnection>>>({});
  const sessionIds = useRef<Partial<Record<CameraRole, string>>>({});
  const [streams, setStreams] = useState<
    Record<CameraRole, MediaStream | null>
  >({ SIDELINE_LEFT: null, SIDELINE_RIGHT: null });
  const [cameraRecords, setCameraRecords] = useState<
    Record<CameraRole, CameraRecord | null>
  >({ SIDELINE_LEFT: null, SIDELINE_RIGHT: null });

  const disconnectAll = useCallback(() => {
    ownedMatch.current = null;
    Object.values(connections.current).forEach((connection) =>
      connection?.close(),
    );
    connections.current = {};
    sessionIds.current = {};
    setStreams({ SIDELINE_LEFT: null, SIDELINE_RIGHT: null });
    services.rallyCapture?.stopAll();
    setCameraRecords({ SIDELINE_LEFT: null, SIDELINE_RIGHT: null });
    setSessions(snapshots());
  }, [services.rallyCapture]);

  const disconnect = useCallback(
    (role: CameraRole) => {
      connections.current[role]?.close();
      delete connections.current[role];
      delete sessionIds.current[role];
      services.rallyCapture?.stop(role);
      setStreams((current) => ({ ...current, [role]: null }));
      setCameraRecords((current) => ({ ...current, [role]: null }));
      setSessions((current) => ({
        ...current,
        [role]: reduceCameraSession(current[role], { type: "disconnect" }),
      }));
    },
    [services.rallyCapture],
  );

  const begin = useCallback(
    async (
      role: CameraRole,
      matchId: string,
      camera: CameraRecord,
    ): Promise<PairingSession> => {
      if (!services.cameraConnections)
        throw new Error("Camera pairing is unavailable.");
      disconnect(role);
      setCameraRecords((current) => ({ ...current, [role]: camera }));
      setSessions((current) => ({
        ...current,
        [role]: reduceCameraSession(current[role], { type: "create" }),
      }));
      const connection = services.cameraConnections.create({
        onPairing: (pairing) => {
          sessionIds.current[role] = pairing.sessionId;
          setSessions((current) => ({
            ...current,
            [role]: reduceCameraSession(current[role], {
              type: "created",
              pairing,
            }),
          }));
        },
        onStream: (stream) => {
          try {
            services.rallyCapture?.start(role, stream, camera.targetFps);
            setStreams((current) => ({ ...current, [role]: stream }));
          } catch {
            setStreams((current) => ({ ...current, [role]: null }));
          }
        },
        onState: (state) => {
          const sessionId = sessionIds.current[role];
          if (!sessionId) return;
          if (state === "error") {
            setStreams((current) => ({ ...current, [role]: null }));
          }
          const event =
            state === "negotiating"
              ? { type: "camera-joined" as const, sessionId }
              : state === "connected"
                ? { type: "connected" as const, sessionId }
                : state === "reconnecting"
                  ? { type: "connection-lost" as const, sessionId }
                  : {
                      type: "failed" as const,
                      sessionId,
                      error: publicSignalingError(
                        "SIGNALING_UNAVAILABLE",
                        true,
                      ),
                    };
          setSessions((current) => ({
            ...current,
            [role]: reduceCameraSession(current[role], event),
          }));
        },
        onError: () => {
          const sessionId = sessionIds.current[role];
          if (!sessionId) return;
          setStreams((current) => ({ ...current, [role]: null }));
          setSessions((current) => ({
            ...current,
            [role]: reduceCameraSession(current[role], {
              type: "failed",
              sessionId,
              error: {
                code: "CONNECTION_FAILED",
                message:
                  "The camera connection could not be completed. Generate a new code to try again.",
                retryable: true,
              },
            }),
          }));
        },
      });
      connections.current[role] = connection;
      try {
        return await connection.begin(matchId, camera);
      } catch (error) {
        delete connections.current[role];
        setSessions((current) => ({
          ...current,
          [role]: reduceCameraSession(current[role], {
            type: "failed",
            sessionId: sessionIds.current[role] ?? "",
            error: {
              code: "CONNECTION_FAILED",
              message:
                "The camera pairing code could not be created. Please try again.",
              retryable: true,
            },
          }),
        }));
        throw error;
      }
    },
    [disconnect, services.cameraConnections, services.rallyCapture],
  );

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
    () => ({
      sessions,
      streams,
      cameraRecords,
      begin,
      disconnect,
      disconnectAll,
    }),
    [begin, cameraRecords, disconnect, disconnectAll, sessions, streams],
  );
  return (
    <CameraContext.Provider value={value}>{children}</CameraContext.Provider>
  );
}
