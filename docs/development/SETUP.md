# Developer guide

Fly Eye is a React 19 and TypeScript client built with Vite and hosted as a
desktop app by Tauri v2. Normal authentication uses the external Fly Eye
backend; the anonymous demo and unfinished processing surfaces use
deterministic simulated data. Camera capture, calibration, shuttle tracking,
inference, and clip storage are outside the current application boundary.

## Prerequisites

Install:

- Node.js 24.x, as required by `package.json`.
- npm 11 or a compatible npm release for the locked Node toolchain.
- Rust stable and Cargo for the Tauri host.
- [Task](https://taskfile.dev/docs/installation/) for the project commands.
- The [platform-specific Tauri prerequisites](https://v2.tauri.app/start/prerequisites/).

For dependency installation details and native Linux packages, see
[dependency management](DEPENDENCIES.md).

## First setup

From the repository root:

```bash
task setup
```

This installs the locked npm dependency graph with `npm ci` and installs the
latest compatible `cargo-audit` CLI. Rust application dependencies are resolved
from the committed Cargo lockfile when the native checks run.

Copy `.env.example` to an ignored `.env.local` and supply the public endpoints:

```dotenv
VITE_API_BASE_URL=https://your-backend.example
VITE_SIGNALING_URL=wss://your-backend.example/api/v1/signal
VITE_CAMERA_SIMULATOR_ENABLED=false
```

The API value may include `/api/v1`; the client adds it when absent. Never put
passwords, tokens, TURN credentials, or other secrets in a `VITE_*` value,
because Vite exposes those values to browser code. Without valid endpoint
configuration, normal authentication reports that the backend is unavailable
while the isolated demo remains usable.

## Common tasks

| Command            | Purpose                                       |
| ------------------ | --------------------------------------------- |
| `task dev`         | Run the Vite browser development server.      |
| `task desktop:run` | Run the app in a native Tauri window.         |
| `task format`      | Format web project files with Prettier.       |
| `task lint`        | Run ESLint.                                   |
| `task typecheck`   | Run the strict TypeScript build check.        |
| `task test`        | Run the Vitest suite once.                    |
| `task build`       | Build the production web app.                 |
| `task check`       | Run local quality, Rust, and security checks. |

Run `task --list` to see every available task, including Rust formatting and
compile checks.

## Preview the operator flow

Start the browser development server:

```bash
task dev
```

Open `http://localhost:1420`, then choose **Run the live demo** for an isolated
demo match or register/sign in through the configured backend. Backend
credentials are entered only through the authentication forms and are not
stored in environment files. Protected match URLs contain a generated match
identifier and cannot be opened before the corresponding session is
established.

For a smoke test, complete readiness, enter monitoring, review the latest
rally, and open its decision. The canonical behavior and restrictions are in
the [demo-trial workflow](../workflows/DemoTrialWorkflow.md),
[match-preparation workflow](../workflows/MatchPreparationWorkflow.md), and
[line-call review workflow](../workflows/LineCallReviewWorkflow.md).

Camera frames, trajectories, evidence, verdict generation, and clip-save
actions are simulated. Normal authentication tokens are memory-only; demo,
match, and readiness metadata may be persisted by browser storage. The current
application does not save real media or adjudication artifacts.

## Branches and commits

Create topic branches from `develop` and open a pull request back into
`develop`. Use `feature/<name>` for product work, `fix/<name>` for defects,
`docs/<name>` for documentation, and `chore/<name>` for maintenance. Urgent
released-code fixes use `hotfix/<name>` from `main` and are subsequently
backported to `develop`.

Write [Conventional Commits](COMMIT-CONVENTION.md), enable the repository hook,
and run `task check` before requesting review. See the complete
[branching and review strategy](BRANCHING.md) for merge authority,
release, and hotfix rules.
