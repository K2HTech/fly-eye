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
- `src/infrastructure/` — Replaceable adapters, currently including versioned
  browser storage for the local UI implementation.
- `src/services/` — Contracts between the UI and infrastructure adapters.
- `src/assets/` — Application icons and locally bundled fonts.
- `src-tauri/` — Tauri v2 Rust host, capabilities, icons, and desktop
  configuration.
- `scripts/` — Project automation used by local tasks and CI.
- `docs/` — Product and development documentation.
- `.github/` — GitHub Actions and dependency-update configuration.

## Development

Install Node.js 24, stable Rust, the platform-specific
[Tauri prerequisites](https://v2.tauri.app/start/prerequisites/), and
[Task](https://taskfile.dev/docs/installation/). Then run:

```bash
task setup
task dev          # Browser development
task desktop:run  # Native Tauri window
task check        # CI-equivalent local checks
```

The app uses hash routes so navigation behaves consistently in browsers and the
Tauri webview. It restores versioned local UI data before opening protected
routes. Signed-out users can create an account-shaped local profile, sign in,
or run an isolated demo without registration. Demo setup is untimed; the
15-minute trial begins only after the operator confirms **Start monitoring**.
Each demo session is restricted to its generated match.

Authentication and match persistence are local adapters prepared for future
backend replacement. Passwords are intentionally neither stored nor verified
in this UI-only implementation. Camera capture, calibration, tracking, and
inference integrations are also outside the current repository.

Project development guidelines:

- [Documentation map](docs/README.md) — Product, workflow, technical,
  development, and active-work context for humans and coding agents.
- [Developer guide](docs/development.md) — Setup, tasks, previews, and the
  simulated three-screen workflow.
- [Commit convention](docs/commit-convention.md) — Commit message format and
  validation hook.
- [Branching strategy](docs/branching-strategy.md) — Branch roles, reviews,
  merge methods, releases, and hotfixes.
- [Dependency management](docs/dependency-management.md) — Locked npm and Cargo
  dependencies and update workflow.
- [CI/CD](docs/ci-cd.md) — Local checks, automated validation, security policy,
  and release process.
