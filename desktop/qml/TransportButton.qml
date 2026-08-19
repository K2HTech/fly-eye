import QtQuick
import QtQuick.Controls
import "." as FlyEye

Button {
    id: root

    property string label: "BUTTON"
    property bool emphasized: false
    property string shortcutLabel: ""

    signal actionTriggered()

    implicitWidth: Math.max(72, contentItem.implicitWidth + leftPadding + rightPadding)
    implicitHeight: 36
    leftPadding: 12
    rightPadding: 12
    topPadding: 8
    bottomPadding: 8
    font.family: FlyEye.Theme.monoFont
    font.pixelSize: 11
    font.bold: false

    onClicked: root.actionTriggered()

    contentItem: Row {
        spacing: root.shortcutLabel.length > 0 ? 6 : 0
        anchors.centerIn: parent

        Text {
            text: root.label
            color: root.emphasized ? "#9FC2FF" : "#C7CFDC"
            font: root.font
            verticalAlignment: Text.AlignVCenter
        }

        Text {
            visible: root.shortcutLabel.length > 0
            text: root.shortcutLabel
            color: FlyEye.Theme.textFaint
            font.family: FlyEye.Theme.monoFont
            font.pixelSize: 9
            verticalAlignment: Text.AlignVCenter
        }
    }

    background: Rectangle {
        radius: 6
        color: root.pressed ? FlyEye.Theme.accentMuted
                            : (root.hovered ? FlyEye.Theme.panelRaised : FlyEye.Theme.background)
        border.width: 1
        border.color: root.emphasized ? FlyEye.Theme.accent : FlyEye.Theme.border
    }
}
