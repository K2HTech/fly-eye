# Continuous integration and delivery

Fly Eye uses GitHub Actions for validation and tag-based delivery. The same
checks are exposed locally through [Task](https://taskfile.dev/).

## Local checks

```bash
task format
task lint
task typecheck
task test
task build
task rust:check
task rust:clippy
task audit
task rust:audit
task check
```

`task check` is the recommended command before opening or updating a pull
request. It checks formatting, lint rules, strict TypeScript types, tests, the
production Vite build, Rust formatting, Clippy, compilation, and known npm and
RustSec vulnerabilities. `cargo-audit` must be installed locally for the Rust
dependency audit; `task setup` installs it.

## Continuous integration

CI validates Conventional Commits and runs the locked frontend and Rust checks
on Ubuntu, macOS, and Windows. A separate Ubuntu security job runs npm audit
and cargo-audit; it also runs nightly at 02:17 UTC so newly published
advisories can fail without a source change.

Dependabot checks npm, Cargo, and GitHub Actions dependencies weekly and opens
locked update pull requests for normal review.

Configure the protected-branch rulesets to require `Commit convention`,
`Quality`, and `Dependency vulnerabilities`. `Quality` is a stable aggregate
check that fails when any Ubuntu, macOS, or Windows matrix job fails. Remove the
retired Python dependency checks (`Dependencies (base)`, `Dependencies
(desktop)`, and `Dependencies (ml)`) after the first React/Tauri CI run exposes
the replacement check names in GitHub.

## Vulnerability policy

`npm audit` fails on high or critical findings. Do not suppress an advisory
without documenting its identifier, the reason an upgrade is not yet possible,
the risk and mitigation, an owner, and an expiration date. `cargo audit` fails
on RustSec vulnerability advisories; maintenance and unsoundness warnings from
transitive platform crates remain visible for review during dependency updates.

## Releases

Delivery is triggered by a semantic version tag such as `v0.1.0`. The tag must
match both `package.json` and `src-tauri/tauri.conf.json`. The release workflow
repeats the complete check suite, then packages Linux x64, macOS Apple Silicon,
macOS Intel, and Windows x64 bundles with the official Tauri action. Artifacts
are uploaded to a draft GitHub Release for review before publication.

Native prerequisites follow the [official Tauri v2 prerequisites](https://v2.tauri.app/start/prerequisites/). macOS runners use Xcode tooling;
Windows runners use the preinstalled MSVC/WebView2 environment; Ubuntu runners
install WebKitGTK 4.1, AppIndicator, librsvg, and packaging dependencies.
