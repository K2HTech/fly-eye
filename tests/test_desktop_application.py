"""Headless smoke tests for the Fly Eye desktop application bootstrap."""

from __future__ import annotations

import os
import sys
from pathlib import Path

import pytest

# This must be set before importing PySide6/desktop.application.  The test
# suite runs in CI and on developer machines without a window server.
os.environ.setdefault("QT_QPA_PLATFORM", "offscreen")
os.environ.setdefault("QT_QUICK_BACKEND", "software")

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

pytest.importorskip("PySide6")

from PySide6.QtCore import Qt  # noqa: E402
from PySide6.QtGui import QGuiApplication  # noqa: E402
from PySide6.QtQuick import QQuickItem  # noqa: E402
from PySide6.QtTest import QSignalSpy, QTest  # noqa: E402

from desktop.application import create_engine, font_files, qml_file, register_fonts  # noqa: E402


@pytest.fixture
def qgui_application() -> QGuiApplication:
    """Provide one reusable Qt application without starting its event loop."""

    application = QGuiApplication.instance()
    if application is None:
        application = QGuiApplication([])
    return application


def test_qml_entry_point_is_in_the_desktop_package() -> None:
    entry_point = qml_file()

    assert isinstance(entry_point, Path)
    assert entry_point.name == "Main.qml"
    assert entry_point.is_file()


def test_qml_entry_point_loads_a_root_object(qgui_application: QGuiApplication) -> None:
    registered_fonts = register_fonts()
    engine = create_engine()

    assert registered_fonts
    assert all(font_id >= 0 for font_id in registered_fonts.values())
    assert {path.suffix for path in font_files()} == {".ttf"}
    assert engine.rootObjects(), "the desktop QML entry point must create a root object"
    window = engine.rootObjects()[0]
    assert (window.width(), window.height()) == (1440, 900)
    assert (window.minimumWidth(), window.minimumHeight()) == (1100, 700)
    assert window.title() == "FLY EYE"

    # Keep the engine alive for the duration of the assertion and make the
    # relationship to the Qt application explicit for headless test runs.
    assert engine.thread() is qgui_application.thread()


def test_f1_shortcut_requests_live_review(qgui_application: QGuiApplication) -> None:
    engine = create_engine()
    window = engine.rootObjects()[0]
    live_monitor = window.findChild(QQuickItem, "liveMonitor")

    assert live_monitor is not None
    signal_index = live_monitor.metaObject().indexOfSignal("reviewRequested()")
    assert signal_index >= 0
    review_spy = QSignalSpy(live_monitor, live_monitor.metaObject().method(signal_index))

    window.requestActivate()
    qgui_application.processEvents()
    QTest.keyClick(window, Qt.Key.Key_F1)
    qgui_application.processEvents()

    assert review_spy.count() == 1
