# Continuous integration and delivery

Fly Eye uses GitHub Actions for continuous integration (CI) and tag-based
delivery. The same checks are exposed locally through
[Task](https://taskfile.dev/) so contributors can validate changes before they
push.

## Local prerequisites

Install these two tools:

- [uv](https://docs.astral.sh/uv/getting-started/installation/)
- [Task](https://taskfile.dev/docs/installation/)

Then prepare the complete development environment:

```bash
task setup
```

## Local tasks

List every available command with `task --list`. The common commands are:

```bash
task format          # Apply Ruff formatting
task format:check    # Check formatting without changing files
task lint            # Run Ruff lint rules
task test            # Run pytest
task audit           # Check dependencies for known vulnerabilities
task check           # Run the complete CI-equivalent check set
```

`task check` is the recommended command before opening or updating a pull
request. It verifies the lockfile, formatting, linting, tests, dependency
profiles, architecture rules, large tracked files, and dependency
vulnerabilities.

The profile-specific commands are also available independently:

```bash
task check:base
task check:desktop
task check:ml
```

These tasks intentionally resynchronize `.venv` to the selected profile. Run
`task setup` afterward to restore the complete development environment.

## Continuous integration

The CI workflow runs for pushes and pull requests involving `main` or
`develop`, and it can be started manually. It contains four checks:

1. Commit messages are validated with `.githooks/commit-msg`.
2. Formatting, linting, tests, repository invariants, and lockfile consistency
   are checked with `task check:quality`.
3. Base, desktop, and ML environments are created independently to enforce
   dependency isolation.
4. Every installed dependency is audited for known vulnerabilities.

The vulnerability job also runs nightly at 02:17 UTC, because a new advisory
can affect an unchanged lockfile.

## Vulnerability policy

`pip-audit` checks installed Python distributions against the OSV vulnerability
database. OSV is used because it recognizes the CPU-specific PyTorch build from
the official PyTorch package index. A reported vulnerability fails CI.

Do not suppress an advisory without documenting all of the following in the
pull request that introduces the exception:

- Advisory identifier
- Reason the project cannot upgrade or remove the package immediately
- Risk assessment and temporary mitigation
- Responsible owner
- Expiration date

Dependency auditing detects known Python-package vulnerabilities. It does not
guarantee detection of malicious packages or vulnerabilities in every native
library bundled by a Python distribution.

## Releases

Delivery is triggered by a semantic version tag such as `v0.1.0`. Before
creating the tag, update the `project.version` value in `pyproject.toml`, update
the lockfile, and run `task check`.

The release workflow rejects a tag that does not exactly match the project
version. It then repeats the complete check suite and creates a GitHub Release
with generated notes and source archives. Packaged desktop artifacts will be
added once the application has a packaging workflow.
