"""Tests for repository-wide development invariants."""

from __future__ import annotations

import subprocess
import sys
import tomllib
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
MAX_REGULAR_FILE_SIZE = 10 * 1024 * 1024
LFS_POINTER_PREFIX = b"version https://git-lfs.github.com/spec/v1\n"


def normalize_package_name(requirement: str) -> str:
    name = requirement.split(";", maxsplit=1)[0]
    for separator in ("<", ">", "=", "!", "~", "[", " "):
        name = name.split(separator, maxsplit=1)[0]
    return name.strip().lower().replace("_", "-").replace(".", "-")


def project_metadata() -> dict[str, object]:
    with (PROJECT_ROOT / "pyproject.toml").open("rb") as pyproject_file:
        return tomllib.load(pyproject_file)


def repository_files() -> list[Path]:
    result = subprocess.run(
        ["git", "ls-files", "-z", "--cached", "--others", "--exclude-standard"],
        cwd=PROJECT_ROOT,
        check=True,
        capture_output=True,
    )
    return [PROJECT_ROOT / path.decode() for path in result.stdout.split(b"\0") if path]


def uses_git_lfs(path: Path) -> bool:
    relative_path = path.relative_to(PROJECT_ROOT)
    result = subprocess.run(
        ["git", "check-attr", "filter", "--", str(relative_path)],
        cwd=PROJECT_ROOT,
        check=True,
        capture_output=True,
        text=True,
    )
    return result.stdout.rstrip().endswith(": lfs")


def test_python_version_is_3_14() -> None:
    assert sys.version_info[:2] == (3, 14)


def test_desktop_and_ml_dependencies_are_separate() -> None:
    optional = project_metadata()["project"]["optional-dependencies"]  # type: ignore[index]
    desktop = {normalize_package_name(item) for item in optional["desktop"]}
    ml = {normalize_package_name(item) for item in optional["ml"]}

    assert "pyside6" in desktop
    assert "torch" not in desktop
    assert "torch" in ml
    assert "pyside6" not in ml
    assert desktop.isdisjoint(ml)


def test_large_repository_files_use_git_lfs() -> None:
    violations: list[str] = []

    for path in repository_files():
        if not path.is_file() or path.stat().st_size <= MAX_REGULAR_FILE_SIZE:
            continue
        if path.read_bytes().startswith(LFS_POINTER_PREFIX) or uses_git_lfs(path):
            continue
        violations.append(str(path.relative_to(PROJECT_ROOT)))

    assert not violations, "files larger than 10 MiB must use Git LFS:\n" + "\n".join(violations)
