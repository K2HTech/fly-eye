import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";

import { BrandMark } from "../components/BrandMark";
import { CameraProvider } from "./CameraProvider";
import { demoTrialRemainingMs } from "../domain";
import { matchRoutes, routePaths } from "./paths";
import { useSession } from "./sessionContext";

export function AuthenticatedShell() {
  const navigate = useNavigate();
  const session = useSession();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(0);
  const expirationStarted = useRef(false);
  const identity = session.identity;

  const remainingMs = identity
    ? demoTrialRemainingMs(
        identity.session,
        nowMs || Date.parse(identity.session.demoTrialStartedAt ?? ""),
      )
    : null;

  useEffect(() => {
    if (
      identity?.session.mode !== "demo" ||
      !identity.session.demoTrialStartedAt
    )
      return;
    expirationStarted.current = false;
    const initialTick = window.setTimeout(() => setNowMs(Date.now()), 0);
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => {
      window.clearTimeout(initialTick);
      window.clearInterval(timer);
    };
  }, [identity?.session.demoTrialStartedAt, identity?.session.mode]);

  useEffect(() => {
    if (remainingMs !== 0 || expirationStarted.current) return;
    expirationStarted.current = true;
    void session
      .signOut()
      .then(() =>
        navigate(routePaths.welcome, {
          replace: true,
          state: {
            message:
              "Your 15-minute demo has ended. Sign up to continue using FLY EYE.",
          },
        }),
      )
      .catch(() => {
        expirationStarted.current = false;
        setSignOutError("The demo ended, but sign-out failed. Please retry.");
      });
  }, [navigate, remainingMs, session]);

  if (!identity) return null;

  const isDemo = identity.session.mode === "demo";
  const brandDestination =
    isDemo && identity.session.demoMatchId
      ? matchRoutes.readiness(identity.session.demoMatchId)
      : routePaths.matches;

  const signOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    setSignOutError(null);
    try {
      await session.signOut();
    } catch {
      setSignOutError("Unable to sign out. Please try again.");
      setIsSigningOut(false);
    }
  };

  const trialSeconds =
    remainingMs === null ? null : Math.ceil(remainingMs / 1000);
  const trialLabel =
    trialSeconds === null
      ? null
      : `${Math.floor(trialSeconds / 60)}:${String(trialSeconds % 60).padStart(2, "0")}`;

  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <NavLink
          className="app-shell__brand"
          aria-label={
            isDemo ? "FLY EYE demo workspace" : "FLY EYE match dashboard"
          }
          to={brandDestination}
        >
          <BrandMark />
          FLY EYE
        </NavLink>

        {isDemo ? (
          <span className="app-shell__demo-label">Live demo workspace</span>
        ) : (
          <nav className="app-shell__nav" aria-label="Primary navigation">
            <NavLink
              className={({ isActive }) =>
                `app-shell__nav-link${isActive ? " is-active" : ""}`
              }
              end
              to={routePaths.matches}
            >
              Matches
            </NavLink>
            <NavLink
              className={({ isActive }) =>
                `app-shell__nav-link${isActive ? " is-active" : ""}`
              }
              to={routePaths.newMatch}
            >
              Create match
            </NavLink>
          </nav>
        )}

        <div className="app-shell__account">
          <div className="app-shell__identity">
            {trialSeconds !== null && trialLabel ? (
              <span
                className={`app-shell__trial${trialSeconds <= 120 ? " app-shell__trial--ending" : ""}`}
                role="timer"
                aria-label={`Demo time remaining ${trialLabel}`}
              >
                Demo trial · {trialLabel}
              </span>
            ) : (
              <span>Signed in</span>
            )}
            <strong>{identity.profile.displayName}</strong>
          </div>
          <button
            type="button"
            disabled={isSigningOut}
            onClick={() => void signOut()}
          >
            {isSigningOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </header>

      {signOutError && (
        <p className="app-shell__error" role="alert">
          {signOutError}
        </p>
      )}

      <CameraProvider>
        <div className="app-shell__content">
          <Outlet />
        </div>
      </CameraProvider>
    </div>
  );
}
