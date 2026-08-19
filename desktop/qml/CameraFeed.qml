import QtQuick
import "." as FlyEye

// Camera card used by the live monitor and the later review screens.  The
// image area is a CourtScene, keeping this component usable with simulated or
// real frames without changing the surrounding card chrome.
Rectangle {
    id: root

    property string cameraTitle: "Cam A — sideline"
    property string cameraVariant: "sideline"
    property string resolution: "1280×720"
    property string latency: "4.2 ms"
    property bool live: true

    implicitWidth: 420
    implicitHeight: 286
    color: FlyEye.Theme.well
    radius: 10
    border.width: 1
    border.color: FlyEye.Theme.border
    clip: true

    Rectangle {
        id: header
        anchors.top: parent.top
        anchors.left: parent.left
        anchors.right: parent.right
        height: 40
        color: FlyEye.Theme.panel
        border.color: FlyEye.Theme.border
        border.width: 0

        Row {
            anchors.left: parent.left
            anchors.leftMargin: 10
            anchors.verticalCenter: parent.verticalCenter
            spacing: 8

            Rectangle {
                width: 7
                height: 7
                radius: 3.5
                anchors.verticalCenter: parent.verticalCenter
                color: FlyEye.Theme.danger

                SequentialAnimation on opacity {
                    running: root.live
                    loops: Animation.Infinite
                    NumberAnimation { to: 0.2; duration: 700 }
                    NumberAnimation { to: 1; duration: 700 }
                }
            }

            Text {
                text: root.cameraTitle
                color: FlyEye.Theme.text
                font.family: FlyEye.Theme.displayFont
                font.pixelSize: 14
                font.letterSpacing: 1.2
                font.capitalization: Font.AllUppercase
                elide: Text.ElideRight
                width: Math.max(80, header.width - meta.width - 46)
                anchors.verticalCenter: parent.verticalCenter
            }
        }

        Text {
            id: meta
            anchors.right: parent.right
            anchors.rightMargin: 10
            anchors.verticalCenter: parent.verticalCenter
            text: root.resolution + " · " + root.latency
            color: FlyEye.Theme.textFaint
            font.family: FlyEye.Theme.monoFont
            font.pixelSize: 10
        }
    }

    FlyEye.CourtScene {
        id: courtScene
        anchors.top: header.bottom
        anchors.left: parent.left
        anchors.right: parent.right
        anchors.bottom: parent.bottom
        variant: root.cameraVariant
    }

    Rectangle {
        id: liveBadge
        anchors.top: courtScene.top
        anchors.right: courtScene.right
        anchors.topMargin: 9
        anchors.rightMargin: 9
        width: badgeText.implicitWidth + 16
        height: 23
        radius: 4
        color: root.live ? "#24FF4D4D" : "#99000000"
        border.width: 1
        border.color: root.live ? "#73FF4D4D" : "#26F2F4F0"
        visible: true

        Text {
            id: badgeText
            anchors.centerIn: parent
            text: root.live ? "LIVE" : "PAUSED"
            color: root.live ? "#FFFF9090" : "#FFC7CFDC"
            font.family: FlyEye.Theme.monoFont
            font.pixelSize: 9
            font.bold: true
            font.letterSpacing: 1.4
        }
    }
}
