import type {
  BufferSegment,
  CameraFeed,
  MatchState,
  RollingBuffer,
} from "./LiveMonitor";

export const simulatedMatch: MatchState = {
  court: "COURT 2",
  leftTeam: "Nguyen / Tran",
  leftScore: 21,
  rightTeam: "Lee / Park",
  rightScore: 18,
  game: 3,
  elapsed: "00:42:17",
};

export const simulatedCameras: readonly CameraFeed[] = [
  {
    id: "A",
    name: "Cam A",
    position: "sideline",
    resolution: "1280 × 720",
    frameRate: 120,
    latencyMs: 4.2,
    status: "online",
  },
  {
    id: "B",
    name: "Cam B",
    position: "baseline",
    resolution: "1280 × 720",
    frameRate: 120,
    latencyMs: 4.4,
    status: "online",
  },
];

export const simulatedBuffer: RollingBuffer = {
  durationSeconds: 30,
  segments: [
    { startSeconds: 2.4, durationSeconds: 4.8 },
    { startSeconds: 12, durationSeconds: 6.6 },
    { startSeconds: 22.2, durationSeconds: 7.2 },
  ] satisfies readonly BufferSegment[],
};
