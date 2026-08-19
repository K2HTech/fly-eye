import QtQuick
import QtQuick.Layouts
import "." as FlyEye

// Header for the paused, two-camera clip review surface.  The frame number is
// deliberately a property: the camera cards and the shared transport can bind
// to the same value without this component knowing about either one.
Rectangle {
    id: root

    property int frameNumber: 1284
    property string modeLabel: "CLIP REVIEW — MARK THE MOMENT THE SHUTTLE LANDS"
    property string syncLabel: "SYNC ±1 FRAME"

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
            id: syncChip
            objectName: "syncChip"
            label: root.syncLabel
            indicatorColor: FlyEye.Theme.amber
            labelColor: FlyEye.Theme.amber
            chipColor: "#241B0C"
            borderColor: "#4E3A16"
            showIndicator: false
            Layout.alignment: Qt.AlignVCenter
        }

        Text {
            id: frameText
            objectName: "frameNumber"
            text: "frame " + root.frameNumber
            color: FlyEye.Theme.textMuted
            font.family: FlyEye.Theme.monoFont
            font.pixelSize: 13
            Layout.alignment: Qt.AlignVCenter
            Layout.minimumWidth: implicitWidth
        }
    }
}
