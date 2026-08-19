# React and Tauri migration progress

The PySide prototype remains available on `feature/desktop-ui`. The active
implementation is being rebuilt as a UI-only React, TypeScript, Vite, and Tauri
v2 application on `feature/tauri-desktop-ui`.

| Batch | Scope                                                               | Status   |
| ----- | ------------------------------------------------------------------- | -------- |
| 1     | React/Tauri foundation and Node/Rust tooling                        | Complete |
| 2     | Live Monitor                                                        | Complete |
| 3     | Clip Review                                                         | Complete |
| 4     | Decision screen                                                     | Complete |
| 5     | Accessibility, responsive UI, cross-platform CI, security, and docs | Complete |

Each completed batch is verified and recorded in a separate Conventional
Commit. The migration uses deterministic simulated data and does not include
camera, calibration, tracking, or inference implementations.

Final verification covers Prettier, ESLint, strict TypeScript, 34 Vitest tests
(including automated Axe checks), the production Vite build, npm and RustSec
audits, Rust formatting and locked metadata, release-version validation,
actionlint, and desktop/narrow-viewport visual review. Native `cargo check` and
Clippy are configured on all three CI operating systems; running them on this
Ubuntu workstation first requires the documented WebKitGTK, D-Bus, and related
Tauri development packages.
