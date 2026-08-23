import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { routePaths } from "../../app/paths";
import { useSession } from "../../app/sessionContext";
import "./landing.css";

type DemoEntryPoint = "hero" | "footer";

const systemMetrics = [
  [
    "120",
    "",
    "Target frames per second",
    "High-speed capture is the product target for close landings.",
  ],
  [
    "02",
    "",
    "Synchronized cameras",
    "The product concept combines two timestamp-aligned views.",
  ],
  [
    "12",
    "s",
    "Retroactive capture window",
    "Recent footage is ready before the operator presses capture.",
  ],
  [
    "03",
    "",
    "Decision outcomes",
    "IN, OUT, or INCONCLUSIVE keeps every result unambiguous.",
  ],
] as const;

const workflowSteps = [
  [
    "01",
    "Set up",
    "Two cameras, four corners",
    "Prepare two camera angles and verify the court geometry before the match starts.",
  ],
  [
    "02",
    "Capture",
    "Press after the rally",
    "Open the recent synchronized footage and inspect the disputed landing frame by frame.",
  ],
  [
    "03",
    "Call it",
    "Verdict with evidence",
    "Review the reconstructed landing, supporting frame, confidence, and plain-language result.",
  ],
] as const;

function scrollToSection(sectionId: string) {
  document.getElementById(sectionId)?.scrollIntoView({ block: "start" });
}

function LandingPreview() {
  return (
    <div
      className="landing-preview"
      role="img"
      aria-label="Simulated badminton court preview showing an illustrative out verdict"
    >
      <div className="landing-preview__topline">
        <span>
          <i aria-hidden="true" /> Demo · Cam A + Cam B
        </span>
        <span>120 fps · synchronized</span>
      </div>
      <div className="landing-preview__court">
        <svg viewBox="0 0 640 410" aria-hidden="true">
          <defs>
            <linearGradient id="landing-court-fill" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0" stopColor="#183b2a" />
              <stop offset="1" stopColor="#081810" />
            </linearGradient>
          </defs>
          <path
            d="M88 358 210 70h220l122 288Z"
            fill="url(#landing-court-fill)"
          />
          <g fill="none" stroke="#eff3ee" strokeWidth="3" opacity=".82">
            <path d="M88 358 210 70h220l122 288Z" />
            <path d="M225 70 124 358M415 70l101 288" />
            <path d="M203 88h234M168 171h304M140 214h360M132 257h376M95 341h450" />
            <path d="M320 70v101M320 257v101" />
            <path d="M136 211h368" strokeWidth="7" opacity=".55" />
          </g>
          <path
            d="M448 44Q426 147 392 270"
            fill="none"
            stroke="#f5a524"
            strokeDasharray="12 10"
            strokeWidth="5"
          />
          <g className="landing-preview__target">
            <circle
              className="landing-preview__target-pulse landing-preview__target-pulse--delayed"
              cx="390"
              cy="278"
              r="28"
              fill="none"
              stroke="#2f6bff"
            />
            <circle
              className="landing-preview__target-pulse"
              cx="390"
              cy="278"
              r="28"
              fill="none"
              stroke="#2f6bff"
            />
            <path d="M357 278h66M390 245v66" stroke="#2f6bff" strokeWidth="2" />
            <circle
              className="landing-preview__shuttle"
              cx="390"
              cy="278"
              r="10"
              fill="#f5f7f3"
            />
          </g>
        </svg>
        <div className="landing-preview__verdict">
          <span>Verdict · demo rally</span>
          <div>
            <strong>OUT</strong>
            <b>97% confidence</b>
          </div>
          <small>Demonstration result</small>
        </div>
      </div>
      <div className="landing-preview__caption">
        <span>Badminton court · dual-camera view</span>
        <strong>Every landing, reconstructed.</strong>
      </div>
    </div>
  );
}

export function WelcomePage() {
  const navigate = useNavigate();
  const session = useSession();
  const [isEnteringDemo, setIsEnteringDemo] = useState(false);
  const [demoError, setDemoError] = useState<{
    entryPoint: DemoEntryPoint;
    message: string;
  } | null>(null);

  const enterDemo = async (entryPoint: DemoEntryPoint) => {
    if (isEnteringDemo) return;
    setIsEnteringDemo(true);
    setDemoError(null);
    try {
      await session.continueAsDemo();
      navigate(routePaths.matches, { replace: true });
    } catch (cause) {
      setDemoError({
        entryPoint,
        message:
          cause instanceof Error ? cause.message : "Unable to start demo mode.",
      });
    } finally {
      setIsEnteringDemo(false);
    }
  };

  return (
    <article className="landing-page">
      <header className="landing-header">
        <button
          className="landing-brand"
          type="button"
          onClick={() => scrollToSection("landing-top")}
          aria-label="FLY EYE, return to top"
        >
          <span aria-hidden="true" /> FLY EYE
        </button>
        <nav className="landing-nav" aria-label="Landing page sections">
          <button type="button" onClick={() => scrollToSection("system")}>
            System
          </button>
          <button type="button" onClick={() => scrollToSection("workflow")}>
            Workflow
          </button>
          <button type="button" onClick={() => scrollToSection("accuracy")}>
            Accuracy
          </button>
        </nav>
        <div className="landing-header__actions">
          <Link
            className="landing-link-button landing-link-button--quiet"
            to={routePaths.signIn}
          >
            Sign in
          </Link>
          <Link
            className="landing-link-button landing-link-button--blue"
            to={routePaths.register}
          >
            Sign up
          </Link>
        </div>
      </header>

      <section
        className="landing-hero"
        id="landing-top"
        aria-labelledby="landing-title"
      >
        <div className="landing-hero__copy">
          <p className="landing-pill">
            <span aria-hidden="true" /> Two cameras. One verdict.
          </p>
          <h1 id="landing-title">
            See the line.
            <br />
            Make the call.
          </h1>
          <p className="landing-hero__lead">
            A portable badminton line-call assistant. Capture a disputed landing
            and review the reconstructed evidence in one focused operator
            workspace.
          </p>
          <div className="landing-hero__actions">
            <button
              className="landing-demo-button"
              type="button"
              disabled={isEnteringDemo}
              onClick={() => void enterDemo("hero")}
            >
              <span>
                <strong>
                  {isEnteringDemo ? "Opening demo…" : "Open demo workspace"}
                </strong>
                <small>No signup · simulated workspace</small>
              </span>
              <b aria-hidden="true">→</b>
            </button>
            <p>
              <span>Already set up?</span>
              <Link to={routePaths.signIn}>Sign in to your console →</Link>
            </p>
          </div>
          {demoError?.entryPoint === "hero" && (
            <p className="landing-error" role="alert">
              {demoError.message}
            </p>
          )}
        </div>
        <LandingPreview />
      </section>

      <section
        className="landing-metrics"
        id="system"
        aria-labelledby="metrics-title"
      >
        <h2 className="landing-visually-hidden" id="metrics-title">
          System overview
        </h2>
        {systemMetrics.map(([value, unit, label, detail]) => (
          <article key={label}>
            <strong>
              {value}
              <small>{unit}</small>
            </strong>
            <h3>{label}</h3>
            <p>{detail}</p>
          </article>
        ))}
      </section>

      <section
        className="landing-workflow"
        id="workflow"
        aria-labelledby="workflow-title"
      >
        <div className="landing-section-heading">
          <div>
            <p>Operator flow</p>
            <h2 id="workflow-title">
              Setup to verdict
              <br />
              in one sitting.
            </h2>
          </div>
          <span>From setup to a clear decision</span>
        </div>
        <div className="landing-workflow__grid">
          {workflowSteps.map(([number, label, title, description]) => (
            <article key={number}>
              <span>
                {number} / {label}
              </span>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section
        className="landing-trust"
        id="accuracy"
        aria-labelledby="trust-title"
      >
        <div>
          <p>Trust model</p>
          <h2 id="trust-title">
            Evidence first.
            <br />
            Confidence earned.
          </h2>
          <p className="landing-trust__lead">
            When the evidence is unclear, FLY EYE returns INCONCLUSIVE with a
            plain-language reason instead of pretending to know.
          </p>
        </div>
        <div className="landing-trust__panel" aria-label="Decision principles">
          <div>
            <span>Occluded landing</span>
            <strong>Explain</strong>
          </div>
          <div>
            <span>Uncalibrated area</span>
            <strong>Inconclusive</strong>
          </div>
          <div>
            <span>Supporting evidence</span>
            <strong>Always visible</strong>
          </div>
        </div>
      </section>

      <section className="landing-final" aria-labelledby="landing-final-title">
        <div>
          <h2 id="landing-final-title">Open the console.</h2>
          <p>
            Demo mode keeps non-secret profile and match data on this device
            only.
          </p>
        </div>
        <div className="landing-final__actions">
          <button
            type="button"
            disabled={isEnteringDemo}
            onClick={() => void enterDemo("footer")}
          >
            Continue as demo →
          </button>
          <Link to={routePaths.register}>Sign up</Link>
        </div>
        {demoError?.entryPoint === "footer" && (
          <p className="landing-error" role="alert">
            {demoError.message}
          </p>
        )}
      </section>

      <footer className="landing-footer">
        <span>FLY EYE · badminton line-call assistant</span>
        <span>Two cameras · one verdict</span>
      </footer>
    </article>
  );
}
