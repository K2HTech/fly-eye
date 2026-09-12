# Real Rally Analysis Plan

Status: Batch 1 complete — Batch 2 ready

## Batch 1 — Backend clip and analysis boundary

- Add runtime-validated service contracts and backend adapters for clip
  declaration, direct-upload completion, analysis submission, polling, and
  result/overlay response shapes.
- Add focused contract and adapter tests, including malformed and terminal
  failure responses.
- Commit: `feat(analysis): add backend clip contracts`.

## Batch 2 — Browser rolling capture

- Add a replaceable browser capture service that checks MP4/H.264 recording
  support, retains 30 seconds in memory per available role, and snapshots the
  final 12 seconds without stopping capture.
- Add focused buffer, timestamp, duration, cleanup, and unsupported-codec
  coverage.
- Commit: `feat(capture): retain rally video buffers`.

## Batch 3 — Submit a real rally clip

- Connect **Review last rally** to the capture snapshot and clip-upload
  workflow for normal live matches.
- Validate current calibration before declaration, use exact upload targets,
  and move to review with an identifiable analysis request.
- Preserve the isolated simulated demo flow.
- Commit: `feat(review): submit rally clips for analysis`.

## Batch 4 — Present backend analysis

- Poll analysis state through the authenticated HTTP client and present queued,
  running, terminal failure, and completed states.
- Replace simulated review/decision evidence with backend result values and
  authorized overlays for real analyses.
- Commit: `feat(decision): show backend rally analysis`.

## Batch 5 — Validation and closeout

- Run the approved real-browser validation against a signed-in account,
  calibrated camera, backend object storage, and real engine worker.
- Update durable product, review, decision, workflow, architecture, and
  quality documentation; archive `SPEC.md` and remove this plan.
- Commit: `docs(analysis): record real rally workflow`.
