import { describe, expect, it, vi } from "vitest";

import {
  BackendRallyAnalysisService,
  BackendRallyClipService,
} from "./rallyAnalysis";
import type { BackendHttpClient } from "./httpClient";

const matchId = "00000000-0000-4000-8000-000000000001";
const cameraId = "00000000-0000-4000-8000-000000000002";
const clipId = "00000000-0000-4000-8000-000000000003";
const assetId = "00000000-0000-4000-8000-000000000004";
const analysisId = "00000000-0000-4000-8000-000000000005";

const asset = {
  cameraId,
  contentType: "video/mp4" as const,
  codec: "h264" as const,
  fps: 30,
  frameCount: 360,
  startTsUs: 1_000_000,
  endTsUs: 13_000_000,
  sizeBytes: 12,
  checksumSha256: "a".repeat(64),
};

describe("backend rally analysis services", () => {
  it("declares a clip, uploads its exact target, and completes it", async () => {
    const request = vi.fn<BackendHttpClient["request"]>();
    request
      .mockResolvedValueOnce({
        clip: {
          id: clipId,
          matchId,
          capturedAt: "2026-09-12T00:00:00.000Z",
          durationMs: 12_000,
          status: "uploading",
          assets: [{ id: assetId, ...asset }],
        },
        uploads: [
          {
            cameraId,
            assetId,
            url: "https://storage.example/upload",
            method: "PUT",
            headers: { "Content-Type": "video/mp4" },
            expiresAt: "2026-09-12T00:01:00.000Z",
          },
        ],
      })
      .mockResolvedValueOnce({
        id: clipId,
        matchId,
        capturedAt: "2026-09-12T00:00:00.000Z",
        durationMs: 12_000,
        status: "ready",
        assets: [asset],
      });
    const upload = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 200 }));
    const service = new BackendRallyClipService(
      { request } as BackendHttpClient,
      upload,
    );

    const created = await service.create(matchId, {
      capturedAt: "2026-09-12T00:00:00.000Z",
      durationMs: 12_000,
      assets: [asset],
    });
    await service.upload(created.uploads[0], new Blob(["rally"]));
    await service.complete(clipId);

    expect(request.mock.calls[0][0]).toBe(`matches/${matchId}/clips`);
    expect(upload).toHaveBeenCalledWith(
      "https://storage.example/upload",
      expect.objectContaining({
        method: "PUT",
        headers: { "Content-Type": "video/mp4" },
      }),
    );
    expect(request.mock.calls[1][0]).toBe(`clips/${clipId}/complete`);
  });

  it("submits analysis without exposing an access token", async () => {
    const request = vi.fn<BackendHttpClient["request"]>().mockResolvedValue({
      analysisId,
      status: "queued",
    });
    const service = new BackendRallyAnalysisService({
      request,
    } as BackendHttpClient);

    await expect(service.submit(clipId)).resolves.toEqual({ analysisId });
    expect(request).toHaveBeenCalledWith(`clips/${clipId}/analyze`, {
      method: "POST",
    });
  });
});
