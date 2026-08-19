import QtQuick

Text {
    id: root

    property color labelColor: Theme.text
    property bool compact: false

    color: labelColor
    font.family: Theme.displayFont
    font.bold: true
    font.pixelSize: compact ? 16 : 22
    font.letterSpacing: compact ? 1.8 : 2.6
    renderType: Text.NativeRendering
    text: "FLY EYE"
}
