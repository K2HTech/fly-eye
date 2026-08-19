import QtQuick
import QtQuick.Layouts
import "." as FlyEye

Rectangle {
    id: root

    signal reviewRequested()

    color: FlyEye.Theme.background
    radius: 14
    border.width: 1
    border.color: FlyEye.Theme.border
    clip: true

    ColumnLayout {
        anchors.fill: parent
        spacing: 0

        FlyEye.MatchHeader {
            Layout.fillWidth: true
            Layout.preferredHeight: 64
        }

        RowLayout {
            Layout.fillWidth: true
            Layout.fillHeight: true
            Layout.topMargin: 14
            Layout.leftMargin: 14
            Layout.rightMargin: 14
            spacing: 12

            FlyEye.CameraFeed {
                objectName: "cameraA"
                Layout.fillWidth: true
                Layout.fillHeight: true
                cameraTitle: "Cam A — sideline"
                cameraVariant: "sideline"
                latency: "4.2 ms"
            }

            FlyEye.CameraFeed {
                objectName: "cameraB"
                Layout.fillWidth: true
                Layout.fillHeight: true
                cameraTitle: "Cam B — baseline"
                cameraVariant: "baseline"
                latency: "4.4 ms"
            }
        }

        RowLayout {
            Layout.fillWidth: true
            Layout.preferredHeight: 106
            Layout.leftMargin: 14
            Layout.rightMargin: 14
            Layout.bottomMargin: 16
            Layout.topMargin: 12
            spacing: 16

            FlyEye.RollingBuffer {
                Layout.fillWidth: true
                Layout.alignment: Qt.AlignBottom
            }

            FlyEye.ReviewButton {
                objectName: "reviewButton"
                Layout.alignment: Qt.AlignBottom
                onReviewRequested: root.reviewRequested()
            }
        }
    }
}
