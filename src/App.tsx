import { useState } from "react";

import { DecisionScreen, type DecisionResult } from "./features/decision";
import { LiveMonitor } from "./features/live";
import { ClipReview, type ClipDecision } from "./features/review";

type ActiveScreen = "live" | "review" | "decision";

function initialScreen(): ActiveScreen {
  if (!import.meta.env.DEV) return "live";
  const requested = new URLSearchParams(window.location.search).get("screen");
  return requested === "review" || requested === "decision"
    ? requested
    : "live";
}

function App() {
  const [activeScreen, setActiveScreen] = useState<ActiveScreen>(initialScreen);
  const [decisionResult, setDecisionResult] =
    useState<Partial<DecisionResult>>();

  const openReview = () => setActiveScreen("review");
  const closeReview = () => setActiveScreen("live");
  const openDecision = (decision: ClipDecision) => {
    setDecisionResult({ landingFrame: decision.landingFrame });
    setActiveScreen("decision");
  };

  let screen;
  if (activeScreen === "live") {
    screen = <LiveMonitor onReview={openReview} />;
  } else if (activeScreen === "review") {
    screen = <ClipReview onBack={closeReview} onDecision={openDecision} />;
  } else {
    screen = (
      <DecisionScreen
        result={decisionResult}
        onRunAgain={openReview}
        onBackToLive={closeReview}
      />
    );
  }

  return <main className="app-viewport">{screen}</main>;
}

export default App;
