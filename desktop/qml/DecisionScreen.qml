import QtQuick
import QtQuick.Layouts
import "." as FlyEye

Rectangle {
    id: root

    signal retryRequested()
    signal backRequested()

    color: FlyEye.Theme.background
    radius: 14
    border.width: 1
    border.color: FlyEye.Theme.border
    clip: true

    ColumnLayout {
        anchors.fill: parent
        spacing: 0

        FlyEye.DecisionHeader {
            Layout.fillWidth: true
            Layout.preferredHeight: 64
        }

        RowLayout {
            Layout.fillWidth: true
            Layout.fillHeight: true
            Layout.margins: 14
            spacing: 14

            ColumnLayout {
                Layout.minimumWidth: 320
                Layout.preferredWidth: 320
                Layout.maximumWidth: 320
                Layout.fillHeight: true
                spacing: 10

                FlyEye.VerdictCard {
                    objectName: "verdictCard"
                    Layout.fillWidth: true
                    Layout.preferredHeight: 170
                }

                FlyEye.EvidencePanel {
                    objectName: "evidencePanel"
                    Layout.fillWidth: true
                    Layout.preferredHeight: 124
                }

                FlyEye.DecisionActions {
                    id: actions
                    objectName: "decisionActions"
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    onRetryRequested: root.retryRequested()
                    onBackRequested: root.backRequested()
                }
            }

            Rectangle {
                Layout.fillWidth: true
                Layout.fillHeight: true
                radius: 12
                color: FlyEye.Theme.well
                border.width: 1
                border.color: FlyEye.Theme.border

                ColumnLayout {
                    anchors.fill: parent
                    anchors.margins: 14
                    spacing: 8

                    Text {
                        text: "TOP-DOWN RECONSTRUCTION — LANDING ZONE MAGNIFIED 8×"
                        color: FlyEye.Theme.textFaint
                        font.family: FlyEye.Theme.monoFont
                        font.pixelSize: 10
                        font.letterSpacing: 1.4
                        Layout.fillWidth: true
                        elide: Text.ElideRight
                    }

                    FlyEye.ReconstructionView {
                        objectName: "reconstructionView"
                        Layout.fillWidth: true
                        Layout.fillHeight: true
                    }
                }
            }
        }
    }
}
