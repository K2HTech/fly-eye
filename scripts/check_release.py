"""Verify that a semantic release tag matches the project version."""

from __future__ import annotations

import argparse
import re
import sys
import tomllib
from pathlib import Path

SEMANTIC_TAG = re.compile(r"^v(?P<version>0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$")
PROJECT_ROOT = Path(__file__).resolve().parents[1]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("tag", help="Release tag, for example v0.1.0")
    return parser.parse_args()


def main() -> int:
    tag = parse_args().tag
    match = SEMANTIC_TAG.fullmatch(tag)
    if match is None:
        print(f"error: {tag!r} is not a semantic version tag such as v0.1.0", file=sys.stderr)
        return 1

    with (PROJECT_ROOT / "pyproject.toml").open("rb") as pyproject_file:
        project_version = tomllib.load(pyproject_file)["project"]["version"]

    expected_tag = f"v{project_version}"
    if tag != expected_tag:
        print(
            f"error: release tag {tag!r} does not match project version {project_version!r}",
            file=sys.stderr,
        )
        return 1

    print(f"release tag {tag} matches the project version")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
