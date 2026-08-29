# Fly Eye

Fly Eye is a cross-platform operator interface for reviewing sports line calls.
This repository contains only the UI application; camera capture, calibration,
tracking, and inference are external system boundaries.

## Project structure

- `src/app/` — Routing, providers, session state, and the authenticated shell.
- `src/components/` — Shared React UI components.
- `src/domain/` — UI-facing models and framework-independent workflow rules.
- `src/features/` — Auth, matches, readiness, live monitoring, review, and
  decision screens. Tests and feature styles live beside their components.
- `src/infrastructure/` — Replaceable backend and versioned browser-storage
  adapters.
- `src/services/` — Contracts between the UI and infrastructure adapters.
- `src/assets/` — Application icons and locally bundled fonts.
- `src-tauri/` — Tauri v2 Rust host, capabilities, icons, and desktop
  configuration.
- `scripts/` — Project automation used by local tasks and CI.
- `docs/` — Project documentation and historical decision context.
- `.github/` — GitHub Actions and dependency-update configuration.

## Development

Install Node.js 24, stable Rust, the platform-specific
[Tauri prerequisites](https://v2.tauri.app/start/prerequisites/), and
[Task](https://taskfile.dev/docs/installation/). Then run:

```bash
task setup
task dev          # Browser development
task desktop:run  # Native Tauri window
task check        # Local quality and security checks
```

The app uses hash routes so navigation behaves consistently in browsers and the
Tauri webview. Normal registration and sign-in use the Fly Eye backend, with
access and refresh tokens kept in memory only. The anonymous demo remains local
and requires no registration. Demo setup is untimed; the 15-minute trial begins
only after the operator confirms **Start monitoring**, and each demo session is
restricted to its generated match.

Match persistence remains local until its approved backend-integration batch.
Camera capture, calibration, tracking, and inference integrations are also
outside the current repository.

Project development guidelines:

- [Documentation map](docs/README.md) — Product, workflow, technical,
  development, and work context for humans and coding agents.
- [Developer guide](docs/development/SETUP.md) — Setup, commands, and the
  simulated operator flow.
- [Commit convention](docs/development/COMMIT-CONVENTION.md) — Commit message
  format and validation hook.
- [Branching strategy](docs/development/BRANCHING.md) — Branch roles, reviews,
  merge methods, releases, and hotfixes.
- [Dependency management](docs/development/DEPENDENCIES.md) — Locked npm and
  Cargo dependencies and update workflow.
- [CI/CD](docs/development/CI-CD.md) — Local checks, automated validation,
  security policy, and release process.
