# React and Tauri migration progress

The PySide prototype remains available on `feature/desktop-ui`. The active
implementation is being rebuilt as a UI-only React, TypeScript, Vite, and Tauri
v2 application on `feature/tauri-desktop-ui`.

| Batch | Scope                                                               | Status   |
| ----- | ------------------------------------------------------------------- | -------- |
| 1     | React/Tauri foundation and Node/Rust tooling                        | Complete |
| 2     | Live Monitor                                                        | Complete |
| 3     | Clip Review                                                         | Pending  |
| 4     | Decision screen                                                     | Pending  |
| 5     | Accessibility, responsive UI, cross-platform CI, security, and docs | Pending  |

Each completed batch is verified and recorded in a separate Conventional
Commit. The migration uses deterministic simulated data and does not include
camera, calibration, tracking, or inference implementations.
