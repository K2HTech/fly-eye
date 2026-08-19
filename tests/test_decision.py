"""Headless interaction tests for the simulated decision actions."""

from __future__ import annotations

import os
from pathlib import Path

import pytest

os.environ.setdefault("QT_QPA_PLATFORM", "offscreen")
os.environ.setdefault("QT_QUICK_BACKEND", "software")

pytest.importorskip("PySide6")

from PySide6.QtCore import QMetaObject, QObject, QUrl  # noqa: E402
from PySide6.QtGui import QGuiApplication  # noqa: E402
from PySide6.QtQml import QQmlComponent, QQmlEngine  # noqa: E402
from PySide6.QtTest import QSignalSpy  # noqa: E402

QML_ROOT = Path(__file__).resolve().parents[1] / "desktop" / "qml"


@pytest.fixture
def qgui_application() -> QGuiApplication:
    application = QGuiApplication.instance()
    if application is None:
        application = QGuiApplication([])
    return application


def _signal_spy(control: QObject, signature: str) -> QSignalSpy:
    signal_index = control.metaObject().indexOfSignal(signature)
    assert signal_index >= 0
    return QSignalSpy(control, control.metaObject().method(signal_index))


def test_decision_actions_emit_signals_and_simulate_status(
    qgui_application: QGuiApplication,
) -> None:
    engine = QQmlEngine()
    component = QQmlComponent(engine, QUrl.fromLocalFile(str(QML_ROOT / "DecisionActions.qml")))
    assert component.status() == QQmlComponent.Ready, component.errorString()
    actions = component.create()
    assert actions is not None, component.errorString()

    for button_name, signature, expected_status in (
        ("showButton", "showRequested()", "COURT SCREEN PREVIEW READY"),
        ("saveButton", "saveRequested()", "CLIP SAVE SIMULATED"),
        ("retryButton", "retryRequested()", ""),
        ("backButton", "backRequested()", ""),
    ):
        signal_spy = _signal_spy(actions, signature)
        button = actions.findChild(QObject, button_name)
        assert button is not None
        assert QMetaObject.invokeMethod(button, "click")
        qgui_application.processEvents()
        assert signal_spy.count() == 1
        assert actions.property("statusMessage") == expected_status
