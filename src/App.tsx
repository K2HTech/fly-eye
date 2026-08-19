import { LiveMonitor } from "./features/live";

function App() {
  return (
    <main className="app-viewport">
      <LiveMonitor onReview={() => undefined} />
    </main>
  );
}

export default App;
