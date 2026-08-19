import QtQuick
import QtQuick.Layouts
import "." as FlyEye

// Compact top bar for the decision screen.  It deliberately owns only the
// decision context; the host screen remains responsible for navigation and
// match state.
Rectangle {
    id: root
    objectName: "decisionHeader"

    property string modeLabel: "THE CALL — COURT 2 · GAME 3 · 21–18"
    property int confidencePercent: 96
    property string confidenceLabel: "CONFIDENCE " + root.confidencePercent + "%"

    implicitWidth: 1000
    implicitHeight: 62
    color: FlyEye.Theme.surface
    border.width: 1
    border.color: FlyEye.Theme.border

    RowLayout {
        anchors.fill: parent
        anchors.leftMargin: FlyEye.Theme.space4
        anchors.rightMargin: FlyEye.Theme.space4
        spacing: FlyEye.Theme.space4

        Row {
            objectName: "brand"
            spacing: 7
            Layout.alignment: Qt.AlignVCenter
            Layout.minimumWidth: implicitWidth

            Text {
                objectName: "opticalMark"
                text: "◎"
                color: FlyEye.Theme.amber
                font.family: FlyEye.Theme.bodyFont
                font.pixelSize: 24
                anchors.verticalCenter: parent.verticalCenter
            }

            Text {
                objectName: "brandName"
                text: "FLY EYE"
                color: FlyEye.Theme.text
                font.family: FlyEye.Theme.displayFont
                font.pixelSize: 20
                font.bold: true
                font.letterSpacing: 2.0
                renderType: Text.NativeRendering
                anchors.verticalCenter: parent.verticalCenter
            }
        }

        Text {
            id: modeText
            objectName: "modeLabel"
            text: root.modeLabel
            color: FlyEye.Theme.amber
            font.family: FlyEye.Theme.displayFont
            font.pixelSize: 15
            font.bold: true
            font.letterSpacing: 1.8
            elide: Text.ElideRight
            horizontalAlignment: Text.AlignHCenter
            verticalAlignment: Text.AlignVCenter
            Layout.fillWidth: true
            Layout.minimumWidth: 120
            Layout.alignment: Qt.AlignVCenter
        }

        HealthChip {
            id: confidenceChip
            objectName: "confidenceChip"
            label: root.confidenceLabel
            showIndicator: false
            Layout.alignment: Qt.AlignVCenter
        }
    }
}
