# ADR 0001: Use React and Tauri for the cross-platform UI

Status: Accepted

Date: 2026-08-20

## Context

Fly Eye is a UI application intended to run consistently in a development
browser and as a desktop operator interface. Camera capture, calibration,
tracking, and inference remain outside this repository. The project previously
had a Python/PySide desktop prototype; on 2026-08-20, the active implementation
was rebuilt on a React and Tauri foundation.

The retained migration history establishes the selected stack and the
cross-platform delivery outcome, but it does not retain a detailed comparison
or scoring of candidate UI frameworks.

## Decision

Build the Fly Eye frontend with React and TypeScript, use Vite for browser
development and production frontend builds, and host the built frontend in a
Tauri v2 desktop application. Keep native host code and capabilities in the
Tauri Rust project rather than mixing them into React components.

## Rationale

This stack provides one UI implementation for the two approved execution
contexts: a normal browser during development and the Tauri desktop webview for
operator use. The Tauri configuration consumes the same Vite development URL
and production output, while the release workflow produces native bundles for
Linux, macOS, and Windows.

No stronger claim about why React or Tauri was preferred over every alternative
is made because that comparative rationale is not present in the surviving
approved history.

## Alternatives and constraints

- A Python/PySide implementation existed before the React/Tauri migration. The
  history establishes that it was replaced, but not the detailed reasons for
  rejecting it.
- The application must remain usable in both the browser and Tauri webview and
  preserve the repository's UI-only boundary.
- Native desktop delivery brings Node.js, Rust, and platform-specific Tauri
  prerequisites into development and release validation.

## Consequences

- Product UI, routing, state, and accessibility behavior live in the shared
  React and TypeScript frontend.
- Vite builds the frontend for both browser testing and the Tauri host.
- Native capabilities and desktop configuration belong to the Rust/Tauri
  boundary.
- Changes must be checked for behavior in both browser and desktop-webview
  contexts.
- Cross-platform releases must validate and package the application separately
  for their supported operating-system targets.

## Evidence

- [React, TypeScript, Vite, and Tauri dependencies and scripts](../../../package.json)
- [Tauri v2 host and frontend build configuration](../../../src-tauri/tauri.conf.json)
- [Tauri Rust host dependencies](../../../src-tauri/Cargo.toml)
- [Cross-platform native release matrix](../../../.github/workflows/release.yml)
- [Current product execution contexts](../../product/PRD.md)
- [React/Tauri foundation commit](https://github.com/K2HTech/fly-eye/commit/e0242f1ffdb26ce4c6f90bf077e7a8d99924b4de)
- [Cross-platform delivery hardening commit](https://github.com/K2HTech/fly-eye/commit/d25f78f3987d0931b5fbe44cdfc7c645658fb5d5)
