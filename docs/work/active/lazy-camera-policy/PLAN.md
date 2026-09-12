# Lazy Camera Provisioning and Environment Policy Plan

Status: Batch 2 complete — Closeout ready

## Batch 1 — Provision only the selected role

- Replace readiness-load preparation with validated listing of existing camera
  records.
- Expose an idempotent role-specific provisioning operation through the camera
  registry service contract.
- Create or reuse only the chosen role immediately before beginning pairing.
- Add focused registry and readiness coverage.
- Commit: `feat(cameras): provision roles on demand`.

## Batch 2 — Apply monitor policy by build environment

- Derive development versus production monitor requirements from Vite mode.
- Apply the same policy to readiness entry and direct live-route protection.
- Add focused route/readiness coverage for one-stream development entry and
  strict production behavior.
- Commit: `feat(readiness): allow development camera monitoring`.

## Batch 3 — Closeout

- Update durable readiness and architecture documentation, archive the
  specification, and remove this plan according to the work-document lifecycle.
- Commit: `docs(cameras): record lazy provisioning policy`.
