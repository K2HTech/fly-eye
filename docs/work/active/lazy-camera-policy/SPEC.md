# Lazy Camera Provisioning and Environment Policy Specification

Status: Approved — Batch 1 ready

## Outcome

Camera records are created only when an operator begins pairing that role, not
when readiness first loads. Development can open the normal monitoring screen
with one decoded camera stream for rapid camera or prerecorded-video testing;
production preserves its strict two-camera safety gate.

## Operator behavior

1. Opening normal hardware readiness shows left and right camera roles whether
   or not either backend camera record exists. It does not create either record.
2. Selecting **Pair camera** for a role creates or reuses only that role's
   backend device record, then creates its QR pairing session.
3. A provisioned record remains associated with its role across QR retries. A
   record alone is not evidence that a phone is connected or that monitoring is
   safe.
4. In development, the normal **Start monitoring** action and direct live URL
   open when at least one decoded WebRTC camera stream is available. Calibration
   is not required for this development-only monitor entry.
5. In production, monitoring requires exactly the supported two roles, a live
   decoded stream for both roles, and a current safe calibration for both.
6. A production environment must never accept the development exception. The
   backend remains the future authoritative enforcement point for official
   monitoring and decisions.

## Constraints

- A camera record is provisioned immediately before its pairing session because
  the current pairing endpoint requires `cameraId`.
- Existing backend records are validated by role and compatibility. Duplicate,
  unsupported, or incompatible records fail closed.
- The development policy derives from the Vite build mode; it is not a
  user-editable browser setting or a production override.
- The frontend policy is a presentation gate only. Backend production
  enforcement is an external dependency and must not trust frontend behavior.

## Acceptance criteria

- Loading readiness without pairing makes no camera-creation request.
- Pairing the left role creates only the left record; right remains unregistered
  until its own pairing action.
- In development, one decoded stream opens live monitor even without
  calibration.
- In production, a direct live URL returns to readiness unless both registered
  roles have decoded streams and current safe calibration.
