import type { CalibrationFrame } from "../../services";

export interface CapturedCalibrationFrame extends CalibrationFrame {
  readonly width: number;
  readonly height: number;
}

interface CanvasContext {
  drawImage(
    image: CanvasImageSource,
    sx: number,
    sy: number,
    sw: number,
    sh: number,
    dx: number,
    dy: number,
    dw: number,
    dh: number,
  ): void;
}

interface CaptureCanvas {
  width: number;
  height: number;
  getContext(contextId: "2d"): CanvasContext | null;
  toBlob(callback: (blob: Blob | null) => void, type: string): void;
}

export interface CaptureCanvasFactory {
  create(): CaptureCanvas;
}

export class CalibrationCaptureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CalibrationCaptureError";
  }
}

const defaultCanvasFactory: CaptureCanvasFactory = {
  create: () => document.createElement("canvas"),
};

export async function captureVideoStill(
  video: HTMLVideoElement,
  factory: CaptureCanvasFactory = defaultCanvasFactory,
): Promise<CapturedCalibrationFrame> {
  const width = video.videoWidth;
  const height = video.videoHeight;
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width <= 0 ||
    height <= 0
  ) {
    throw new CalibrationCaptureError(
      "Wait for the live camera preview before capturing a calibration image.",
    );
  }

  const canvas = factory.create();
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new CalibrationCaptureError(
      "This browser cannot capture calibration images from the live preview.",
    );
  }
  context.drawImage(video, 0, 0, width, height, 0, 0, width, height);
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/jpeg");
  });
  if (!blob || blob.size === 0) {
    throw new CalibrationCaptureError(
      "The calibration image could not be captured. Please try again.",
    );
  }
  return { blob, width, height };
}
