import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

import { serializePairingQrPayload, type PairingSession } from "../cameras";

interface CameraPairingDialogProps {
  pairing: PairingSession;
  stream: MediaStream | null;
  onCancel(): void;
  onPreviewReady(): void;
  onRegenerate(): void;
}

export function CameraPairingDialog({
  pairing,
  stream,
  onCancel,
  onPreviewReady,
  onRegenerate,
}: CameraPairingDialogProps) {
  const [svg, setSvg] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, Date.parse(pairing.expiresAt) - Date.now()),
  );
  const cancelRef = useRef<HTMLButtonElement>(null);
  const expired = remaining === 0;

  useEffect(() => {
    cancelRef.current?.focus();
    void QRCode.toString(serializePairingQrPayload(pairing), {
      type: "svg",
      errorCorrectionLevel: "M",
      margin: 1,
      color: { dark: "#09101c", light: "#f4f8ff" },
    }).then(setSvg);
    const timer = window.setInterval(
      () =>
        setRemaining(Math.max(0, Date.parse(pairing.expiresAt) - Date.now())),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [pairing]);

  const label = `${Math.floor(remaining / 60000)}:${String(Math.floor((remaining % 60000) / 1000)).padStart(2, "0")}`;
  return (
    <div className="readiness__dialog-backdrop" role="presentation">
      <section
        className="readiness__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="camera-pairing-title"
        onKeyDown={(event) => {
          if (event.key === "Escape") onCancel();
        }}
      >
        <p className="readiness__eyebrow">
          Pair {pairing.cameraRole === "SIDELINE_LEFT" ? "left" : "right"}{" "}
          camera
        </p>
        <h2 id="camera-pairing-title">Scan with the Fly Eye Camera app</h2>
        <p>
          Open the camera app on the phone assigned to this direction, then scan
          this temporary code.
        </p>
        {svg && !expired ? (
          <div
            className="readiness__qr"
            role="img"
            aria-label={`QR code for ${pairing.cameraRole} camera pairing`}
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        ) : (
          <p role="status">
            {expired
              ? "This pairing code expired."
              : "Preparing secure QR code…"}
          </p>
        )}
        <PairingPreview stream={stream} onReady={onPreviewReady} />
        <p role="timer" aria-live="polite">
          {expired ? "Expired" : `Code expires in ${label}`}
        </p>
        <div className="readiness__dialog-actions">
          <button ref={cancelRef} type="button" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="readiness__dialog-primary"
            onClick={onRegenerate}
          >
            {expired ? "Generate new code" : "Regenerate code"}
          </button>
        </div>
      </section>
    </div>
  );
}

function PairingPreview({
  stream,
  onReady,
}: {
  stream: MediaStream | null;
  onReady(): void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream;
  }, [stream]);

  return (
    <video
      ref={videoRef}
      className="readiness__pairing-preview"
      aria-label="Paired camera preview"
      autoPlay
      muted
      playsInline
      onLoadedData={() => {
        if (stream) onReady();
      }}
    />
  );
}
