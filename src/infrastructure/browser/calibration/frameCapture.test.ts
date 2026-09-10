import { describe, expect, it, vi } from "vitest";

import type { CalibrationFrameUpload } from "../../../services";
import {
  BrowserCalibrationFrameCaptureService,
  CalibrationFrameCaptureError,
  sha256Hex,
} from ".";

const target: CalibrationFrameUpload = {
  assetId: "d1000000-0000-4000-8000-000000000001",
  url: "https://storage.example.test/calibration/frame",
  method: "PUT",
  headers: { "x-upload-token": "temporary" },
  expiresAt: "2026-09-10T12:00:00.000Z",
};

describe("BrowserCalibrationFrameCaptureService", () => {
  it("hashes the exact captured bytes without relying on Web Crypto", () => {
    expect(sha256Hex(new TextEncoder().encode("abc"))).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("uploads JPEG bytes with every signed target header", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 200 }));
    const service = new BrowserCalibrationFrameCaptureService({ fetchImpl });
    const bytes = new Blob(["jpeg"], { type: "image/jpeg" });

    await service.upload(target, bytes);

    expect(fetchImpl).toHaveBeenCalledWith(target.url, {
      method: "PUT",
      headers: target.headers,
      body: bytes,
    });
  });

  it("makes a failed signed upload retryable by the caller", async () => {
    const service = new BrowserCalibrationFrameCaptureService({
      fetchImpl: vi.fn().mockResolvedValue(new Response(null, { status: 403 })),
    });
    await expect(
      service.upload(target, new Blob(["jpeg"])),
    ).rejects.toBeInstanceOf(CalibrationFrameCaptureError);
  });
});
