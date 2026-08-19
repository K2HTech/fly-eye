import QtQuick

Rectangle {
    id: root

    property string label: "READY"
    property color indicatorColor: Theme.success
    property color chipColor: Theme.panelRaised

    implicitWidth: labelText.implicitWidth + 28
    implicitHeight: 28
    color: chipColor
    radius: height / 2
    border.width: 1
    border.color: Theme.border

    Row {
        anchors.centerIn: parent
        spacing: 8

        Rectangle {
            width: 6
            height: 6
            radius: 3
            anchors.verticalCenter: parent.verticalCenter
            color: root.indicatorColor
        }

        Text {
            id: labelText
            text: root.label
            color: Theme.textMuted
            font.family: Theme.monoFont
            font.pixelSize: 10
            font.bold: true
            font.letterSpacing: 0.8
        }
    }
}
