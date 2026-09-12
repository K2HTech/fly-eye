import type { BackendHttpClient } from "./httpClient";
import type {
  CreateRallyClipInput,
  CreatedRallyClip,
  RallyAnalysis,
  RallyAnalysisService,
  RallyClip,
  RallyClipAssetDeclaration,
  RallyClipService,
  RallyClipUploadTarget,
} from "../../services";

export class RallyAnalysisServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RallyAnalysisServiceError";
  }
}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const checksumPattern = /^[0-9a-f]{64}$/i;

function invalid(): RallyAnalysisServiceError {
  return new RallyAnalysisServiceError(
    "The Fly Eye service returned an invalid rally-analysis response.",
  );
}

function object(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    throw invalid();
  return value as Record<string, unknown>;
}

function array(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw invalid();
  return value;
}

function string(body: Record<string, unknown>, key: string): string {
  const value = body[key];
  if (typeof value !== "string" || value.trim().length === 0) throw invalid();
  return value;
}

function nullableString(
  body: Record<string, unknown>,
  key: string,
): string | null {
  return body[key] === null ? null : string(body, key);
}

function id(body: Record<string, unknown>, key: string): string {
  const value = string(body, key);
  if (!uuidPattern.test(value)) throw invalid();
  return value;
}

function finite(body: Record<string, unknown>, key: string): number {
  const value = body[key];
  if (typeof value !== "number" || !Number.isFinite(value)) throw invalid();
  return value;
}

function nullableFinite(
  body: Record<string, unknown>,
  key: string,
): number | null {
  return body[key] === null ? null : finite(body, key);
}

function date(body: Record<string, unknown>, key: string): string {
  const value = string(body, key);
  if (!Number.isFinite(Date.parse(value))) throw invalid();
  return value;
}

function point(value: unknown) {
  const body = object(value);
  return { x: finite(body, "x"), y: finite(body, "y") };
}

function perCamera(value: unknown): NonNullable<RallyAnalysis["perCamera"]> {
  return array(value).map((entry) => {
    const body = object(entry);
    const trackPoints = finite(body, "trackPoints");
    const trajectoryResidual = finite(body, "trajectoryResidual");
    const occlusionScore = finite(body, "occlusionScore");
    if (
      !Number.isInteger(trackPoints) ||
      trackPoints < 0 ||
      trajectoryResidual < 0 ||
      occlusionScore < 0 ||
      occlusionScore > 1 ||
      typeof body.usable !== "boolean"
    )
      throw invalid();
    return {
      cameraId: id(body, "cameraId"),
      trackPoints,
      landing: body.landing === null ? null : point(body.landing),
      trajectoryResidual,
      occlusionScore,
      usable: body.usable,
    };
  });
}

function asset(value: unknown): RallyClipAssetDeclaration {
  const body = object(value);
  const contentType = string(body, "contentType");
  const codec = string(body, "codec");
  if (contentType !== "video/mp4" || codec !== "h264") throw invalid();
  const checksumSha256 = string(body, "checksumSha256");
  if (!checksumPattern.test(checksumSha256)) throw invalid();
  const frameCount = finite(body, "frameCount");
  const startTsUs = finite(body, "startTsUs");
  const endTsUs = finite(body, "endTsUs");
  const sizeBytes = finite(body, "sizeBytes");
  if (
    !Number.isInteger(frameCount) ||
    frameCount <= 0 ||
    !Number.isInteger(startTsUs) ||
    !Number.isInteger(endTsUs) ||
    endTsUs <= startTsUs ||
    !Number.isInteger(sizeBytes) ||
    sizeBytes <= 0
  )
    throw invalid();
  return {
    cameraId: id(body, "cameraId"),
    contentType,
    codec,
    fps: finite(body, "fps"),
    frameCount,
    startTsUs,
    endTsUs,
    sizeBytes,
    checksumSha256,
  };
}

function clip(value: unknown): RallyClip {
  const body = object(value);
  const status = string(body, "status");
  if (status !== "uploading" && status !== "ready" && status !== "failed")
    throw invalid();
  return {
    id: id(body, "id"),
    matchId: id(body, "matchId"),
    capturedAt: date(body, "capturedAt"),
    durationMs: finite(body, "durationMs"),
    status,
    assets: array(body.assets).map(asset),
  };
}

function upload(value: unknown): RallyClipUploadTarget {
  const body = object(value);
  const method = string(body, "method");
  if (method !== "PUT") throw invalid();
  const headers = object(body.headers);
  if (Object.values(headers).some((entry) => typeof entry !== "string"))
    throw invalid();
  return {
    cameraId: id(body, "cameraId"),
    assetId: id(body, "assetId"),
    url: string(body, "url"),
    method,
    headers: headers as Readonly<Record<string, string>>,
    expiresAt: date(body, "expiresAt"),
  };
}

function analysis(value: unknown): RallyAnalysis {
  const body = object(value);
  const status = string(body, "status");
  if (!["queued", "running", "done", "failed"].includes(status))
    throw invalid();
  const verdict = nullableString(body, "verdict");
  if (verdict !== null && !["IN", "OUT", "INCONCLUSIVE"].includes(verdict))
    throw invalid();
  const overlays = object(body.overlays);
  const errorValue = body.error;
  const error =
    errorValue === null
      ? null
      : (() => {
          const entry = object(errorValue);
          return {
            code: string(entry, "code"),
            message: string(entry, "message"),
          };
        })();
  return {
    id: id(body, "id"),
    clipId: id(body, "clipId"),
    status: status as RallyAnalysis["status"],
    progress: finite(body, "progress"),
    stage: string(body, "stage"),
    verdict: verdict as RallyAnalysis["verdict"],
    confidence: nullableFinite(body, "confidence"),
    landing: body.landing === null ? null : point(body.landing),
    uncertaintyCm: nullableFinite(body, "uncertaintyCm"),
    nearestLine: nullableString(body, "nearestLine"),
    distanceToLineCm: nullableFinite(body, "distanceToLineCm"),
    reasonCode: nullableString(body, "reasonCode"),
    reasonText: nullableString(body, "reasonText"),
    perCamera: body.perCamera === null ? null : perCamera(body.perCamera),
    overlays: {
      frame: nullableString(overlays, "frame"),
      topdown: nullableString(overlays, "topdown"),
      trajectory: nullableString(overlays, "trajectory"),
    },
    error,
  };
}

function validateClipInput(input: CreateRallyClipInput): void {
  if (
    !Number.isInteger(input.durationMs) ||
    input.durationMs <= 0 ||
    !Number.isFinite(Date.parse(input.capturedAt)) ||
    input.assets.length < 1 ||
    input.assets.length > 2
  )
    throw new RallyAnalysisServiceError(
      "The rally clip declaration is invalid.",
    );
  const ids = new Set<string>();
  for (const entry of input.assets) {
    if (ids.has(entry.cameraId))
      throw new RallyAnalysisServiceError(
        "A rally clip cannot repeat a camera.",
      );
    ids.add(entry.cameraId);
    asset(entry);
  }
}

export class BackendRallyClipService implements RallyClipService {
  constructor(
    private readonly client: BackendHttpClient,
    private readonly fetchImpl: typeof fetch = globalThis.fetch.bind(
      globalThis,
    ),
  ) {}

  async create(
    matchId: string,
    input: CreateRallyClipInput,
  ): Promise<CreatedRallyClip> {
    if (!uuidPattern.test(matchId))
      throw new RallyAnalysisServiceError(
        "A valid match is required for a rally clip.",
      );
    validateClipInput(input);
    const response = object(
      await this.client.request<unknown>(`matches/${matchId}/clips`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    );
    return {
      clip: clip(response.clip),
      uploads: array(response.uploads).map(upload),
    };
  }

  async upload(target: RallyClipUploadTarget, bytes: Blob): Promise<void> {
    if (bytes.size <= 0)
      throw new RallyAnalysisServiceError("A rally clip asset is empty.");
    const response = await this.fetchImpl(target.url, {
      method: target.method,
      headers: target.headers,
      body: bytes,
    });
    if (!response.ok)
      throw new RallyAnalysisServiceError("Unable to upload the rally clip.");
  }

  async complete(clipId: string): Promise<RallyClip> {
    if (!uuidPattern.test(clipId))
      throw new RallyAnalysisServiceError("A valid rally clip is required.");
    return clip(
      await this.client.request<unknown>(`clips/${clipId}/complete`, {
        method: "POST",
      }),
    );
  }
}

export class BackendRallyAnalysisService implements RallyAnalysisService {
  constructor(private readonly client: BackendHttpClient) {}

  async submit(clipId: string, force = false): Promise<{ analysisId: string }> {
    if (!uuidPattern.test(clipId))
      throw new RallyAnalysisServiceError("A valid rally clip is required.");
    const body = object(
      await this.client.request<unknown>(
        `clips/${clipId}/analyze${force ? "?force=true" : ""}`,
        { method: "POST" },
      ),
    );
    return { analysisId: id(body, "analysisId") };
  }

  async get(analysisId: string): Promise<RallyAnalysis> {
    if (!uuidPattern.test(analysisId))
      throw new RallyAnalysisServiceError("A valid analysis is required.");
    return analysis(
      await this.client.request<unknown>(`analyses/${analysisId}`),
    );
  }

  async getOverlay(path: string): Promise<Blob> {
    if (!path.startsWith("/api/v1/") || path.startsWith("//"))
      throw new RallyAnalysisServiceError(
        "The analysis overlay URL is invalid.",
      );
    if (!this.client.download)
      throw new RallyAnalysisServiceError(
        "Authenticated analysis-overlay downloads are unavailable.",
      );
    return this.client.download(path.replace(/^\/api\/v1\//, ""));
  }
}
