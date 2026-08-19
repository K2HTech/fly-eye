import { useState } from "react";

import { LiveMonitor } from "./features/live";
import { ClipReview, type ClipDecision } from "./features/review";

type ActiveScreen = "live" | "review";

function App() {
  const [activeScreen, setActiveScreen] = useState<ActiveScreen>("live");

  const openReview = () => setActiveScreen("review");
  const closeReview = () => setActiveScreen("live");
  const openDecision = (_decision: ClipDecision) => {
    void _decision;
    // Batch 4 replaces this seam with the decision screen.
  };

  return (
    <main className="app-viewport">
      {activeScreen === "live" ? (
        <LiveMonitor onReview={openReview} />
      ) : (
        <ClipReview onBack={closeReview} onDecision={openDecision} />
      )}
    </main>
  );
}

export default App;
