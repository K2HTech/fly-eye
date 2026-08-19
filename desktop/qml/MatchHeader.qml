import QtQuick
import QtQuick.Layouts

Rectangle {
    id: root

    // Static values keep the first live-monitor screen deterministic while
    // leaving the header ready for a future match-state model.
    property string courtLabel: "COURT 2"
    property string teamOne: "NGUYEN / TRAN"
    property int teamOneScore: 21
    property int teamTwoScore: 18
    property string teamTwo: "LEE / PARK"
    property string gameLabel: "Game 3"
    property string elapsed: "00:42:17"

    implicitWidth: 1000
    implicitHeight: 62
    color: Theme.surface
    border.color: Theme.border
    border.width: 1

    RowLayout {
        anchors.fill: parent
        anchors.leftMargin: Theme.space4
        anchors.rightMargin: Theme.space4
        spacing: Theme.space4

        Row {
            spacing: 7
            Layout.alignment: Qt.AlignVCenter
            Layout.minimumWidth: implicitWidth

            Text {
                text: "◎"
                color: Theme.amber
                font.family: Theme.bodyFont
                font.pixelSize: 24
                anchors.verticalCenter: parent.verticalCenter
            }

            Text {
                text: "FLY EYE"
                color: Theme.text
                font.family: Theme.displayFont
                font.pixelSize: 20
                font.bold: true
                font.letterSpacing: 2.0
                renderType: Text.NativeRendering
                anchors.verticalCenter: parent.verticalCenter
            }
        }

        RowLayout {
            id: scoreboard
            spacing: Theme.space3
            Layout.fillWidth: true
            Layout.alignment: Qt.AlignVCenter

            Rectangle {
                implicitWidth: courtText.implicitWidth + 18
                implicitHeight: 24
                radius: 4
                color: Theme.panelRaised
                Layout.alignment: Qt.AlignVCenter

                Text {
                    id: courtText
                    anchors.centerIn: parent
                    text: root.courtLabel
                    color: Theme.textMuted
                    font.family: Theme.monoFont
                    font.pixelSize: 11
                    font.bold: true
                    font.letterSpacing: 1.2
                }
            }

            Text {
                text: root.teamOne
                color: Theme.text
                font.family: Theme.displayFont
                font.pixelSize: 17
                font.bold: true
                font.letterSpacing: 0.7
                Layout.alignment: Qt.AlignVCenter
            }

            Text {
                text: root.teamOneScore
                color: Theme.text
                font.family: Theme.monoFont
                font.pixelSize: 19
                font.bold: true
                Layout.alignment: Qt.AlignVCenter
            }

            Text {
                text: "—"
                color: Theme.textMuted
                font.family: Theme.monoFont
                font.pixelSize: 17
                Layout.alignment: Qt.AlignVCenter
            }

            Text {
                text: root.teamTwoScore
                color: Theme.text
                font.family: Theme.monoFont
                font.pixelSize: 19
                font.bold: true
                Layout.alignment: Qt.AlignVCenter
            }

            Text {
                text: root.teamTwo
                color: Theme.text
                font.family: Theme.displayFont
                font.pixelSize: 17
                font.bold: true
                font.letterSpacing: 0.7
                Layout.alignment: Qt.AlignVCenter
            }

            Text {
                text: root.gameLabel
                color: Theme.textMuted
                font.family: Theme.bodyFont
                font.pixelSize: 13
                Layout.alignment: Qt.AlignVCenter
            }
        }

        RowLayout {
            id: health
            spacing: Theme.space2
            Layout.alignment: Qt.AlignVCenter
            Layout.minimumWidth: implicitWidth

            HealthChip {
                label: "CAM A · 120 fps"
                Layout.alignment: Qt.AlignVCenter
            }

            HealthChip {
                label: "CAM B · 120 fps"
                Layout.alignment: Qt.AlignVCenter
            }

            HealthChip {
                label: "CALIBRATED"
                showIndicator: false
                Layout.alignment: Qt.AlignVCenter
            }

            Text {
                text: root.elapsed
                color: Theme.textMuted
                font.family: Theme.monoFont
                font.pixelSize: 13
                Layout.alignment: Qt.AlignVCenter
            }
        }
    }
}
