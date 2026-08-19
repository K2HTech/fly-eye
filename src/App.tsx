function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <a className="brand" href="/" aria-label="FLY EYE home">
          <span className="brand-mark" aria-hidden="true">
            FE
          </span>
          <span className="brand-name">FLY EYE</span>
        </a>
        <p className="environment-label">Operator workspace</p>
      </header>

      <main className="workspace" aria-labelledby="workspace-title">
        <section className="welcome-card" aria-describedby="workspace-summary">
          <div
            className="status-indicator"
            aria-label="Workspace status: ready"
            role="status"
          >
            <span className="status-dot" aria-hidden="true" />
            Ready
          </div>
          <p className="eyebrow">Workspace foundation</p>
          <h1 id="workspace-title">The operator workspace is ready.</h1>
          <p id="workspace-summary" className="workspace-summary">
            FLY EYE is prepared for the tools that help operators understand and
            review their flight data.
          </p>
          <p className="next-step">
            Monitoring and review surfaces will be added in the next workspace
            updates.
          </p>
        </section>
      </main>

      <footer className="app-footer">
        <p>FLY EYE desktop workspace</p>
        <p>Foundation ready</p>
      </footer>
    </div>
  );
}

export default App;
