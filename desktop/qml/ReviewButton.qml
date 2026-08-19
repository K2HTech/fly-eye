import QtQuick
import QtQuick.Controls

Button {
    id: root

    signal reviewRequested()

    property string label: "REVIEW LAST RALLY"
    property string shortcutSequence: "F1"
    property string shortcutLabel: "F1"

    implicitWidth: contentItem.implicitWidth + leftPadding + rightPadding
    implicitHeight: Math.max(56, contentItem.implicitHeight + topPadding + bottomPadding)
    leftPadding: 24
    rightPadding: 24
    topPadding: 16
    bottomPadding: 16
    font.family: Theme.displayFont
    font.pixelSize: 19
    font.bold: true
    font.letterSpacing: 1.9

    onClicked: root.reviewRequested()

    contentItem: Row {
        spacing: 10
        anchors.centerIn: parent

        Text {
            text: root.label
            color: "#04101F"
            font: root.font
            verticalAlignment: Text.AlignVCenter
        }

        Rectangle {
            anchors.verticalCenter: parent.verticalCenter
            implicitWidth: shortcutText.implicitWidth + 12
            implicitHeight: shortcutText.implicitHeight + 4
            radius: 4
            color: Qt.rgba(0, 0, 0, 0.28)
            border.width: 1
            border.color: Qt.rgba(0, 0, 0, 0.35)

            Text {
                id: shortcutText
                anchors.centerIn: parent
                text: root.shortcutLabel
                color: "#04101F"
                font.family: Theme.monoFont
                font.pixelSize: 10
            }
        }
    }

    background: Rectangle {
        radius: 8
        color: root.hovered ? "#69A0FF" : "#4C8DFF"
        border.width: 1
        border.color: Qt.rgba(0.30, 0.55, 1.0, 0.4)
    }

    Shortcut {
        sequence: root.shortcutSequence
        enabled: root.enabled && root.visible
        onActivated: root.reviewRequested()
    }
}
