# ADR 0002: Separate UI from storage with application services

Status: Accepted

Date: 2026-08-22

## Context

The current UI demonstration must preserve local operator, session, match, and
readiness state across restarts without treating browser storage as a future
backend or security boundary. Remote authentication, backend match
synchronization, network DTOs, token handling, retries, and synchronization
policy are not yet defined.

The approved pre-match specification required React pages and components not to
call `localStorage` directly. It also required small application service
contracts, a single composition layer, and local adapters that can later be
replaced by backend or Tauri integrations.

## Decision

Define UI-facing authentication, match, and readiness operations as application
service contracts. Inject an `AppServices` implementation at the application
composition boundary. Keep persistence and storage mechanics in replaceable
infrastructure adapters; the current composition supplies local adapters backed
by versioned browser storage.

React components consume the application services and must not access browser
storage directly.

## Rationale

The boundary lets the current demonstration persist non-secret state while the
remote backend contract remains unknown. It prevents storage mechanics from
becoming component behavior and provides one replacement point for future
backend or Tauri adapters. Injecting the contracts also lets integration tests
exercise components with controlled service implementations instead of real
browser persistence.

## Alternatives and constraints

- Direct `localStorage` access from React pages and components was explicitly
  rejected because it would couple product surfaces to the temporary local
  persistence mechanism.
- Implementing remote services immediately was outside the approved UI-only
  scope because their contracts and security behavior were undefined.
- Credential inputs are transient and must never enter persisted domain
  records or storage adapters.

## Consequences

- Components depend on asynchronous application operations rather than storage
  APIs or stored data shapes.
- Local persistence, validation, schema versioning, and corrupt-data recovery
  remain infrastructure concerns.
- A future integration can replace adapters at the composition boundary, but
  its DTO mapping, authorization, errors, retries, and synchronization semantics
  still require an approved specification.
- Service-contract changes affect providers, adapters, consumers, and their
  integration tests and therefore require coordinated review.
- Local adapters remain demonstration infrastructure; they do not provide a
  production authentication or data-integrity boundary.

## Evidence

- [Application service contracts](../../../src/services/contracts.ts)
- [Local adapter composition](../../../src/infrastructure/local/localAppServices.ts)
- [Application composition boundary](../../../src/main.tsx)
- [Approved product boundary and deferred backend integration](../../product/PRD.md)
- [Pre-match specification that established the boundary](https://github.com/K2HTech/fly-eye/blob/13de6d23a5927cb393ba3427ada9c5ec7ab79f56/SPEC.md#7-backend-integration-boundary)
- [Local service implementation commit](https://github.com/K2HTech/fly-eye/commit/13de6d23a5927cb393ba3427ada9c5ec7ab79f56)
