# Branching and review strategy

Fly Eye uses `main` as the released branch and `develop` as the integration
branch for the next release. Changes reach either protected branch through a
pull request; contributors do not push directly to them.

## Branch roles

| Branch | Purpose | Normal source |
| --- | --- | --- |
| `main` | Stable, released code | Release PRs from `develop` |
| `develop` | Integrated work for the next release | Feature and fix PRs |
| `feature/<name>` | New functionality | Branched from `develop` |
| `fix/<name>` | Non-urgent defect correction | Branched from `develop` |
| `docs/<name>` | Documentation-only work | Branched from `develop` |
| `chore/<name>` | Maintenance work | Branched from `develop` |
| `hotfix/<name>` | Urgent correction to released code | Branched from `main` |

Use lowercase, hyphen-separated branch names, such as
`feature/camera-calibration` or `fix/empty-video-selection`.

## Develop a change

Start from the latest `develop` branch:

```bash
git switch develop
git pull --ff-only origin develop
git switch -c feature/camera-calibration
```

Make focused commits that follow the
[commit convention](commit-convention.md). Before pushing, run the same checks
used by CI:

```bash
task check
git push -u origin feature/camera-calibration
```

Open a pull request from the topic branch into `develop`. Its title must follow
the Conventional Commit format because feature PRs use **Squash and merge**, and
the title becomes the final commit message on `develop`.

Keep the pull request focused on one task. If `develop` changes while the pull
request is open, update the topic branch and rerun the checks before requesting
another review.

## Review a change

The author must provide the purpose of the change, testing evidence, and any
known limitations. A reviewer checks that:

- The implementation matches the task and avoids unrelated changes.
- Dependency direction and the `core` isolation rules are preserved.
- Tests cover important behavior and failure cases.
- New dependencies are necessary, correctly grouped, and security-audited.
- User data, credentials, and large media files are handled safely.
- The PR title and commits follow the commit convention.
- Every required CI job passes and all review conversations are resolved.

A reviewer selects **Approve** only when the change is ready to merge, or
**Request changes** when a blocking issue remains. The author cannot approve
their own pull request.

Normal changes require at least one approval from someone other than the
author. A maintainer performs the squash merge after approval and deletes the
topic branch.

## Release to main

When `develop` is stable, the release manager updates the version and release
notes on `develop`, regenerates `uv.lock`, and runs `task check`. They then open
a release pull request from `develop` into `main`.

Release PRs should receive two approvals when the team is large enough and must
pass the complete CI suite. A designated maintainer merges the PR with **Create
a merge commit** so the release boundary remains visible in history.

After the merge, the release manager tags the merge commit with the version
from `pyproject.toml`:

```bash
git switch main
git pull --ff-only origin main
git tag v0.2.0
git push origin v0.2.0
```

The tag triggers the release workflow. All release-specific file changes must
be made on `develop` before the release PR, so a routine release does not need a
content sync back to `develop`. If a change is ever made only on `main`, it must
also reach `develop` through a dedicated sync or hotfix-backport PR.

## Hotfix released code

For an urgent production defect, create `hotfix/<name>` from `main`, then open
a reviewed PR back into `main`. After the fix is released, open a second PR that
applies the same change to `develop`; do not allow the branches to keep
different versions of the fix.

## Merge authority

- A maintainer merges approved topic branches into `develop`.
- A release manager or designated maintainer merges `develop` into `main`.
- A maintainer merges reviewed hotfixes into `main` and ensures they are
  applied to `develop`.
- Authors do not approve or merge their own pull requests.

GitHub rulesets should enforce these requirements. On a private repository
owned by an organization using GitHub Free, GitHub stores rulesets but does not
enforce them. Until the organization upgrades, maintainers must apply the same
rules manually and keep write access limited.
