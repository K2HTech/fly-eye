"""Headless smoke tests for the live monitor's reusable QML controls."""

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
from PySide6.QtQuick import QQuickItem  # noqa: E402

PROJECT_ROOT = Path(__file__).resolve().parents[1]
QML_ROOT = PROJECT_ROOT / "desktop" / "qml"
_LOADED_COMPONENTS: list[QQmlComponent] = []


@pytest.fixture
def qgui_application() -> QGuiApplication:
    application = QGuiApplication.instance()
    if application is None:
        application = QGuiApplication([])
    return application


@pytest.fixture
def qml_engine(qgui_application: QGuiApplication) -> QQmlEngine:
    engine = QQmlEngine()
    engine.addImportPath(str(QML_ROOT))
    return engine


def load_control(engine: QQmlEngine, name: str):
    component = QQmlComponent(engine, QUrl.fromLocalFile(str(QML_ROOT / name)))
    assert component.status() == QQmlComponent.Ready, component.errorString()
    control = component.create()
    assert control is not None, component.errorString()
    QQmlEngine.setObjectOwnership(control, QQmlEngine.CppOwnership)
    _LOADED_COMPONENTS.append(component)
    return control


def load_review_harness(engine: QQmlEngine):
    """Load the button in a tiny QML harness so its QML signal is observable."""

    component = QQmlComponent(engine)
    component.setData(
        b"""
        import QtQuick
        import QtQuick.Controls
        import "."

        Item {
            id: root
            property int requestCount: 0

            ReviewButton {
                id: button
                objectName: "reviewButton"
            }

            Connections {
                target: button
                function onReviewRequested() { root.requestCount += 1 }
            }
        }
        """,
        QUrl.fromLocalFile(str(QML_ROOT / "LiveMonitorTest.qml")),
    )
    assert component.status() == QQmlComponent.Ready, component.errorString()
    harness = component.create()
    assert harness is not None, component.errorString()
    QQmlEngine.setObjectOwnership(harness, QQmlEngine.CppOwnership)
    _LOADED_COMPONENTS.append(component)
    return harness


def test_rolling_buffer_has_responsive_track_and_rally_markers(
    qml_engine: QQmlEngine,
) -> None:
    buffer = load_control(qml_engine, "RollingBuffer.qml")
    assert isinstance(buffer, QQuickItem)
    buffer.setWidth(640)
    buffer.setHeight(buffer.implicitHeight())

    assert buffer.property("label") == "ROLLING BUFFER — LAST 30 S IS ALWAYS RECORDED"
    rally_spans = buffer.property("rallySpans").toVariant()
    assert len(rally_spans) == 3
    assert buffer.width() == 640
    assert buffer.findChild(QQuickItem, "nowEdge") is not None


def test_review_button_emits_one_signal_for_click(
    qml_engine: QQmlEngine,
) -> None:
    harness = load_review_harness(qml_engine)
    button = harness.findChild(QObject, "reviewButton")
    assert button is not None

    assert QMetaObject.invokeMethod(button, "click")

    assert harness.property("requestCount") == 1
    assert button.property("shortcutSequence") == "F1"
    assert button.property("shortcutLabel") == "F1"
