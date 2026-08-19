import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import "." as FlyEye

// Two-button segmented selection for automatic versus manual landing-frame
// picking.  Keeping the state here makes it usable independently of the
// inspector and gives keyboard and mouse clients one small API.
Rectangle {
    id: root

    property bool automatic: true
    property alias automaticSelection: root.automatic
    property alias autoSelected: root.automatic
    property alias findItForMe: root.automatic
    property string automaticLabel: "Find it for me"
    property string manualLabel: "I'll pick it"

    signal selectionChanged(bool automatic)
    signal findItForMeRequested()
    signal pickItRequested()

    implicitWidth: 220
    implicitHeight: 34
    color: FlyEye.Theme.border
    radius: 6
    clip: true

    onAutomaticChanged: selectionChanged(root.automatic)

    RowLayout {
        anchors.fill: parent
        anchors.margins: 1
        spacing: 1

        Button {
            id: automaticButton
            objectName: "findItForMeButton"
            Layout.fillWidth: true
            Layout.fillHeight: true
            implicitHeight: 32
            text: root.automaticLabel
            onClicked: {
                root.automatic = true
                root.findItForMeRequested()
            }

            background: Rectangle {
                color: root.automatic ? FlyEye.Theme.accentMuted : FlyEye.Theme.panel
            }

            contentItem: Text {
                text: automaticButton.text
                color: root.automatic ? "#9FC2FF" : FlyEye.Theme.textMuted
                font.family: FlyEye.Theme.bodyFont
                font.pixelSize: 11
                font.bold: true
                horizontalAlignment: Text.AlignHCenter
                verticalAlignment: Text.AlignVCenter
                elide: Text.ElideRight
            }
        }

        Button {
            id: manualButton
            objectName: "pickItButton"
            Layout.fillWidth: true
            Layout.fillHeight: true
            implicitHeight: 32
            text: root.manualLabel
            onClicked: {
                root.automatic = false
                root.pickItRequested()
            }

            background: Rectangle {
                color: !root.automatic ? FlyEye.Theme.accentMuted : FlyEye.Theme.panel
            }

            contentItem: Text {
                text: manualButton.text
                color: !root.automatic ? "#9FC2FF" : FlyEye.Theme.textMuted
                font.family: FlyEye.Theme.bodyFont
                font.pixelSize: 11
                font.bold: true
                horizontalAlignment: Text.AlignHCenter
                verticalAlignment: Text.AlignVCenter
                elide: Text.ElideRight
            }
        }
    }
}
