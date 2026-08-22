import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { routePaths } from "../../app/paths";
import "./auth.css";

interface AuthShellProps {
  aside?: ReactNode;
  children: ReactNode;
  eyebrow: string;
  title: string;
}

export function AuthShell({ aside, children, eyebrow, title }: AuthShellProps) {
  return (
    <section className="auth-shell" aria-labelledby="auth-page-title">
      <div className="auth-shell__glow" aria-hidden="true" />
      <header className="auth-shell__header">
        <Link
          className="auth-shell__brand"
          to={routePaths.welcome}
          aria-label="FLY EYE welcome"
        >
          <span className="auth-shell__mark" aria-hidden="true">
            ◎
          </span>
          <span>FLY EYE</span>
        </Link>
        <span className="auth-shell__prototype">LOCAL UI PROTOTYPE</span>
      </header>

      <div
        className={`auth-shell__body${aside ? " auth-shell__body--split" : ""}`}
      >
        {aside}
        <div className="auth-shell__panel">
          <p className="auth-shell__eyebrow">{eyebrow}</p>
          <h1 id="auth-page-title">{title}</h1>
          {children}
        </div>
      </div>

      <footer className="auth-shell__footer">
        <span>Two-camera line-call review</span>
        <span>Local badminton operations</span>
      </footer>
    </section>
  );
}
