import QtQuick
import "." as FlyEye

// Compact key/value row used by the clip and shuttle inspectors.
Item {
    id: root

    property string label: ""
    property string value: ""
    property color labelColor: FlyEye.Theme.textMuted
    property color valueColor: FlyEye.Theme.text
    property bool emphasized: false

    // Friendly aliases keep the component convenient when the text fields are
    // also addressed by a test or a host screen.
    property alias labelText: labelTextItem.text
    property alias valueText: valueTextItem.text

    implicitWidth: 220
    implicitHeight: 24

    Text {
        id: labelTextItem
        objectName: "label"
        anchors.left: parent.left
        anchors.right: valueTextItem.left
        anchors.rightMargin: 10
        anchors.verticalCenter: parent.verticalCenter
        text: root.label
        color: root.labelColor
        font.family: FlyEye.Theme.bodyFont
        font.pixelSize: 12
        elide: Text.ElideRight
        verticalAlignment: Text.AlignVCenter
    }

    Text {
        id: valueTextItem
        objectName: "value"
        anchors.right: parent.right
        anchors.verticalCenter: parent.verticalCenter
        width: Math.min(implicitWidth, Math.max(0, parent.width * 0.58))
        text: root.value
        color: root.valueColor
        font.family: FlyEye.Theme.monoFont
        font.pixelSize: 12
        font.bold: root.emphasized
        horizontalAlignment: Text.AlignRight
        elide: Text.ElideRight
        verticalAlignment: Text.AlignVCenter
    }
}
