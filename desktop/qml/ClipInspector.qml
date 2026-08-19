import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import "." as FlyEye

// Deterministic clip/shuttle metadata panel for the simulated review flow.
// Camera, tracking, and reconstruction services can later replace these
// properties without changing the inspector's public interaction surface.
Rectangle {
    id: root

    property string startTime: "00:11.42"
    property string endTime: "00:13.08"
    property string lengthSummary: "1.66 s · 199 f"
    property string trackedFrames: "186 / 199"
    property int landingFrame: 1284
    property string lineInQuestion: "Back boundary"
    property bool automaticSelection: true
    property real reconstructionProgress: 0.68
    property bool reconstructionRunning: false
    property string reconstructionLabel: "Reconstructing trajectory"
    readonly property bool compact: height < 350

    property alias clipStart: root.startTime
    property alias clipEnd: root.endTime
    property alias clipLength: root.lengthSummary
    property alias findItForMe: root.automaticSelection

    signal reconstructionRequested()
    signal reconstructionCompleted()

    implicitWidth: 232
    implicitHeight: 300
    color: FlyEye.Theme.panel
    border.width: 1
    border.color: FlyEye.Theme.border

    function requestReconstruction() {
        root.reconstructionRunning = true
        root.reconstructionProgress = 0
        root.reconstructionRequested()
        progressTimer.restart()
    }

    Timer {
        id: progressTimer
        interval: 70
        repeat: true
        running: false
        onTriggered: {
            root.reconstructionProgress = Math.min(1, root.reconstructionProgress + 0.04)
            if (root.reconstructionProgress >= 1) {
                root.reconstructionRunning = false
                progressTimer.stop()
                root.reconstructionCompleted()
            }
        }
    }

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: root.compact ? 8 : FlyEye.Theme.space3
        spacing: 0

        Text {
            objectName: "clipTitle"
            text: "CLIP"
            color: FlyEye.Theme.textMuted
            font.family: FlyEye.Theme.displayFont
            font.pixelSize: 14
            font.bold: true
            font.letterSpacing: 2.0
            Layout.fillWidth: true
            Layout.preferredHeight: root.compact ? 18 : 22
        }

        InfoRow {
            objectName: "startRow"
            label: "Start"
            value: root.startTime
            Layout.fillWidth: true
            Layout.preferredHeight: root.compact ? 18 : 24
        }

        InfoRow {
            objectName: "endRow"
            label: "End"
            value: root.endTime
            Layout.fillWidth: true
            Layout.preferredHeight: root.compact ? 18 : 24
        }

        InfoRow {
            objectName: "lengthRow"
            label: "Length"
            value: root.lengthSummary
            valueColor: FlyEye.Theme.amber
            emphasized: true
            Layout.fillWidth: true
            Layout.preferredHeight: root.compact ? 18 : 24
        }

        Rectangle {
            objectName: "clipRule"
            color: FlyEye.Theme.border
            implicitHeight: 1
            Layout.fillWidth: true
            Layout.topMargin: root.compact ? 4 : 8
            Layout.bottomMargin: root.compact ? 5 : 9
        }

        Text {
            objectName: "shuttleTitle"
            text: "SHUTTLE"
            color: FlyEye.Theme.textMuted
            font.family: FlyEye.Theme.displayFont
            font.pixelSize: 14
            font.bold: true
            font.letterSpacing: 2.0
            Layout.fillWidth: true
            Layout.preferredHeight: root.compact ? 18 : 22
        }

        InfoRow {
            objectName: "trackedFramesRow"
            label: "Tracked frames"
            value: root.trackedFrames
            valueColor: FlyEye.Theme.success
            emphasized: true
            Layout.fillWidth: true
            Layout.preferredHeight: root.compact ? 18 : 24
        }

        InfoRow {
            objectName: "landingFrameRow"
            label: "Landing frame"
            value: String(root.landingFrame)
            Layout.fillWidth: true
            Layout.preferredHeight: root.compact ? 18 : 24
        }

        InfoRow {
            objectName: "lineRow"
            label: "Line in question"
            value: root.lineInQuestion
            Layout.fillWidth: true
            Layout.preferredHeight: root.compact ? 18 : 24
        }

        ModeToggle {
            id: modeToggle
            objectName: "landingMode"
            automatic: root.automaticSelection
            Layout.fillWidth: true
            Layout.topMargin: root.compact ? 3 : 5
            Layout.preferredHeight: root.compact ? 30 : 34
            onSelectionChanged: root.automaticSelection = automatic
        }

        Rectangle {
            objectName: "actionRule"
            color: FlyEye.Theme.border
            implicitHeight: 1
            Layout.fillWidth: true
            Layout.topMargin: root.compact ? 4 : 9
            Layout.bottomMargin: root.compact ? 5 : 10
        }

        Button {
            id: getCallButton
            objectName: "getCallButton"
            Layout.fillWidth: true
            Layout.preferredHeight: root.compact ? 38 : 44
            onClicked: root.requestReconstruction()

            background: Rectangle {
                color: getCallButton.hovered ? FlyEye.Theme.accentMuted : "transparent"
                border.width: 1
                border.color: FlyEye.Theme.accent
                radius: 7
            }

            contentItem: Row {
                spacing: 10
                anchors.centerIn: parent

                Text {
                    text: "GET THE CALL"
                    color: "#9FC2FF"
                    font.family: FlyEye.Theme.displayFont
                    font.pixelSize: 16
                    font.bold: true
                    font.letterSpacing: 1.8
                    verticalAlignment: Text.AlignVCenter
                }

                Rectangle {
                    implicitWidth: 24
                    implicitHeight: 20
                    radius: 4
                    color: Qt.rgba(0, 0, 0, 0.28)
                    border.width: 1
                    border.color: Qt.rgba(0, 0, 0, 0.35)

                    Text {
                        anchors.centerIn: parent
                        text: "↵"
                        color: "#9FC2FF"
                        font.family: FlyEye.Theme.monoFont
                        font.pixelSize: 11
                    }
                }
            }
        }

        Rectangle {
            id: meterTrack
            objectName: "reconstructionMeter"
            Layout.fillWidth: true
            Layout.topMargin: root.compact ? 6 : 12
            implicitHeight: 4
            radius: 2
            color: FlyEye.Theme.well
            clip: true

            Rectangle {
                objectName: "reconstructionMeterFill"
                width: meterTrack.width * Math.max(0, Math.min(1, root.reconstructionProgress))
                height: parent.height
                radius: 2
                color: FlyEye.Theme.accent
            }
        }

        Text {
            objectName: "reconstructionLabel"
            Layout.fillWidth: true
            Layout.topMargin: root.compact ? 3 : 6
            text: root.reconstructionLabel + " — " + Math.round(root.reconstructionProgress * 100) + "%"
            color: FlyEye.Theme.textFaint
            font.family: FlyEye.Theme.monoFont
            font.pixelSize: 10
            horizontalAlignment: Text.AlignHCenter
            elide: Text.ElideRight
        }
    }

    Shortcut {
        sequence: "Return"
        enabled: root.visible && root.enabled
        onActivated: root.requestReconstruction()
    }

    Shortcut {
        sequence: "Enter"
        enabled: root.visible && root.enabled
        onActivated: root.requestReconstruction()
    }
}
