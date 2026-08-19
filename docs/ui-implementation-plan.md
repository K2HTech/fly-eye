# Fly Eye desktop UI implementation plan

The desktop client is a PySide6/QML application targeting macOS. The first
phase implements the operator UI with deterministic simulated data; camera,
machine-learning, and clip-writing integrations are intentionally deferred.
The [archived browser mockup](mockups/fly-eye-desktop.html) is the visual
reference, while the runtime app omits the mockup header, numbered screen tabs,
and explanatory notes.

## Batch 1 — Desktop foundation

- Establish the QML application entry point and bootstrap.
- Add the resizable 1440×900 window with a 1100×700 minimum usable size.
- Bundle Saira Condensed and IBM Plex fonts with their licenses.
- Add shared colors, typography, spacing, and reusable primitives.
- Add headless bootstrap tests and developer run/test tasks.

## Batch 2 — Live monitor

- Implement the Fly Eye top bar, scoreboard, camera health, and calibration indicators.
- Add two simulated camera cards and the rolling 30-second buffer visualization.
- Add the “Review last rally” action and F1 shortcut.

## Batch 3 — Clip review

- Implement synchronized simulated camera views and the clip/shuttle inspector.
- Add automatic/manual landing-frame selection, scrubber, playback controls,
  speed display, and keyboard frame navigation.
- Add simulated reconstruction progress and the “Get the call” transition.

## Batch 4 — Decision screen

- Implement the IN/OUT verdict, supporting measurements, confidence state, and
  top-down reconstruction graphic.
- Add simulated “show,” “run again,” “save,” and escape/back-to-live actions.
- Verify the complete simulated operator workflow.

## Batch 5 — macOS and UI quality

- Review responsive behavior, Retina scaling, keyboard focus, and accessibility.
- Add reduced-motion behavior and clean up QML warnings.
- Add macOS CI smoke coverage when the project CI setup is approved.
- Finalize user and developer documentation.

## Approval gate

Each batch is a separately reviewable change and receives its own commit. Work
on the next batch starts only after the user explicitly approves the previous
batch. A commit is created after checks pass; pushing it to a remote requires
a separate explicit approval from the user.
