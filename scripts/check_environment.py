"""Verify that a uv dependency profile contains only its intended extras."""

from __future__ import annotations

import argparse
import importlib.util
import sys

EXPECTED_MODULES = {
    "base": {"PySide6": False, "torch": False},
    "desktop": {"PySide6": True, "torch": False},
    "ml": {"PySide6": False, "torch": True},
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("profile", choices=EXPECTED_MODULES)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    errors: list[str] = []

    if sys.version_info[:2] != (3, 14):
        errors.append(f"expected Python 3.14, found {sys.version.split()[0]}")

    for module, expected in EXPECTED_MODULES[args.profile].items():
        installed = importlib.util.find_spec(module) is not None
        if installed != expected:
            state = "installed" if installed else "absent"
            wanted = "installed" if expected else "absent"
            errors.append(f"{module} is {state}; expected it to be {wanted}")

    if errors:
        for error in errors:
            print(f"error: {error}", file=sys.stderr)
        return 1

    print(f"{args.profile} dependency profile is isolated correctly")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
