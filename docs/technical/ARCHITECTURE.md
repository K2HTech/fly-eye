# Fly Eye Architecture

Status: Current state with deferred integration seams

This document records boundaries that affect safe product changes. Source code
and tests remain authoritative for implementation mechanics; product scope and
business rules are owned by the [PRD](../product/PRD.md) and the relevant page
and workflow documents.

## Runtime responsibilities

Fly Eye is a React application that runs in a normal browser during
development and inside a Tauri v2 webview for the desktop product. The
frontend owns the operator experience, route access, workflow state, and
replaceable service composition in both runtimes.

The Tauri host currently packages and launches the frontend window. It does not
currently provide camera commands, calibration, tracking, inference,
authentication, or match APIs. Native capabilities must not be treated as
available merely because the application is running in Tauri. Browser and
desktop navigation therefore share hash-based routes.

Evidence: [application bootstrap](../../src/main.tsx), [router
composition](../../src/app/router.ts), and [Tauri host](../../src-tauri/src/lib.rs).

## Application boundaries

The frontend separates responsibilities into a small set of replaceable
boundaries:

- Route surfaces decide what the operator can do at a product stage and
  delegate stateful operations to application context.
- Session and match providers coordinate asynchronous service calls, restore
  state, expose loading/error states, and prevent stale requests from
  overwriting newer state.
- Service contracts define the application-facing seams for authentication,
  match records/status, and readiness. Pages depend on these contracts rather
  than on a persistence or transport implementation.
- Domain rules remain framework-independent. Match status transitions and the
  readiness gate are enforced below the pages so invalid transitions cannot be
  created by navigation alone.
- Local infrastructure supplies the current replaceable demonstration
  adapters. They are not a production authorization,
  authentication, device, or synchronization boundary.

Evidence: [service contracts](../../src/services/contracts.ts), [provider
composition](../../src/App.tsx), [match provider](../../src/app/MatchProvider.tsx),
and [domain transitions](../../src/domain/matchTransitions.ts).

## Routing and access

The router has public onboarding routes and session-protected operator routes.
Session restoration has an explicit intermediate state before access decisions
are made; this prevents protected content from flashing for an anonymous user.
The route layer handles anonymous redirects, public-only redirects, demo-match
isolation, and safe handling of unknown locations. It is an access boundary;
server-enforced identity and ownership remain the responsibility of the backend
adapter and API.

The authenticated shell owns cross-page session presentation and sign-out, but
page-specific business rules remain in page and workflow documents. Demo-match
assignment is immutable in the authentication adapter, and route guards keep a
demo session in its assigned workspace. The match repository itself is not
session-aware, so these checks are not repository-level authorization.

Evidence: [session provider](../../src/app/SessionProvider.tsx), [route access
screens](../../src/app/RouteScreens.tsx), and [authentication workflow](../workflows/AuthenticationWorkflow.md).

## Persistence boundary

React pages and components must not access browser storage directly. The
composition layer injects `AppServices`; the local composition passes a storage
adapter to versioned local repositories while backend composition owns normal
remote data. This keeps storage and transport replaceable without moving those
concerns into product surfaces.

Current local persistence uses schema-versioned envelopes, runtime payload
validation, safe clearing of malformed or incompatible values, and explicit
copying at service boundaries. It remains the storage path for the isolated
demo workspace and UI-only supplemental data. Normal backend authentication
tokens are intentionally not persisted; a browser restart cannot restore that
normal session.

The approved operator-ownership rule is not fully implemented: current local
match records are workstation-wide rather than separated by normal operator.
This is a documented implementation gap, not permission to infer ownership
from local storage behavior.

Evidence: [local service composition](../../src/infrastructure/local/localAppServices.ts),
[versioned storage](../../src/infrastructure/local/versionedStorage.ts), and
[persistence validators](../../src/infrastructure/local/validators.ts).

## Security boundary

Normal registration and sign-in use a backend adapter; the backend API remains
the authentication and authorization boundary. Access and refresh tokens are
held in memory for the browser-only client. The adapter coordinates refresh
rotation, logout, and sanitized remote errors, while the backend verifies
credentials. Passwords and confirmations remain transient and are excluded
from persistence-safe models. Security and privacy constraints are owned by
the [quality requirements](QUALITY-REQUIREMENTS.md).

The local authentication adapter remains a demo-only simulation and must not be
presented as a secure account or authorization decision.

Evidence: [authentication contracts](../../src/services/contracts.ts),
[backend authentication adapter](../../src/infrastructure/backend/auth.ts),
[local demo adapter](../../src/infrastructure/local/localAppServices.ts), and
[authentication workflow](../workflows/AuthenticationWorkflow.md).

## Hardware and processing boundary

Readiness is currently a replaceable application service whose camera and
calibration states are explicitly simulated. The domain gate requires both
camera paths and a calibration profile before monitoring entry, but passing the
gate does not mean a physical device was discovered or that captured data is
valid.

Live views, rolling-buffer segments, synchronized frames, reconstructed
evidence, and decision values are likewise simulated UI behavior in the current
product. Camera capture, calibration, tracking, inference, real-time buffering,
and evidence provenance remain outside this repository's current boundary.

Future hardware and processing integrations must enter through explicit
service or host boundaries and preserve the distinction between unavailable,
simulated, and verified external state. Their transport, timing, failure, and
recovery contracts are not yet defined.

Evidence: [readiness service contract](../../src/services/contracts.ts), [local
readiness adapter](../../src/infrastructure/local/localAppServices.ts), and
[line-call review workflow](../workflows/LineCallReviewWorkflow.md).

## Deferred backend seam

The service interfaces keep authentication/session operations, match CRUD and
status operations, and readiness state operations behind application
contracts. Authentication DTO mapping, token rotation, and authorized retry
are implemented at the backend adapter boundary. Backend match DTO mapping,
synchronization and conflict policy, and organization/venue ownership remain
deferred to the next approved integration batch. The backend server remains an
external system and its implementation is not part of this repository.

No page should bypass these contracts to call HTTP, Tauri commands, storage, or
device APIs directly. A future integration may change the adapter and its
failure states, but should not silently change the product meaning documented
by the PRD and workflows.

## Architectural constraints

- Keep browser and Tauri behavior aligned through the shared frontend and
  hash-based routing.
- Keep service dependencies replaceable and injected at composition time.
- Keep domain invariants below route surfaces so invalid match transitions and
  readiness bypasses are rejected consistently.
- Keep simulated behavior visibly distinct from real hardware, backend, and
  inference results.
- Treat local adapters as demonstration infrastructure, never as a security or
  production ownership boundary.
