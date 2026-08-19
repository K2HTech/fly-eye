# Dependency management

Fly Eye uses [uv](https://docs.astral.sh/uv/) to manage Python versions,
dependencies, virtual environments, and the project lockfile.

## Python version

The project uses stable CPython 3.14. The `.python-version` file lets uv select
or install the correct interpreter automatically. The supported range is kept to
the Python 3.14 release line in `pyproject.toml`.

## Dependency sets

Dependencies shared by every component belong in the base `dependencies` list.
Component-specific dependencies are isolated as optional extras:

- `desktop` contains PySide6 and must not include ML dependencies.
- `ml` contains CPU-only PyTorch and must not include desktop dependencies.

The CPU-only PyTorch package is resolved from the official PyTorch CPU index.
The index is explicit, so unrelated packages continue to come from PyPI.

## Create an environment

From the repository root, choose only the environment needed for the work:

```bash
# Core and base dependencies only
uv sync --frozen

# Core plus the desktop application
uv sync --frozen --extra desktop

# Core plus machine-learning tooling
uv sync --frozen --extra ml
```

Running `uv sync` without `--frozen` may update an outdated lockfile. Use
`--frozen` during normal development and in continuous integration so the
resolved versions remain unchanged.

## Change dependencies

Use uv rather than editing the lockfile manually:

```bash
# Add a shared runtime dependency
uv add <package>

# Add a desktop-only dependency
uv add --optional desktop <package>

# Add an ML-only dependency
uv add --optional ml <package>

# Refresh all permitted dependency versions
uv lock --upgrade
```

Commit `pyproject.toml` and `uv.lock` together whenever dependencies change.
Check that the lockfile matches the project metadata before committing:

```bash
uv lock --check
```
