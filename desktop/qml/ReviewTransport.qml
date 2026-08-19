import QtQuick
import QtQuick.Layouts
import "." as FlyEye

Item {
    id: root

    // The transport deliberately owns one integer timeline. Both camera views
    // can bind to currentFrame and therefore cannot drift while stepping.
    property int timelineStartFrame: 1185
    property int timelineEndFrame: 1383
    property int startFrame: 1249
    property int endFrame: 1317
    property int currentFrame: 1284
    property int landingFrame: 1284
    property real speed: 0.25
    property bool playing: false
    property int frameRate: 120

    signal frameChanged(int frame)
    signal rangeChanged(int start, int end)
    signal playbackChanged(bool playing)
    signal actionRequested(string action)

    implicitHeight: 96
    implicitWidth: 620
    focus: true
    activeFocusOnTab: true

    function clampFrame(frame) {
        var low = Math.min(timelineStartFrame, timelineEndFrame)
        var high = Math.max(timelineStartFrame, timelineEndFrame)
        return Math.max(low, Math.min(high, Math.round(frame)))
    }

    function clampToTimeline(frame) {
        return clampFrame(frame)
    }

    function setFrame(frame) {
        var next = clampFrame(frame)
        if (currentFrame !== next)
            currentFrame = next
    }

    // Explicit alias for consumers that prefer a verb matching the property
    // name. Mouse, keyboard, and button input all use setFrame internally.
    function setCurrentFrame(frame) {
        setFrame(frame)
    }

    function stepFrames(delta) {
        setFrame(currentFrame + Math.round(delta))
        root.actionRequested("step")
    }

    function setStartFrame(frame) {
        var next = clampToTimeline(frame)
        if (next > endFrame)
            next = endFrame
        if (startFrame !== next)
            startFrame = next
        root.rangeChanged(startFrame, endFrame)
    }

    function setEndFrame(frame) {
        var next = clampToTimeline(frame)
        if (next < startFrame)
            next = startFrame
        if (endFrame !== next)
            endFrame = next
        root.rangeChanged(startFrame, endFrame)
    }

    function setRange(start, end) {
        var nextStart = clampToTimeline(start)
        var nextEnd = clampToTimeline(end)
        if (nextStart > nextEnd) {
            var swap = nextStart
            nextStart = nextEnd
            nextEnd = swap
        }
        startFrame = nextStart
        endFrame = nextEnd
        setFrame(currentFrame)
        root.rangeChanged(startFrame, endFrame)
    }

    function jumpToStart() {
        setFrame(timelineStartFrame)
        root.actionRequested("start")
    }

    function jumpToEnd() {
        setFrame(timelineEndFrame)
        root.actionRequested("end")
    }

    function play() {
        if (!playing)
            playing = true
        root.actionRequested("play")
    }

    function pause() {
        if (playing)
            playing = false
        root.actionRequested("pause")
    }

    function togglePlayback() {
        if (playing)
            pause()
        else
            play()
    }

    function frameForPosition(position) {
        var usable = Math.max(1, scrubber.width)
        var fraction = Math.max(0, Math.min(1, position / usable))
        return timelineStartFrame + fraction * (timelineEndFrame - timelineStartFrame)
    }

    function positionForFrame(frame) {
        var span = timelineEndFrame - timelineStartFrame
        if (span <= 0)
            return 0
        return Math.max(0, Math.min(1, (frame - timelineStartFrame) / span)) * scrubber.width
    }

    onCurrentFrameChanged: {
        var bounded = clampFrame(currentFrame)
        if (currentFrame !== bounded) {
            currentFrame = bounded
            return
        }
        root.frameChanged(currentFrame)
    }

    onStartFrameChanged: {
        var bounded = clampToTimeline(startFrame)
        if (startFrame !== bounded) {
            startFrame = bounded
            return
        }
        if (startFrame > endFrame) {
            endFrame = startFrame
        }
    }

    onEndFrameChanged: {
        var bounded = clampToTimeline(endFrame)
        if (endFrame !== bounded) {
            endFrame = bounded
            return
        }
        if (endFrame < startFrame) {
            startFrame = endFrame
        }
    }

    onLandingFrameChanged: {
        var bounded = clampFrame(landingFrame)
        if (landingFrame !== bounded)
            landingFrame = bounded
    }

    onPlayingChanged: root.playbackChanged(playing)

    Timer {
        id: playbackTimer
        interval: Math.max(1, Math.round(1000 / (root.frameRate * Math.max(0.01, root.speed))))
        repeat: true
        running: root.playing

        onTriggered: {
            if (root.currentFrame >= root.timelineEndFrame) {
                root.currentFrame = root.timelineEndFrame
                root.pause()
            } else {
                root.setFrame(root.currentFrame + 1)
            }
        }
    }

    ColumnLayout {
        anchors.fill: parent
        spacing: 12

        Item {
            id: scrubber
            objectName: "scrubber"
            Layout.fillWidth: true
            Layout.preferredHeight: 34
            implicitHeight: 34

            Rectangle {
                anchors.fill: parent
                color: FlyEye.Theme.well
                border.width: 1
                border.color: FlyEye.Theme.border
                radius: 6
            }

            Rectangle {
                id: selection
                objectName: "selectedRange"
                x: root.positionForFrame(root.startFrame)
                width: Math.max(2, root.positionForFrame(root.endFrame) - x)
                y: 1
                height: parent.height - 2
                color: Qt.rgba(0.298, 0.553, 1.0, 0.16)
            }

            Rectangle {
                id: impactMarker
                objectName: "impactMarker"
                x: root.positionForFrame(root.landingFrame) - width / 2
                y: 0
                width: 2
                height: parent.height
                color: FlyEye.Theme.amber
                z: 3
            }

            Rectangle {
                id: playhead
                objectName: "playhead"
                x: root.positionForFrame(root.currentFrame) - width / 2
                y: -7
                width: 2
                height: parent.height + 14
                color: FlyEye.Theme.text
                z: 4
            }

            Rectangle {
                id: startGrip
                objectName: "startGrip"
                x: root.positionForFrame(root.startFrame) - width / 2
                y: -5
                width: 11
                height: parent.height + 10
                radius: 3
                color: FlyEye.Theme.accent
                z: 5

                MouseArea {
                    anchors.fill: parent
                    cursorShape: Qt.SizeHorCursor
                    onPressed: root.forceActiveFocus()
                    onPositionChanged: function(mouse) {
                        if (pressed)
                            root.setStartFrame(root.frameForPosition(startGrip.x + mouse.x))
                    }
                }
            }

            Rectangle {
                id: endGrip
                objectName: "endGrip"
                x: root.positionForFrame(root.endFrame) - width / 2
                y: -5
                width: 11
                height: parent.height + 10
                radius: 3
                color: FlyEye.Theme.accent
                z: 5

                MouseArea {
                    anchors.fill: parent
                    cursorShape: Qt.SizeHorCursor
                    onPressed: root.forceActiveFocus()
                    onPositionChanged: function(mouse) {
                        if (pressed)
                            root.setEndFrame(root.frameForPosition(endGrip.x + mouse.x))
                    }
                }
            }

            MouseArea {
                anchors.fill: parent
                z: 1
                onPressed: function(mouse) {
                    root.forceActiveFocus()
                    root.setFrame(root.frameForPosition(mouse.x))
                }
                onPositionChanged: function(mouse) {
                    if (pressed)
                        root.setFrame(root.frameForPosition(mouse.x))
                }
            }
        }

        RowLayout {
            Layout.fillWidth: true
            spacing: 7

            FlyEye.TransportButton {
                objectName: "startButton"
                label: "⏮ START"
                onActionTriggered: root.jumpToStart()
            }
            FlyEye.TransportButton {
                objectName: "backTenButton"
                label: "◀◀ 10F"
                onActionTriggered: root.stepFrames(-10)
            }
            FlyEye.TransportButton {
                objectName: "backOneButton"
                label: "◀ 1F"
                onActionTriggered: root.stepFrames(-1)
            }
            FlyEye.TransportButton {
                objectName: "playPauseButton"
                emphasized: true
                label: root.playing ? "⏸ PAUSE" : "▶ PLAY"
                onActionTriggered: root.togglePlayback()
            }
            FlyEye.TransportButton {
                objectName: "forwardOneButton"
                label: "1F ▶"
                onActionTriggered: root.stepFrames(1)
            }
            FlyEye.TransportButton {
                objectName: "forwardTenButton"
                label: "10F ▶▶"
                onActionTriggered: root.stepFrames(10)
            }
            FlyEye.TransportButton {
                objectName: "endButton"
                label: "END ⏭"
                onActionTriggered: root.jumpToEnd()
            }

            Row {
                Layout.leftMargin: 3
                spacing: 5

                Text {
                    text: "SPEED"
                    color: FlyEye.Theme.textFaint
                    font.family: FlyEye.Theme.monoFont
                    font.pixelSize: 11
                    verticalAlignment: Text.AlignVCenter
                }

                Text {
                    text: Number(root.speed).toFixed(2) + "×"
                    color: FlyEye.Theme.amber
                    font.family: FlyEye.Theme.monoFont
                    font.pixelSize: 11
                    verticalAlignment: Text.AlignVCenter
                }
            }

            Item { Layout.fillWidth: true }

            Text {
                text: "[ start   ] end   ← → step frame"
                color: FlyEye.Theme.textFaint
                font.family: FlyEye.Theme.monoFont
                font.pixelSize: 10
                verticalAlignment: Text.AlignVCenter
            }
        }
    }

    Shortcut {
        sequence: "Left"
        enabled: root.visible && root.enabled
        onActivated: root.stepFrames(-1)
    }
    Shortcut {
        sequence: "Right"
        enabled: root.visible && root.enabled
        onActivated: root.stepFrames(1)
    }
    Shortcut {
        sequence: "["
        enabled: root.visible && root.enabled
        onActivated: root.setStartFrame(root.currentFrame)
    }
    Shortcut {
        sequence: "]"
        enabled: root.visible && root.enabled
        onActivated: root.setEndFrame(root.currentFrame)
    }

    Keys.onPressed: function(event) {
        if (event.key === Qt.Key_Left) {
            root.stepFrames(-1)
            event.accepted = true
        } else if (event.key === Qt.Key_Right) {
            root.stepFrames(1)
            event.accepted = true
        } else if (event.key === Qt.Key_BracketLeft) {
            root.setStartFrame(root.currentFrame)
            event.accepted = true
        } else if (event.key === Qt.Key_BracketRight) {
            root.setEndFrame(root.currentFrame)
            event.accepted = true
        }
    }
}
