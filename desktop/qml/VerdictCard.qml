import QtQuick
import QtQuick.Layouts
import "." as FlyEye

// The one-glance answer on the decision screen.  The supporting evidence is
// intentionally kept in EvidencePanel so this card remains legible at a
// distance and easy to reuse for an IN call later.
Rectangle {
    id: root
    objectName: "verdictCard"

    property string verdict: "OUT"
    property string label: "SHUTTLE WAS"
    property string distance: "24 mm"
    property string boundary: "back boundary"
    property color verdictColor: root.verdict.toUpperCase() === "IN"
                                  ? FlyEye.Theme.success : FlyEye.Theme.danger

    property alias verdictText: verdictTextItem.text
    property alias detailText: detailTextItem.text

    implicitWidth: 320
    implicitHeight: 194
    radius: 12
    color: Qt.rgba(root.verdictColor.r, root.verdictColor.g, root.verdictColor.b, 0.07)
    border.width: 1
    border.color: Qt.rgba(root.verdictColor.r, root.verdictColor.g, root.verdictColor.b, 0.45)

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: FlyEye.Theme.space5
        spacing: 0

        Text {
            id: labelTextItem
            objectName: "verdictLabel"
            text: root.label
            color: Qt.rgba(root.verdictColor.r, root.verdictColor.g, root.verdictColor.b, 0.72)
            font.family: FlyEye.Theme.monoFont
            font.pixelSize: 10
            font.bold: true
            font.letterSpacing: 2.4
            horizontalAlignment: Text.AlignHCenter
            Layout.fillWidth: true
        }

        Text {
            id: verdictTextItem
            objectName: "verdictWord"
            text: root.verdict
            color: root.verdictColor
            font.family: FlyEye.Theme.displayFont
            font.pixelSize: 92
            font.bold: true
            font.letterSpacing: 4.6
            lineHeight: 0.9
            lineHeightMode: Text.ProportionalHeight
            horizontalAlignment: Text.AlignHCenter
            verticalAlignment: Text.AlignVCenter
            Layout.fillWidth: true
            Layout.preferredHeight: 98
        }

        Text {
            id: detailTextItem
            objectName: "verdictDetail"
            text: "by " + root.distance + " · " + root.boundary
            color: Qt.rgba(root.verdictColor.r, root.verdictColor.g, root.verdictColor.b, 0.74)
            font.family: FlyEye.Theme.bodyFont
            font.pixelSize: 13
            horizontalAlignment: Text.AlignHCenter
            elide: Text.ElideRight
            Layout.fillWidth: true
        }
    }
}
