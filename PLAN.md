# Fly Eye Pre-Match Experience Implementation Plan

## Working Agreement

- Work proceeds one batch at a time.
- Each batch is independently reviewable and receives its own conventional
  commit after approval.
- The next batch does not start until the previous batch is approved.
- Nothing is pushed until explicit approval is given immediately before the
  push.
- Existing unrelated work, including the untracked personal React guide, is not
  included in these commits.
- Lower-cost sub-agents may implement or review bounded tasks. The lead agent
  owns architecture, integration, validation, and the final result.

## Batch 0: Specification and Plan

### Scope

- Agree on the product journey and UI-only demo boundary.
- Add `SPEC.md` as the behavioral and integration contract.
- Add `PLAN.md` as the implementation sequence.

### Review focus

- Are all required screens and transitions represented?
- Is simulated authentication described honestly and safely?
- Is the future backend boundary strong enough?
- Are implementation batches small enough to review?

### Completion gate

- Product owner approves both documents.
- Commit: `docs: define pre-match experience`

## Batch 1: Routing Shell

### Scope

- Add React Router with hash-based routing.
- Introduce route constants, fallback routes, and protected-route behavior.
- Add an explicit session-restoration loading state.
- Move live, review, and decision into match-aware route placeholders without
  changing their internal UI behavior.
- Replace the development `?screen=` shortcut with hash-route test utilities.
- Add focused routing, guard, reload, and regression tests.

### Non-goals

- No storage adapters, finished onboarding pages, or match forms.
- No backend or real hardware calls.

### Review focus

- Route transitions, unknown-route behavior, and guards
- No protected-content flash during session restoration
- Existing workflow regression risk
- Hash-route behavior in browser and Tauri environments

### Completion gate

- Routing tests and all pre-existing checks pass.
- Commit: `feat(app): establish application routing`

## Batch 2: Domain Services and Local Persistence

### Scope

- Define operator, session, match, calibration, and readiness domain models.
- Define backend-replaceable auth, match, and readiness service contracts.
- Add a single application composition layer.
- Implement versioned local-storage adapters with safe parsing and failure
  handling.
- Add session and match providers/hooks that consume service contracts.
- Enforce valid match-status transitions.
- Add adapter, schema-version, corrupt-data, status-transition, and provider
  tests.

### Non-goals

- No production authentication or page designs.
- No direct local-storage access from route/page components.

### Review focus

- Domain model and future backend mapping
- Service boundaries and adapter replaceability
- Recovery from missing, corrupt, and incompatible storage
- Proof that credentials and secrets never enter persisted objects

### Completion gate

- Local services restore non-secret demo data safely after reload.
- Commit: `feat(app): add local demo data services`

## Batch 3: Welcome and Demo Authentication

### Scope

- Build the FLY EYE welcome page.
- Build registration and sign-in pages.
- Add accessible client-side validation and error states.
- Add "Continue as demo."
- Implement simulated session behavior through `AuthService`.
- Warn users not to enter a password they use elsewhere.
- Ensure password fields are discarded and never persisted.
- Add responsive styling consistent with the operator console.
- Add unit, interaction, navigation, persistence-safety, and accessibility
  tests.

### Non-goals

- No remote account creation, email verification, password reset, OAuth, or
  production credential handling.

### Review focus

- Clarity of entry choices and demo status
- Honesty and prominence of prototype-auth messaging
- Keyboard/focus behavior
- Form validation quality
- Visual consistency

### Completion gate

- A user can register, sign in, sign out, and enter demo mode locally without
  any password or secret reaching storage.
- Commit: `feat(auth): add demo onboarding flow`

## Batch 4: Match Dashboard

### Scope

- Build the authenticated dashboard shell.
- Show the realistic first-run empty state.
- Add the primary "Create match" action.
- Display locally created standalone matches with status and timestamps.
- Add resume behavior based on match status.
- Add operator/demo identity and sign-out controls.
- Support development fixtures only through explicit test/dev utilities.
- Add dashboard and accessibility tests.

### Non-goals

- No tournament dashboard, filtering, cloud synchronization, or destructive
  match management unless separately approved.

### Review focus

- Empty-state usefulness
- Match-card information hierarchy
- Resume destination correctness
- Clear primary action and demo identity

### Completion gate

- Empty and populated dashboard states are tested and usable.
- Commit: `feat(matches): add operator match dashboard`

## Batch 5: Create-Match Wizard

### Scope

- Build match details and participants form sections.
- Support singles and doubles with the correct number of player fields.
- Add the default best-of-three, 21-point match format.
- Add accessible validation, cancel, and submission behavior.
- Persist a successfully created draft through `MatchRepository`.
- Navigate the new match to hardware readiness.
- Add form, repository-integration, and accessibility tests.

### Non-goals

- No tournament brackets, schedules, venues, officials, rosters, or custom
  scoring engine.

### Review focus

- Data model suitability for future backend mapping
- Singles/doubles transitions and retained values
- Validation and recovery from errors
- Form density at 1100 x 700 and 1440 x 900

### Completion gate

- Standalone singles and doubles matches can be created, persisted, and
  resumed.
- Commit: `feat(matches): add match creation workflow`

## Batch 6: Simulated Hardware Readiness

### Scope

- Build the match readiness screen.
- Simulate Camera A and Camera B connection and health states.
- Simulate selection of a known calibration profile.
- Identify all simulated states with visible text.
- Derive overall readiness and guard "Start monitoring."
- Persist readiness and valid draft-to-ready status transitions.
- Add readiness, transition, and accessibility tests.

### Non-goals

- No camera SDK, video transport, device permissions, real calibration, or
  backend calls.
- No changes to the internal live-monitor workflow yet.

### Review focus

- Readiness gating and incomplete-state explanations
- Clear simulated-state labeling
- Camera error/recovery states
- Calibration selection behavior

### Completion gate

- A match can reach ready status only after all simulated checks pass.
- Commit: `feat(setup): add simulated hardware readiness`

## Batch 7: Match-Aware Monitor Integration

### Scope

- Feed match event, court, participants, and format into the live monitor.
- Start monitoring through a valid ready-to-live transition.
- Route live -> review -> decision using the active match ID.
- Display demo status throughout the active workflow when applicable.
- Add deliberate navigation back to the dashboard.
- Handle missing match IDs with an explanatory redirect.
- Add cross-screen workflow and regression tests.

### Non-goals

- No real camera frames, backend calls, or redesign of approved core screens.

### Review focus

- Correct match context across all operator screens
- Valid status transitions
- Dashboard exit and resume behavior
- No regression in existing monitoring controls

### Completion gate

- A locally created match completes the entire demo journey from dashboard to
  decision.
- Commit: `feat(workflow): connect matches to monitoring`

## Batch 8: Delivery Hardening

### Scope

- Verify restart/reload restoration across supported states.
- Audit route guards, keyboard flow, focus management, and layouts at the
  configured 1100 x 700 minimum and 1440 x 900 default.
- Complete automated accessibility coverage for all new pages.
- Exercise unknown routes, missing records, and storage failure messages across
  the integrated app.
- Remove incidental duplication and finalize internal documentation.
- Run the complete local CI-equivalent validation suite.

### Review focus

- End-to-end journey consistency
- Failure and recovery behavior
- Cross-platform-safe browser/Tauri behavior
- Test quality and maintainability
- No persisted credentials or secrets

### Completion gate

- Tests, accessibility checks, formatting, linting, type checking, production
  build, dependency audit, and applicable Rust/Tauri checks pass.
- Commit: `test(app): harden pre-match experience`

## Future Backend Integration

When the backend contract is available, plan a separate feature with its own
specification. Expected work includes:

1. Define API DTOs and map them to the existing domain models.
2. Replace local auth and match adapters at the composition boundary.
3. Define secure token handling appropriate for Tauri; never move credentials
   into local storage.
4. Add loading, offline, retry, conflict, and authorization states.
5. Migrate or reconcile locally created demo records deliberately.
6. Add contract and integration tests against a controlled backend environment.

Tournament support should also be specified separately because it introduces a
new aggregate—tournament, participants, courts, schedule, bracket, and many
matches—rather than merely adding fields to the current match form.
