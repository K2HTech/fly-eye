import type {
  CalibrationFrameCaptureService,
  CalibrationFrameUpload,
  CapturedCalibrationFrame,
} from "../../../services";
import { sha256Hex } from "./sha256";

export class CalibrationFrameCaptureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CalibrationFrameCaptureError";
  }
}

type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

interface BrowserFrameCaptureOptions {
  fetchImpl?: FetchLike;
  createVideo?: () => HTMLVideoElement;
  createCanvas?: () => HTMLCanvasElement;
}

function jpeg(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else
          reject(
            new CalibrationFrameCaptureError(
              "The camera frame could not be captured.",
            ),
          );
      },
      "image/jpeg",
      0.92,
    );
  });
}

function dataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () =>
      reject(
        new CalibrationFrameCaptureError(
          "The captured camera frame could not be prepared.",
        ),
      );
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else
        reject(
          new CalibrationFrameCaptureError(
            "The captured camera frame could not be prepared.",
          ),
        );
    };
    reader.readAsDataURL(blob);
  });
}

export class BrowserCalibrationFrameCaptureService implements CalibrationFrameCaptureService {
  private readonly fetchImpl: FetchLike;
  private readonly createVideo: () => HTMLVideoElement;
  private readonly createCanvas: () => HTMLCanvasElement;

  constructor(options: BrowserFrameCaptureOptions = {}) {
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
    this.createVideo =
      options.createVideo ?? (() => document.createElement("video"));
    this.createCanvas =
      options.createCanvas ?? (() => document.createElement("canvas"));
  }

  async capture(stream: MediaStream): Promise<CapturedCalibrationFrame> {
    const video = this.createVideo();
    video.muted = true;
    video.playsInline = true;
    video.srcObject = stream;
    try {
      await video.play();
      const width = video.videoWidth;
      const height = video.videoHeight;
      if (!width || !height)
        throw new CalibrationFrameCaptureError(
          "Wait for the live camera preview before capturing frames.",
        );
      const canvas = this.createCanvas();
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context)
        throw new CalibrationFrameCaptureError(
          "This browser cannot capture a calibration frame.",
        );
      context.drawImage(video, 0, 0, width, height);
      const bytes = await jpeg(canvas);
      const checksumSha256 = sha256Hex(
        new Uint8Array(await bytes.arrayBuffer()),
      );
      return {
        bytes,
        previewDataUrl: await dataUrl(bytes),
        width,
        height,
        declaration: {
          contentType: "image/jpeg",
          sizeBytes: bytes.size,
          checksumSha256,
        },
      };
    } finally {
      video.pause();
      video.srcObject = null;
      video.remove();
    }
  }

  async upload(target: CalibrationFrameUpload, bytes: Blob): Promise<void> {
    let response: Response;
    try {
      response = await this.fetchImpl(target.url, {
        method: target.method,
        headers: target.headers,
        body: bytes,
      });
    } catch {
      throw new CalibrationFrameCaptureError(
        "The calibration frame upload could not be completed. Retry that frame.",
      );
    }
    if (!response.ok)
      throw new CalibrationFrameCaptureError(
        "The calibration frame upload was rejected or expired. Retry that frame.",
      );
  }
}
