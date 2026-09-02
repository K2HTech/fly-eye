# Camera Calibration UI Implementation Plan

Status: Approved on 2026-09-02

This plan implements the approved calibration behavior in
[SPEC.md](SPEC.md). Each batch stops for product-owner review and is committed
separately only after approval. No push occurs without explicit permission
immediately before it.

## Dependency order

```text
Batch 0: approve specification and plan
  -> Batch 1: calibration contracts and backend adapter
     -> Batch 2: still capture and guided point marking
        -> Batch 3: solve result, readiness gates, and test monitor
           -> Batch 4: acceptance, durable documentation, and closeout
```

## Batch 0 — Lock the feature

### Outcome

The production calibration policy, test-preview distinction, point-marking
scheme, backend boundary, and review-sized implementation sequence are
approved before implementation begins.

### Files owned

- `docs/work/active/calibration-ui/SPEC.md`
- `docs/work/active/calibration-ui/PLAN.md`
- `docs/README.md`
- `docs/work/README.md`

### Validation

- Prettier for changed documentation.
- `git diff --check`.

### Proposed commit

`docs(calibration): specify operator workflow`

## Batch 1 — Calibration contracts and backend adapter

### Outcome

A replaceable, runtime-validated frontend calibration service can load current
results, request frame upload targets, upload declared stills, submit a solve,
and return sanitized recoverable errors without putting secrets in persisted
models.

### Work

- Define calibration domain/application contracts and runtime-validated backend
  DTOs for results, upload targets, quality, outlines, and wireframes.
- Implement the authenticated backend adapter for current-result retrieval,
  upload-target creation, direct upload, and solve submission.
- Add SHA-256 file-digest support at the browser boundary.
- Represent the approved public error/recovery categories.
- Add focused adapter, DTO, checksum, and error-path tests.

### Validation

- Focused calibration adapter tests.
- `npm run typecheck`, `npm run lint`, and `npm run format:check`.

### Proposed commit

`feat(calibration): add backend calibration service`

## Batch 2 — Still capture and guided court marking

### Outcome

An operator can capture three to five stills from one current camera preview,
choose a reference still, and complete or correct the four guided court-point
steps accessibly.

### Work

- Add a stream-to-still capture boundary that preserves source resolution.
- Build the capture and reference-still selection experience.
- Build guided outer-corner marking with source-coordinate transformation,
  correction, and keyboard-accessible alternatives.
- Keep stream, frame pixels, and intermediate state ephemeral.
- Add focused capture/coordinate/component/accessibility tests.

### Validation

- Focused capture and point-marking tests.
- Readiness integration and accessibility tests.
- `task check:quality`.

### Proposed commit

`feat(calibration): capture and mark court frames`

## Batch 3 — Solve result, readiness gates, and test monitor

### Outcome

The normal readiness page replaces its simulated selector with independent
per-camera calibration status and results. Camera testing is safe before
calibration, while official monitoring and simulated rally-review affordances
follow the approved two-camera usable-calibration gate.

### Work

- Compose the calibration service into normal authenticated application
  services without changing isolated demo behavior.
- Replace the normal simulated calibration selector with per-camera progress,
  overlay, quality, retry, and recalibration actions.
- Add the test-preview entry and communicate why rally review is disabled.
- Enforce both-camera usable-calibration requirements for official monitoring
  and rally-review availability.
- Update relevant product, readiness, live-monitor, and preparation-workflow
  documentation in the same batch.
- Add integration, route, and accessibility coverage for all approved gates.

### Validation

- Focused calibration/readiness/live-monitor integration tests and Axe scans.
- `task check:quality`.
- Manual browser review using injected media streams and controlled backend
  responses.

### Proposed commit

`feat(calibration): gate official monitoring on court geometry`

## Batch 4 — Acceptance and closeout

### Outcome

The feature has real-environment evidence against backend and object storage,
durable documentation is current, and the active-work record is closed without
overstating recording or inference support.

### Work

- Execute the accepted browser/backend/object-storage flow with both cameras.
- Verify source-resolution matching, object-storage CORS, upload expiry,
  poor/acceptable/good outcomes, invalidated camera geometry, and all error
  recovery paths.
- Record any external limitations or accepted deviations in the specification.
- Update quality requirements with durable manual validation needs.
- Mark `SPEC.md` implemented, archive it, delete `PLAN.md`, and remove the
  empty active directory.

### Validation

- `task check`.
- Manual evidence for both-camera calibration and official-monitoring gate.
- Documentation-link review and `git diff --check`.

### Proposed commit

`docs(calibration): complete operator calibration`
