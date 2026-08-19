"""Application bootstrap for the Fly Eye QML desktop client.

The functions in this module intentionally keep filesystem discovery separate
from Qt object creation so they can be exercised without starting a window.
"""

from __future__ import annotations

import sys
from collections.abc import Sequence
from pathlib import Path

from PySide6.QtGui import QFontDatabase, QGuiApplication
from PySide6.QtQml import QQmlApplicationEngine


def application_root() -> Path:
    """Return the directory containing the desktop application package."""

    return Path(__file__).resolve().parent


def fonts_directory() -> Path:
    """Return the bundled font directory."""

    return application_root() / "assets" / "fonts"


def qml_file() -> Path:
    """Return the entry-point QML file used by the desktop application."""

    return application_root() / "qml" / "Main.qml"


def font_files(directory: Path | None = None) -> tuple[Path, ...]:
    """Find bundled TrueType/OpenType files recursively in stable order."""

    root = Path(directory) if directory is not None else fonts_directory()
    if not root.is_dir():
        return ()
    return tuple(
        path
        for path in sorted(root.rglob("*"))
        if path.is_file() and path.suffix.lower() in {".ttf", ".otf"}
    )


def register_fonts(directory: Path | None = None) -> dict[Path, int]:
    """Register bundled fonts and return each file's Qt database identifier.

    A negative identifier means Qt rejected a font.  The mapping is returned
    to make registration observable in tests and by future startup diagnostics.
    """

    return {path: QFontDatabase.addApplicationFont(str(path)) for path in font_files(directory)}


def create_engine(qml_path: Path | None = None) -> QQmlApplicationEngine:
    """Create a QML engine, load the main view, and validate its root object."""

    source = Path(qml_path) if qml_path is not None else qml_file()
    if not source.is_file():
        raise FileNotFoundError(f"Fly Eye QML entry point not found: {source}")

    engine = QQmlApplicationEngine()
    engine.load(str(source))
    if not engine.rootObjects():
        raise RuntimeError(f"Fly Eye QML entry point produced no root objects: {source}")
    return engine


def main(argv: Sequence[str] | None = None) -> int:
    """Start the Fly Eye desktop application and return its Qt exit code."""

    arguments = list(sys.argv if argv is None else argv)
    app = QGuiApplication(arguments)
    app.setOrganizationName("Fly Eye")
    app.setApplicationName("Fly Eye")
    app.setApplicationDisplayName("Fly Eye")
    register_fonts()
    engine = create_engine()
    # Keep the engine alive for the full event loop; otherwise Python may
    # collect it and close the QML window immediately.
    _ = engine
    return app.exec()


__all__ = [
    "application_root",
    "create_engine",
    "font_files",
    "fonts_directory",
    "main",
    "qml_file",
    "register_fonts",
]
