pragma ComponentBehavior: Bound
import QtQuick

Item {
    id: root

    // Positions and widths are fractions of the thirty-second window.
    // Keeping these as data makes the visual useful with either live or
    // recorded rally detections.
    property var rallySpans: [
        { start: 0.08, width: 0.16 },
        { start: 0.40, width: 0.22 },
        { start: 0.74, width: 0.24 }
    ]
    property string label: "ROLLING BUFFER — LAST 30 S IS ALWAYS RECORDED"

    implicitWidth: 280
    implicitHeight: labelText.implicitHeight + timeline.implicitHeight + ticks.implicitHeight + 18

    Text {
        id: labelText
        anchors.left: parent.left
        anchors.right: parent.right
        anchors.top: parent.top
        elide: Text.ElideRight
        color: Theme.textFaint
        font.family: Theme.monoFont
        font.pixelSize: 10
        font.letterSpacing: 1.4
        text: root.label
    }

    Rectangle {
        id: timeline
        anchors.left: parent.left
        anchors.right: parent.right
        anchors.top: labelText.bottom
        anchors.topMargin: 7
        implicitHeight: 30
        height: implicitHeight
        radius: 5
        color: "#111823"
        border.width: 1
        border.color: Theme.border
        clip: true

        // Alternating narrow bands recreate the dense, always-recording
        // track while naturally scaling with the available width.
        Repeater {
            model: 60

            Rectangle {
                required property int index
                x: index * timeline.width / 60
                width: timeline.width / 120
                height: timeline.height
                color: index % 2 === 0 ? "#141C28" : "#111823"
            }
        }

        Repeater {
            model: root.rallySpans

            Rectangle {
                required property var modelData
                x: Math.max(0, modelData.start) * timeline.width
                width: Math.max(0, modelData.width) * timeline.width
                height: timeline.height
                color: Qt.rgba(0.91, 0.64, 0.24, 0.22)

                Rectangle {
                    width: 2
                    height: parent.height
                    color: "#E8A33D"
                }
            }
        }

        Rectangle {
            id: nowEdge
            objectName: "nowEdge"
            anchors.right: parent.right
            anchors.top: parent.top
            anchors.bottom: parent.bottom
            width: 3
            color: "#FF4D4D"
        }
    }

    Row {
        id: ticks
        anchors.left: parent.left
        anchors.right: parent.right
        anchors.top: timeline.bottom
        anchors.topMargin: 5
        spacing: 0

        Repeater {
            model: ["−30 s", "−20 s", "−10 s", "NOW"]

            Text {
                required property int index
                required property string modelData
                width: ticks.width / 4
                color: Theme.textFaint
                font.family: Theme.monoFont
                font.pixelSize: 10
                text: modelData
                horizontalAlignment: index === 0 ? Text.AlignLeft :
                    (index === 3 ? Text.AlignRight : Text.AlignHCenter)
            }
        }
    }
}
