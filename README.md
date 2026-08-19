# Fly Eye

Fly Eye is a cross-platform operator interface for reviewing sports line calls.
This repository contains only the UI application; camera capture, calibration,
tracking, and inference are external system boundaries.

## Project structure

- `src/` — React and TypeScript UI, tests, styles, assets, and simulated services.
- `src-tauri/` — Tauri v2 Rust host, capabilities, and desktop configuration.
- `docs/` — Product and development documentation.
- `.github/` — GitHub Actions workflows.

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

Project development guidelines:

- [Commit convention](docs/commit-convention.md) — Commit message format and
  validation hook.
- [Branching strategy](docs/branching-strategy.md) — Branch roles, reviews,
  merge methods, releases, and hotfixes.
- [Dependency management](docs/dependency-management.md) — Locked npm and Cargo
  dependencies and update workflow.
- [CI/CD](docs/ci-cd.md) — Local checks, automated validation, security policy,
  and release process.
- [Migration progress](docs/migration-progress.md) — React/Tauri migration
  checkpoints and verification status.
