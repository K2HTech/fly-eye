"""Tests for dependency direction and core-library isolation."""

from __future__ import annotations

import ast
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
CORE_ROOT = PROJECT_ROOT / "core"

FORBIDDEN_CORE_IMPORTS = {
    "PySide6",
    "aiohttp",
    "calib",
    "desktop",
    "ftplib",
    "http",
    "httpx",
    "ml",
    "requests",
    "smtplib",
    "socket",
    "urllib",
    "websockets",
}


def imported_roots(path: Path) -> set[str]:
    tree = ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
    imports: set[str] = set()

    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            imports.update(alias.name.partition(".")[0] for alias in node.names)
        elif isinstance(node, ast.ImportFrom) and node.module:
            imports.add(node.module.partition(".")[0])

    return imports


def test_core_has_no_ui_network_or_upper_layer_imports() -> None:
    violations: list[str] = []

    for path in sorted(CORE_ROOT.rglob("*.py")):
        forbidden = imported_roots(path) & FORBIDDEN_CORE_IMPORTS
        if forbidden:
            relative_path = path.relative_to(PROJECT_ROOT)
            violations.append(f"{relative_path}: {', '.join(sorted(forbidden))}")

    assert not violations, "core contains forbidden imports:\n" + "\n".join(violations)
