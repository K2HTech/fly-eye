# ADR 0003: Use build mode for development camera entry

Status: Accepted

Date: 2026-09-12

## Context

The operator UI needs a fast path to validate a single live or prerecorded
phone stream during development. Official monitoring still needs two camera
roles, decoded previews, and safe current calibrations. A browser preference or
runtime flag could accidentally weaken an official deployment.

## Decision

Derive the frontend monitor-entry presentation rule from the Vite build mode.
Non-production builds allow the normal monitoring action with one decoded
preview and no calibration. Production builds require both supported roles,
both previews, and safe current calibrations.

The frontend rule is not an authorization boundary. The backend must enforce
the production requirement for official monitoring and decisions.

## Rationale

Build mode is fixed when the application is built and cannot be changed by an
operator in browser storage or a normal UI setting. It supports local device
testing without adding a deployable production bypass.

## Alternatives and constraints

- A user-editable development switch was rejected because it could weaken an
  official browser session.
- Always requiring two calibrated cameras was rejected for development because
  it prevents isolated stream and prerecorded-video validation.
- Trusting the frontend gate for official enforcement is rejected; browser code
  is not an authority boundary.

## Consequences

- The normal Start monitoring action has environment-dependent availability.
- Production parity must be verified with a production build and backend
  enforcement when that contract is available.
- Development entry is not evidence that a camera setup is fit for an official
  line-call decision.

## Evidence

- [Monitoring policy](../../../src/features/readiness/monitoringPolicy.ts)
- [Hardware readiness page](../../pages/HardwareReadinessPage.md)
- [Match preparation workflow](../../workflows/MatchPreparationWorkflow.md)
