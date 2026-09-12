# Real Rally Analysis Validation

Status: Required manual release validation

This checklist validates the external boundaries that unit tests cannot prove:
a real browser recorder, paired camera stream, backend API, private object
storage, and running engine worker. It is not a substitute for the automated
quality suite.

## Preconditions

- Use a normal signed-in account, not the anonymous demo.
- Pair one camera in development or both cameras for production testing.
- Complete a current eligible calibration for every camera that will be
  submitted.
- Confirm the backend clip API, object storage, analysis worker, and overlay
  endpoints are reachable from the browser.

## Required evidence

1. Monitor an active stream for more than 30 seconds. Confirm review creates a
   clip whose declared and accepted duration is no more than 12 seconds.
2. Request **Review last rally** and verify the active live preview continues
   while the review page shows backend `queued` or `running` progress.
3. Confirm the browser recorder uses an MP4/H.264-supported format. If it is
   unsupported, confirm review fails clearly before a clip declaration or
   upload is attempted.
4. Confirm the backend receives only active, calibrated camera assets and the
   declared byte size, checksum, timestamps, MIME type, codec, FPS, and frame
   count match the uploaded media.
5. Confirm direct uploads use only backend-supplied headers and no bearer token
   is sent to object storage. Inspect browser logs, route state, and storage to
   confirm that neither tokens nor presigned URLs persist.
6. Confirm polling reaches a real `done` result. Verify the displayed verdict,
   confidence, reason, diagnostics, and top-down overlay match the backend
   response without frontend substitution.
7. Exercise a terminal backend failure and confirm it offers recovery to live
   monitoring without presenting a verdict.
8. Exercise a successful `INCONCLUSIVE` response and confirm its backend reason
   is visible while the UI states that the umpire decides manually.
9. Disconnect or sign out during capture/review and confirm browser media,
   recorder resources, and temporary URLs are released. No rally media survives
   a refresh or later sign-in.

Record browser/version, operating system, camera count, camera resolution and
FPS, backend/engine versions, network topology, result IDs, elapsed times, and
any exception logs with the release evidence.
