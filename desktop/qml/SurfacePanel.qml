import QtQuick

Rectangle {
    id: root

    property alias contentItem: contentContainer.data
    property color panelColor: Theme.surface
    property color borderColor: Theme.border
    property real cornerRadius: 6

    color: panelColor
    radius: cornerRadius
    border.width: 1
    border.color: borderColor

    default property alias content: contentContainer.data

    Item {
        id: contentContainer
        anchors.fill: parent
        anchors.margins: Theme.space4
    }
}
