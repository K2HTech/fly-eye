import "./DecisionEvidence.css";

export type Verdict = "IN" | "OUT";

export interface DecisionEvidenceProps {
  verdict?: Verdict;
  distanceMm?: number;
  cameraLabel?: string;
  className?: string;
}

const verdictColor = (verdict: Verdict) =>
  verdict === "OUT" ? "#ff4d4d" : "#35d07f";

const formatCameraLabel = (label: string) =>
  label
    .split("+")
    .map((camera) => camera.trim())
    .filter(Boolean)
    .map((camera) => `CAM ${camera}`)
    .join(" + ");

export function DecisionEvidence({
  verdict = "OUT",
  distanceMm = 24,
  cameraLabel = "A+B",
  className,
}: DecisionEvidenceProps) {
  const color = verdictColor(verdict);
  const accessibleLabel = `Top-down court reconstruction showing the shuttle landing ${distanceMm} millimetres ${verdict}, using cameras ${cameraLabel}`;

  return (
    <svg
      className={
        className ? `decision-evidence ${className}` : "decision-evidence"
      }
      viewBox="0 0 700 320"
      role="img"
      aria-label={accessibleLabel}
    >
      <rect width="700" height="320" fill="#0a1710" rx="8" />
      <rect
        x="60"
        y="46"
        width="580"
        height="230"
        fill="#17402a"
        stroke="#f2f4f0"
        strokeWidth="3"
      />
      <g fill="none" stroke="#f2f4f0" strokeWidth="2" opacity=".8">
        <line x1="60" y1="86" x2="640" y2="86" />
        <line x1="98" y1="46" x2="98" y2="276" />
        <line x1="602" y1="46" x2="602" y2="276" />
        <line x1="236" y1="46" x2="236" y2="276" />
        <line x1="464" y1="46" x2="464" y2="276" />
        <line
          x1="350"
          y1="46"
          x2="350"
          y2="276"
          strokeDasharray="7 6"
          opacity=".5"
        />
      </g>
      <text
        x="62"
        y="34"
        fill="#7c8798"
        fontFamily="IBM Plex Mono, monospace"
        fontSize="12"
        letterSpacing="1.5"
      >
        BACK BOUNDARY
      </text>
      <text
        x="608"
        y="300"
        fill="#525c6b"
        fontFamily="IBM Plex Mono, monospace"
        fontSize="11"
        textAnchor="end"
      >
        {formatCameraLabel(cameraLabel)}
      </text>
      <path
        d="M150 262 Q246 160 312 62"
        fill="none"
        stroke="#e8a33d"
        strokeDasharray="8 6"
        strokeWidth="3"
      />
      <circle cx="318" cy="46" r="16" fill={color} opacity=".18" />
      <circle
        cx="318"
        cy="46"
        r="6.5"
        fill={color}
        stroke="#f2f4f0"
        strokeWidth="2"
      />
      <g fill="none" stroke={color} strokeWidth="2">
        <line x1="318" y1="46" x2="318" y2="30" />
        <line x1="309" y1="30" x2="327" y2="30" />
      </g>
      <rect
        x="342"
        y="16"
        width="132"
        height="34"
        rx="6"
        fill={verdict === "OUT" ? "#2a0f12" : "#0f2419"}
        stroke={color}
        strokeOpacity=".5"
      />
      <text
        x="356"
        y="39"
        fill={color}
        fontFamily="Saira Condensed, sans-serif"
        fontSize="22"
        fontWeight="700"
        letterSpacing="1"
      >
        {distanceMm} mm {verdict}
      </text>
    </svg>
  );
}
