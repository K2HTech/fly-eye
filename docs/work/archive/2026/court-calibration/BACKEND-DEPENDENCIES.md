# Court Calibration — Backend and Engine Dependencies

Status: Coordinated externally; frontend work must preserve these boundaries.

The engine integration guide defines the operator experience and the existing
calibration endpoints. The following additions remain owned by backend or
engine teammates; React must not emulate them as durable truth.

1. Match creation must persist one venue-based **End A** label. It establishes
   the match-wide court frame and must be immutable while the match is active.
2. `GET /config` must expose `resolutionWarnCmPerPx` and
   `resolutionUnusableCmPerPx`.
3. Analysis eligibility must use worst boundary-line quality rather than mean
   reprojection error.
4. Backend must reject clip declaration and analysis when a current calibration
   is poor, with a typed `CALIBRATION_UNUSABLE` error.
5. `POST /cameras/{id}/calibration` needs `clientRequestId` idempotency for a
   safe retry after an unknown network outcome.

Until those changes are available, React may present the calibration flow and
locally block onward official-monitoring navigation for unsafe results. It must
not claim that a client-only guard protects every backend client.

Canonical implementation guidance:
[engine calibration screen](../../../../../fly-eye-engine/docs/integration/calibration-screen.md).
