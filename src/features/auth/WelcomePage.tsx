import { useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  type Location,
} from "react-router-dom";

import { routePaths } from "../../app/paths";
import { useSession } from "../../app/sessionContext";
import { AuthShell } from "./AuthShell";

const systemFacts = [
  { value: "02", label: "Synchronized cameras" },
  { value: "120", label: "Frames per second" },
  { value: "30s", label: "Rolling rally buffer" },
] as const;

interface RouteMessageState {
  message?: string;
}

function routeMessage(location: Location): string | undefined {
  if (typeof location.state !== "object" || location.state === null) {
    return undefined;
  }

  const { message } = location.state as RouteMessageState;
  return typeof message === "string" ? message : undefined;
}

function WelcomeVisual() {
  return (
    <div className="welcome-visual" aria-hidden="true">
      <div className="welcome-visual__status">
        <span /> SYSTEM PREVIEW
      </div>
      <svg viewBox="0 0 640 410">
        <defs>
          <linearGradient id="court-fill" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#183b2a" />
            <stop offset="1" stopColor="#0b2016" />
          </linearGradient>
        </defs>
        <path d="M88 358 210 70h220l122 288Z" fill="url(#court-fill)" />
        <g fill="none" stroke="#eff3ee" strokeWidth="3" opacity=".82">
          <path d="M88 358 210 70h220l122 288Z" />
          <path d="M132 254h376M173 157h294M320 70v288" />
        </g>
        <path
          d="M448 51Q405 139 354 247"
          fill="none"
          stroke="#f3aa3c"
          strokeDasharray="12 10"
          strokeWidth="5"
        />
        <circle cx="351" cy="254" r="10" fill="#f5f7f3" />
        <circle cx="351" cy="254" r="28" fill="none" stroke="#4c8dff" />
        <path d="M318 254h66M351 221v66" stroke="#4c8dff" strokeWidth="2" />
      </svg>
      <div className="welcome-visual__caption">
        <span>CAM A + CAM B</span>
        <strong>Every landing, reconstructed.</strong>
      </div>
    </div>
  );
}

export function WelcomePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const session = useSession();
  const [isEnteringDemo, setIsEnteringDemo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enterDemo = async () => {
    if (isEnteringDemo) return;
    setIsEnteringDemo(true);
    setError(null);
    try {
      await session.continueAsDemo();
      navigate(routePaths.matches, { replace: true });
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to start demo mode.",
      );
    } finally {
      setIsEnteringDemo(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Operator console"
      title="See the line. Make the call."
      aside={<WelcomeVisual />}
    >
      <p className="auth-shell__lead">
        A focused two-camera review workspace for fast, confident badminton line
        calls.
      </p>

      {routeMessage(location) && (
        <p className="auth-message auth-message--notice" role="status">
          {routeMessage(location)}
        </p>
      )}

      <div className="welcome-actions">
        <Link
          className="auth-button auth-button--primary"
          to={routePaths.register}
        >
          Create account <span aria-hidden="true">→</span>
        </Link>
        <Link
          className="auth-button auth-button--secondary"
          to={routePaths.signIn}
        >
          Sign in
        </Link>
        <button
          className="auth-button auth-button--text"
          type="button"
          disabled={isEnteringDemo}
          onClick={() => void enterDemo()}
        >
          {isEnteringDemo ? "Starting local demo…" : "Continue as demo"}
        </button>
      </div>

      {error && (
        <p className="auth-message auth-message--error" role="alert">
          {error}
        </p>
      )}

      <p className="auth-shell__disclaimer">
        Demo mode stores non-secret profile and match data only on this device.
      </p>

      <dl className="welcome-facts">
        {systemFacts.map((fact) => (
          <div key={fact.label}>
            <dt>{fact.label}</dt>
            <dd>{fact.value}</dd>
          </div>
        ))}
      </dl>
    </AuthShell>
  );
}
