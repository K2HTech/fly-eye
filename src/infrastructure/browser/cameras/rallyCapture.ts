import type {
  CameraRole,
  RallyCaptureService,
  RallyCaptureSnapshot,
} from "../../../services";

export class RallyCaptureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RallyCaptureError";
  }
}

const MIME_TYPE = 'video/mp4;codecs="avc1.42E01E"';
const BUFFER_MS = 30_000;
const SNAPSHOT_MS = 12_000;

interface RecordedChunk {
  readonly bytes: Blob;
  readonly endedAtMs: number;
}

interface ActiveCapture {
  readonly recorder: MediaRecorder;
  readonly fps: number;
  readonly chunks: RecordedChunk[];
}

export interface BrowserRallyCaptureOptions {
  readonly now?: () => number;
  readonly createRecorder?: (stream: MediaStream) => MediaRecorder;
}

export class BrowserRallyCaptureService implements RallyCaptureService {
  private readonly captures = new Map<CameraRole, ActiveCapture>();
  private readonly now: () => number;
  private readonly createRecorder: (stream: MediaStream) => MediaRecorder;

  constructor(options: BrowserRallyCaptureOptions = {}) {
    this.now = options.now ?? Date.now;
    this.createRecorder =
      options.createRecorder ??
      ((stream) => {
        if (
          typeof MediaRecorder === "undefined" ||
          !MediaRecorder.isTypeSupported(MIME_TYPE)
        )
          throw new RallyCaptureError(
            "This browser cannot record the MP4/H.264 video required for rally analysis.",
          );
        return new MediaRecorder(stream, { mimeType: MIME_TYPE });
      });
  }

  start(role: CameraRole, stream: MediaStream, fps: number): void {
    this.stop(role);
    if (!Number.isFinite(fps) || fps <= 0)
      throw new RallyCaptureError("A positive camera frame rate is required.");
    const recorder = this.createRecorder(stream);
    const capture: ActiveCapture = { recorder, fps, chunks: [] };
    recorder.addEventListener("dataavailable", (event) => {
      if (event.data.size <= 0) return;
      const endedAtMs = this.now();
      capture.chunks.push({ bytes: event.data, endedAtMs });
      const threshold = endedAtMs - BUFFER_MS;
      while (capture.chunks[0]?.endedAtMs < threshold) capture.chunks.shift();
    });
    recorder.addEventListener("error", () => this.stop(role));
    recorder.start(1_000);
    this.captures.set(role, capture);
  }

  stop(role: CameraRole): void {
    const capture = this.captures.get(role);
    if (!capture) return;
    this.captures.delete(role);
    if (capture.recorder.state !== "inactive") capture.recorder.stop();
  }

  stopAll(): void {
    for (const role of [...this.captures.keys()]) this.stop(role);
  }

  async snapshot(
    roles: readonly CameraRole[],
  ): Promise<readonly RallyCaptureSnapshot[]> {
    const endMs = this.now();
    const startMs = endMs - SNAPSHOT_MS;
    const snapshots = roles.map((role) => {
      const capture = this.captures.get(role);
      if (!capture)
        throw new RallyCaptureError(
          "A selected camera has no active rally buffer.",
        );
      const chunks = capture.chunks.filter(
        (chunk) => chunk.endedAtMs >= startMs,
      );
      if (chunks.length === 0)
        throw new RallyCaptureError(
          "Wait for camera footage to enter the rally buffer before requesting review.",
        );
      const actualStartMs = chunks[0].endedAtMs - 1_000;
      const actualEndMs = chunks[chunks.length - 1].endedAtMs;
      const durationMs = actualEndMs - actualStartMs;
      return {
        role,
        bytes: new Blob(
          chunks.map((chunk) => chunk.bytes),
          {
            type: "video/mp4",
          },
        ),
        contentType: "video/mp4" as const,
        codec: "h264" as const,
        fps: capture.fps,
        frameCount: Math.max(1, Math.round((durationMs / 1_000) * capture.fps)),
        startTsUs: Math.round(actualStartMs * 1_000),
        endTsUs: Math.round(actualEndMs * 1_000),
      };
    });
    return snapshots;
  }
}
