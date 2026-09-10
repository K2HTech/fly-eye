# Court Calibration Plan

Status: Draft — awaiting product-owner approval

Each batch has one file owner. Work stops after each approved batch and each
approved batch has its own Conventional Commit.

## Batch 0 — Contracts and navigation foundation

- Add calibration domain/service contracts, runtime DTO validation, and backend
  adapter tests for frames, uploads, current calibration, solve, and config.
- Add the isolated calibration route from readiness; unavailable backend data
  fails safely without pretending calibration succeeded.
- Owner: frontend integration.
- Validate: focused contract/adapter/route tests, typecheck, lint.
- Commit: `feat(calibration): add backend calibration contracts`.

## Batch 1 — Capture and resilient uploads

- Capture three-to-five JPEG frames from the existing live camera preview.
- Calculate checksums, perform returned-header uploads, and retain per-frame
  state for retry/expiry recovery.
- Owner: frontend media boundary.
- Validate: upload state tests and browser-compatible capture tests.
- Commit: `feat(calibration): capture and upload court frames`.

## Batch 2 — Landmark seeding

- Build the shared A–D reference diagram, accessible marker editor, outside-
  frame marker support, line-intersection helper, and defined substitute set.
- Owner: calibration interaction.
- Validate: marker state and keyboard interaction tests.
- Commit: `feat(calibration): add court landmark editor`.

## Batch 3 — Solve and safety review

- Submit a solve, handle typed recovery, render all raw-pixel wireframe lines,
  and display quality, stability, frame, and resolution diagnostics.
- Owner: calibration review.
- Validate: adapter and review-state integration tests.
- Commit: `feat(calibration): review solved court geometry`.

## Batch 4 — Readiness and monitoring eligibility

- Replace the simulated normal calibration placeholder with both-camera and
  rig-level eligibility rules; preserve the isolated demo behavior.
- Owner: workflow integration.
- Validate: readiness/live navigation integration and accessibility tests.
- Commit: `feat(calibration): gate official monitoring on court calibration`.

## Batch 5 — Acceptance and closeout

- Execute the calibration acceptance checklist, update canonical page/workflow
  documentation, archive the approved specification, and remove this plan.
- Owner: frontend integration.
- Validate: full local quality suite plus recorded manual acceptance evidence.
- Commit: `docs(calibration): record integration acceptance`.
