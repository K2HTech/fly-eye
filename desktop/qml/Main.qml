import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import "." as FlyEye

ApplicationWindow {
    id: window

    visible: true
    width: 1440
    height: 900
    minimumWidth: 1100
    minimumHeight: 700
    title: "FLY EYE"
    color: FlyEye.Theme.background

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: FlyEye.Theme.space6
        spacing: FlyEye.Theme.space5

        RowLayout {
            Layout.fillWidth: true
            spacing: FlyEye.Theme.space4

            FlyEye.BrandLabel { }

            Item { Layout.fillWidth: true }

            FlyEye.StatusChip {
                label: "SYSTEM READY"
            }
        }

        Rectangle {
            Layout.fillWidth: true
            height: 1
            color: FlyEye.Theme.border
        }

        FlyEye.SurfacePanel {
            Layout.fillWidth: true
            Layout.fillHeight: true
            panelColor: FlyEye.Theme.surface

            ColumnLayout {
                anchors.centerIn: parent
                spacing: FlyEye.Theme.space3

                Text {
                    Layout.alignment: Qt.AlignHCenter
                    text: "OPERATOR CONSOLE"
                    color: FlyEye.Theme.textMuted
                    font.family: FlyEye.Theme.monoFont
                    font.pixelSize: 11
                    font.bold: true
                    font.letterSpacing: 2
                }

                Text {
                    Layout.alignment: Qt.AlignHCenter
                    text: "Live review workspace"
                    color: FlyEye.Theme.text
                    font.family: FlyEye.Theme.displayFont
                    font.pixelSize: 34
                    font.bold: true
                }

                Text {
                    Layout.alignment: Qt.AlignHCenter
                    text: "Camera and decision workflows will appear here."
                    color: FlyEye.Theme.textFaint
                    font.family: FlyEye.Theme.bodyFont
                    font.pixelSize: 14
                }
            }
        }
    }
}
