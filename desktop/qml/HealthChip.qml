import QtQuick

Rectangle {
    id: root

    property string label: "READY"
    property color indicatorColor: Theme.success
    property color labelColor: indicatorColor
    property color chipColor: "#0F2419"
    property color borderColor: "#1D4A34"
    property bool showIndicator: true

    implicitWidth: labelText.implicitWidth + 28
    implicitHeight: 26
    color: chipColor
    radius: height / 2
    border.width: 1
    border.color: borderColor

    Row {
        anchors.centerIn: parent
        spacing: 7

        Rectangle {
            width: 6
            height: 6
            radius: 3
            anchors.verticalCenter: parent.verticalCenter
            color: root.indicatorColor
            visible: root.showIndicator
        }

        Text {
            id: labelText
            text: root.label
            color: root.labelColor
            font.family: Theme.monoFont
            font.pixelSize: 10
            font.bold: true
            font.letterSpacing: 0.6
            verticalAlignment: Text.AlignVCenter
        }
    }
}
