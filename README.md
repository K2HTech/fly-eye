# Fly Eye

Fly Eye is a lightweight system inspired by Sony's Hawk-Eye technology.

## Project structure

- `core/` — Pure Python library containing calibration mathematics, detection,
  triangulation, and trajectory logic. It must not depend on PySide6 or network
  functionality.
- `desktop/` — PySide6 desktop application. It imports and uses `core`.
- `calib/` — Calibration tools and the operator-facing calibration wizard.
- `ml/` — Machine-learning training and offline evaluation code. It imports and
  uses `core`.
- `data/` — Sample video clips and one known-good calibration profile. Large
  assets in this directory will be managed with Git LFS.
- `docs/` — Project documentation.
- `tests/` — Automated tests for the project.

## Development

Project development guidelines:

- [Commit convention](docs/commit-convention.md) — Commit message format,
  allowed types, examples, and local hook setup.
- [Dependency management](docs/dependency-management.md) — Python version,
  isolated dependency sets, environment setup, and lockfile workflow.
