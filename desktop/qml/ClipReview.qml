import QtQuick
import QtQuick.Layouts
import "." as FlyEye

Rectangle {
    id: root

    signal backRequested()
    signal decisionRequested()

    color: FlyEye.Theme.background
    radius: 14
    border.width: 1
    border.color: FlyEye.Theme.border
    clip: true

    ColumnLayout {
        anchors.fill: parent
        spacing: 0

        FlyEye.ClipReviewHeader {
            Layout.fillWidth: true
            Layout.preferredHeight: 64
            frameNumber: transport.currentFrame
        }

        RowLayout {
            Layout.fillWidth: true
            Layout.fillHeight: true
            Layout.margins: 14
            spacing: 12

            FlyEye.ClipCameraGrid {
                objectName: "clipCameraGrid"
                Layout.fillWidth: true
                Layout.fillHeight: true
                frameNumber: transport.currentFrame
            }

            FlyEye.ClipInspector {
                id: inspector
                objectName: "clipInspector"
                Layout.preferredWidth: 260
                Layout.fillHeight: true
                landingFrame: transport.landingFrame

                onReconstructionRequested: transport.pause()
                onReconstructionCompleted: root.decisionRequested()
            }
        }

        Rectangle {
            Layout.fillWidth: true
            Layout.preferredHeight: 124
            color: FlyEye.Theme.surface
            border.width: 1
            border.color: FlyEye.Theme.border

            FlyEye.ReviewTransport {
                id: transport
                objectName: "reviewTransport"
                anchors.fill: parent
                anchors.margins: 14
            }
        }
    }

    Shortcut {
        sequence: "Escape"
        enabled: root.visible && root.enabled
        onActivated: root.backRequested()
    }
}
