# Developer guide

Fly Eye is a UI-only React 19 and TypeScript application built with Vite and
hosted as a desktop app by Tauri v2. The screens use deterministic simulated
data. Camera capture, calibration, shuttle tracking, inference, and clip
storage are outside the current application boundary.

## Prerequisites

Install:

- Node.js 24.x, as required by `package.json`.
- npm 11 or a compatible npm release for the locked Node toolchain.
- Rust stable and Cargo for the Tauri host.
- [Task](https://taskfile.dev/docs/installation/) for the project commands.
- The [platform-specific Tauri prerequisites](https://v2.tauri.app/start/prerequisites/).

For dependency installation details and native Linux packages, see
[dependency management](dependency-management.md).

## First setup

From the repository root:

```bash
task setup
```

This installs the locked npm dependency graph with `npm ci` and installs the
latest compatible `cargo-audit` CLI. Rust application dependencies are resolved
from the committed Cargo lockfile when the native checks run.

## Common tasks

| Command            | Purpose                                           |
| ------------------ | ------------------------------------------------- |
| `task dev`         | Run the Vite browser development server.          |
| `task desktop:run` | Run the app in a native Tauri window.             |
| `task format`      | Format web project files with Prettier.           |
| `task lint`        | Run ESLint.                                       |
| `task typecheck`   | Run the strict TypeScript build check.            |
| `task test`        | Run the Vitest suite once.                        |
| `task build`       | Build the production web app.                     |
| `task check`       | Run the complete local CI-equivalent check suite. |

Run `task --list` to see every available task, including Rust formatting and
compile checks.

## Development-only screen previews

Start `task dev`, then use these browser URLs:

```text
http://localhost:1420/#/matches/demo/live
http://localhost:1420/#/matches/demo/review
http://localhost:1420/#/matches/demo/decision
```

The app uses hash routes for browser and Tauri compatibility and restores its
versioned local demo data before opening protected routes. Until the onboarding
UI lands, development builds use a temporary demo fallback when no saved
session exists so these operator screens remain directly previewable.
Production builds do not use that fallback and redirect signed-out protected
routes to the welcome screen. The onboarding batch will replace the fallback
with explicit registration, sign-in, and demo actions.

## Simulated operator flow

The intended three-screen flow is:

1. **Live Monitor** — view the two simulated camera feeds and choose **Review
   last rally** (or use `F1`).
2. **Clip Review** — step synchronized paused camera views, adjust the shared
   range, choose automatic or manual landing-frame selection, and choose **Get
   the call** (or press `Enter`).
3. **Decision** — inspect the simulated IN/OUT evidence, run the review again,
   return to live with **Back to live** or `Escape`, and use the simulated
   court-screen and save actions when needed.

Every camera frame, trajectory, result, and external action in this flow is
simulated for UI development; none writes video or match data to disk.

## Branches and commits

Create topic branches from `develop` and open a pull request back into
`develop`. Use `feature/<name>` for product work, `fix/<name>` for defects,
`docs/<name>` for documentation, and `chore/<name>` for maintenance. Urgent
released-code fixes use `hotfix/<name>` from `main` and are subsequently
backported to `develop`.

Write [Conventional Commits](commit-convention.md), enable the repository hook,
and run `task check` before requesting review. See the complete
[branching and review strategy](branching-strategy.md) for merge authority,
release, and hotfix rules.
