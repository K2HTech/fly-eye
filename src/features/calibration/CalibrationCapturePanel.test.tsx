import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ capture: vi.fn() }));

vi.mock("./capture", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./capture")>()),
  captureVideoStill: mocks.capture,
}));

import { CalibrationCapturePanel } from "./CalibrationCapturePanel";

function capturedFrame() {
  return {
    blob: new Blob(["frame"], { type: "image/jpeg" }),
    width: 1280,
    height: 720,
  };
}

describe("CalibrationCapturePanel", () => {
  beforeEach(() => {
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn(() => "blob:calibration-frame"),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: vi.fn(),
    });
    Object.defineProperty(HTMLMediaElement.prototype, "srcObject", {
      configurable: true,
      writable: true,
      value: null,
    });
  });

  afterEach(() => vi.restoreAllMocks());

  it("requires three captured stills and supports keyboard court-point entry", async () => {
    mocks.capture.mockResolvedValue(capturedFrame());
    const user = userEvent.setup();
    const onPrepared = vi.fn();
    render(
      <CalibrationCapturePanel
        cameraName="Left sideline"
        stream={{} as MediaStream}
        onCancel={vi.fn()}
        onPrepared={onPrepared}
      />,
    );

    const capture = screen.getByRole("button", { name: /capture image/i });
    await user.click(capture);
    await user.click(capture);
    await user.click(capture);

    expect(
      await screen.findByRole("heading", { name: /mark the four/i }),
    ).toBeVisible();
    const submit = screen.getByRole("button", {
      name: /use these calibration images/i,
    });
    expect(submit).toBeDisabled();

    const coordinates: ReadonlyArray<readonly [string, string, string]> = [
      ["Near-left outer corner", "10", "700"],
      ["Near-right outer corner", "1270", "700"],
      ["Far-right outer corner", "1200", "10"],
      ["Far-left outer corner", "50", "10"],
    ];
    for (const [corner, x, y] of coordinates) {
      const row = screen.getByText(corner).parentElement;
      if (!row) throw new Error("Court-point row was not rendered.");
      await user.type(within(row).getByLabelText("X pixel"), x);
      await user.type(within(row).getByLabelText("Y pixel"), y);
    }

    expect(submit).toBeEnabled();
    await user.click(submit);
    expect(onPrepared).toHaveBeenCalledWith(
      expect.objectContaining({
        referenceFrameIndex: 0,
        frames: expect.arrayContaining([
          expect.objectContaining({ width: 1280 }),
        ]),
        seedPoints: [
          expect.objectContaining({ court: { x: -3.05, y: -6.7 } }),
          expect.objectContaining({ court: { x: 3.05, y: -6.7 } }),
          expect.objectContaining({ court: { x: 3.05, y: 6.7 } }),
          expect.objectContaining({ court: { x: -3.05, y: 6.7 } }),
        ],
      }),
    );
  });

  it("sends a marker click through source-image coordinate conversion", async () => {
    mocks.capture.mockResolvedValue(capturedFrame());
    const user = userEvent.setup();
    render(
      <CalibrationCapturePanel
        cameraName="Left sideline"
        stream={{} as MediaStream}
        onCancel={vi.fn()}
        onPrepared={vi.fn()}
      />,
    );
    const capture = screen.getByRole("button", { name: /capture image/i });
    await user.click(capture);
    await user.click(capture);
    await user.click(capture);
    const marker = await screen.findByRole("button", {
      name: /mark near-left outer corner/i,
    });
    vi.spyOn(marker, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 0,
      width: 640,
      height: 360,
      top: 20,
      right: 640,
      bottom: 380,
      left: 10,
      toJSON: () => ({}),
    });

    fireEvent.click(marker, { clientX: 330, clientY: 200 });
    expect(screen.getByText(/next: near-right outer corner/i)).toBeVisible();
  });
});
