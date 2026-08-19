import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import "." as FlyEye

Item {
    id: root

    property string statusMessage: ""

    signal showRequested()
    signal retryRequested()
    signal saveRequested()
    signal backRequested()

    implicitWidth: 300
    implicitHeight: actions.implicitHeight

    component ActionButton: Button {
        id: actionButton

        property bool primary: false

        Layout.fillWidth: true
        implicitHeight: primary ? 52 : 42

        background: Rectangle {
            radius: 7
            color: actionButton.primary
                ? (actionButton.hovered ? "#69A0FF" : FlyEye.Theme.accent)
                : (actionButton.hovered ? FlyEye.Theme.panelRaised : FlyEye.Theme.background)
            border.width: 1
            border.color: actionButton.primary ? FlyEye.Theme.accent : FlyEye.Theme.border
        }

        contentItem: Text {
            text: actionButton.text
            color: actionButton.primary ? "#04101F" : FlyEye.Theme.textMuted
            font.family: actionButton.primary ? FlyEye.Theme.displayFont : FlyEye.Theme.bodyFont
            font.pixelSize: actionButton.primary ? 17 : 12
            font.bold: true
            font.letterSpacing: actionButton.primary ? 1.7 : 0
            horizontalAlignment: Text.AlignHCenter
            verticalAlignment: Text.AlignVCenter
        }
    }

    ColumnLayout {
        id: actions
        anchors.left: parent.left
        anchors.right: parent.right
        spacing: 8

        ActionButton {
            objectName: "showButton"
            text: "SHOW ON COURT SCREEN"
            primary: true
            onClicked: {
                root.statusMessage = "COURT SCREEN PREVIEW READY"
                root.showRequested()
            }
        }

        ActionButton {
            objectName: "retryButton"
            text: "Run it again"
            onClicked: {
                root.statusMessage = ""
                root.retryRequested()
            }
        }

        ActionButton {
            objectName: "saveButton"
            text: "Save clip to match folder"
            onClicked: {
                root.statusMessage = "CLIP SAVE SIMULATED"
                root.saveRequested()
            }
        }

        ActionButton {
            objectName: "backButton"
            text: "Back to live     Esc"
            onClicked: root.backRequested()
        }

        Text {
            objectName: "actionStatus"
            Layout.fillWidth: true
            Layout.preferredHeight: root.statusMessage.length > 0 ? 18 : 0
            visible: root.statusMessage.length > 0
            text: root.statusMessage
            color: FlyEye.Theme.success
            font.family: FlyEye.Theme.monoFont
            font.pixelSize: 10
            font.letterSpacing: 0.6
            horizontalAlignment: Text.AlignHCenter
        }
    }

    Shortcut {
        sequence: "Escape"
        enabled: root.visible && root.enabled
        onActivated: root.backRequested()
    }
}
