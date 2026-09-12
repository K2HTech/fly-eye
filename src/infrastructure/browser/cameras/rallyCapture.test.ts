import { describe, expect, it } from "vitest";

import { BrowserRallyCaptureService } from "./rallyCapture";

class FakeRecorder extends EventTarget {
  state: RecordingState = "inactive";

  start() {
    this.state = "recording";
  }

  stop() {
    this.state = "inactive";
  }

  emit(bytes: Blob) {
    const event = new Event("dataavailable") as BlobEvent;
    Object.defineProperty(event, "data", { value: bytes });
    this.dispatchEvent(event);
  }
}

describe("BrowserRallyCaptureService", () => {
  it("retains a snapshot from the latest recorded chunks", async () => {
    let now = 1_000;
    const recorder = new FakeRecorder();
    const capture = new BrowserRallyCaptureService({
      now: () => now,
      createRecorder: () => recorder as unknown as MediaRecorder,
    });

    capture.start("SIDELINE_LEFT", {} as MediaStream, 30);
    recorder.emit(new Blob(["first"]));
    now += 1_000;
    recorder.emit(new Blob(["second"]));

    const [snapshot] = await capture.snapshot(["SIDELINE_LEFT"]);
    expect(snapshot.contentType).toBe("video/mp4");
    expect(snapshot.frameCount).toBeGreaterThan(0);
    expect(await snapshot.bytes.text()).toBe("firstsecond");
  });
});
