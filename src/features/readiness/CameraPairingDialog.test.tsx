import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { PairingSession } from "../cameras";
import { CameraPairingDialog } from "./CameraPairingDialog";

const pairing: PairingSession = {
  protocol: "fly-eye-camera-pairing",
  version: 1,
  sessionId: "session_0123456789abcdef",
  matchId: "00000000-0000-4000-8000-000000000001",
  cameraId: "00000000-0000-4000-8000-000000000002",
  cameraRole: "SIDELINE_LEFT",
  expiresAt: "2099-08-30T12:00:00.000Z",
  signalingUrl: "wss://signal.example/api/v1/signal",
  mobileToken: "a".repeat(32),
  viewerToken: "b".repeat(32),
};

describe("CameraPairingDialog", () => {
  afterEach(cleanup);

  it("reports readiness only after a received preview decodes a frame", () => {
    const onPreviewReady = vi.fn();
    render(
      <CameraPairingDialog
        pairing={pairing}
        stream={{} as MediaStream}
        onCancel={vi.fn()}
        onPreviewReady={onPreviewReady}
        onRegenerate={vi.fn()}
      />,
    );

    const preview = screen.getByLabelText(/paired camera preview/i);
    expect(onPreviewReady).not.toHaveBeenCalled();
    fireEvent.loadedData(preview);
    expect(onPreviewReady).toHaveBeenCalledOnce();
  });

  it("does not report readiness when no remote stream exists", () => {
    const onPreviewReady = vi.fn();
    render(
      <CameraPairingDialog
        pairing={pairing}
        stream={null}
        onCancel={vi.fn()}
        onPreviewReady={onPreviewReady}
        onRegenerate={vi.fn()}
      />,
    );

    fireEvent.loadedData(screen.getByLabelText(/paired camera preview/i));
    expect(onPreviewReady).not.toHaveBeenCalled();
  });
});
