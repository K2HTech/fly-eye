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
task audit
task check
```

`task check` is the recommended command before opening or updating a pull
request. It checks formatting, lint rules, strict TypeScript types, tests, the
production Vite build, Rust formatting and compilation, and known npm
vulnerabilities.

## Continuous integration

CI validates Conventional Commits, installs dependencies from the committed
lockfiles, and runs `task check`. The security audit also runs nightly at 02:17
UTC so newly published advisories can fail without a source change.

## Vulnerability policy

`npm audit` fails on high or critical findings. Do not suppress an advisory
without documenting its identifier, the reason an upgrade is not yet possible,
the risk and mitigation, an owner, and an expiration date.

## Releases

Delivery is triggered by a semantic version tag such as `v0.1.0`. The tag must
match both `package.json` and `src-tauri/tauri.conf.json`. The release workflow
repeats the complete check suite and creates a GitHub Release. Native artifacts
will be added with the cross-platform packaging checkpoint.
