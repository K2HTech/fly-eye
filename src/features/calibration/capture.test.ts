import { describe, expect, it, vi } from "vitest";

import {
  CalibrationCaptureError,
  captureVideoStill,
  type CaptureCanvasFactory,
} from "./capture";

function canvasFactory(
  blob: Blob | null = new Blob(["image"], { type: "image/jpeg" }),
) {
  const drawImage = vi.fn();
  const canvas = {
    width: 0,
    height: 0,
    getContext: vi.fn().mockReturnValue({ drawImage }),
    toBlob: vi.fn((callback: (value: Blob | null) => void) => callback(blob)),
  };
  return {
    factory: { create: () => canvas } as CaptureCanvasFactory,
    canvas,
    drawImage,
  };
}

describe("captureVideoStill", () => {
  it("captures a JPEG at the decoded source resolution", async () => {
    const { factory, canvas, drawImage } = canvasFactory();
    const video = { videoWidth: 1280, videoHeight: 720 } as HTMLVideoElement;

    await expect(captureVideoStill(video, factory)).resolves.toMatchObject({
      width: 1280,
      height: 720,
      blob: expect.any(Blob),
    });
    expect(canvas.width).toBe(1280);
    expect(canvas.height).toBe(720);
    expect(drawImage).toHaveBeenCalledWith(
      video,
      0,
      0,
      1280,
      720,
      0,
      0,
      1280,
      720,
    );
    expect(canvas.toBlob).toHaveBeenCalledWith(
      expect.any(Function),
      "image/jpeg",
    );
  });

  it("rejects capture before a decoded video dimension is available", async () => {
    const { factory } = canvasFactory();
    const video = { videoWidth: 0, videoHeight: 720 } as HTMLVideoElement;

    await expect(captureVideoStill(video, factory)).rejects.toBeInstanceOf(
      CalibrationCaptureError,
    );
  });

  it("rejects an unavailable canvas or empty encoded image", async () => {
    const noContext: CaptureCanvasFactory = {
      create: () => ({
        width: 0,
        height: 0,
        getContext: () => null,
        toBlob: () => undefined,
      }),
    };
    const video = { videoWidth: 1280, videoHeight: 720 } as HTMLVideoElement;
    await expect(captureVideoStill(video, noContext)).rejects.toThrow(
      /cannot capture/i,
    );

    const empty = canvasFactory(null);
    await expect(captureVideoStill(video, empty.factory)).rejects.toThrow(
      /could not be captured/i,
    );
  });
});
